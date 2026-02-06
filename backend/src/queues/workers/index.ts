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
import { systemConfigurationService } from '../../services/config/systemConfigurationService';
import type {
  CharacterPopulationJobData,
  HourlyGenerationJobData,
  DailyCurationJobData,
  AvatarCorrectionJobData,
  DataCompletenessCorrectionJobData
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
    const batchGenerationEnabled = await systemConfigurationService.getBool('generation.batch_enabled', false);
    const dailyCurationHour = await systemConfigurationService.getInt('scheduling.daily_curation_hour', 3); // Default: 3 AM UTC

    // Schedule daily curation job (fetches and curates images once per day)
    // This is independent of character generation - controlled by curation.image_limit
    const curationImageLimit = await systemConfigurationService.getInt('curation.image_limit', 50);

    if (curationImageLimit > 0) {
      await populationQueue.add(
        'daily-curation',
        {
          imageCount: curationImageLimit,
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
        { hour: dailyCurationHour, imageCount: curationImageLimit },
        'Daily curation job scheduled (fetches anime-style images from Civitai)'
      );
    } else {
      logger.info('Daily curation job is disabled (set curation.image_limit > 0 to enable)');
    }

    // Schedule hourly generation job (generates 1 character per hour, up to daily limit)
    // Only runs if batch generation is enabled
    if (batchGenerationEnabled) {
      const batchSize = await systemConfigurationService.getInt('generation.batch_size_per_run', 24);

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
      logger.info('Automated character generation is disabled (set generation.batch_enabled=true to enable)');
    }

    // Schedule avatar correction job (if enabled)
    const correctionEnabled = await systemConfigurationService.getBool('correction.enabled', true);
    if (correctionEnabled) {
      const avatarDailyLimit = await systemConfigurationService.getInt('correction.avatar_daily_limit', 5);

      // Schedule avatar correction - Daily at 4 AM UTC
      await populationQueue.add(
        'avatar-correction',
        {
          targetCount: avatarDailyLimit,
        } as AvatarCorrectionJobData,
        {
          repeat: {
            pattern: '0 4 * * *', // Daily at 4 AM UTC
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
        { dailyLimit: avatarDailyLimit },
        'Avatar correction job scheduled to run daily at 4 AM UTC'
      );

      // Schedule data completeness correction - Daily at 5 AM UTC (after avatar correction)
      const dataDailyLimit = await systemConfigurationService.getInt('correction.data_daily_limit', 10);

      await populationQueue.add(
        'data-completeness-correction',
        {
          targetCount: dataDailyLimit,
        } as DataCompletenessCorrectionJobData,
        {
          repeat: {
            pattern: '0 5 * * *', // Daily at 5 AM UTC
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
        { dailyLimit: dataDailyLimit },
        'Data completeness correction job scheduled to run daily at 5 AM UTC'
      );
    } else {
      logger.info('Correction flows are disabled (set correction.enabled=true to enable)');
    }
  } catch (error) {
    logger.error({ error }, 'Failed to schedule recurring jobs');
  }
}
