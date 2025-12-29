import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import {
  createStory,
  getStoryById,
  listStories,
  updateStory,
  deleteStory,
  getMyStories,
} from '../../services/storyService';
import { requireAuth, optionalAuth } from '../../middleware/auth';
import { asyncMulterHandler } from '../../middleware/multerErrorHandler';
import { generateAutomatedStory } from '../../controllers/automatedStoryGenerationController';
import { r2Service } from '../../services/r2Service';
import { logger } from '../../config/logger';
import { processImageByType } from '../../services/imageProcessingService';
import { storyStatsService } from '../../services/storyStatsService';

const router = Router();

// Multer configuration for image upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/**
 * POST /api/v1/stories/generate
 * Automatically generate a story from text description and/or image
 */
router.post('/generate', requireAuth, asyncMulterHandler(upload.single('image')), generateAutomatedStory);

/**
 * POST /api/v1/stories/cover
 * Upload a story cover image to R2
 */
router.post('/cover', requireAuth, asyncMulterHandler(upload.single('cover')), async (req: Request, res: Response) => {
  const userId = req.auth?.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  if (!r2Service.isConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Media storage is not configured for this environment.',
      missing: r2Service.getMissingConfig(),
    });
  }

  const uploadedFile = req.file;

  if (!uploadedFile) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  try {
    const extension = ALLOWED_IMAGE_TYPES[uploadedFile.mimetype];
    if (!extension) {
      return res.status(415).json({ success: false, message: 'Unsupported image format. Use PNG, JPG, WEBP or GIF.' });
    }

    // Process image: compress and convert to WebP
    logger.info({ originalSize: uploadedFile.size, originalType: uploadedFile.mimetype }, 'Processing cover image');
    const processed = await processImageByType(uploadedFile.buffer, 'COVER');

    const sanitizedName = uploadedFile.originalname
      ? uploadedFile.originalname.replace(/[^a-z0-9._-]+/gi, '-').toLowerCase()
      : 'cover';

    const baseName = sanitizedName.replace(/\.[^.]+$/, '');
    const key = `stories/covers/${Date.now()}-${randomUUID()}-${baseName}.webp`;

    const { publicUrl } = await r2Service.uploadObject({
      key,
      body: processed.buffer,
      contentType: processed.contentType,
      cacheControl: 'public, max-age=604800',
    });

    logger.info(
      {
        originalSize: uploadedFile.size,
        processedSize: processed.sizeBytes,
        compressionRatio: `${((1 - processed.sizeBytes / uploadedFile.size) * 100).toFixed(2)}%`,
      },
      'Cover uploaded successfully'
    );

    return res.json({
      success: true,
      data: {
        url: publicUrl,
        key,
      },
    });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error && typeof (error as { statusCode?: number }).statusCode === 'number') {
      const statusCode = (error as { statusCode: number }).statusCode;
      return res.status(statusCode).json({ success: false, message: error.message });
    }

    logger.error({ error }, 'Error uploading story cover');
    return res.status(500).json({ success: false, message: 'Failed to upload story cover' });
  }
});

// Create a new story (authenticated)
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authorId = req.auth?.user?.id;
    if (!authorId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const story = await createStory(req.body, authorId);
    return res.status(201).json(story);
  } catch (error) {
    return next(error);
  }
});

// Get my stories (authenticated)
router.get('/my', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { page, limit, sortBy, sortOrder } = req.query;

    const result = await getMyStories(userId, {
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      sortBy: sortBy as 'createdAt' | 'updatedAt' | 'title' | undefined,
      sortOrder: sortOrder as 'asc' | 'desc' | undefined,
    });

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
});

// List stories with filters (public + user's private stories)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      search,
      tags,
      ageRatings,
      contentTags,
      authorId,
      visibility,
      sortBy,
      sortOrder,
      page,
      limit,
    } = req.query;

    const result = await listStories({
      search: search as string | undefined,
      tags: tags ? (tags as string).split(',') : undefined,
      ageRatings: ageRatings ? (ageRatings as string).split(',') : undefined,
      contentTags: contentTags ? (contentTags as string).split(',') : undefined,
      authorId: authorId as string | undefined,
      visibility: visibility as any,
      sortBy: sortBy as 'createdAt' | 'updatedAt' | 'title' | undefined,
      sortOrder: sortOrder as 'asc' | 'desc' | undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
});

// Get story by ID
router.get('/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.auth?.user?.id;

    const story = await getStoryById(id, userId);

    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    return res.status(200).json(story);
  } catch (error) {
    return next(error);
  }
});

// Update story (authenticated, author only)
router.put('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const story = await updateStory(id, req.body, userId);

    if (!story) {
      return res.status(404).json({ message: 'Story not found or unauthorized' });
    }

    return res.status(200).json(story);
  } catch (error) {
    return next(error);
  }
});

// Delete story (authenticated, author only)
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const deleted = await deleteStory(id, userId);

    if (!deleted) {
      return res.status(404).json({ message: 'Story not found or unauthorized' });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/v1/stories/:id/favorite
 * Toggle favorite status for a story
 */
router.post('/:id/favorite', requireAuth, async (req: Request, res: Response) => {
  const { id: storyId } = req.params;
  const userId = req.auth?.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  try {
    const { isFavorite } = req.body;

    if (typeof isFavorite !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isFavorite must be a boolean' });
    }

    await storyStatsService.toggleFavorite(storyId, userId, isFavorite);

    return res.json({
      success: true,
      data: {
        storyId,
        isFavoritedByUser: isFavorite,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error toggling story favorite');
    return res.status(500).json({ success: false, message: 'Failed to toggle favorite' });
  }
});

/**
 * GET /api/v1/stories/:id/stats
 * Get story statistics (conversation count, message count, favorites)
 */
router.get('/:id/stats', optionalAuth, async (req: Request, res: Response) => {
  const { id: storyId } = req.params;
  const userId = req.auth?.user?.id;

  try {
    const stats = await storyStatsService.getStoryStats(storyId, userId);

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error({ error }, 'Error getting story stats');
    return res.status(500).json({ success: false, message: 'Failed to get story stats' });
  }
});

export default router;
