import { prisma } from '../../config/database';
import { FeatureType } from '../../generated/prisma';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface CostByFeature {
  feature: FeatureType;
  totalCost: number;
  totalTokens: number;
  requestCount: number;
  avgCostPerRequest: number;
  avgTokensPerRequest: number;
}

export interface CostByUser {
  userId: string;
  totalCost: number;
  totalTokens: number;
  requestCount: number;
  avgCostPerRequest: number;
}

export interface CostByPlan {
  subscriptionPlan: string;
  avgCost: number;
  userCount: number;
  totalCost: number;
}

export interface CostByModel {
  provider: string;
  model: string;
  totalCost: number;
  totalTokens: number;
  requestCount: number;
  avgCostPerRequest: number;
}

/**
 * Get LLM costs aggregated by feature type
 */
export async function getCostByFeature(dateRange: DateRange): Promise<CostByFeature[]> {
  const costs = await prisma.lLMUsageLog.groupBy({
    by: ['feature'],
    where: {
      createdAt: {
        gte: dateRange.from,
        lte: dateRange.to,
      },
    },
    _sum: {
      totalCost: true,
      totalTokens: true,
      inputTokens: true,
      outputTokens: true,
    },
    _count: {
      id: true,
    },
  });

  return costs.map((c) => ({
    feature: c.feature,
    totalCost: Number(c._sum.totalCost || 0),
    totalTokens: c._sum.totalTokens || 0,
    requestCount: c._count.id,
    avgCostPerRequest: c._count.id > 0 ? Number(c._sum.totalCost || 0) / c._count.id : 0,
    avgTokensPerRequest: c._count.id > 0 ? (c._sum.totalTokens || 0) / c._count.id : 0,
  }));
}

/**
 * Get LLM costs for a specific user
 */
export async function getCostByUser(
  userId: string,
  dateRange: DateRange
): Promise<CostByUser> {
  const result = await prisma.lLMUsageLog.aggregate({
    where: {
      userId,
      createdAt: {
        gte: dateRange.from,
        lte: dateRange.to,
      },
    },
    _sum: {
      totalCost: true,
      totalTokens: true,
    },
    _count: {
      id: true,
    },
  });

  return {
    userId,
    totalCost: Number(result._sum.totalCost || 0),
    totalTokens: result._sum.totalTokens || 0,
    requestCount: result._count.id,
    avgCostPerRequest: result._count.id > 0
      ? Number(result._sum.totalCost || 0) / result._count.id
      : 0,
  };
}

/**
 * Get average LLM cost per user grouped by subscription plan
 */
export async function getAverageCostByPlan(
  dateRange?: DateRange
): Promise<CostByPlan[]> {
  // Default to last 30 days if not specified
  const fromDate = dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = dateRange?.to || new Date();

  // Raw SQL query to get costs by plan
  const result = await prisma.$queryRaw<Array<{
    subscription_plan: string;
    avg_cost: number;
    user_count: number;
    total_cost: number;
  }>>`
    SELECT
      COALESCE(u."subscriptionPlan", 'FREE') as "subscription_plan",
      COALESCE(AVG(cost_sum.total), 0) as "avg_cost",
      COUNT(DISTINCT u.id) as "user_count",
      COALESCE(SUM(cost_sum.total), 0) as "total_cost"
    FROM "User" u
    LEFT JOIN (
      SELECT "userId", SUM("totalCost") as total
      FROM "LLMUsageLog"
      WHERE "createdAt" >= ${fromDate}
        AND "createdAt" <= ${toDate}
      GROUP BY "userId"
    ) cost_sum ON u.id = cost_sum."userId"
    GROUP BY COALESCE(u."subscriptionPlan", 'FREE')
    ORDER BY "avg_cost" DESC
  `;

  return result.map((row) => ({
    subscriptionPlan: row.subscription_plan,
    avgCost: Number(row.avg_cost),
    userCount: Number(row.user_count),
    totalCost: Number(row.total_cost),
  }));
}

/**
 * Get total operational LLM costs for a date range
 */
export async function getTotalOperationalCost(dateRange: DateRange): Promise<number> {
  const result = await prisma.lLMUsageLog.aggregate({
    where: {
      createdAt: {
        gte: dateRange.from,
        lte: dateRange.to,
      },
    },
    _sum: {
      totalCost: true,
    },
  });

  return Number(result._sum.totalCost || 0);
}

/**
 * Get LLM costs aggregated by model
 */
export async function getCostByModel(dateRange: DateRange): Promise<CostByModel[]> {
  const costs = await prisma.lLMUsageLog.groupBy({
    by: ['provider', 'model'],
    where: {
      createdAt: {
        gte: dateRange.from,
        lte: dateRange.to,
      },
    },
    _sum: {
      totalCost: true,
      totalTokens: true,
    },
    _count: {
      id: true,
    },
  });

  return costs.map((c) => ({
    provider: c.provider,
    model: c.model,
    totalCost: Number(c._sum.totalCost || 0),
    totalTokens: c._sum.totalTokens || 0,
    requestCount: c._count.id,
    avgCostPerRequest: c._count.id > 0 ? Number(c._sum.totalCost || 0) / c._count.id : 0,
  }));
}

/**
 * Get daily LLM costs for a date range (time series data)
 */
export async function getDailyCosts(dateRange: DateRange): Promise<
  Array<{ date: Date; totalCost: number; totalTokens: number; requestCount: number }>
> {
  const result = await prisma.$queryRaw<Array<{
    date: Date;
    total_cost: number;
    total_tokens: number;
    request_count: number;
  }>>`
    SELECT
      DATE_TRUNC('day', "createdAt")::date as date,
      SUM("totalCost") as "total_cost",
      SUM("totalTokens") as "total_tokens",
      COUNT(*) as "request_count"
    FROM "LLMUsageLog"
    WHERE "createdAt" >= ${dateRange.from}
      AND "createdAt" <= ${dateRange.to}
    GROUP BY DATE_TRUNC('day', "createdAt")::date
    ORDER BY date ASC
  `;

  return result.map((row) => ({
    date: row.date,
    totalCost: Number(row.total_cost),
    totalTokens: Number(row.total_tokens),
    requestCount: Number(row.request_count),
  }));
}

/**
 * Get top users by LLM cost
 */
export async function getTopUsersByCost(
  dateRange: DateRange,
  limit: number = 50
): Promise<Array<{ userId: string; totalCost: number; requestCount: number }>> {
  const result = await prisma.lLMUsageLog.groupBy({
    by: ['userId'],
    where: {
      userId: { not: null }, // Only track logged-in users
      createdAt: {
        gte: dateRange.from,
        lte: dateRange.to,
      },
    },
    _sum: {
      totalCost: true,
    },
    _count: {
      id: true,
    },
    orderBy: {
      _sum: {
        totalCost: 'desc',
      },
    },
    take: limit,
  });

  return result.map((row) => ({
    userId: row.userId!,
    totalCost: Number(row._sum.totalCost || 0),
    requestCount: row._count.id,
  }));
}

/**
 * Get caching effectiveness metrics
 */
export async function getCachingMetrics(
  dateRange: DateRange
): Promise<{
  totalRequests: number;
  cachedRequests: number;
  cacheHitRate: number;
  costSavings: number;
}> {
  const result = await prisma.lLMUsageLog.groupBy({
    by: ['cached'],
    where: {
      createdAt: {
        gte: dateRange.from,
        lte: dateRange.to,
      },
    },
    _sum: {
      totalCost: true,
    },
    _count: {
      id: true,
    },
  });

  const cached = result.find((r) => r.cached === true);
  const uncached = result.find((r) => r.cached === false);

  const totalRequests = (cached?._count.id || 0) + (uncached?._count.id || 0);
  const cachedRequests = cached?._count.id || 0;
  const cacheHitRate = totalRequests > 0 ? cachedRequests / totalRequests : 0;

  // Calculate cost savings
  // Cached requests cost 10% of original, so savings = 90% of what they would have cost
  const cachedCost = Number(cached?._sum.totalCost || 0);
  const uncachedCost = Number(uncached?._sum.totalCost || 0);

  // If all cached requests were uncached, they would cost 10x more
  const costWithoutCache = cachedCost * 10 + uncachedCost;
  const totalActualCost = cachedCost + uncachedCost;
  const costSavings = costWithoutCache - totalActualCost;

  return {
    totalRequests,
    cachedRequests,
    cacheHitRate,
    costSavings,
  };
}
