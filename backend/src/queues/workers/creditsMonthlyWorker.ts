import { queueManager } from '../QueueManager';
import { QueueName } from '../config';
import { processCreditsMonthlyJob } from '../jobs/creditsMonthlyJob';

/**
 * Register the credits monthly worker
 * This should be called on application startup
 */
export function registerCreditsMonthlyWorker(): void {
  queueManager.registerWorker(
    QueueName.CREDITS_MONTHLY,
    processCreditsMonthlyJob,
    {
      concurrency: 1, // Process one monthly task at a time
    }
  );
}
