/**
 * Image Generation API Routes
 * Endpoints for generating character avatars and stickers
 */

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { queueManager } from '../../queues/QueueManager';
import { QueueName } from '../../queues/config';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';
import { ImageGenerationType } from '../../services/comfyui';
import type {
  AvatarGenerationJobData,
  StickerGenerationJobData,
  BulkStickerGenerationJobData,
} from '../../queues/jobs/imageGenerationJob';

const router = Router();

/**
 * POST /api/v1/image-generation/avatar
 * Generate avatar for a character
 */
router.post('/avatar', requireAuth, async (req, res) => {
  try {
    const { characterId } = req.body;
    const user = req.auth?.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = user.id;

    if (!characterId) {
      return res.status(400).json({ error: 'characterId is required' });
    }

    // Verify character exists and user has access
    const character = await prisma.character.findFirst({
      where: {
        id: characterId,
        OR: [{ userId }, { visibility: 'PUBLIC' }],
      },
    });

    if (!character) {
      return res.status(404).json({ error: 'Character not found or access denied' });
    }

    // Check if user owns the character
    if (character.userId !== userId) {
      return res.status(403).json({ error: 'You can only generate avatars for your own characters' });
    }

    // Queue the job
    const jobData: AvatarGenerationJobData = {
      type: ImageGenerationType.AVATAR,
      userId,
      characterId,
    };

    const job = await queueManager.addJob(QueueName.IMAGE_GENERATION, 'generate-avatar', jobData, {
      priority: 5, // Normal priority
    });

    logger.info({ jobId: job.id, characterId, userId }, 'Avatar generation job queued');

    return res.json({
      success: true,
      jobId: job.id,
      message: 'Avatar generation started',
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to queue avatar generation');
    return res.status(500).json({ error: 'Failed to start avatar generation' });
  }
});

/**
 * POST /api/v1/image-generation/sticker
 * Generate a single sticker for a character
 */
router.post('/sticker', requireAuth, async (req, res) => {
  try {
    const { characterId, emotion, actionTag, customInstructions } = req.body;
    const user = req.auth?.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = user.id;

    if (!characterId || !emotion || !actionTag) {
      return res.status(400).json({ error: 'characterId, emotion, and actionTag are required' });
    }

    // Verify character exists and user has access
    const character = await prisma.character.findFirst({
      where: {
        id: characterId,
        OR: [{ userId }, { visibility: 'PUBLIC' }],
      },
    });

    if (!character) {
      return res.status(404).json({ error: 'Character not found or access denied' });
    }

    // Check if user owns the character
    if (character.userId !== userId) {
      return res.status(403).json({ error: 'You can only generate stickers for your own characters' });
    }

    // Queue the job
    const jobData: StickerGenerationJobData = {
      type: ImageGenerationType.STICKER,
      userId,
      characterId,
      emotion,
      actionTag,
      customInstructions,
    };

    const job = await queueManager.addJob(QueueName.IMAGE_GENERATION, 'generate-sticker', jobData, {
      priority: 5,
    });

    logger.info({ jobId: job.id, characterId, emotion, userId }, 'Sticker generation job queued');

    return res.json({
      success: true,
      jobId: job.id,
      message: 'Sticker generation started',
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to queue sticker generation');
    return res.status(500).json({ error: 'Failed to start sticker generation' });
  }
});

/**
 * POST /api/v1/image-generation/stickers/bulk
 * Generate multiple stickers for a character
 */
router.post('/stickers/bulk', requireAuth, async (req, res) => {
  try {
    const { characterId, emotions, customInstructions } = req.body;
    const user = req.auth?.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = user.id;

    if (!characterId) {
      return res.status(400).json({ error: 'characterId is required' });
    }

    // Verify character exists and user has access
    const character = await prisma.character.findFirst({
      where: {
        id: characterId,
        OR: [{ userId }, { visibility: 'PUBLIC' }],
      },
    });

    if (!character) {
      return res.status(404).json({ error: 'Character not found or access denied' });
    }

    // Check if user owns the character
    if (character.userId !== userId) {
      return res.status(403).json({ error: 'You can only generate stickers for your own characters' });
    }

    // Queue the job
    const jobData: BulkStickerGenerationJobData = {
      type: ImageGenerationType.STICKER,
      userId,
      characterId,
      emotions,
      customInstructions,
    };

    const job = await queueManager.addJob(QueueName.IMAGE_GENERATION, 'generate-stickers-bulk', jobData, {
      priority: 3, // Lower priority for bulk operations
    });

    logger.info({ jobId: job.id, characterId, emotionCount: emotions?.length || 8, userId }, 'Bulk sticker generation job queued');

    return res.json({
      success: true,
      jobId: job.id,
      message: 'Bulk sticker generation started',
      emotionCount: emotions?.length || 8,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to queue bulk sticker generation');
    return res.status(500).json({ error: 'Failed to start bulk sticker generation' });
  }
});

/**
 * GET /api/v1/image-generation/status/:jobId
 * Get status of an image generation job
 */
router.get('/status/:jobId', requireAuth, async (_req, res) => {
  try {
    const { jobId } = _req.params;
    const queue = queueManager.getQueue(QueueName.IMAGE_GENERATION);

    const job = await queue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const state = await job.getState();
    const progress = job.progress;

    return res.json({
      jobId: job.id,
      state,
      progress,
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
    });
  } catch (error) {
    logger.error({ err: error, jobId: _req.params.jobId }, 'Failed to get job status');
    return res.status(500).json({ error: 'Failed to get job status' });
  }
});

/**
 * GET /api/v1/image-generation/health
 * Check ComfyUI health status
 */
router.get('/health', requireAuth, async (_req, res) => {
  try {
    const { comfyuiService } = await import('../../services/comfyui');
    const isHealthy = await comfyuiService.healthCheck();

    res.json({
      comfyui: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ err: error }, 'ComfyUI health check failed');
    res.status(503).json({
      comfyui: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
