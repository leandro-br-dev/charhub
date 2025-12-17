/**
 * Stripe Subscription Activation Service
 *
 * Handles activation of Stripe subscriptions after successful payment
 */

import Stripe from 'stripe';
import { PrismaClient } from '../generated/prisma';
import { logger } from '../config/logger';
import { grantMonthlyCredits } from './creditService';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover',
});

export async function activateStripeSubscription(
  userId: string,
  subscriptionId: string
): Promise<void> {
  logger.info({ userId, subscriptionId }, 'Activating Stripe subscription');

  // 1. Retrieve subscription from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  if (!subscription) {
    throw new Error('Subscription not found in Stripe');
  }

  // 2. Get metadata
  const planId = subscription.metadata.planId;

  if (!planId) {
    throw new Error('No planId in subscription metadata');
  }

  // 3. Get plan from database
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
  });

  if (!plan) {
    throw new Error('Plan not found in database');
  }

  // 4. Get the invoice and check if it has a payment method
  const invoice = subscription.latest_invoice;
  let paymentMethodId: string | null = null;

  if (invoice) {
    const invoiceData = typeof invoice === 'string'
      ? await stripe.invoices.retrieve(invoice)
      : invoice;

    // Get payment intent from invoice
    const paymentIntentId = (invoiceData as any).payment_intent;

    if (paymentIntentId) {
      const paymentIntent = typeof paymentIntentId === 'string'
        ? await stripe.paymentIntents.retrieve(paymentIntentId)
        : paymentIntentId;

      paymentMethodId = (paymentIntent as any).payment_method;
    }
  }

  // 5. If we have a payment method, attach it to the subscription
  if (paymentMethodId) {
    await stripe.subscriptions.update(subscriptionId, {
      default_payment_method: paymentMethodId,
    });

    logger.info(
      { subscriptionId, paymentMethodId },
      'Payment method attached to subscription'
    );
  }

  // 6. Activate subscription in database
  await prisma.$transaction(async (tx) => {
    // Cancel existing active subscriptions
    await tx.userPlan.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });

    const now = new Date();
    const nextBillingTime = (subscription as any).current_period_end
      ? new Date((subscription as any).current_period_end * 1000)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Create new active subscription
    await tx.userPlan.create({
      data: {
        userId,
        planId: plan.id,
        status: 'ACTIVE',
        paymentProvider: 'STRIPE',
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        currentPeriodStart: now,
        currentPeriodEnd: nextBillingTime,
        lastCreditsGrantedAt: now,
      },
    });

    // Grant monthly credits
    await grantMonthlyCredits(userId);
  });

  logger.info(
    { userId, planId, subscriptionId },
    'Stripe subscription activated successfully'
  );
}
