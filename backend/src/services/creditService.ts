import { CreditTransactionType } from '../generated/prisma';
import { prisma } from '../config/database';
import { startOfDay, startOfMonth, endOfMonth } from 'date-fns';

// Credits configuration
const DAILY_REWARD_CREDITS = 50;
const DAILY_REWARD_PREMIUM_CREDITS = 100;
const DAILY_FIRST_CHAT_REWARD_CREDITS = 25;

/**
 * Get user's current credit balance
 * Uses monthly snapshots for performance optimization
 */
export async function getCurrentBalance(userId: string): Promise<number> {
  // Get latest monthly snapshot
  const currentMonthStart = startOfMonth(new Date());
  const snapshot = await prisma.userMonthlyBalance.findUnique({
    where: {
      userId_monthStartDate: {
        userId,
        monthStartDate: currentMonthStart,
      },
    },
  });

  if (snapshot) {
    // Use snapshot as baseline and calculate from there
    const transactionsSinceSnapshot = await prisma.creditTransaction.aggregate({
      where: {
        userId,
        timestamp: {
          gte: currentMonthStart,
        },
      },
      _sum: {
        amountCredits: true,
      },
    });

    return (snapshot.startingBalance || 0) + (transactionsSinceSnapshot._sum.amountCredits || 0);
  }

  // No snapshot for current month, calculate from all transactions
  const allTransactions = await prisma.creditTransaction.aggregate({
    where: { userId },
    _sum: {
      amountCredits: true,
    },
  });

  return allTransactions._sum.amountCredits || 0;
}

/**
 * Create a credit transaction
 * Returns the updated balance
 */
export async function createTransaction(
  userId: string,
  transactionType: CreditTransactionType,
  amountCredits: number,
  notes?: string,
  relatedUsageLogId?: string,
  relatedPlanId?: string
): Promise<{ transaction: any; newBalance: number }> {
  // Get current balance
  const currentBalance = await getCurrentBalance(userId);
  const newBalance = currentBalance + amountCredits;

  // Validate sufficient balance for spending
  if (amountCredits < 0 && newBalance < 0) {
    throw new Error('Insufficient credits');
  }

  // Create transaction
  const transaction = await prisma.creditTransaction.create({
    data: {
      userId,
      transactionType,
      amountCredits,
      balanceAfter: newBalance,
      notes,
      relatedUsageLogId,
      relatedPlanId,
    },
  });

  return { transaction, newBalance };
}

/**
 * Claim daily reward
 * Returns error if already claimed today
 */
export async function claimDailyReward(userId: string): Promise<{ credits: number; newBalance: number }> {
  const today = startOfDay(new Date());

  // Check if already claimed today
  const todayReward = await prisma.creditTransaction.findFirst({
    where: {
      userId,
      transactionType: 'SYSTEM_REWARD',
      notes: 'daily_login_reward',
      timestamp: {
        gte: today,
      },
    },
  });

  if (todayReward) {
    throw new Error('Daily reward already claimed today');
  }

  // Check if user has Premium plan (for higher daily reward)
  const isPremium = await isUserPremium(userId);
  const rewardAmount = isPremium ? DAILY_REWARD_PREMIUM_CREDITS : DAILY_REWARD_CREDITS;

  // Create reward transaction
  const { newBalance } = await createTransaction(
    userId,
    'SYSTEM_REWARD',
    rewardAmount,
    'daily_login_reward'
  );

  return {
    credits: rewardAmount,
    newBalance,
  };
}

/**
 * Check if daily reward has been claimed today.
 * Returns the status and the time when the next claim is available.
 */
export async function getDailyRewardStatus(userId: string): Promise<{ claimed: boolean; canClaimAt: Date }> {
  const today = startOfDay(new Date());
  const tomorrow = startOfDay(new Date(today.getTime() + 24 * 60 * 60 * 1000));

  const todayReward = await prisma.creditTransaction.findFirst({
    where: {
      userId,
      transactionType: 'SYSTEM_REWARD',
      notes: 'daily_login_reward',
      timestamp: {
        gte: today,
      },
    },
  });

  return {
    claimed: !!todayReward,
    canClaimAt: tomorrow,
  };
}

/**
 * Claim reward for the first new chat of the day.
 */
export async function claimFirstChatReward(userId: string): Promise<{ credits: number; newBalance: number } | null> {
  const today = startOfDay(new Date());

  const hasAlreadyClaimed = await prisma.creditTransaction.findFirst({
    where: {
      userId,
      transactionType: 'SYSTEM_REWARD',
      notes: 'daily_first_chat_reward',
      timestamp: {
        gte: today,
      },
    },
  });

  if (hasAlreadyClaimed) {
    return null;
  }

  const { newBalance } = await createTransaction(
    userId,
    'SYSTEM_REWARD',
    DAILY_FIRST_CHAT_REWARD_CREDITS,
    'daily_first_chat_reward'
  );

  return {
    credits: DAILY_FIRST_CHAT_REWARD_CREDITS,
    newBalance,
  };
}

/**
 * Check if the first chat reward has been claimed today.
 */
export async function getFirstChatRewardStatus(userId: string): Promise<{ claimed: boolean; canClaimAt: Date }> {
  const today = startOfDay(new Date());
  const tomorrow = startOfDay(new Date(today.getTime() + 24 * 60 * 60 * 1000));

  const todayReward = await prisma.creditTransaction.findFirst({
    where: {
      userId,
      transactionType: 'SYSTEM_REWARD',
      notes: 'daily_first_chat_reward',
      timestamp: {
        gte: today,
      },
    },
  });

  return {
    claimed: !!todayReward,
    canClaimAt: tomorrow,
  };
}

/**
 * Check if user has Premium plan active
 */
async function isUserPremium(userId: string): Promise<boolean> {
  const now = new Date();

  const activePremiumPlan = await prisma.userPlan.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      currentPeriodEnd: {
        gt: now,
      },
      plan: {
        tier: 'PREMIUM',
      },
    },
    include: {
      plan: true,
    },
  });

  return !!activePremiumPlan;
}

/**
 * Check if user has Plus or Premium access
 * Includes temporary Plus access from referrals
 */
export async function isUserPlusOrBetter(userId: string): Promise<boolean> {
  const now = new Date();

  // Check for active paid plan
  const activePlan = await prisma.userPlan.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      currentPeriodEnd: {
        gt: now,
      },
      plan: {
        tier: {
          in: ['PLUS', 'PREMIUM'],
        },
      },
    },
  });

  if (activePlan) {
    return true;
  }

  // Check for temporary Plus access
  const plusAccess = await prisma.userPlusAccess.findFirst({
    where: {
      userId,
      isActive: true,
      endDate: {
        gt: now,
      },
    },
  });

  return !!plusAccess;
}

/**
 * Get user's transaction history
 */
export async function getTransactionHistory(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    type?: CreditTransactionType;
  } = {}
): Promise<{ transactions: any[]; total: number }> {
  const { limit = 50, offset = 0, type } = options;

  const where = {
    userId,
    ...(type && { transactionType: type }),
  };

  const [transactions, total] = await Promise.all([
    prisma.creditTransaction.findMany({
      where,
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
      skip: offset,
    }),
    prisma.creditTransaction.count({ where }),
  ]);

  return { transactions, total };
}

/**
 * Grant initial credits when user signs up
 * Called by OAuth callback after user creation
 */
export async function grantInitialCredits(userId: string): Promise<void> {
  // Get Free plan
  const freePlan = await prisma.plan.findUnique({
    where: { tier: 'FREE' },
  });

  if (!freePlan) {
    throw new Error('Free plan not found in database');
  }

  // Grant initial credits
  await createTransaction(
    userId,
    'GRANT_INITIAL',
    freePlan.creditsPerMonth,
    'Initial credits on signup',
    undefined,
    freePlan.id
  );

  // Assign user to Free plan
  const now = new Date();
  const periodEnd = endOfMonth(now);

  await prisma.userPlan.create({
    data: {
      userId,
      planId: freePlan.id,
      status: 'ACTIVE',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  });
}

/**
 * Create monthly balance snapshot for performance
 * Called by background job at the start of each month
 */
export async function createMonthlySnapshot(userId: string): Promise<void> {
  const currentMonthStart = startOfMonth(new Date());

  // Check if snapshot already exists
  const existing = await prisma.userMonthlyBalance.findUnique({
    where: {
      userId_monthStartDate: {
        userId,
        monthStartDate: currentMonthStart,
      },
    },
  });

  if (existing) {
    return; // Snapshot already created
  }

  // Get balance at month start
  const balance = await getCurrentBalance(userId);

  // Create snapshot
  await prisma.userMonthlyBalance.create({
    data: {
      userId,
      monthStartDate: currentMonthStart,
      startingBalance: balance,
      endingBalance: balance, // Will be updated at end of month
    },
  });
}

/**
 * Grant monthly credits for user's plan
 * Called by background job at the start of each month
 */
export async function grantMonthlyCredits(userId: string): Promise<void> {
  const now = new Date();

  // Get user's active plan
  const userPlan = await prisma.userPlan.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      currentPeriodEnd: {
        gt: now,
      },
    },
    include: {
      plan: true,
    },
  });

  if (!userPlan) {
    return; // No active plan
  }

  // Grant monthly credits
  await createTransaction(
    userId,
    'GRANT_PLAN',
    userPlan.plan.creditsPerMonth,
    `Monthly credits for ${userPlan.plan.name} plan`,
    undefined,
    userPlan.plan.id
  );
}

/**
 * Check if user has enough credits
 */
export async function hasEnoughCredits(userId: string, requiredCredits: number): Promise<boolean> {
  const balance = await getCurrentBalance(userId);
  return balance >= requiredCredits;
}

/**
 * Get user's current plan
 */
export async function getUserCurrentPlan(userId: string): Promise<any> {
  const now = new Date();

  const userPlan = await prisma.userPlan.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      currentPeriodEnd: {
        gt: now,
      },
    },
    include: {
      plan: true,
    },
    orderBy: {
      currentPeriodEnd: 'desc',
    },
  });

  return userPlan;
}
