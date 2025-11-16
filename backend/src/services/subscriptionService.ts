import { PrismaClient } from '../generated/prisma';
import { requirePayPal } from '../config/paypal';
import { logger } from '../config/logger';
import { grantMonthlyCredits } from './creditService';
import {
  SubscriptionsController,
  ExperienceContextShippingPreference,
  ApplicationContextUserAction
} from '@paypal/paypal-server-sdk';

const prisma = new PrismaClient();

function getSubscriptionsController() {
  const client = requirePayPal();
  return new SubscriptionsController(client);
}

/**
 * Create PayPal subscription for a user
 */
export async function subscribeToPlan(
  userId: string,
  planId: string
): Promise<{ subscriptionId: string; approvalUrl: string }> {
  const subscriptions = getSubscriptionsController();

  // Get user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, username: true },
  });

  if (!user || !user.email) {
    throw new Error('User not found or email missing');
  }

  // Get plan
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
  });

  if (!plan || !plan.isActive) {
    throw new Error('Plan not found or not active');
  }

  if (!plan.paypalPlanId) {
    throw new Error('Plan does not have PayPal configuration');
  }

  // Check if user already has an active subscription
  const existingSubscription = await prisma.userPlan.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      currentPeriodEnd: {
        gt: new Date(),
      },
    },
  });

  if (existingSubscription) {
    throw new Error('User already has an active subscription');
  }

  // Create PayPal subscription
  const response = await subscriptions.createSubscription({
    body: {
      planId: plan.paypalPlanId,
      subscriber: {
        name: {
          givenName: user.username || 'User',
        },
      },
      applicationContext: {
        brandName: 'CharHub',
        locale: 'en-US',
        shippingPreference: ExperienceContextShippingPreference.NoShipping,
        userAction: ApplicationContextUserAction.SubscribeNow,
        returnUrl: `${process.env.PUBLIC_FACING_URL}/plans?success=true`,
        cancelUrl: `${process.env.PUBLIC_FACING_URL}/plans?cancelled=true`,
      },
      customId: userId,
    },
  });

  const subscription = response.result;

  // Find approval URL
  const approvalUrl = subscription.links?.find(
    (link: any) => link.rel === 'approve'
  )?.href;

  if (!approvalUrl) {
    throw new Error('PayPal approval URL not found');
  }

  logger.info(
    { userId, planId, subscriptionId: subscription.id },
    'PayPal subscription created'
  );

  return {
    subscriptionId: subscription.id || '',
    approvalUrl,
  };
}

/**
 * Cancel user's subscription
 */
export async function cancelSubscription(
  userId: string,
  reason?: string
): Promise<void> {
  const subscriptions = getSubscriptionsController();

  const userPlan = await prisma.userPlan.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      currentPeriodEnd: {
        gt: new Date(),
      },
    },
  });

  if (!userPlan || !userPlan.paypalSubscriptionId) {
    throw new Error('No active subscription found');
  }

  await subscriptions.cancelSubscription({
    id: userPlan.paypalSubscriptionId,
    body: {
      reason: reason || 'Customer requested cancellation',
    },
  });

  await prisma.userPlan.update({
    where: { id: userPlan.id },
    data: {
      status: 'CANCELED',
      cancelAtPeriodEnd: true,
      canceledAt: new Date(),
    },
  });

  logger.info(
    { userId, subscriptionId: userPlan.paypalSubscriptionId },
    'Subscription canceled'
  );
}

/**
 * Reactivate a canceled subscription
 */
export async function reactivateSubscription(userId: string): Promise<void> {
  const subscriptions = getSubscriptionsController();

  const userPlan = await prisma.userPlan.findFirst({
    where: {
      userId,
      status: 'CANCELED',
      cancelAtPeriodEnd: true,
      currentPeriodEnd: {
        gt: new Date(),
      },
    },
  });

  if (!userPlan || !userPlan.paypalSubscriptionId) {
    throw new Error('No subscription pending cancellation found');
  }

  await subscriptions.activateSubscription({
    id: userPlan.paypalSubscriptionId,
    body: {
      reason: 'Reactivating on customer request',
    },
  });

  await prisma.userPlan.update({
    where: { id: userPlan.id },
    data: {
      status: 'ACTIVE',
      cancelAtPeriodEnd: false,
      canceledAt: null,
    },
  });

  logger.info(
    { userId, subscriptionId: userPlan.paypalSubscriptionId },
    'Subscription reactivated'
  );
}

/**
 * Update subscription to a different plan
 */
export async function changePlan(userId: string, newPlanId: string): Promise<void> {
  const subscriptions = getSubscriptionsController();

  const userPlan = await prisma.userPlan.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      currentPeriodEnd: {
        gt: new Date(),
      },
    },
    include: {
      plan: true,
    },
  });

  if (!userPlan || !userPlan.paypalSubscriptionId) {
    throw new Error('No active subscription found');
  }

  const newPlan = await prisma.plan.findUnique({
    where: { id: newPlanId },
  });

  if (!newPlan || !newPlan.isActive || !newPlan.paypalPlanId) {
    throw new Error('Invalid new plan');
  }

  await subscriptions.reviseSubscription({
    id: userPlan.paypalSubscriptionId,
    body: {
      planId: newPlan.paypalPlanId,
    },
  });

  await prisma.userPlan.update({
    where: { id: userPlan.id },
    data: {
      planId: newPlan.id,
    },
  });

  logger.info(
    { userId, oldPlanId: userPlan.planId, newPlanId },
    'Plan changed successfully'
  );
}

/**
 * Get user's current subscription status
 */
export async function getSubscriptionStatus(userId: string): Promise<any> {
  const userPlan = await prisma.userPlan.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
    },
    include: {
      plan: true,
    },
    orderBy: {
      currentPeriodEnd: 'desc',
    },
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
    isFree: false,
    currentPeriodStart: userPlan.currentPeriodStart,
    currentPeriodEnd: userPlan.currentPeriodEnd,
    cancelAtPeriodEnd: userPlan.cancelAtPeriodEnd,
    canceledAt: userPlan.canceledAt,
  };
}

/**
 * Process successful PayPal subscription (called by webhook)
 */
export async function processSubscriptionActivated(
  paypalSubscriptionId: string,
  userId: string,
  planId: string,
  billingInfo: any
): Promise<void> {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });

  if (!plan) {
    throw new Error('Plan not found');
  }

  await prisma.$transaction(async (tx) => {
    await tx.userPlan.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'CANCELED' },
    });

    const now = new Date();
    const nextBillingTime = billingInfo.nextBillingTime
      ? new Date(billingInfo.nextBillingTime)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await tx.userPlan.create({
      data: {
        userId,
        planId: plan.id,
        status: 'ACTIVE',
        paypalSubscriptionId,
        currentPeriodStart: now,
        currentPeriodEnd: nextBillingTime,
        lastCreditsGrantedAt: now,
      },
    });

    await grantMonthlyCredits(userId);
  });

  logger.info({ userId, planId, paypalSubscriptionId }, 'Subscription activated');
}
