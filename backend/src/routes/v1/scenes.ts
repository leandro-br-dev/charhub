import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { requireAuth, optionalAuth } from '../../middleware/auth';
import { asyncMulterHandler } from '../../middleware/multerErrorHandler';
import { logger } from '../../config/logger';
import * as sceneService from '../../services/sceneService';
import { sendError, API_ERROR_CODES } from '../../utils/apiErrors';
import { runSceneAutocomplete, SceneAutocompleteMode } from '../../agents/sceneAutocompleteAgent';
import { r2Service } from '../../services/r2Service';
import { processImageByType } from '../../services/imageProcessingService';
import { prisma } from '../../config/database';
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const router = Router();

// ============================================================================
// SCENE CRUD ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/scenes
 * Create a new scene
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
      shortDescription,
      genre,
      era,
      mood,
      style,
      imagePrompt,
      mapPrompt,
      coverImageUrl,
      mapImageUrl,
      ageRating,
      contentTags,
      visibility,
      tagIds,
      initialAreas,
    } = req.body;

    // Validate required fields
    if (!name || !description) {
      return sendError(res, 400, API_ERROR_CODES.MISSING_REQUIRED_FIELD, {
        message: 'name and description are required',
      });
    }

    const scene = await sceneService.createScene({
      name,
      description,
      shortDescription,
      genre,
      era,
      mood,
      style,
      imagePrompt,
      mapPrompt,
      coverImageUrl,
      mapImageUrl,
      ageRating,
      contentTags,
      visibility,
      authorId: userId,
      originalLanguageCode: req.auth?.user?.preferredLanguage || null,
      tagIds,
      initialAreas,
    });

    return res.status(201).json({
      success: true,
      data: scene,
    });
  } catch (error) {
    logger.error({ error }, 'Error creating scene');
    return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to create scene',
    });
  }
});

/**
 * POST /api/v1/scenes/autocomplete
 * Given partial scene fields, return proposed values for missing ones.
 * Body: { mode: 'ai' | 'web', payload: Partial<SceneFormValues> }
 */
router.post('/autocomplete', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.user?.id;
    if (!userId) {
      return sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
    }

    const { mode, payload } = req.body || {};
    const selectedMode: SceneAutocompleteMode = mode === 'web' ? 'web' : 'ai';

    // Get language from payload or fallback to user preference
    const preferredLang = (payload as any)?.originalLanguageCode || req.auth?.user?.preferredLanguage || 'en';

    logger.info({ userId, preferredLang, mode: selectedMode }, 'Scene autocomplete requested');

    // Sanitize payload: only accept known keys
    const allowedKeys = new Set([
      'name','description','shortDescription','genre','era','mood','style','imagePrompt','mapPrompt','visibility','originalLanguageCode','ageRating','contentTags'
    ]);
    const safePayload: Record<string, unknown> = {};
    if (payload && typeof payload === 'object') {
      for (const [k, v] of Object.entries(payload)) {
        if (allowedKeys.has(k)) safePayload[k] = v;
      }
    }

    const suggestions = await runSceneAutocomplete(safePayload as any, selectedMode, preferredLang);
    return res.json({ success: true, data: suggestions });
  } catch (error) {
    logger.error({ error }, 'Error running scene autocomplete');
    return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to autocomplete scene',
    });
  }
});

/**
 * GET /api/v1/scenes
 * List scenes with filters
 * Query params: genre, mood, era, search, visibility, style, authorId, skip, limit
 */
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.user?.id;
    const {
      genre,
      mood,
      era,
      search,
      visibility,
      style,
      authorId,
      skip,
      limit,
      public: publicOnly,
    } = req.query;

    let scenes;

    // If filtering by specific author
    if (authorId && typeof authorId === 'string') {
      scenes = await sceneService.listScenes({
        authorId,
        genre: typeof genre === 'string' ? genre : undefined,
        mood: typeof mood === 'string' ? mood : undefined,
        era: typeof era === 'string' ? era : undefined,
        search: typeof search === 'string' ? search : undefined,
        visibility: typeof visibility === 'string' ? visibility as any : undefined,
        style: typeof style === 'string' ? style : undefined,
        skip: typeof skip === 'string' ? parseInt(skip, 10) : undefined,
        limit: typeof limit === 'string' ? parseInt(limit, 10) : undefined,
      });
    }
    // If user is authenticated and not requesting public only
    else if (userId && publicOnly !== 'true') {
      scenes = await sceneService.listScenes({
        authorId: userId,
        genre: typeof genre === 'string' ? genre : undefined,
        mood: typeof mood === 'string' ? mood : undefined,
        era: typeof era === 'string' ? era : undefined,
        search: typeof search === 'string' ? search : undefined,
        visibility: typeof visibility === 'string' ? visibility as any : undefined,
        style: typeof style === 'string' ? style : undefined,
        skip: typeof skip === 'string' ? parseInt(skip, 10) : undefined,
        limit: typeof limit === 'string' ? parseInt(limit, 10) : undefined,
      });
    }
    // Otherwise get public scenes
    else {
      scenes = await sceneService.getPublicScenes({
        genre: typeof genre === 'string' ? genre : undefined,
        mood: typeof mood === 'string' ? mood : undefined,
        search: typeof search === 'string' ? search : undefined,
        skip: typeof skip === 'string' ? parseInt(skip, 10) : undefined,
        limit: typeof limit === 'string' ? parseInt(limit, 10) : undefined,
      });
    }

    return res.json({
      success: true,
      data: scenes,
      count: scenes.length,
    });
  } catch (error) {
    logger.error({ error }, 'Error listing scenes');
    return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to list scenes',
    });
  }
});

/**
 * GET /api/v1/scenes/:id
 * Get scene by ID with areas
 */
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const scene = await sceneService.getSceneById(id);

    if (!scene) {
      return sendError(res, 404, API_ERROR_CODES.NOT_FOUND, {
        message: 'Scene not found',
      });
    }

    // Check if scene is public or user owns it
    const userId = req.auth?.user?.id;
    if (scene.visibility !== 'PUBLIC' && scene.authorId !== userId) {
      return sendError(res, 403, API_ERROR_CODES.FORBIDDEN, {
        message: 'Access denied',
      });
    }

    return res.json({
      success: true,
      data: scene,
    });
  } catch (error) {
    logger.error({ error }, 'Error getting scene');
    return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to get scene',
    });
  }
});

/**
 * PUT /api/v1/scenes/:id
 * Update scene
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      return sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
    }

    // Check ownership
    const isOwner = await sceneService.isSceneOwner(id, userId);
    if (!isOwner) {
      return sendError(res, 403, API_ERROR_CODES.FORBIDDEN, {
        message: 'You can only update your own scenes',
      });
    }

    const {
      name,
      description,
      shortDescription,
      genre,
      era,
      mood,
      style,
      imagePrompt,
      mapPrompt,
      coverImageUrl,
      mapImageUrl,
      ageRating,
      contentTags,
      visibility,
      tagIds,
    } = req.body;

    const scene = await sceneService.updateScene(id, {
      name,
      description,
      shortDescription,
      genre,
      era,
      mood,
      style,
      imagePrompt,
      mapPrompt,
      coverImageUrl,
      mapImageUrl,
      ageRating,
      contentTags,
      visibility,
      tagIds,
    });

    return res.json({
      success: true,
      data: scene,
    });
  } catch (error) {
    logger.error({ error }, 'Error updating scene');
    return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to update scene',
    });
  }
});

/**
 * DELETE /api/v1/scenes/:id
 * Delete scene
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      return sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
    }

    // Check ownership
    const isOwner = await sceneService.isSceneOwner(id, userId);
    if (!isOwner) {
      return sendError(res, 403, API_ERROR_CODES.FORBIDDEN, {
        message: 'You can only delete your own scenes',
      });
    }

    await sceneService.deleteScene(id);

    return res.json({
      success: true,
      message: 'Scene deleted successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Error deleting scene');
    return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to delete scene',
    });
  }
});

/**
 * GET /api/v1/scenes/:id/map
 * Get full scene map data
 */
router.get('/:id/map', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const scene = await sceneService.getSceneById(id);

    if (!scene) {
      return sendError(res, 404, API_ERROR_CODES.NOT_FOUND, {
        message: 'Scene not found',
      });
    }

    // Check if scene is public or user owns it
    const userId = req.auth?.user?.id;
    if (scene.visibility !== 'PUBLIC' && scene.authorId !== userId) {
      return sendError(res, 403, API_ERROR_CODES.FORBIDDEN, {
        message: 'Access denied',
      });
    }

    // Build comprehensive map data with all areas, assets, and connections
    return res.json({
      success: true,
      data: {
        scene: {
          id: scene.id,
          name: scene.name,
          description: scene.description,
          shortDescription: scene.shortDescription,
          genre: scene.genre,
          era: scene.era,
          mood: scene.mood,
          style: scene.style,
          mapImageUrl: scene.mapImageUrl,
        },
        areas: scene.areas.map(area => ({
          id: area.id,
          name: area.name,
          description: area.description,
          shortDescription: area.shortDescription,
          displayOrder: area.displayOrder,
          isAccessible: area.isAccessible,
          environmentImageUrl: area.environmentImageUrl,
          mapImageUrl: area.mapImageUrl,
          assets: area.assets.map(aa => ({
            id: aa.asset.id,
            name: aa.asset.name,
            description: aa.asset.description,
            type: aa.asset.type,
            category: aa.asset.category,
            previewImageUrl: aa.asset.previewImageUrl,
            position: aa.position,
            isHidden: aa.isHidden,
            isInteractable: aa.isInteractable,
            discoveryHint: aa.discoveryHint,
            displayOrder: aa.displayOrder,
          })),
          connections: area.connections.map(conn => ({
            toAreaId: conn.toArea.id,
            toAreaName: conn.toArea.name,
            toAreaShortDescription: conn.toArea.shortDescription,
            direction: conn.direction,
            description: conn.description,
            isLocked: conn.isLocked,
            lockHint: conn.lockHint,
          })),
        })),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error getting scene map');
    return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to get scene map',
    });
  }
});

// ============================================================================
// AREA MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/scenes/:id/areas
 * Add area to scene
 */
router.post('/:id/areas', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id: sceneId } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      return sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
    }

    // Check scene ownership
    const isOwner = await sceneService.isSceneOwner(sceneId, userId);
    if (!isOwner) {
      return sendError(res, 403, API_ERROR_CODES.FORBIDDEN, {
        message: 'You can only add areas to your own scenes',
      });
    }

    const {
      name,
      description,
      shortDescription,
      imagePrompt,
      mapPrompt,
      environmentImageUrl,
      mapImageUrl,
      displayOrder,
      isAccessible,
      metadata,
    } = req.body;

    if (!name || !description) {
      return sendError(res, 400, API_ERROR_CODES.MISSING_REQUIRED_FIELD, {
        message: 'name and description are required',
      });
    }

    const area = await sceneService.addArea(sceneId, {
      name,
      description,
      shortDescription,
      imagePrompt,
      mapPrompt,
      environmentImageUrl,
      mapImageUrl,
      displayOrder,
      isAccessible,
      originalLanguageCode: req.auth?.user?.preferredLanguage || null,
      metadata,
    });

    return res.status(201).json({
      success: true,
      data: area,
    });
  } catch (error) {
    logger.error({ error }, 'Error adding area to scene');
    return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to add area to scene',
    });
  }
});

/**
 * GET /api/v1/scenes/areas/:areaId
 * Get area details
 */
router.get('/areas/:areaId', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { areaId } = req.params;
    const area = await sceneService.getAreaDetail(areaId);

    if (!area) {
      return sendError(res, 404, API_ERROR_CODES.NOT_FOUND, {
        message: 'Area not found',
      });
    }

    // Check scene access
    const userId = req.auth?.user?.id;
    const isOwner = userId ? await sceneService.isSceneOwner(area.sceneId, userId) : false;

    if (area.scene.visibility !== 'PUBLIC' && !isOwner) {
      return sendError(res, 403, API_ERROR_CODES.FORBIDDEN, {
        message: 'Access denied',
      });
    }

    return res.json({
      success: true,
      data: area,
    });
  } catch (error) {
    logger.error({ error }, 'Error getting area');
    return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to get area',
    });
  }
});

/**
 * PUT /api/v1/scenes/areas/:areaId
 * Update area
 */
router.put('/areas/:areaId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { areaId } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      return sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
    }

    // Get area to find sceneId
    const area = await sceneService.getAreaDetail(areaId);
    if (!area) {
      return sendError(res, 404, API_ERROR_CODES.NOT_FOUND, {
        message: 'Area not found',
      });
    }

    // Check scene ownership
    const isOwner = await sceneService.isSceneOwner(area.sceneId, userId);
    if (!isOwner) {
      return sendError(res, 403, API_ERROR_CODES.FORBIDDEN, {
        message: 'You can only update areas in your own scenes',
      });
    }

    const {
      name,
      description,
      shortDescription,
      imagePrompt,
      mapPrompt,
      environmentImageUrl,
      mapImageUrl,
      displayOrder,
      isAccessible,
      metadata,
    } = req.body;

    const updatedArea = await sceneService.updateArea(areaId, {
      name,
      description,
      shortDescription,
      imagePrompt,
      mapPrompt,
      environmentImageUrl,
      mapImageUrl,
      displayOrder,
      isAccessible,
      metadata,
    });

    return res.json({
      success: true,
      data: updatedArea,
    });
  } catch (error) {
    logger.error({ error }, 'Error updating area');
    return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to update area',
    });
  }
});

/**
 * DELETE /api/v1/scenes/areas/:areaId
 * Remove area
 */
router.delete('/areas/:areaId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { areaId } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      return sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
    }

    // Get area to find sceneId
    const area = await sceneService.getAreaDetail(areaId);
    if (!area) {
      return sendError(res, 404, API_ERROR_CODES.NOT_FOUND, {
        message: 'Area not found',
      });
    }

    // Check scene ownership
    const isOwner = await sceneService.isSceneOwner(area.sceneId, userId);
    if (!isOwner) {
      return sendError(res, 403, API_ERROR_CODES.FORBIDDEN, {
        message: 'You can only remove areas from your own scenes',
      });
    }

    await sceneService.removeArea(areaId);

    return res.json({
      success: true,
      message: 'Area removed successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Error removing area');
    return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to remove area',
    });
  }
});

// ============================================================================
// ASSET-AREA LINKING ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/scenes/areas/:areaId/assets
 * Place asset in area
 */
router.post('/areas/:areaId/assets', requireAuth, async (req: Request, res: Response) => {
  try {
    const { areaId } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      return sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
    }

    // Get area to find sceneId
    const area = await sceneService.getAreaDetail(areaId);
    if (!area) {
      return sendError(res, 404, API_ERROR_CODES.NOT_FOUND, {
        message: 'Area not found',
      });
    }

    // Check scene ownership
    const isOwner = await sceneService.isSceneOwner(area.sceneId, userId);
    if (!isOwner) {
      return sendError(res, 403, API_ERROR_CODES.FORBIDDEN, {
        message: 'You can only add assets to areas in your own scenes',
      });
    }

    const { assetId, position, isHidden, isInteractable, discoveryHint, metadata, displayOrder } = req.body;

    if (!assetId) {
      return sendError(res, 400, API_ERROR_CODES.MISSING_REQUIRED_FIELD, {
        message: 'assetId is required',
        field: 'assetId',
      });
    }

    const areaAsset = await sceneService.linkAssetToArea(areaId, assetId, {
      position,
      isHidden,
      isInteractable,
      discoveryHint,
      metadata,
      displayOrder,
    });

    return res.status(201).json({
      success: true,
      data: areaAsset,
    });
  } catch (error) {
    logger.error({ error }, 'Error linking asset to area');
    return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to link asset to area',
    });
  }
});

/**
 * GET /api/v1/scenes/areas/:areaId/assets
 * Get area assets
 */
router.get('/areas/:areaId/assets', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { areaId } = req.params;
    const area = await sceneService.getAreaDetail(areaId);

    if (!area) {
      return sendError(res, 404, API_ERROR_CODES.NOT_FOUND, {
        message: 'Area not found',
      });
    }

    // Check scene access
    const userId = req.auth?.user?.id;
    const isOwner = userId ? await sceneService.isSceneOwner(area.sceneId, userId) : false;

    if (area.scene.visibility !== 'PUBLIC' && !isOwner) {
      return sendError(res, 403, API_ERROR_CODES.FORBIDDEN, {
        message: 'Access denied',
      });
    }

    const assets = await sceneService.getAreaAssets(areaId);

    return res.json({
      success: true,
      data: assets,
      count: assets.length,
    });
  } catch (error) {
    logger.error({ error }, 'Error getting area assets');
    return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to get area assets',
    });
  }
});

/**
 * PUT /api/v1/scenes/areas/:areaId/assets/:assetId
 * Update area asset
 */
router.put('/areas/:areaId/assets/:assetId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { areaId, assetId } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      return sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
    }

    // Get area to find sceneId
    const area = await sceneService.getAreaDetail(areaId);
    if (!area) {
      return sendError(res, 404, API_ERROR_CODES.NOT_FOUND, {
        message: 'Area not found',
      });
    }

    // Check scene ownership
    const isOwner = await sceneService.isSceneOwner(area.sceneId, userId);
    if (!isOwner) {
      return sendError(res, 403, API_ERROR_CODES.FORBIDDEN, {
        message: 'You can only update assets in areas of your own scenes',
      });
    }

    const { position, isHidden, isInteractable, discoveryHint, metadata, displayOrder } = req.body;

    const areaAsset = await sceneService.updateAreaAsset(areaId, assetId, {
      position,
      isHidden,
      isInteractable,
      discoveryHint,
      metadata,
      displayOrder,
    });

    return res.json({
      success: true,
      data: areaAsset,
    });
  } catch (error) {
    logger.error({ error }, 'Error updating area asset');
    return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to update area asset',
    });
  }
});

/**
 * DELETE /api/v1/scenes/areas/:areaId/assets/:assetId
 * Remove asset from area
 */
router.delete('/areas/:areaId/assets/:assetId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { areaId, assetId } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      return sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
    }

    // Get area to find sceneId
    const area = await sceneService.getAreaDetail(areaId);
    if (!area) {
      return sendError(res, 404, API_ERROR_CODES.NOT_FOUND, {
        message: 'Area not found',
      });
    }

    // Check scene ownership
    const isOwner = await sceneService.isSceneOwner(area.sceneId, userId);
    if (!isOwner) {
      return sendError(res, 403, API_ERROR_CODES.FORBIDDEN, {
        message: 'You can only remove assets from areas in your own scenes',
      });
    }

    await sceneService.unlinkAssetFromArea(areaId, assetId);

    return res.json({
      success: true,
      message: 'Asset removed from area successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Error unlinking asset from area');
    return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to remove asset from area',
    });
  }
});

// ============================================================================
// AREA CONNECTIONS ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/scenes/areas/:areaId/connections
 * Connect areas
 */
router.post('/areas/:areaId/connections', requireAuth, async (req: Request, res: Response) => {
  try {
    const { areaId: fromAreaId } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      return sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
    }

    // Get area to find sceneId
    const area = await sceneService.getAreaDetail(fromAreaId);
    if (!area) {
      return sendError(res, 404, API_ERROR_CODES.NOT_FOUND, {
        message: 'Area not found',
      });
    }

    // Check scene ownership
    const isOwner = await sceneService.isSceneOwner(area.sceneId, userId);
    if (!isOwner) {
      return sendError(res, 403, API_ERROR_CODES.FORBIDDEN, {
        message: 'You can only connect areas in your own scenes',
      });
    }

    const { toAreaId, direction, description, isLocked, lockHint } = req.body;

    if (!toAreaId) {
      return sendError(res, 400, API_ERROR_CODES.MISSING_REQUIRED_FIELD, {
        message: 'toAreaId is required',
        field: 'toAreaId',
      });
    }

    const connection = await sceneService.connectAreas(fromAreaId, toAreaId, {
      direction,
      description,
      isLocked,
      lockHint,
    });

    return res.status(201).json({
      success: true,
      data: connection,
    });
  } catch (error) {
    logger.error({ error }, 'Error connecting areas');
    return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to connect areas',
    });
  }
});

/**
 * GET /api/v1/scenes/areas/:areaId/connections
 * Get area connections
 */
router.get('/areas/:areaId/connections', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { areaId } = req.params;
    const area = await sceneService.getAreaDetail(areaId);

    if (!area) {
      return sendError(res, 404, API_ERROR_CODES.NOT_FOUND, {
        message: 'Area not found',
      });
    }

    // Check scene access
    const userId = req.auth?.user?.id;
    const isOwner = userId ? await sceneService.isSceneOwner(area.sceneId, userId) : false;

    if (area.scene.visibility !== 'PUBLIC' && !isOwner) {
      return sendError(res, 403, API_ERROR_CODES.FORBIDDEN, {
        message: 'Access denied',
      });
    }

    const connections = await sceneService.getAreaConnections(areaId);

    return res.json({
      success: true,
      data: connections,
    });
  } catch (error) {
    logger.error({ error }, 'Error getting area connections');
    return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to get area connections',
    });
  }
});

/**
 * PUT /api/v1/scenes/areas/:areaId/connections/:targetAreaId
 * Update connection
 */
router.put('/areas/:areaId/connections/:targetAreaId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { areaId: fromAreaId, targetAreaId: toAreaId } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      return sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
    }

    // Get area to find sceneId
    const area = await sceneService.getAreaDetail(fromAreaId);
    if (!area) {
      return sendError(res, 404, API_ERROR_CODES.NOT_FOUND, {
        message: 'Area not found',
      });
    }

    // Check scene ownership
    const isOwner = await sceneService.isSceneOwner(area.sceneId, userId);
    if (!isOwner) {
      return sendError(res, 403, API_ERROR_CODES.FORBIDDEN, {
        message: 'You can only update connections in your own scenes',
      });
    }

    const { direction, description, isLocked, lockHint } = req.body;

    const connection = await sceneService.updateConnection(fromAreaId, toAreaId, {
      direction,
      description,
      isLocked,
      lockHint,
    });

    return res.json({
      success: true,
      data: connection,
    });
  } catch (error) {
    logger.error({ error }, 'Error updating connection');
    return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to update connection',
    });
  }
});

/**
 * DELETE /api/v1/scenes/areas/:areaId/connections/:targetAreaId
 * Disconnect areas
 */
router.delete('/areas/:areaId/connections/:targetAreaId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { areaId: fromAreaId, targetAreaId: toAreaId } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      return sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
    }

    // Get area to find sceneId
    const area = await sceneService.getAreaDetail(fromAreaId);
    if (!area) {
      return sendError(res, 404, API_ERROR_CODES.NOT_FOUND, {
        message: 'Area not found',
      });
    }

    // Check scene ownership
    const isOwner = await sceneService.isSceneOwner(area.sceneId, userId);
    if (!isOwner) {
      return sendError(res, 403, API_ERROR_CODES.FORBIDDEN, {
        message: 'You can only disconnect areas in your own scenes',
      });
    }

    await sceneService.disconnectAreas(fromAreaId, toAreaId);

    return res.json({
      success: true,
      message: 'Areas disconnected successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Error disconnecting areas');
    return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to disconnect areas',
    });
  }
});

// ============================================================================
// COVER UPLOAD ENDPOINT
// ============================================================================

/**
 * POST /api/v1/scenes/cover
 * Upload scene cover image with compression and WebP conversion
 */
router.post('/cover', requireAuth, asyncMulterHandler(upload.single('cover')), async (req: Request, res: Response) => {
  const userId = req.auth?.user?.id;

  if (!userId) {
    return sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
  }

  if (!r2Service.isConfigured()) {
    return sendError(res, 503, API_ERROR_CODES.R2_STORAGE_ERROR, {
      message: 'Media storage is not configured',
      details: { missing: r2Service.getMissingConfig() },
    });
  }

  const uploadedFile = req.file;

  if (!uploadedFile) {
    return sendError(res, 400, API_ERROR_CODES.INVALID_INPUT, {
      message: 'No file uploaded',
      field: 'cover',
    });
  }

  const { sceneId } = req.body ?? {};
  const trimmedSceneId = typeof sceneId === 'string' && sceneId.trim().length > 0 ? sceneId.trim() : undefined;

  if (!trimmedSceneId) {
    return sendError(res, 400, API_ERROR_CODES.MISSING_REQUIRED_FIELD, {
      message: 'Provide sceneId to scope the upload',
    });
  }

  try {
    // Check ownership
    const isOwner = await sceneService.isSceneOwner(trimmedSceneId, userId);
    if (!isOwner) {
      return sendError(res, 403, API_ERROR_CODES.FORBIDDEN, {
        message: 'You can only update covers for your scenes',
      });
    }

    const ext = ALLOWED_IMAGE_TYPES[uploadedFile.mimetype];
    if (!ext) {
      return sendError(res, 415, API_ERROR_CODES.INVALID_INPUT, {
        message: 'Unsupported image format. Use PNG, JPG, WEBP or GIF.',
      });
    }

    // Process image: compress and convert to WebP (landscape 3:2 aspect ratio)
    logger.info({ originalSize: uploadedFile.size, originalType: uploadedFile.mimetype }, 'Processing scene cover image');
    const processed = await processImageByType(uploadedFile.buffer, 'COVER');

    const sanitizedName = uploadedFile.originalname
      ? uploadedFile.originalname.replace(/[^a-z0-9._-]+/gi, '-').toLowerCase()
      : 'cover';

    const baseName = sanitizedName.replace(/\.[^.]+$/, '');
    const key = `scenes/${trimmedSceneId}/cover/${Date.now()}-${randomUUID()}-${baseName}.webp`;

    const { publicUrl } = await r2Service.uploadObject({
      key,
      body: processed.buffer,
      contentType: processed.contentType,
      cacheControl: 'public, max-age=604800',
    });

    // Update scene coverImageUrl
    const updated = await prisma.scene.update({
      where: { id: trimmedSceneId },
      data: { coverImageUrl: publicUrl },
    });

    logger.info(
      {
        sceneId: trimmedSceneId,
        originalSize: uploadedFile.size,
        processedSize: processed.sizeBytes,
        compressionRatio: `${((1 - processed.sizeBytes / uploadedFile.size) * 100).toFixed(2)}%`,
      },
      'Scene cover uploaded successfully'
    );

    return res.json({
      success: true,
      data: {
        url: publicUrl,
        key,
        scene: updated,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error uploading scene cover');
    return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to upload cover',
    });
  }
});

export default router;
