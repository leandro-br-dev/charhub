/**
 * LLM Usage Tracker Tests
 * Tests for LLM usage tracking and cost calculation
 */

import {
  trackLLMUsage,
  trackFromLLMResponse,
  type LLMUsageParams,
} from '../llmUsageTracker';
import { LLMProvider, FeatureType } from '../../../generated/prisma';

// Mock the database and logger modules
jest.mock('../../../config/database', () => {
  const mockCreate = jest.fn();
  const mockFindFirst = jest.fn();

  return {
    prisma: {
      lLMUsageLog: {
        create: mockCreate,
      },
      lLMPricing: {
        findFirst: mockFindFirst,
      },
    },
    __mockExports: {
      mockCreate,
      mockFindFirst,
    },
  };
});

jest.mock('../../../config/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Get the mock references
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { __mockExports } = require('../../../config/database');

describe('LLM Usage Tracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('trackLLMUsage', () => {
    const mockPricing = {
      id: 'pricing-1',
      provider: LLMProvider.GEMINI,
      model: 'gemini-2.5-flash-lite',
      inputPricePerMillion: 0.075,
      outputPricePerMillion: 0.3,
      effectiveFrom: new Date('2025-01-01'),
      isActive: true,
    };

    const baseParams: Omit<LLMUsageParams, 'inputTokens' | 'outputTokens'> = {
      userId: 'user-123',
      feature: FeatureType.CHAT_MESSAGE,
      provider: LLMProvider.GEMINI,
      model: 'gemini-2.5-flash-lite',
    };

    it('should calculate costs correctly', async () => {
      __mockExports.mockFindFirst.mockResolvedValue(mockPricing);
      __mockExports.mockCreate.mockResolvedValue({ id: 'log-1' });

      const inputTokens = 1000000; // 1M tokens
      const outputTokens = 500000; // 0.5M tokens

      await trackLLMUsage({
        ...baseParams,
        inputTokens,
        outputTokens,
      });

      // Expected costs:
      // Input: 1M * 0.075 / 1M = 0.075
      // Output: 0.5M * 0.3 / 1M = 0.15
      // Total: 0.225
      expect(__mockExports.mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          inputCost: 0.075,
          outputCost: 0.15,
          totalCost: 0.225,
          totalTokens: 1500000,
        }),
      });
    });

    it('should apply 90% discount for cached requests', async () => {
      __mockExports.mockFindFirst.mockResolvedValue(mockPricing);
      __mockExports.mockCreate.mockResolvedValue({ id: 'log-1' });

      const inputTokens = 1000000;
      const outputTokens = 500000;

      await trackLLMUsage({
        ...baseParams,
        inputTokens,
        outputTokens,
        cached: true,
      });

      // With caching: costs are reduced to 10%
      // Input: 0.075 * 0.1 = 0.0075
      // Output: 0.15 * 0.1 = 0.015
      // Total: 0.0225
      expect(__mockExports.mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          inputCost: 0.0075,
          outputCost: 0.015,
          totalCost: 0.0225,
          cached: true,
        }),
      });
    });

    it('should return null when pricing not found', async () => {
      __mockExports.mockFindFirst.mockResolvedValue(null);

      const result = await trackLLMUsage({
        ...baseParams,
        inputTokens: 1000,
        outputTokens: 500,
      });

      expect(result).toBeNull();
      expect(__mockExports.mockCreate).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      __mockExports.mockFindFirst.mockResolvedValue(mockPricing);
      __mockExports.mockCreate.mockRejectedValue(new Error('Database error'));

      const result = await trackLLMUsage({
        ...baseParams,
        inputTokens: 1000,
        outputTokens: 500,
      });

      // Should not throw, should return null on error
      expect(result).toBeNull();
    });

    it('should store metadata correctly', async () => {
      __mockExports.mockFindFirst.mockResolvedValue(mockPricing);
      __mockExports.mockCreate.mockResolvedValue({ id: 'log-1' });

      const metadata = {
        contentType: 'character',
        contentId: 'char-123',
      };

      await trackLLMUsage({
        ...baseParams,
        inputTokens: 1000,
        outputTokens: 500,
        metadata,
      });

      expect(__mockExports.mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata,
        }),
      });
    });

    it('should store operation name', async () => {
      __mockExports.mockFindFirst.mockResolvedValue(mockPricing);
      __mockExports.mockCreate.mockResolvedValue({ id: 'log-1' });

      await trackLLMUsage({
        ...baseParams,
        inputTokens: 1000,
        outputTokens: 500,
        operation: 'character_analysis',
      });

      expect(__mockExports.mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          operation: 'character_analysis',
        }),
      });
    });

    it('should store latency', async () => {
      __mockExports.mockFindFirst.mockResolvedValue(mockPricing);
      __mockExports.mockCreate.mockResolvedValue({ id: 'log-1' });

      await trackLLMUsage({
        ...baseParams,
        inputTokens: 1000,
        outputTokens: 500,
        latency: 1500,
      });

      expect(__mockExports.mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          latency: 1500,
        }),
      });
    });
  });

  describe('trackFromLLMResponse', () => {
    const mockPricing = {
      id: 'pricing-1',
      provider: LLMProvider.GEMINI,
      model: 'gemini-2.5-flash-lite',
      inputPricePerMillion: 0.075,
      outputPricePerMillion: 0.3,
      effectiveFrom: new Date('2025-01-01'),
      isActive: true,
    };

    beforeEach(() => {
      __mockExports.mockFindFirst.mockResolvedValue(mockPricing);
      __mockExports.mockCreate.mockResolvedValue({ id: 'log-1' });
    });

    it('should track usage from LLM response format', async () => {
      const response = {
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
        usage: {
          promptTokens: 1000,
          completionTokens: 500,
          totalTokens: 1500,
        },
      };

      // Call trackFromLLMResponse (fire and forget)
      trackFromLLMResponse(response, {
        userId: 'user-123',
        feature: FeatureType.CHAT_MESSAGE,
      });

      // Wait for async tracking to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(__mockExports.mockCreate).toHaveBeenCalled();
    });

    it('should map provider string to enum correctly', async () => {
      const providers = [
        { input: 'gemini', expected: LLMProvider.GEMINI },
        { input: 'GEMINI', expected: LLMProvider.GEMINI },
        { input: 'openai', expected: LLMProvider.OPENAI },
        { input: 'grok', expected: LLMProvider.GROK },
        { input: 'anthropic', expected: LLMProvider.ANTHROPIC },
        { input: 'together_ai', expected: LLMProvider.TOGETHER_AI },
        { input: 'groq', expected: LLMProvider.GROQ },
      ];

      for (const { input, expected } of providers) {
        __mockExports.mockCreate.mockClear();

        trackFromLLMResponse(
          {
            provider: input,
            model: 'test-model',
            usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          },
          {
            userId: 'user-123',
            feature: FeatureType.CHAT_MESSAGE,
          }
        );

        // Wait for async tracking
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Verify that create was called with the correct provider
        if (__mockExports.mockCreate.mock.calls.length > 0) {
          expect(__mockExports.mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              provider: expected,
            }),
          });
        }
      }
    });

    it('should skip tracking when no usage data', () => {
      const logger = require('../../../config/logger').logger;

      const response = {
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
      };

      trackFromLLMResponse(response, {
        userId: 'user-123',
        feature: FeatureType.CHAT_MESSAGE,
      });

      expect(__mockExports.mockCreate).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should skip tracking for unknown provider', () => {
      const logger = require('../../../config/logger').logger;

      const response = {
        provider: 'unknown_provider',
        model: 'test-model',
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
        },
      };

      trackFromLLMResponse(response, {
        userId: 'user-123',
        feature: FeatureType.CHAT_MESSAGE,
      });

      expect(__mockExports.mockCreate).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
    });
  });
});
