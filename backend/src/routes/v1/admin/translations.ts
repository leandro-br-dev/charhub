import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../../middleware/auth';
import { translationMetrics } from '../../../services/translation/translationMetrics';
import { logger } from '../../../config/logger';

const router = Router();

/**
 * Middleware to check if user is admin
 */
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = req.auth?.user;

  if (!user || user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }

  return next();
};

/**
 * GET /api/v1/admin/translations/metrics
 * Get translation system metrics
 */
router.get('/metrics', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [stats, topPairs, byType, cacheHitRate] = await Promise.all([
      translationMetrics.getGeneralStats(),
      translationMetrics.getTopLanguagePairs(5),
      translationMetrics.getTranslationsByContentType(),
      translationMetrics.getCacheHitRate(24),
    ]);

    res.json({
      success: true,
      data: {
        stats,
        topLanguagePairs: topPairs,
        byContentType: byType,
        cacheHitRate: `${cacheHitRate.toFixed(2)}%`,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching translation metrics');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch translation metrics',
    });
  }
});

/**
 * GET /api/v1/admin/translations/popular/:contentType
 * Get most translated content of a specific type
 */
router.get(
  '/popular/:contentType',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { contentType } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      const popular = await translationMetrics.getMostTranslatedContent(contentType, limit);

      res.json({
        success: true,
        data: popular,
      });
    } catch (error) {
      logger.error({ error }, 'Error fetching popular translations');
      res.status(500).json({
        success: false,
        message: 'Failed to fetch popular translations',
      });
    }
  }
);

export default router;
