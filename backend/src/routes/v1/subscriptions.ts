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
import { sendError, API_ERROR_CODES } from '../../utils/apiErrors';

const router = Router();

/**
 * POST /api/v1/subscriptions/subscribe
 * Subscribe user to a plan (returns PayPal approval URL)
 */
router.post('/subscribe', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth?.user?.id;
    if (!userId) {
      sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
      return;
    }

    const { planId } = req.body;

    if (!planId) {
      sendError(res, 400, API_ERROR_CODES.MISSING_REQUIRED_FIELD, { message: 'planId is required', field: 'planId' });
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
      sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR);
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
      sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
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
      sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR);
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
      sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
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
      sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR);
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
      sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
      return;
    }

    const { newPlanId } = req.body;

    if (!newPlanId) {
      sendError(res, 400, API_ERROR_CODES.MISSING_REQUIRED_FIELD, { message: 'newPlanId is required', field: 'newPlanId' });
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
      sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR);
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
      sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
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
      sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR);
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
      sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
      return;
    }

    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      sendError(res, 400, API_ERROR_CODES.MISSING_REQUIRED_FIELD, { message: 'subscriptionId is required', field: 'subscriptionId' });
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
      sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR);
    }
  }
});

export default router;
