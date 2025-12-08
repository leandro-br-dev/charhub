# Sistema de Créditos - CharHub

**Data**: 2025-11-14
**Status**: 📋 Planejamento
**Prioridade**: Alta

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Objetivos do Sistema](#objetivos-do-sistema)
3. [Arquitetura do Sistema](#arquitetura-do-sistema)
4. [Modelos de Dados (Prisma)](#modelos-de-dados-prisma)
5. [Custos de Serviços](#custos-de-serviços)
6. [Mecânicas de Ganho de Créditos](#mecânicas-de-ganho-de-créditos)
7. [Mecânicas de Consumo](#mecânicas-de-consumo)
8. [Planos e Assinaturas](#planos-e-assinaturas)
9. [Implementação Técnica](#implementação-técnica)
10. [API Endpoints](#api-endpoints)
11. [Frontend Components](#frontend-components)
12. [Roadmap de Implementação](#roadmap-de-implementação)

---

## Visão Geral

O sistema de créditos do CharHub é um mecanismo de **freemium** que permite aos usuários:

- 🎁 Ganhar créditos gratuitamente (login diário, indicações, tarefas)
- 💰 Consumir créditos ao usar serviços (chat, geração de imagens, etc.)
- 📊 Acompanhar histórico de transações
- 🚀 Assinar planos pagos para mais créditos e recursos premium

### Princípios

1. **Generosidade Inicial**: Usuários novos recebem créditos suficientes para experimentar
2. **Engajamento Diário**: Recompensas diárias incentivam retorno regular
3. **Crescimento Viral**: Sistema de indicações recompensa compartilhamento
4. **Transparência**: Custos claros antes de cada ação
5. **Flexibilidade**: Múltiplas formas de obter créditos (grátis e pago)

---

## Objetivos do Sistema

### Objetivos de Negócio

- ✅ Converter usuários free para planos pagos (~5-10% taxa de conversão esperada)
- ✅ Incentivar uso regular da plataforma (daily active users)
- ✅ Crescimento viral via referrals
- ✅ Monetização justa e transparente

### Objetivos de Produto

- ✅ Usuário free pode usar funcionalidades core sem pagar
- ✅ Experiência não-intrusiva (sem paywalls agressivos)
- ✅ Progressão clara (usuário entende como ganhar mais créditos)
- ✅ Previsibilidade de custos (usuário sabe quanto vai gastar)

### Objetivos Técnicos

- ✅ Performance otimizada (snapshots mensais para cálculo de saldo)
- ✅ Auditoria completa (todas transações rastreadas)
- ✅ Processamento assíncrono (não bloquear requests de usuário)
- ✅ Configuração flexível (custos ajustáveis sem código)

---

## Arquitetura do Sistema

### Diagrama de Fluxo

```
┌─────────────────────────────────────────────────────────────┐
│                     GANHO DE CRÉDITOS                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Cadastro Inicial  →  200 créditos (Plano Gratuito)        │
│  Login Diário      →  50 créditos/dia                       │
│  Indicação         →  500 créditos + 5 dias Plus (quem indicou)│
│  Plano Mensal      →  200-5000 créditos/mês (conforme plano)│
│  Compra Avulsa     →  Pacotes de créditos (futuro)         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      SALDO ATUAL                            │
│                                                             │
│  Balance = MonthlySnapshot.starting_balance                │
│          + Σ(CreditTransactions since snapshot)            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   CONSUMO DE CRÉDITOS                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Chat (safe)       →  2 créditos/1k tokens                 │
│  Chat (NSFW leve)  →  2 créditos/1k tokens                 │
│  Chat (NSFW alto)  →  3 créditos/1k tokens                 │
│  Imagem (geração)  →  10 créditos/imagem                    │
│  História (SFW)    →  15 créditos/história                  │
│  História (NSFW)   →  20 créditos/história                  │
│  TTS               →  1 crédito/1000 caracteres             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                PROCESSAMENTO ASSÍNCRONO                     │
│                                                             │
│  1. UsageLog criado (credits_consumed = null)               │
│  2. Queue job processa em lote (BullMQ)                    │
│  3. Calcula custo baseado em ServiceCreditCost             │
│  4. Cria CreditTransaction (CONSUMPTION)                   │
│  5. Atualiza UsageLog.credits_consumed                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Modelos de Dados (Prisma)

### 1. CreditTransaction (Histórico de Transações)

Armazena **todas** as transações de créditos (ganhos e gastos).

```prisma
model CreditTransaction {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  transactionType CreditTransactionType @map("transaction_type")
  amountCredits   Float                 @map("amount_credits") // Positivo = ganho, Negativo = gasto
  amountUsd       Float?                @map("amount_usd")     // Valor em USD se aplicável

  // Referências opcionais
  relatedUsageLogId String?   @map("related_usage_log_id")
  usageLog          UsageLog? @relation(fields: [relatedUsageLogId], references: [id], onDelete: SetNull)

  relatedPlanId String? @map("related_plan_id")
  plan          Plan?   @relation(fields: [relatedPlanId], references: [id], onDelete: SetNull)

  notes     String?   // Informações adicionais (ex: "daily_login_reward", "referral_from_user_xyz")
  timestamp DateTime  @default(now())

  @@index([userId, timestamp])
  @@index([transactionType])
  @@map("credit_transactions")
}

enum CreditTransactionType {
  GRANT_INITIAL        // Créditos iniciais no cadastro
  GRANT_PLAN           // Créditos mensais do plano
  PURCHASE             // Compra direta de créditos
  CONSUMPTION          // Consumo por uso de serviço
  ADJUSTMENT_ADD       // Ajuste admin (adicionar)
  ADJUSTMENT_REMOVE    // Ajuste admin (remover)
  REFUND               // Reembolso
  EXPIRATION           // Expiração de créditos
  SYSTEM_REWARD        // Recompensas do sistema (daily login, referrals, etc)
}
```

---

### 2. ServiceCreditCost (Configuração de Custos)

Define quanto cada serviço custa em créditos.

```prisma
model ServiceCreditCost {
  id                 String   @id @default(uuid())
  serviceIdentifier  String   @unique @map("service_identifier") // Ex: "llm_chat_safe", "image_generation"
  creditsPerUnit     Int      @map("credits_per_unit")           // Créditos cobrados por unidade
  unitDescription    String   @map("unit_description")           // Ex: "per 1k total tokens", "per image"
  notes              String?  // Descrição adicional

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("service_credit_costs")
}
```

**Exemplos de Configuração:**

```json
{
  "serviceIdentifier": "llm_chat_safe",
  "creditsPerUnit": 2,
  "unitDescription": "per 1k total tokens"
},
{
  "serviceIdentifier": "image_generation_comfyui",
  "creditsPerUnit": 10,
  "unitDescription": "per image"
},
{
  "serviceIdentifier": "tts_default",
  "creditsPerUnit": 1,
  "unitDescription": "per 1000 characters"
}
```

---

### 3. Plan (Planos de Assinatura)

```prisma
model Plan {
  id                    String   @id @default(uuid())
  name                  String   @unique
  description           String   @db.Text
  priceUsdMonthly       Float    @map("price_usd_monthly")      // 0.00 = plano gratuito
  creditsGrantedMonthly Int      @map("credits_granted_monthly") // Créditos concedidos mensalmente
  features              Json?    // JSON com features premium { "advanced_story": true, ... }

  isPublic  Boolean  @default(true)  @map("is_public")  // Visível para usuários
  isActive  Boolean  @default(true)  @map("is_active")  // Pode ser assinado

  paypalPlanId String? @unique @map("paypal_plan_id") // ID do plano no PayPal

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  userPlans          UserPlan[]
  creditTransactions CreditTransaction[]

  @@map("plans")
}
```

**Planos Padrão:**

```typescript
// Plano Gratuito
{
  name: "Free",
  description: "Acesso gratuito com créditos limitados",
  priceUsdMonthly: 0.00,
  creditsGrantedMonthly: 200,
  features: {
    dailyReward: true,
    basicChat: true,
    imageGeneration: true,
    maxConversations: 5
  }
}

// Plano Plus
{
  name: "CharHub Plus",
  description: "Acesso premium com mais créditos e recursos avançados",
  priceUsdMonthly: 5.00,
  creditsGrantedMonthly: 2000,
  features: {
    dailyReward: true,
    basicChat: true,
    imageGeneration: true,
    advancedStoryGeneration: true,
    customChatFeatures: true,
    maxConversations: -1, // ilimitado
    prioritySupport: true
  }
}

// Plano Premium (futuro)
{
  name: "CharHub Premium",
  description: "Máximo de créditos e todos os recursos",
  priceUsdMonthly: 15.00,
  creditsGrantedMonthly: 5000,
  features: {
    // ... todos features + extras
  }
}
```

---

### 4. UserPlan (Assinaturas de Usuários)

```prisma
model UserPlan {
  id     String @id @default(uuid())
  userId String @map("user_id")
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  planId String @map("plan_id")
  plan   Plan   @relation(fields: [planId], references: [id], onDelete: Restrict)

  status UserPlanStatus @default(ACTIVE)

  startDate DateTime  @map("start_date")
  endDate   DateTime? @map("end_date")            // null = sem fim (plano gratuito perpétuo)

  lastCreditsGrantedAt DateTime? @map("last_credits_granted_at") // Última vez que créditos mensais foram concedidos

  // Integração PayPal
  paypalSubscriptionId String? @unique @map("paypal_subscription_id")
  currentPeriodStart   DateTime @map("current_period_start")
  currentPeriodEnd     DateTime @map("current_period_end")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@unique([userId, planId, status]) // Um usuário só pode ter um plano ativo por vez
  @@index([userId, status])
  @@map("user_plans")
}

enum UserPlanStatus {
  ACTIVE       // Ativo
  CANCELLED    // Cancelado (ainda válido até end_date)
  EXPIRED      // Expirado
  SUSPENDED    // Suspenso (problemas de pagamento)
}
```

---

### 5. UserMonthlyBalance (Snapshot de Saldo Mensal)

**Otimização de performance**: Ao invés de somar todas transações desde o início, cria snapshots mensais.

```prisma
model UserMonthlyBalance {
  id               String   @id @default(uuid())
  userId           String   @map("user_id")
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  monthStartDate   DateTime @map("month_start_date") // Primeiro dia do mês (ex: 2025-11-01)
  startingBalance  Float    @map("starting_balance") // Saldo no início do mês

  createdAt DateTime @default(now()) @map("created_at")

  @@unique([userId, monthStartDate])
  @@index([userId])
  @@map("user_monthly_balances")
}
```

**Cálculo de Saldo Atual:**

```typescript
// Pseudo-código
function getCurrentBalance(userId: string): Promise<number> {
  // 1. Pegar snapshot mais recente
  const snapshot = await getLatestSnapshot(userId);

  // 2. Somar transações desde o snapshot
  const transactionsSinceSnapshot = await sumTransactionsSince(
    userId,
    snapshot?.monthStartDate || new Date(0)
  );

  // 3. Retornar saldo
  return (snapshot?.startingBalance || 0) + transactionsSinceSnapshot;
}
```

---

### 6. UserPlusAccess (Acesso Premium Temporário)

Concede acesso Plus temporário (ex: de indicações).

```prisma
model UserPlusAccess {
  id     String @id @default(uuid())
  userId String @map("user_id")
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  startDate DateTime @map("start_date")
  endDate   DateTime @map("end_date")

  sourceReferralId String? @map("source_referral_id") // ID do usuário que indicou (se aplicável)
  notes            String? // Origem do acesso (ex: "referral_bonus", "promo_campaign")

  createdAt DateTime @default(now()) @map("created_at")

  @@index([userId, endDate])
  @@map("user_plus_access")
}
```

**Lógica de Acesso Plus:**

```typescript
function isUserPlusActive(userId: string): Promise<boolean> {
  const now = new Date();

  // 1. Verificar se tem plano pago ativo
  const paidPlan = await getUserActivePaidPlan(userId);
  if (paidPlan) return true;

  // 2. Verificar se tem acesso temporário válido
  const tempAccess = await getUserPlusAccess(userId, now);
  if (tempAccess && tempAccess.endDate > now) return true;

  return false;
}
```

---

### 7. UsageLog (Registro de Uso de Serviços)

Rastreia uso de serviços para cobrança posterior.

```prisma
model UsageLog {
  id             String   @id @default(uuid())
  userId         String   @map("user_id")
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  conversationId String?  @map("conversation_id")
  conversation   Conversation? @relation(fields: [conversationId], references: [id], onDelete: SetNull)

  serviceType    String   @map("service_type") // Ex: "llm_chat_safe", "image_generation"
  providerName   String?  @map("provider_name") // Ex: "openai", "gemini"
  modelName      String?  @map("model_name")    // Ex: "gpt-4", "gemini-2.0-flash-exp"

  // Métricas de consumo
  inputTokens         Int?   @map("input_tokens")
  outputTokens        Int?   @map("output_tokens")
  charactersProcessed Int?   @map("characters_processed") // Para TTS
  imagesProcessed     Int?   @map("images_processed")

  costUsd          Float?  @map("cost_usd")            // Custo real em USD (do provider)
  creditsConsumed  Int?    @map("credits_consumed")    // Créditos cobrados (null = ainda não processado)

  additionalMetadata Json?  @map("additional_metadata") // Dados extras (ex: prompt, settings)

  timestamp DateTime @default(now())

  // Relations
  creditTransactions CreditTransaction[]

  @@index([userId, timestamp])
  @@index([serviceType])
  @@index([creditsConsumed]) // Para filtrar logs não processados (WHERE creditsConsumed IS NULL)
  @@map("usage_logs")
}
```

---

## Custos de Serviços

### Configuração Inicial (seed)

**Arquivo**: `backend/src/scripts/seeds/serviceCreditCosts.ts`

```typescript
export const initialServiceCreditCosts = [
  // ===== CHAT SERVICES =====
  {
    serviceIdentifier: 'llm_participant_selection',
    creditsPerUnit: 0,
    unitDescription: 'per request',
    notes: 'Seleção de personagem - grátis'
  },
  {
    serviceIdentifier: 'llm_content_classification',
    creditsPerUnit: 1,
    unitDescription: 'per request',
    notes: 'Classificação de conteúdo'
  },
  {
    serviceIdentifier: 'llm_chat_safe',
    creditsPerUnit: 2,
    unitDescription: 'per 1k total tokens',
    notes: 'Chat seguro (SFW)'
  },
  {
    serviceIdentifier: 'llm_chat_nsfw_low',
    creditsPerUnit: 2,
    unitDescription: 'per 1k total tokens',
    notes: 'Chat NSFW leve'
  },
  {
    serviceIdentifier: 'llm_chat_nsfw_high',
    creditsPerUnit: 3,
    unitDescription: 'per 1k total tokens',
    notes: 'Chat NSFW alto'
  },

  // ===== STORY SERVICES =====
  {
    serviceIdentifier: 'llm_story_generation_sfw',
    creditsPerUnit: 15,
    unitDescription: 'per story',
    notes: 'Geração completa de história SFW'
  },
  {
    serviceIdentifier: 'llm_story_generation_nsfw',
    creditsPerUnit: 20,
    unitDescription: 'per story',
    notes: 'Geração completa de história NSFW'
  },
  {
    serviceIdentifier: 'llm_story_progression',
    creditsPerUnit: 3,
    unitDescription: 'per turn',
    notes: 'Progressão de história SFW'
  },
  {
    serviceIdentifier: 'llm_story_progression_nsfw',
    creditsPerUnit: 4,
    unitDescription: 'per turn',
    notes: 'Progressão de história NSFW'
  },

  // ===== IMAGE SERVICES =====
  {
    serviceIdentifier: 'image_generation_comfyui',
    creditsPerUnit: 10,
    unitDescription: 'per image',
    notes: 'Geração de imagem via ComfyUI'
  },
  {
    serviceIdentifier: 'llm_sd_prompt_generation',
    creditsPerUnit: 1,
    unitDescription: 'per prompt',
    notes: 'Geração de prompt para Stable Diffusion'
  },

  // ===== AUDIO SERVICES =====
  {
    serviceIdentifier: 'tts_default',
    creditsPerUnit: 1,
    unitDescription: 'per 1000 characters',
    notes: 'Text-to-Speech padrão'
  },
  {
    serviceIdentifier: 'audio_transcription_whisper',
    creditsPerUnit: 5,
    unitDescription: 'per minute',
    notes: 'Transcrição de áudio com Whisper'
  },

  // ===== CHARACTER DEVELOPMENT =====
  {
    serviceIdentifier: 'llm_character_scripting_sfw',
    creditsPerUnit: 10,
    unitDescription: 'per character',
    notes: 'Criação de personagem SFW'
  },
  {
    serviceIdentifier: 'llm_character_scripting_nsfw',
    creditsPerUnit: 12,
    unitDescription: 'per character',
    notes: 'Criação de personagem NSFW'
  }
];
```

### Tabela de Custos Resumida

| Serviço | Custo | Unidade | Notas |
|---------|-------|---------|-------|
| **Chat Básico (SFW)** | 2 | 1k tokens | ~500 mensagens com 200 créditos |
| **Chat NSFW Leve** | 2 | 1k tokens | Mesmo custo do SFW |
| **Chat NSFW Alto** | 3 | 1k tokens | +50% de custo |
| **Geração de História SFW** | 15 | história | ~13 histórias com 200 créditos |
| **Geração de História NSFW** | 20 | história | ~10 histórias com 200 créditos |
| **Geração de Imagem** | 10 | imagem | ~20 imagens com 200 créditos |
| **Text-to-Speech** | 1 | 1k chars | ~200k caracteres com 200 créditos |
| **Criar Personagem SFW** | 10 | personagem | ~20 personagens com 200 créditos |
| **Criar Personagem NSFW** | 12 | personagem | ~16 personagens com 200 créditos |

---

## Mecânicas de Ganho de Créditos

### 1. Créditos Iniciais (Cadastro)

**Quantidade**: 200 créditos
**Quando**: Ao criar conta
**Tipo**: `GRANT_INITIAL`

**Implementação**:

```typescript
// backend/src/services/userService.ts

async function createUser(data: CreateUserInput) {
  return await prisma.$transaction(async (tx) => {
    // 1. Criar usuário
    const user = await tx.user.create({ data });

    // 2. Atribuir plano gratuito
    const freePlan = await tx.plan.findFirst({
      where: { name: 'Free', isActive: true }
    });

    const userPlan = await tx.userPlan.create({
      data: {
        userId: user.id,
        planId: freePlan.id,
        status: 'ACTIVE',
        startDate: new Date(),
        // endDate: null (sem fim para plano gratuito)
      }
    });

    // 3. Conceder créditos iniciais
    await tx.creditTransaction.create({
      data: {
        userId: user.id,
        transactionType: 'GRANT_PLAN',
        amountCredits: freePlan.creditsGrantedMonthly, // 200
        relatedPlanId: freePlan.id,
        notes: 'Créditos de boas-vindas'
      }
    });

    // 4. Criar snapshot inicial
    await tx.userMonthlyBalance.create({
      data: {
        userId: user.id,
        monthStartDate: startOfMonth(new Date()),
        startingBalance: freePlan.creditsGrantedMonthly
      }
    });

    return user;
  });
}
```

---

### 2. Recompensa Diária (Daily Login)

**Quantidade**: 50 créditos/dia
**Limite**: 1 vez por dia (reseta à meia-noite UTC)
**Tipo**: `SYSTEM_REWARD`

**Implementação**:

```typescript
// backend/src/services/creditService.ts

async function claimDailyReward(userId: string) {
  // 1. Verificar se já resgatou hoje
  const today = startOfDay(new Date());

  const todayReward = await prisma.creditTransaction.findFirst({
    where: {
      userId,
      transactionType: 'SYSTEM_REWARD',
      notes: 'daily_login_reward',
      timestamp: {
        gte: today
      }
    }
  });

  if (todayReward) {
    throw new Error('Recompensa diária já resgatada hoje');
  }

  // 2. Conceder 50 créditos
  const transaction = await prisma.creditTransaction.create({
    data: {
      userId,
      transactionType: 'SYSTEM_REWARD',
      amountCredits: 50.0,
      notes: 'daily_login_reward'
    }
  });

  logger.info(`Daily reward claimed`, { userId, credits: 50 });

  return transaction;
}
```

**Frontend**:

```tsx
// frontend/src/components/DailyRewardButton.tsx

function DailyRewardButton() {
  const { canClaimDailyReward, claimDailyReward } = useCredits();

  return (
    <button
      disabled={!canClaimDailyReward}
      onClick={claimDailyReward}
      className={canClaimDailyReward ? 'btn-primary' : 'btn-disabled'}
    >
      {canClaimDailyReward ? (
        <>
          🎁 Resgatar 50 Créditos
        </>
      ) : (
        <>
          ✅ Já resgatado hoje
        </>
      )}
    </button>
  );
}
```

---

### 3. Sistema de Indicações (Referrals)

**Recompensas**:
- **Quem indica**: 500 créditos + 5 dias de acesso Plus
- **Novo usuário**: Créditos normais de cadastro (200)

**Tipo**: `SYSTEM_REWARD`

**Implementação**:

```typescript
// backend/src/services/referralService.ts

async function processReferral(referrerId: string, newUserId: string) {
  await prisma.$transaction(async (tx) => {
    // 1. Conceder 500 créditos ao indicador
    await tx.creditTransaction.create({
      data: {
        userId: referrerId,
        transactionType: 'SYSTEM_REWARD',
        amountCredits: 500.0,
        notes: `Indicação de novo usuário: ${newUserId}`
      }
    });

    // 2. Conceder/estender 5 dias de acesso Plus
    const now = new Date();
    const existingAccess = await tx.userPlusAccess.findFirst({
      where: {
        userId: referrerId,
        endDate: { gt: now }
      },
      orderBy: { endDate: 'desc' }
    });

    const startDate = existingAccess ? existingAccess.endDate : now;
    const endDate = addDays(startDate, 5);

    await tx.userPlusAccess.create({
      data: {
        userId: referrerId,
        startDate,
        endDate,
        sourceReferralId: newUserId,
        notes: 'referral_bonus'
      }
    });

    logger.info(`Referral reward granted`, {
      referrerId,
      newUserId,
      credits: 500,
      plusDays: 5
    });
  });
}
```

**URL de Indicação**:

```
https://charhub.app/?ref=USER_ID_HASH
```

**Frontend** (link de compartilhamento):

```tsx
// frontend/src/components/ReferralLink.tsx

function ReferralLink() {
  const { user } = useAuth();
  const referralUrl = `${window.location.origin}/?ref=${user.referralCode}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralUrl);
    toast.success('Link copiado!');
  };

  return (
    <div className="referral-box">
      <h3>Indique e Ganhe</h3>
      <p>Ganhe <strong>500 créditos</strong> + <strong>5 dias Plus</strong> para cada amigo!</p>

      <div className="input-group">
        <input
          type="text"
          value={referralUrl}
          readOnly
        />
        <button onClick={copyToClipboard}>
          📋 Copiar
        </button>
      </div>

      <div className="social-share">
        <button onClick={() => shareToWhatsApp(referralUrl)}>
          WhatsApp
        </button>
        <button onClick={() => shareToTwitter(referralUrl)}>
          Twitter
        </button>
        <button onClick={() => shareToFacebook(referralUrl)}>
          Facebook
        </button>
      </div>
    </div>
  );
}
```

---

### 4. Créditos Mensais do Plano

**Frequência**: A cada 30 dias desde `lastCreditsGrantedAt`
**Quantidade**: Conforme plano (200 para Free, 2000 para Plus)
**Tipo**: `GRANT_PLAN`

**Implementação** (Job agendado):

```typescript
// backend/src/jobs/grantMonthlyCredits.ts

import { Queue, Worker } from 'bullmq';

export async function scheduleMonthlyCreditsGrant() {
  const queue = new Queue('monthly-credits');

  // Rodar diariamente às 00:00 UTC
  await queue.add(
    'grant-monthly-credits',
    {},
    { repeat: { pattern: '0 0 * * *' } } // Cron: todo dia à meia-noite
  );
}

const worker = new Worker('monthly-credits', async (job) => {
  const now = new Date();

  // Buscar planos ativos que precisam de créditos
  const eligiblePlans = await prisma.userPlan.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { lastCreditsGrantedAt: null }, // Nunca recebeu
        {
          lastCreditsGrantedAt: {
            lte: subDays(now, 30) // Último grant foi há 30+ dias
          }
        }
      ]
    },
    include: { plan: true, user: true }
  });

  logger.info(`Found ${eligiblePlans.length} plans eligible for monthly credits`);

  for (const userPlan of eligiblePlans) {
    try {
      await prisma.$transaction(async (tx) => {
        // Criar transação de crédito
        await tx.creditTransaction.create({
          data: {
            userId: userPlan.userId,
            transactionType: 'GRANT_PLAN',
            amountCredits: userPlan.plan.creditsGrantedMonthly,
            relatedPlanId: userPlan.planId,
            notes: `Créditos mensais: ${userPlan.plan.name}`
          }
        });

        // Atualizar lastCreditsGrantedAt
        await tx.userPlan.update({
          where: { id: userPlan.id },
          data: { lastCreditsGrantedAt: now }
        });
      });

      logger.info(`Monthly credits granted`, {
        userId: userPlan.userId,
        planName: userPlan.plan.name,
        credits: userPlan.plan.creditsGrantedMonthly
      });
    } catch (error) {
      logger.error(`Failed to grant monthly credits`, {
        userPlanId: userPlan.id,
        error
      });
    }
  }
});
```

---

## Mecânicas de Consumo

### Fluxo de Consumo de Créditos

```
1. Usuário usa serviço (ex: envia mensagem no chat)
   ↓
2. Backend cria UsageLog (credits_consumed = null)
   ↓
3. Resposta retorna imediatamente ao usuário
   ↓
4. Job assíncrono processa logs pendentes (BullMQ)
   ↓
5. Para cada log:
   - Calcula custo baseado em ServiceCreditCost
   - Verifica saldo do usuário
   - Se suficiente: cria CreditTransaction (CONSUMPTION)
   - Atualiza UsageLog.credits_consumed
   ↓
6. Frontend atualiza saldo em tempo real (WebSocket ou polling)
```

### Implementação

```typescript
// backend/src/services/usageService.ts

async function logServiceUsage(data: CreateUsageLogInput) {
  // Criar log de uso (sem cobrar ainda)
  const usageLog = await prisma.usageLog.create({
    data: {
      userId: data.userId,
      conversationId: data.conversationId,
      serviceType: data.serviceType,
      providerName: data.providerName,
      modelName: data.modelName,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      charactersProcessed: data.charactersProcessed,
      imagesProcessed: data.imagesProcessed,
      costUsd: data.costUsd,
      additionalMetadata: data.metadata,
      creditsConsumed: null // Será calculado depois
    }
  });

  // Enfileirar para processamento
  await usageQueue.add('process-usage', { usageLogId: usageLog.id });

  return usageLog;
}
```

```typescript
// backend/src/jobs/processUsage.ts

import { Worker } from 'bullmq';

const worker = new Worker('usage-processing', async (job) => {
  const { usageLogId } = job.data;

  const usageLog = await prisma.usageLog.findUnique({
    where: { id: usageLogId },
    include: { user: true }
  });

  if (!usageLog || usageLog.creditsConsumed !== null) {
    return; // Já processado
  }

  // 1. Buscar configuração de custo
  const costConfig = await prisma.serviceCreditCost.findUnique({
    where: { serviceIdentifier: usageLog.serviceType }
  });

  if (!costConfig) {
    logger.warn(`No cost config for service: ${usageLog.serviceType}`);
    return;
  }

  // 2. Calcular créditos
  const creditsToCharge = calculateCredits(usageLog, costConfig);

  if (creditsToCharge === 0) {
    // Serviço gratuito
    await prisma.usageLog.update({
      where: { id: usageLog.id },
      data: { creditsConsumed: 0 }
    });
    return;
  }

  // 3. Verificar saldo
  const currentBalance = await getCurrentBalance(usageLog.userId);

  if (currentBalance < creditsToCharge) {
    logger.warn(`Insufficient credits`, {
      userId: usageLog.userId,
      balance: currentBalance,
      required: creditsToCharge,
      service: usageLog.serviceType
    });

    // Marcar como falha (mas não bloqueia)
    await prisma.usageLog.update({
      where: { id: usageLog.id },
      data: {
        creditsConsumed: 0,
        additionalMetadata: {
          ...(usageLog.additionalMetadata as any),
          failed_insufficient_credits: true,
          required_credits: creditsToCharge
        }
      }
    });
    return;
  }

  // 4. Criar transação de consumo
  await prisma.$transaction(async (tx) => {
    await tx.creditTransaction.create({
      data: {
        userId: usageLog.userId,
        transactionType: 'CONSUMPTION',
        amountCredits: -creditsToCharge, // Negativo = gasto
        relatedUsageLogId: usageLog.id,
        notes: `${usageLog.serviceType}`
      }
    });

    await tx.usageLog.update({
      where: { id: usageLog.id },
      data: { creditsConsumed: creditsToCharge }
    });
  });

  logger.info(`Credits charged`, {
    userId: usageLog.userId,
    service: usageLog.serviceType,
    credits: creditsToCharge
  });
});

function calculateCredits(
  log: UsageLog,
  config: ServiceCreditCost
): number {
  const { unitDescription, creditsPerUnit } = config;

  if (unitDescription.includes('per 1k total tokens')) {
    const totalTokens = (log.inputTokens || 0) + (log.outputTokens || 0);
    return Math.ceil((totalTokens / 1000) * creditsPerUnit);
  }

  if (unitDescription.includes('per image')) {
    return (log.imagesProcessed || 0) * creditsPerUnit;
  }

  if (unitDescription.includes('per 1000 characters')) {
    return Math.ceil(((log.charactersProcessed || 0) / 1000) * creditsPerUnit);
  }

  if (unitDescription.includes('per request')) {
    return creditsPerUnit;
  }

  logger.warn(`Unknown unit description: ${unitDescription}`);
  return 0;
}
```

---

### Verificação Prévia de Saldo (Opcional)

Para melhor UX, verificar saldo **antes** de processar:

```typescript
// backend/src/routes/chat.ts

router.post('/conversations/:id/messages', async (req, res) => {
  const { userId } = req.user;
  const { content } = req.body;

  // Estimar custo (baseado em tamanho da mensagem)
  const estimatedTokens = estimateTokens(content);
  const estimatedCost = Math.ceil((estimatedTokens / 1000) * 2); // 2 créditos/1k tokens

  // Verificar saldo
  const balance = await getCurrentBalance(userId);

  if (balance < estimatedCost) {
    return res.status(402).json({
      error: 'insufficient_credits',
      message: 'Créditos insuficientes',
      required: estimatedCost,
      current: balance
    });
  }

  // Processar mensagem normalmente...
});
```

**Frontend** (mostrar custo antes):

```tsx
function ChatInput() {
  const { balance } = useCredits();
  const estimatedCost = estimateMessageCost(message);

  const canSend = balance >= estimatedCost;

  return (
    <div>
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} />

      <div className="cost-preview">
        💰 Custo estimado: ~{estimatedCost} créditos
        {!canSend && (
          <span className="error">Saldo insuficiente!</span>
        )}
      </div>

      <button disabled={!canSend} onClick={sendMessage}>
        Enviar
      </button>
    </div>
  );
}
```

---

## Planos e Assinaturas

### Planos Disponíveis

| Plano | Preço | Créditos/Mês | Features |
|-------|-------|--------------|----------|
| **Free** | $0 | 200 + 50/dia (até 1500) | Chat básico, geração de imagens, 5 conversas |
| **Plus** | $5 | 2000 + 50/dia (até 3500) | Tudo do Free + histórias avançadas, conversas ilimitadas |
| **Premium** | $15 | 5000 + 50/dia (até 6500) | Tudo do Plus + prioridade, suporte dedicado |

### Fluxo de Assinatura

```
1. Usuário clica em "Assinar Plus"
   ↓
2. Backend cria assinatura PayPal e retorna approvalUrl
   ↓
3. Usuário é redirecionado para PayPal
   ↓
4. Usuário faz login no PayPal e confirma pagamento
   ↓
5. PayPal redireciona de volta para CharHub (?success=true)
   ↓
6. Webhook do PayPal notifica backend (BILLING.SUBSCRIPTION.ACTIVATED)
   ↓
7. Backend:
   - Cria/atualiza UserPlan (status = ACTIVE)
   - Concede créditos mensais imediatamente
   - Define currentPeriodStart e currentPeriodEnd
   ↓
8. Frontend atualiza UI (mostra badge Plus)
```

### Integração PayPal

```typescript
// backend/src/services/subscriptionService.ts

import { SubscriptionsController, ExperienceContextShippingPreference, ApplicationContextUserAction } from '@paypal/paypal-server-sdk';
import { requirePayPal } from '../config/paypal';

export async function subscribeToPlan(userId: string, planId: string): Promise<{ subscriptionId: string; approvalUrl: string }> {
  const subscriptions = new SubscriptionsController(requirePayPal());

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, username: true } });
  const plan = await prisma.plan.findUnique({ where: { id: planId } });

  if (!plan.paypalPlanId) {
    throw new Error('Plan does not have PayPal configuration');
  }

  // Verificar se já tem assinatura ativa
  const existingSubscription = await prisma.userPlan.findFirst({
    where: { userId, status: 'ACTIVE', currentPeriodEnd: { gt: new Date() } }
  });

  if (existingSubscription) {
    throw new Error('User already has an active subscription');
  }

  // Criar assinatura PayPal
  const response = await subscriptions.createSubscription({
    body: {
      planId: plan.paypalPlanId,
      subscriber: {
        name: { givenName: user.username || 'User' }
      },
      applicationContext: {
        brandName: 'CharHub',
        locale: 'en-US',
        shippingPreference: ExperienceContextShippingPreference.NoShipping,
        userAction: ApplicationContextUserAction.SubscribeNow,
        returnUrl: `${process.env.PUBLIC_FACING_URL}/plans?success=true`,
        cancelUrl: `${process.env.PUBLIC_FACING_URL}/plans?cancelled=true`,
      },
      customId: userId,
    },
  });

  const approvalUrl = response.result.links?.find(link => link.rel === 'approve')?.href;

  return {
    subscriptionId: response.result.id || '',
    approvalUrl
  };
}
```

**Webhook Handler**:

```typescript
// backend/src/routes/webhooks/paypal.ts

router.post('/', async (req: Request, res: Response): Promise<void> => {
  // TODO: Implementar verificação de assinatura do webhook
  // Por enquanto processa sem verificação (apenas desenvolvimento)

  try {
    const event = req.body;
    logger.info({ type: event.event_type, id: event.id }, 'Received PayPal webhook');

    switch (event.event_type) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await handleSubscriptionActivated(event.resource);
        break;

      case 'BILLING.SUBSCRIPTION.UPDATED':
        await handleSubscriptionUpdated(event.resource);
        break;

      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await handleSubscriptionCancelled(event.resource);
        break;

      case 'PAYMENT.SALE.COMPLETED':
        await handlePaymentCompleted(event.resource);
        break;
    }

    res.json({ received: true });
  } catch (error) {
    logger.error({ error, body: req.body }, 'Error processing PayPal webhook');
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function handleSubscriptionActivated(subscription: any): Promise<void> {
  const userId = subscription.custom_id;
  const subscriptionId = subscription.id;

  const plan = await prisma.plan.findFirst({
    where: { paypalPlanId: subscription.plan_id }
  });

  if (!plan) {
    logger.warn({ planId: subscription.plan_id }, 'Plan not found');
    return;
  }

  await processSubscriptionActivated(
    subscriptionId,
    userId,
    plan.id,
    subscription.billing_info
  );
}

// backend/src/services/subscriptionService.ts
export async function processSubscriptionActivated(
  paypalSubscriptionId: string,
  userId: string,
  planId: string,
  billingInfo: any
): Promise<void> {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });

  await prisma.$transaction(async (tx) => {
    // 1. Cancelar assinaturas anteriores
    await tx.userPlan.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'CANCELED' }
    });

    // 2. Criar nova assinatura
    const now = new Date();
    const nextBillingTime = billingInfo.nextBillingTime
      ? new Date(billingInfo.nextBillingTime)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await tx.userPlan.create({
      data: {
        userId,
        planId: plan.id,
        status: 'ACTIVE',
        paypalSubscriptionId,
        currentPeriodStart: now,
        currentPeriodEnd: nextBillingTime,
        lastCreditsGrantedAt: now,
      }
    });

    // 3. Conceder créditos mensais
    await grantMonthlyCredits(userId);
  });

  logger.info({ userId, planId, paypalSubscriptionId }, 'Subscription activated');
}
```

---

## API Endpoints

### Credits Endpoints

```typescript
// GET /api/v1/credits/balance
// Retorna saldo atual do usuário
{
  "balance": 350.5,
  "lastUpdated": "2025-11-13T10:30:00Z"
}

// GET /api/v1/credits/transactions
// Lista transações de créditos
// Query params: skip, limit, type
[
  {
    "id": "uuid",
    "type": "SYSTEM_REWARD",
    "amount": 50,
    "notes": "daily_login_reward",
    "timestamp": "2025-11-13T08:00:00Z"
  },
  {
    "id": "uuid",
    "type": "CONSUMPTION",
    "amount": -4,
    "notes": "llm_chat_safe",
    "timestamp": "2025-11-12T15:30:00Z"
  }
]

// POST /api/v1/credits/daily-reward
// Resgata recompensa diária
{
  "success": true,
  "credits": 50,
  "newBalance": 400.5
}

// GET /api/v1/credits/service-costs
// Lista custos de todos serviços
[
  {
    "service": "llm_chat_safe",
    "cost": 2,
    "unit": "per 1k total tokens"
  },
  {
    "service": "image_generation_comfyui",
    "cost": 10,
    "unit": "per image"
  }
]
```

### Plans Endpoints

```typescript
// GET /api/v1/plans
// Lista planos disponíveis
[
  {
    "id": "uuid",
    "name": "Free",
    "description": "...",
    "price": 0,
    "creditsMonthly": 200,
    "features": { ... }
  },
  {
    "id": "uuid",
    "name": "CharHub Plus",
    "description": "...",
    "price": 5.00,
    "creditsMonthly": 2000,
    "features": { ... }
  }
]

// POST /api/v1/plans/subscribe
// Inicia assinatura de plano
{
  "planId": "uuid"
}
// Response:
{
  "clientSecret": "stripe_client_secret", // Para Stripe Elements
  "subscriptionId": "stripe_sub_id"
}

// POST /api/v1/plans/cancel
// Cancela assinatura atual
{
  "subscriptionId": "stripe_sub_id"
}

// GET /api/v1/plans/current
// Retorna plano atual do usuário
{
  "plan": {
    "id": "uuid",
    "name": "CharHub Plus",
    "status": "ACTIVE",
    "startDate": "2025-11-01",
    "endDate": "2025-12-01",
    "nextBillingDate": "2025-12-01"
  },
  "isPlusActive": true
}
```

### Referral Endpoints

```typescript
// GET /api/v1/referrals/code
// Retorna código de indicação do usuário
{
  "code": "ABC123XYZ",
  "url": "https://charhub.app/?ref=ABC123XYZ",
  "stats": {
    "totalReferrals": 5,
    "creditsEarned": 2500,
    "plusDaysEarned": 25
  }
}

// POST /api/v1/referrals/validate
// Valida e processa código de indicação (chamado no signup)
{
  "referralCode": "ABC123XYZ"
}
```

---

## Frontend Components

### 1. Credits Display (Header)

```tsx
// frontend/src/components/CreditsDisplay.tsx

import { useCredits } from '@/hooks/useCredits';

export function CreditsDisplay() {
  const { balance, isLoading } = useCredits();

  if (isLoading) {
    return <Skeleton width={100} />;
  }

  return (
    <div className="credits-display">
      <CoinIcon className="icon" />
      <span className="amount">{Math.floor(balance)}</span>
      <Link to="/credits" className="details-link">
        <ChevronDown />
      </Link>
    </div>
  );
}
```

---

### 2. Daily Reward Button

```tsx
// frontend/src/components/DailyRewardButton.tsx

export function DailyRewardButton() {
  const { canClaimDaily, claimDailyReward, isLoading } = useCredits();
  const [claimed, setClaimed] = useState(false);

  const handleClaim = async () => {
    try {
      await claimDailyReward();
      setClaimed(true);
      toast.success('🎁 50 créditos resgatados!');
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (claimed || !canClaimDaily) {
    return (
      <button disabled className="btn-secondary">
        ✅ Resgatado Hoje
      </button>
    );
  }

  return (
    <button
      onClick={handleClaim}
      disabled={isLoading}
      className="btn-primary pulse"
    >
      🎁 Resgatar 50 Créditos
    </button>
  );
}
```

---

### 3. Transaction History

```tsx
// frontend/src/pages/CreditsPage.tsx

export function CreditsPage() {
  const { transactions, balance } = useCredits();

  return (
    <div className="credits-page">
      <div className="balance-card">
        <h2>Saldo Atual</h2>
        <div className="balance-amount">{Math.floor(balance)}</div>
        <div className="balance-subtitle">créditos disponíveis</div>
      </div>

      <DailyRewardButton />

      <div className="transactions-section">
        <h3>Histórico de Transações</h3>

        <table className="transactions-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Descrição</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.id}>
                <td>{formatDate(tx.timestamp)}</td>
                <td><TransactionTypeBadge type={tx.type} /></td>
                <td>{formatNotes(tx.notes)}</td>
                <td className={tx.amount > 0 ? 'positive' : 'negative'}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

### 4. Cost Preview

```tsx
// frontend/src/components/CostPreview.tsx

interface CostPreviewProps {
  serviceType: string;
  estimatedUnits: number; // Ex: tokens, images, etc
}

export function CostPreview({ serviceType, estimatedUnits }: CostPreviewProps) {
  const { getServiceCost, balance } = useCredits();

  const cost = getServiceCost(serviceType);
  const estimatedCost = Math.ceil(estimatedUnits * cost.creditsPerUnit);

  const canAfford = balance >= estimatedCost;

  return (
    <div className={`cost-preview ${!canAfford ? 'insufficient' : ''}`}>
      <CoinIcon />
      <span>~{estimatedCost} créditos</span>

      {!canAfford && (
        <Tooltip content="Saldo insuficiente">
          <WarningIcon />
        </Tooltip>
      )}
    </div>
  );
}
```

---

### 5. Plans Comparison

```tsx
// frontend/src/components/PlansComparison.tsx

export function PlansComparison() {
  const { plans, currentPlan, subscribe } = usePlans();

  return (
    <div className="plans-grid">
      {plans.map(plan => (
        <div key={plan.id} className={`plan-card ${plan.id === currentPlan?.id ? 'active' : ''}`}>
          <div className="plan-header">
            <h3>{plan.name}</h3>
            <div className="plan-price">
              {plan.price === 0 ? (
                <span className="free">Grátis</span>
              ) : (
                <>
                  <span className="amount">${plan.price}</span>
                  <span className="period">/mês</span>
                </>
              )}
            </div>
          </div>

          <div className="plan-credits">
            <CoinIcon />
            <span>{plan.creditsMonthly} créditos/mês</span>
          </div>

          <ul className="plan-features">
            {Object.entries(plan.features).map(([key, value]) => (
              value && <li key={key}><CheckIcon /> {formatFeature(key)}</li>
            ))}
          </ul>

          {plan.id === currentPlan?.id ? (
            <button disabled className="btn-secondary">
              Plano Atual
            </button>
          ) : (
            <button
              onClick={() => subscribe(plan.id)}
              className="btn-primary"
            >
              {plan.price === 0 ? 'Selecionar' : 'Assinar'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## Roadmap de Implementação

### Fase 1: Core System (2-3 semanas) ✅ CONCLUÍDA

**Prioridade**: Alta
**Esforço**: 60-80 horas

- [x] **Schema Prisma** (4h)
  - ✅ Models criados: CreditTransaction, ServiceCreditCost, Plan, UserPlan, UserMonthlyBalance, UserPlusAccess, UsageLog
  - ✅ Migrations aplicadas
  - ✅ Seed com 3 planos (Free, Plus, Premium)
  - ✅ Seed com 18 custos de serviços configurados

- [x] **Service de Créditos** (12h)
  - ✅ `getCurrentBalance()` - Calcular saldo com snapshots
  - ✅ `createTransaction()` - Criar transação de crédito
  - ✅ `claimDailyReward()` - Resgatar recompensa diária
  - ✅ `grantMonthlyCredits()` - Conceder créditos mensais
  - ✅ `grantInitialCredits()` - Créditos iniciais no cadastro
  - ✅ `isUserPlusOrBetter()` - Verificar acesso premium
  - ✅ `getTransactionHistory()` - Histórico de transações
  - ⏳ Testes unitários pendentes

- [x] **Service de Uso** (8h)
  - ✅ `logServiceUsage()` - Criar log de uso
  - ✅ `processUsageLogs()` - Processar logs pendentes (job)
  - ✅ `estimateServiceCost()` - Estimar custo de serviço
  - ✅ `getServiceCosts()` - Listar todos os custos
  - ✅ `getUserMonthlyUsage()` - Estatísticas mensais
  - ✅ Calcular créditos baseado em unit_description
  - ⏳ Testes pendentes

- [x] **Jobs Assíncronos (BullMQ)** (8h)
  - ✅ Queue para processar usage logs
  - ✅ Job mensal para conceder créditos de planos (`creditsMonthlyJob.ts`)
  - ✅ Job mensal para criar snapshots de saldo
  - ✅ Worker de processamento (`creditsMonthlyWorker.ts`)
  - ✅ Worker de processamento de uso (`usageProcessingWorker.ts`)

- [x] **API Endpoints** (12h)
  - ✅ `GET /api/v1/credits/balance` - Saldo atual
  - ✅ `GET /api/v1/credits/transactions` - Histórico de transações
  - ✅ `POST /api/v1/credits/daily-reward` - Resgatar recompensa diária
  - ✅ `GET /api/v1/credits/service-costs` - Listar custos de serviços
  - ✅ `POST /api/v1/credits/estimate-cost` - Estimar custo
  - ✅ `GET /api/v1/credits/usage` - Estatísticas de uso
  - ✅ `GET /api/v1/credits/plan` - Plano atual do usuário
  - ✅ `POST /api/v1/credits/check-balance` - Verificar saldo suficiente
  - ⏳ Testes de integração pendentes

- [x] **Frontend - Context & Hooks** (8h)
  - ✅ `CreditsContext` - Estado global de créditos (em useAuth)
  - ✅ `useCredits()` hook disponível
  - ⏳ WebSocket listener para atualização em tempo real (pendente)

- [x] **Frontend - Components** (12h)
  - ✅ `CreditsDisplay` (header) - Implementado
  - ✅ `DailyRewardButton` - Disponível
  - ✅ `TransactionHistory` - Componente criado
  - ✅ `CostPreview` - Para mostrar custos
  - ✅ Página de créditos (`/credits`) - Implementada

**Notas de Implementação**:
- Sistema de créditos totalmente funcional
- 18 tipos de serviços com custos configurados
- Jobs agendados para processamento mensal
- API completa para gerenciamento de créditos
- Frontend com componentes para visualização e interação

---

### Fase 2: Plans & Subscriptions (1-2 semanas) ✅ CONCLUÍDA

**Prioridade**: Alta
**Esforço**: 40-60 horas
**Sistema de Pagamento**: PayPal (PayPal Server SDK)

- [x] **Integração PayPal** (16h)
  - Setup PayPal Server SDK (@paypal/paypal-server-sdk)
  - `createSubscription()` - Criar assinatura PayPal
  - `cancelSubscription()` - Cancelar assinatura
  - `reactivateSubscription()` - Reativar assinatura
  - `changePlan()` - Alterar plano
  - Webhook handler (BILLING.SUBSCRIPTION.*, PAYMENT.SALE.COMPLETED)
  - Configuração de credenciais (sandbox/production)

- [x] **Service de Planos** (8h)
  - `subscribeToPlan()` - Implementado com PayPal SDK
  - `cancelSubscription()` - Implementado
  - `reactivateSubscription()` - Implementado
  - `changePlan()` - Implementado
  - `getSubscriptionStatus()` - Retorna status atual
  - `processSubscriptionActivated()` - Processa ativação via webhook
  - Testes pendentes

- [x] **API Endpoints** (8h)
  - `GET /api/v1/plans` - Listar planos disponíveis
  - `GET /api/v1/subscriptions/status` - Status da assinatura atual
  - `POST /api/v1/subscriptions/subscribe` - Iniciar assinatura (redireciona para PayPal)
  - `POST /api/v1/subscriptions/cancel` - Cancelar assinatura
  - `POST /api/v1/subscriptions/reactivate` - Reativar assinatura
  - `POST /api/v1/webhooks/paypal` - Receber eventos do PayPal

- [x] **Frontend - Plans UI** (12h)
  - `PlansComparison` component - Implementado
  - `subscriptionService` - Service layer para API calls
  - `planService` - Service layer para planos
  - Página de planos (`/plans`) - Implementada
  - Componentes UI: Alert, Card, Badge
  - Fluxo de assinatura com redirecionamento para PayPal
  - Tratamento de callbacks (success/cancelled)

**Notas de Implementação**:
- Substituído Stripe por PayPal como solicitado
- Schema Prisma atualizado: `paypalPlanId`, `paypalSubscriptionId`, `currentPeriodStart`
- Removido: `stripePriceId`, `stripeSubscriptionId`, `stripeCustomerId`
- Webhook signature verification pendente (requer configuração adicional do PayPal)
- Dependências instaladas: `@paypal/paypal-server-sdk`, `date-fns`, `class-variance-authority`, `lucide-react`

---

### Fase 3: Referral System (1 semana)

**Prioridade**: Média
**Esforço**: 20-30 horas

- [ ] **Backend** (12h)
  - Gerar código de referral único no signup
  - `processReferral()` - Conceder recompensas
  - API endpoints de referral
  - Testes

- [ ] **Frontend** (10h)
  - Link de indicação (copiar/compartilhar)
  - Integração com redes sociais
  - Dashboard de estatísticas de referrals

---

### Fase 4: Admin Dashboard (1 semana)

**Prioridade**: Baixa
**Esforço**: 20-30 horas

- [ ] **Backend** (12h)
  - Endpoints admin para ajustes manuais
  - Relatórios de uso e receita
  - Gerenciamento de custos de serviços

- [ ] **Frontend** (10h)
  - Painel admin
  - Ajuste manual de créditos
  - Edição de custos de serviços
  - Visualização de métricas

---

### Fase 5: Purchase Credits (futuro)

**Prioridade**: Baixa
**Esforço**: 15-20 horas

- [ ] Pacotes de créditos avulsos ($5 = 500 créditos, etc)
- [ ] Checkout one-time com Stripe
- [ ] Frontend para compra direta

---

## Métricas e KPIs

### Métricas de Negócio

- **Conversion Rate**: % de usuários free que assinam plano pago
- **ARPU** (Average Revenue Per User): Receita média por usuário
- **Churn Rate**: % de assinantes que cancelam mensalmente
- **Referral Rate**: % de novos usuários vindos de indicações

### Métricas de Produto

- **Daily Active Users (DAU)**: Usuários que fazem login diariamente
- **Daily Reward Claim Rate**: % de DAU que resgata recompensa
- **Average Credits Used Per User**: Média de créditos gastos
- **Credit Balance Distribution**: Quantos usuários têm 0, 1-100, 100-500, 500+ créditos

### Queries de Análise

```sql
-- Conversion rate (free para pago)
SELECT
  COUNT(DISTINCT CASE WHEN price_usd_monthly > 0 THEN user_id END) * 100.0 / COUNT(DISTINCT user_id) as conversion_rate
FROM user_plans
WHERE status = 'ACTIVE';

-- Créditos consumidos por serviço (top 10)
SELECT
  service_type,
  COUNT(*) as usage_count,
  SUM(credits_consumed) as total_credits
FROM usage_logs
WHERE credits_consumed IS NOT NULL
GROUP BY service_type
ORDER BY total_credits DESC
LIMIT 10;

-- Usuários com saldo negativo (alerta)
SELECT
  u.id,
  u.email,
  -- calcular saldo usando função
FROM users u
WHERE getCurrentBalance(u.id) < 0;

-- Daily reward claim rate
SELECT
  DATE(timestamp) as date,
  COUNT(DISTINCT user_id) as users_claimed,
  -- DAU na data...
FROM credit_transactions
WHERE transaction_type = 'SYSTEM_REWARD'
  AND notes = 'daily_login_reward'
GROUP BY DATE(timestamp);
```

---

## Considerações Finais

### Segurança

- ✅ Validar saldo antes de operações críticas
- ✅ Rate limiting em endpoints de claim (prevenir abuse)
- ✅ Logs de auditoria para todas transações
- ✅ Webhook signature verification (Stripe)

### Performance

- ✅ Snapshots mensais reduzem queries de saldo
- ✅ Processamento assíncrono não bloqueia usuário
- ✅ Índices em campos frequentemente consultados
- ✅ Cache de service costs (Redis)

### UX

- ✅ Mostrar custo **antes** de ações custarem créditos
- ✅ Feedback imediato ao ganhar/gastar créditos
- ✅ Notificações quando saldo está baixo
- ✅ Call-to-action clara para assinar quando sem créditos

### Escalabilidade

- ✅ Sistema preparado para múltiplos planos
- ✅ Configuração de custos externalizável (JSON)
- ✅ Suporte a múltiplas moedas (futuro)
- ✅ Arquitetura permite easy add de novos serviços

---

**Documentação criada em**: 2025-11-13
**Autor**: Time CharHub
**Versão**: 1.0
