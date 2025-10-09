import { queueManager } from '../QueueManager';
import { QueueName } from '../config';
import { processTestJob } from '../jobs/testJob';

/**
 * Register the test worker
 * This should be called on application startup
 */
export function registerTestWorker(): void {
  queueManager.registerWorker(
    QueueName.TEST,
    processTestJob,
    {
      concurrency: 3, // Process up to 3 test jobs concurrently
    }
  );
}
