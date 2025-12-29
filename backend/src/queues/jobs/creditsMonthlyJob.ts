import { Job } from 'bullmq';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';
import { grantMonthlyCredits, createMonthlySnapshot } from '../../services/creditService';

/**
 * Credits Monthly Job
 * Runs monthly tasks: grant monthly credits, create snapshots
 */

export interface CreditsMonthlyJobData {
  month: string; // YYYY-MM format
  task: 'grant_credits' | 'create_snapshots';
}

export const CREDITS_MONTHLY_JOB_NAME = 'credits-monthly-task';

/**
 * Credits monthly job processor
 * Grants monthly credits or creates balance snapshots for all users
 */
export async function processCreditsMonthlyJob(job: Job<CreditsMonthlyJobData>): Promise<string> {
  const { month, task } = job.data;

  logger.info(
    { jobId: job.id, month, task },
    'Processing monthly credits task'
  );

  try {
    // Get all users with active plans
    const users = await prisma.user.findMany({
      select: { id: true },
    });

    let processedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        if (task === 'grant_credits') {
          await grantMonthlyCredits(user.id);
        } else if (task === 'create_snapshots') {
          await createMonthlySnapshot(user.id);
        }
        processedCount++;
      } catch (error) {
        logger.error({ userId: user.id, error }, `Failed to ${task} for user`);
        errorCount++;
      }
    }

    const result = `${task}: ${processedCount} users processed, ${errorCount} errors`;
    logger.info({ jobId: job.id, result }, 'Monthly credits task finished');

    return result;
  } catch (error) {
    logger.error({ jobId: job.id, error }, 'Monthly credits task failed');
    throw error;
  }
}
