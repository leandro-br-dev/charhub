import { logger } from '../../config/logger';
import { registerTestWorker } from './testWorker';
import { registerUsageProcessingWorker } from './usageProcessingWorker';
import { registerCreditsMonthlyWorker } from './creditsMonthlyWorker';
import { registerMemoryCompressionWorker } from './memoryCompressionWorker';
import { registerImageGenerationWorker } from './imageGenerationWorkerRegister';
import { registerCharacterPopulationWorker } from './characterPopulationWorkerRegister';
import { queueManager } from '../QueueManager';
import { QueueName } from '../config';
import { CreditsMonthlyJobData } from '../jobs/creditsMonthlyJob';
import type {
  CharacterPopulationJobData,
  HourlyGenerationJobData,
  DailyCurationJobData
} from '../jobs/characterPopulationJob';

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

    // Register character population worker
    registerCharacterPopulationWorker();
  } catch (error) {
    logger.error({ error }, 'Failed to register workers (queues disabled or Redis unavailable)');
    return;
  }

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
    const populationQueue = queueManager.getQueue<CharacterPopulationJobData>(QueueName.CHARACTER_POPULATION);

    // Schedule monthly credits job to run daily at 00:00 UTC
    await creditsQueue.add(
      'grant-monthly-credits',
      {
        month: new Date().toISOString().slice(0, 7),
        task: 'grant_credits',
      },
      {
        repeat: {
          pattern: '0 0 * * *',
        },
        removeOnComplete: {
          age: 7 * 24 * 60 * 60,
        },
        removeOnFail: {
          age: 30 * 24 * 60 * 60,
        },
      }
    );

    logger.info('Monthly credits job scheduled to run daily at 00:00 UTC');

    // Schedule monthly snapshot creation
    await creditsQueue.add(
      'create-monthly-snapshots',
      {
        month: new Date().toISOString().slice(0, 7),
        task: 'create_snapshots',
      },
      {
        repeat: {
          pattern: '0 1 1 * *',
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

    // Schedule automated character population (if enabled)
    const batchGenerationEnabled = process.env.BATCH_GENERATION_ENABLED === 'true';
    if (batchGenerationEnabled) {
      const batchSize = parseInt(process.env.BATCH_SIZE_PER_RUN || '24', 10);
      const dailyCurationHour = parseInt(process.env.DAILY_CURATION_HOUR || '3', 10); // Default: 3 AM UTC

      // Schedule daily curation job (fetches and curates images once per day)
      await populationQueue.add(
        'daily-curation',
        {
          imageCount: batchSize * 2, // Fetch extra to account for filtering
          task: 'daily_curation',
        } as DailyCurationJobData,
        {
          repeat: {
            pattern: `0 ${dailyCurationHour} * * *`, // Once per day at specified hour
          },
          removeOnComplete: {
            age: 7 * 24 * 60 * 60,
          },
          removeOnFail: {
            age: 30 * 24 * 60 * 60,
          },
        }
      );

      logger.info(
        { hour: dailyCurationHour, imageCount: batchSize * 2 },
        'Daily curation job scheduled (fetches anime-style images from Civitai)'
      );

      // Schedule hourly generation job (generates 1 character per hour, up to daily limit)
      await populationQueue.add(
        'hourly-generation',
        {
          dailyLimit: batchSize,
          task: 'hourly_generation',
        } as HourlyGenerationJobData,
        {
          repeat: {
            pattern: '0 * * * *', // Every hour at minute 0
          },
          removeOnComplete: {
            age: 7 * 24 * 60 * 60,
          },
          removeOnFail: {
            age: 30 * 24 * 60 * 60,
          },
        }
      );

      logger.info(
        { dailyLimit: batchSize },
        'Hourly generation job scheduled (generates 1 character per hour, respecting daily limit)'
      );
    } else {
      logger.info('Automated character population is disabled (set BATCH_GENERATION_ENABLED=true to enable)');
    }
  } catch (error) {
    logger.error({ error }, 'Failed to schedule recurring jobs');
  }
}
