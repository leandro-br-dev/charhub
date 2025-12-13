/**
 * Database utilities for tests
 */
import { PrismaClient } from '../generated/prisma';

// Singleton test database instance
let testDb: PrismaClient | null = null;

/**
 * Get test database instance
 */
export function getTestDb(): PrismaClient {
  if (!testDb) {
    testDb = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL,
        },
      },
    });
  }
  return testDb;
}

/**
 * Setup test database
 * Call this in beforeAll() hooks
 */
export async function setupTestDatabase(): Promise<void> {
  const db = getTestDb();
  await db.$connect();
}

/**
 * Clean all tables
 * Call this in afterEach() or beforeEach() hooks to ensure test isolation
 */
export async function cleanDatabase(): Promise<void> {
  const db = getTestDb();

  // Order matters due to foreign key constraints
  // Delete in reverse dependency order
  await db.userPlan.deleteMany({});
  await db.creditTransaction.deleteMany({});
  await db.userMonthlyBalance.deleteMany({});
  await db.userPlusAccess.deleteMany({});
  await db.usageLog.deleteMany({});
  await db.plan.deleteMany({});
  await db.user.deleteMany({});
}

/**
 * Teardown test database
 * Call this in afterAll() hooks
 */
export async function teardownTestDatabase(): Promise<void> {
  if (testDb) {
    await testDb.$disconnect();
    testDb = null;
  }
}

/**
 * Seed basic test data (plans)
 */
export async function seedTestPlans(): Promise<void> {
  const db = getTestDb();

  await db.plan.createMany({
    data: [
      {
        id: 'plan_free',
        tier: 'FREE',
        name: 'Free Plan',
        description: 'Basic free plan',
        priceMonthly: 0,
        creditsPerMonth: 200,
        isActive: true,
      },
      {
        id: 'plan_plus',
        tier: 'PLUS',
        name: 'Plus Plan',
        description: 'Plus plan with more credits',
        priceMonthly: 9.99,
        creditsPerMonth: 500,
        isActive: true,
      },
      {
        id: 'plan_premium',
        tier: 'PREMIUM',
        name: 'Premium Plan',
        description: 'Premium plan with unlimited credits',
        priceMonthly: 29.99,
        creditsPerMonth: 5000,
        isActive: true,
      },
    ],
    skipDuplicates: true,
  });
}
