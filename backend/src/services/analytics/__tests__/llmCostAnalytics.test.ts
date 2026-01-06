/**
 * LLM Cost Analytics Tests
 * Tests for LLM cost aggregation and analysis functions
 */

import {
  getCostByFeature,
  getCostByUser,
  getAverageCostByPlan,
  getTotalOperationalCost,
  getCostByModel,
  getDailyCosts,
  getTopUsersByCost,
  getCachingMetrics,
  type DateRange,
} from '../llmCostAnalytics';
import { FeatureType } from '../../../generated/prisma';

// Mock the database module
jest.mock('../../../config/database', () => {
  const mockGroupBy = jest.fn();
  const mockAggregate = jest.fn();
  const mockQueryRaw = jest.fn();

  return {
    prisma: {
      lLMUsageLog: {
        groupBy: mockGroupBy,
        aggregate: mockAggregate,
      },
      $queryRaw: mockQueryRaw,
    },
    __mockExports: {
      mockGroupBy,
      mockAggregate,
      mockQueryRaw,
    },
  };
});

// Get the mock references
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { __mockExports } = require('../../../config/database');

describe('LLM Cost Analytics', () => {
  const mockDateRange: DateRange = {
    from: new Date('2025-01-01'),
    to: new Date('2025-01-31'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCostByFeature', () => {
    it('should aggregate costs by feature type', async () => {
      const mockData = [
        {
          feature: FeatureType.CHARACTER_GENERATION,
          _sum: { totalCost: 1.5, totalTokens: 1000000, inputTokens: 500000, outputTokens: 500000 },
          _count: { id: 100 },
        },
        {
          feature: FeatureType.CHAT_MESSAGE,
          _sum: { totalCost: 0.5, totalTokens: 500000, inputTokens: 300000, outputTokens: 200000 },
          _count: { id: 50 },
        },
      ];

      __mockExports.mockGroupBy.mockResolvedValue(mockData);

      const result = await getCostByFeature(mockDateRange);

      expect(__mockExports.mockGroupBy).toHaveBeenCalledWith({
        by: ['feature'],
        where: {
          createdAt: {
            gte: mockDateRange.from,
            lte: mockDateRange.to,
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

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        feature: FeatureType.CHARACTER_GENERATION,
        totalCost: 1.5,
        totalTokens: 1000000,
        requestCount: 100,
        avgCostPerRequest: 0.015,
        avgTokensPerRequest: 10000,
      });
    });

    it('should handle empty results', async () => {
      __mockExports.mockGroupBy.mockResolvedValue([]);

      const result = await getCostByFeature(mockDateRange);

      expect(result).toEqual([]);
    });

    it('should handle division by zero for averages', async () => {
      const mockData = [
        {
          feature: FeatureType.OTHER,
          _sum: { totalCost: 0, totalTokens: 0, inputTokens: 0, outputTokens: 0 },
          _count: { id: 0 },
        },
      ];

      __mockExports.mockGroupBy.mockResolvedValue(mockData);

      const result = await getCostByFeature(mockDateRange);

      expect(result[0].avgCostPerRequest).toBe(0);
      expect(result[0].avgTokensPerRequest).toBe(0);
    });
  });

  describe('getCostByUser', () => {
    it('should calculate total costs for a specific user', async () => {
      const userId = 'user-123';
      const mockData = {
        _sum: { totalCost: 2.5, totalTokens: 2000000 },
        _count: { id: 150 },
      };

      __mockExports.mockAggregate.mockResolvedValue(mockData);

      const result = await getCostByUser(userId, mockDateRange);

      expect(__mockExports.mockAggregate).toHaveBeenCalledWith({
        where: {
          userId,
          createdAt: {
            gte: mockDateRange.from,
            lte: mockDateRange.to,
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

      expect(result).toEqual({
        userId,
        totalCost: 2.5,
        totalTokens: 2000000,
        requestCount: 150,
        avgCostPerRequest: 0.016666666666666666,
      });
    });

    it('should handle user with no usage', async () => {
      const userId = 'user-456';
      const mockData = {
        _sum: { totalCost: null, totalTokens: null },
        _count: { id: 0 },
      };

      __mockExports.mockAggregate.mockResolvedValue(mockData);

      const result = await getCostByUser(userId, mockDateRange);

      expect(result.totalCost).toBe(0);
      expect(result.totalTokens).toBe(0);
      expect(result.avgCostPerRequest).toBe(0);
    });
  });

  describe('getAverageCostByPlan', () => {
    it('should return costs grouped by subscription plan', async () => {
      const mockData = [
        {
          subscription_plan: 'FREE',
          avg_cost: '0.5',
          user_count: 100,
          total_cost: '50.0',
        },
        {
          subscription_plan: 'PREMIUM',
          avg_cost: '2.0',
          user_count: 50,
          total_cost: '100.0',
        },
      ];

      __mockExports.mockQueryRaw.mockResolvedValue(mockData);

      const result = await getAverageCostByPlan(mockDateRange);

      expect(__mockExports.mockQueryRaw).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        subscriptionPlan: 'FREE',
        avgCost: 0.5,
        userCount: 100,
        totalCost: 50,
      });
    });

    it('should use default 30-day range when no date range provided', async () => {
      __mockExports.mockQueryRaw.mockResolvedValue([]);

      await getAverageCostByPlan();

      const callArgs = __mockExports.mockQueryRaw.mock.calls[0][0];
      expect(callArgs).toContainEqual(
        expect.stringContaining('createdAt')
      );
    });
  });

  describe('getTotalOperationalCost', () => {
    it('should sum all costs in date range', async () => {
      const mockData = {
        _sum: { totalCost: 150.5 },
      };

      __mockExports.mockAggregate.mockResolvedValue(mockData);

      const result = await getTotalOperationalCost(mockDateRange);

      expect(result).toBe(150.5);
    });

    it('should return 0 when no costs found', async () => {
      const mockData = {
        _sum: { totalCost: null },
      };

      __mockExports.mockAggregate.mockResolvedValue(mockData);

      const result = await getTotalOperationalCost(mockDateRange);

      expect(result).toBe(0);
    });
  });

  describe('getCostByModel', () => {
    it('should aggregate costs by provider and model', async () => {
      const mockData = [
        {
          provider: 'GEMINI',
          model: 'gemini-2.5-flash-lite',
          _sum: { totalCost: 10.5, totalTokens: 5000000 },
          _count: { id: 500 },
        },
      ];

      __mockExports.mockGroupBy.mockResolvedValue(mockData);

      const result = await getCostByModel(mockDateRange);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        provider: 'GEMINI',
        model: 'gemini-2.5-flash-lite',
        totalCost: 10.5,
        totalTokens: 5000000,
        requestCount: 500,
        avgCostPerRequest: 0.021,
      });
    });
  });

  describe('getDailyCosts', () => {
    it('should return time series data grouped by day', async () => {
      const mockData = [
        {
          date: new Date('2025-01-01'),
          total_cost: '5.5',
          total_tokens: '1000000',
          request_count: 50,
        },
        {
          date: new Date('2025-01-02'),
          total_cost: '7.0',
          total_tokens: '1200000',
          request_count: 60,
        },
      ];

      __mockExports.mockQueryRaw.mockResolvedValue(mockData);

      const result = await getDailyCosts(mockDateRange);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: new Date('2025-01-01'),
        totalCost: 5.5,
        totalTokens: 1000000,
        requestCount: 50,
      });
    });

    it('should order results by date ascending', async () => {
      const mockData = [
        { date: new Date('2025-01-02'), total_cost: '7.0', total_tokens: '1200000', request_count: 60 },
        { date: new Date('2025-01-01'), total_cost: '5.5', total_tokens: '1000000', request_count: 50 },
      ];

      __mockExports.mockQueryRaw.mockResolvedValue(mockData);

      await getDailyCosts(mockDateRange);

      // The SQL query should order by date ASC
      expect(__mockExports.mockQueryRaw).toHaveBeenCalled();
      const queryArg = __mockExports.mockQueryRaw.mock.calls[0][0];
      const queryString = Array.isArray(queryArg) ? queryArg.join('') : queryArg;
      expect(queryString).toContain('ORDER BY date ASC');
    });
  });

  describe('getTopUsersByCost', () => {
    it('should return users ordered by total cost', async () => {
      const mockData = [
        {
          userId: 'user-1',
          _sum: { totalCost: 50.5 },
          _count: { id: 500 },
        },
        {
          userId: 'user-2',
          _sum: { totalCost: 30.0 },
          _count: { id: 300 },
        },
      ];

      __mockExports.mockGroupBy.mockResolvedValue(mockData);

      const result = await getTopUsersByCost(mockDateRange, 10);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        userId: 'user-1',
        totalCost: 50.5,
        requestCount: 500,
      });
    });

    it('should use default limit of 50', async () => {
      __mockExports.mockGroupBy.mockResolvedValue([]);

      await getTopUsersByCost(mockDateRange);

      expect(__mockExports.mockGroupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      );
    });

    it('should exclude users with null userId', async () => {
      __mockExports.mockGroupBy.mockResolvedValue([]);

      await getTopUsersByCost(mockDateRange);

      expect(__mockExports.mockGroupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: { not: null },
          }),
        })
      );
    });
  });

  describe('getCachingMetrics', () => {
    it('should calculate cache hit rate and cost savings', async () => {
      const mockData = [
        {
          cached: true,
          _sum: { totalCost: 1.0 },
          _count: { id: 100 },
        },
        {
          cached: false,
          _sum: { totalCost: 9.0 },
          _count: { id: 100 },
        },
      ];

      __mockExports.mockGroupBy.mockResolvedValue(mockData);

      const result = await getCachingMetrics(mockDateRange);

      expect(result).toEqual({
        totalRequests: 200,
        cachedRequests: 100,
        cacheHitRate: 0.5,
        costSavings: 9, // (1.0 * 10 + 9.0) - (1.0 + 9.0) = 19 - 10 = 9
      });
    });

    it('should handle no cached requests', async () => {
      const mockData = [
        {
          cached: false,
          _sum: { totalCost: 10.0 },
          _count: { id: 100 },
        },
      ];

      __mockExports.mockGroupBy.mockResolvedValue(mockData);

      const result = await getCachingMetrics(mockDateRange);

      expect(result).toEqual({
        totalRequests: 100,
        cachedRequests: 0,
        cacheHitRate: 0,
        costSavings: 0,
      });
    });

    it('should handle empty results', async () => {
      __mockExports.mockGroupBy.mockResolvedValue([]);

      const result = await getCachingMetrics(mockDateRange);

      expect(result).toEqual({
        totalRequests: 0,
        cachedRequests: 0,
        cacheHitRate: 0,
        costSavings: 0,
      });
    });

    it('should correctly calculate cost savings for cached requests', async () => {
      // Cached requests cost 10% of original
      // If cached request cost is $0.10, the uncached cost would be $1.00
      // Savings = $1.00 - $0.10 = $0.90
      const mockData = [
        {
          cached: true,
          _sum: { totalCost: 0.10 },
          _count: { id: 1 },
        },
        {
          cached: false,
          _sum: { totalCost: 1.0 },
          _count: { id: 1 },
        },
      ];

      __mockExports.mockGroupBy.mockResolvedValue(mockData);

      const result = await getCachingMetrics(mockDateRange);

      // Cost without cache = 0.10 * 10 + 1.0 = 2.0
      // Actual cost = 0.10 + 1.0 = 1.1
      // Savings = 2.0 - 1.1 = 0.9
      expect(result.costSavings).toBeCloseTo(0.9, 10);
    });
  });
});
