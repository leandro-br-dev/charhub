import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { logger } from '../../config/logger';
import * as attireService from '../../services/attireService';
import { createAttireSchema, updateAttireSchema } from '../../validators';

const router = Router();

/**
 * POST /api/v1/attires
 * Create a new attire
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

    const validatedData = createAttireSchema.parse({
      ...req.body,
      userId,
    });

    const attire = await attireService.createAttire(validatedData);

    return res.status(201).json({
      success: true,
      data: attire,
    });
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error,
      });
    }

    logger.error({ error }, 'Error creating attire');
    return res.status(500).json({
      success: false,
      message: 'Failed to create attire',
    });
  }
});

/**
 * GET /api/v1/attires/:id
 * Get attire by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const attire = await attireService.getAttireById(id);

    if (!attire) {
      return res.status(404).json({
        success: false,
        message: 'Attire not found',
      });
    }

    // Check if attire is public or user owns it
    const userId = req.auth?.user?.id;
    if (!attire.isPublic && attire.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    return res.json({
      success: true,
      data: attire,
    });
  } catch (error) {
    logger.error({ error }, 'Error getting attire');
    return res.status(500).json({
      success: false,
      message: 'Failed to get attire',
    });
  }
});

/**
 * GET /api/v1/attires
 * List attires (public or user's own)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.user?.id;
    const {
      search,
      gender,
      skip,
      limit,
      userId: filterUserId,
      public: isPublic,
    } = req.query;

    let attires;

    // If filtering by specific user
    if (filterUserId && typeof filterUserId === 'string') {
      attires = await attireService.getAttiresByUserId(filterUserId, {
        search: typeof search === 'string' ? search : undefined,
        gender: typeof gender === 'string' ? gender : undefined,
        skip: typeof skip === 'string' ? parseInt(skip, 10) : undefined,
        limit: typeof limit === 'string' ? parseInt(limit, 10) : undefined,
      });
    }
    // If user is authenticated and no specific filter
    else if (userId && isPublic !== 'true') {
      attires = await attireService.getAttiresByUserId(userId, {
        search: typeof search === 'string' ? search : undefined,
        gender: typeof gender === 'string' ? gender : undefined,
        skip: typeof skip === 'string' ? parseInt(skip, 10) : undefined,
        limit: typeof limit === 'string' ? parseInt(limit, 10) : undefined,
      });
    }
    // Otherwise get public attires
    else {
      attires = await attireService.getPublicAttires({
        search: typeof search === 'string' ? search : undefined,
        gender: typeof gender === 'string' ? gender : undefined,
        skip: typeof skip === 'string' ? parseInt(skip, 10) : undefined,
        limit: typeof limit === 'string' ? parseInt(limit, 10) : undefined,
      });
    }

    return res.json({
      success: true,
      data: attires,
      count: attires.length,
    });
  } catch (error) {
    logger.error({ error }, 'Error listing attires');
    return res.status(500).json({
      success: false,
      message: 'Failed to list attires',
    });
  }
});

/**
 * PUT /api/v1/attires/:id
 * Update attire
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
    const isOwner = await attireService.isAttireOwner(id, userId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own attires',
      });
    }

    const validatedData = updateAttireSchema.parse(req.body);
    const attire = await attireService.updateAttire(id, validatedData);

    return res.json({
      success: true,
      data: attire,
    });
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error,
      });
    }

    logger.error({ error }, 'Error updating attire');
    return res.status(500).json({
      success: false,
      message: 'Failed to update attire',
    });
  }
});

/**
 * DELETE /api/v1/attires/:id
 * Delete attire
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
    const isOwner = await attireService.isAttireOwner(id, userId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own attires',
      });
    }

    await attireService.deleteAttire(id);

    return res.json({
      success: true,
      message: 'Attire deleted successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Error deleting attire');
    return res.status(500).json({
      success: false,
      message: 'Failed to delete attire',
    });
  }
});

export default router;
