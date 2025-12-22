import { logger } from '../../config/logger';
import { registerTestWorker } from './testWorker';
import { registerUsageProcessingWorker } from './usageProcessingWorker';
import { registerCreditsMonthlyWorker } from './creditsMonthlyWorker';
import { registerMemoryCompressionWorker } from './memoryCompressionWorker';
import { registerImageGenerationWorker } from './imageGenerationWorkerRegister';
import { queueManager } from '../QueueManager';
import { QueueName } from '../config';
import { CreditsMonthlyJobData } from '../jobs/creditsMonthlyJob';

/**
 * Initialize all queue workers
 * Call this on application startup
 */
export function initializeWorkers(): void {
  logger.info('Initializing queue workers');

  try {
    // Register test worker
    registerTestWorker();

    // Register credits system workers
    registerUsageProcessingWorker();
    registerCreditsMonthlyWorker();

    // Register memory compression worker
    registerMemoryCompressionWorker();

    // Register image generation worker
    registerImageGenerationWorker();
  } catch (error) {
    logger.error({ error }, 'Failed to register workers (queues disabled or Redis unavailable)');
    return;
  }

  // Future workers will be registered here:
  // registerCharacterWorker();
  // registerStoryWorker();

  logger.info('All queue workers initialized');
}

/**
 * Schedule recurring jobs
 * Call this after initializeWorkers()
 */
export async function scheduleRecurringJobs(): Promise<void> {
  logger.info('Scheduling recurring jobs');

  try {
    const creditsQueue = queueManager.getQueue<CreditsMonthlyJobData>(QueueName.CREDITS_MONTHLY);

    // Schedule monthly credits job to run daily at 00:00 UTC
    // This ensures PREMIUM users get their credits even if webhooks fail
    // FREE users are handled by login middleware, but this provides a backup
    await creditsQueue.add(
      'grant-monthly-credits',
      {
        month: new Date().toISOString().slice(0, 7), // YYYY-MM format
        task: 'grant_credits',
      },
      {
        repeat: {
          pattern: '0 0 * * *', // Cron: Every day at 00:00 UTC
        },
        // Remove old completed jobs after 7 days
        removeOnComplete: {
          age: 7 * 24 * 60 * 60, // 7 days in seconds
        },
        removeOnFail: {
          age: 30 * 24 * 60 * 60, // 30 days in seconds
        },
      }
    );

    logger.info('Monthly credits job scheduled to run daily at 00:00 UTC');

    // Optionally schedule monthly snapshot creation
    // This creates performance-optimized monthly balance snapshots
    await creditsQueue.add(
      'create-monthly-snapshots',
      {
        month: new Date().toISOString().slice(0, 7),
        task: 'create_snapshots',
      },
      {
        repeat: {
          pattern: '0 1 1 * *', // Cron: 1st day of each month at 01:00 UTC
        },
        removeOnComplete: {
          age: 7 * 24 * 60 * 60,
        },
        removeOnFail: {
          age: 30 * 24 * 60 * 60,
        },
      }
    );

    logger.info('Monthly snapshot job scheduled to run on 1st of each month at 01:00 UTC');
  } catch (error) {
    logger.error({ error }, 'Failed to schedule recurring jobs');
  }
}
