/**
 * Character Population Worker Registration
 */

import { queueManager } from '../QueueManager';
import { QueueName } from '../config';
import { characterPopulationProcessor } from './characterPopulationWorker';
import { logger } from '../../config/logger';

/**
 * Register character population worker
 */
export function registerCharacterPopulationWorker(): void {
  queueManager.registerWorker(
    QueueName.CHARACTER_POPULATION,
    characterPopulationProcessor,
    {
      concurrency: 1, // Process one population job at a time
    }
  );

  logger.info('Character population worker registered');
}
