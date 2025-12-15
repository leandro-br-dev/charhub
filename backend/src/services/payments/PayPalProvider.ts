/**
 * PayPal Payment Provider
 *
 * Implementation of IPaymentProvider for PayPal subscriptions
 */

import { PrismaClient } from '../../generated/prisma';
import { requirePayPal } from '../../config/paypal';
import { logger } from '../../config/logger';
import {
  IPaymentProvider,
  SubscriptionResult,
  WebhookResult,
  SubscriptionStatus,
} from './IPaymentProvider';
import {
  SubscriptionsController,
  ExperienceContextShippingPreference,
  ApplicationContextUserAction,
} from '@paypal/paypal-server-sdk';

const prisma = new PrismaClient();

export class PayPalProvider implements IPaymentProvider {
  private controller: SubscriptionsController;

  constructor() {
    const client = requirePayPal();
    this.controller = new SubscriptionsController(client);
  }

  async createSubscription(
    userId: string,
    planId: string,
    _userEmail: string
  ): Promise<SubscriptionResult> {
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    if (!user) {
      throw new Error('User not found');
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

    // Create PayPal subscription
    const response = await this.controller.createSubscription({
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

  async cancelSubscription(subscriptionId: string, reason?: string): Promise<void> {
    await this.controller.cancelSubscription({
      id: subscriptionId,
      body: {
        reason: reason || 'Customer requested cancellation',
      },
    });

    logger.info({ subscriptionId }, 'PayPal subscription canceled');
  }

  async reactivateSubscription(subscriptionId: string): Promise<void> {
    await this.controller.activateSubscription({
      id: subscriptionId,
      body: {
        reason: 'Reactivating on customer request',
      },
    });

    logger.info({ subscriptionId }, 'PayPal subscription reactivated');
  }

  async changePlan(subscriptionId: string, newPlanId: string): Promise<void> {
    const newPlan = await prisma.plan.findUnique({
      where: { id: newPlanId },
    });

    if (!newPlan || !newPlan.isActive || !newPlan.paypalPlanId) {
      throw new Error('Invalid new plan');
    }

    await this.controller.reviseSubscription({
      id: subscriptionId,
      body: {
        planId: newPlan.paypalPlanId,
      },
    });

    logger.info({ subscriptionId, newPlanId }, 'PayPal plan changed');
  }

  async getSubscriptionStatus(subscriptionId: string): Promise<SubscriptionStatus> {
    const response = await this.controller.getSubscription({
      id: subscriptionId,
    });

    const subscription = response.result;

    // Parse dates from PayPal response
    const billingInfo = (subscription as any).billingInfo || (subscription as any).billing_info;
    const startDate = billingInfo?.nextBillingTime || billingInfo?.next_billing_time
      ? new Date(billingInfo.lastPayment?.time || billingInfo.last_payment?.time || new Date())
      : new Date();
    const endDate = billingInfo?.nextBillingTime || billingInfo?.next_billing_time
      ? new Date(billingInfo.nextBillingTime || billingInfo.next_billing_time)
      : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const subscriptionStatus = (subscription as any).status || 'UNKNOWN';

    return {
      status: subscriptionStatus,
      currentPeriodStart: startDate,
      currentPeriodEnd: endDate,
      cancelAtPeriodEnd: subscriptionStatus === 'CANCELLED',
    };
  }

  async processWebhook(event: any, _signature?: string): Promise<WebhookResult> {
    // PayPal webhook processing
    // Note: PayPal webhook verification should be implemented here
    // For now, we'll process the event without verification

    const eventType = event.event_type;
    const resource = event.resource;

    logger.info({ type: eventType, id: event.id }, 'Received PayPal webhook');

    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
      case 'BILLING.SUBSCRIPTION.UPDATED':
        return {
          eventType,
          subscriptionId: resource.id,
          userId: resource.custom_id,
          action: 'ACTIVATED',
          metadata: {
            billingInfo: resource.billing_info,
          },
        };

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.EXPIRED':
        return {
          eventType,
          subscriptionId: resource.id,
          userId: resource.custom_id,
          action: 'CANCELLED',
        };

      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        return {
          eventType,
          subscriptionId: resource.id,
          userId: resource.custom_id,
          action: 'PAYMENT_FAILED',
        };

      default:
        return {
          eventType,
          action: 'NONE',
        };
    }
  }
}
