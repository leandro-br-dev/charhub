/**
 * Stripe Payment Provider
 *
 * Implementation of IPaymentProvider for Stripe subscriptions
 */

import Stripe from 'stripe';
import { PrismaClient } from '../../generated/prisma';
import { logger } from '../../config/logger';
import {
  IPaymentProvider,
  SubscriptionResult,
  WebhookResult,
  SubscriptionStatus,
} from './IPaymentProvider';

const prisma = new PrismaClient();

export class StripeProvider implements IPaymentProvider {
  private stripe: Stripe;

  constructor() {
    const apiKey = process.env.STRIPE_SECRET_KEY;

    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }

    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-12-15.clover',
    });
  }

  async createSubscription(
    userId: string,
    planId: string,
    userEmail: string
  ): Promise<SubscriptionResult> {
    // 1. Get plan from database
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.stripePriceId) {
      throw new Error('Plan not configured for Stripe');
    }

    // 2. Get or create Stripe Customer
    const customer = await this.getOrCreateCustomer(userId, userEmail);

    // 3. Create Stripe Subscription with manual invoice
    const subscription = await this.stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: plan.stripePriceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice'],
      metadata: {
        userId,
        planId,
        charhubEnvironment: process.env.NODE_ENV || 'development',
      },
    });

    // Get the created invoice
    const invoice = subscription.latest_invoice as Stripe.Invoice;

    if (!invoice) {
      logger.error({ subscriptionId: subscription.id }, 'No invoice created for subscription');
      throw new Error('No invoice created by Stripe');
    }

    // 4. Manually create a PaymentIntent for the invoice
    // This ensures we have a client_secret to return
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: (invoice as any).amount_due,
      currency: 'usd',
      customer: customer.id,
      payment_method_types: ['card'],
      setup_future_usage: 'off_session',
      metadata: {
        userId,
        planId,
        subscriptionId: subscription.id,
        invoiceId: (invoice as any).id,
        charhubEnvironment: process.env.NODE_ENV || 'development',
      },
    });

    if (!paymentIntent.client_secret) {
      logger.error({ paymentIntentId: paymentIntent.id }, 'No client_secret in PaymentIntent');
      throw new Error('Failed to create payment intent');
    }

    logger.info(
      {
        userId,
        planId,
        subscriptionId: subscription.id,
        invoiceId: (invoice as any).id,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
      },
      'Stripe subscription and payment intent created'
    );

    return {
      subscriptionId: subscription.id,
      clientSecret: paymentIntent.client_secret,
      customerId: customer.id,
    };
  }

  async cancelSubscription(subscriptionId: string, reason?: string): Promise<void> {
    await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
      cancellation_details: {
        comment: reason,
      },
    });

    logger.info({ subscriptionId, reason }, 'Stripe subscription canceled');
  }

  async reactivateSubscription(subscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    logger.info({ subscriptionId }, 'Stripe subscription reactivated');
  }

  async changePlan(subscriptionId: string, newPlanId: string): Promise<void> {
    const newPlan = await prisma.plan.findUnique({
      where: { id: newPlanId },
    });

    if (!newPlan || !newPlan.stripePriceId) {
      throw new Error('Invalid new plan for Stripe');
    }

    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

    await this.stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPlan.stripePriceId,
        },
      ],
      proration_behavior: 'always_invoice',
    });

    logger.info({ subscriptionId, newPlanId }, 'Stripe plan changed');
  }

  async getSubscriptionStatus(subscriptionId: string): Promise<SubscriptionStatus> {
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

    return {
      status: subscription.status,
      currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      cancelAtPeriodEnd: (subscription as any).cancel_at_period_end || false,
    };
  }

  async processWebhook(rawBody: string, signature: string): Promise<WebhookResult> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      logger.error({ error: err.message }, 'Stripe webhook signature verification failed');
      throw new Error('Webhook signature verification failed');
    }

    logger.info({ type: event.type, id: event.id }, 'Received Stripe webhook');

    const subscription = event.data.object as Stripe.Subscription;

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        return {
          eventType: event.type,
          subscriptionId: subscription.id,
          userId: subscription.metadata.userId,
          planId: subscription.metadata.planId,
          action: subscription.status === 'active' ? 'ACTIVATED' : 'UPDATED',
        };

      case 'customer.subscription.deleted':
        return {
          eventType: event.type,
          subscriptionId: subscription.id,
          userId: subscription.metadata.userId,
          action: 'CANCELLED',
        };

      case 'invoice.payment_failed':
        const invoice = event.data.object as Stripe.Invoice;
        return {
          eventType: event.type,
          subscriptionId: (invoice as any).subscription as string,
          action: 'PAYMENT_FAILED',
        };

      default:
        return {
          eventType: event.type,
          action: 'NONE',
        };
    }
  }

  /**
   * Get or create Stripe Customer for a user
   */
  private async getOrCreateCustomer(userId: string, email: string): Promise<Stripe.Customer> {
    // Check if user already has a Stripe customer ID
    const userPlan = await prisma.userPlan.findFirst({
      where: {
        userId,
        stripeCustomerId: { not: null },
      },
    });

    if (userPlan?.stripeCustomerId) {
      try {
        return (await this.stripe.customers.retrieve(
          userPlan.stripeCustomerId
        )) as Stripe.Customer;
      } catch (error) {
        logger.warn({ userId, customerId: userPlan.stripeCustomerId }, 'Failed to retrieve Stripe customer, creating new one');
      }
    }

    // Create new Customer
    const customer = await this.stripe.customers.create({
      email,
      metadata: {
        userId,
        charhubEnvironment: process.env.NODE_ENV || 'development',
      },
    });

    logger.info({ userId, customerId: customer.id }, 'Stripe customer created');

    return customer;
  }
}
