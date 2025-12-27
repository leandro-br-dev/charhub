/**
 * Character Population API Routes
 * Admin endpoints for automated character population system
 */

import { Router, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { logger } from '../../config/logger';
import { queueManager } from '../../queues/QueueManager';
import { QueueName } from '../../queues/config';
import type { TriggerCurationJobData, BatchGenerationJobData, FullPopulationJobData } from '../../queues/jobs/characterPopulationJob';
import { curationQueue } from '../../services/curation';
import { batchCharacterGenerator } from '../../services/batch';
import { civitaiApiClient } from '../../services/civitai';
import { prisma } from '../../config/database';

const router = Router();

// Helper function to check admin access
function requireAdmin(user: any, res: Response): boolean {
  if (user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required' });
    return false;
  }
  return true;
}

/**
 * GET /api/v1/character-population/stats
 * Get system statistics
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const user = req.auth?.user;

    if (!requireAdmin(user, res)) {
      return;
    }

    // Get curation queue stats
    const curationStats = await curationQueue.getStats();

    // Get batch stats
    const batchStats = await batchCharacterGenerator.getBatchStats();

    // Get Civitai rate limit status
    const rateLimit = civitaiApiClient.getRateLimitStatus();

    // Get queue stats
    const queueStats = await queueManager.getQueueStats(QueueName.CHARACTER_POPULATION);

    res.json({
      curation: curationStats,
      batch: batchStats,
      civitai: rateLimit,
      queue: queueStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get population stats');
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

/**
 * POST /api/v1/character-population/trigger-curation
 * Manually trigger curation job
 */
router.post('/trigger-curation', requireAuth, async (req, res) => {
  try {
    const user = req.auth?.user;

    if (!requireAdmin(user, res)) {
      return;
    }

    const { imageCount = 50, keywords } = req.body;

    // Queue the job
    const jobData: TriggerCurationJobData = {
      imageCount,
      keywords,
    };

    const job = await queueManager.addJob(
      QueueName.CHARACTER_POPULATION,
      'trigger-curation',
      jobData,
      { priority: 5 }
    );

    logger.info({ jobId: job.id, imageCount }, 'Curation job triggered manually');

    res.json({
      success: true,
      jobId: job.id,
      message: 'Curation job started',
      imageCount,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to trigger curation');
    res.status(500).json({ error: 'Failed to trigger curation' });
  }
});

/**
 * POST /api/v1/character-population/trigger-batch
 * Manually trigger batch generation job
 */
router.post('/trigger-batch', requireAuth, async (req, res) => {
  try {
    const user = req.auth?.user;

    if (!requireAdmin(user, res)) {
      return;
    }

    const { count = 20, userId } = req.body;

    // Queue the job
    const jobData: BatchGenerationJobData = {
      count,
      userId,
    };

    const job = await queueManager.addJob(
      QueueName.CHARACTER_POPULATION,
      'batch-generation',
      jobData,
      { priority: 5 }
    );

    logger.info({ jobId: job.id, count }, 'Batch generation job triggered manually');

    res.json({
      success: true,
      jobId: job.id,
      message: 'Batch generation job started',
      count,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to trigger batch generation');
    res.status(500).json({ error: 'Failed to trigger batch generation' });
  }
});

/**
 * POST /api/v1/character-population/trigger-full
 * Manually trigger full population pipeline
 */
router.post('/trigger-full', requireAuth, async (req, res) => {
  try {
    const user = req.auth?.user;

    if (!requireAdmin(user, res)) {
      return;
    }

    const { targetCount = 20, keywords, userId } = req.body;

    // Queue the job
    const jobData: FullPopulationJobData = {
      targetCount,
      keywords,
      userId,
    };

    const job = await queueManager.addJob(
      QueueName.CHARACTER_POPULATION,
      'full-population',
      jobData,
      { priority: 5 }
    );

    logger.info({ jobId: job.id, targetCount }, 'Full population job triggered manually');

    res.json({
      success: true,
      jobId: job.id,
      message: 'Full population pipeline started',
      targetCount,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to trigger full population');
    res.status(500).json({ error: 'Failed to trigger full population' });
  }
});

/**
 * GET /api/v1/character-population/jobs
 * Get recent jobs
 */
router.get('/jobs', requireAuth, async (req, res) => {
  try {
    const user = req.auth?.user;

    if (!requireAdmin(user, res)) {
      return;
    }

    // Get recent batch logs
    const recentBatches = await batchCharacterGenerator.getRecentBatches(20);

    // Get queue jobs
    const queue = queueManager.getQueue(QueueName.CHARACTER_POPULATION);
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(0, 10),
      queue.getActive(0, 10),
      queue.getCompleted(0, 10),
      queue.getFailed(0, 10),
      queue.getDelayed(0, 10),
    ]);

    res.json({
      batches: recentBatches,
      queue: {
        waiting: waiting.map(j => ({ id: j.id, name: j.name, data: j.data })),
        active: active.map(j => ({ id: j.id, name: j.name, data: j.data, progress: j.progress })),
        completed: completed.map(j => ({ id: j.id, name: j.name, finishedAt: j.finishedOn })),
        failed: failed.map(j => ({ id: j.id, name: j.name, failedReason: j.failedReason })),
        delayed: delayed.map(j => ({ id: j.id, name: j.name })),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get jobs');
    res.status(500).json({ error: 'Failed to get jobs' });
  }
});

/**
 * GET /api/v1/character-population/curated-images
 * Get curated images
 */
router.get('/curated-images', requireAuth, async (req, res) => {
  try {
    const user = req.auth?.user;

    if (!requireAdmin(user, res)) {
      return;
    }

    const { status, limit = 50 } = req.query;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const images = await prisma.curatedImage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string, 10),
    });

    res.json({
      images,
      count: images.length,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get curated images');
    res.status(500).json({ error: 'Failed to get curated images' });
  }
});

/**
 * GET /api/v1/character-population/settings
 * Get current settings
 */
router.get('/settings', requireAuth, async (req, res) => {
  try {
    const user = req.auth?.user;

    if (!requireAdmin(user, res)) {
      return;
    }

    res.json({
      enabled: process.env.BATCH_GENERATION_ENABLED === 'true',
      batchSize: process.env.BATCH_SIZE_PER_RUN,
      cronSchedule: process.env.BATCH_SCHEDULE_CRON,
      retryAttempts: process.env.BATCH_RETRY_ATTEMPTS,
      timeout: process.env.BATCH_TIMEOUT_MINUTES,
      autoApprovalThreshold: process.env.AUTO_APPROVAL_THRESHOLD,
      requireManualReview: process.env.REQUIRE_MANUAL_REVIEW,
      nsfwFilterEnabled: process.env.NSFW_FILTER_ENABLED,
      botUserId: process.env.OFFICIAL_BOT_USER_ID,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get settings');
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

export default router;
