# Sistema de População Automática de Personagens via Civitai

**Feature ID**: FEAT-AUTO-POP-001
**Created**: 2025-12-25
**Updated**: 2025-12-25
**Status**: ✅ APPROVED - Ready to Start
**Priority**: CRITICAL (Tier 1) - Start Immediately
**Estimated Effort**: 3-4 semanas
**Business Value**: ⭐⭐⭐⭐⭐
**Technical Complexity**: ⚠️⚠️⚠️ Alta
**Assigned to**: Agent Coder (to be assigned)

---

## ✅ Product Owner Decisions (2025-12-25)

**Aprovações:**
- ✅ Feature aprovada para desenvolvimento imediato
- ✅ Dashboard Público já implementado (pode começar agora)
- ✅ Roleplay Message Formatting já implementado
- ✅ Civitai API disponível (API key fornecida pelo PO)
- ✅ Quota diária aprovada: 20 personagens/dia
- ✅ Publicação automática: Personagens vão direto para produção (públicos)
- ✅ Revisão humana: NÃO bloqueante (pode ser fase futura - opcional)

**Simplificações Aprovadas:**
- Remove manual review gate (personagens publicam automaticamente)
- Revisão humana é feature futura (admin dashboard para reprovar/regenerar)
- Foco em MVP: Captura → Curadoria automática → Geração → Publicação

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Contexto e Motivação](#contexto-e-motivação)
3. [Objetivos de Negócio](#objetivos-de-negócio)
4. [Arquitetura Proposta](#arquitetura-proposta)
5. [Requisitos Funcionais](#requisitos-funcionais)
6. [Requisitos Não-Funcionais](#requisitos-não-funcionais)
7. [Implementação Técnica](#implementação-técnica)
8. [Roadmap de Implementação](#roadmap-de-implementação)
9. [Riscos e Mitigações](#riscos-e-mitigações)
10. [Estimativas e Custos](#estimativas-e-custos)
11. [Critérios de Aceitação](#critérios-de-aceitação)
12. [Métricas de Sucesso](#métricas-de-sucesso)

---

## Visão Geral

Sistema automatizado de curadoria e geração de personagens que:
1. **Captura imagens** de fontes externas (Civitai) de forma automatizada
2. **Filtra e classifica** conteúdo por qualidade e adequação
3. **Gera personagens** em lote usando sistema existente
4. **Publica automaticamente** com diversidade e balanceamento etário
5. **Executa periodicamente** para manter catálogo atualizado

### Diferencial

Aproveita 70% da infraestrutura existente:
- ✅ Sistema de geração automática já implementado
- ✅ Sistema de análise de imagem com IA
- ✅ Sistema de avatar generation (ComfyUI)
- ✅ Sistema de créditos e validação

**Novo:** Camada de curadoria, scheduling e automação

---

## Contexto e Motivação

### Problema Atual

**CharHub está em Beta funcional mas enfrenta chicken-and-egg problem:**

```
❌ Usuários novos chegam → Não encontram personagens interessantes
                         ↓
                    Abandonam o site
                         ↓
                 Não criam personagens
                         ↓
            Site continua vazio (ciclo vicioso)
```

### Situação Atual
- ✅ Sistema de pagamentos funcionando
- ✅ Sistema de chat robusto
- ✅ Geração manual de personagens implementada
- ❌ **Catálogo de personagens vazio ou muito limitado**
- ❌ **Impossível fazer divulgação sem conteúdo inicial**
- ❌ **Dependência 100% de UGC (User Generated Content) inicial**

### Solução Proposta

**Sistema automatizado que popula o catálogo ANTES da divulgação pública:**

```
✅ Sistema captura imagens de qualidade (Civitai)
                         ↓
✅ Gera personagens diversos automaticamente
                         ↓
✅ Novos usuários encontram 100-200 personagens prontos
                         ↓
✅ Testam o produto imediatamente
                         ↓
✅ Maior retenção e conversão
                         ↓
✅ Começam a criar seus próprios personagens
                         ↓
     Ciclo virtuoso estabelecido
```

---

## Objetivos de Negócio

### Objetivo Principal
**Viabilizar divulgação pública do Beta** com catálogo robusto de personagens de qualidade.

### Objetivos Secundários

| Objetivo | Meta | Métrica |
|----------|------|---------|
| **Catálogo Inicial** | 100-200 personagens antes do launch | Contagem de personagens públicos |
| **Diversidade** | Cobrir todas classificações etárias | % de distribuição por rating |
| **Qualidade** | Rating médio > 4.0/5.0 | User ratings após 30 dias |
| **Retenção** | Aumentar em 40% vs baseline | Day 1, Day 7, Day 30 retention |
| **Conversão** | Aumentar signup rate em 30% | Visitante → Signup conversion |
| **Redução de CAC** | Demonstrar valor antes de signup | Time to first interaction |

### Business Case

**Sem a feature:**
- Divulgação prematura = alta taxa de abandono
- Má primeira impressão = difícil recuperar usuário
- Dependência de early adopters criarem conteúdo
- Timeline longo até critical mass

**Com a feature:**
- Divulgação com catálogo pronto = boa primeira impressão
- Usuários testam imediatamente = maior conversão
- Reduz dependência de UGC inicial
- Acelera crescimento orgânico

---

## Arquitetura Proposta

### Diagrama de Sistema

```
┌──────────────────────────────────────────────────────────────┐
│                    FLUXO COMPLETO                            │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  FASE 1: CAPTURA DE IMAGENS (Civitai Integration)          │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────┐
│  Civitai API Client / Web Scraper                 │
│  - GET /api/v1/images (trending weekly)           │
│  - Filter: rating > 4.5, SFW/NSFW flags           │
│  - Search by keywords (diversity)                 │
│  - Respect rate limits (1000 req/day)             │
└────────────────┬───────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────┐
│  Image Download & Storage Service                 │
│  - Download to temp storage                       │
│  - Basic validation (format, size, corruption)    │
│  - Store metadata (source URL, tags, rating)      │
└────────────────┬───────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────┐
│  FASE 2: CURADORIA E CLASSIFICAÇÃO                │
└────────────────┬───────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────┐
│  AI Content Analyzer (Existing + New)             │
│  - Image classification (anime/real/fantasy)       │
│  - Age rating detection (Livre/10+/.../18+)       │
│  - Content safety check (NSFW filter)             │
│  - Quality score (composition, clarity)           │
│  - Tag extraction (character traits)              │
└────────────────┬───────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────┐
│  Curation Queue (Database Table)                  │
│  - Status: pending/approved/rejected               │
│  - Metadata: rating, tags, source                 │
│  - Diversity score (avoid duplicates)             │
└────────────────┬───────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────┐
│  Optional: Manual Review Dashboard                │
│  - Admin UI to review/approve/reject              │
│  - Flag problematic content                       │
│  - Override auto-classification                   │
└────────────────┬───────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────┐
│  FASE 3: GERAÇÃO EM LOTE                          │
└────────────────┬───────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────┐
│  Scheduler (Cron / BullMQ Repeatable Job)        │
│  - Daily execution: 2 AM UTC                      │
│  - Select 20 approved images (configurable)       │
│  - Diversification algorithm:                     │
│    • Balance age ratings (distribute evenly)      │
│    • Balance styles (anime/real/fantasy)          │
│    • Avoid similar tags (max 2 per day)           │
└────────────────┬───────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────┐
│  Batch Character Generator (New Service)          │
│  - Wraps existing automated generation            │
│  - Sequential processing (avoid API overload)     │
│  - Error handling & retry logic                   │
│  - Progress tracking per batch                    │
└────────────────┬───────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────┐
│  Existing: Automated Character Generation         │
│  (/api/v1/characters/generate)                    │
│  - Image analysis agent                           │
│  - LLM character compilation                      │
│  - Avatar generation (ComfyUI)                    │
│  - WebSocket progress (skipped in batch mode)     │
└────────────────┬───────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────┐
│  FASE 4: PUBLICAÇÃO                               │
└────────────────┬───────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────┐
│  Auto-Publishing Service                          │
│  - Set visibility: PUBLIC                         │
│  - Set creator: "CharHub Official" bot account    │
│  - Add tag: "curated" or "official"               │
│  - Index for search/discovery                     │
└────────────────┬───────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────┐
│  Quality Assurance                                │
│  - Log generation results                         │
│  - Track success/failure rates                    │
│  - Flag low-quality outputs                       │
│  - Notify admin on errors                         │
└────────────────┬───────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────┐
│  MONITORING & ANALYTICS                           │
└────────────────┬───────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────┐
│  Metrics Dashboard                                │
│  - Characters generated per day                   │
│  - Success/failure rate                           │
│  - Cost per character                             │
│  - User engagement with curated chars             │
│  - Age rating distribution                        │
└────────────────────────────────────────────────────┘
```

---

## Requisitos Funcionais

### RF-001: Integração com Civitai
**Descrição:** Sistema deve capturar imagens do Civitai automaticamente

**Critérios:**
- [ ] Consumir Civitai API (ou scraping se API não disponível)
- [ ] Filtrar por rating (>4.5), popularidade, período (semanal)
- [ ] Buscar por keywords para diversidade (50+ keywords configuráveis)
- [ ] Respeitar rate limits (max 1000 req/dia)
- [ ] Download de imagens para storage temporário
- [ ] Salvar metadata (source URL, tags, rating, author)

### RF-002: Curadoria Automatizada
**Descrição:** Filtrar e classificar imagens antes da geração

**Critérios:**
- [ ] Análise de conteúdo com IA (existing image classification agent)
- [ ] Detecção de classificação etária (Livre, 10+, 12+, 14+, 16+, 18+)
- [ ] Filtro de segurança (NSFW content detection)
- [ ] Score de qualidade (composition, clarity, artistic merit)
- [ ] Detecção de duplicatas (evitar personagens similares)
- [ ] Extração de tags relevantes (hair color, style, etc.)

### RF-003: Admin Dashboard para Revisão (FUTURE - Não MVP)
**Descrição:** Dashboard para revisão manual APÓS publicação (Fase Futura - não bloqueante)

**Status:** 🔮 FUTURE FEATURE - Não implementar no MVP

**Critérios (Fase Futura):**
- [ ] UI para admin visualizar personagens publicados
- [ ] Reprovar personagens (remove da galeria pública)
- [ ] Regenerar personagens (trigger manual com nova imagem)
- [ ] Override de classificação etária
- [ ] Adicionar notas/comentários
- [ ] Analytics de quality e user reports

**Nota:** PO aprovou publicação automática sem review manual. Admin dashboard é enhancement futuro.

### RF-004: Geração em Lote (Batch Processing)
**Descrição:** Gerar múltiplos personagens de forma automatizada

**Critérios:**
- [ ] Processar 20 personagens por execução (configurável)
- [ ] Seleção diversificada (balancear ratings, styles, tags)
- [ ] Usar sistema existente de geração automática
- [ ] Error handling robusto (retry até 3x por falha)
- [ ] Progress tracking (log de cada geração)
- [ ] Timeout por personagem (max 5 minutos)

### RF-005: Scheduler (Execução Periódica)
**Descrição:** Automatizar execução diária/semanal

**Critérios:**
- [ ] Cron job diário (2 AM UTC)
- [ ] Configurável via env vars (frequência, quantidade)
- [ ] Health check (notificar se falhar 2x consecutivas)
- [ ] Manual trigger via admin dashboard (opcional)
- [ ] Logs de execução (timestamp, resultados, erros)

### RF-006: Publicação Automática
**Descrição:** Personagens gerados devem aparecer no catálogo público

**Critérios:**
- [ ] Visibilidade: PUBLIC (aparece no dashboard)
- [ ] Creator: "CharHub Official" (bot account)
- [ ] Tag especial: "curated" ou "official"
- [ ] Distribuição por rating (todos acessíveis a seus públicos)
- [ ] Indexação para busca/discovery

### RF-007: Diversificação
**Descrição:** Garantir variedade no catálogo gerado

**Critérios:**
- [ ] Balancear classificações etárias (mínimo 15% cada rating)
- [ ] Balancear estilos (anime, realistic, fantasy, sci-fi)
- [ ] Evitar tags repetidas (max 2 personagens com mesma tag/dia)
- [ ] Gênero balanceado (40-60% male/female, 10% non-binary)
- [ ] Diversidade étnica/cultural

---

## Requisitos Não-Funcionais

### RNF-001: Performance
- Tempo de processamento: max 2 horas para batch de 20 personagens
- API response time: <500ms para endpoints de monitoramento
- Queue processing: sem bloquear outras operações do sistema

### RNF-002: Confiabilidade
- Uptime do scheduler: 99.5%
- Taxa de sucesso: >85% dos personagens gerados com qualidade
- Retry automático em caso de falha (max 3 tentativas)

### RNF-003: Segurança
- Validação de conteúdo NSFW: >98% precisão
- Proteção contra content policy violation
- Não expor API keys em logs
- Rate limiting próprio (evitar abuse)

### RNF-004: Custo
- Custo por personagem: <$0.02 USD
- Custo mensal total: <$20 USD (para 600 personagens/mês)
- Monitoramento de gastos (alertas se >$50/mês)

### RNF-005: Observabilidade
- Logs estruturados (JSON) para todas operações
- Métricas exportadas (Prometheus/Grafana)
- Alertas em caso de falhas (email/Slack)
- Dashboard de monitoramento (admin UI)

### RNF-006: Manutenibilidade
- Código modular e testável (unit tests >80% coverage)
- Configuração via env vars (fácil ajustar parâmetros)
- Documentação técnica completa
- Rollback plan (reverter automação se problemas)

---

## Implementação Técnica

### Stack Tecnológica

#### Backend (Node.js + TypeScript)

**Novos Componentes:**

```typescript
// 1. Civitai Integration
backend/src/services/civitai/
  ├── civitaiApiClient.ts      // API client (axios)
  ├── imageDownloader.ts       // Download & storage
  ├── searchKeywords.ts        // Keyword management
  └── rateLimiter.ts           // Rate limit control

// 2. Curation System
backend/src/services/curation/
  ├── contentAnalyzer.ts       // Wraps existing image classifier
  ├── ageRatingClassifier.ts   // Age rating logic
  ├── qualityScorer.ts         // Image quality assessment
  ├── duplicateDetector.ts     // Similarity check
  └── curationQueue.ts         // Queue management

// 3. Batch Generation
backend/src/services/batch/
  ├── batchCharacterGenerator.ts  // Main orchestrator
  ├── diversificationAlgorithm.ts // Selection logic
  ├── batchProgressTracker.ts     // Progress monitoring
  └── batchErrorHandler.ts        // Error recovery

// 4. Scheduler
backend/src/jobs/
  ├── scheduledCharacterPopulation.ts  // Main cron job
  └── characterPopulationQueue.ts      // BullMQ queue

// 5. Admin API (Optional - Phase 2)
backend/src/routes/v1/admin/
  └── curation.ts              // Admin endpoints
```

**Modificações em Componentes Existentes:**

```typescript
// Adaptar para modo batch (sem WebSocket)
backend/src/controllers/automatedCharacterGenerationController.ts
  └── Adicionar parâmetro: batchMode: boolean

// Criar conta bot oficial
backend/prisma/seed.ts
  └── Seed: CharHub Official bot user
```

#### Database (PostgreSQL + Prisma)

**Novo Schema:**

```prisma
// Tabela de curadoria de imagens
model CuratedImage {
  id              String   @id @default(cuid())
  sourceUrl       String   @unique
  sourceId        String?  // Civitai image ID
  sourcePlatform  String   @default("civitai")

  // Metadata
  tags            String[] // Civitai tags
  sourceRating    Float?   // Rating original (1-5)
  author          String?  // Artista original
  license         String?  // License info

  // Curation
  status          CurationStatus @default(PENDING)
  ageRating       AgeRating?
  qualityScore    Float?
  contentTags     String[] // AI-generated tags

  // Storage
  localPath       String?  // Temp storage path
  uploadedToR2    Boolean  @default(false)
  r2Url           String?

  // Processing
  generatedCharId String?  @unique
  generatedChar   Character? @relation(fields: [generatedCharId], references: [id])

  // Audit
  createdAt       DateTime @default(now())
  processedAt     DateTime?
  rejectedAt      DateTime?
  rejectionReason String?

  @@index([status, ageRating])
  @@index([createdAt])
}

enum CurationStatus {
  PENDING      // Aguardando classificação
  APPROVED     // Aprovado para geração
  REJECTED     // Rejeitado (conteúdo inadequado)
  PROCESSING   // Em processo de geração
  COMPLETED    // Personagem gerado com sucesso
  FAILED       // Falha na geração
}

// Tabela de logs de batch
model BatchGenerationLog {
  id                String   @id @default(cuid())
  scheduledAt       DateTime
  executedAt        DateTime @default(now())
  completedAt       DateTime?

  // Stats
  targetCount       Int      // Quantos deveria gerar
  successCount      Int      @default(0)
  failureCount      Int      @default(0)

  // Details
  selectedImages    String[] // IDs das imagens selecionadas
  generatedCharIds  String[] // IDs dos personagens gerados
  errors            Json?    // Erros encontrados

  // Metrics
  duration          Int?     // Segundos
  costEstimate      Float?   // USD

  @@index([scheduledAt])
}
```

#### Environment Variables

```bash
# Civitai Integration
CIVITAI_API_KEY=your_key_here # (se API oficial)
CIVITAI_API_BASE_URL=https://civitai.com/api/v1
CIVITAI_RATE_LIMIT=1000 # requests per day
CIVITAI_SEARCH_KEYWORDS=anime,fantasy,sci-fi,realistic,medieval,modern # comma-separated

# Batch Generation
BATCH_GENERATION_ENABLED=true
BATCH_SIZE_PER_RUN=20
BATCH_SCHEDULE_CRON="0 2 * * *" # Daily at 2 AM UTC
BATCH_RETRY_ATTEMPTS=3
BATCH_TIMEOUT_MINUTES=5

# Curation
AUTO_APPROVAL_THRESHOLD=4.5 # Auto-approve if quality score > 4.5
REQUIRE_MANUAL_REVIEW=false # Set true to require admin approval
NSFW_FILTER_ENABLED=true
NSFW_FILTER_STRICTNESS=medium # low | medium | high

# Bot Account
OFFICIAL_BOT_USER_ID=00000000-0000-0000-0000-000000000001

# Monitoring
SLACK_WEBHOOK_URL=https://hooks.slack.com/... # Alerts
ADMIN_EMAIL=admin@charhub.app # Error notifications
```

---

## Roadmap de Implementação

### Fase 1: Fundação (Semana 1)
**Objetivo:** Integração básica com Civitai + infraestrutura de curadoria

#### Tasks Backend
- [ ] Setup projeto: criar estrutura de pastas
- [ ] Implementar `civitaiApiClient.ts` (API integration)
- [ ] Implementar `imageDownloader.ts` (download + storage)
- [ ] Implementar `searchKeywords.ts` (keyword search)
- [ ] Implementar `rateLimiter.ts` (rate limiting)
- [ ] Criar schema Prisma: `CuratedImage`
- [ ] Migrations: aplicar schema
- [ ] Seed: criar conta bot "CharHub Official"

#### Tasks Testing
- [ ] Unit tests para API client (mock Civitai)
- [ ] Integration tests para download
- [ ] Test: rate limiter funciona corretamente

#### Entregável Fase 1
✅ Sistema capaz de buscar e baixar imagens do Civitai via API/scraping

---

### Fase 2: Curadoria & Classificação (Semana 2)
**Objetivo:** Filtrar e classificar imagens automaticamente

#### Tasks Backend
- [ ] Implementar `contentAnalyzer.ts` (wrapper do image classifier existente)
- [ ] Implementar `ageRatingClassifier.ts` (age detection logic)
- [ ] Implementar `qualityScorer.ts` (quality assessment)
- [ ] Implementar `duplicateDetector.ts` (similarity check)
- [ ] Implementar `curationQueue.ts` (queue management)
- [ ] Criar endpoint: `POST /api/v1/admin/curation/trigger-analysis`
- [ ] Criar endpoint: `GET /api/v1/admin/curation/pending`

#### Tasks Testing
- [ ] Test: age rating classifier accuracy (sample dataset)
- [ ] Test: quality scorer consistency
- [ ] Test: duplicate detection (similar images)
- [ ] Integration test: full curation pipeline

#### Entregável Fase 2
✅ Imagens baixadas são classificadas e armazenadas com metadata completo

---

### Fase 3: Geração em Lote (Semana 3)
**Objetivo:** Gerar múltiplos personagens automaticamente

#### Tasks Backend
- [ ] Implementar `diversificationAlgorithm.ts` (selection logic)
- [ ] Implementar `batchCharacterGenerator.ts` (orchestrator)
- [ ] Implementar `batchProgressTracker.ts` (monitoring)
- [ ] Implementar `batchErrorHandler.ts` (retry logic)
- [ ] Modificar `automatedCharacterGenerationController.ts`:
  - Adicionar `batchMode: boolean` parameter
  - Desabilitar WebSocket quando `batchMode=true`
  - Retornar minimal response em batch mode
- [ ] Criar schema Prisma: `BatchGenerationLog`
- [ ] Criar endpoint: `POST /api/v1/admin/batch/generate` (manual trigger)

#### Tasks Testing
- [ ] Test: diversification algorithm (balanced selection)
- [ ] Test: batch generator (20 characters)
- [ ] Test: error handling (retry logic)
- [ ] Load test: verificar que não sobrecarrega sistema

#### Entregável Fase 3
✅ Capaz de gerar 20 personagens em lote (manual trigger)

---

### Fase 4: Scheduler & Automação (Semana 4)
**Objetivo:** Automatizar execução diária

#### Tasks Backend
- [ ] Implementar `scheduledCharacterPopulation.ts` (cron job)
- [ ] Implementar `characterPopulationQueue.ts` (BullMQ queue)
- [ ] Configurar BullMQ repeatable job (daily at 2 AM UTC)
- [ ] Implementar health check (monitor failures)
- [ ] Implementar alerting (Slack/email on errors)
- [ ] Criar endpoint: `GET /api/v1/admin/batch/logs` (view history)
- [ ] Criar endpoint: `GET /api/v1/admin/batch/stats` (metrics)

#### Tasks Monitoring
- [ ] Dashboard: batch execution history
- [ ] Dashboard: success/failure rates
- [ ] Dashboard: cost tracking
- [ ] Alertas: notificar se falhar 2x consecutivas

#### Tasks Testing
- [ ] Test: scheduler executa no horário correto
- [ ] Test: health check detecta falhas
- [ ] Test: alertas são enviados corretamente
- [ ] Test: manual trigger não conflita com scheduled job

#### Entregável Fase 4
✅ Sistema totalmente automatizado gerando 20 personagens diários

---

### Fase 5: Publicação & QA (Semana 5 - Final)
**Objetivo:** Polimento, testes finais, documentação

#### Tasks Backend
- [ ] Implementar auto-publishing (set PUBLIC visibility)
- [ ] Adicionar tag "curated" aos personagens
- [ ] Implementar post-generation quality check
- [ ] Implementar rollback mechanism (reverter se muitas falhas)

#### Tasks Admin UI (Opcional - pode ser CLI)
- [ ] Dashboard: listar personagens curados
- [ ] Dashboard: visualizar métricas em tempo real
- [ ] Dashboard: aprovar/rejeitar imagens pendentes (manual review)
- [ ] Dashboard: triggear geração manual

#### Tasks Testing
- [ ] End-to-end test: Civitai → Geração → Publicação
- [ ] Performance test: batch de 50 personagens
- [ ] Security audit: NSFW filter effectiveness
- [ ] Cost audit: confirmar <$20/mês

#### Tasks Documentation
- [ ] README: overview do sistema
- [ ] Runbook: como operar (start/stop, troubleshooting)
- [ ] Architecture doc: diagramas atualizados
- [ ] API docs: novos endpoints
- [ ] Monitoring guide: como interpretar métricas

#### Entregável Fase 5
✅ Sistema em produção gerando personagens automaticamente com monitoramento

---

## Riscos e Mitigações

### Risco 1: Civitai API - Acesso e Rate Limits
**Severidade:** 🟢 BAIXA
**Probabilidade:** Baixa

**Descrição:**
Uso da API do Civitai está aprovado. Risco reduzido a questões técnicas (rate limits, disponibilidade).

**Status Atual:**
✅ **RESOLVIDO** - Product Owner possui API key do Civitai
✅ Usar API oficial (não scraping)
✅ Respeitar rate limits da API

**Mitigação:**
1. ✅ API key configurada em environment variables (segura)
2. Implementar rate limiter próprio (respeitar limites da API)
3. Monitoring de quotas (alertas se aproximar do limite)
4. Fallback: Cache local de imagens (buffer de 7 dias)
5. Error handling: Retry com exponential backoff
6. Considerar fontes alternativas para diversificação futura:
   - Artstation API
   - DeviantArt API
   - Dataset público (Hugging Face)

**Status:** ✅ RESOLVIDO - API disponível, risco controlado

---

### Risco 2: Custo de Geração Excessivo
**Severidade:** 🟡 MÉDIA
**Probabilidade:** Baixa

**Descrição:**
Custos com API de IA podem explodir com geração em lote.

**Cálculo:**
```
20 chars/dia × 30 dias = 600 chars/mês
600 chars × 100 créditos = 60,000 créditos/mês

Custo estimado (Gemini + ComfyUI):
- Image analysis: $0.002/image × 600 = $1.20
- LLM generation: $0.005/char × 600 = $3.00
- Avatar generation (ComfyUI): local = $0
Total: ~$5/mês (muito baixo!)
```

**Mitigação:**
1. Monitoramento de custos em tempo real
2. Alertas se custo > $50/mês
3. Quota diária configurável (reduzir se necessário)
4. Cache de prompts comuns (reduzir chamadas LLM)
5. Usar modelos mais baratos para batch (ex: Gemini Flash)

**Status:** ✅ BAIXO - Custos estimados aceitáveis

---

### Risco 3: Qualidade Variável dos Personagens
**Severidade:** 🟡 MÉDIA
**Probabilidade:** Alta

**Descrição:**
Personagens auto-gerados podem ser genéricos ou inconsistentes.

**Mitigação:**
1. **Quality Gate:** Só publicar se quality score > 4.0
2. **Manual Review Semanal:** Admin revisa sample (10 personagens/semana)
3. **User Feedback:** Coletar ratings e ajustar prompts
4. **Iteração de Prompts:** A/B testing de prompts LLM
5. **Fallback:** Manter opção de criação manual para personagens "premium"
6. **Metrics:** Track user engagement (chats iniciados, ratings)

**Status:** ⚠️ MONITORAR - Implementar métricas de qualidade

---

### Risco 4: Conteúdo NSFW/Inadequado
**Severidade:** 🔴 ALTA
**Probabilidade:** Média

**Descrição:**
Sistema pode gerar ou publicar conteúdo inadequado. Revisão manual NÃO é bloqueante (aprovação do PO).

**Mitigação (MVP - Automática):**
1. **Filtro NSFW Duplo:**
   - Pre-generation: Civitai metadata + AI analysis
   - Post-generation: Re-scan após avatar gerado
2. **Age Rating Strict:** Conservative classification (quando em dúvida, rating +18)
3. **User Reports:** Sistema de denúncia rápido (já existente no CharHub)
4. **Whitelist de Tags:** Só aceitar tags pré-aprovadas inicialmente
5. **Kill Switch:** Pausar automação se >5 reports em 24h
6. **Civitai Ratings:** Usar apenas imagens com rating >4.5 e metadata confiável

**Mitigação (Fase Futura - Admin Dashboard):**
- Admin UI para revisar personagens publicados
- Reprovar personagens (remove da galeria)
- Regenerar personagens (trigger manual)
- Analytics de quality scores e reports

**Status:** ⚠️ CRÍTICO - Implementar filtros robustos automatizados (manual review é opcional)

---

### Risco 5: Civitai API Instável ou Mudança de Estrutura
**Severidade:** 🟡 MÉDIA
**Probabilidade:** Média

**Descrição:**
Civitai pode alterar API ou estrutura de dados.

**Mitigação:**
1. **Adapter Pattern:** Isolar lógica de API em módulo separado
2. **Versionamento:** Suportar múltiplas versões da API
3. **Monitoring:** Alertas se API retornar erros >10%
4. **Fallback:** Cache local de imagens (buffer de 7 dias)
5. **Múltiplas Fontes:** Não depender 100% de Civitai
6. **Error Handling:** Graceful degradation (continuar com cache)

**Status:** ✅ CONTROLÁVEL - Arquitetura modular

---

### Risco 6: Performance - Sistema Sobrecarregado
**Severidade:** 🟡 MÉDIA
**Probabilidade:** Baixa

**Descrição:**
Geração em lote pode afetar performance para usuários reais.

**Mitigação:**
1. **Scheduling Inteligente:** Executar em horários de baixo tráfego (2-4 AM)
2. **Queue System:** BullMQ com concurrency limitada (max 2 parallel)
3. **Throttling:** Delay de 30s entre gerações
4. **Resource Limits:** CPU/Memory limits no Docker
5. **Monitoring:** Alertas se latência >500ms para usuários
6. **Priority Queue:** Usuários reais tem prioridade sobre batch

**Status:** ✅ CONTROLÁVEL - Usar queue system

---

## Estimativas e Custos

### Estimativa de Esforço

| Fase | Duração | Complexidade | Dependências |
|------|---------|--------------|--------------|
| **Fase 1: Fundação** | 5-7 dias | Média | Civitai API docs |
| **Fase 2: Curadoria** | 5-7 dias | Alta | Fase 1 completa |
| **Fase 3: Batch Generation** | 3-5 dias | Média | Fases 1-2 completas |
| **Fase 4: Scheduler** | 3-5 dias | Média | Fase 3 completa |
| **Fase 5: QA & Docs** | 5-7 dias | Baixa | Todas fases completas |
| **TOTAL** | **21-31 dias** | **3-4 semanas** | - |

### Breakdown Detalhado

```
Semana 1 (Fase 1):
├─ Civitai integration: 2 dias
├─ Image download: 1 dia
├─ Database schema: 1 dia
├─ Tests: 1 dia
└─ Buffer: 1-2 dias

Semana 2 (Fase 2):
├─ Content analyzer: 2 dias
├─ Age rating classifier: 2 dias
├─ Quality scorer: 1 dia
├─ Tests: 1 dia
└─ Buffer: 1 dia

Semana 3 (Fase 3):
├─ Diversification algo: 1 dia
├─ Batch generator: 2 dias
├─ Error handling: 1 dia
├─ Tests: 1 dia
└─ Buffer: 1 dia

Semana 4 (Fase 4):
├─ Scheduler setup: 1 dia
├─ BullMQ config: 1 dia
├─ Monitoring: 1 dia
├─ Admin endpoints: 1 dia
├─ Tests: 1 dia
└─ Buffer: 1 dia

Semana 5 (Fase 5):
├─ End-to-end tests: 2 dias
├─ Security audit: 1 dia
├─ Documentation: 2 dias
└─ Deployment: 1 dia
```

### Custos Operacionais

#### Custos Mensais Estimados

**Geração de Personagens:**
```
Quota diária: 20 personagens
Quota mensal: 600 personagens

Breakdown por personagem:
├─ Image analysis (Gemini Vision): $0.002
├─ LLM character gen (Gemini Pro): $0.005
├─ Avatar generation (ComfyUI local): $0.00
└─ R2 Storage (2MB): $0.00003

Total por personagem: ~$0.007
Total mensal: 600 × $0.007 = $4.20/mês
```

**Infrastructure:**
```
├─ BullMQ (Redis): $0 (já existente)
├─ Database (Postgres): $0 (já existente)
├─ Storage (R2): ~$0.02/mês (1.2GB × $0.015/GB)
└─ Compute: $0 (usa infra existente)

Total: ~$0.02/mês
```

**Total Estimado:** **$5-10 USD/mês** (muito baixo!)

#### ROI Analysis

**Investimento:**
- Desenvolvimento: 3-4 semanas (one-time)
- Custo operacional: $10/mês

**Retorno:**
- 600 personagens gerados automaticamente
- Viabiliza divulgação pública
- Aumenta retenção (estimado +40%)
- Reduz CAC (demonstra valor antes signup)
- Valor estimado: $1,000+ em conteúdo UGC equivalente

**ROI:** MUITO ALTO ⭐⭐⭐⭐⭐

---

## Critérios de Aceitação

### Critério 1: Captura de Imagens
- [ ] Sistema captura 50+ imagens de qualidade do Civitai semanalmente
- [ ] Respeita rate limits (0 errors de rate limiting)
- [ ] Metadata completo armazenado (tags, rating, author, license)
- [ ] Diversidade de estilos (min 30% anime, 30% realistic, 20% fantasy, 20% outros)

### Critério 2: Curadoria
- [ ] 100% das imagens classificadas automaticamente
- [ ] Age rating accuracy >90% (validado com sample de 100 imagens)
- [ ] NSFW filter accuracy >95% (zero false negatives)
- [ ] Quality score correlaciona com user ratings (R² > 0.7)
- [ ] Duplicatas detectadas e evitadas (max 5% similaridade)

### Critério 3: Geração em Lote
- [ ] Batch de 20 personagens completa em <2 horas
- [ ] Success rate >85% (min 17/20 personagens publicados)
- [ ] Diversidade balanceada (cada age rating representado)
- [ ] Zero erros que crasham o sistema
- [ ] Retry automático funciona (recupera >70% das falhas)

### Critério 4: Automação
- [ ] Scheduler executa diariamente sem intervenção manual
- [ ] Health check detecta falhas e envia alertas
- [ ] Sistema recupera de falhas automaticamente (restart após crash)
- [ ] Logs completos de todas execuções (min 30 dias de histórico)
- [ ] Manual trigger funciona e não conflita com scheduled jobs

### Critério 5: Qualidade dos Personagens
- [ ] Rating médio >4.0/5.0 (após 30 dias e min 50 ratings)
- [ ] Min 80% dos personagens recebem pelo menos 1 chat iniciado
- [ ] Max 10% de reports por conteúdo inadequado
- [ ] Personalidade coerente com aparência visual (>90% consistency)
- [ ] Nomes culturalmente apropriados (manual review de sample)

### Critério 6: Publicação
- [ ] 100% dos personagens gerados aparecem no dashboard público
- [ ] Visibilidade correta por age rating (usuários veem apenas apropriado)
- [ ] Tag "curated" presente em todos
- [ ] Creator "CharHub Official" em todos
- [ ] Indexados corretamente para busca (encontráveis em <5s)

### Critério 7: Monitoramento
- [ ] Dashboard mostra métricas em tempo real
- [ ] Alertas funcionam (testado com falha simulada)
- [ ] Logs estruturados e queryable (Grafana/Kibana)
- [ ] Cost tracking preciso (<5% erro)
- [ ] Performance metrics exportadas (Prometheus)

### Critério 8: Custo
- [ ] Custo mensal <$20 USD (validado após 30 dias)
- [ ] Custo por personagem <$0.02 USD
- [ ] Sem custos surpresa (todas APIs com billing alerts)

---

## Métricas de Sucesso

### Métricas Primárias (30 dias após launch)

| Métrica | Target | Como Medir |
|---------|--------|------------|
| **Catálogo Inicial** | 100-200 personagens | Count de personagens com tag "curated" |
| **Diversidade de Ratings** | Min 15% cada rating | % distribuição por age rating |
| **Quality Score Médio** | >4.0/5.0 | Avg user ratings (min 50 ratings) |
| **Engagement Rate** | >80% recebem ≥1 chat | % personagens com chatCount > 0 |
| **Report Rate** | <10% reportados | % personagens com ≥1 report |

### Métricas Secundárias

| Métrica | Target | Como Medir |
|---------|--------|------------|
| **Batch Success Rate** | >85% | successCount / targetCount |
| **System Uptime** | >99% | Uptime do scheduler |
| **Cost per Character** | <$0.02 | Total cost / characters generated |
| **Generation Time** | <2h para 20 chars | Avg batch duration |
| **Duplicate Rate** | <5% | % de personagens similares |

### Métricas de Negócio (Impact)

| Métrica | Baseline (Atual) | Target (Com Feature) | Como Medir |
|---------|------------------|----------------------|------------|
| **Signup Conversion** | ? | +30% | Visitors → Signups |
| **Day 1 Retention** | ? | +40% | Signups retornando D1 |
| **Time to First Chat** | ? | <2 min | Signup → Primeiro chat |
| **NPS Score** | ? | +15 pts | User surveys |

### Métricas de Acompanhamento Semanal

**Week 1-4 (Ramp-up):**
- Personagens gerados: 20/dia × 7 dias = 140/semana
- Success rate: track tendência (deve estabilizar >85%)
- Custo acumulado: não ultrapassar $20 em 30 dias

**Week 5+ (Steady State):**
- Manutenção: <2h/semana de admin time
- Quality: user ratings trending up
- Diversity: balanceamento mantido

---

## Dependências

### Dependências Técnicas
1. **T005: Dashboard Público** - Deve estar concluído primeiro
   - Personagens curados precisam de lugar para aparecer
   - Visitantes não-autenticados devem poder ver conteúdo "Livre"

2. **Sistema de Geração Automática** - ✅ Já implementado
   - Será utilizado como base

3. **ComfyUI** - ✅ Já configurado
   - Geração de avatars

### Dependências Externas
1. **Civitai API/ToS** - 🔴 CRÍTICO
   - Verificar permissões antes de iniciar
   - Considerar fontes alternativas

2. **Cloudflare R2** - ✅ Já configurado
   - Storage de imagens

3. **LLM Providers (Gemini)** - ✅ Já integrado
   - Character generation

### Dependências de Recursos
1. **Agent Coder** - Disponível após conclusão de T005
2. **Admin/Testing** - Tempo para QA manual (sample review)
3. **Legal Review** - Aprovar uso de imagens de terceiros

---

## Referências

### Documentação Relacionada
- [Automated Character Generation - Implemented](../implemented/automated-character-generation.md)
- [Public Dashboard - Active](../active/public-dashboard.md)
- [System Architecture](../../../../04-architecture/system-overview.md)
- [Image Classification Agent](../../../../01-technical/backend/agents/image-classification.md)

### Recursos Externos
- [Civitai API Documentation](https://github.com/civitai/civitai/wiki/REST-API-Reference)
- [Civitai Terms of Service](https://civitai.com/content/tos)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)

---

## Histórico de Revisões

| Data | Versão | Autor | Alterações |
|------|--------|-------|------------|
| 2025-12-25 | 1.0 | Agent Planner | Spec inicial baseada em proposta do usuário |

---

## Aprovações

- [ ] **User (Product Owner)** - Aprovar proposta e prioridade
- [ ] **Agent Planner** - Spec completa e priorizada
- [ ] **Legal Review** - Aprovar uso de Civitai (verificar ToS)
- [ ] **Agent Coder** - Review de viabilidade técnica
- [ ] **Agent Reviewer** - Aprovar custos operacionais

---

**Status:** 📋 Aguardando aprovação do Product Owner e verificação legal (Civitai ToS)

**Próximo Passo:** User confirmar proposta → Agent Planner verifica ToS Civitai → Move para Active → Assign to Agent Coder
