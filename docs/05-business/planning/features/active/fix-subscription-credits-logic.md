# Feature: Corrigir Lógica de Créditos de Assinatura

**Status**: 🔴 Em Planejamento
**Prioridade**: 🔥 CRÍTICA
**Agente**: Agent Coder
**Data**: 2025-12-22
**Branch**: `feature/fix-subscription-credits-logic`

---

## 📋 Sumário Executivo

### Problema Reportado

Usuário criou conta gratuita (ganhou 200 créditos iniciais ✓), mas ao assinar o plano Plus no dia seguinte (que deveria conceder 2000 créditos imediatamente), recebeu apenas 200 créditos extras ao invés de 2000.

### Causa Raiz Identificada

Análise do código revelou **múltiplos problemas críticos** na lógica de concessão de créditos:

1. **Bug Crítico**: Função `grantMonthlyCredits()` busca plano ativo sem verificar duplicatas
2. **Plano FREE**: Não há mecanismo automático para créditos mensais (job existe mas não é agendado)
3. **Campo Inútil**: `lastCreditsGrantedAt` é setado mas nunca usado para validação
4. **Lógica Incorreta**: Não diferencia corretamente entre planos FREE e PREMIUM

---

## 🎯 Objetivos da Correção

### Regras de Negócio Corretas

#### Plano FREE
- ✅ 200 créditos iniciais no signup (já funciona)
- ⚠️ **NOVO**: A cada 30 dias, SE o usuário acessar, recebe mais 200 créditos
- ⚠️ **NOVO**: NÃO é acumulativo (se passar 60 dias sem acessar, recebe apenas 200, não 400)
- ⚠️ **NOVO**: Calcula períodos de 30 dias a partir do aniversário da assinatura
- ⚠️ **NOVO**: Créditos expiram se não reivindicados antes do próximo período

**Exemplo FREE:**
- Dia 1: Cria conta → 200 créditos
- Dia 38 (após 30 dias): Acessa → +200 créditos (período 2)
- Dia 100 (após 60 dias sem acessar desde dia 38): Acessa → +200 créditos (período 3, não acumula períodos perdidos)

#### Planos PREMIUM (Plus, Premium)
- ✅ **IMEDIATO**: Créditos caem no momento da assinatura
- ⚠️ **NOVO**: A cada 30 dias do aniversário, créditos caem AUTOMATICAMENTE
- ⚠️ **NOVO**: NÃO depende de acesso do usuário (usuário está pagando)
- ⚠️ **NOVO**: Webhooks de pagamento devem validar antes de conceder (evitar duplicatas)

**Exemplo PREMIUM:**
- Dia 1: Assina Plus → 2000 créditos (imediato)
- Dia 31: Renovação automática → +2000 créditos (automático via webhook)
- Dia 61: Renovação automática → +2000 créditos (automático via webhook)

---

## 🔍 Análise Técnica Detalhada

### Arquivos Afetados

| Arquivo | Problema Atual | Ação Necessária |
|---------|----------------|-----------------|
| `backend/src/services/creditService.ts:392-422` | `grantMonthlyCredits()` não valida duplicatas | Adicionar validação com `lastCreditsGrantedAt` |
| `backend/src/services/subscriptionService.ts:359` | Chama `grantMonthlyCredits()` sem validação | Implementar validação antes da chamada |
| `backend/src/routes/webhooks/paypal.ts:124` | Webhook renova sem verificar período | Validar período antes de conceder |
| `backend/src/routes/webhooks/stripe.ts` | Mesma lógica do PayPal | Validar período antes de conceder |
| `backend/src/queues/jobs/creditsMonthlyJob.ts` | Job existe mas não é agendado | Implementar agendamento + lógica FREE |
| `backend/src/middleware/auth.ts` (ou similar) | Não verifica créditos FREE no login | Adicionar verificação de períodos elegíveis |

### Fluxo Atual vs. Fluxo Correto

#### ❌ Fluxo Atual (INCORRETO)

```
SIGNUP FREE:
1. Usuário cria conta → grantInitialCredits() → 200 créditos ✓
2. Cria UserPlan (FREE, status: ACTIVE) ✓

ASSINATURA PREMIUM:
1. Webhook PayPal/Stripe recebe evento
2. processSubscriptionActivated() é chamado
3. Cria/Atualiza UserPlan (PLUS, status: ACTIVE)
4. Chama grantMonthlyCredits() imediatamente
5. grantMonthlyCredits() busca:
   - WHERE status = ACTIVE
   - WHERE currentPeriodEnd > now
   - PROBLEMA: Encontra QUALQUER plano ativo (pode ser o FREE ainda!)
6. Concede créditos do plano ERRADO ❌
```

#### ✅ Fluxo Correto (NOVO)

```
SIGNUP FREE:
1. Usuário cria conta → grantInitialCredits() → 200 créditos ✓
2. Cria UserPlan (FREE, status: ACTIVE, createdAt: now) ✓
3. lastCreditsGrantedAt = now (marca primeiro período)

FREE - CRÉDITOS MENSAIS (LOGIN):
1. Usuário faz login
2. Middleware verifica:
   - É plano FREE?
   - Já passou 30 dias desde lastCreditsGrantedAt?
   - Ainda não recebeu créditos deste período?
3. SE sim → Concede 200 créditos + Atualiza lastCreditsGrantedAt
4. SE não → Nada acontece

ASSINATURA PREMIUM:
1. Webhook PayPal/Stripe recebe evento
2. processSubscriptionActivated() é chamado
3. CANCELA/INATIVA plano FREE anterior (se existir)
4. Cria NOVO UserPlan (PLUS, status: ACTIVE)
5. Valida: Este plano já recebeu créditos? (verifica lastCreditsGrantedAt)
6. SE não → Concede créditos do plano PREMIUM (2000 para Plus)
7. Atualiza lastCreditsGrantedAt = now

PREMIUM - RENOVAÇÃO AUTOMÁTICA (WEBHOOK):
1. Webhook recebe evento de renovação (PAYMENT.SALE.COMPLETED)
2. Busca UserPlan por subscriptionId
3. Valida:
   - Já passou 30 dias desde lastCreditsGrantedAt?
   - OU lastCreditsGrantedAt é null?
4. SE sim → Concede créditos mensais
5. SE não → Ignora (evita duplicatas)
6. Atualiza lastCreditsGrantedAt = now

PREMIUM - JOB MENSAL (BACKUP):
1. Cron roda diariamente às 00:00 UTC
2. Busca UserPlans PREMIUM onde:
   - status = ACTIVE
   - lastCreditsGrantedAt < now - 30 dias
   - OU lastCreditsGrantedAt = null
3. Para cada um → Concede créditos
4. Atualiza lastCreditsGrantedAt
```

---

## 📐 Estrutura de Dados

### UserPlan Model (Prisma)

```prisma
model UserPlan {
  id                    String             @id @default(uuid())
  userId                String
  planId                String
  status                SubscriptionStatus @default(ACTIVE)

  // Período atual da assinatura
  currentPeriodStart    DateTime
  currentPeriodEnd      DateTime

  // 🔴 CAMPO CHAVE PARA A CORREÇÃO
  lastCreditsGrantedAt  DateTime?  // Última vez que créditos MENSAIS foram concedidos

  // Outros campos...
  paymentProvider       PaymentProvider?
  paypalSubscriptionId  String?            @unique
  stripeSubscriptionId  String?            @unique
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt
}
```

### Lógica de Períodos de 30 Dias

```typescript
// Calcular se usuário é elegível para créditos
function isEligibleForMonthlyCredits(userPlan: UserPlan): boolean {
  const now = new Date();

  // Se nunca recebeu créditos mensais, não é elegível
  // (créditos iniciais já foram dados no signup)
  if (!userPlan.lastCreditsGrantedAt) {
    return false;
  }

  // Calcular quantos dias se passaram desde o último grant
  const daysSinceLastGrant = differenceInDays(now, userPlan.lastCreditsGrantedAt);

  // Elegível se passou 30+ dias
  return daysSinceLastGrant >= 30;
}

// Calcular período atual (1, 2, 3, etc)
function getCurrentPeriod(userPlan: UserPlan): number {
  const now = new Date();
  const referenceDate = userPlan.lastCreditsGrantedAt || userPlan.createdAt;

  const daysSinceStart = differenceInDays(now, referenceDate);

  // Período atual = quantos blocos de 30 dias se passaram + 1
  return Math.floor(daysSinceStart / 30) + 1;
}
```

---

## 🛠️ Plano de Implementação

### Status
- [x] Planning complete
- [x] Backend implementation (all 5 phases complete)
- [ ] Testing
- [ ] Documentation
- [ ] Ready for PR

### Implementation Progress

#### Phase 1: Refatorar creditService.ts ✅
- [x] **1.1** Criar função `isEligibleForMonthlyCredits(userPlan)`
  - Verificar se passou 30+ dias desde `lastCreditsGrantedAt`
  - Retornar boolean

- [x] **1.2** Criar função `getCurrentPeriod(userPlan)`
  - Calcular período atual baseado em blocos de 30 dias
  - Retornar número do período

- [x] **1.3** Refatorar `grantMonthlyCredits(userId, planId?)`
  - Adicionar validação de elegibilidade ANTES de conceder
  - Adicionar parâmetro opcional `planId` para especificar plano
  - Prevenir duplicatas usando `lastCreditsGrantedAt`
  - Atualizar `lastCreditsGrantedAt` DENTRO da mesma transação

- [x] **1.4** Criar função `grantFreeMonthlyCreditsOnLogin(userId)`
  - Específica para planos FREE
  - Verifica elegibilidade (30+ dias desde último grant)
  - Concede 200 créditos SE elegível
  - Atualiza `lastCreditsGrantedAt`

- [x] **1.5** Atualizar `grantInitialCredits()`
  - Adicionar `lastCreditsGrantedAt: now` ao criar UserPlan FREE

#### Phase 2: Corrigir subscriptionService.ts ✅
- [x] **2.1** Refatorar `processSubscriptionActivated()`
  - ANTES de criar novo UserPlan → Inativar planos anteriores (status: CANCELLED)
  - AO criar novo UserPlan → NÃO setar `lastCreditsGrantedAt` ainda
  - DEPOIS de criar → Chamar `grantMonthlyCredits()` com planId
  - Garantir que créditos do novo plano são concedidos imediatamente

- [x] **2.2** Adicionar função `processPaymentSucceeded()` para renovações
  - Trata webhooks de renovação mensal
  - Valida elegibilidade antes de conceder créditos
  - Ativa assinatura se estava suspensa

#### Phase 3: Corrigir Webhooks (PayPal + Stripe) ✅
- [x] **3.1** PayPal: `handlePaymentCompleted()` em `routes/webhooks/paypal.ts`
  - Atualizado para passar planId para `grantMonthlyCredits`
  - Validação de duplicatas feita internamente por `grantMonthlyCredits`
  - Logs melhorados para debugging

- [x] **3.2** Stripe: Adicionar tratamento de `invoice.payment_succeeded`
  - Novo caso no StripeProvider.processWebhook()
  - Retorna action 'PAYMENT_SUCCEEDED'
  - Atualizado IPaymentProvider.ts com nova action
  - subscriptionService.ts trata novo caso com `processPaymentSucceeded()`

#### Phase 4: Implementar Lógica FREE (Login-Based) ✅
- [x] **4.1** Criar middleware `checkFreeMonthlyCredits` em `backend/src/middleware/`
  - Executa APÓS autenticação JWT
  - Verifica se usuário tem plano FREE ativo
  - Chama `grantFreeMonthlyCreditsOnLogin(userId)`
  - Silencioso: não afeta response mesmo se houver erro

- [x] **4.2** Adicionar middleware às rotas protegidas
  - Aplicado globalmente em `routes/v1/index.ts`
  - Roda após OAuth mas antes de todas as outras rotas
  - Cobre todas as rotas autenticadas automaticamente

#### Phase 5: Implementar Job Mensal (Backup para PREMIUM) ✅
- [x] **5.1** Job `creditsMonthlyJob.ts` já existente
  - Lógica já usa `grantMonthlyCredits()` que tem validação interna
  - Não precisa de alterações - já está correto!

- [x] **5.2** Agendar job em `backend/src/queues/workers/index.ts`
  - Criada função `scheduleRecurringJobs()`
  - Cron: `'0 0 * * *'` (diariamente às 00:00 UTC) para grant_credits
  - Cron: `'0 1 1 * *'` (1º dia do mês às 01:00 UTC) para snapshots
  - Chamada em `backend/src/index.ts` após `initializeWorkers()`

#### Phase 6: Testes
- [ ] **6.1** Testes Unitários
  - `isEligibleForMonthlyCredits()`
  - `getCurrentPeriod()`
  - `grantMonthlyCredits()` com validação
  - `grantFreeMonthlyCreditsOnLogin()`

- [ ] **6.2** Testes de Integração
  - Signup FREE → 200 créditos iniciais
  - Login FREE após 30 dias → +200 créditos
  - Login FREE após 60 dias (sem acesso no meio) → +200 (não acumula)
  - Assinar Plus → Inativa FREE + Concede 2000 imediatamente
  - Renovação Plus após 30 dias → +2000 (webhook)
  - Job mensal → Concede créditos para elegíveis

- [ ] **6.3** Testes Manuais
  - Criar conta FREE → Verificar 200 créditos
  - Assinar Plus → Verificar 2000 créditos + FREE inativado
  - Simular webhook de renovação → Verificar duplicatas prevenidas
  - Avançar relógio (30 dias) → Verificar job mensal

#### Phase 7: Documentação
- [ ] **7.1** Atualizar `docs/03-reference/backend/credits-system.md`
  - Documentar novas funções
  - Explicar lógica de períodos de 30 dias
  - Diferenciar FREE vs PREMIUM

- [ ] **7.2** Atualizar `docs/04-architecture/database-schema.md`
  - Explicar uso correto de `lastCreditsGrantedAt`

- [ ] **7.3** Criar migration guide (se necessário)
  - Para usuários existentes
  - Inicializar `lastCreditsGrantedAt` = `createdAt` para planos existentes

---

## 🧪 Casos de Teste

### Teste 1: Signup FREE
**Entrada**: Novo usuário se registra
**Esperado**:
- ✅ UserPlan criado (FREE, status: ACTIVE)
- ✅ 200 créditos concedidos (tipo: GRANT_INITIAL)
- ✅ `lastCreditsGrantedAt` = now

### Teste 2: FREE - Login após 30 dias
**Setup**:
- Usuário FREE criado há 35 dias
- `lastCreditsGrantedAt` = createdAt (35 dias atrás)

**Entrada**: Usuário faz login
**Esperado**:
- ✅ Middleware detecta elegibilidade
- ✅ +200 créditos concedidos (tipo: GRANT_PLAN)
- ✅ `lastCreditsGrantedAt` atualizado para now

### Teste 3: FREE - Login após 29 dias (não elegível)
**Setup**:
- Usuário FREE criado há 29 dias
- `lastCreditsGrantedAt` = createdAt (29 dias atrás)

**Entrada**: Usuário faz login
**Esperado**:
- ✅ Middleware detecta NÃO elegível
- ✅ Nenhum crédito concedido
- ✅ `lastCreditsGrantedAt` permanece inalterado

### Teste 4: FREE - Login após 65 dias (não acumula)
**Setup**:
- Usuário FREE criado há 65 dias
- `lastCreditsGrantedAt` = createdAt (65 dias atrás)

**Entrada**: Usuário faz login
**Esperado**:
- ✅ Middleware detecta elegibilidade
- ✅ +200 créditos concedidos (NÃO 400!)
- ✅ `lastCreditsGrantedAt` atualizado para now
- ✅ Período anterior (30-60 dias) expirou sem ser reivindicado

### Teste 5: Assinar Plus (de FREE)
**Setup**:
- Usuário FREE existente (200 créditos)
- Assina plano Plus

**Entrada**: Webhook de ativação
**Esperado**:
- ✅ UserPlan FREE inativado (status: INACTIVE)
- ✅ Novo UserPlan PLUS criado (status: ACTIVE)
- ✅ +2000 créditos concedidos (tipo: GRANT_PLAN)
- ✅ `lastCreditsGrantedAt` = now
- ✅ Total de créditos = 2200 (200 iniciais + 2000 do Plus)

### Teste 6: Renovação Plus após 30 dias (Webhook)
**Setup**:
- Usuário Plus há 31 dias
- `lastCreditsGrantedAt` = 31 dias atrás

**Entrada**: Webhook PAYMENT.SALE.COMPLETED
**Esperado**:
- ✅ Validação detecta elegibilidade (31 >= 30)
- ✅ +2000 créditos concedidos
- ✅ `lastCreditsGrantedAt` atualizado para now

### Teste 7: Webhook Duplicado (Prevenção)
**Setup**:
- Usuário Plus
- `lastCreditsGrantedAt` = 5 dias atrás (recente)

**Entrada**: Webhook PAYMENT.SALE.COMPLETED (duplicado ou erro)
**Esperado**:
- ✅ Validação detecta NÃO elegível (5 < 30)
- ✅ Nenhum crédito concedido
- ✅ Log de aviso criado
- ✅ `lastCreditsGrantedAt` permanece inalterado

### Teste 8: Job Mensal - Usuários Elegíveis
**Setup**:
- 3 usuários Plus:
  - User A: `lastCreditsGrantedAt` = 35 dias atrás (elegível)
  - User B: `lastCreditsGrantedAt` = 15 dias atrás (não elegível)
  - User C: `lastCreditsGrantedAt` = 60 dias atrás (elegível)

**Entrada**: Job mensal executa
**Esperado**:
- ✅ User A recebe 2000 créditos
- ✅ User B NÃO recebe (muito recente)
- ✅ User C recebe 2000 créditos
- ✅ `lastCreditsGrantedAt` atualizado para A e C

### Teste 9: Cancelamento e Reativação
**Setup**:
- Usuário Plus cancela assinatura
- 45 dias depois, reassina Plus

**Entrada**: Webhook de reativação
**Esperado**:
- ✅ Novo UserPlan PLUS criado
- ✅ +2000 créditos concedidos imediatamente
- ✅ `lastCreditsGrantedAt` = now (novo período inicia)

---

## 🚨 Riscos e Mitigações

### Risco 1: Usuários Existentes sem `lastCreditsGrantedAt`
**Problema**: Usuários antigos podem ter `lastCreditsGrantedAt = null`
**Mitigação**:
- Migration script para inicializar campo
- Usar `lastCreditsGrantedAt || createdAt` como fallback
- Documentar comportamento para usuários legacy

### Risco 2: Webhooks Duplicados
**Problema**: PayPal/Stripe podem enviar eventos duplicados
**Mitigação**:
- Validação rigorosa com `lastCreditsGrantedAt`
- Idempotência: verificar antes de conceder
- Logs detalhados para debugging

### Risco 3: Job Mensal Falha
**Problema**: Job pode falhar e não conceder créditos
**Mitigação**:
- Retry automático (BullMQ)
- Alertas de falha
- Webhooks são fonte primária (job é backup)

### Risco 4: Usuário FREE com Múltiplos Logins no Mesmo Dia
**Problema**: Usuário pode fazer login 10x no mesmo dia após 30 dias
**Mitigação**:
- Validação verifica `lastCreditsGrantedAt` em CADA login
- Após conceder, campo é atualizado
- Próximos logins do mesmo dia não concedem novamente

### Risco 5: Timezone Issues
**Problema**: Usuários em diferentes timezones
**Mitigação**:
- Sempre usar UTC no backend
- Calcular dias usando `differenceInDays()` (date-fns)
- 30 dias = 30 dias completos em UTC

---

## 📊 Métricas de Sucesso

### Imediato
- ✅ Testes automatizados passando (100% coverage nas novas funções)
- ✅ Testes manuais confirmam comportamento correto
- ✅ Nenhum erro de duplicata nos logs

### Curto Prazo (1 semana)
- ✅ Nenhum report de créditos incorretos
- ✅ Logs mostram validações funcionando
- ✅ Job mensal executando sem falhas

### Médio Prazo (1 mês)
- ✅ Métricas de concessão de créditos corretas
- ✅ Nenhum chargeback relacionado a créditos
- ✅ Usuários FREE recebendo créditos mensais no login

---

## 🔄 Migration de Dados (Se Necessário)

### Script de Migration

```typescript
// backend/src/scripts/fixLastCreditsGrantedAt.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Buscar todos os UserPlans sem lastCreditsGrantedAt
  const plansToFix = await prisma.userPlan.findMany({
    where: { lastCreditsGrantedAt: null },
  });

  console.log(`Found ${plansToFix.length} plans to fix`);

  for (const plan of plansToFix) {
    // Inicializar com createdAt (conservador)
    await prisma.userPlan.update({
      where: { id: plan.id },
      data: { lastCreditsGrantedAt: plan.createdAt },
    });

    console.log(`Fixed plan ${plan.id} for user ${plan.userId}`);
  }

  console.log('Migration complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Executar**:
```bash
cd backend
npx ts-node src/scripts/fixLastCreditsGrantedAt.ts
```

---

## 📝 Notas Importantes

### Para Agent Reviewer
- Esta correção é CRÍTICA e afeta receita (usuários pagando mas não recebendo créditos)
- Testes devem ser rigorosos antes do merge
- Considerar rollout gradual (feature flag?)
- Monitorar logs de produção por 1 semana após deploy

### Para Agent Coder (Eu)
- Seguir TDD: escrever testes ANTES de implementar
- Usar transações Prisma para garantir atomicidade
- Logar TUDO (debug, info, warn, error)
- Não esquecer de atualizar `lastCreditsGrantedAt` em TODAS as concessões

### Dependências
- `date-fns` (já instalado)
- BullMQ (já instalado)
- Prisma (já instalado)

### Breaking Changes
- Nenhuma (backward compatible)
- Migration script cuida de usuários existentes

---

## ✅ Definition of Done

- [ ] Todo o código implementado conforme plano
- [ ] Testes unitários >= 90% coverage nas funções novas
- [ ] Testes de integração cobrindo todos os casos de teste listados
- [ ] Testes manuais executados e aprovados
- [ ] Documentação atualizada
- [ ] PR criado com descrição detalhada
- [ ] Agent Reviewer aprovou PR
- [ ] Deploy em staging bem-sucedido
- [ ] Monitoramento de 48h em staging sem erros
- [ ] Deploy em production autorizado

---

## 📞 Questões em Aberto

Nenhuma no momento. Todas as regras de negócio foram esclarecidas pelo usuário.

---

## 📝 Resumo da Implementação

### ✅ Mudanças Realizadas

**Arquivos Modificados:**
1. `backend/src/services/creditService.ts` - Funções de validação e controle de períodos
2. `backend/src/services/subscriptionService.ts` - Correção de ativação e renovação
3. `backend/src/services/payments/IPaymentProvider.ts` - Nova action 'PAYMENT_SUCCEEDED'
4. `backend/src/services/payments/StripeProvider.ts` - Tratamento de invoice.payment_succeeded
5. `backend/src/routes/webhooks/paypal.ts` - Validação em renovações
6. `backend/src/middleware/checkFreeMonthlyCredits.ts` - **NOVO** Middleware para FREE
7. `backend/src/routes/v1/index.ts` - Aplicação do middleware globalmente
8. `backend/src/queues/workers/index.ts` - Agendamento de jobs recorrentes
9. `backend/src/index.ts` - Chamada de scheduleRecurringJobs()

**Funções Criadas:**
- `isEligibleForMonthlyCredits(userPlan)` - Valida se passou 30+ dias
- `getCurrentPeriod(userPlan)` - Calcula período atual (1, 2, 3...)
- `grantFreeMonthlyCreditsOnLogin(userId)` - Créditos FREE no login
- `processPaymentSucceeded(subscriptionId, userId, planId)` - Renovações mensais
- `checkFreeMonthlyCredits` (middleware) - Verificação automática
- `scheduleRecurringJobs()` - Agendamento de cron jobs

**Funções Refatoradas:**
- `grantMonthlyCredits(userId, planId?)` - Agora com validação anti-duplicata
- `grantInitialCredits(userId)` - Agora seta lastCreditsGrantedAt
- `processSubscriptionActivated()` - Inativa planos anteriores + passa planId

### 🔄 Fluxo Correto Implementado

**Signup FREE:**
1. Usuário cria conta → 200 créditos iniciais ✓
2. `lastCreditsGrantedAt` = now (inicia contagem de 30 dias) ✓

**Acesso FREE (após 30+ dias):**
1. Middleware `checkFreeMonthlyCredits` roda em toda rota autenticada ✓
2. Verifica se é plano FREE + passou 30 dias ✓
3. Se sim → +200 créditos ✓
4. Atualiza `lastCreditsGrantedAt` ✓

**Assinatura PREMIUM:**
1. Webhook de ativação recebido ✓
2. Planos anteriores (FREE) inativados (CANCELLED) ✓
3. Novo UserPlan PREMIUM criado ✓
4. `grantMonthlyCredits(userId, planId)` concede créditos imediatamente ✓
5. `lastCreditsGrantedAt` atualizado ✓

**Renovação PREMIUM (Mensal):**
1. Webhook `invoice.payment_succeeded` (Stripe) ou `PAYMENT.SALE.COMPLETED` (PayPal) ✓
2. `processPaymentSucceeded()` ou `handlePaymentCompleted()` chamado ✓
3. Valida: Passou 30+ dias desde `lastCreditsGrantedAt`? ✓
4. Se sim → Concede créditos mensais ✓
5. Se não → Ignora (previne duplicatas) ✓

**Job Mensal (Backup):**
1. Roda diariamente às 00:00 UTC ✓
2. Processa TODOS usuários ✓
3. `grantMonthlyCredits()` tem validação interna ✓
4. Só concede para elegíveis (30+ dias) ✓

### 🎯 Problemas Resolvidos

✅ **Bug Principal**: Ao assinar plano Premium, usuário recebia créditos do plano FREE ao invés de Premium
- **Solução**: `grantMonthlyCredits()` agora aceita `planId` opcional e inativa planos anteriores

✅ **Duplicatas**: Webhooks duplicados podiam conceder créditos múltiplas vezes
- **Solução**: Validação com `lastCreditsGrantedAt` previne grants < 30 dias

✅ **Planos FREE**: Não havia mecanismo para créditos mensais
- **Solução**: Middleware de login verifica e concede automaticamente

✅ **Stripe Renewals**: Evento `invoice.payment_succeeded` não era tratado
- **Solução**: Novo handler no StripeProvider + action PAYMENT_SUCCEEDED

✅ **Job Mensal**: Existia mas não era agendado
- **Solução**: `scheduleRecurringJobs()` agenda com cron pattern

---

**Última Atualização**: 2025-12-22 (Implementação completa - 5 phases)
**Próximo Passo**: Testes locais com docker-compose
