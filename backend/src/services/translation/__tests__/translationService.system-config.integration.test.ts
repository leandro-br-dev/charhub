/**
 * Translation Service System Configuration Integration Tests (Simplified)
 *
 * Tests that translation service reads configuration from systemConfigurationService
 * instead of process.env (FEATURE-027 migration verification)
 */

import { TranslationService, translationService } from '../translationService';
import { setupTestDatabase, cleanDatabase, teardownTestDatabase, getTestDb } from '../../../test-utils/database';
import { systemConfigurationService } from '../../config/systemConfigurationService';

// Mock the LLM service to avoid real API calls
jest.mock('../../llm', () => ({
  callLLM: jest.fn().mockImplementation(({ provider, model }) => {
    return Promise.resolve({
      content: 'Translated text',
      provider: provider || 'gemini',
      model: model || 'gemini-2.5-flash-lite',
      inputTokens: 10,
      outputTokens: 5,
    });
  }),
}));

// Mock Redis
jest.mock('../../../config/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    keys: jest.fn().mockResolvedValue([]),
    del: jest.fn(),
  },
}));

// Mock LLM usage tracker
jest.mock('../../llm/llmUsageTracker', () => ({
  trackFromLLMResponse: jest.fn().mockResolvedValue(undefined),
  trackLLMUsage: jest.fn().mockResolvedValue(undefined),
}));

jest.setTimeout(30000);

describe('TranslationService - System Configuration Integration', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
    // Clear service instance cache to force re-initialization
    (translationService as any).defaultProvider = 'gemini';
    (translationService as any).defaultModel = 'gemini-2.5-flash-lite';
    (translationService as any).defaultCacheTTL = 3600;
    (translationService as any).configInitialized = false;
    // Clear systemConfigurationService cache
    (systemConfigurationService as any).cache.clear();
    (systemConfigurationService as any).cacheInitialized = false;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('Configuration from SystemConfigurationService', () => {
    it('should read provider from systemConfigurationService', async () => {
      const db = getTestDb();

      // Set provider in database (simplified - only key and value)
      await db.systemConfiguration.create({
        data: {
          key: 'translation.default_provider',
          value: 'openai',
        },
      });

      // Initialize cache
      await systemConfigurationService.initializeCache();

      // Create new service instance to force config initialization
      const service = new TranslationService();
      const request = {
        contentType: 'character',
        contentId: 'test-char-1',
        fieldName: 'firstName',
        originalText: 'Hello',
        originalLanguageCode: 'en',
        targetLanguageCode: 'pt-BR',
      };

      const result = await service.translate(request);

      // The service should use 'openai' as provider
      // We can verify by checking that translate was called
      expect(result).toBeDefined();
      expect(result.provider).toBe('openai');
    });

    it('should read model from systemConfigurationService', async () => {
      const db = getTestDb();

      // Set model in database (simplified)
      await db.systemConfiguration.create({
        data: {
          key: 'translation.default_model',
          value: 'gpt-4o',
        },
      });

      await systemConfigurationService.initializeCache();

      const service = new TranslationService();
      const request = {
        contentType: 'character',
        contentId: 'test-char-1',
        fieldName: 'firstName',
        originalText: 'Hello',
        originalLanguageCode: 'en',
        targetLanguageCode: 'pt-BR',
      };

      const result = await service.translate(request);

      expect(result.model).toBe('gpt-4o');
    });

    it('should read cache TTL from systemConfigurationService', async () => {
      const db = getTestDb();
      const { redis } = require('../../../config/redis');

      // Set cache TTL in database (simplified)
      await db.systemConfiguration.create({
        data: {
          key: 'translation.cache_ttl',
          value: '7200',
        },
      });

      await systemConfigurationService.initializeCache();

      const service = new TranslationService();
      const request = {
        contentType: 'character',
        contentId: 'test-char-1',
        fieldName: 'firstName',
        originalText: 'Hello',
        originalLanguageCode: 'en',
        targetLanguageCode: 'pt-BR',
      };

      await service.translate(request);

      // Verify Redis was called with correct TTL (7200 seconds)
      expect(redis.setex).toHaveBeenCalledWith(
        expect.any(String),
        7200,
        expect.any(String)
      );
    });

    it('should fall back to default values when DB config is missing', async () => {
      // Ensure no config in database
      await systemConfigurationService.initializeCache();

      const service = new TranslationService();
      const request = {
        contentType: 'character',
        contentId: 'test-char-1',
        fieldName: 'firstName',
        originalText: 'Hello',
        originalLanguageCode: 'en',
        targetLanguageCode: 'pt-BR',
      };

      const result = await service.translate(request);

      // Should use default values
      expect(result.provider).toBe('gemini'); // Default provider
      expect(result.model).toBe('gemini-2.5-flash-lite'); // Default model
    });

    it('should prioritize database values over process.env', async () => {
      const db = getTestDb();

      // Set .env variable
      process.env.TRANSLATION_DEFAULT_PROVIDER = 'grok';

      // Set different value in database (simplified)
      await db.systemConfiguration.create({
        data: {
          key: 'translation.default_provider',
          value: 'openai',
        },
      });

      await systemConfigurationService.initializeCache();

      const service = new TranslationService();
      const request = {
        contentType: 'character',
        contentId: 'test-char-1',
        fieldName: 'firstName',
        originalText: 'Hello',
        originalLanguageCode: 'en',
        targetLanguageCode: 'pt-BR',
      };

      const result = await service.translate(request);

      // Database value should take precedence over .env
      expect(result.provider).toBe('openai');

      // Clean up
      delete process.env.TRANSLATION_DEFAULT_PROVIDER;
    });

    it('should cache configuration after first initialization', async () => {
      const db = getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'translation.default_provider',
          value: 'openai',
        },
      });

      await systemConfigurationService.initializeCache();

      const service = new TranslationService();

      // First call initializes config
      const request1 = {
        contentType: 'character',
        contentId: 'test-char-1',
        fieldName: 'firstName',
        originalText: 'Hello',
        originalLanguageCode: 'en',
        targetLanguageCode: 'pt-BR',
      };

      const result1 = await service.translate(request1);
      expect(result1.provider).toBe('openai');

      // Update database
      await db.systemConfiguration.update({
        where: { key: 'translation.default_provider' },
        data: { value: 'gemini' },
      });

      // Second call should use cached config (not new DB value)
      const request2 = {
        contentType: 'character',
        contentId: 'test-char-2',
        fieldName: 'firstName',
        originalText: 'World',
        originalLanguageCode: 'en',
        targetLanguageCode: 'pt-BR',
      };

      const result2 = await service.translate(request2);
      expect(result2.provider).toBe('openai'); // Still 'openai' from cache
    });

    it('should handle numeric configuration values correctly', async () => {
      const db = getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'translation.cache_ttl',
          value: '1800',
        },
      });

      await systemConfigurationService.initializeCache();

      const service = new TranslationService();
      const request = {
        contentType: 'character',
        contentId: 'test-char-1',
        fieldName: 'firstName',
        originalText: 'Hello',
        originalLanguageCode: 'en',
        targetLanguageCode: 'pt-BR',
      };

      await service.translate(request);

      const { redis } = require('../../../config/redis');
      expect(redis.setex).toHaveBeenCalledWith(
        expect.any(String),
        1800,
        expect.any(String)
      );
    });
  });

  describe('Integration with systemConfigurationService.get* methods', () => {
    it('should use getInt for cache TTL configuration', async () => {
      const db = getTestDb();

      // Create config with numeric value stored as string (simplified)
      await db.systemConfiguration.create({
        data: {
          key: 'translation.cache_ttl',
          value: '7200', // Stored as string
        },
      });

      // Verify getInt returns a number
      const cacheTTL = await systemConfigurationService.getInt('translation.cache_ttl', 3600);
      expect(typeof cacheTTL).toBe('number');
      expect(cacheTTL).toBe(7200);
    });

    it('should use get for provider and model strings', async () => {
      const db = getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'translation.default_provider',
          value: 'openai',
        },
      });

      const provider = await systemConfigurationService.get('translation.default_provider');
      expect(provider).toBe('openai');
    });

    it('should handle multiple config values loaded together', async () => {
      const db = getTestDb();

      await db.systemConfiguration.createMany({
        data: [
          {
            key: 'translation.default_provider',
            value: 'openai',
          },
          {
            key: 'translation.default_model',
            value: 'gpt-4o',
          },
          {
            key: 'translation.cache_ttl',
            value: '7200',
          },
        ],
      });

      await systemConfigurationService.initializeCache();

      // Use getMany to verify all values are loaded
      const configs = await systemConfigurationService.getMany([
        'translation.default_provider',
        'translation.default_model',
        'translation.cache_ttl',
      ]);

      expect(configs['translation.default_provider']).toBe('openai');
      expect(configs['translation.default_model']).toBe('gpt-4o');
      expect(configs['translation.cache_ttl']).toBe('7200');
    });
  });

  describe('Migration verification - Service no longer uses process.env', () => {
    it('should not use process.env for provider when DB value exists', async () => {
      const db = getTestDb();

      // Set both .env and database to different values
      process.env.TRANSLATION_DEFAULT_PROVIDER = 'env_provider';
      await db.systemConfiguration.create({
        data: {
          key: 'translation.default_provider',
          value: 'db_provider',
        },
      });

      await systemConfigurationService.initializeCache();

      const service = new TranslationService();
      const request = {
        contentType: 'character',
        contentId: 'test-char-1',
        fieldName: 'firstName',
        originalText: 'Hello',
        originalLanguageCode: 'en',
        targetLanguageCode: 'pt-BR',
      };

      const result = await service.translate(request);

      // DB value should be used, not .env
      expect(result.provider).toBe('db_provider');
      expect(result.provider).not.toBe('env_provider');

      // Clean up
      delete process.env.TRANSLATION_DEFAULT_PROVIDER;
    });

    it('should initialize config on first translate call', async () => {
      const db = getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'translation.default_provider',
          value: 'openai',
        },
      });

      await systemConfigurationService.initializeCache();

      // Create service with defaults
      const service = new TranslationService();

      // Before first translate, should have default values
      expect((service as any).defaultProvider).toBe('gemini');

      // After first translate, should have DB values
      const request = {
        contentType: 'character',
        contentId: 'test-char-1',
        fieldName: 'firstName',
        originalText: 'Hello',
        originalLanguageCode: 'en',
        targetLanguageCode: 'pt-BR',
      };

      await service.translate(request);

      // Config should now be initialized from DB
      expect((service as any).defaultProvider).toBe('openai');
    });
  });
});
