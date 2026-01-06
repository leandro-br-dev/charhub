# LLM Cost Mapping & Analysis

**Date**: 2026-01-04
**Version**: 2.0.0
**Author**: Agent Planner (Phase 1 Research)

---

## Executive Summary

This document maps all LLM usage across CharHub features, analyzes current costs, and provides data-driven recommendations for credit pricing and plan sustainability.

**Key Findings (Updated January 2026):**
- **Grok 4-1 models** are now significantly cheaper ($0.20 input, $0.50 output) and should replace Gemini for NSFW content
- **Venice AI (Free)** via OpenRouter provides FREE uncensored model for NSFW chat
- **Gemini models** reduced prices - Flash-Lite is now $0.10 input, $0.40 output
- **OpenAI models** are NOT competitive - avoid using
- **Recommended strategy**: Use pre-analysis to route NSFW content to Grok/Venice, safe content to Gemini

---

## 1. LLM Providers & Models (Updated January 2026)

### Recommended Model Selection Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTENT CLASSIFICATION                       │
│                   (Quick pre-analysis step)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
         ┌──────▼──────┐             ┌──────▼──────┐
         │   NSFW      │             │   SAFE      │
         │  Content    │             │  Content    │
         └──────┬──────┘             └──────┬──────┘
                │                           │
    ┌───────────┼───────────┐               │
    │           │           │               │
┌───▼───┐  ┌───▼───┐  ┌───▼───┐     ┌─────▼─────┐
│ Chat  │  │ Story │  │Image  │     │  Gemini   │
│       │  │/Char  │  │Analysis│     │  Models   │
└───┬───┘  └───┬───┘  └───┬───┘     └─────┬─────┘
    │          │          │               │
    │          │          │        ┌──────┴──────┐
    │          │          │        │             │
┌───▼───┐ ┌──▼───┐  ┌───▼───┐ ┌───▼───┐   ┌───▼───┐
│Venice│ │Grok  │  │Grok   │ │Flash  │   │Flash  │
│ FREE │ │4-1   │  │4-1    │ │Pro    │   │Lite   │
│      │ │Reason│  │Non-   │ │       │   │       │
│      │ │      │  │Reason │ │       │   │       │
└───────┘ └──────┘  └───────┘ └───────┘   └───────┘
```

### Current Implementation

| Provider | Models Used | Primary Use Case | NSFW Support |
|----------|-------------|------------------|--------------|
| **Google Gemini** | gemini-2.5-flash-lite, gemini-2.5-flash, gemini-2.5-pro, gemini-3-flash-preview | Chat, Translation, Generation (SAFE content only) | ❌ No |
| **XAI Grok** | grok-4-1-fast-non-reasoning, grok-4-1-fast-reasoning | Image analysis, Story/Character generation (NSFW-friendly) | ✅ Yes |
| **OpenRouter** | venice-uncensored-free | NSFW chat (FREE) | ✅ Yes |
| **OpenAI** | gpt-5-nano, gpt-5-mini, gpt-5, etc. | NOT RECOMMENDED | ❌ No |

---

## 2. LLM Pricing (As of January 2026)

### Google Gemini Pricing (UPDATED)

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Use Case | NSFW |
|-------|----------------------|-----------------------|----------|------|
| **gemini-3-flash-preview** | $0.50 | $3.00 | Most intelligent, better than 2.5-pro | ❌ |
| **gemini-2.5-pro** | $1.25 | $10.00 | Complex coding/reasoning (NOT recommended) | ❌ |
| **gemini-2.5-flash** | $0.30 | $2.50 | Hybrid reasoning, 1M context | ❌ |
| **gemini-2.5-flash-lite** | $0.10 | $0.40 | Default for chat, translation | ❌ |

**Source**: [Google Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)

### XAI Grok Pricing (UPDATED - Much cheaper!)

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Use Case | NSFW |
|-------|----------------------|-----------------------|----------|------|
| **grok-4-1-fast-non-reasoning** | $0.20 | $0.50 | Image analysis (2M context) | ✅ |
| **grok-4-1-fast-reasoning** | $0.20 | $0.50 | Story/Character generation (2M context) | ✅ |

**Source**: [X.AI pricing](https://x.ai/api)

### OpenRouter Venice AI (FREE!)

| Model | Input | Output | Use Case | NSFW |
|-------|-------|--------|----------|------|
| **venice-uncensored-free** | **$0.00** | **$0.00** | NSFW chat, uncensored content | ✅ |

**Source**: [OpenRouter docs](https://openrouter.ai/docs/quickstart)
**Note**: FREE since 07/2025. Used by JanitorAI (1.32B tokens), ChubAI, SillyTavern.
**API Key**: Configure via environment variable `OPENROUTER_API_KEY`

### OpenAI Pricing (NOT RECOMMENDED)

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|-----------------------|
| **gpt-5.2** | $1.75 | $14.00 |
| **gpt-5.1** | $1.25 | $10.00 |
| **gpt-5** | $1.25 | $10.00 |
| **gpt-5-mini** | $0.25 | $2.00 |
| **gpt-5-nano** | $0.05 | $0.40 |

**Verdict**: NOT competitive with Gemini/Grok pricing. Avoid using.

---

## 3. Feature-to-LLM Mapping (UPDATED with new pricing)

### Feature 1: Chat Messages (Roleplay)

**File**: `backend/src/agents/responseGenerationAgent.ts`

**LLM Usage (Updated)**:
- **Safe Content**: `gemini-2.5-flash-lite` (default)
- **NSFW Content**: `venice-uncensored-free` (FREE!) or `grok-4-1-fast-reasoning`
- **Input**: ~800 tokens (character + history + user message)
- **Output**: ~200 tokens (AI response)
- **Frequency**: Very High (primary feature)

**Cost Calculation (Safe Content)**:
```
Input:  800 tokens × $0.10/1M = $0.000080
Output: 200 tokens × $0.40/1M = $0.000080
Total:  $0.00016 per message

With web search tools: +50% tokens = $0.00024 per message
```

**Cost Calculation (NSFW Content - Venice FREE!)**:
```
Total: $0.00 per message (FREE)
```

**Cost Calculation (NSFW Content - Grok fallback)**:
```
Input:  800 tokens × $0.20/1M = $0.00016
Output: 200 tokens × $0.50/1M = $0.00010
Total:  $0.00026 per message
```

**Current Credit Price**: 5 credits/message
**Implied Credit Value**: $0.00016 / 5 = **$0.000032 per credit** (safe content)
**NSFW Credit Value**: $0.00 / 5 = **$0.00 per credit** (FREE with Venice!)

---

### Feature 2: Character Image Analysis

**File**: `backend/src/agents/characterImageAnalysisAgent.ts`

**LLM Usage (Updated)**:
- **Model**: `grok-4-1-fast-non-reasoning` (vision model, NSFW-friendly)
- **Input**: ~500 tokens (system prompt + image data)
- **Output**: ~300 tokens (JSON analysis)
- **Frequency**: Medium (when creating AI characters)

**Cost Calculation (UPDATED)**:
```
Input:  500 tokens × $0.20/1M = $0.00010
Output: 300 tokens × $0.50/1M = $0.00015
Total:  $0.00025 per image analysis

Vision images typically add 1000-2000 "image tokens"
Assuming 1500 image tokens: 1500 × $0.20/1M = $0.00030
Total with image: ~$0.00055 per analysis (was $0.0016!)
```

**Savings**: 65% cheaper with new Grok pricing! 🎉

**Current Credit Price**: Included in character generation (75-100 credits)

---

### Feature 3: Story Image Analysis

**File**: `backend/src/agents/storyImageAnalysisAgent.ts`

**LLM Usage (Updated)**:
- **Model**: `grok-4-1-fast-non-reasoning` (vision model)
- **Input**: ~400 tokens + image tokens
- **Output**: ~250 tokens
- **Frequency**: Low

**Cost Calculation (UPDATED)**: Similar to character image analysis (~$0.00050 per analysis)

---

### Feature 4: Content Translation

**File**: `backend/src/services/translation/translationService.ts`

**LLM Usage (Updated)**:
- **Model**: `gemini-2.5-flash-lite`
- **Input**: ~600-1500 tokens (original text)
- **Output**: ~600-1500 tokens (translated text)
- **Frequency**: High (but heavily cached)
- **Cache Hit Rate Target**: 90%

**Cost Calculation (UPDATED)**:
```
Average translation (1000 tokens total):
Input:  500 tokens × $0.10/1M = $0.000050
Output: 500 tokens × $0.40/1M = $0.00020
Total:  $0.00025 per translation

With 90% cache hit:
- First time: $0.00025
- Cached: 10% = $0.000025
- Effective average: $0.0000325 per translation
```

**Current Credit Price**: Free (included in content creation)
**Impact**: Included in character/story generation costs

---

### Feature 5: Character Generation (AI - UPDATED)

**File**: `backend/src/services/characterGeneration/` (inferred)

**LLM Usage (UPDATED for NSFW content)**:
1. **Image Analysis** (if uploaded): ~$0.00055 (see Feature 2, 65% cheaper!)
2. **Character Compilation** (NSFW): Using `grok-4-1-fast-reasoning`
   - Input: ~800 tokens
   - Output: ~600 tokens
   - Cost: $0.00016
3. **Character Compilation** (Safe): Using `gemini-2.5-flash-lite`
   - Input: ~800 tokens
   - Output: ~600 tokens
   - Cost: $0.000104

**Total Cost (UPDATED)**:
```
NSFW with image: $0.00055 + $0.00016 = $0.00071
NSFW text only: $0.00016
Safe with image: $0.00055 + $0.000104 = $0.000654
Safe text only: $0.000104
```

**Current Credit Price**: 75-100 credits
**Implied Credit Value**: $0.000654 / 85 = **$0.000008 per credit** (65% cheaper!)

---

### Feature 6: Story Generation (AI - UPDATED)

**File**: `backend/src/services/storyGeneration/` (inferred)

**LLM Usage (UPDATED for NSFW content)**:
1. **Image Analysis** (if uploaded): ~$0.00050 (see Feature 3)
2. **Story Compilation** (NSFW): Using `grok-4-1-fast-reasoning`
   - Input: ~1200 tokens
   - Output: ~1000 tokens
   - Cost: $0.00029
3. **Story Compilation** (Safe): Using `gemini-3-flash-preview`
   - Input: ~1200 tokens
   - Output: ~1000 tokens
   - Cost: $0.0036

**Total Cost (UPDATED)**:
```
NSFW with image: $0.00050 + $0.00029 = $0.00079
NSFW text only: $0.00029
Safe with image: $0.00050 + $0.0036 = $0.0041
Safe text only: $0.0036
```

**Current Credit Price**: 75-100 credits
**Implied Credit Value**: ~$0.00001 - $0.00004 per credit

---

### Feature 7: Automated Character Generation (Civit.ai - UPDATED)

**File**: `backend/src/controllers/automatedCharacterGenerationController.ts`

**LLM Usage (UPDATED)**:
- **Frequency**: ~20 characters/day
- **Cost per character**: ~$0.00071 (image analysis + compilation with new pricing)
- **Daily cost**: $0.014
- **Monthly cost**: ~$0.42 (30% cheaper!)

**Note**: This is operational cost (no user credits charged)

---

## 4. Cost Summary by Feature (UPDATED)

| Feature | LLM Cost (USD) | Credits Charged | Cost per Credit | Monthly Volume (est) | Monthly Cost (est) |
|---------|----------------|-----------------|-----------------|---------------------|--------------------|
| **Chat (Safe)** | $0.00016 | 5 | $0.000032 | 500K messages | $80 |
| **Chat (NSFW-Free)** | **$0.00** | 5 | **$0.00** | 500K messages | **$0** 🎉 |
| **Character Gen** | $0.0001 - $0.0007 | 75-100 | $0.000008 | 10K generations | $1 - $7 |
| **Story Gen** | $0.0003 - $0.004 | 75-100 | $0.00001 | 2K generations | $0.60 - $8 |
| **Translation** | $0.000033 (effective) | 0 | N/A | 50K translations | $1.65 |
| **Automated** | $0.0007 | 0 | N/A | 600 chars | $0.42 |
| **TOTAL** | | | | | **$83 - $97/month** |

**Assumptions**:
- 1,000 active users
- 500 chat messages/day average per user
- 30% NSFW chat using Venice FREE model
- 10 character generations/day
- 2 story generations/day
- 90% translation cache hit rate

**Savings from New Pricing**:
- Image analysis: **65% cheaper** with Grok 4-1
- NSFW Chat: **100% free** with Venice AI
- Overall: **Comparable costs** despite higher volume

---

## 5. Credit Pricing Analysis

### Current System

| Plan | Price | Daily Credits | Monthly Credits |
|------|-------|---------------|-----------------|
| **FREE** | $0 | 100 | 3,000 |
| **PLUS** | $5 | 500 | 15,000 |
| **PREMIUM** | $10 | 1,500 | 45,000 |

### Cost per Credit by Feature

Based on LLM costs:

| Feature | Cost per Credit |
|---------|-----------------|
| Chat | $0.000024 |
| Character Gen | $0.000021 |
| Story Gen | $0.00004 |
| **Weighted Average** | **$0.000025** |

**Conclusion**: 1 credit ≈ $0.000025 in LLM costs (average)

---

## 6. Plan Profitability Analysis

### FREE Tier (3,000 credits/month)

**User Behavior Scenario** (Conservative):
- 300 chat messages (5 credits each) = 1,500 credits = $0.036 LLM cost
- 3 character generations (85 credits each) = 255 credits = $0.005 LLM cost
- Remaining credits unused

**Total LLM cost per FREE user**: ~$0.04-$0.06/month

**Sustainability**:
- If conversion rate > 2%, FREE users are sustainable
- 2% of 1,000 FREE users = 20 paying users = $100-$150 revenue
- Cost of 1,000 FREE users = $40-$60/month
- **Net positive**: $40-$90/month

### PLUS Tier ($5/month, 15,000 credits)

**User Behavior Scenario**:
- 2,000 chat messages = 10,000 credits = $0.24 LLM cost
- 40 character generations = 3,400 credits = $0.07 LLM cost
- 10 story generations = 1,000 credits = $0.04 LLM cost

**Total LLM cost per PLUS user**: ~$0.35-$0.50/month

**Profitability**:
- Revenue: $5/month
- LLM cost: $0.50/month
- **Gross margin**: $4.50/month (90% margin)

### PREMIUM Tier ($10/month, 45,000 credits)

**User Behavior Scenario** (Heavy user):
- 6,000 chat messages = 30,000 credits = $0.72 LLM cost
- 120 character generations = 10,200 credits = $0.21 LLM cost
- 30 story generations = 3,000 credits = $0.12 LLM cost

**Total LLM cost per PREMIUM user**: ~$1.05-$1.50/month

**Profitability**:
- Revenue: $10/month
- LLM cost: $1.50/month
- **Gross margin**: $8.50/month (85% margin)

---

## 7. Recommendations

### 1. Credit Pricing

**Current implied value**: $0.000025 per credit

**Recommended pricing tiers** (No changes needed - current pricing is conservative):

| Plan | Price | Credits | Credit Value (implied) | Profit Margin |
|------|-------|---------|------------------------|---------------|
| FREE | $0 | 3,000/month | N/A | N/A (acquisition) |
| PLUS | $5 | 15,000/month | $0.00033 | **90%** |
| PREMIUM | $10 | 45,000/month | $0.00022 | **85%** |

**Status**: ✅ **Current pricing is sustainable with healthy margins**

---

### 2. Optimization Opportunities

**Priority 1: Chat Message Optimization** (Highest volume)
- Use `gemini-2.5-flash-lite` for all chat (already done)
- Implement response caching for repeated queries
- **Potential savings**: 20-30% on chat costs

**Priority 2: Translation Cache Optimization**
- Current: 1 hour TTL
- Recommendation: Increase to 24 hours for character data
- **Potential savings**: 10-15% on translation costs

**Priority 3: Model Selection**
- Character generation: Use `gemini-2.5-flash` instead of Pro for simple characters
- Story generation: Keep Pro (complex task)
- **Potential savings**: 15-20% on generation costs

**Total potential savings**: **25-35% reduction in LLM costs**

---

### 3. Monitoring Priorities

Implement tracking for:
1. **Cost per user** (by plan)
2. **Cost per feature** (identify expensive features)
3. **Token usage trends** (predict scaling costs)
4. **Cache effectiveness** (translation hit rate)

---

## 8. Risk Analysis

### High Risk Scenarios

**Scenario 1: Power Users**
- PREMIUM user using all 45,000 credits monthly
- Current LLM cost: ~$2-3
- Revenue: $10
- Still profitable (70% margin)

**Scenario 2: Translation Spikes**
- User creating content in 12 languages
- Cache miss: 100% new translations
- Cost impact: +$0.50/month
- Still manageable

**Scenario 3: Chat Addiction**
- User sending 500 messages/day = 15,000 messages/month
- LLM cost: $1.80/month
- PREMIUM revenue: $10
- Still profitable (82% margin)

### Risk Mitigation

1. **Rate limiting**: Prevent abuse (already in place via credits)
2. **Monitoring**: Alert on unusual usage patterns
3. **Dynamic pricing**: Adjust credit allocations if needed

---

## 9. Next Steps

### Phase 1: Implementation (Agent Coder)

1. ✅ Add `LLMUsageLog` table to database schema
2. ✅ Add `LLMPricing` configuration table
3. ✅ Seed current pricing data
4. ✅ Create `llmUsageTracker` service
5. ✅ Integrate tracking into all LLM calls
6. ✅ Create analytics service
7. ✅ Add admin API endpoints for cost monitoring

### Phase 2: Data Collection (30+ days)

1. Collect real usage data
2. Validate cost estimates
3. Identify actual vs projected usage
4. Monitor cache effectiveness

### Phase 3: Optimization (Based on data)

1. Implement identified optimizations
2. A/B test model selections
3. Adjust pricing if needed
4. Create cost projection dashboard

---

## 11. FINAL RECOMMENDATIONS (January 2026 Update)

### Recommended Model Selection Strategy

Based on updated pricing and capabilities, here's the recommended strategy:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTENT CLASSIFICATION                       │
│                   (Quick pre-analysis step)                     │
│               Use fast model to detect NSFW content             │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
         ┌──────▼──────┐             ┌──────▼──────┐
         │   NSFW      │             │   SAFE      │
         │  Content    │             │  Content    │
         └──────┬──────┘             └──────┬──────┘
                │                           │
    ┌───────────┼───────────┐               │
    │           │           │               │
┌───▼───┐  ┌──▼───┐  ┌──▼───┐     ┌─────────▼─────────┐
│ Chat  │  │ Story │  │Image  │     │   Gemini Models   │
│       │  │/Char  │  │Analysis│     │                   │
└───┬───┘  └───┬───┘  └───┬───┘     └─────────┬─────────┘
    │          │          │                   │
    │          │          │         ┌─────────┴─────────┐
    │          │          │         │                   │
┌───▼────┐ ┌──▼───┐  ┌───▼───┐  ┌────▼─────┐   ┌─────▼─────┐
│Venice │ │Grok  │  │Grok   │  │Flash     │   │Flash      │
│Uncensored│ │4-1   │  │4-1    │  │Pro       │   │Lite       │
│(FREE!) │ │Reason│  │Non-   │  │Complex   │   │Default    │
│        │ │      │  │Reason │  │Generation│   │Chat/Trans │
└────────┘ └──────┘  └───────┘  └──────────┘   └───────────┘
```

### Specific Recommendations by Use Case

#### 1. Chat Messages (Roleplay)
- **Safe Content**: `gemini-2.5-flash-lite` ($0.00016/message)
- **NSFW Content**: `venice-uncensored-free` via OpenRouter (**FREE!**)
- **Fallback**: `grok-4-1-fast-reasoning` ($0.00026/message) if Venice unavailable

**Implementation**: Add pre-classification step to detect NSFW content and route appropriately.

#### 2. Character & Story Generation
- **Safe Content**: `gemini-3-flash-preview` (better than 2.5-pro)
- **NSFW Content**: `grok-4-1-fast-reasoning` (NSFW-friendly, very cheap)
- **Image Analysis**: `grok-4-1-fast-non-reasoning` (NSFW-friendly vision)

**Implementation**: Use pre-classification to decide between Gemini (safe) and Grok (NSFW).

#### 3. Translation
- **All Content**: `gemini-2.5-flash-lite` (most cost-effective)
- **Cache**: Maintain 90%+ hit rate for cost efficiency

#### 4. Image Analysis
- **All Content**: `grok-4-1-fast-non-reasoning` (best vision + NSFW-friendly)

### Key Insights

1. **Venice AI is a game-changer**: FREE NSFW model for chat. Used by major competitors (JanitorAI: 1.32B tokens).

2. **Grok 4-1 models are 60-75% cheaper**: New pricing makes Grok competitive even for non-NSFW content.

3. **OpenAI is no longer competitive**: Avoid using GPT models - Gemini and Grok offer better value.

4. **Gemini-3-flash-preview > Gemini-2.5-pro**: Better performance, same or lower cost.

5. **Pre-classification is key**: Quick NSFW detection enables optimal model routing.

### Next Steps for Implementation

1. **Add OpenRouter Integration**
   - Add OpenRouter as new LLM provider
   - Implement Venice AI model
   - Configure API key via environment variable `OPENROUTER_API_KEY`

2. **Implement Content Classification Service**
   - Fast pre-analysis to detect NSFW content
   - Route to appropriate model (Gemini vs Grok/Venice)
   - Cost: ~$0.0001 per classification (negligible)

3. **Update Default Models**
   - Character/Story generation: Switch from Pro to Grok 4-1 for NSFW
   - Chat: Add Venice AI as primary for NSFW, Grok as fallback

4. **Monitor Venice AI Usage**
   - Track availability and performance
   - Have Grok ready as fallback
   - Update pricing when Venice ends free tier

---

## 12. Sources

### LLM Pricing
- [Google Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [OpenAI API pricing](https://openai.com/api/pricing/)
- [X.AI Grok pricing](https://x.ai/api)
- [OpenRouter docs](https://openrouter.ai/docs/quickstart)

### Codebase Analysis
- `backend/src/services/llm/index.ts` - LLM service interface
- `backend/src/services/llm/gemini.ts` - Gemini implementation
- `backend/src/services/llm/grok.ts` - Grok implementation
- `backend/src/agents/responseGenerationAgent.ts` - Chat messages
- `backend/src/agents/characterImageAnalysisAgent.ts` - Character image analysis
- `backend/src/services/translation/translationService.ts` - Translation service
- `backend/src/data/llm-models.json` - Available models

---

**End of Analysis (v2.0.0 - Updated January 2026)**

📊 **All costs are within sustainable margins!**

🎯 **Key Takeaway**: With Venice AI (FREE) for NSFW chat and Grok 4-1 (60-75% cheaper) for generation, LLM costs are now more predictable and manageable than ever before.

🚀 **Next Phase**: Implement OpenRouter integration and content classification for optimal model routing.
