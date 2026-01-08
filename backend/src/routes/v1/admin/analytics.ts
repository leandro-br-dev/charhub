import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../../middleware/auth';
import * as llmCostAnalytics from '../../../services/analytics/llmCostAnalytics';
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
 * Helper to parse date range from query params
 */
function parseDateRange(req: Request): { from: Date; to: Date } {
  const now = new Date();
  const from = req.query.from
    ? new Date(req.query.from as string)
    : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago
  const to = req.query.to ? new Date(req.query.to as string) : now;

  return { from, to };
}

/**
 * GET /api/v1/admin/analytics/llm/costs/by-feature
 * Get LLM costs aggregated by feature type
 */
router.get('/llm/costs/by-feature', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const dateRange = parseDateRange(req);
    const costs = await llmCostAnalytics.getCostByFeature(dateRange);

    res.json({
      success: true,
      data: costs,
      dateRange,
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching LLM costs by feature');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch LLM costs by feature',
    });
  }
});

/**
 * GET /api/v1/admin/analytics/llm/costs/by-model
 * Get LLM costs aggregated by model
 */
router.get('/llm/costs/by-model', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const dateRange = parseDateRange(req);
    const costs = await llmCostAnalytics.getCostByModel(dateRange);

    res.json({
      success: true,
      data: costs,
      dateRange,
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching LLM costs by model');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch LLM costs by model',
    });
  }
});

/**
 * GET /api/v1/admin/analytics/llm/costs/total
 * Get total operational LLM costs for a date range
 */
router.get('/llm/costs/total', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const dateRange = parseDateRange(req);
    const total = await llmCostAnalytics.getTotalOperationalCost(dateRange);

    res.json({
      success: true,
      data: {
        totalCost: total,
        currency: 'USD',
      },
      dateRange,
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching total LLM costs');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch total LLM costs',
    });
  }
});

/**
 * GET /api/v1/admin/analytics/llm/costs/by-plan
 * Get average LLM cost per user grouped by subscription plan
 */
router.get('/llm/costs/by-plan', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const costs = await llmCostAnalytics.getAverageCostByPlan();

    res.json({
      success: true,
      data: costs,
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching LLM costs by plan');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch LLM costs by plan',
    });
  }
});

/**
 * GET /api/v1/admin/analytics/llm/costs/daily
 * Get daily LLM costs for a date range (time series data)
 */
router.get('/llm/costs/daily', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const dateRange = parseDateRange(req);
    const dailyCosts = await llmCostAnalytics.getDailyCosts(dateRange);

    res.json({
      success: true,
      data: dailyCosts,
      dateRange,
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching daily LLM costs');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily LLM costs',
    });
  }
});

/**
 * GET /api/v1/admin/analytics/llm/costs/top-users
 * Get top users by LLM cost
 */
router.get('/llm/costs/top-users', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const dateRange = parseDateRange(req);
    const limit = parseInt(req.query.limit as string) || 50;
    const topUsers = await llmCostAnalytics.getTopUsersByCost(dateRange, limit);

    res.json({
      success: true,
      data: topUsers,
      dateRange,
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching top users by LLM cost');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top users by LLM cost',
    });
  }
});

/**
 * GET /api/v1/admin/analytics/llm/caching
 * Get caching effectiveness metrics
 */
router.get('/llm/caching', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const dateRange = parseDateRange(req);
    const metrics = await llmCostAnalytics.getCachingMetrics(dateRange);

    res.json({
      success: true,
      data: {
        ...metrics,
        cacheHitRate: `${(metrics.cacheHitRate * 100).toFixed(2)}%`,
        costSavings: `$${metrics.costSavings.toFixed(2)}`,
      },
      dateRange,
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching caching metrics');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch caching metrics',
    });
  }
});

/**
 * GET /api/v1/admin/analytics/llm/overview
 * Get comprehensive LLM analytics overview
 */
router.get('/llm/overview', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const dateRange = parseDateRange(req);

    const [
      costsByFeature,
      costsByModel,
      totalCost,
      costsByPlan,
      dailyCosts,
      topUsers,
      cachingMetrics,
    ] = await Promise.all([
      llmCostAnalytics.getCostByFeature(dateRange),
      llmCostAnalytics.getCostByModel(dateRange),
      llmCostAnalytics.getTotalOperationalCost(dateRange),
      llmCostAnalytics.getAverageCostByPlan(dateRange),
      llmCostAnalytics.getDailyCosts(dateRange),
      llmCostAnalytics.getTopUsersByCost(dateRange, 10),
      llmCostAnalytics.getCachingMetrics(dateRange),
    ]);

    res.json({
      success: true,
      data: {
        totalCost,
        costsByFeature,
        costsByModel,
        costsByPlan,
        dailyCosts,
        topUsers,
        cachingMetrics: {
          ...cachingMetrics,
          cacheHitRate: `${(cachingMetrics.cacheHitRate * 100).toFixed(2)}%`,
          costSavings: `$${cachingMetrics.costSavings.toFixed(2)}`,
        },
      },
      dateRange,
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching LLM analytics overview');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch LLM analytics overview',
    });
  }
});

export default router;
