import { prisma } from '../config/database';
import { createTransaction } from './creditService';

interface UsageMetrics {
  inputTokens?: number;
  outputTokens?: number;
  charactersProcessed?: number;
  imagesProcessed?: number;
  additionalMetadata?: Record<string, any>;
}

/**
 * Log service usage (creates pending usage log)
 * Actual credit deduction happens async via worker
 */
export async function logServiceUsage(
  userId: string,
  serviceType: string,
  metrics: UsageMetrics
): Promise<any> {
  const usageLog = await prisma.usageLog.create({
    data: {
      userId,
      serviceType,
      inputTokens: metrics.inputTokens,
      outputTokens: metrics.outputTokens,
      charactersProcessed: metrics.charactersProcessed,
      imagesProcessed: metrics.imagesProcessed,
      additionalMetadata: metrics.additionalMetadata,
      processed: false,
    },
  });

  return usageLog;
}

/**
 * Process pending usage logs and deduct credits
 * Called by background worker (BullMQ)
 */
export async function processUsageLogs(limit: number = 100): Promise<number> {
  // Get pending usage logs
  const pendingLogs = await prisma.usageLog.findMany({
    where: {
      processed: false,
    },
    take: limit,
    orderBy: {
      timestamp: 'asc',
    },
  });

  let processedCount = 0;

  for (const log of pendingLogs) {
    try {
      await processUsageLog(log.id);
      processedCount++;
    } catch (error) {
      console.error(`Failed to process usage log ${log.id}:`, error);
      // Continue processing other logs even if one fails
    }
  }

  return processedCount;
}

/**
 * Process a single usage log and deduct credits
 */
export async function processUsageLog(usageLogId: string): Promise<void> {
  // Get usage log
  const usageLog = await prisma.usageLog.findUnique({
    where: { id: usageLogId },
  });

  if (!usageLog || usageLog.processed) {
    return; // Already processed or not found
  }

  // Get service cost configuration
  const serviceCost = await prisma.serviceCreditCost.findUnique({
    where: {
      serviceIdentifier: usageLog.serviceType,
    },
  });

  if (!serviceCost || !serviceCost.isActive) {
    console.warn(`No active cost configuration for service: ${usageLog.serviceType}`);
    // Mark as processed anyway to avoid reprocessing
    await prisma.usageLog.update({
      where: { id: usageLogId },
      data: {
        processed: true,
        processedAt: new Date(),
        creditsConsumed: 0,
      },
    });
    return;
  }

  // Calculate credits to charge based on service type
  const creditsToCharge = calculateCredits(usageLog, serviceCost);

  if (creditsToCharge <= 0) {
    // No credits to charge
    await prisma.usageLog.update({
      where: { id: usageLogId },
      data: {
        processed: true,
        processedAt: new Date(),
        creditsConsumed: 0,
      },
    });
    return;
  }

  // Deduct credits (negative amount = spending)
  try {
    await createTransaction(
      usageLog.userId,
      'CONSUMPTION',
      -creditsToCharge,
      `Service usage: ${usageLog.serviceType}`,
      usageLogId
    );

    // Mark as processed
    await prisma.usageLog.update({
      where: { id: usageLogId },
      data: {
        processed: true,
        processedAt: new Date(),
        creditsConsumed: creditsToCharge,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Insufficient credits') {
      // User ran out of credits
      // Mark as processed with 0 credits consumed
      await prisma.usageLog.update({
        where: { id: usageLogId },
        data: {
          processed: true,
          processedAt: new Date(),
          creditsConsumed: 0,
          additionalMetadata: {
            ...(usageLog.additionalMetadata as object),
            error: 'insufficient_credits',
          },
        },
      });
    } else {
      // Other error, leave unprocessed for retry
      throw error;
    }
  }
}

/**
 * Calculate credits based on usage metrics and service cost
 */
function calculateCredits(usageLog: any, serviceCost: any): number {
  const { creditsPerUnit } = serviceCost;

  switch (usageLog.serviceType) {
    case 'LLM_CHAT_SAFE':
    case 'LLM_CHAT_NSFW': {
      // Credits per 1k tokens
      const totalTokens = (usageLog.inputTokens || 0) + (usageLog.outputTokens || 0);
      const tokensInThousands = totalTokens / 1000;
      return Math.ceil(tokensInThousands * creditsPerUnit);
    }

    case 'LLM_STORY_GENERATION_SFW':
    case 'LLM_STORY_GENERATION_NSFW': {
      // Fixed credits per story
      return creditsPerUnit;
    }

    case 'IMAGE_GENERATION': {
      // Credits per image
      const imageCount = usageLog.imageCount || 1;
      return imageCount * creditsPerUnit;
    }

    case 'TTS_DEFAULT': {
      // Credits per 1k characters
      const characterCount = usageLog.characterCount || 0;
      const charactersInThousands = characterCount / 1000;
      return Math.ceil(charactersInThousands * creditsPerUnit);
    }

    case 'STT_DEFAULT': {
      // Credits per minute (additionalMetadata should contain duration)
      const durationMinutes = (usageLog.additionalMetadata as any)?.durationMinutes || 1;
      return Math.ceil(durationMinutes * creditsPerUnit);
    }

    default:
      console.warn(`Unknown service type: ${usageLog.serviceType}`);
      return 0;
  }
}

/**
 * Get user's usage statistics for current month
 */
export async function getUserMonthlyUsage(userId: string): Promise<any> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const usageLogs = await prisma.usageLog.findMany({
    where: {
      userId,
      timestamp: {
        gte: monthStart,
      },
      processed: true,
    },
  });

  // Aggregate by service type
  const usageByService: Record<string, { count: number; creditsSpent: number }> = {};

  for (const log of usageLogs) {
    if (!usageByService[log.serviceType]) {
      usageByService[log.serviceType] = { count: 0, creditsSpent: 0 };
    }
    usageByService[log.serviceType].count++;
    usageByService[log.serviceType].creditsSpent += log.creditsConsumed || 0;
  }

  const totalCreditsSpent = usageLogs.reduce((sum, log) => sum + (log.creditsConsumed || 0), 0);

  return {
    monthStart,
    totalLogs: usageLogs.length,
    totalCreditsSpent,
    usageByService,
  };
}

/**
 * Get service cost configuration
 */
export async function getServiceCosts(): Promise<any[]> {
  return prisma.serviceCreditCost.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      serviceIdentifier: 'asc',
    },
  });
}

/**
 * Calculate estimated credits for a service request
 * Used to show users cost preview before they commit
 */
export async function estimateServiceCost(
  serviceType: string,
  metrics: UsageMetrics
): Promise<number> {
  const serviceCost = await prisma.serviceCreditCost.findUnique({
    where: { serviceIdentifier: serviceType },
  });

  if (!serviceCost || !serviceCost.isActive) {
    return 0;
  }

  // Create temporary usage log object for calculation
  const tempLog = {
    serviceType,
    inputTokens: metrics.inputTokens,
    outputTokens: metrics.outputTokens,
    charactersProcessed: metrics.charactersProcessed,
    imagesProcessed: metrics.imagesProcessed,
    additionalMetadata: metrics.additionalMetadata,
  };

  return calculateCredits(tempLog, serviceCost);
}
