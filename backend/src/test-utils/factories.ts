/**
 * Test data factories
 * Helper functions to create test data
 */
import { getTestDb } from './database';

/**
 * Create test user
 */
export async function createTestUser(overrides: any = {}) {
  const db = getTestDb();

  const timestamp = Date.now();
  const defaultData = {
    email: `test-${timestamp}@example.com`,
    displayName: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
    provider: 'GOOGLE',
    providerAccountId: `account_${timestamp}`,
    ...overrides,
  };

  return await db.user.create({
    data: defaultData,
  });
}

/**
 * Create test user with initial balance
 */
export async function createTestUserWithBalance(balance: number, overrides: any = {}) {
  const db = getTestDb();
  const user = await createTestUser(overrides);

  // Create initial credit transaction to set balance
  await db.creditTransaction.create({
    data: {
      userId: user.id,
      transactionType: 'GRANT_INITIAL',
      amountCredits: balance,
      balanceAfter: balance,
      notes: 'Test initial balance',
    },
  });

  return user;
}

/**
 * Create test plan
 */
export async function createTestPlan(overrides: any = {}) {
  const db = getTestDb();

  const defaultData = {
    tier: 'FREE',
    name: 'Test Plan',
    description: 'Test plan description',
    priceMonthly: 0,
    creditsPerMonth: 200,
    isActive: true,
    ...overrides,
  };

  return await db.plan.create({
    data: defaultData,
  });
}

/**
 * Create test user plan (subscription)
 */
export async function createTestUserPlan(userId: string, planId: string, overrides: any = {}) {
  const db = getTestDb();

  const now = new Date();
  const oneMonthLater = new Date(now);
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

  const defaultData = {
    userId,
    planId,
    status: 'ACTIVE',
    currentPeriodStart: now,
    currentPeriodEnd: oneMonthLater,
    ...overrides,
  };

  return await db.userPlan.create({
    data: defaultData,
  });
}

/**
 * Create test credit transaction
 */
export async function createTestTransaction(userId: string, overrides: any = {}) {
  const db = getTestDb();

  const defaultData = {
    userId,
    transactionType: 'SYSTEM_REWARD',
    amountCredits: 10,
    balanceAfter: 10,
    notes: 'Test transaction',
    ...overrides,
  };

  return await db.creditTransaction.create({
    data: defaultData,
  });
}
