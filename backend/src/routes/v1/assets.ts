import { Router, Request, Response } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { requireAuth, optionalAuth } from '../../middleware/auth';
import { asyncMulterHandler } from '../../middleware/multerErrorHandler';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';
import * as assetService from '../../services/assetService';
import * as characterService from '../../services/characterService';
import { r2Service } from '../../services/r2Service';
import { processImageByType } from '../../services/imageProcessingService';
import { sendError, API_ERROR_CODES } from '../../utils/apiErrors';

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
 * POST /api/v1/assets
 * Create a new asset
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.user?.id;
    if (!userId) {
      return sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
    }

    const {
      name,
      description,
      type,
      category,
      promptPrimary,
      promptContext,
      negativePrompt,
      placementZone,
      placementDetail,
      previewImageUrl,
      style,
      ageRating,
      contentTags,
      visibility,
      tagIds,
    } = req.body;

    // Validate required fields
    if (!name || !description || !type || !category) {
      return sendError(res, 400, API_ERROR_CODES.MISSING_REQUIRED_FIELD, {
        message: 'name, description, type, and category are required',
      });
    }

    const asset = await assetService.createAsset({
      name,
      description,
      type,
      category,
      promptPrimary,
      promptContext,
      negativePrompt,
      placementZone,
      placementDetail,
      previewImageUrl,
      style,
      ageRating,
      contentTags,
      visibility,
      authorId: userId,
      originalLanguageCode: req.auth?.user?.preferredLanguage || null,
      tagIds,
    });

    return res.status(201).json({
      success: true,
      data: asset,
    });
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      return sendError(res, 400, API_ERROR_CODES.VALIDATION_FAILED);
    }

    logger.error({ error }, 'Error creating asset');
    return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to create asset',
    });
  }
});

/**
 * GET /api/v1/assets
 * List assets with filters
 * Query params: type, category, search, authorId, visibility, style, skip, limit
 */
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.user?.id;
    const {
      type,
      category,
      search,
      authorId,
      visibility,
      style,
      skip,
      limit,
      public: publicOnly,
    } = req.query;

    let assets;

    // If filtering by specific author
    if (authorId && typeof authorId === 'string') {
      assets = await assetService.listAssets({
        authorId,
        type: typeof type === 'string' ? type as any : undefined,
        category: typeof category === 'string' ? category as any : undefined,
        search: typeof search === 'string' ? search : undefined,
        visibility: typeof visibility === 'string' ? visibility as any : undefined,
        style: typeof style === 'string' ? style : undefined,
        skip: typeof skip === 'string' ? parseInt(skip, 10) : undefined,
        limit: typeof limit === 'string' ? parseInt(limit, 10) : undefined,
      });
    }
    // If user is authenticated and not requesting public only
    else if (userId && publicOnly !== 'true') {
      assets = await assetService.listAssets({
        authorId: userId,
        type: typeof type === 'string' ? type as any : undefined,
        category: typeof category === 'string' ? category as any : undefined,
        search: typeof search === 'string' ? search : undefined,
        visibility: typeof visibility === 'string' ? visibility as any : undefined,
        style: typeof style === 'string' ? style : undefined,
        skip: typeof skip === 'string' ? parseInt(skip, 10) : undefined,
        limit: typeof limit === 'string' ? parseInt(limit, 10) : undefined,
      });
    }
    // Otherwise get public assets
    else {
      assets = await assetService.getPublicAssets({
        type: typeof type === 'string' ? type as any : undefined,
        category: typeof category === 'string' ? category as any : undefined,
        search: typeof search === 'string' ? search : undefined,
        skip: typeof skip === 'string' ? parseInt(skip, 10) : undefined,
        limit: typeof limit === 'string' ? parseInt(limit, 10) : undefined,
      });
    }

    return res.json({
      success: true,
      data: assets,
      count: assets.length,
    });
  } catch (error) {
    logger.error({ error }, 'Error listing assets');
    return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to list assets',
    });
  }
});

/**
 * GET /api/v1/assets/:id
 * Get asset by ID
 */
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const asset = await assetService.getAssetById(id);

    if (!asset) {
      return sendError(res, 404, API_ERROR_CODES.NOT_FOUND, {
        message: 'Asset not found',
      });
    }

    // Check if asset is public or user owns it
    const userId = req.auth?.user?.id;
    if (asset.visibility !== 'PUBLIC' && asset.authorId !== userId) {
      return sendError(res, 403, API_ERROR_CODES.FORBIDDEN, {
        message: 'Access denied',
      });
    }

    return res.json({
      success: true,
      data: asset,
    });
  } catch (error) {
    logger.error({ error }, 'Error getting asset');
    return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to get asset',
    });
  }
});

/**
 * PUT /api/v1/assets/:id
 * Update asset
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      return sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
    }

    // Check ownership
    const isOwner = await assetService.isAssetOwner(id, userId);
    if (!isOwner) {
      return sendError(res, 403, API_ERROR_CODES.FORBIDDEN, {
        message: 'You can only update your own assets',
      });
    }

    const {
      name,
      description,
      type,
      category,
      promptPrimary,
      promptContext,
      negativePrompt,
      placementZone,
      placementDetail,
      previewImageUrl,
      style,
      ageRating,
      contentTags,
      visibility,
      tagIds,
    } = req.body;

    const asset = await assetService.updateAsset(id, {
      name,
      description,
      type,
      category,
      promptPrimary,
      promptContext,
      negativePrompt,
      placementZone,
      placementDetail,
      previewImageUrl,
      style,
      ageRating,
      contentTags,
      visibility,
      tagIds,
    });

    return res.json({
      success: true,
      data: asset,
    });
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      return sendError(res, 400, API_ERROR_CODES.VALIDATION_FAILED);
    }

    logger.error({ error }, 'Error updating asset');
    return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to update asset',
    });
  }
});

/**
 * DELETE /api/v1/assets/:id
 * Delete asset
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      return sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
    }

    // Check ownership
    const isOwner = await assetService.isAssetOwner(id, userId);
    if (!isOwner) {
      return sendError(res, 403, API_ERROR_CODES.FORBIDDEN, {
        message: 'You can only delete your own assets',
      });
    }

    await assetService.deleteAsset(id);

    return res.json({
      success: true,
      message: 'Asset deleted successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Error deleting asset');
    return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to delete asset',
    });
  }
});

/**
 * POST /api/v1/assets/:id/images
 * Upload/generate asset image
 */
router.post(
  '/:id/images',
  requireAuth,
  asyncMulterHandler(upload.single('image')),
  async (req: Request, res: Response) => {
    const userId = req.auth?.user?.id;
    const { id } = req.params;
    const file = req.file;
    const { imageType } = req.body || {};

    const validImageTypes = new Set(['preview', 'reference', 'transparent', 'in_context']);
    const normalizedImageType = validImageTypes.has(imageType) ? imageType : 'preview';

    if (!userId) return sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
    if (!file) return sendError(res, 400, API_ERROR_CODES.INVALID_INPUT, {
      message: 'No file uploaded',
      field: 'image',
    });

    try {
      // Check asset ownership
      const isOwner = await assetService.isAssetOwner(id, userId);
      if (!isOwner) {
        return sendError(res, 403, API_ERROR_CODES.FORBIDDEN, {
          message: 'You can only upload images to your own assets',
        });
      }

      if (!r2Service.isConfigured()) {
        return sendError(res, 503, API_ERROR_CODES.R2_STORAGE_ERROR, {
          message: 'Media storage is not configured',
          details: { missing: r2Service.getMissingConfig() },
        });
      }

      const ext = ALLOWED_IMAGE_TYPES[file.mimetype];
      if (!ext) return sendError(res, 415, API_ERROR_CODES.INVALID_INPUT, {
        message: 'Unsupported image format. Use PNG, JPG, WEBP or GIF.',
      });

      // Process image: compress and convert to WebP
      logger.info({ imageType: normalizedImageType, originalSize: file.size, originalType: file.mimetype }, 'Processing asset image');
      const processed = await processImageByType(file.buffer, 'SAMPLE');

      const baseName = (file.originalname ? file.originalname.replace(/[^a-z0-9._-]+/gi, '-').toLowerCase() : 'image').replace(/\.[^.]+$/, '');
      const key = `assets/${id}/images/${normalizedImageType}/${Date.now()}-${randomUUID()}-${baseName}.webp`;

      const { publicUrl } = await r2Service.uploadObject({
        key,
        body: processed.buffer,
        contentType: processed.contentType,
        cacheControl: 'public, max-age=604800',
      });

      // Create asset image record
      const assetImage = await prisma.assetImage.create({
        data: {
          assetId: id,
          imageUrl: publicUrl,
          imageType: normalizedImageType,
          width: processed.width,
          height: processed.height,
        },
      });

      // Update asset previewImageUrl if this is a preview image
      if (normalizedImageType === 'preview') {
        await prisma.asset.update({
          where: { id },
          data: { previewImageUrl: publicUrl },
        });
      }

      logger.info(
        {
          assetId: id,
          imageType: normalizedImageType,
          originalSize: file.size,
          processedSize: processed.sizeBytes,
          compressionRatio: `${((1 - processed.sizeBytes / file.size) * 100).toFixed(2)}%`,
        },
        'Asset image uploaded successfully'
      );

      return res.status(201).json({ success: true, data: assetImage });
    } catch (error) {
      logger.error({ error }, 'Asset image upload failed');
      return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
        message: 'Failed to upload image',
      });
    }
  }
);

/**
 * POST /api/v1/characters/:id/assets
 * Link asset to character
 */
router.post('/characters/:id/assets', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id: characterId } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      return sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
    }

    // Check character ownership
    const ownsCharacter = await characterService.isCharacterOwner(characterId, userId);
    if (!ownsCharacter) {
      return sendError(res, 403, API_ERROR_CODES.FORBIDDEN, {
        message: 'You can only add assets to your own characters',
      });
    }

    const { assetId, placementZone, placementDetail, contextNote, isVisible, isPrimary, displayOrder } = req.body;

    if (!assetId) {
      return sendError(res, 400, API_ERROR_CODES.MISSING_REQUIRED_FIELD, {
        message: 'assetId is required',
        field: 'assetId',
      });
    }

    const characterAsset = await assetService.linkAssetToCharacter(characterId, assetId, {
      placementZone,
      placementDetail,
      contextNote,
      isVisible,
      isPrimary,
      displayOrder,
    });

    return res.status(201).json({
      success: true,
      data: characterAsset,
    });
  } catch (error) {
    logger.error({ error }, 'Error linking asset to character');
    return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to link asset to character',
    });
  }
});

/**
 * PUT /api/v1/characters/:id/assets/:assetId
 * Update character asset link
 */
router.put('/characters/:id/assets/:assetId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id: characterId, assetId } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      return sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
    }

    // Check character ownership
    const ownsCharacter = await characterService.isCharacterOwner(characterId, userId);
    if (!ownsCharacter) {
      return sendError(res, 403, API_ERROR_CODES.FORBIDDEN, {
        message: 'You can only update assets on your own characters',
      });
    }

    const { placementZone, placementDetail, contextNote, isVisible, isPrimary, displayOrder } = req.body;

    const characterAsset = await assetService.updateCharacterAsset(characterId, assetId, {
      placementZone,
      placementDetail,
      contextNote,
      isVisible,
      isPrimary,
      displayOrder,
    });

    return res.json({
      success: true,
      data: characterAsset,
    });
  } catch (error) {
    logger.error({ error }, 'Error updating character asset');
    return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to update character asset',
    });
  }
});

/**
 * DELETE /api/v1/characters/:id/assets/:assetId
 * Unlink asset from character
 */
router.delete('/characters/:id/assets/:assetId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id: characterId, assetId } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      return sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
    }

    // Check character ownership
    const ownsCharacter = await characterService.isCharacterOwner(characterId, userId);
    if (!ownsCharacter) {
      return sendError(res, 403, API_ERROR_CODES.FORBIDDEN, {
        message: 'You can only remove assets from your own characters',
      });
    }

    await assetService.unlinkAssetFromCharacter(characterId, assetId);

    return res.json({
      success: true,
      message: 'Asset unlinked from character successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Error unlinking asset from character');
    return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to unlink asset from character',
    });
  }
});

/**
 * GET /api/v1/characters/:id/assets
 * Get character assets
 */
router.get('/characters/:id/assets', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id: characterId } = req.params;
    const userId = req.auth?.user?.id;

    // Check character access
    const character = await characterService.getCharacterById(characterId);
    if (!character) {
      return sendError(res, 404, API_ERROR_CODES.CHARACTER_NOT_FOUND);
    }

    const canAccess = await characterService.canAccessCharacter(characterId, userId);
    if (!canAccess) {
      return sendError(res, 403, API_ERROR_CODES.FORBIDDEN, {
        message: 'Access denied',
      });
    }

    const characterAssets = await assetService.getCharacterAssets(characterId);

    return res.json({
      success: true,
      data: characterAssets,
      count: characterAssets.length,
    });
  } catch (error) {
    logger.error({ error }, 'Error getting character assets');
    return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to get character assets',
    });
  }
});

export default router;
