/**
 * Stripe Payment Provider
 *
 * Implementation of IPaymentProvider for Stripe subscriptions
 */

import Stripe from 'stripe';
import { prisma as defaultPrisma } from '../../config/database';
import { logger } from '../../config/logger';
import {
  IPaymentProvider,
  SubscriptionResult,
  WebhookResult,
  SubscriptionStatus,
} from './IPaymentProvider';
import { PrismaClient } from '../../generated/prisma';

export class StripeProvider implements IPaymentProvider {
  private stripe: Stripe;
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    const apiKey = process.env.STRIPE_SECRET_KEY;

    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }

    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-02-24.acacia',
    });

    this.prisma = prisma || defaultPrisma;
  }

  async createSubscription(
    userId: string,
    planId: string,
    userEmail: string
  ): Promise<SubscriptionResult> {
    // 1. Get plan from database
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.stripePriceId) {
      throw new Error('Plan not configured for Stripe');
    }

    // 2. Get or create Stripe Customer
    const customer = await this.getOrCreateCustomer(userId, userEmail);

    // 3. Create Stripe Subscription with default_incomplete behavior
    // This creates a subscription with an invoice that has a PaymentIntent attached
    const subscription = await this.stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: plan.stripePriceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'], // Expand to get payment intent details
      metadata: {
        userId,
        planId,
        charhubEnvironment: process.env.NODE_ENV || 'development',
      },
    });

    // Get the created invoice with expanded payment_intent
    const invoice = subscription.latest_invoice as Stripe.Invoice;

    if (!invoice) {
      logger.error({ subscriptionId: subscription.id }, 'No invoice created for subscription');
      throw new Error('No invoice created by Stripe');
    }

    // 4. Get the PaymentIntent that Stripe automatically created for the invoice
    // When using payment_behavior: 'default_incomplete', Stripe creates a PaymentIntent
    // and links it to the invoice automatically
    const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

    if (!paymentIntent) {
      logger.error({ invoiceId: invoice.id }, 'No payment intent in invoice');
      throw new Error('No payment intent created by Stripe');
    }

    // Need to retrieve full PaymentIntent to get client_secret
    const fullPaymentIntent = await this.stripe.paymentIntents.retrieve(
      typeof paymentIntent === 'string' ? paymentIntent : paymentIntent.id
    );

    if (!fullPaymentIntent.client_secret) {
      logger.error({ paymentIntentId: fullPaymentIntent.id }, 'No client_secret in PaymentIntent');
      throw new Error('Failed to get payment intent client secret');
    }

    logger.info(
      {
        userId,
        planId,
        subscriptionId: subscription.id,
        invoiceId: invoice.id,
        paymentIntentId: fullPaymentIntent.id,
        amount: fullPaymentIntent.amount,
        status: fullPaymentIntent.status,
      },
      'Stripe subscription created, returning payment intent client secret'
    );

    return {
      subscriptionId: subscription.id,
      clientSecret: fullPaymentIntent.client_secret,
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
    const newPlan = await this.prisma.plan.findUnique({
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
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
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
        if (!subscription.metadata?.userId) {
          logger.error({ subscriptionId: subscription.id }, 'Missing userId in subscription metadata');
          throw new Error('Invalid webhook: missing userId in metadata');
        }
        return {
          eventType: event.type,
          subscriptionId: subscription.id,
          userId: subscription.metadata.userId,
          planId: subscription.metadata.planId,
          action: subscription.status === 'active' ? 'ACTIVATED' : 'UPDATED',
        };

      case 'customer.subscription.deleted':
        if (!subscription.metadata?.userId) {
          logger.error({ subscriptionId: subscription.id }, 'Missing userId in subscription metadata');
          throw new Error('Invalid webhook: missing userId in metadata');
        }
        return {
          eventType: event.type,
          subscriptionId: subscription.id,
          userId: subscription.metadata.userId,
          action: 'CANCELLED',
        };

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id || '';

        // Only process if this is a subscription invoice (not one-time payment)
        if (!subscriptionId) {
          logger.info({ invoiceId: invoice.id }, 'Ignoring invoice.payment_succeeded - not a subscription');
          return {
            eventType: event.type,
            action: 'NONE',
          };
        }

        // Get subscription to access metadata
        const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

        if (!subscription.metadata?.userId) {
          logger.warn({ subscriptionId }, 'Missing userId in subscription metadata for invoice.payment_succeeded');
          return {
            eventType: event.type,
            action: 'NONE',
          };
        }

        // Return PAYMENT_SUCCEEDED action so we can grant credits
        return {
          eventType: event.type,
          subscriptionId,
          userId: subscription.metadata.userId,
          planId: subscription.metadata.planId,
          action: 'PAYMENT_SUCCEEDED',
          metadata: {
            invoiceId: invoice.id,
            amountPaid: invoice.amount_paid,
          },
        };
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        return {
          eventType: event.type,
          subscriptionId: typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id || '',
          action: 'PAYMENT_FAILED',
        };
      }

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
    const userPlan = await this.prisma.userPlan.findFirst({
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
      } catch (_error) {
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
