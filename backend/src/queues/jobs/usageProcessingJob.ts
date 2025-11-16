import { Job } from 'bullmq';
import { logger } from '../../config/logger';
import { processUsageLogs } from '../../services/usageService';

/**
 * Usage Processing Job
 * Processes pending usage logs and deducts credits
 */

export interface UsageProcessingJobData {
  batchSize?: number;
}

export const USAGE_PROCESSING_JOB_NAME = 'process-usage-logs';

/**
 * Usage processing job processor
 * Processes pending usage logs in batches
 */
export async function processUsageProcessingJob(job: Job<UsageProcessingJobData>): Promise<string> {
  const { batchSize = 100 } = job.data;

  logger.info(
    { jobId: job.id, batchSize },
    'Processing usage logs batch'
  );

  try {
    const processedCount = await processUsageLogs(batchSize);

    const result = `Processed ${processedCount} usage logs`;
    logger.info({ jobId: job.id, processedCount }, 'Usage processing job finished');

    return result;
  } catch (error) {
    logger.error({ jobId: job.id, error }, 'Usage processing job failed');
    throw error;
  }
}
