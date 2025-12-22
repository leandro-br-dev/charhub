/**
 * Subscription Service
 *
 * High-level service for managing user subscriptions
 * Uses PaymentProviderFactory to support multiple payment providers
 */

import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { grantMonthlyCredits } from './creditService';
import { PaymentProviderFactory } from './payments/PaymentProviderFactory';
import { WebhookResult } from './payments/IPaymentProvider';

/**
 * Subscribe user to a plan
 */
export async function subscribeToPlan(
  userId: string,
  planId: string
): Promise<{ subscriptionId: string; clientSecret?: string; approvalUrl?: string; provider: string }> {
  // 1. Get plan and user
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!plan || !user?.email) {
    throw new Error('Plan or user not found');
  }

  if (!plan.isActive) {
    throw new Error('Plan is not active');
  }

  // 2. Check for existing active subscription
  const existingSubscription = await prisma.userPlan.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      currentPeriodEnd: { gt: new Date() },
    },
    include: { plan: true },
  });

  // If user already has an active subscription
  if (existingSubscription) {
    // If trying to subscribe to the same plan, return error
    if (existingSubscription.planId === planId) {
      throw new Error('User already subscribed to this plan');
    }

    // If user is on FREE plan (no paymentProvider), allow creating a new paid subscription
    if (!existingSubscription.paymentProvider || existingSubscription.plan.priceMonthly === 0) {
      // Free plan -> Paid plan: Continue to create new subscription (don't use changePlan)
      // Fall through to normal subscription creation
    } else {
      // Paid plan -> Another paid plan: Use changePlan
      await changePlan(userId, planId);

      // Return a response indicating plan was changed
      // Note: No clientSecret or approvalUrl needed since plan is being changed, not created
      return {
        subscriptionId: existingSubscription.stripeSubscriptionId || existingSubscription.paypalSubscriptionId || '',
        provider: existingSubscription.paymentProvider,
      };
    }
  }

  // 3. Get appropriate payment provider
  const provider = PaymentProviderFactory.getProvider(plan.paymentProvider);

  // 4. Create subscription with provider
  const result = await provider.createSubscription(userId, planId, user.email);

  logger.info(
    {
      userId,
      planId,
      provider: plan.paymentProvider,
      subscriptionId: result.subscriptionId,
    },
    'Subscription initiated'
  );

  return {
    ...result,
    provider: plan.paymentProvider,
  };
}

/**
 * Cancel user's subscription
 */
export async function cancelSubscription(
  userId: string,
  reason?: string
): Promise<void> {
  const userPlan = await prisma.userPlan.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      currentPeriodEnd: { gt: new Date() },
    },
    include: { plan: true },
  });

  if (!userPlan || !userPlan.paymentProvider) {
    throw new Error('No active subscription found');
  }

  // Get subscription ID based on provider
  const subscriptionId =
    userPlan.paymentProvider === 'STRIPE'
      ? userPlan.stripeSubscriptionId
      : userPlan.paypalSubscriptionId;

  if (!subscriptionId) {
    throw new Error('Subscription ID not found');
  }

  // Get provider and cancel
  const provider = PaymentProviderFactory.getProvider(userPlan.paymentProvider);
  await provider.cancelSubscription(subscriptionId, reason);

  // Update database
  await prisma.userPlan.update({
    where: { id: userPlan.id },
    data: {
      status: 'CANCELLED',
      cancelAtPeriodEnd: true,
      canceledAt: new Date(),
    },
  });

  logger.info({ userId, subscriptionId }, 'Subscription canceled');
}

/**
 * Reactivate a canceled subscription
 */
export async function reactivateSubscription(userId: string): Promise<void> {
  const userPlan = await prisma.userPlan.findFirst({
    where: {
      userId,
      status: 'CANCELLED',
      cancelAtPeriodEnd: true,
      currentPeriodEnd: { gt: new Date() },
    },
  });

  if (!userPlan || !userPlan.paymentProvider) {
    throw new Error('No subscription pending cancellation found');
  }

  // Get subscription ID based on provider
  const subscriptionId =
    userPlan.paymentProvider === 'STRIPE'
      ? userPlan.stripeSubscriptionId
      : userPlan.paypalSubscriptionId;

  if (!subscriptionId) {
    throw new Error('Subscription ID not found');
  }

  // Get provider and reactivate
  const provider = PaymentProviderFactory.getProvider(userPlan.paymentProvider);
  await provider.reactivateSubscription(subscriptionId);

  // Update database
  await prisma.userPlan.update({
    where: { id: userPlan.id },
    data: {
      status: 'ACTIVE',
      cancelAtPeriodEnd: false,
      canceledAt: null,
    },
  });

  logger.info({ userId, subscriptionId }, 'Subscription reactivated');
}

/**
 * Update subscription to a different plan
 */
export async function changePlan(userId: string, newPlanId: string): Promise<void> {
  const userPlan = await prisma.userPlan.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      currentPeriodEnd: { gt: new Date() },
    },
    include: { plan: true },
  });

  if (!userPlan || !userPlan.paymentProvider) {
    throw new Error('No active subscription found');
  }

  const newPlan = await prisma.plan.findUnique({
    where: { id: newPlanId },
  });

  if (!newPlan || !newPlan.isActive) {
    throw new Error('Invalid new plan');
  }

  // Verify both plans use the same provider
  if (newPlan.paymentProvider !== userPlan.paymentProvider) {
    throw new Error('Cannot change to a plan with a different payment provider');
  }

  // Get subscription ID based on provider
  const subscriptionId =
    userPlan.paymentProvider === 'STRIPE'
      ? userPlan.stripeSubscriptionId
      : userPlan.paypalSubscriptionId;

  if (!subscriptionId) {
    throw new Error('Subscription ID not found');
  }

  // Get provider and change plan
  const provider = PaymentProviderFactory.getProvider(userPlan.paymentProvider);
  await provider.changePlan(subscriptionId, newPlanId);

  // Update database
  await prisma.userPlan.update({
    where: { id: userPlan.id },
    data: { planId: newPlan.id },
  });

  logger.info({ userId, oldPlanId: userPlan.planId, newPlanId }, 'Plan changed successfully');
}

/**
 * Get user's current subscription status
 */
export async function getSubscriptionStatus(userId: string): Promise<any> {
  const userPlan = await prisma.userPlan.findFirst({
    where: { userId, status: 'ACTIVE' },
    include: { plan: true },
    orderBy: { currentPeriodEnd: 'desc' },
  });

  if (!userPlan) {
    const freePlan = await prisma.plan.findUnique({
      where: { tier: 'FREE' },
    });

    return {
      plan: freePlan,
      status: 'ACTIVE',
      isFree: true,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }

  return {
    plan: userPlan.plan,
    status: userPlan.status,
    isFree: userPlan.plan.priceMonthly === 0, // Check if plan is FREE based on price
    paymentProvider: userPlan.paymentProvider,
    currentPeriodStart: userPlan.currentPeriodStart,
    currentPeriodEnd: userPlan.currentPeriodEnd,
    cancelAtPeriodEnd: userPlan.cancelAtPeriodEnd,
    canceledAt: userPlan.canceledAt,
  };
}

/**
 * Process webhook event from payment provider
 *
 * This function handles webhook events from any payment provider
 */
export async function processSubscriptionWebhook(webhookResult: WebhookResult): Promise<void> {
  const { action, subscriptionId, userId, planId, metadata } = webhookResult;

  logger.info({ action, subscriptionId, userId }, 'Processing subscription webhook');

  switch (action) {
    case 'ACTIVATED':
      if (!userId || !planId || !subscriptionId) {
        logger.error({ webhookResult }, 'Missing required fields for ACTIVATED webhook');
        return;
      }
      await processSubscriptionActivated(subscriptionId, userId, planId, metadata);
      break;

    case 'CANCELLED':
      if (!subscriptionId) {
        logger.error({ webhookResult }, 'Missing subscriptionId for CANCELLED webhook');
        return;
      }
      await processSubscriptionCancelled(subscriptionId);
      break;

    case 'PAYMENT_FAILED':
      if (!subscriptionId) {
        logger.error({ webhookResult }, 'Missing subscriptionId for PAYMENT_FAILED webhook');
        return;
      }
      await processPaymentFailed(subscriptionId);
      break;

    case 'PAYMENT_SUCCEEDED':
      if (!subscriptionId || !userId || !planId) {
        logger.error({ webhookResult }, 'Missing required fields for PAYMENT_SUCCEEDED webhook');
        return;
      }
      await processPaymentSucceeded(subscriptionId, userId, planId);
      break;

    case 'NONE':
    default:
      // No action needed
      break;
  }
}

/**
 * Process successful subscription activation (called by webhook)
 */
async function processSubscriptionActivated(
  subscriptionId: string,
  userId: string,
  planId: string,
  metadata?: any
): Promise<void> {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });

  if (!plan) {
    throw new Error('Plan not found');
  }

  // Determine which field to use based on provider
  const subscriptionData =
    plan.paymentProvider === 'STRIPE'
      ? { stripeSubscriptionId: subscriptionId }
      : { paypalSubscriptionId: subscriptionId };

  const now = new Date();
  const nextBillingTime = metadata?.billingInfo?.nextBillingTime
    ? new Date(metadata.billingInfo.nextBillingTime)
    : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Create subscription in transaction
  await prisma.$transaction(async (tx) => {
    // Deactivate all previous plans (including FREE)
    await tx.userPlan.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: {
        status: 'CANCELLED',
        canceledAt: now,
      },
    });

    // Create new active subscription
    await tx.userPlan.create({
      data: {
        userId,
        planId: plan.id,
        status: 'ACTIVE',
        paymentProvider: plan.paymentProvider,
        ...subscriptionData,
        currentPeriodStart: now,
        currentPeriodEnd: nextBillingTime,
        // DON'T set lastCreditsGrantedAt yet - let grantMonthlyCredits set it
      },
    });
  });

  // Grant monthly credits AFTER transaction completes
  // This ensures the UserPlan is committed to DB before grantMonthlyCredits queries it
  await grantMonthlyCredits(userId, planId);

  logger.info({ userId, planId, subscriptionId }, 'Subscription activated and credits granted');
}

/**
 * Process subscription cancellation (called by webhook)
 */
async function processSubscriptionCancelled(subscriptionId: string): Promise<void> {
  const userPlan = await prisma.userPlan.findFirst({
    where: {
      OR: [
        { paypalSubscriptionId: subscriptionId },
        { stripeSubscriptionId: subscriptionId },
      ],
    },
  });

  if (!userPlan) {
    logger.warn({ subscriptionId }, 'UserPlan not found for cancelled subscription');
    return;
  }

  await prisma.userPlan.update({
    where: { id: userPlan.id },
    data: {
      status: 'CANCELLED',
      canceledAt: new Date(),
    },
  });

  logger.info({ subscriptionId }, 'Subscription marked as cancelled');
}

/**
 * Process failed payment (called by webhook)
 */
async function processPaymentFailed(subscriptionId: string): Promise<void> {
  const userPlan = await prisma.userPlan.findFirst({
    where: {
      OR: [
        { paypalSubscriptionId: subscriptionId },
        { stripeSubscriptionId: subscriptionId },
      ],
    },
  });

  if (!userPlan) {
    logger.warn({ subscriptionId }, 'UserPlan not found for failed payment');
    return;
  }

  await prisma.userPlan.update({
    where: { id: userPlan.id },
    data: {
      status: 'PAYMENT_FAILED',
    },
  });

  logger.warn({ subscriptionId, userId: userPlan.userId }, 'Payment failed for subscription');
}

/**
 * Process successful payment (called by webhook for recurring payments)
 * This is called when a monthly renewal payment succeeds
 */
async function processPaymentSucceeded(
  subscriptionId: string,
  userId: string,
  planId: string
): Promise<void> {
  const userPlan = await prisma.userPlan.findFirst({
    where: {
      OR: [
        { paypalSubscriptionId: subscriptionId },
        { stripeSubscriptionId: subscriptionId },
      ],
    },
    include: { plan: true },
  });

  if (!userPlan) {
    logger.warn({ subscriptionId }, 'UserPlan not found for successful payment');
    return;
  }

  // Grant monthly credits for this specific plan
  // grantMonthlyCredits has built-in validation to prevent duplicate grants
  await grantMonthlyCredits(userId, planId);

  // Ensure subscription is active (in case it was suspended)
  if (userPlan.status !== 'ACTIVE') {
    await prisma.userPlan.update({
      where: { id: userPlan.id },
      data: {
        status: 'ACTIVE',
      },
    });
  }

  logger.info(
    { userId, subscriptionId, planId },
    'Payment succeeded - monthly credits processed'
  );
}
