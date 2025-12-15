/**
 * Stripe Webhook Handler
 *
 * Handles webhook events from Stripe for subscription management
 */

import { Router, Request, Response } from 'express';
import { logger } from '../../config/logger';
import { processSubscriptionWebhook } from '../../services/subscriptionService';
import { StripeProvider } from '../../services/payments/StripeProvider';

const router = Router();

/**
 * POST /webhooks/stripe
 * Handle Stripe webhook events
 *
 * IMPORTANT: This endpoint requires raw body for signature verification
 * The Express JSON middleware should be disabled for this route
 */
router.post(
  '/',
  async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['stripe-signature'];

    if (!signature || typeof signature !== 'string') {
      logger.error('Missing Stripe signature header');
      res.status(400).json({ error: 'Missing signature' });
      return;
    }

    try {
      // Get raw body (should be string or buffer)
      const rawBody = (req as any).rawBody || req.body;

      if (!rawBody) {
        logger.error('Missing raw body for Stripe webhook');
        res.status(400).json({ error: 'Missing raw body' });
        return;
      }

      // Initialize Stripe provider
      const stripeProvider = new StripeProvider();

      // Process webhook with signature verification
      const webhookResult = await stripeProvider.processWebhook(rawBody, signature);

      // Process the webhook result
      if (webhookResult.action !== 'NONE') {
        await processSubscriptionWebhook(webhookResult);
      }

      res.json({ received: true });
    } catch (error: any) {
      logger.error({ error: error.message, body: req.body }, 'Error processing Stripe webhook');
      res.status(400).json({ error: error.message || 'Webhook processing failed' });
    }
  }
);

export default router;
