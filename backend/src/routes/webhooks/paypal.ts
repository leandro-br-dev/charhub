import { Router, Request, Response } from 'express';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';
import { grantMonthlyCredits } from '../../services/creditService';
import { processSubscriptionActivated } from '../../services/subscriptionService';

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

      // Handle the event
      switch (event.event_type) {
        case 'BILLING.SUBSCRIPTION.ACTIVATED':
          await handleSubscriptionActivated(event.resource);
          break;

        case 'BILLING.SUBSCRIPTION.UPDATED':
          await handleSubscriptionUpdated(event.resource);
          break;

        case 'BILLING.SUBSCRIPTION.CANCELLED':
          await handleSubscriptionCancelled(event.resource);
          break;

        case 'BILLING.SUBSCRIPTION.SUSPENDED':
          await handleSubscriptionSuspended(event.resource);
          break;

        case 'BILLING.SUBSCRIPTION.EXPIRED':
          await handleSubscriptionExpired(event.resource);
          break;

        case 'PAYMENT.SALE.COMPLETED':
          await handlePaymentCompleted(event.resource);
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
 * Handle subscription.activated event
 */
async function handleSubscriptionActivated(subscription: any): Promise<void> {
  const userId = subscription.custom_id;
  const subscriptionId = subscription.id;

  if (!userId) {
    logger.warn({ subscriptionId }, 'Subscription missing userId in custom_id');
    return;
  }

  // Find the plan by PayPal plan ID
  const plan = await prisma.plan.findFirst({
    where: { paypalPlanId: subscription.plan_id },
  });

  if (!plan) {
    logger.warn({ planId: subscription.plan_id }, 'Plan not found for PayPal plan ID');
    return;
  }

  await processSubscriptionActivated(
    subscriptionId,
    userId,
    plan.id,
    subscription.billing_info
  );

  logger.info(
    { userId, planId: plan.id, subscriptionId },
    'Subscription activated'
  );
}

/**
 * Handle subscription.updated event
 */
async function handleSubscriptionUpdated(subscription: any): Promise<void> {
  const userPlan = await prisma.userPlan.findUnique({
    where: { paypalSubscriptionId: subscription.id },
  });

  if (!userPlan) {
    logger.warn({ subscriptionId: subscription.id }, 'UserPlan not found for subscription update');
    return;
  }

  const updates: any = {
    currentPeriodStart: subscription.billing_info?.last_payment?.time
      ? new Date(subscription.billing_info.last_payment.time)
      : undefined,
    currentPeriodEnd: subscription.billing_info?.next_billing_time
      ? new Date(subscription.billing_info.next_billing_time)
      : undefined,
  };

  // Update status based on PayPal status
  if (subscription.status === 'ACTIVE') {
    updates.status = 'ACTIVE';
  } else if (subscription.status === 'CANCELLED') {
    updates.status = 'CANCELED';
    updates.canceledAt = new Date();
  } else if (subscription.status === 'SUSPENDED') {
    updates.status = 'PAYMENT_FAILED';
  }

  await prisma.userPlan.update({
    where: { id: userPlan.id },
    data: updates,
  });

  logger.info(
    { userId: userPlan.userId, subscriptionId: subscription.id, status: subscription.status },
    'Subscription updated'
  );
}

/**
 * Handle subscription.cancelled event
 */
async function handleSubscriptionCancelled(subscription: any): Promise<void> {
  const userPlan = await prisma.userPlan.findUnique({
    where: { paypalSubscriptionId: subscription.id },
  });

  if (!userPlan) {
    logger.warn({ subscriptionId: subscription.id }, 'UserPlan not found for subscription cancellation');
    return;
  }

  await prisma.userPlan.update({
    where: { id: userPlan.id },
    data: {
      status: 'CANCELED',
      canceledAt: new Date(),
    },
  });

  logger.info(
    { userId: userPlan.userId, subscriptionId: subscription.id },
    'Subscription cancelled'
  );
}

/**
 * Handle subscription.suspended event
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
 * Handle subscription.expired event
 */
async function handleSubscriptionExpired(subscription: any): Promise<void> {
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
      status: 'EXPIRED',
    },
  });

  logger.info(
    { userId: userPlan.userId, subscriptionId: subscription.id },
    'Subscription expired'
  );
}

/**
 * Handle payment.sale.completed event
 */
async function handlePaymentCompleted(sale: any): Promise<void> {
  const billingAgreementId = sale.billing_agreement_id;

  if (!billingAgreementId) {
    return; // Not a subscription payment
  }

  const userPlan = await prisma.userPlan.findUnique({
    where: { paypalSubscriptionId: billingAgreementId },
  });

  if (!userPlan) {
    logger.warn({ subscriptionId: billingAgreementId }, 'UserPlan not found for payment');
    return;
  }

  // Grant monthly credits on successful payment (renewal)
  await grantMonthlyCredits(userPlan.userId);

  logger.info(
    { userId: userPlan.userId, subscriptionId: billingAgreementId },
    'Monthly credits granted after successful payment'
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
