/**
 * Image Generation API Routes
 * Endpoints for generating character avatars and stickers
 */

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { canEditCharacter } from '../../middleware/authorization';
import { queueManager } from '../../queues/QueueManager';
import { QueueName } from '../../queues/config';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';
import { ImageGenerationType } from '../../services/comfyui';
import { r2Service } from '../../services/r2Service';
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
    const { characterId, prompt, referenceImageUrl, imageType } = req.body;
    const user = req.auth?.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = user.id;
    const userRole = user.role;

    if (!characterId) {
      return res.status(400).json({ error: 'characterId is required' });
    }

    // Validate imageType if provided
    if (imageType && imageType !== 'AVATAR' && imageType !== 'COVER') {
      return res.status(400).json({ error: 'imageType must be either AVATAR or COVER' });
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

    // Check if user can edit the character (owner OR admin for official characters)
    if (!canEditCharacter(userId, userRole, character.userId)) {
      return res.status(403).json({ error: 'You can only generate images for your own characters' });
    }

    // Queue the job with optional prompt, reference image, and image type
    const jobData: AvatarGenerationJobData = {
      type: ImageGenerationType.AVATAR,
      userId,
      characterId,
      prompt, // Optional Stable Diffusion prompt
      referenceImageUrl, // Optional URL to reference image for IP-Adapter
      imageType: imageType || 'AVATAR', // Whether to save as AVATAR or COVER type
    };

    const job = await queueManager.addJob(QueueName.IMAGE_GENERATION, 'generate-avatar', jobData, {
      priority: 5, // Normal priority
    });

    logger.info({ jobId: job.id, characterId, userId, hasPrompt: !!prompt, hasReference: !!referenceImageUrl, imageType }, 'Image generation job queued');

    return res.json({
      success: true,
      jobId: job.id,
      message: `${imageType || 'Avatar'} generation started`,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to queue image generation');
    return res.status(500).json({ error: 'Failed to start image generation' });
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
    const userRole = user.role;

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

    // Check if user can edit the character (owner OR admin for official characters)
    if (!canEditCharacter(userId, userRole, character.userId)) {
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
    const userRole = user.role;

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

    // Check if user can edit the character (owner OR admin for official characters)
    if (!canEditCharacter(userId, userRole, character.userId)) {
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

/**
 * GET /api/v1/image-generation/characters/:characterId/images
 * List all images for a character, grouped by type
 */
router.get('/characters/:characterId/images', requireAuth, async (req, res) => {
  try {
    const { characterId } = req.params;
    const userId = req.auth?.user.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify character ownership or public visibility
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { userId: true, visibility: true },
    });

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (character.userId !== userId && character.visibility !== 'PUBLIC') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Fetch all images grouped by type
    const images = await prisma.characterImage.findMany({
      where: { characterId },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        type: true,
        url: true,
        width: true,
        height: true,
        sizeBytes: true,
        isActive: true,
        content: true,
        createdAt: true,
      },
    });

    // Group by type
    const grouped = images.reduce(
      (acc, img) => {
        if (!acc[img.type]) {
          acc[img.type] = [];
        }
        acc[img.type].push(img);
        return acc;
      },
      {} as Record<string, typeof images>
    );

    return res.json({
      success: true,
      data: grouped,
      total: images.length,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to list character images');
    return res.status(500).json({ error: 'Failed to list images' });
  }
});

/**
 * PATCH /api/v1/image-generation/characters/:characterId/images/:imageId/activate
 * Set an image as active (deactivates others of the same type)
 */
router.patch('/characters/:characterId/images/:imageId/activate', requireAuth, async (req, res) => {
  try {
    const { characterId, imageId } = req.params;
    const user = req.auth?.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = user.id;
    const userRole = user.role;

    // Verify character ownership
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { userId: true },
    });

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Check if user can edit the character (owner OR admin for official characters)
    if (!canEditCharacter(userId, userRole, character.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get the image to activate
    const image = await prisma.characterImage.findFirst({
      where: { id: imageId, characterId },
      select: { type: true },
    });

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Transaction: deactivate all images of this type, then activate the selected one
    await prisma.$transaction([
      // Deactivate all images of this type for this character
      prisma.characterImage.updateMany({
        where: {
          characterId,
          type: image.type,
        },
        data: { isActive: false },
      }),
      // Activate the selected image
      prisma.characterImage.update({
        where: { id: imageId },
        data: { isActive: true },
      }),
    ]);

    logger.info({ characterId, imageId, type: image.type }, 'Image activated');

    return res.json({
      success: true,
      message: 'Image activated successfully',
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to activate image');
    return res.status(500).json({ error: 'Failed to activate image' });
  }
});

/**
 * DELETE /api/v1/image-generation/characters/:characterId/images/:imageId
 * Delete an image
 */
router.delete('/characters/:characterId/images/:imageId', requireAuth, async (req, res) => {
  try {
    const { characterId, imageId } = req.params;
    const user = req.auth?.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = user.id;
    const userRole = user.role;

    // Verify character ownership
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { userId: true },
    });

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Check if user can edit the character (owner OR admin for official characters)
    if (!canEditCharacter(userId, userRole, character.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get the image to delete (including isActive and type)
    const image = await prisma.characterImage.findFirst({
      where: { id: imageId, characterId },
      select: { id: true, key: true, isActive: true, type: true },
    });

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Delete from R2 if key exists
    if (image.key) {
      try {
        await r2Service.deleteObject(image.key);
        logger.info({ key: image.key }, 'Deleted image from R2');
      } catch (err) {
        logger.error({ key: image.key, err }, 'Failed to delete image from R2, continuing with database deletion');
      }
    }

    // If the deleted image was active, activate the next available image of the same type
    if (image.isActive) {
      const nextImage = await prisma.characterImage.findFirst({
        where: {
          characterId,
          type: image.type,
          id: { not: imageId },
        },
        select: { id: true },
      });

      if (nextImage) {
        // Activate the next image before deleting the current one
        await prisma.characterImage.updateMany({
          where: {
            characterId,
            type: image.type,
          },
          data: { isActive: false },
        });

        await prisma.characterImage.update({
          where: { id: nextImage.id },
          data: { isActive: true },
        });

        logger.info({ characterId, imageId, newActiveId: nextImage.id, type: image.type }, 'Activated next image after deleting active image');
      }
    }

    // Delete from database
    await prisma.characterImage.delete({
      where: { id: imageId },
    });

    logger.info({ characterId, imageId }, 'Image deleted successfully');

    return res.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to delete image');
    return res.status(500).json({ error: 'Failed to delete image' });
  }
});

/**
 * ============================================================================
 * MULTI-STAGE CHARACTER GENERATION ENDPOINTS
 * ============================================================================
 */

/**
 * POST /api/v1/image-generation/character-dataset
 * Generate complete 4-stage reference dataset for a character
 * Long-running operation - returns job ID for polling
 *
 * New parameter: viewsToGenerate - optional array of views to regenerate
 * Example: viewsToGenerate: ["face", "side"] - only regenerate face and side views
 * If not provided, all 4 views will be generated (existing behavior)
 */
router.post('/character-dataset', requireAuth, async (req, res) => {
  try {
    const { characterId, prompt, loras, referenceImages, viewsToGenerate } = req.body;
    const user = req.auth?.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = user.id;
    const userRole = user.role;

    if (!characterId) {
      return res.status(400).json({ error: 'characterId is required' });
    }

    // Verify character ownership and get character data
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        gender: true,
        speciesId: true,
        physicalCharacteristics: true,
        personality: true,
        reference: true,
        style: true,
      },
    });

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Check if user can edit the character (owner OR admin for official characters)
    if (!canEditCharacter(userId, userRole, character.userId)) {
      return res.status(403).json({ error: 'Unauthorized to generate images for this character' });
    }

    // Fetch species data if character has one
    let species = null;
    if (character.speciesId) {
      species = await prisma.species.findUnique({
        where: { id: character.speciesId },
        select: { name: true },
      });
    }

    // Build prompts automatically if not provided or if empty
    let finalPrompt = prompt;
    if (!prompt || !prompt.positive || !prompt.negative || prompt.positive.trim() === '' || prompt.negative.trim() === '') {
      const { buildImagePrompt } = await import('../../services/image-generation/promptBuilder');
      finalPrompt = buildImagePrompt(
        character,
        species,
        prompt?.positive,
        prompt?.negative
      );
      logger.info({ characterId, autoGenerated: true }, 'Prompts auto-generated from character data');
    }

    // Prepare job data
    const jobData = {
      type: 'multi-stage-dataset' as const,
      userId,
      userRole,
      characterId,
      prompt: finalPrompt,
      loras: loras || [],
      referenceImages: referenceImages || [],
      viewsToGenerate: viewsToGenerate || undefined, // Pass viewsToGenerate if provided
    };

    // Calculate estimated time and stages based on viewsToGenerate
    const allStages = ['Face (portrait)', 'Front (body)', 'Side (body)', 'Back (body)'];
    const stagesToGenerate = viewsToGenerate && viewsToGenerate.length > 0
      ? allStages.filter((_, i) => {
          const view = ['face', 'front', 'side', 'back'][i];
          return viewsToGenerate.includes(view as any);
        })
      : allStages;

    const estimatedTime = `${Math.ceil(stagesToGenerate.length * 0.75)}-${Math.ceil(stagesToGenerate.length)} minutes`;

    // Queue the job
    const job = await queueManager.addJob(QueueName.IMAGE_GENERATION, 'multi-stage-dataset', jobData, {
      priority: 5, // Normal priority
    });

    logger.info({
      jobId: job.id,
      characterId,
      userId,
      initialRefs: referenceImages?.length || 0,
      viewsToGenerate: viewsToGenerate || 'all',
    }, 'Multi-stage character dataset generation job queued');

    return res.json({
      success: true,
      jobId: job.id,
      message: viewsToGenerate && viewsToGenerate.length > 0
        ? `Regenerating ${viewsToGenerate.length} reference view(s)`
        : 'Multi-stage dataset generation started',
      estimatedTime,
      pollUrl: `/api/v1/image-generation/status/${job.id}`,
      stages: stagesToGenerate,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to queue multi-stage dataset generation');
    return res.status(500).json({ error: 'Failed to start dataset generation' });
  }
});

/**
 * GET /api/v1/image-generation/characters/:characterId/reference-dataset
 * Get reference dataset images for a character
 */
router.get('/characters/:characterId/reference-dataset', requireAuth, async (req, res) => {
  try {
    const { characterId } = req.params;
    const userId = req.auth?.user.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify character ownership or public visibility
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { userId: true, visibility: true },
    });

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (character.userId !== userId && character.visibility !== 'PUBLIC') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Fetch reference images
    const referenceImages = await prisma.characterImage.findMany({
      where: {
        characterId,
        type: 'REFERENCE',
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        type: true,
        url: true,
        width: true,
        height: true,
        content: true,
        createdAt: true,
      },
    });

    // Check if dataset is complete (all 4 views: avatar, front, side, back)
    const expectedViews = ['avatar', 'front', 'side', 'back'];
    const hasAllStages = referenceImages.length === 4 &&
      referenceImages.every(img => img.content && expectedViews.includes(img.content));

    return res.json({
      success: true,
      data: referenceImages,
      isComplete: hasAllStages,
      stageCount: referenceImages.length,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to get reference dataset');
    return res.status(500).json({ error: 'Failed to get reference dataset' });
  }
});

export default router;
