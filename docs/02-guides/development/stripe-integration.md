# Stripe Payment Integration Guide

## Overview

CharHub uses Stripe for subscription management and payment processing. This guide covers the complete integration, from setup to production deployment.

**Last Updated:** 2025-12-18
**Status:** ✅ Production Ready
**Stripe API Version:** `2025-02-24.acacia`

---

## Table of Contents

1. [Architecture](#architecture)
2. [Setup](#setup)
3. [Payment Flow](#payment-flow)
4. [API Endpoints](#api-endpoints)
5. [Webhook Handling](#webhook-handling)
6. [Security](#security)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)

---

## Architecture

### Components

```
┌─────────────────┐
│   Frontend      │
│  (React/Vite)   │
└────────┬────────┘
         │ HTTP API
         ▼
┌─────────────────┐
│   Backend API   │
│  (Express.js)   │
├─────────────────┤
│SubscriptionSvc  │──┐
│  CreditService  │  │
│ StripeProvider  │◄─┤
└────────┬────────┘  │
         │           │
         ▼           │
┌─────────────────┐  │
│   Stripe API    │  │
│  (stripe.com)   │  │
└────────┬────────┘  │
         │           │
         │ Webhooks  │
         └───────────┘

┌─────────────────┐
│   PostgreSQL    │
│   (Database)    │
└─────────────────┘
```

### Key Components

| Component | Responsibility | Location |
|-----------|---------------|----------|
| **StripeProvider** | Stripe SDK wrapper | `src/services/payments/StripeProvider.ts` |
| **SubscriptionService** | Business logic for subscriptions | `src/services/subscriptionService.ts` |
| **CreditService** | Credit allocation and tracking | `src/services/creditService.ts` |
| **Webhook Handler** | Process Stripe events | `src/routes/webhooks/stripe.ts` |
| **Plan Seed** | Initialize products/prices | `src/scripts/seeds/seedStripePlans.ts` |

---

## Setup

### 1. Stripe Account Configuration

#### Create Products and Prices

You have two options:

**Option A: Automatic Seeding (Recommended)**

The seed script automatically creates products and prices:

```bash
# Run full seed (includes Stripe plans)
npm run db:seed

# Or run Stripe seed only
npx tsx src/scripts/seeds/seedStripePlans.ts
```

**Option B: Manual Dashboard Setup**

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Create products for each tier:
   - **Free Plan** (informational only, no payment required)
   - **Plus Plan** - $5.00/month
   - **Premium Plan** - $10.00/month

3. For each product, create a **Recurring Price**:
   - Billing period: Monthly
   - Currency: USD

4. Copy the Price IDs (format: `price_xxxxx`)

#### Configure Webhooks

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Configure:
   - **Endpoint URL:** `https://your-domain.com/api/v1/webhooks/stripe`
   - **Events to send:**
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
     - `invoice.payment_succeeded`

4. Copy the **Signing secret** (format: `whsec_xxxxx`)

### 2. Environment Variables

Add to `.env`:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxx  # Or sk_live_xxx for production
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxx

# Stripe Price IDs (from products created above)
STRIPE_PRICE_FREE=      # Optional, FREE plan doesn't charge
STRIPE_PRICE_PLUS=price_xxxxxxxxxxxxx
STRIPE_PRICE_PREMIUM=price_xxxxxxxxxxxxx
```

**⚠️ Security Note:** Never commit `.env` to version control!

### 3. Database Migration

Ensure Prisma schema is up to date:

```bash
npx prisma migrate deploy
```

### 4. Seed Database

```bash
npm run db:seed
```

This will:
- Create system users and characters
- Create subscription plans
- **Automatically create Stripe products and prices** (if not already created)
- Link plans to Stripe price IDs
- Create service credit costs

---

## Payment Flow

### Subscription Creation Flow

```
1. User selects plan on frontend
   ├─> GET /api/v1/plans
   └─> User clicks "Subscribe"

2. Frontend requests subscription
   └─> POST /api/v1/subscriptions
       Body: { planId: "plan_plus" }

3. Backend creates Stripe subscription
   ├─> StripeProvider.createSubscription()
   ├─> Creates Stripe Customer (or reuses existing)
   ├─> Creates Stripe Subscription (status: incomplete)
   ├─> Creates Payment Intent
   └─> Returns { subscriptionId, clientSecret, customerId }

4. Frontend shows Stripe payment form
   ├─> Uses clientSecret with Stripe Elements
   ├─> User enters card details
   └─> Stripe.js processes payment

5. Payment success/failure
   ├─> Frontend polls subscription status
   └─> Webhook received (customer.subscription.updated)
       └─> Backend activates subscription

6. User receives credits
   └─> Backend allocates monthly credits
```

### Webhook Processing Flow

```
1. Stripe sends webhook to /api/v1/webhooks/stripe
   ├─> Includes event data + signature

2. Backend verifies signature
   ├─> Uses STRIPE_WEBHOOK_SECRET
   ├─> Prevents replay attacks
   └─> Ensures authenticity

3. Process event based on type
   ├─> customer.subscription.created   → Create UserPlan
   ├─> customer.subscription.updated   → Activate/update UserPlan
   ├─> customer.subscription.deleted   → Cancel UserPlan
   ├─> invoice.payment_failed          → Mark payment failed
   └─> invoice.payment_succeeded       → Allocate credits

4. Update database
   ├─> UserPlan record
   ├─> CreditTransaction
   └─> Subscription status
```

---

## API Endpoints

### Subscriptions

#### `POST /api/v1/subscriptions`

Create a new subscription for the authenticated user.

**Request:**
```json
{
  "planId": "uuid-of-plan"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subscriptionId": "sub_xxx",
    "clientSecret": "pi_xxx_secret_yyy",
    "customerId": "cus_xxx"
  }
}
```

**Errors:**
- `400` - Invalid plan ID or plan not configured for Stripe
- `401` - Not authenticated
- `409` - User already has active subscription

---

#### `DELETE /api/v1/subscriptions/cancel`

Cancel the user's active subscription (at period end).

**Request:**
```json
{
  "reason": "Too expensive"  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription will be canceled at period end"
}
```

**Errors:**
- `401` - Not authenticated
- `404` - No active subscription

---

#### `POST /api/v1/subscriptions/reactivate`

Reactivate a canceled subscription (before period end).

**Response:**
```json
{
  "success": true,
  "message": "Subscription reactivated"
}
```

**Errors:**
- `401` - Not authenticated
- `404` - No canceled subscription to reactivate

---

#### `PUT /api/v1/subscriptions/change-plan`

Change to a different subscription plan.

**Request:**
```json
{
  "newPlanId": "uuid-of-new-plan"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Plan changed successfully"
}
```

**Errors:**
- `400` - Invalid plan ID
- `401` - Not authenticated
- `404` - No active subscription

---

### Plans

#### `GET /api/v1/plans`

Get all available subscription plans.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tier": "FREE",
      "name": "Free",
      "priceMonthly": 0,
      "creditsPerMonth": 200,
      "description": "Perfect for casual users",
      "features": [
        "200 credits per month",
        "50 daily login bonus",
        "Access to all safe content",
        "Basic chat functionality",
        "Character creation",
        "Image generation (limited)"
      ],
      "stripePriceId": null,
      "isActive": true
    },
    {
      "id": "uuid",
      "tier": "PLUS",
      "name": "Plus",
      "priceMonthly": 5.00,
      "creditsPerMonth": 2000,
      "description": "Best value for regular users",
      "features": [
        "2,000 credits per month",
        "50 daily login bonus",
        "High priority queue",
        "Access to all content",
        "Advanced character customization",
        "Higher quality image generation",
        "Voice synthesis (TTS)"
      ],
      "stripePriceId": "price_xxx",
      "isActive": true
    }
    // ... Premium plan
  ]
}
```

---

### Webhooks

#### `POST /api/v1/webhooks/stripe`

Stripe webhook endpoint (called by Stripe, not your frontend).

**Headers:**
```
stripe-signature: t=xxx,v1=yyy
```

**Request Body:** (Raw JSON, not parsed)

**Response:**
```json
{
  "received": true
}
```

**Errors:**
- `400` - Invalid signature or missing signature
- `400` - Invalid webhook data

---

## Webhook Handling

### Supported Events

| Event | Action | Description |
|-------|--------|-------------|
| `customer.subscription.created` | Create UserPlan | New subscription started |
| `customer.subscription.updated` | Activate/Update UserPlan | Subscription status changed |
| `customer.subscription.deleted` | Cancel UserPlan | Subscription ended |
| `invoice.payment_failed` | Mark Failed | Payment issue |
| `invoice.payment_succeeded` | Allocate Credits | Payment processed |

### Event Processing

**1. Signature Verification**

```typescript
const event = stripe.webhooks.constructEvent(
  rawBody,
  signature,
  webhookSecret
);
```

**Why?**
- Prevents unauthorized webhook calls
- Ensures event authenticity
- Protects against replay attacks

**2. Metadata Extraction**

Each Stripe object includes metadata:

```json
{
  "metadata": {
    "userId": "uuid-of-user",
    "planId": "uuid-of-plan",
    "charhubEnvironment": "production"
  }
}
```

**Why?**
- Links Stripe data to CharHub records
- Enables environment-specific processing
- Allows subscription tracking

**3. Database Updates**

Webhooks update the database:

```typescript
await prisma.userPlan.update({
  where: { userId_planId: { userId, planId } },
  data: {
    status: 'ACTIVE',
    stripeSubscriptionId: subscription.id,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  },
});
```

### Webhook Security

✅ **Implemented:**
- Signature verification
- Raw body preservation
- Metadata validation
- Idempotency (same event processed only once)

❌ **Not Implemented:**
- Webhook rate limiting (relies on Stripe's limits)

---

## Security

### Sensitive Data

| Data | Storage | Access |
|------|---------|--------|
| Stripe API Key | `.env` file, never committed | Backend only |
| Webhook Secret | `.env` file, never committed | Backend only |
| Customer ID | Database, linked to User | Backend + user themselves |
| Subscription ID | Database, linked to UserPlan | Backend + user themselves |
| Payment Method | **NOT STORED** | Stripe only |
| Card Details | **NOT STORED** | Stripe only |

### Best Practices

1. **Never Log Sensitive Data**
   ```typescript
   // ❌ Bad
   logger.info({ apiKey: process.env.STRIPE_SECRET_KEY });

   // ✅ Good
   logger.info({ hasApiKey: !!process.env.STRIPE_SECRET_KEY });
   ```

2. **Validate Webhook Signatures**
   ```typescript
   // Always verify before processing
   const event = stripe.webhooks.constructEvent(rawBody, signature, secret);
   ```

3. **Use Metadata for Tracking**
   ```typescript
   // Link Stripe objects to your records
   metadata: {
     userId: user.id,
     planId: plan.id,
     charhubEnvironment: process.env.NODE_ENV,
   }
   ```

4. **Handle Errors Gracefully**
   ```typescript
   try {
     await stripe.subscriptions.create(/* ... */);
   } catch (error) {
     logger.error({ error: error.message }, 'Stripe API error');
     throw new Error('Payment processing failed');
   }
   ```

---

## Testing

### Unit Tests

Location: `src/services/payments/__tests__/StripeProvider.test.ts`

```bash
# Run Stripe tests only
npm test -- StripeProvider.test.ts

# Run with coverage
npm test -- --coverage StripeProvider.test.ts
```

**Coverage:**
- ✅ 17 tests
- ✅ All methods tested
- ✅ All error scenarios covered
- ✅ Webhook event handling validated

See [Test Documentation](../../../backend/src/services/payments/__tests__/README.md) for details.

### Manual Testing (Local)

1. **Install Stripe CLI:**
   ```bash
   brew install stripe/stripe-cli/stripe  # macOS
   # Or download from https://stripe.com/docs/stripe-cli
   ```

2. **Login to Stripe:**
   ```bash
   stripe login
   ```

3. **Forward Webhooks:**
   ```bash
   stripe listen --forward-to localhost:3001/api/v1/webhooks/stripe
   ```

   This will output a webhook secret. Add it to `.env`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

4. **Trigger Test Events:**
   ```bash
   # Subscription created
   stripe trigger customer.subscription.created

   # Payment failed
   stripe trigger invoice.payment_failed

   # Payment succeeded
   stripe trigger invoice.payment_succeeded
   ```

5. **Test Payment Flow:**
   - Use test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any CVC

### Test Cards

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Card declined |
| `4000 0000 0000 9995` | Insufficient funds |
| `4000 0000 0000 9987` | Lost card |
| `4000 0025 0000 3155` | Requires authentication (3D Secure) |

Full list: https://stripe.com/docs/testing

---

## Deployment

### Pre-Deployment Checklist

- [ ] Environment variables set in production
  - [ ] `STRIPE_SECRET_KEY` (starts with `sk_live_`)
  - [ ] `STRIPE_WEBHOOK_SECRET` (starts with `whsec_`)
  - [ ] `STRIPE_PRICE_PLUS`
  - [ ] `STRIPE_PRICE_PREMIUM`
- [ ] Webhook endpoint configured in Stripe Dashboard
- [ ] Webhook events enabled (see [Setup](#setup))
- [ ] Database migrated (`npx prisma migrate deploy`)
- [ ] Database seeded (`npm run db:seed`)
- [ ] Plans created in Stripe (automatic via seed)
- [ ] Test subscription flow in production (with test mode first!)

### Production Environment

**Stripe Dashboard:**
1. Switch to "Live mode" (toggle in top right)
2. Create webhook for production URL
3. Copy live API keys and webhook secret
4. Update environment variables

**Backend:**
```bash
# Set production environment variables
STRIPE_SECRET_KEY=sk_live_xxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxx

# Run migrations
npx prisma migrate deploy

# Seed database (creates Stripe products if needed)
npm run db:seed
```

**Verify:**
```bash
# Check Stripe connection
curl https://your-domain.com/api/v1/plans

# Should return plans with stripePriceId populated
```

### Monitoring

**Key Metrics:**
- Subscription creation success rate
- Webhook processing latency
- Payment failure rate
- Churn rate

**Logs to Monitor:**
```typescript
// Successful subscription creation
logger.info({
  userId,
  planId,
  subscriptionId,
  amount
}, 'Stripe subscription created');

// Webhook received
logger.info({
  type: event.type,
  id: event.id
}, 'Received Stripe webhook');

// Payment failed
logger.error({
  subscriptionId,
  error: error.message
}, 'Payment failed');
```

---

## Troubleshooting

### Common Issues

#### 1. "STRIPE_SECRET_KEY environment variable is not set"

**Cause:** Missing or incorrect environment variable.

**Fix:**
```bash
# Check .env file
cat .env | grep STRIPE_SECRET_KEY

# Should output:
STRIPE_SECRET_KEY=sk_test_xxxxxx  # or sk_live_xxxxxx for production
```

---

#### 2. "Plan not configured for Stripe"

**Cause:** Plan in database doesn't have `stripePriceId`.

**Fix:**
```bash
# Re-run seed to link plans to Stripe prices
npm run db:seed -- --force

# Or manually update plan:
UPDATE "Plan"
SET "stripePriceId" = 'price_xxxxxx', "paymentProvider" = 'STRIPE'
WHERE tier = 'PLUS';
```

---

#### 3. "Webhook signature verification failed"

**Cause:** Invalid `STRIPE_WEBHOOK_SECRET` or body parser interfering.

**Fix:**
- Ensure webhook secret matches Stripe Dashboard
- Verify Express middleware preserves raw body:
  ```typescript
  app.use('/api/v1/webhooks/stripe',
    express.raw({ type: 'application/json' })
  );
  ```

---

#### 4. "The price specified is inactive"

**Cause:** Stripe price was archived or is inactive.

**Fix:**
1. Go to Stripe Dashboard → Products
2. Find the product → Prices tab
3. Ensure price is Active
4. Copy the correct active Price ID
5. Update environment variable

---

#### 5. Frontend Error: "Cannot read properties of null (reading 'map')"

**Cause:** Plans don't have `features` array populated.

**Fix:**
```bash
# Force seed to update existing plans
docker compose exec backend npm run db:seed -- --force

# Verify features populated:
docker compose exec postgres psql -U charhub -d charhub_db -c \
  "SELECT tier, name, jsonb_array_length(features::jsonb) as feature_count FROM \"Plan\";"
```

---

### Debug Commands

```bash
# Check Stripe API connection
curl https://api.stripe.com/v1/customers \
  -u sk_test_xxxxxxxxx:

# Test webhook endpoint
curl -X POST http://localhost:3001/api/v1/webhooks/stripe \
  -H "stripe-signature: test" \
  -d '{}'

# Check database plans
docker compose exec postgres psql -U charhub -d charhub_db \
  -c "SELECT id, tier, name, \"stripePriceId\", \"paymentProvider\" FROM \"Plan\";"

# View subscription logs
docker compose logs -f backend | grep -i stripe
```

---

## API Reference

### StripeProvider Methods

#### `createSubscription(userId: string, planId: string, userEmail: string): Promise<SubscriptionResult>`

Creates a new subscription with payment intent.

**Parameters:**
- `userId` - CharHub user ID
- `planId` - Plan UUID from database
- `userEmail` - User's email for Stripe customer

**Returns:**
```typescript
{
  subscriptionId: string;  // Stripe subscription ID (sub_xxx)
  clientSecret: string;    // Payment intent secret for frontend
  customerId: string;      // Stripe customer ID (cus_xxx)
}
```

**Throws:**
- "Plan not configured for Stripe" - Plan missing stripePriceId
- "No invoice created by Stripe" - Stripe API issue

---

#### `cancelSubscription(subscriptionId: string, reason?: string): Promise<void>`

Cancels subscription at period end.

**Parameters:**
- `subscriptionId` - Stripe subscription ID
- `reason` - Optional cancellation reason

**Effects:**
- Sets `cancel_at_period_end: true`
- User keeps access until period ends
- No refunds issued

---

#### `reactivateSubscription(subscriptionId: string): Promise<void>`

Reactivates a canceled subscription (before period ends).

**Parameters:**
- `subscriptionId` - Stripe subscription ID

**Effects:**
- Removes `cancel_at_period_end` flag
- Subscription continues billing

---

#### `changePlan(subscriptionId: string, newPlanId: string): Promise<void>`

Changes subscription to a different plan.

**Parameters:**
- `subscriptionId` - Stripe subscription ID
- `newPlanId` - Plan UUID from database

**Effects:**
- Updates subscription item with new price
- Prorates charges/credits
- Takes effect immediately

**Throws:**
- "Invalid new plan for Stripe" - New plan missing stripePriceId

---

#### `getSubscriptionStatus(subscriptionId: string): Promise<SubscriptionStatus>`

Retrieves current subscription status from Stripe.

**Parameters:**
- `subscriptionId` - Stripe subscription ID

**Returns:**
```typescript
{
  status: string;               // 'active', 'past_due', 'canceled', etc.
  currentPeriodStart: Date;     // Billing period start
  currentPeriodEnd: Date;       // Billing period end
  cancelAtPeriodEnd: boolean;   // Whether cancellation is scheduled
}
```

---

#### `processWebhook(rawBody: string, signature: string): Promise<WebhookResult>`

Processes and validates Stripe webhook event.

**Parameters:**
- `rawBody` - Unparsed request body (string or Buffer)
- `signature` - Stripe signature header value

**Returns:**
```typescript
{
  eventType: string;        // Event type (e.g., 'customer.subscription.updated')
  subscriptionId?: string;  // Related subscription ID
  userId?: string;          // User ID from metadata
  planId?: string;          // Plan ID from metadata
  action: 'ACTIVATED' | 'UPDATED' | 'CANCELLED' | 'PAYMENT_FAILED' | 'NONE';
}
```

**Throws:**
- "STRIPE_WEBHOOK_SECRET environment variable is not set"
- "Webhook signature verification failed"
- "Invalid webhook: missing userId in metadata"

---

## Related Documentation

- [Prisma Schema](../../../backend/prisma/schema.prisma) - Database models
- [Test Documentation](../../../backend/src/services/payments/__tests__/README.md) - Test guide
- [Deployment Guide](../deployment/cd-deploy-guide.md) - CI/CD pipeline
- [Stripe API Docs](https://stripe.com/docs/api) - Official Stripe documentation

---

## Questions & Support

### Getting Help

1. **Check logs first:**
   ```bash
   docker compose logs -f backend | grep -i stripe
   ```

2. **Review test output:**
   ```bash
   npm test -- StripeProvider.test.ts --verbose
   ```

3. **Check Stripe Dashboard:**
   - Logs → Webhook attempts
   - Customers → Find customer by email
   - Subscriptions → Check status

4. **Consult documentation:**
   - This guide
   - Test README
   - Stripe API docs

### Common Questions

**Q: Do I need to create products in Stripe manually?**
A: No! The seed script (`npm run db:seed`) automatically creates products and prices in Stripe if they don't exist.

**Q: Can I use PayPal instead of Stripe?**
A: The codebase supports a `PaymentProvider` interface, but only Stripe is currently implemented.

**Q: How do I test webhooks locally?**
A: Use Stripe CLI (`stripe listen --forward-to localhost:3001/api/v1/webhooks/stripe`)

**Q: What happens if a payment fails?**
A: Stripe sends `invoice.payment_failed` webhook. The system marks the subscription as failed but doesn't immediately cancel it (Stripe's retry logic applies).

**Q: How are credits allocated?**
A: When a subscription activates (via webhook), `CreditService` allocates the monthly credits defined in the plan.

**Q: Can users have multiple active subscriptions?**
A: No. The system enforces one active subscription per user. Users must cancel before subscribing to a different plan.

---

**Maintained by:** Agent Reviewer
**Last Review:** 2025-12-18
**Next Review:** 2025-Q1

