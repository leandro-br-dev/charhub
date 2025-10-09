import { Job } from 'bullmq';
import { logger } from '../../config/logger';

/**
 * Test job data interface
 */
export interface TestJobData {
  message: string;
  delay?: number;
}

/**
 * Test job processor
 * Simple job that logs a message and optionally delays
 */
export async function processTestJob(job: Job<TestJobData>): Promise<string> {
  const { message, delay = 0 } = job.data;

  logger.info(
    { jobId: job.id, message, delay },
    'Processing test job'
  );

  // Simulate some async work
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  const result = `Test job completed: ${message}`;
  logger.info({ jobId: job.id, result }, 'Test job finished');

  return result;
}
