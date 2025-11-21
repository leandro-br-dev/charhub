import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { logger } from '../../config/logger';
import {
  getCurrentBalance,
  claimDailyReward,
  getDailyRewardStatus,
  getFirstChatRewardStatus,
  getTransactionHistory,
  getUserCurrentPlan,
  hasEnoughCredits,
} from '../../services/creditService';
import {
  getUserMonthlyUsage,
  getServiceCosts,
  estimateServiceCost,
} from '../../services/usageService';

const router = Router();

/**
 * GET /api/v1/credits/balance
 * Get user's current credit balance
 */
router.get('/balance', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth?.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const balance = await getCurrentBalance(userId);

    res.json({
      success: true,
      data: {
        balance,
        userId,
      },
    });
  } catch (error) {
    logger.error({ error, userId: req.auth?.user?.id }, 'Error getting credit balance');
    res.status(500).json({
      success: false,
      message: 'Failed to get credit balance',
    });
  }
});

/**
 * GET /api/v1/credits/transactions
 * Get user's transaction history
 */
router.get('/transactions', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth?.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const type = req.query.type as string | undefined;

    const { transactions, total } = await getTransactionHistory(userId, {
      limit,
      offset,
      type: type as any,
    });

    res.json({
      success: true,
      data: {
        transactions,
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error({ error, userId: req.auth?.user?.id }, 'Error getting transaction history');
    res.status(500).json({
      success: false,
      message: 'Failed to get transaction history',
    });
  }
});

/**
 * POST /api/v1/credits/daily-reward
 * Claim daily login reward
 */
router.post('/daily-reward', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth?.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const result = await claimDailyReward(userId);

    res.json({
      success: true,
      data: result,
      message: `You received ${result.credits} credits!`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Daily reward already claimed today') {
      res.status(400).json({
        success: false,
        message: 'Daily reward already claimed today',
        code: 'ALREADY_CLAIMED',
      });
      return;
    }

    logger.error({ error, userId: req.auth?.user?.id }, 'Error claiming daily reward');
    res.status(500).json({
      success: false,
      message: 'Failed to claim daily reward',
    });
  }
});

/**
 * GET /api/v1/credits/daily-reward/status
 * Check if the daily reward has been claimed and when it can be claimed next
 */
router.get('/daily-reward/status', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth?.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const status = await getDailyRewardStatus(userId);
    res.json({ success: true, data: status });
  } catch (error) {
    logger.error({ error, userId: req.auth?.user?.id }, 'Error getting daily reward status');
    res.status(500).json({ success: false, message: 'Failed to get daily reward status' });
  }
});

/**
 * GET /api/v1/credits/first-chat-reward/status
 * Check if the first chat reward has been claimed and when it can be claimed next
 */
router.get('/first-chat-reward/status', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth?.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const status = await getFirstChatRewardStatus(userId);
    res.json({ success: true, data: status });
  } catch (error) {
    logger.error({ error, userId: req.auth?.user?.id }, 'Error getting first chat reward status');
    res.status(500).json({ success: false, message: 'Failed to get first chat reward status' });
  }
});

/**
 * GET /api/v1/credits/service-costs
 * Get all service credit costs
 */
router.get('/service-costs', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const costs = await getServiceCosts();

    res.json({
      success: true,
      data: costs,
    });
  } catch (error) {
    logger.error({ error }, 'Error getting service costs');
    res.status(500).json({
      success: false,
      message: 'Failed to get service costs',
    });
  }
});

/**
 * POST /api/v1/credits/estimate-cost
 * Estimate credit cost for a service request
 */
router.post('/estimate-cost', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceType, inputTokens, outputTokens, characterCount, imageCount, metadata } = req.body;

    if (!serviceType) {
      res.status(400).json({
        success: false,
        message: 'serviceType is required',
      });
      return;
    }

    const estimatedCost = await estimateServiceCost(serviceType, {
      inputTokens,
      outputTokens,
      charactersProcessed: characterCount,
      imagesProcessed: imageCount,
      additionalMetadata: metadata,
    });

    res.json({
      success: true,
      data: {
        serviceType,
        estimatedCost,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error estimating service cost');
    res.status(500).json({
      success: false,
      message: 'Failed to estimate service cost',
    });
  }
});

/**
 * GET /api/v1/credits/usage
 * Get user's monthly usage statistics
 */
router.get('/usage', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth?.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const usage = await getUserMonthlyUsage(userId);

    res.json({
      success: true,
      data: usage,
    });
  } catch (error) {
    logger.error({ error, userId: req.auth?.user?.id }, 'Error getting usage statistics');
    res.status(500).json({
      success: false,
      message: 'Failed to get usage statistics',
    });
  }
});

/**
 * GET /api/v1/credits/plan
 * Get user's current subscription plan
 */
router.get('/plan', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth?.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const userPlan = await getUserCurrentPlan(userId);

    res.json({
      success: true,
      data: userPlan,
    });
  } catch (error) {
    logger.error({ error, userId: req.auth?.user?.id }, 'Error getting user plan');
    res.status(500).json({
      success: false,
      message: 'Failed to get user plan',
    });
  }
});

/**
 * POST /api/v1/credits/check-balance
 * Check if user has enough credits for a service
 */
router.post('/check-balance', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth?.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { requiredCredits } = req.body;

    if (typeof requiredCredits !== 'number' || requiredCredits < 0) {
      res.status(400).json({
        success: false,
        message: 'requiredCredits must be a positive number',
      });
      return;
    }

    const hasEnough = await hasEnoughCredits(userId, requiredCredits);
    const currentBalance = await getCurrentBalance(userId);

    res.json({
      success: true,
      data: {
        hasEnough,
        currentBalance,
        requiredCredits,
        deficit: hasEnough ? 0 : requiredCredits - currentBalance,
      },
    });
  } catch (error) {
    logger.error({ error, userId: req.auth?.user?.id }, 'Error checking balance');
    res.status(500).json({
      success: false,
      message: 'Failed to check balance',
    });
  }
});

export default router;
