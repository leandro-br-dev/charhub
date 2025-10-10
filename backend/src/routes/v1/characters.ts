import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { logger } from '../../config/logger';
import * as characterService from '../../services/characterService';
import {
  createCharacterSchema,
  updateCharacterSchema,
} from '../../validators';

const router = Router();

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

export default router;
