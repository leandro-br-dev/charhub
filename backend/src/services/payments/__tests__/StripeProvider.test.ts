/**
 * Stripe Provider Unit Tests
 * Tests for Stripe payment provider with mocked Stripe SDK
 */

import { StripeProvider } from '../StripeProvider';
import { setupTestDatabase, cleanDatabase, teardownTestDatabase, seedTestPlans } from '../../../test-utils/database';
import { createTestUser } from '../../../test-utils/factories';
import { getTestDb } from '../../../test-utils/database';
import Stripe from 'stripe';

// Mock Stripe
jest.mock('stripe');

describe('StripeProvider', () => {
  let provider: StripeProvider;
  let mockStripe: any;
  let mockCustomersCreate: jest.Mock;
  let mockCustomersRetrieve: jest.Mock;
  let mockSubscriptionsCreate: jest.Mock;
  let mockSubscriptionsRetrieve: jest.Mock;
  let mockSubscriptionsUpdate: jest.Mock;
  let mockPaymentIntentsCreate: jest.Mock;
  let mockPaymentIntentsRetrieve: jest.Mock;
  let mockProductsCreate: jest.Mock;
  let mockPricesCreate: jest.Mock;
  let mockWebhooksConstructEvent: jest.Mock;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
    await seedTestPlans();

    // Clear all mocks
    jest.clearAllMocks();

    // Set required environment variable
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key_for_testing';

    // Setup individual mock functions
    mockCustomersCreate = jest.fn();
    mockCustomersRetrieve = jest.fn();
    mockSubscriptionsCreate = jest.fn();
    mockSubscriptionsRetrieve = jest.fn();
    mockSubscriptionsUpdate = jest.fn();
    mockPaymentIntentsCreate = jest.fn();
    mockPaymentIntentsRetrieve = jest.fn();
    mockProductsCreate = jest.fn();
    mockPricesCreate = jest.fn();
    mockWebhooksConstructEvent = jest.fn();

    // Setup Stripe mock object
    mockStripe = {
      subscriptions: {
        create: mockSubscriptionsCreate,
        retrieve: mockSubscriptionsRetrieve,
        update: mockSubscriptionsUpdate,
      },
      customers: {
        create: mockCustomersCreate,
        retrieve: mockCustomersRetrieve,
      },
      paymentIntents: {
        create: mockPaymentIntentsCreate,
        retrieve: mockPaymentIntentsRetrieve,
      },
      products: {
        create: mockProductsCreate,
      },
      prices: {
        create: mockPricesCreate,
      },
      webhooks: {
        constructEvent: mockWebhooksConstructEvent,
      },
    };

    (Stripe as any).mockImplementation(() => mockStripe);

    // Pass test Prisma instance to provider
    provider = new StripeProvider(getTestDb());
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('constructor', () => {
    it('should throw error if STRIPE_SECRET_KEY is not set', () => {
      const originalKey = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;

      expect(() => new StripeProvider()).toThrow('STRIPE_SECRET_KEY environment variable is not set');

      process.env.STRIPE_SECRET_KEY = originalKey;
    });

    it('should initialize with correct API version', () => {
      expect(Stripe).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          apiVersion: '2025-02-24.acacia',
        })
      );
    });
  });

  describe('createSubscription', () => {
    it('should create subscription with payment intent', async () => {
      const prisma = getTestDb();
      const user = await createTestUser();
      const plan = await prisma.plan.findFirst({ where: { tier: 'PLUS' } });

      if (!plan) throw new Error('Test plan not found');

      // Update plan with Stripe price ID
      await prisma.plan.update({
        where: { id: plan.id },
        data: { stripePriceId: 'price_test_123' },
      });

      // Mock customer creation
      mockCustomersCreate.mockResolvedValue({
        id: 'cus_test_123',
      } as Stripe.Customer);

      // Mock subscription creation with payment intent in invoice
      mockSubscriptionsCreate.mockResolvedValue({
        id: 'sub_test_123',
        latest_invoice: {
          id: 'in_test_123',
          amount_due: 999,
          payment_intent: 'pi_test_123', // Stripe creates this automatically
        } as Stripe.Invoice,
        status: 'incomplete',
        customer: 'cus_test_123',
      } as Stripe.Subscription);

      // Mock payment intent retrieval (not creation)
      mockPaymentIntentsRetrieve.mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret',
        amount: 999,
        status: 'requires_payment_method',
      } as Stripe.PaymentIntent);

      if (!user.email) throw new Error('Test user has no email');

      const result = await provider.createSubscription(user.id, plan.id, user.email);

      expect(result).toEqual({
        subscriptionId: 'sub_test_123',
        clientSecret: 'pi_test_123_secret',
        customerId: 'cus_test_123',
      });

      expect(mockCustomersCreate).toHaveBeenCalledWith({
        email: user.email,
        metadata: {
          userId: user.id,
          charhubEnvironment: expect.any(String),
        },
      });

      expect(mockSubscriptionsCreate).toHaveBeenCalledWith({
        customer: 'cus_test_123',
        items: [{ price: 'price_test_123' }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'], // Updated to expand payment_intent
        metadata: {
          userId: user.id,
          planId: plan.id,
          charhubEnvironment: expect.any(String),
        },
      });

      // Verify PaymentIntent was retrieved (not created)
      expect(mockPaymentIntentsRetrieve).toHaveBeenCalledWith('pi_test_123');

      // PaymentIntent should NOT be created manually anymore
      expect(mockPaymentIntentsCreate).not.toHaveBeenCalled();
    });

    it('should throw error if plan not configured for Stripe', async () => {
      const prisma = getTestDb();
      const user = await createTestUser();
      const plan = await prisma.plan.findFirst({ where: { tier: 'PLUS' } });

      if (!plan) throw new Error('Test plan not found');

      // Ensure stripePriceId is null
      await prisma.plan.update({
        where: { id: plan.id },
        data: { stripePriceId: null },
      });

      if (!user.email) throw new Error('Test user has no email');

      await expect(
        provider.createSubscription(user.id, plan.id, user.email)
      ).rejects.toThrow('Plan not configured for Stripe');
    });

    it('should throw error if no invoice created', async () => {
      const prisma = getTestDb();
      const user = await createTestUser();
      const plan = await prisma.plan.findFirst({ where: { tier: 'PLUS' } });

      if (!plan) throw new Error('Test plan not found');

      await prisma.plan.update({
        where: { id: plan.id },
        data: { stripePriceId: 'price_test_123' },
      });

      mockCustomersCreate.mockResolvedValue({
        id: 'cus_test_123',
      } as Stripe.Customer);

      // Mock subscription without invoice
      mockSubscriptionsCreate.mockResolvedValue({
        id: 'sub_test_123',
        latest_invoice: null,
        status: 'incomplete',
      } as Stripe.Subscription);

      if (!user.email) throw new Error('Test user has no email');

      await expect(
        provider.createSubscription(user.id, plan.id, user.email)
      ).rejects.toThrow('No invoice created by Stripe');
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription at period end', async () => {
      mockSubscriptionsUpdate.mockResolvedValue({
        id: 'sub_test_123',
        cancel_at_period_end: true,
      } as Stripe.Subscription);

      await provider.cancelSubscription('sub_test_123', 'User requested');

      expect(mockSubscriptionsUpdate).toHaveBeenCalledWith('sub_test_123', {
        cancel_at_period_end: true,
        cancellation_details: {
          comment: 'User requested',
        },
      });
    });
  });

  describe('reactivateSubscription', () => {
    it('should reactivate canceled subscription', async () => {
      mockSubscriptionsUpdate.mockResolvedValue({
        id: 'sub_test_123',
        cancel_at_period_end: false,
      } as Stripe.Subscription);

      await provider.reactivateSubscription('sub_test_123');

      expect(mockSubscriptionsUpdate).toHaveBeenCalledWith('sub_test_123', {
        cancel_at_period_end: false,
      });
    });
  });

  describe('changePlan', () => {
    it('should update subscription to new plan', async () => {
      const prisma = getTestDb();
      const newPlan = await prisma.plan.findFirst({ where: { tier: 'PREMIUM' } });

      if (!newPlan) throw new Error('Test plan not found');

      await prisma.plan.update({
        where: { id: newPlan.id },
        data: { stripePriceId: 'price_premium_123' },
      });

      mockSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_test_123',
        items: {
          data: [{ id: 'si_test_123' }],
        },
      } as Stripe.Subscription);

      mockSubscriptionsUpdate.mockResolvedValue({
        id: 'sub_test_123',
      } as Stripe.Subscription);

      await provider.changePlan('sub_test_123', newPlan.id);

      expect(mockSubscriptionsUpdate).toHaveBeenCalledWith('sub_test_123', {
        items: [
          {
            id: 'si_test_123',
            price: 'price_premium_123',
          },
        ],
        proration_behavior: 'always_invoice',
      });
    });

    it('should throw error if new plan not configured', async () => {
      const prisma = getTestDb();
      const newPlan = await prisma.plan.findFirst({ where: { tier: 'PREMIUM' } });

      if (!newPlan) throw new Error('Test plan not found');

      await prisma.plan.update({
        where: { id: newPlan.id },
        data: { stripePriceId: null },
      });

      await expect(
        provider.changePlan('sub_test_123', newPlan.id)
      ).rejects.toThrow('Invalid new plan for Stripe');
    });
  });

  describe('getSubscriptionStatus', () => {
    it('should return subscription status', async () => {
      const now = Math.floor(Date.now() / 1000);

      mockSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_test_123',
        status: 'active',
        current_period_start: now,
        current_period_end: now + 2592000, // +30 days
        cancel_at_period_end: false,
      } as Stripe.Subscription);

      const status = await provider.getSubscriptionStatus('sub_test_123');

      expect(status).toEqual({
        status: 'active',
        currentPeriodStart: new Date(now * 1000),
        currentPeriodEnd: new Date((now + 2592000) * 1000),
        cancelAtPeriodEnd: false,
      });
    });
  });

  describe('processWebhook', () => {
    it('should verify webhook signature and process event', async () => {
      const rawBody = JSON.stringify({ type: 'customer.subscription.updated' });
      const signature = 'test_signature';

      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

      mockWebhooksConstructEvent.mockReturnValue({
        id: 'evt_test_123',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test_123',
            status: 'active',
            metadata: {
              userId: 'user_123',
              planId: 'plan_plus',
            },
          },
        },
      } as any);

      const result = await provider.processWebhook(rawBody, signature);

      expect(result).toEqual({
        eventType: 'customer.subscription.updated',
        subscriptionId: 'sub_test_123',
        userId: 'user_123',
        planId: 'plan_plus',
        action: 'ACTIVATED',
      });

      expect(mockWebhooksConstructEvent).toHaveBeenCalledWith(
        rawBody,
        signature,
        'whsec_test'
      );
    });

    it('should throw error if webhook secret not set', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;

      await expect(
        provider.processWebhook('{}', 'sig')
      ).rejects.toThrow('STRIPE_WEBHOOK_SECRET environment variable is not set');
    });

    it('should throw error if signature verification fails', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

      mockWebhooksConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(
        provider.processWebhook('{}', 'invalid_sig')
      ).rejects.toThrow('Webhook signature verification failed');
    });

    it('should throw error if metadata.userId is missing', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

      mockWebhooksConstructEvent.mockReturnValue({
        id: 'evt_test_123',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test_123',
            status: 'active',
            metadata: {},
          },
        },
      } as any);

      await expect(
        provider.processWebhook('{}', 'sig')
      ).rejects.toThrow('Invalid webhook: missing userId in metadata');
    });

    it('should handle subscription.deleted event', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

      mockWebhooksConstructEvent.mockReturnValue({
        id: 'evt_test_123',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test_123',
            metadata: {
              userId: 'user_123',
            },
          },
        },
      } as any);

      const result = await provider.processWebhook('{}', 'sig');

      expect(result).toEqual({
        eventType: 'customer.subscription.deleted',
        subscriptionId: 'sub_test_123',
        userId: 'user_123',
        action: 'CANCELLED',
      });
    });

    it('should handle invoice.payment_failed event', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

      mockWebhooksConstructEvent.mockReturnValue({
        id: 'evt_test_123',
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_test_123',
            subscription: 'sub_test_123',
          },
        },
      } as any);

      const result = await provider.processWebhook('{}', 'sig');

      expect(result).toEqual({
        eventType: 'invoice.payment_failed',
        subscriptionId: 'sub_test_123',
        action: 'PAYMENT_FAILED',
      });
    });

    it('should return NONE action for unknown events', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

      mockWebhooksConstructEvent.mockReturnValue({
        id: 'evt_test_123',
        type: 'unknown.event.type',
        data: {
          object: {},
        },
      } as any);

      const result = await provider.processWebhook('{}', 'sig');

      expect(result).toEqual({
        eventType: 'unknown.event.type',
        action: 'NONE',
      });
    });
  });
});
