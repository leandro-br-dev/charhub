# Stripe Payment Provider Tests

## Overview

This directory contains comprehensive unit tests for the Stripe payment integration, focusing on subscription management, payment processing, and webhook handling.

## Test Files

### StripeProvider.test.ts

Complete test suite for the `StripeProvider` class with 17 test cases covering all payment operations.

**Test Coverage:**
- ✅ 100% method coverage
- ✅ All success paths tested
- ✅ All error scenarios validated
- ✅ Webhook signature verification
- ✅ Metadata validation

## Test Structure

### Setup and Mocking

The tests use Jest mocking to isolate the Stripe SDK:

```typescript
// Individual mock functions for each Stripe API method
let mockCustomersCreate: jest.Mock;
let mockSubscriptionsCreate: jest.Mock;
let mockPaymentIntentsCreate: jest.Mock;
let mockWebhooksConstructEvent: jest.Mock;
// ... etc
```

**Why this approach?**
- Prevents real API calls to Stripe
- Fast test execution (< 4 seconds for all tests)
- Predictable test outcomes
- No external dependencies

### Database Setup

Each test uses a clean test database with **dependency injection** to ensure proper isolation:

```typescript
beforeAll(async () => {
  await setupTestDatabase(); // Create test DB
});

beforeEach(async () => {
  await cleanDatabase();     // Clear all data
  await seedTestPlans();     // Seed required plans

  // CRITICAL: Pass test DB instance to provider
  provider = new StripeProvider(getTestDb());
});

afterAll(async () => {
  await teardownTestDatabase(); // Cleanup
});
```

**Why dependency injection?**
- StripeProvider normally uses production Prisma singleton
- Tests require isolated test database instance
- Passing `getTestDb()` ensures tests don't touch production data
- Prevents test failures due to database instance mismatch

## Test Categories

### 1. Constructor Tests (2 tests)

**Purpose:** Validate initialization and configuration

- ✅ Should throw error if `STRIPE_SECRET_KEY` not set
- ✅ Should initialize with correct API version (`2025-02-24.acacia`)

**Why test the constructor?**
- Ensures the provider fails fast with clear error messages
- Validates correct Stripe API version usage

---

### 2. CreateSubscription Tests (3 tests)

**Purpose:** Test subscription creation with PaymentIntent

#### Test 1: Successful Subscription Creation
```typescript
it('should create subscription with payment intent', async () => {
  // Mocks: Customer creation, Subscription creation, PaymentIntent creation
  // Validates: Complete subscription flow with client secret
});
```

**Validates:**
- ✅ Customer created with correct metadata (userId, environment)
- ✅ Subscription created with correct price and settings
- ✅ PaymentIntent created with correct amount
- ✅ Returns subscriptionId, clientSecret, and customerId

#### Test 2: Plan Not Configured
```typescript
it('should throw error if plan not configured for Stripe');
```

**Validates:**
- ✅ Rejects plans without `stripePriceId`
- ✅ Error message: "Plan not configured for Stripe"

#### Test 3: No Invoice Created
```typescript
it('should throw error if no invoice created');
```

**Validates:**
- ✅ Handles edge case where Stripe doesn't create invoice
- ✅ Error message: "No invoice created by Stripe"

---

### 3. CancelSubscription Tests (1 test)

**Purpose:** Validate subscription cancellation

```typescript
it('should cancel subscription at period end', async () => {
  // Validates: cancel_at_period_end flag set
  // Validates: cancellation reason stored
});
```

**Validates:**
- ✅ Sets `cancel_at_period_end: true`
- ✅ Stores cancellation comment in metadata

---

### 4. ReactivateSubscription Tests (1 test)

**Purpose:** Validate subscription reactivation

```typescript
it('should reactivate canceled subscription');
```

**Validates:**
- ✅ Removes `cancel_at_period_end` flag
- ✅ Subscription continues billing

---

### 5. ChangePlan Tests (2 tests)

**Purpose:** Test plan upgrades and downgrades

#### Test 1: Successful Plan Change
```typescript
it('should update subscription to new plan', async () => {
  // Validates: Subscription item updated with new price
  // Validates: Proration enabled
});
```

**Validates:**
- ✅ Retrieves current subscription
- ✅ Updates subscription item with new price
- ✅ Proration behavior: `always_invoice`

#### Test 2: Invalid New Plan
```typescript
it('should throw error if new plan not configured');
```

**Validates:**
- ✅ Rejects plans without `stripePriceId`
- ✅ Error message: "Invalid new plan for Stripe"

---

### 6. GetSubscriptionStatus Tests (1 test)

**Purpose:** Validate status retrieval

```typescript
it('should return subscription status', async () => {
  // Validates: Status, period dates, cancellation flag
});
```

**Validates:**
- ✅ Returns correct status (`active`, `past_due`, etc.)
- ✅ Converts Unix timestamps to JavaScript Dates
- ✅ Returns `cancelAtPeriodEnd` flag

---

### 7. ProcessWebhook Tests (7 tests)

**Purpose:** Comprehensive webhook handling validation

#### Test 1: Signature Verification Success
```typescript
it('should verify webhook signature and process event');
```

**Validates:**
- ✅ Calls `stripe.webhooks.constructEvent` with correct params
- ✅ Processes `customer.subscription.updated` event
- ✅ Returns correct action: `ACTIVATED`

#### Test 2: Missing Webhook Secret
```typescript
it('should throw error if webhook secret not set');
```

**Validates:**
- ✅ Requires `STRIPE_WEBHOOK_SECRET` environment variable

#### Test 3: Invalid Signature
```typescript
it('should throw error if signature verification fails');
```

**Validates:**
- ✅ Catches Stripe signature errors
- ✅ Re-throws with clear message: "Webhook signature verification failed"

#### Test 4: Missing Metadata
```typescript
it('should throw error if metadata.userId is missing');
```

**Validates:**
- ✅ Validates required metadata fields
- ✅ Error message: "Invalid webhook: missing userId in metadata"

**Why is this critical?**
- Prevents processing webhooks without user context
- Ensures data integrity in subscription records

#### Test 5: Subscription Deleted Event
```typescript
it('should handle subscription.deleted event');
```

**Validates:**
- ✅ Returns action: `CANCELLED`
- ✅ Extracts userId from metadata

#### Test 6: Payment Failed Event
```typescript
it('should handle invoice.payment_failed event');
```

**Validates:**
- ✅ Returns action: `PAYMENT_FAILED`
- ✅ Extracts subscriptionId from invoice

#### Test 7: Unknown Events
```typescript
it('should return NONE action for unknown events');
```

**Validates:**
- ✅ Doesn't crash on unexpected event types
- ✅ Returns action: `NONE`

---

## Running the Tests

### Run StripeProvider tests only:
```bash
npm test -- StripeProvider.test.ts
```

### Run all payment tests:
```bash
npm test -- src/services/payments
```

### Run with coverage:
```bash
npm test -- --coverage src/services/payments
```

### Run in watch mode (for development):
```bash
npm test -- --watch StripeProvider.test.ts
```

## Test Output Example

```
PASS src/services/payments/__tests__/StripeProvider.test.ts
  StripeProvider
    constructor
      ✓ should throw error if STRIPE_SECRET_KEY is not set (65 ms)
      ✓ should initialize with correct API version (20 ms)
    createSubscription
      ✓ should create subscription with payment intent (99 ms)
      ✓ should throw error if plan not configured for Stripe (36 ms)
      ✓ should throw error if no invoice created (40 ms)
    cancelSubscription
      ✓ should cancel subscription at period end (17 ms)
    reactivateSubscription
      ✓ should reactivate canceled subscription (14 ms)
    changePlan
      ✓ should update subscription to new plan (21 ms)
      ✓ should throw error if new plan not configured (22 ms)
    getSubscriptionStatus
      ✓ should return subscription status (14 ms)
    processWebhook
      ✓ should verify webhook signature and process event (15 ms)
      ✓ should throw error if webhook secret not set (13 ms)
      ✓ should throw error if signature verification fails (16 ms)
      ✓ should throw error if metadata.userId is missing (16 ms)
      ✓ should handle subscription.deleted event (17 ms)
      ✓ should handle invoice.payment_failed event (17 ms)
      ✓ should return NONE action for unknown events (16 ms)

Test Suites: 1 passed, 1 total
Tests:       17 passed, 17 total
Time:        3.743 s
```

## Common Test Patterns

### 1. Mocking Stripe Responses

```typescript
// Mock successful customer creation
mockCustomersCreate.mockResolvedValue({
  id: 'cus_test_123',
} as Stripe.Customer);

// Mock subscription creation
mockSubscriptionsCreate.mockResolvedValue({
  id: 'sub_test_123',
  latest_invoice: {
    id: 'in_test_123',
    amount_due: 999,
  } as Stripe.Invoice,
  status: 'incomplete',
} as Stripe.Subscription);
```

### 2. Testing Error Scenarios

```typescript
// Mock Stripe error
mockWebhooksConstructEvent.mockImplementation(() => {
  throw new Error('Invalid signature');
});

// Assert error thrown
await expect(
  provider.processWebhook('{}', 'invalid_sig')
).rejects.toThrow('Webhook signature verification failed');
```

### 3. Verifying Mock Calls

```typescript
// Verify correct parameters passed to Stripe
expect(mockCustomersCreate).toHaveBeenCalledWith({
  email: user.email,
  metadata: {
    userId: user.id,
    charhubEnvironment: expect.any(String),
  },
});
```

## Maintenance

### When to Update Tests

1. **Stripe API version change**
   - Update API version in constructor test
   - Verify all method signatures still match

2. **New payment features**
   - Add tests for new methods
   - Update webhook tests for new event types

3. **Metadata changes**
   - Update expected metadata in assertions
   - Add/remove validation tests

4. **Error handling changes**
   - Update error message assertions
   - Add tests for new error scenarios

### Code Coverage Goals

- **Line Coverage:** >95%
- **Branch Coverage:** >90%
- **Function Coverage:** 100%

Current coverage (StripeProvider):
- ✅ All methods tested
- ✅ All error paths covered
- ✅ All webhook event types handled

## Debugging Failed Tests

### Common Issues

1. **Foreign Key Constraint Violations** (CRITICAL)
   ```
   Error: Foreign key constraint violated on CreditTransaction_userId_fkey
   ```
   **Root Cause:** Stale database instance in test factories

   **Fix Applied:** Modified `/src/test-utils/factories.ts` to use fresh DB instance:
   ```typescript
   // ❌ BEFORE - Module-level constant (stale after teardown)
   const db = getTestDb();
   export async function createTestUserWithBalance(balance: number) {
     await db.creditTransaction.create({ ... });
   }

   // ✅ AFTER - Fresh instance on each call
   export async function createTestUserWithBalance(balance: number) {
     const db = getTestDb();  // Fresh instance
     await db.creditTransaction.create({ ... });
   }
   ```

   **Why this happened:**
   - StripeProvider tests call `teardownTestDatabase()` in `afterAll`
   - This disconnects the shared `testDb` singleton
   - Other tests running after get stale connection
   - Solution: Always call `getTestDb()` inside factory functions

2. **Database Connection Errors**
   ```
   Error: Environment variable not found: DATABASE_URL
   ```
   **Fix:** Ensure test environment has DATABASE_URL set in `.env.test`

3. **Missing Environment Variables**
   ```
   Error: STRIPE_SECRET_KEY environment variable is not set
   ```
   **Fix:** Tests automatically set a mock key in `beforeEach`

4. **Mock Not Working**
   ```
   Error: Property 'mockResolvedValue' does not exist
   ```
   **Fix:** Ensure mocks are declared as `jest.Mock` type

### Debug Commands

```bash
# Run tests with verbose output
npm test -- --verbose StripeProvider.test.ts

# Run single test
npm test -- -t "should create subscription with payment intent"

# Debug mode (Node inspector)
node --inspect-brk node_modules/.bin/jest StripeProvider.test.ts
```

## Integration Testing

While unit tests mock the Stripe SDK, integration testing requires:

1. **Stripe Test Mode**
   - Use test API keys (`sk_test_...`)
   - Configure webhook endpoints in Stripe Dashboard
   - Use Stripe CLI for local webhook testing

2. **Test Credit Cards**
   - `4242 4242 4242 4242` - Success
   - `4000 0000 0000 0002` - Card declined
   - `4000 0000 0000 9995` - Insufficient funds

3. **Webhook Testing**
   ```bash
   # Forward webhooks to local server
   stripe listen --forward-to localhost:3001/api/v1/webhooks/stripe

   # Trigger test events
   stripe trigger customer.subscription.created
   stripe trigger invoice.payment_failed
   ```

## Best Practices

1. **Isolate Tests**
   - Each test is independent
   - Database cleaned between tests
   - Mocks reset in `beforeEach`

2. **Test Behavior, Not Implementation**
   - Focus on public API
   - Don't test private methods directly
   - Validate outcomes, not internals

3. **Use Descriptive Names**
   - Test names describe expected behavior
   - Group related tests in `describe` blocks

4. **Keep Tests Fast**
   - Mock external dependencies
   - Use in-memory database for tests
   - Avoid unnecessary delays

5. **Maintain Test Data**
   - Use factories for test objects
   - Keep test data minimal but representative
   - Don't hardcode UUIDs/IDs unnecessarily

## Related Documentation

- [Stripe Integration Guide](../../../../docs/02-guides/development/stripe-integration.md)
- [Payment Provider Interface](../IPaymentProvider.ts)
- [Stripe Provider Implementation](../StripeProvider.ts)
- [Webhook Handler](../../../routes/webhooks/stripe.ts)

## Questions?

For questions about these tests or to report issues:
1. Check the test output for specific error messages
2. Review the Stripe Provider implementation
3. Consult Stripe API documentation: https://stripe.com/docs/api
4. Check Stripe webhook events: https://stripe.com/docs/webhooks

---

**Last Updated:** 2025-12-18 (Updated with test isolation fixes)
**Test Framework:** Jest 29.x
**Stripe SDK Version:** 17.x
**Stripe API Version:** 2025-02-24.acacia
**Test Suite:** 17 tests, 100% passing (91 total with other services)
