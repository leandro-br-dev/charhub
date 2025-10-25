import { Router, Request, Response } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { requireAuth } from '../../middleware/auth';
import { logger } from '../../config/logger';
import * as characterService from '../../services/characterService';
import { r2Service } from '../../services/r2Service';
import {
  createCharacterSchema,
  updateCharacterSchema,
} from '../../validators';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/**
 * POST /api/v1/characters
 * Create a new character
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Validate input
    const validatedData = createCharacterSchema.parse({
      ...req.body,
      userId,
    });

    const character = await characterService.createCharacter(validatedData);

    return res.status(201).json({
      success: true,
      data: character,
    });
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error,
      });
    }

    logger.error({ error }, 'Error creating character');
    return res.status(500).json({
      success: false,
      message: 'Failed to create character',
    });
  }
});

router.post('/avatar', requireAuth, upload.single('avatar'), async (req: Request, res: Response) => {
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

  const { characterId, draftId } = req.body ?? {};
  const trimmedCharacterId = typeof characterId === 'string' && characterId.trim().length > 0 ? characterId.trim() : undefined;
  const trimmedDraftId = typeof draftId === 'string' && draftId.trim().length > 0 ? draftId.trim() : undefined;
  const targetEntityId = trimmedCharacterId ?? trimmedDraftId;

  if (!targetEntityId) {
    return res.status(400).json({ success: false, message: 'Provide either characterId or draftId to scope the upload.' });
  }

  try {
    if (trimmedCharacterId) {
      const ownsCharacter = await characterService.isCharacterOwner(trimmedCharacterId, userId);
      if (!ownsCharacter) {
        return res.status(403).json({ success: false, message: 'You can only update avatars for your characters.' });
      }
    }

    const extension = ALLOWED_IMAGE_TYPES[uploadedFile.mimetype];
    if (!extension) {
      return res.status(415).json({ success: false, message: 'Unsupported image format. Use PNG, JPG, WEBP or GIF.' });
    }

    const sanitizedName = uploadedFile.originalname
      ? uploadedFile.originalname.replace(/[^a-z0-9._-]+/gi, '-').toLowerCase()
      : 'avatar';

    const baseName = sanitizedName.replace(/\.[^.]+$/, '');

    const key = `characters/${userId}/${targetEntityId}/avatar/${Date.now()}-${randomUUID()}-${baseName}.${extension}`;

    const { publicUrl } = await r2Service.uploadObject({
      key,
      body: uploadedFile.buffer,
      contentType: uploadedFile.mimetype,
      cacheControl: 'public, max-age=604800',
    });

    if (trimmedCharacterId) {
      await characterService.updateCharacter(trimmedCharacterId, { avatar: publicUrl });
    }

    return res.json({
      success: true,
      data: {
        url: publicUrl,
        key,
        characterId: trimmedCharacterId ?? null,
      },
    });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error && typeof (error as { statusCode?: number }).statusCode === 'number') {
      const statusCode = (error as { statusCode: number }).statusCode;
      return res.status(statusCode).json({ success: false, message: error.message });
    }

    logger.error({ error }, 'Error uploading character avatar');
    return res.status(500).json({ success: false, message: 'Failed to upload character avatar' });
  }
});

/**
 * GET /api/v1/characters/favorites
 * Get user's favorite characters
 * NOTE: Must be before /:id route to avoid route conflict
 */
router.get('/favorites', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { skip, limit } = req.query;

    const characters = await characterService.getFavoriteCharacters(userId, {
      skip: typeof skip === 'string' ? parseInt(skip, 10) : undefined,
      limit: typeof limit === 'string' ? parseInt(limit, 10) : undefined,
    });

    return res.json({
      success: true,
      data: characters,
      count: characters.length,
    });
  } catch (error) {
    logger.error({ error }, 'Error getting favorite characters');
    return res.status(500).json({
      success: false,
      message: 'Failed to get favorite characters',
    });
  }
});

/**
 * GET /api/v1/characters/:id
 * Get character by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const character = await characterService.getCharacterById(id);

    if (!character) {
      return res.status(404).json({
        success: false,
        message: 'Character not found',
      });
    }

    // Check if character is public or user owns it
    const userId = req.auth?.user?.id;
    if (!character.isPublic && character.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    return res.json({
      success: true,
      data: character,
    });
  } catch (error) {
    logger.error({ error }, 'Error getting character');
    return res.status(500).json({
      success: false,
      message: 'Failed to get character',
    });
  }
});

/**
 * GET /api/v1/characters
 * List characters (public or user's own)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.user?.id;
    const {
      search,
      tags,
      gender,
      skip,
      limit,
      userId: filterUserId,
      public: isPublic,
    } = req.query;

    let characters;

    // If filtering by specific user
    if (filterUserId && typeof filterUserId === 'string') {
      characters = await characterService.getCharactersByUserId(filterUserId, {
        search: typeof search === 'string' ? search : undefined,
        tags: Array.isArray(tags)
          ? tags.map(String)
          : typeof tags === 'string'
            ? [tags]
            : undefined,
        gender: typeof gender === 'string' ? gender : undefined,
        skip: typeof skip === 'string' ? parseInt(skip, 10) : undefined,
        limit: typeof limit === 'string' ? parseInt(limit, 10) : undefined,
      });
    }
    // If user is authenticated and no specific filter
    else if (userId && isPublic !== 'true') {
      characters = await characterService.getCharactersByUserId(userId, {
        search: typeof search === 'string' ? search : undefined,
        tags: Array.isArray(tags)
          ? tags.map(String)
          : typeof tags === 'string'
            ? [tags]
            : undefined,
        gender: typeof gender === 'string' ? gender : undefined,
        skip: typeof skip === 'string' ? parseInt(skip, 10) : undefined,
        limit: typeof limit === 'string' ? parseInt(limit, 10) : undefined,
      });
    }
    // Otherwise get public characters
    else {
      characters = await characterService.getPublicCharacters({
        search: typeof search === 'string' ? search : undefined,
        tags: Array.isArray(tags)
          ? tags.map(String)
          : typeof tags === 'string'
            ? [tags]
            : undefined,
        gender: typeof gender === 'string' ? gender : undefined,
        skip: typeof skip === 'string' ? parseInt(skip, 10) : undefined,
        limit: typeof limit === 'string' ? parseInt(limit, 10) : undefined,
      });
    }

    return res.json({
      success: true,
      data: characters,
      count: characters.length,
    });
  } catch (error) {
    logger.error({ error }, 'Error listing characters');
    return res.status(500).json({
      success: false,
      message: 'Failed to list characters',
    });
  }
});

/**
 * PUT /api/v1/characters/:id
 * Update character
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Check ownership
    const isOwner = await characterService.isCharacterOwner(id, userId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own characters',
      });
    }

    // Validate input
    const validatedData = updateCharacterSchema.parse(req.body);

    const character = await characterService.updateCharacter(id, validatedData);

    return res.json({
      success: true,
      data: character,
    });
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error,
      });
    }

    logger.error({ error }, 'Error updating character');
    return res.status(500).json({
      success: false,
      message: 'Failed to update character',
    });
  }
});

/**
 * DELETE /api/v1/characters/:id
 * Delete character
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Check ownership
    const isOwner = await characterService.isCharacterOwner(id, userId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own characters',
      });
    }

    await characterService.deleteCharacter(id);

    return res.json({
      success: true,
      message: 'Character deleted successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Error deleting character');
    return res.status(500).json({
      success: false,
      message: 'Failed to delete character',
    });
  }
});

/**
 * POST /api/v1/characters/:id/favorite
 * Toggle favorite status for a character
 */
router.post('/:id/favorite', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id: characterId } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { isFavorite } = req.body;

    if (typeof isFavorite !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isFavorite must be a boolean',
      });
    }

    const result = await characterService.toggleFavoriteCharacter(userId, characterId, isFavorite);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error({ error }, 'Error toggling favorite');
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle favorite',
    });
  }
});

export default router;
