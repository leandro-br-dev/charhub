/**
 * Database utilities for tests
 */
import { PrismaClient } from '../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Singleton test database instance
let testDb: PrismaClient | null = null;
let testPool: Pool | null = null;

/**
 * Get test database instance
 */
export function getTestDb(): PrismaClient {
  if (!testDb) {
    const connectionString = `${process.env.DATABASE_URL_TEST || process.env.DATABASE_URL}`;
    testPool = new Pool({
      connectionString,
      max: 1,
      idleTimeoutMillis: 1000,
    });
    const adapter = new PrismaPg(testPool);

    testDb = new PrismaClient({
      adapter,
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
  try {
    await db.userPlan.deleteMany({});
  } catch (error) {
    // Ignore Prisma errors during cleanup
    console.warn('Warning: Failed to delete userPlan records:', error);
  }
  await db.creditTransaction.deleteMany({});
  await db.userMonthlyBalance.deleteMany({});
  await db.userPlusAccess.deleteMany({});
  await db.usageLog.deleteMany({});
  await db.plan.deleteMany({});
  await db.user.deleteMany({});
  await db.systemConfiguration.deleteMany({});
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
  if (testPool) {
    await testPool.end();
    testPool = null;
  }
}

/**
 * Seed basic test data (plans)
 * Uses upsert on tier (unique field) to ensure plans exist and are safe for parallel test execution
 */
export async function seedTestPlans(): Promise<void> {
  const db = getTestDb();

  const tiers = ['FREE', 'PLUS', 'PREMIUM'] as const;
  const planConfigs = {
    FREE: {
      tier: 'FREE' as const,
      name: 'Free Plan',
      description: 'Basic free plan',
      priceMonthly: 0,
      creditsPerMonth: 200,
      isActive: true,
    },
    PLUS: {
      tier: 'PLUS' as const,
      name: 'Plus Plan',
      description: 'Plus plan with more credits',
      priceMonthly: 9.99,
      creditsPerMonth: 500,
      isActive: true,
    },
    PREMIUM: {
      tier: 'PREMIUM' as const,
      name: 'Premium Plan',
      description: 'Premium plan with unlimited credits',
      priceMonthly: 29.99,
      creditsPerMonth: 5000,
      isActive: true,
    },
  };

  // Use upsert on tier (unique constraint) for atomic operations
  // Handle unique constraint errors gracefully - they just mean another parallel test already created the plan
  for (const tier of tiers) {
    try {
      await db.plan.upsert({
        where: { tier },
        update: {},
        create: planConfigs[tier],
      });
    } catch (error: any) {
      // Ignore unique constraint errors (P2002) - plan already exists from parallel test
      // Prisma error codes: https://www.prisma.io/docs/reference/api-reference/error-reference
      if (error?.code !== 'P2002') {
        throw error;
      }
      // If P2002 (unique constraint violation), silently continue - plan exists
    }
  }
}