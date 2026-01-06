# LLM Cost Tracking & Analytics System - Feature Specification

**Status**: 🏗️ Active (Ready for Implementation)
**Version**: 1.0.0
**Date Created**: 2026-01-03
**Last Updated**: 2026-01-03
**Priority**: Critical (Business Intelligence)
**Assigned To**: Agent Planner + Agent Coder
**GitHub Issue**: TBD

---

## Overview

Criar sistema abrangente de rastreamento, mensuração e análise de custos de LLM (Large Language Models) para:
1. Calcular custo real por feature
2. Otimizar pricing de créditos
3. Avaliar lucratividade por plano (FREE, PLUS, PREMIUM)
4. Identificar oportunidades de otimização
5. Planejar sustentabilidade financeira

**Problema Atual**:
- Não sabemos quanto gastamos em LLM por feature
- Preço de créditos não é baseado em dados reais
- Impossível calcular lucratividade de planos pagos
- Não há visibility de custos operacionais
- Decisões de pricing são baseadas em estimativas

**Solução Proposta**:
- Sistema de tracking de tokens (input/output)
- Cálculo automático de custos por requisição
- Dashboard de analytics de custos
- Recomendações de pricing baseadas em dados
- ROI analysis por feature e por plano

---

## Business Value

### Problemas Críticos

**1. Falta de Visibility de Custos**:
- Não sabemos custo real de geração de personagens
- Não sabemos custo de tradução automática
- Não sabemos quanto gastamos com usuários gratuitos
- Impossível prever custos mensais com crescimento

**2. Pricing Arbitrário**:
- Créditos: Quanto vale 1 crédito em $USD?
- Plano PLUS ($5/mês): Quantos créditos devemos dar?
- Plano PREMIUM ($10/mês): Quantos créditos são sustentáveis?
- Daily credits FREE: Quanto podemos dar sem prejuízo?

**3. Risco de Prejuízo**:
- Usuário PLUS paga $5 mas pode gastar $10 em LLM
- Usuários gratuitos podem custar mais que geram valor
- Features podem ter custo > receita

**Impactos**:
- 💸 **Risco Financeiro**: Prejuízo não monitorado
- 📊 **Decisões Cegas**: Sem dados para pricing
- ⚠️ **Insustentabilidade**: Modelo de negócio pode ser inviável
- 🎯 **Falta de Otimização**: Não sabemos onde economizar

---

## Business Objectives

### Primary Goals

1. **Cost Visibility**: Saber exatamente quanto gastamos em LLM
2. **Data-Driven Pricing**: Definir preço de créditos baseado em custos reais
3. **Profitability Analysis**: Calcular lucro por plano (FREE, PLUS, PREMIUM)
4. **Optimization Opportunities**: Identificar features caras e alternativas
5. **Financial Sustainability**: Garantir modelo de negócio viável

### Success Metrics

**Phase 1 - Tracking (Foundation)**:
- [ ] 100% das requisições LLM rastreadas
- [ ] Custo calculado em tempo real
- [ ] Database com histórico de 30+ dias

**Phase 2 - Analytics (Insights)**:
- [ ] Dashboard com custos por feature
- [ ] Custo médio por usuário (FREE vs PAID)
- [ ] ROI por plano calculado

**Phase 3 - Optimization (Action)**:
- [ ] Identificar top 3 features mais caras
- [ ] Recomendar pricing ótimo de créditos
- [ ] Plano de redução de custos (target: -20% sem perder qualidade)

---

## Technical Implementation

### Phase 1: LLM Models Inventory & Cost Research

#### Step 1.1: Map All LLM Models Used

**Current LLM Providers** (based on codebase analysis):
- Google Gemini (via Google Generative AI SDK)
- OpenAI (GPT models)
- XAI Grok (via HTTP API)
- Anthropic Claude (via API) - if used

**Action Items**:
```bash
# Find all LLM API calls in codebase
grep -r "gemini" backend/src --include="*.ts"
grep -r "openai" backend/src --include="*.ts"
grep -r "grok" backend/src --include="*.ts"
grep -r "claude" backend/src --include="*.ts"
```

**Expected Models**:
- Gemini 1.5 Pro (for complex analysis, character generation)
- Gemini 1.5 Flash (for fast, cheaper tasks)
- Gemini Vision (for image analysis - Civit.ai)
- GPT-4 Turbo (if used for critical tasks)
- GPT-3.5 Turbo (if used for cheaper tasks)

---

#### Step 1.2: Research Current Pricing (as of January 2026)

**Action**: Web research for latest pricing

**Google Gemini Pricing** (2026-01 - VERIFY):
```
Gemini 1.5 Pro:
  - Input: $0.00025 / 1K tokens ($0.25 / 1M tokens)
  - Output: $0.001 / 1K tokens ($1.00 / 1M tokens)
  - Context: 2M tokens

Gemini 1.5 Flash:
  - Input: $0.000075 / 1K tokens ($0.075 / 1M tokens)
  - Output: $0.0003 / 1K tokens ($0.30 / 1M tokens)
  - Context: 1M tokens

Gemini 1.5 Flash-8B (cheapest):
  - Input: $0.0000375 / 1K tokens ($0.0375 / 1M tokens)
  - Output: $0.00015 / 1K tokens ($0.15 / 1M tokens)
```

**OpenAI Pricing** (2026-01 - VERIFY):
```
GPT-4 Turbo:
  - Input: $0.01 / 1K tokens ($10 / 1M tokens)
  - Output: $0.03 / 1K tokens ($30 / 1M tokens)

GPT-4o:
  - Input: $0.005 / 1K tokens ($5 / 1M tokens)
  - Output: $0.015 / 1K tokens ($15 / 1M tokens)

GPT-4o-mini:
  - Input: $0.00015 / 1K tokens ($0.15 / 1M tokens)
  - Output: $0.0006 / 1K tokens ($0.60 / 1M tokens)

GPT-3.5 Turbo:
  - Input: $0.0005 / 1K tokens ($0.50 / 1M tokens)
  - Output: $0.0015 / 1K tokens ($1.50 / 1M tokens)
```

**Alternative Providers** (Research for NSFW-friendly):
```
Anthropic Claude 3.5 Sonnet:
  - Input: $0.003 / 1K tokens ($3 / 1M tokens)
  - Output: $0.015 / 1K tokens ($15 / 1M tokens)

Together.ai (open models):
  - Llama 3 70B: $0.0009 / 1M tokens (input+output avg)
  - Mixtral 8x7B: $0.0006 / 1M tokens
  - NSFW-friendly models available

Groq (ultra-fast inference):
  - Llama 3 70B: $0.00059 / 1M tokens (input)
  - Mixtral 8x7B: $0.00024 / 1M tokens
```

---

### Phase 2: Map Features to LLM Usage

**File**: `docs/05-business/analysis/llm-cost-mapping.md` (to be created)

#### Feature 1: Character Generation (AI)

**LLM Calls**:
1. **Image Analysis** (if user uploads image)
   - Model: Gemini 1.5 Flash (with Vision)
   - Input: ~500 tokens (image description prompt)
   - Output: ~300 tokens (gender, species, physical traits)
   - Cost: ~$0.0003/call

2. **Character Data Compilation**
   - Model: Gemini 1.5 Pro
   - Input: ~800 tokens (user description + image analysis + template)
   - Output: ~600 tokens (full character JSON)
   - Cost: ~$0.0008/call

**Total Cost per Character Generation**: ~$0.0011 (with image) or ~$0.0008 (text only)

**Current Credit Price**: 75-100 credits
**Optimal Credit Price**: TBD (after full analysis)

---

#### Feature 2: Story Generation (AI)

**LLM Calls**:
1. **Image Analysis** (if user uploads cover image)
   - Model: Gemini 1.5 Flash (Vision)
   - Input: ~400 tokens
   - Output: ~250 tokens
   - Cost: ~$0.00025/call

2. **Story Compilation**
   - Model: Gemini 1.5 Pro
   - Input: ~1200 tokens (description + characters + plot template)
   - Output: ~1000 tokens (title, synopsis, opening, objectives)
   - Cost: ~$0.0013/call

**Total Cost per Story Generation**: ~$0.00155 (with image) or ~$0.0013 (text only)

**Current Credit Price**: 75-100 credits

---

#### Feature 3: Content Translation

**LLM Calls**:
1. **Character Translation**
   - Model: Gemini 1.5 Flash
   - Input: ~600 tokens (original content + target language)
   - Output: ~600 tokens (translated content)
   - Cost: ~$0.00033/call

2. **Story Translation**
   - Model: Gemini 1.5 Flash
   - Input: ~1500 tokens (story content + target language)
   - Output: ~1500 tokens (translated)
   - Cost: ~$0.00068/call

**Caching**: After first translation, cached for 90% cheaper
**Cost per Translation**: ~$0.00033 (first time), ~$0.00003 (cached)

---

#### Feature 4: Chat Messages (Roleplay)

**LLM Calls**:
1. **Message Generation**
   - Model: Gemini 1.5 Flash (fast response)
   - Input: ~800 tokens (character + conversation history + user message)
   - Output: ~200 tokens (AI response)
   - Cost: ~$0.00015/message

**Frequency**: High volume (users send many messages)
**Cost per User per Day**: ~$0.015 (100 messages average)

---

#### Feature 5: Automated Character Generation (Civit.ai)

**LLM Calls**:
1. **Image Analysis** (for curation)
   - Model: Gemini 1.5 Flash (Vision)
   - Input: ~400 tokens
   - Output: ~300 tokens
   - Cost: ~$0.0003/image

2. **Character Compilation**
   - Model: Gemini 1.5 Pro
   - Input: ~700 tokens
   - Output: ~500 tokens
   - Cost: ~$0.0007/character

**Daily Volume**: 20 characters/day
**Daily Cost**: ~$0.02/day = ~$0.60/month

**Note**: This is automated (no user credits), pure operational cost

---

### Phase 3: Database Schema for Tracking

**File**: `prisma/schema.prisma`

```prisma
// LLM Cost Tracking
model LLMUsageLog {
  id          String   @id @default(cuid())

  // Context
  userId      String?
  user        User?    @relation(fields: [userId], references: [id])
  feature     FeatureType // CHARACTER_GEN, STORY_GEN, TRANSLATION, CHAT, etc
  featureId   String?  // ID of character, story, etc (for drill-down)

  // LLM Details
  provider    LLMProvider // GEMINI, OPENAI, XAI, etc
  model       String   // e.g., "gemini-1.5-pro", "gpt-4o-mini"
  operation   String?  // e.g., "character_analysis", "translation"

  // Token Usage
  inputTokens  Int
  outputTokens Int
  totalTokens  Int

  // Cost Calculation
  inputCost    Decimal  @db.Decimal(10, 6) // Cost in USD
  outputCost   Decimal  @db.Decimal(10, 6)
  totalCost    Decimal  @db.Decimal(10, 6)

  // Timing
  latency      Int?     // Response time in ms
  cached       Boolean  @default(false) // Was response cached?

  // Metadata
  metadata     Json?    // Additional context

  createdAt    DateTime @default(now())

  @@index([userId, feature, createdAt])
  @@index([feature, createdAt])
  @@index([createdAt])
}

enum FeatureType {
  CHARACTER_GENERATION
  STORY_GENERATION
  CONTENT_TRANSLATION
  CHAT_MESSAGE
  AUTOMATED_GENERATION
  IMAGE_ANALYSIS
  OTHER
}

enum LLMProvider {
  GEMINI
  OPENAI
  XAI
  ANTHROPIC
  TOGETHER_AI
  GROQ
}

// LLM Pricing Configuration
model LLMPricing {
  id          String   @id @default(cuid())

  provider    LLMProvider
  model       String   // e.g., "gemini-1.5-pro"

  // Pricing per 1M tokens (USD)
  inputPricePerMillion  Decimal @db.Decimal(10, 4)
  outputPricePerMillion Decimal @db.Decimal(10, 4)

  // Effective date
  effectiveFrom DateTime @default(now())
  effectiveTo   DateTime?

  // Metadata
  source      String?  // e.g., "https://ai.google.dev/pricing"
  notes       String?

  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([provider, model, effectiveFrom])
}
```

---

### Phase 4: Tracking Service

**File**: `backend/src/services/llm/llmUsageTracker.ts`

```typescript
import { PrismaClient, LLMProvider, FeatureType } from '@prisma/client';

const prisma = new PrismaClient();

export interface LLMUsageParams {
  userId?: string;
  feature: FeatureType;
  featureId?: string;
  provider: LLMProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latency?: number;
  cached?: boolean;
  metadata?: any;
}

export async function trackLLMUsage(params: LLMUsageParams) {
  const {
    userId,
    feature,
    featureId,
    provider,
    model,
    inputTokens,
    outputTokens,
    latency,
    cached = false,
    metadata
  } = params;

  // 1. Get pricing for this model
  const pricing = await getLLMPricing(provider, model);

  if (!pricing) {
    console.warn(`No pricing found for ${provider}:${model}, skipping tracking`);
    return null;
  }

  // 2. Calculate costs
  const inputCost = (inputTokens / 1_000_000) * Number(pricing.inputPricePerMillion);
  const outputCost = (outputTokens / 1_000_000) * Number(pricing.outputPricePerMillion);
  const totalCost = inputCost + outputCost;

  // 3. If cached, reduce cost by 90%
  const finalCost = cached ? totalCost * 0.1 : totalCost;

  // 4. Log to database
  const log = await prisma.lLMUsageLog.create({
    data: {
      userId,
      feature,
      featureId,
      provider,
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      inputCost: cached ? inputCost * 0.1 : inputCost,
      outputCost: cached ? outputCost * 0.1 : outputCost,
      totalCost: finalCost,
      latency,
      cached,
      metadata
    }
  });

  return log;
}

async function getLLMPricing(provider: LLMProvider, model: string) {
  return prisma.lLMPricing.findFirst({
    where: {
      provider,
      model,
      isActive: true,
      effectiveFrom: { lte: new Date() },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: new Date() } }
      ]
    },
    orderBy: { effectiveFrom: 'desc' }
  });
}

// Helper: Wrap LLM calls with automatic tracking
export async function withTracking<T>(
  llmCall: () => Promise<{ result: T; usage: { inputTokens: number; outputTokens: number } }>,
  params: Omit<LLMUsageParams, 'inputTokens' | 'outputTokens' | 'latency'>
): Promise<T> {
  const startTime = Date.now();

  const { result, usage } = await llmCall();

  const latency = Date.now() - startTime;

  await trackLLMUsage({
    ...params,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    latency
  });

  return result;
}
```

---

### Phase 5: Integration with Existing Services

**Example: Character Generation**

**File**: `backend/src/services/characterGeneration/characterGenerationService.ts`

```typescript
import { trackLLMUsage } from '../llm/llmUsageTracker';

export async function generateCharacter(params: GenerateCharacterParams) {
  // ... existing code

  // Wrap LLM call with tracking
  const analysisResult = await geminiClient.analyzeImage(imageUrl);

  // Track usage
  await trackLLMUsage({
    userId: params.userId,
    feature: 'CHARACTER_GENERATION',
    featureId: null, // Character not created yet
    provider: 'GEMINI',
    model: 'gemini-1.5-flash',
    inputTokens: analysisResult.usage.inputTokens,
    outputTokens: analysisResult.usage.outputTokens,
    metadata: { step: 'image_analysis' }
  });

  // ... continue with character compilation

  const compilationResult = await geminiClient.compileCharacter(analysisData);

  await trackLLMUsage({
    userId: params.userId,
    feature: 'CHARACTER_GENERATION',
    featureId: character.id, // Now we have character ID
    provider: 'GEMINI',
    model: 'gemini-1.5-pro',
    inputTokens: compilationResult.usage.inputTokens,
    outputTokens: compilationResult.usage.outputTokens,
    metadata: { step: 'character_compilation' }
  });

  return character;
}
```

---

### Phase 6: Analytics & Reporting

**File**: `backend/src/services/analytics/llmCostAnalytics.ts`

```typescript
export async function getCostByFeature(dateRange: { from: Date; to: Date }) {
  const costs = await prisma.lLMUsageLog.groupBy({
    by: ['feature'],
    where: {
      createdAt: {
        gte: dateRange.from,
        lte: dateRange.to
      }
    },
    _sum: {
      totalCost: true,
      totalTokens: true
    },
    _count: {
      id: true
    }
  });

  return costs.map(c => ({
    feature: c.feature,
    totalCost: Number(c._sum.totalCost || 0),
    totalTokens: c._sum.totalTokens || 0,
    requestCount: c._count.id,
    avgCostPerRequest: Number(c._sum.totalCost || 0) / c._count.id
  }));
}

export async function getCostByUser(userId: string, dateRange: { from: Date; to: Date }) {
  const costs = await prisma.lLMUsageLog.aggregate({
    where: {
      userId,
      createdAt: {
        gte: dateRange.from,
        lte: dateRange.to
      }
    },
    _sum: {
      totalCost: true
    }
  });

  return {
    userId,
    totalCost: Number(costs._sum.totalCost || 0),
    dateRange
  };
}

export async function getAverageCostByPlan() {
  // Get average LLM cost per user grouped by subscription plan
  const result = await prisma.$queryRaw`
    SELECT
      u."subscriptionPlan",
      AVG(cost_sum.total) as avg_cost,
      COUNT(DISTINCT u.id) as user_count
    FROM "User" u
    LEFT JOIN (
      SELECT "userId", SUM("totalCost") as total
      FROM "LLMUsageLog"
      WHERE "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY "userId"
    ) cost_sum ON u.id = cost_sum."userId"
    GROUP BY u."subscriptionPlan"
  `;

  return result;
}

export async function getTotalOperationalCost(dateRange: { from: Date; to: Date }) {
  const total = await prisma.lLMUsageLog.aggregate({
    where: {
      createdAt: {
        gte: dateRange.from,
        lte: dateRange.to
      }
    },
    _sum: {
      totalCost: true
    }
  });

  return Number(total._sum.totalCost || 0);
}
```

---

### Phase 7: Pricing Optimization Analysis

**File**: `docs/05-business/analysis/credit-pricing-analysis.md` (to be created by Agent Planner)

**Key Questions to Answer**:

1. **What's the cost per credit in USD?**
   ```
   Average LLM cost per feature:
   - Character Gen: $0.0011 = 85 credits → 1 credit = $0.000013
   - Story Gen: $0.0015 = 100 credits → 1 credit = $0.000015
   - Chat Message: $0.00015 = 5 credits → 1 credit = $0.00003

   Weighted average: 1 credit ≈ $0.00002 (LLM cost only)
   ```

2. **What's the target profit margin?**
   ```
   Option A (Conservative): 50% margin
   → 1 credit = $0.00004 (includes 2x markup)

   Option B (Aggressive): 30% margin
   → 1 credit = $0.000026

   Recommendation: Start with 40% margin → 1 credit = $0.000033
   ```

3. **How many credits for PLUS ($5/month)?**
   ```
   PLUS = $5/month
   Target profit: $2/month (40%)
   Available for LLM: $3/month

   At $0.00002/credit → 150,000 credits/month
   Daily credits: 5,000 credits/day

   Reality check:
   - 10 character generations = 1,000 credits
   - 50 chat messages = 250 credits
   - User can generate 150 characters/month comfortably
   ```

4. **How many free credits per day is sustainable?**
   ```
   Free users cost: $0/revenue but LLM costs apply

   Conservative: 100 credits/day = $0.002/day = $0.06/month per user
   If 10,000 free users → $600/month LLM cost

   Acceptable if conversion rate > 2% (200 paying users = $1,000 revenue)
   ```

---

### Phase 8: API Endpoints

**File**: `backend/src/routes/v1/analytics.ts`

```typescript
// GET /api/v1/analytics/llm-costs/by-feature
router.get('/llm-costs/by-feature', requireAuth, requireAdmin, async (req, res) => {
  const { from, to } = req.query;

  const costs = await llmCostAnalytics.getCostByFeature({
    from: new Date(from as string),
    to: new Date(to as string)
  });

  res.json(costs);
});

// GET /api/v1/analytics/llm-costs/total
router.get('/llm-costs/total', requireAuth, requireAdmin, async (req, res) => {
  const { from, to } = req.query;

  const total = await llmCostAnalytics.getTotalOperationalCost({
    from: new Date(from as string),
    to: new Date(to as string)
  });

  res.json({ total, currency: 'USD' });
});

// GET /api/v1/analytics/llm-costs/by-plan
router.get('/llm-costs/by-plan', requireAuth, requireAdmin, async (req, res) => {
  const costs = await llmCostAnalytics.getAverageCostByPlan();
  res.json(costs);
});
```

---

## Testing Strategy

### Unit Tests
- Test cost calculation logic
- Test pricing lookup
- Test analytics aggregations

### Integration Tests
- Track LLM usage in character generation flow
- Verify costs calculated correctly
- Test analytics queries

### Manual Validation
- Generate 10 characters, verify logs
- Check total cost matches expected
- Review analytics dashboard

---

## Rollout Strategy

### Phase 1: Research & Planning (Agent Planner - 8-10 hours)
1. Web research current LLM pricing (2 hours)
2. Map all features to LLM usage (3 hours)
3. Create cost analysis document (2 hours)
4. Calculate optimal credit pricing (2 hours)
5. Create recommendations report (1 hour)

### Phase 2: Implementation (Agent Coder - 10-12 hours)
1. Database schema (1 hour)
2. Seed pricing data (1 hour)
3. Tracking service (2 hours)
4. Integration with existing services (4 hours)
5. Analytics service (2 hours)
6. API endpoints (1 hour)
7. Testing (1 hour)

### Phase 3: Dashboard (Future - Agent Coder - 8-10 hours)
1. Admin dashboard UI
2. Cost charts and graphs
3. Real-time monitoring

**Total Estimated Time**: 18-22 hours (Planner + Coder)

---

## Success Metrics

**Phase 1 Complete**:
- [ ] All LLM models mapped
- [ ] Current pricing documented
- [ ] Cost per feature calculated
- [ ] Optimal credit pricing defined

**Phase 2 Complete**:
- [ ] 100% LLM calls tracked
- [ ] Costs calculated in real-time
- [ ] 30+ days of data collected

**Phase 3 Complete**:
- [ ] Dashboard showing costs by feature
- [ ] Monthly cost projections accurate within 10%
- [ ] Profitability per plan calculated

---

## Expected Outcomes

**Cost Optimization**:
- Identify expensive features: Target -20% cost reduction
- Switch to cheaper models where appropriate
- Implement aggressive caching

**Pricing Optimization**:
- Data-driven credit pricing
- Profitable PLUS/PREMIUM plans
- Sustainable free tier

**Business Intelligence**:
- Monthly cost projections
- ROI per feature
- User acquisition cost vs LTV

---

## Risks & Mitigation

### Risk 1: Tracking Overhead
**Mitigation**: Async logging, batched inserts

### Risk 2: Cost Accuracy
**Mitigation**: Regular pricing updates, validation

### Risk 3: Privacy Concerns
**Mitigation**: No prompt content logged, only metadata

---

## Notes for Agent Planner

This feature has TWO phases:

**Phase 1 (Agent Planner - YOU)**: Research & Analysis
- Web research LLM pricing
- Map features to costs
- Calculate optimal pricing
- Create business recommendations

**Phase 2 (Agent Coder)**: Implementation
- Build tracking system
- Integrate with services
- Create analytics

**Start with Phase 1 before any code is written.**

---

**End of Specification**

📊 Ready for planning phase - Business intelligence foundation!
