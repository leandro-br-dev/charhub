import { Router, Request, Response } from 'express';
import { optionalAuth } from '../../middleware/auth';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';

const router = Router();

/**
 * GET /api/v1/plans
 * Get all available subscription plans
 */
router.get('/', optionalAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const plans = await prisma.plan.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        priceMonthly: 'asc',
      },
    });

    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    logger.error({ error }, 'Error getting plans');
    res.status(500).json({
      success: false,
      message: 'Failed to get plans',
    });
  }
});

/**
 * GET /api/v1/plans/:tier
 * Get specific plan by tier
 */
router.get('/:tier', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { tier } = req.params;

    const plan = await prisma.plan.findUnique({
      where: {
        tier: tier.toUpperCase() as any,
      },
    });

    if (!plan) {
      res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
      return;
    }

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    logger.error({ error, tier: req.params.tier }, 'Error getting plan');
    res.status(500).json({
      success: false,
      message: 'Failed to get plan',
    });
  }
});

export default router;
