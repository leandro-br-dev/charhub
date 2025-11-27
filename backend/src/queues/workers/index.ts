import { logger } from '../../config/logger';
import { registerTestWorker } from './testWorker';
import { registerUsageProcessingWorker } from './usageProcessingWorker';
import { registerCreditsMonthlyWorker } from './creditsMonthlyWorker';
import { registerMemoryCompressionWorker } from './memoryCompressionWorker';
import { registerImageGenerationWorker } from './imageGenerationWorkerRegister';

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
