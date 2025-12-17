import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { logger } from '../../config/logger';
import {
  subscribeToPlan,
  cancelSubscription,
  reactivateSubscription,
  changePlan,
  getSubscriptionStatus,
} from '../../services/subscriptionService';

const router = Router();

/**
 * POST /api/v1/subscriptions/subscribe
 * Subscribe user to a plan (returns PayPal approval URL)
 */
router.post('/subscribe', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth?.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { planId } = req.body;

    if (!planId) {
      res.status(400).json({
        success: false,
        message: 'planId is required',
      });
      return;
    }

    const result = await subscribeToPlan(userId, planId);

    // Dynamic message based on provider
    const message =
      result.provider === 'STRIPE'
        ? 'Subscription created. Complete payment with Stripe.'
        : 'Subscription created. Redirect to PayPal to complete payment.';

    res.json({
      success: true,
      data: result,
      message,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      logger.error({ error, userId: req.auth?.user?.id, planId: req.body.planId }, 'Subscribe error');
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
});

/**
 * POST /api/v1/subscriptions/cancel
 * Cancel user's subscription
 */
router.post('/cancel', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth?.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { reason } = req.body;

    await cancelSubscription(userId, reason);

    res.json({
      success: true,
      message: 'Subscription canceled successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      logger.error({ error, userId: req.auth?.user?.id }, 'Cancel subscription error');
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
});

/**
 * POST /api/v1/subscriptions/reactivate
 * Reactivate a canceled subscription
 */
router.post('/reactivate', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth?.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    await reactivateSubscription(userId);

    res.json({
      success: true,
      message: 'Subscription reactivated successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      logger.error({ error, userId: req.auth?.user?.id }, 'Reactivate subscription error');
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
});

/**
 * POST /api/v1/subscriptions/change-plan
 * Change user's plan
 */
router.post('/change-plan', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth?.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { newPlanId } = req.body;

    if (!newPlanId) {
      res.status(400).json({
        success: false,
        message: 'newPlanId is required',
      });
      return;
    }

    await changePlan(userId, newPlanId);

    res.json({
      success: true,
      message: 'Plan changed successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      logger.error({ error, userId: req.auth?.user?.id, newPlanId: req.body.newPlanId }, 'Change plan error');
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
});

/**
 * GET /api/v1/subscriptions/status
 * Get current subscription status
 */
router.get('/status', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth?.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const status = await getSubscriptionStatus(userId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      logger.error({ error, userId: req.auth?.user?.id }, 'Get subscription status error');
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
});

/**
 * POST /api/v1/subscriptions/activate-stripe
 * Activate Stripe subscription after successful payment
 */
router.post('/activate-stripe', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth?.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      res.status(400).json({
        success: false,
        message: 'subscriptionId is required',
      });
      return;
    }

    // Import the activation function
    const { activateStripeSubscription } = await import('../../services/stripeActivationService');
    await activateStripeSubscription(userId, subscriptionId);

    res.json({
      success: true,
      message: 'Subscription activated successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      logger.error({ error, userId: req.auth?.user?.id, subscriptionId: req.body.subscriptionId }, 'Activate Stripe subscription error');
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
});

export default router;
