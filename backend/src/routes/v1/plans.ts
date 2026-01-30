import { Router, Request, Response } from 'express';
import { optionalAuth } from '../../middleware/auth';
import { translationMiddleware } from '../../middleware/translationMiddleware';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';
import { sendError, API_ERROR_CODES } from '../../utils/apiErrors';

const router = Router();

/**
 * GET /api/v1/plans
 * Get all available subscription plans
 */
router.get('/', optionalAuth, translationMiddleware(), async (_req: Request, res: Response): Promise<void> => {
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
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, { message: 'Failed to get plans' });
  }
});

/**
 * GET /api/v1/plans/:tier
 * Get specific plan by tier
 */
router.get('/:tier', optionalAuth, translationMiddleware(), async (req: Request, res: Response): Promise<void> => {
  try {
    const { tier } = req.params;

    const plan = await prisma.plan.findUnique({
      where: {
        tier: tier.toUpperCase() as any,
      },
    });

    if (!plan) {
      sendError(res, 404, API_ERROR_CODES.NOT_FOUND, { message: 'Plan not found', details: { tier } });
      return;
    }

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    logger.error({ error, tier: req.params.tier }, 'Error getting plan');
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, { message: 'Failed to get plan' });
  }
});

export default router;
