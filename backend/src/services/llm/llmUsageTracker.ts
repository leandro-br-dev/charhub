import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { LLMProvider, FeatureType } from '../../generated/prisma';

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
  operation?: string;
  metadata?: Record<string, any>;
}

/**
 * Track LLM usage for cost analysis
 *
 * This function logs LLM API calls to the database for cost tracking and analytics.
 * It automatically calculates costs based on the pricing data in the LLMPricing table.
 *
 * @param params - LLM usage parameters
 * @returns The created LLMUsageLog record, or null if pricing not found
 */
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
    operation,
    metadata,
  } = params;

  try {
    // 1. Get pricing for this model
    const pricing = await getLLMPricing(provider, model);

    if (!pricing) {
      logger.warn(
        { provider, model, feature },
        'No pricing found for LLM model, skipping tracking'
      );
      return null;
    }

    // 2. Calculate costs
    const inputCost = (inputTokens / 1_000_000) * Number(pricing.inputPricePerMillion);
    const outputCost = (outputTokens / 1_000_000) * Number(pricing.outputPricePerMillion);
    const totalCost = inputCost + outputCost;

    // 3. If cached, reduce cost by 90% (cached responses are much cheaper)
    const finalCost = cached ? totalCost * 0.1 : totalCost;

    // 4. Log to database (non-blocking - don't await if not critical)
    const log = await prisma.lLMUsageLog.create({
      data: {
        userId,
        feature,
        featureId,
        provider,
        model,
        operation,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        inputCost: cached ? inputCost * 0.1 : inputCost,
        outputCost: cached ? outputCost * 0.1 : outputCost,
        totalCost: finalCost,
        latency,
        cached,
        metadata,
      },
    });

    logger.debug(
      {
        logId: log.id,
        provider,
        model,
        feature,
        inputTokens,
        outputTokens,
        totalCost: finalCost,
        cached,
      },
      'LLM usage tracked'
    );

    return log;
  } catch (error) {
    // Don't throw - tracking failures shouldn't break the main flow
    logger.error(
      { error, provider, model, feature },
      'Failed to track LLM usage'
    );
    return null;
  }
}

/**
 * Get active pricing for a specific LLM provider and model
 */
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
    orderBy: { effectiveFrom: 'desc' },
  });
}

/**
 * Wrap an LLM call with automatic tracking
 *
 * This helper function wraps an LLM call and automatically tracks usage.
 * It measures latency and extracts token usage from the response.
 *
 * @param llmCall - Function that performs the LLM call
 * @param params - Tracking parameters (excluding tokens and latency)
 * @returns The LLM response
 *
 * @example
 * ```typescript
 * const result = await withTracking(
 *   () => callLLM({ provider: 'gemini', model: 'gemini-2.5-flash-lite', ... }),
 *   { userId, feature: 'CHAT_MESSAGE', provider: 'GEMINI', model: 'gemini-2.5-flash-lite' }
 * );
 * ```
 */
export async function withTracking<T>(
  llmCall: () => Promise<{
    result: T;
    usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  }>,
  params: Omit<LLMUsageParams, 'inputTokens' | 'outputTokens' | 'latency'>
): Promise<T> {
  const startTime = Date.now();

  try {
    const { result, usage } = await llmCall();

    const latency = Date.now() - startTime;

    // Extract token counts from usage (handle different response formats)
    const inputTokens = usage?.promptTokens || usage?.totalTokens || 0;
    const outputTokens = usage?.completionTokens || 0;

    // Track usage asynchronously (don't block the response)
    if (inputTokens > 0 || outputTokens > 0) {
      trackLLMUsage({
        ...params,
        inputTokens,
        outputTokens,
        latency,
      }).catch((error) => {
        logger.error({ error }, 'Failed to track LLM usage in withTracking');
      });
    }

    return result;
  } catch (error) {
    const latency = Date.now() - startTime;

    // Track failed calls too (with zero tokens but still record the attempt)
    trackLLMUsage({
      ...params,
      inputTokens: 0,
      outputTokens: 0,
      latency,
      metadata: {
        ...params.metadata,
        error: error instanceof Error ? error.message : 'Unknown error',
        failed: true,
      },
    }).catch((err) => {
      logger.error({ err }, 'Failed to track failed LLM call');
    });

    throw error;
  }
}

/**
 * Track LLM usage from an LLMResponse object
 *
 * This is a convenience function for tracking usage from the LLM service response format.
 *
 * @param response - LLM response object with usage metadata
 * @param params - Tracking parameters
 */
export function trackFromLLMResponse(
  response: {
    provider: string;
    model: string;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  },
  params: Omit<LLMUsageParams, 'inputTokens' | 'outputTokens' | 'provider' | 'model'>
): void {
  const inputTokens = response.usage?.promptTokens || 0;
  const outputTokens = response.usage?.completionTokens || 0;

  if (inputTokens === 0 && outputTokens === 0) {
    logger.warn({ response }, 'No token usage in LLM response, skipping tracking');
    return;
  }

  // Map provider string to enum
  const providerMap: Record<string, LLMProvider> = {
    gemini: 'GEMINI',
    openai: 'OPENAI',
    grok: 'GROK',
    anthropic: 'ANTHROPIC',
    together_ai: 'TOGETHER_AI',
    groq: 'GROQ',
  };

  const provider = providerMap[response.provider.toLowerCase()];
  if (!provider) {
    logger.warn({ provider: response.provider }, 'Unknown LLM provider, skipping tracking');
    return;
  }

  // Track asynchronously
  trackLLMUsage({
    ...params,
    provider,
    model: response.model,
    inputTokens,
    outputTokens,
  }).catch((error) => {
    logger.error({ error }, 'Failed to track LLM usage from response');
  });
}
