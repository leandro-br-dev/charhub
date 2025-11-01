import { Router, Request, Response } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { requireAuth, optionalAuth } from '../../middleware/auth';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';
import * as characterService from '../../services/characterService';
import { r2Service } from '../../services/r2Service';
import { runCharacterAutocomplete, CharacterAutocompleteMode } from '../../agents/characterAutocompleteAgent';
import { addCharacterImage } from '../../services/imageService';
import { characterStatsService } from '../../services/characterStatsService';
import type { ImageType } from '../../generated/prisma';
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

    // Force originalLanguageCode to user's preference if available
    const preferredLang = req.auth?.user?.preferredLanguage || undefined;
    if (preferredLang) {
      (validatedData as any).originalLanguageCode = preferredLang;
    }

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

/**
 * POST /api/v1/characters/autocomplete
 * Given partial character fields, return proposed values for missing ones.
 * Body: { mode: 'ai' | 'web', payload: Partial<CharacterFormValues> }
 */
router.post('/autocomplete', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { mode, payload } = req.body || {};
    const selectedMode: CharacterAutocompleteMode = mode === 'web' ? 'web' : 'ai';
    const preferredLang = req.auth?.user?.preferredLanguage || undefined;

    // Sanitize payload: only accept known keys
    const allowedKeys = new Set([
      'firstName','lastName','age','gender','species','style','avatar','physicalCharacteristics','personality','history','isPublic','originalLanguageCode','ageRating','contentTags','loraId','mainAttireId','tagIds','attireIds'
    ]);
    const safePayload: Record<string, unknown> = {};
    if (payload && typeof payload === 'object') {
      for (const [k, v] of Object.entries(payload)) {
        if (allowedKeys.has(k)) safePayload[k] = v;
      }
    }

    const suggestions = await runCharacterAutocomplete(safePayload as any, selectedMode, preferredLang);
    return res.json({ success: true, data: suggestions });
  } catch (error) {
    logger.error({ error }, 'Error running character autocomplete');
    return res.status(500).json({ success: false, message: 'Failed to autocomplete character' });
  }
});

/**
 * GET /api/v1/characters/:id/images
 * Get all images for a specific character
 * Query params: type (optional) - filter by image type
 */
router.get('/:id/images', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { type } = req.query;

  try {
    const images = await prisma.characterImage.findMany({
      where: {
        characterId: id,
        ...(type ? { type: type as ImageType } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.status(200).json({ success: true, data: images });
  } catch (error) {
    logger.error({ error, characterId: id }, 'get_character_images_failed');
    return res.status(500).json({ success: false, message: 'Failed to fetch character images' });
  }
});

/**
 * POST /api/v1/characters/:id/images
 * Upload an image file for the character (avatar/cover/samples/stickers/etc.)
 * Form-data: image (file), type (string: AVATAR|COVER|SAMPLE|STICKER|OTHER)
 */
router.post('/:id/images', requireAuth, upload.single('image'), async (req: Request, res: Response) => {
  const userId = req.auth?.user?.id;
  const { id } = req.params;
  const file = req.file;
  const typeRaw = (req.body?.type || '').toString().toUpperCase();
  const validTypes = new Set(['AVATAR','COVER','SAMPLE','STICKER','OTHER']);
  const type: ImageType = (validTypes.has(typeRaw) ? typeRaw : 'OTHER') as ImageType;

  if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });
  if (!file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  try {
    const owns = await characterService.isCharacterOwner(id, userId);
    if (!owns) return res.status(403).json({ success: false, message: 'You can only update your own characters' });

    if (!r2Service.isConfigured()) {
      return res.status(503).json({ success: false, message: 'Media storage is not configured', missing: r2Service.getMissingConfig() });
    }

    const ext = ALLOWED_IMAGE_TYPES[file.mimetype];
    if (!ext) return res.status(415).json({ success: false, message: 'Unsupported image format. Use PNG, JPG, WEBP or GIF.' });

    const baseName = (file.originalname ? file.originalname.replace(/[^a-z0-9._-]+/gi, '-').toLowerCase() : 'image').replace(/\.[^.]+$/, '');
    const key = `characters/${userId}/${id}/images/${type.toLowerCase()}/${Date.now()}-${randomUUID()}-${baseName}.${ext}`;

    const { publicUrl } = await r2Service.uploadObject({
      key,
      body: file.buffer,
      contentType: file.mimetype,
      cacheControl: 'public, max-age=604800',
    });

    const created = await addCharacterImage({
      characterId: id,
      type,
      url: publicUrl,
      key,
      sizeBytes: file.size,
      contentType: file.mimetype,
      runClassification: true,
    });

    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    logger.error({ error }, 'character_image_upload_failed');
    return res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
});

/**
 * POST /api/v1/characters/:id/images/url
 * Register an external image URL for the character (will be classified)
 * Body: { url: string, type: ImageType }
 */
router.post('/:id/images/url', requireAuth, async (req: Request, res: Response) => {
  const userId = req.auth?.user?.id;
  const { id } = req.params;
  const { url, type: typeBody } = req.body || {};
  const typeRaw = (typeBody || '').toString().toUpperCase();
  const validTypes = new Set(['AVATAR','COVER','SAMPLE','STICKER','OTHER']);
  const type: ImageType = (validTypes.has(typeRaw) ? typeRaw : 'OTHER') as ImageType;

  if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return res.status(400).json({ success: false, message: 'Invalid url' });

  try {
    const owns = await characterService.isCharacterOwner(id, userId);
    if (!owns) return res.status(403).json({ success: false, message: 'You can only update your own characters' });

    const created = await addCharacterImage({
      characterId: id,
      type,
      url,
      runClassification: true,
    });
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    logger.error({ error }, 'character_image_url_failed');
    return res.status(500).json({ success: false, message: 'Failed to save image url' });
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
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
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
router.get('/', optionalAuth, async (req: Request, res: Response) => {
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
      ageRatings,
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
        ageRatings: Array.isArray(ageRatings)
          ? ageRatings.map(String)
          : typeof ageRatings === 'string'
            ? ageRatings.split(',')
            : undefined,
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
        ageRatings: Array.isArray(ageRatings)
          ? ageRatings.map(String)
          : typeof ageRatings === 'string'
            ? ageRatings.split(',')
            : undefined,
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
        ageRatings: Array.isArray(ageRatings)
          ? ageRatings.map(String)
          : typeof ageRatings === 'string'
            ? ageRatings.split(',')
            : undefined,
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
    const preferredLang = req.auth?.user?.preferredLanguage || undefined;

    const character = await characterService.updateCharacter(id, {
      ...validatedData,
      ...(preferredLang ? { originalLanguageCode: preferredLang } : {}),
    } as any);

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

/**
 * GET /api/v1/characters/:id/stats
 * Get character statistics (conversation count, message count, favorites)
 */
router.get('/:id/stats', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id: characterId } = req.params;
    const userId = req.auth?.user?.id;

    const stats = await characterStatsService.getCharacterStats(characterId, userId);

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error({ error }, 'Error getting character stats');
    return res.status(500).json({
      success: false,
      message: 'Failed to get character stats',
    });
  }
});

export default router;
