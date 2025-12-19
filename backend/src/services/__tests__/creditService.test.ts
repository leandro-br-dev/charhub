/**
 * Credit Service Unit Tests
 * Tests for credit balance, transactions, rewards, and plan management
 */
import {
  getCurrentBalance,
  createTransaction,
  claimDailyReward,
  getDailyRewardStatus,
  claimFirstChatReward,
  getFirstChatRewardStatus,
  hasEnoughCredits,
  grantInitialCredits,
  getTransactionHistory,
  getUserCurrentPlan,
} from '../creditService';
import { setupTestDatabase, cleanDatabase, teardownTestDatabase, seedTestPlans } from '../../test-utils/database';
import { createTestUser, createTestUserWithBalance, createTestUserPlan } from '../../test-utils/factories';
import { getTestDb } from '../../test-utils/database';

describe('CreditService', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
    await seedTestPlans(); // Seed Free/Plus/Premium plans
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('getCurrentBalance', () => {
    it('should return 0 for new user with no transactions', async () => {
      const user = await createTestUser();
      const balance = await getCurrentBalance(user.id);
      expect(balance).toBe(0);
    });

    it('should return correct balance after transactions', async () => {
      const user = await createTestUserWithBalance(100);
      const balance = await getCurrentBalance(user.id);
      expect(balance).toBe(100);
    });

    it('should calculate balance from multiple transactions', async () => {
      const user = await createTestUser();

      // Add credits
      await createTransaction(user.id, 'GRANT_INITIAL', 200);
      await createTransaction(user.id, 'SYSTEM_REWARD', 50);

      // Spend credits
      await createTransaction(user.id, 'CONSUMPTION', -30);

      const balance = await getCurrentBalance(user.id);
      expect(balance).toBe(220); // 200 + 50 - 30
    });
  });

  describe('createTransaction', () => {
    it('should create transaction and return new balance', async () => {
      const user = await createTestUserWithBalance(100);

      const result = await createTransaction(
        user.id,
        'CONSUMPTION',
        -10,
        'Test purchase'
      );

      expect(result.newBalance).toBe(90);
      expect(result.transaction).toBeDefined();
      expect(result.transaction.amountCredits).toBe(-10);
      expect(result.transaction.balanceAfter).toBe(90);
    });

    it('should throw error when spending more than balance', async () => {
      const user = await createTestUserWithBalance(50);

      await expect(
        createTransaction(user.id, 'CONSUMPTION', -100)
      ).rejects.toThrow('Insufficient credits');
    });

    it('should allow negative balance for additions', async () => {
      const user = await createTestUser();

      const result = await createTransaction(
        user.id,
        'GRANT_INITIAL',
        200
      );

      expect(result.newBalance).toBe(200);
    });

    it('should store transaction metadata correctly', async () => {
      const db = getTestDb();
      const user = await createTestUserWithBalance(100);

      const result = await createTransaction(
        user.id,
        'CONSUMPTION',
        -10,
        'Test purchase with metadata',
        'usage_log_123',
        'plan_premium'
      );

      const transaction = await db.creditTransaction.findUnique({
        where: { id: result.transaction.id },
      });

      expect(transaction?.notes).toBe('Test purchase with metadata');
      expect(transaction?.relatedUsageLogId).toBe('usage_log_123');
      expect(transaction?.relatedPlanId).toBe('plan_premium');
    });
  });

  describe('claimDailyReward', () => {
    it('should grant daily reward for free user', async () => {
      const user = await createTestUser();

      const result = await claimDailyReward(user.id);

      expect(result.credits).toBe(50); // Free tier daily reward
      expect(result.newBalance).toBe(50);
    });

    it('should grant higher daily reward for premium user', async () => {
      const user = await createTestUser();
      const prisma = getTestDb();

      // Find Premium plan by tier
      const premiumPlan = await prisma.plan.findFirst({ where: { tier: 'PREMIUM' } });
      if (!premiumPlan) throw new Error('Premium plan not found');

      // Assign Premium plan
      await createTestUserPlan(user.id, premiumPlan.id, {
        status: 'ACTIVE',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days later
      });

      const result = await claimDailyReward(user.id);

      expect(result.credits).toBe(100); // Premium tier daily reward
      expect(result.newBalance).toBe(100);
    });

    it('should throw error if daily reward already claimed today', async () => {
      const user = await createTestUser();

      await claimDailyReward(user.id);

      await expect(
        claimDailyReward(user.id)
      ).rejects.toThrow('Daily reward already claimed today');
    });
  });

  describe('getDailyRewardStatus', () => {
    it('should return claimed=false if not claimed today', async () => {
      const user = await createTestUser();

      const status = await getDailyRewardStatus(user.id);

      expect(status.claimed).toBe(false);
      expect(status.canClaimAt).toBeInstanceOf(Date);
    });

    it('should return claimed=true if already claimed today', async () => {
      const user = await createTestUser();
      await claimDailyReward(user.id);

      const status = await getDailyRewardStatus(user.id);

      expect(status.claimed).toBe(true);
    });
  });

  describe('claimFirstChatReward', () => {
    it('should grant first chat reward when not claimed today', async () => {
      const user = await createTestUser();

      const result = await claimFirstChatReward(user.id);

      expect(result).not.toBeNull();
      expect(result?.credits).toBe(25); // First chat reward
      expect(result?.newBalance).toBe(25);
    });

    it('should return null if first chat reward already claimed today', async () => {
      const user = await createTestUser();

      await claimFirstChatReward(user.id);
      const result = await claimFirstChatReward(user.id);

      expect(result).toBeNull();
    });
  });

  describe('getFirstChatRewardStatus', () => {
    it('should return claimed=false if not claimed today', async () => {
      const user = await createTestUser();

      const status = await getFirstChatRewardStatus(user.id);

      expect(status.claimed).toBe(false);
    });

    it('should return claimed=true if already claimed today', async () => {
      const user = await createTestUser();
      await claimFirstChatReward(user.id);

      const status = await getFirstChatRewardStatus(user.id);

      expect(status.claimed).toBe(true);
    });
  });

  describe('hasEnoughCredits', () => {
    it('should return true when user has sufficient credits', async () => {
      const user = await createTestUserWithBalance(100);

      const hasCredits = await hasEnoughCredits(user.id, 50);

      expect(hasCredits).toBe(true);
    });

    it('should return false when user has insufficient credits', async () => {
      const user = await createTestUserWithBalance(100);

      const hasCredits = await hasEnoughCredits(user.id, 150);

      expect(hasCredits).toBe(false);
    });

    it('should return true when exact balance matches required', async () => {
      const user = await createTestUserWithBalance(100);

      const hasCredits = await hasEnoughCredits(user.id, 100);

      expect(hasCredits).toBe(true);
    });
  });

  describe('grantInitialCredits', () => {
    it('should grant initial credits on signup', async () => {
      const user = await createTestUser();

      await grantInitialCredits(user.id);

      const balance = await getCurrentBalance(user.id);
      expect(balance).toBe(200); // Free plan initial credits
    });

    it('should assign user to Free plan', async () => {
      const user = await createTestUser();

      await grantInitialCredits(user.id);

      const plan = await getUserCurrentPlan(user.id);
      expect(plan).not.toBeNull();
      expect(plan.plan.tier).toBe('FREE');
    });

    it('should throw error if Free plan not found', async () => {
      await cleanDatabase(); // Remove all plans
      const user = await createTestUser();

      await expect(
        grantInitialCredits(user.id)
      ).rejects.toThrow('Free plan not found in database');
    });
  });

  describe('getTransactionHistory', () => {
    it('should return empty array for user with no transactions', async () => {
      const user = await createTestUser();

      const result = await getTransactionHistory(user.id);

      expect(result.transactions).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return transactions ordered by newest first', async () => {
      const user = await createTestUser();

      await createTransaction(user.id, 'GRANT_INITIAL', 100);
      await createTransaction(user.id, 'SYSTEM_REWARD', 50);
      await createTransaction(user.id, 'CONSUMPTION', -10);

      const result = await getTransactionHistory(user.id);

      expect(result.transactions).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.transactions[0].transactionType).toBe('CONSUMPTION'); // Newest first
    });

    it('should respect limit and offset', async () => {
      const user = await createTestUser();

      // Create 5 transactions
      for (let i = 0; i < 5; i++) {
        await createTransaction(user.id, 'SYSTEM_REWARD', 10);
      }

      const result = await getTransactionHistory(user.id, {
        limit: 2,
        offset: 1,
      });

      expect(result.transactions).toHaveLength(2);
      expect(result.total).toBe(5);
    });

    it('should filter by transaction type', async () => {
      const user = await createTestUser();

      await createTransaction(user.id, 'GRANT_INITIAL', 100);
      await createTransaction(user.id, 'SYSTEM_REWARD', 50);
      await createTransaction(user.id, 'CONSUMPTION', -10);

      const result = await getTransactionHistory(user.id, {
        type: 'SYSTEM_REWARD',
      });

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].transactionType).toBe('SYSTEM_REWARD');
    });
  });

  describe('getUserCurrentPlan', () => {
    it('should return null for user with no active plan', async () => {
      const user = await createTestUser();

      const plan = await getUserCurrentPlan(user.id);

      expect(plan).toBeNull();
    });

    it('should return active plan', async () => {
      const user = await createTestUser();
      const prisma = getTestDb();

      // Find Plus plan by tier
      const plusPlan = await prisma.plan.findFirst({ where: { tier: 'PLUS' } });
      if (!plusPlan) throw new Error('Plus plan not found');

      await createTestUserPlan(user.id, plusPlan.id, {
        status: 'ACTIVE',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const plan = await getUserCurrentPlan(user.id);

      expect(plan).not.toBeNull();
      expect(plan.plan.tier).toBe('PLUS');
    });

    it('should not return expired plan', async () => {
      const user = await createTestUser();
      const prisma = getTestDb();

      // Find Plus plan by tier
      const plusPlan = await prisma.plan.findFirst({ where: { tier: 'PLUS' } });
      if (!plusPlan) throw new Error('Plus plan not found');

      await createTestUserPlan(user.id, plusPlan.id, {
        status: 'ACTIVE',
        currentPeriodEnd: new Date(Date.now() - 1000), // Expired
      });

      const plan = await getUserCurrentPlan(user.id);

      expect(plan).toBeNull();
    });
  });

  describe('Edge Cases & Boundary Conditions', () => {
    it('should handle zero credit transactions', async () => {
      const user = await createTestUserWithBalance(100);

      const result = await createTransaction(user.id, 'SYSTEM_REWARD', 0);

      expect(result.newBalance).toBe(100);
    });

    it('should handle large credit amounts', async () => {
      const user = await createTestUser();

      const result = await createTransaction(user.id, 'GRANT_INITIAL', 1000000);

      expect(result.newBalance).toBe(1000000);
    });

    it('should maintain transaction integrity under concurrent operations', async () => {
      const user = await createTestUserWithBalance(100);

      // Simulate concurrent spending
      const promises = [
        createTransaction(user.id, 'CONSUMPTION', -10),
        createTransaction(user.id, 'CONSUMPTION', -20),
        createTransaction(user.id, 'CONSUMPTION', -30),
      ];

      await Promise.all(promises);

      const balance = await getCurrentBalance(user.id);
      expect(balance).toBe(40); // 100 - 10 - 20 - 30
    });
  });
});
