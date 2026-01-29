import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../../middleware/auth';
import { isAdmin } from '../../../middleware/authorization';
import { imageCompressionService } from '../../../services/imageCompressionService';
import { logger } from '../../../config/logger';

const router = Router();

/**
 * Middleware to require admin role
 * Uses the existing isAdmin function from authorization middleware
 */
const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.auth?.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  if (!isAdmin(req.auth.user.role)) {
    res.status(403).json({
      success: false,
      message: 'Admin privileges required',
    });
    return;
  }

  next();
};

/**
 * GET /api/v1/admin/scripts/image-compression/stats
 * Get statistics about oversized images
 */
router.get('/image-compression/stats', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const stats = await imageCompressionService.getOversizedStats();
    return res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get image compression stats');
    return res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
    });
  }
});

/**
 * POST /api/v1/admin/scripts/image-compression
 * Trigger compression of oversized images
 *
 * Body:
 * - limit: number of images to process (1-1000, default: 100)
 * - targetSizeKB: images above this size will be compressed (50-5000, default: 200)
 */
router.post('/image-compression', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { limit = 100, targetSizeKB = 200 } = req.body;

    // Validate inputs
    if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be between 1 and 1000',
      });
    }

    if (typeof targetSizeKB !== 'number' || targetSizeKB < 50 || targetSizeKB > 5000) {
      return res.status(400).json({
        success: false,
        message: 'Target size must be between 50 and 5000 KB',
      });
    }

    const result = await imageCompressionService.compressOversizedImages({
      limit,
      targetSizeKB,
    });

    return res.json({
      success: true,
      message: `Processed ${result.processed} images, failed ${result.failed}. Reclaimed ${(result.bytesReclaimed / 1024 / 1024).toFixed(2)} MB`,
      data: result,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to run image compression');
    return res.status(500).json({
      success: false,
      message: 'Failed to run compression script',
    });
  }
});

export default router;
