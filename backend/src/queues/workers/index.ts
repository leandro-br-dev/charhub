import { logger } from '../../config/logger';
import { registerTestWorker } from './testWorker';

/**
 * Initialize all queue workers
 * Call this on application startup
 */
export function initializeWorkers(): void {
  logger.info('Initializing queue workers');

  try {
    // Register test worker
    registerTestWorker();
  } catch (error) {
    logger.error({ error }, 'Failed to register workers (queues disabled or Redis unavailable)');
    return;
  }

  // Future workers will be registered here:
  // registerCharacterWorker();
  // registerImageGenerationWorker();
  // registerStoryWorker();
  // registerUsageLogWorker();

  logger.info('All queue workers initialized');
}
