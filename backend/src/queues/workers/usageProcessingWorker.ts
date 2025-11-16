import { queueManager } from '../QueueManager';
import { QueueName } from '../config';
import { processUsageProcessingJob } from '../jobs/usageProcessingJob';

/**
 * Register the usage processing worker
 * This should be called on application startup
 */
export function registerUsageProcessingWorker(): void {
  queueManager.registerWorker(
    QueueName.USAGE_PROCESSING,
    processUsageProcessingJob,
    {
      concurrency: 2, // Process up to 2 batches concurrently
    }
  );
}
