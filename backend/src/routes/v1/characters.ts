import { Router, Request, Response } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { requireAuth, optionalAuth } from '../../middleware/auth';
import { translationMiddleware } from '../../middleware/translationMiddleware';
import { asyncMulterHandler } from '../../middleware/multerErrorHandler';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';
import * as characterService from '../../services/characterService';
import * as userService from '../../services/userService';
import { r2Service } from '../../services/r2Service';
import { runCharacterAutocomplete, CharacterAutocompleteMode } from '../../agents/characterAutocompleteAgent';
import { addCharacterImage } from '../../services/imageService';
import { characterStatsService } from '../../services/characterStatsService';
import { processImageByType } from '../../services/imageProcessingService';
import type { ImageType } from '../../generated/prisma';
import {
  createCharacterSchema,
  updateCharacterSchema,
} from '../../validators';
import { generateAutomatedCharacter } from '../../controllers/automatedCharacterGenerationController';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB (before compression)
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
 * POST /api/v1/characters/generate-automated
 * Automatically generate a character from text description and/or image
 * Accepts multipart/form-data with:
 * - description: string (optional) - text description of the character
 * - image: file (optional) - character image for analysis
 */
router.post(
  '/generate-automated',
  requireAuth,
  asyncMulterHandler(upload.single('image')),
  generateAutomatedCharacter
);

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

    // Get language from payload (which comes from i18next) or fallback to user preference
    const preferredLang = (payload as any)?.originalLanguageCode || req.auth?.user?.preferredLanguage || 'en';

    logger.info({ userId, preferredLang, mode: selectedMode }, 'Character autocomplete requested');

    // Sanitize payload: only accept known keys
    const allowedKeys = new Set([
      'firstName','lastName','age','gender','species','style','avatar','physicalCharacteristics','personality','history','visibility','originalLanguageCode','ageRating','contentTags','loraId','mainAttireId','tagIds','attireIds'
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
 *
 * Features:
 * - Automatic image compression and WebP conversion
 * - Resizes images to optimal dimensions based on type
 * - Proper error handling with user-friendly messages
 */
router.post('/:id/images', requireAuth, asyncMulterHandler(upload.single('image')), async (req: Request, res: Response) => {
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

    // Process image: compress and convert to WebP
    logger.info({ type, originalSize: file.size, originalType: file.mimetype }, 'Processing image');
    const processed = await processImageByType(file.buffer, type);

    const baseName = (file.originalname ? file.originalname.replace(/[^a-z0-9._-]+/gi, '-').toLowerCase() : 'image').replace(/\.[^.]+$/, '');
    const key = `characters/${id}/images/${type.toLowerCase()}/${Date.now()}-${randomUUID()}-${baseName}.webp`;

    const { publicUrl } = await r2Service.uploadObject({
      key,
      body: processed.buffer,
      contentType: processed.contentType,
      cacheControl: 'public, max-age=604800',
    });

    const created = await addCharacterImage({
      characterId: id,
      type,
      url: publicUrl,
      key,
      width: processed.width,
      height: processed.height,
      sizeBytes: processed.sizeBytes,
      contentType: processed.contentType,
      runClassification: true,
    });

    logger.info(
      {
        characterId: id,
        type,
        originalSize: file.size,
        processedSize: processed.sizeBytes,
        compressionRatio: `${((1 - processed.sizeBytes / file.size) * 100).toFixed(2)}%`,
      },
      'Image uploaded successfully'
    );

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

router.post('/avatar', requireAuth, asyncMulterHandler(upload.single('avatar')), async (req: Request, res: Response) => {
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

    // Process image: compress and convert to WebP
    logger.info({ originalSize: uploadedFile.size, originalType: uploadedFile.mimetype }, 'Processing avatar image');
    const processed = await processImageByType(uploadedFile.buffer, 'AVATAR');

    const sanitizedName = uploadedFile.originalname
      ? uploadedFile.originalname.replace(/[^a-z0-9._-]+/gi, '-').toLowerCase()
      : 'avatar';

    const baseName = sanitizedName.replace(/\.[^.]+$/, '');

    const key = `characters/${targetEntityId}/avatar/${Date.now()}-${randomUUID()}-${baseName}.webp`;

    const { publicUrl } = await r2Service.uploadObject({
      key,
      body: processed.buffer,
      contentType: processed.contentType,
      cacheControl: 'public, max-age=604800',
    });

    if (trimmedCharacterId) {
      // Create or update avatar in CharacterImage table
      await prisma.$transaction(async (tx) => {
        // Deactivate existing avatars
        await tx.characterImage.updateMany({
          where: {
            characterId: trimmedCharacterId,
            type: 'AVATAR',
          },
          data: {
            isActive: false,
          },
        });

        // Create new active avatar
        await tx.characterImage.create({
          data: {
            characterId: trimmedCharacterId,
            type: 'AVATAR',
            url: publicUrl,
            key,
            sizeBytes: processed.sizeBytes,
            contentType: processed.contentType,
            width: processed.width,
            height: processed.height,
            isActive: true,
            ageRating: 'L', // Default to safest rating
            contentTags: [],
          },
        });
      });
    }

    logger.info(
      {
        characterId: trimmedCharacterId,
        originalSize: uploadedFile.size,
        processedSize: processed.sizeBytes,
        compressionRatio: `${((1 - processed.sizeBytes / uploadedFile.size) * 100).toFixed(2)}%`,
      },
      'Avatar uploaded successfully'
    );

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
router.get('/:id', optionalAuth, translationMiddleware(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const character = await characterService.getCharacterById(id);

    if (!character) {
      return res.status(404).json({
        success: false,
        message: 'Character not found',
      });
    }

    // Check visibility access control
    const userId = req.auth?.user?.id;
    const canAccess = await characterService.canAccessCharacter(id, userId);

    if (!canAccess) {
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
 * List characters (public or user's own) with pagination
 */
router.get('/', optionalAuth, translationMiddleware(), async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.user?.id;
    const {
      search,
      tags,
      genders,
      species,
      skip,
      limit,
      userId: filterUserId,
      public: publicOnly,
      ageRatings,
    } = req.query;

    let result;

    // CONTENT FILTERING: Apply automatic filters based on user's age and preferences
    let effectiveAgeRatings: string[] | undefined;
    let effectiveBlockedTags: string[] | undefined;

    if (userId) {
      try {
        const userFilters = await userService.getUserContentFilters(userId);

        // Apply age rating filters based on user's birthdate
        // If user provided ageRatings in query, intersect with allowed ratings
        // Otherwise, use all allowed ratings
        const requestedRatings = Array.isArray(ageRatings)
          ? ageRatings.map(String)
          : typeof ageRatings === 'string'
            ? ageRatings.split(',')
            : undefined;

        if (requestedRatings && requestedRatings.length > 0) {
          // Intersect requested ratings with allowed ratings
          effectiveAgeRatings = requestedRatings.filter(rating =>
            userFilters.allowedAgeRatings.includes(rating as any)
          );
        } else {
          // Use all allowed ratings
          effectiveAgeRatings = userFilters.allowedAgeRatings;
        }

        // Apply blocked tags filter
        effectiveBlockedTags = userFilters.blockedTags;
      } catch (error) {
        logger.error({ error, userId }, 'Error fetching user content filters');
        // If error, fall back to manual ageRatings from query (no automatic filtering)
        effectiveAgeRatings = Array.isArray(ageRatings)
          ? ageRatings.map(String)
          : typeof ageRatings === 'string'
            ? ageRatings.split(',')
            : undefined;
      }
    } else {
      // Not authenticated: use ageRatings from query if provided, otherwise no filter
      effectiveAgeRatings = Array.isArray(ageRatings)
        ? ageRatings.map(String)
        : typeof ageRatings === 'string'
          ? ageRatings.split(',')
          : undefined;
    }

    const commonOptions = {
      search: typeof search === 'string' ? search : undefined,
      tags: Array.isArray(tags)
        ? tags.map(String)
        : typeof tags === 'string'
          ? [tags]
          : undefined,
      gender: Array.isArray(genders)
        ? genders.map(String)
        : typeof genders === 'string'
          ? [genders]
          : undefined,
      species: Array.isArray(species)
        ? species.map(String)
        : typeof species === 'string'
          ? [species]
          : undefined,
      ageRatings: effectiveAgeRatings,
      blockedTags: effectiveBlockedTags,
      skip: typeof skip === 'string' ? parseInt(skip, 10) : undefined,
      limit: typeof limit === 'string' ? parseInt(limit, 10) : undefined,
    };

    // If filtering by specific user ID (e.g., viewing someone's profile)
    if (filterUserId && typeof filterUserId === 'string') {
      const characters = await characterService.getCharactersByUserId(filterUserId, commonOptions);
      result = { characters, total: characters.length, hasMore: false };
    }
    // If explicitly requesting ONLY user's own characters
    else if (userId && publicOnly === 'false') {
      const characters = await characterService.getCharactersByUserId(userId, commonOptions);
      result = { characters, total: characters.length, hasMore: false };
    }
    // If user is authenticated, show public characters + their own (all visibility)
    else if (userId) {
      result = await characterService.getPublicAndOwnCharacters(userId, commonOptions);
    }
    // Not authenticated: show only public characters
    else {
      result = await characterService.getPublicCharacters(commonOptions);
    }

    return res.json({
      success: true,
      data: result.characters,
      total: result.total,
      hasMore: result.hasMore,
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
