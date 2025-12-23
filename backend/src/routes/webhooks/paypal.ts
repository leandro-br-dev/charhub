import { Router, Request, Response } from 'express';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';
import { grantMonthlyCredits } from '../../services/creditService';
import { processSubscriptionWebhook } from '../../services/subscriptionService';
import { PayPalProvider } from '../../services/payments/PayPalProvider';

const router = Router();

/**
 * POST /webhooks/paypal
 * Handle PayPal webhooks
 */
router.post(
  '/',
  async (req: Request, res: Response): Promise<void> => {
    // TODO: Implement webhook signature verification
    // The PayPal SDK doesn't expose webhooks.verifyWebhookSignature directly
    // For now, we'll process webhooks without verification (development only)
    // In production, implement verification using PayPal REST API directly

    try {
      const event = req.body;
      logger.info({ type: event.event_type, id: event.id }, 'Received PayPal webhook');

      const paypalProvider = new PayPalProvider();

      // Handle the event based on type
      switch (event.event_type) {
        case 'BILLING.SUBSCRIPTION.ACTIVATED':
        case 'BILLING.SUBSCRIPTION.UPDATED':
        case 'BILLING.SUBSCRIPTION.CANCELLED':
        case 'BILLING.SUBSCRIPTION.EXPIRED':
        case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED': {
          // Get plan ID if this is an activation
          let planId: string | undefined;
          if (event.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
            const plan = await prisma.plan.findFirst({
              where: { paypalPlanId: event.resource.plan_id },
            });
            planId = plan?.id;
          }

          // Process webhook using PayPalProvider
          const webhookResult = await paypalProvider.processWebhook(event);

          // Add planId if we found it
          if (planId) {
            webhookResult.planId = planId;
          }

          // Process the webhook result
          await processSubscriptionWebhook(webhookResult);
          break;
        }

        case 'PAYMENT.SALE.COMPLETED':
          await handlePaymentCompleted(event.resource);
          break;

        case 'BILLING.SUBSCRIPTION.SUSPENDED':
          await handleSubscriptionSuspended(event.resource);
          break;

        default:
          logger.info({ type: event.event_type }, 'Unhandled webhook event type');
      }

      res.json({ received: true });
    } catch (error) {
      logger.error({ error, body: req.body }, 'Error processing PayPal webhook');
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);

/**
 * Handle subscription.suspended event
 * Note: Suspended is treated separately as it may require special handling beyond PAYMENT_FAILED
 */
async function handleSubscriptionSuspended(subscription: any): Promise<void> {
  const userPlan = await prisma.userPlan.findUnique({
    where: { paypalSubscriptionId: subscription.id },
  });

  if (!userPlan) {
    logger.warn({ subscriptionId: subscription.id }, 'UserPlan not found');
    return;
  }

  await prisma.userPlan.update({
    where: { id: userPlan.id },
    data: {
      status: 'PAYMENT_FAILED',
    },
  });

  logger.warn(
    { userId: userPlan.userId, subscriptionId: subscription.id },
    'Subscription suspended due to payment failure'
  );
}

/**
 * Handle payment.sale.completed event
 * Called when a recurring payment is successfully completed
 */
async function handlePaymentCompleted(sale: any): Promise<void> {
  const billingAgreementId = sale.billing_agreement_id;

  if (!billingAgreementId) {
    return; // Not a subscription payment
  }

  const userPlan = await prisma.userPlan.findUnique({
    where: { paypalSubscriptionId: billingAgreementId },
    include: { plan: true },
  });

  if (!userPlan) {
    logger.warn({ subscriptionId: billingAgreementId }, 'UserPlan not found for payment');
    return;
  }

  // Grant monthly credits on successful payment (renewal)
  // Pass planId to ensure correct plan credits are granted
  // grantMonthlyCredits now has built-in validation to prevent duplicates
  await grantMonthlyCredits(userPlan.userId, userPlan.planId);

  logger.info(
    { userId: userPlan.userId, subscriptionId: billingAgreementId, planId: userPlan.planId },
    'Monthly credits processed for successful payment'
  );

  // Ensure subscription is active
  if (userPlan.status !== 'ACTIVE') {
    await prisma.userPlan.update({
      where: { id: userPlan.id },
      data: {
        status: 'ACTIVE',
      },
    });
  }
}

export default router;
