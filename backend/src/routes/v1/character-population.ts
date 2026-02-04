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
import { sendError, API_ERROR_CODES } from '../../utils/apiErrors';
import { systemConfigurationService } from '../../services/config/systemConfigurationService';

const router = Router();

// Helper function to check admin access
function requireAdmin(user: any, res: Response): boolean {
  if (user?.role !== 'ADMIN') {
    sendError(res, 403, API_ERROR_CODES.ADMIN_REQUIRED);
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
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to get statistics'
    });
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
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to trigger curation'
    });
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
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to trigger batch generation'
    });
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
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to trigger full population'
    });
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
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to get jobs'
    });
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
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to get curated images'
    });
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

    // Read settings from system configuration service
    const [
      batchEnabled,
      batchSize,
      autoApprovalThreshold,
      requireManualReview,
      nsfwFilterEnabled,
    ] = await Promise.all([
      systemConfigurationService.getBool('generation.batch_enabled', false),
      systemConfigurationService.getInt('generation.batch_size_per_run', 24),
      systemConfigurationService.get('curation.auto_approval_threshold', '4.5'),
      systemConfigurationService.getBool('curation.require_manual_review', false),
      systemConfigurationService.getBool('moderation.nsfw_filter_enabled', true),
    ]);

    res.json({
      enabled: batchEnabled,
      batchSize: String(batchSize),
      cronSchedule: process.env.BATCH_SCHEDULE_CRON, // Still from env, not migrated
      retryAttempts: process.env.BATCH_RETRY_ATTEMPTS, // Still from env, not migrated
      timeout: process.env.BATCH_TIMEOUT_MINUTES, // Still from env, not migrated
      autoApprovalThreshold,
      requireManualReview: String(requireManualReview),
      nsfwFilterEnabled: String(nsfwFilterEnabled),
      botUserId: process.env.OFFICIAL_BOT_USER_ID,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get settings');
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to get settings'
    });
  }
});

/**
 * POST /api/v1/character-population/trigger-avatar-correction
 * Trigger avatar correction job
 */
router.post('/trigger-avatar-correction', requireAuth, async (req, res) => {
  try {
    const user = req.auth?.user;

    if (!requireAdmin(user, res)) {
      return;
    }

    const { limit = 50 } = req.body;

    // Validate limit
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 500) {
      sendError(res, 400, API_ERROR_CODES.VALUE_OUT_OF_RANGE, {
        message: 'Limit must be between 1 and 500',
        details: { min: 1, max: 500, provided: limit },
        field: 'limit'
      });
      return;
    }

    // Queue the job
    const job = await queueManager.addJob(
      QueueName.CHARACTER_POPULATION,
      'avatar-correction',
      { targetCount: parsedLimit },
      { priority: 5 }
    );

    logger.info({ jobId: job.id, limit: parsedLimit }, 'Avatar correction job triggered');

    res.json({
      success: true,
      jobId: job.id,
      message: 'Avatar correction job started',
      limit: parsedLimit,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to trigger avatar correction');
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to trigger avatar correction'
    });
  }
});

/**
 * POST /api/v1/character-population/trigger-data-correction
 * Trigger data completeness correction job
 */
router.post('/trigger-data-correction', requireAuth, async (req, res) => {
  try {
    const user = req.auth?.user;

    if (!requireAdmin(user, res)) {
      return;
    }

    const { limit = 50 } = req.body;

    // Validate limit
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 500) {
      sendError(res, 400, API_ERROR_CODES.VALUE_OUT_OF_RANGE, {
        message: 'Limit must be between 1 and 500',
        details: { min: 1, max: 500, provided: limit },
        field: 'limit'
      });
      return;
    }

    // Queue the job
    const job = await queueManager.addJob(
      QueueName.CHARACTER_POPULATION,
      'data-completeness-correction',
      { targetCount: parsedLimit },
      { priority: 5 }
    );

    logger.info({ jobId: job.id, limit: parsedLimit }, 'Data correction job triggered');

    res.json({
      success: true,
      jobId: job.id,
      message: 'Data correction job started',
      limit: parsedLimit,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to trigger data correction');
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to trigger data correction'
    });
  }
});

/**
 * GET /api/v1/character-population/correction-stats
 * Get correction job statistics
 */
router.get('/correction-stats', requireAuth, async (req, res) => {
  try {
    const user = req.auth?.user;

    if (!requireAdmin(user, res)) {
      return;
    }

    // Get total character count
    const totalCharacters = await prisma.character.count();

    // Get characters with avatars
    const charactersWithAvatars = await prisma.character.count({
      where: {
        images: {
          some: {
            type: 'AVATAR',
            isActive: true,
          },
        },
      },
    });

    // Get characters with complete data (speciesId is not null and firstName is not 'Character')
    const charactersWithCompleteData = await prisma.character.count({
      where: {
        AND: [
          {
            speciesId: {
              not: null,
            },
          },
          {
            firstName: {
              not: 'Character',
            },
          },
        ],
      },
    });

    // Get last avatar correction job
    const lastAvatarJob = await prisma.correctionJobLog.findFirst({
      where: {
        jobType: 'avatar-correction',
      },
      orderBy: {
        completedAt: 'desc',
      },
    });

    // Get last data correction job
    const lastDataJob = await prisma.correctionJobLog.findFirst({
      where: {
        jobType: 'data-completeness-correction',
      },
      orderBy: {
        completedAt: 'desc',
      },
    });

    res.json({
      totalCharacters,
      charactersWithAvatars,
      charactersWithoutAvatars: totalCharacters - charactersWithAvatars,
      charactersWithCompleteData,
      charactersWithIncompleteData: totalCharacters - charactersWithCompleteData,
      lastAvatarCorrection: lastAvatarJob?.completedAt?.toISOString() || null,
      lastDataCorrection: lastDataJob?.completedAt?.toISOString() || null,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get correction stats');
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to get correction stats'
    });
  }
});

export default router;
