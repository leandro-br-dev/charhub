/**
 * System Configuration Seed Script Unit Tests (Simplified)
 *
 * Tests for system configuration seed data:
 * - All 19 parameters are seeded
 * - Upsert doesn't overwrite existing values
 */

import { seedSystemConfiguration, CONFIG_PARAMETERS } from '../systemConfiguration';
import { setupTestDatabase, cleanDatabase, teardownTestDatabase, getTestDb } from '../../../test-utils/database';

// Increase timeout for database operations
jest.setTimeout(30000);

describe('System Configuration Seed', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('seedSystemConfiguration()', () => {
    it('should seed all 19 configuration parameters', async () => {
      const result = await seedSystemConfiguration({ verbose: false });

      expect(result.created).toBe(19);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Verify all configurations exist in database
      const db = getTestDb();
      const configs = await db.systemConfiguration.findMany();

      expect(configs).toHaveLength(19);

      // Verify all keys from CONFIG_PARAMETERS are present
      const seededKeys = configs.map((c: { key: string }) => c.key);
      const expectedKeys = CONFIG_PARAMETERS.map((p: { key: string }) => p.key);

      expectedKeys.forEach((key: string) => {
        expect(seededKeys).toContain(key);
      });
    });

    it('should not overwrite existing values when seeded again', async () => {
      const db = getTestDb();

      // First seed - create all entries (simplified)
      const firstResult = await seedSystemConfiguration({ verbose: false });
      expect(firstResult.created).toBe(19);
      expect(firstResult.skipped).toBe(0);

      // Modify one value directly in database
      await db.systemConfiguration.update({
        where: { key: 'translation.default_provider' },
        data: { value: 'openai' },
      });

      // Verify the modified value
      const modifiedConfig = await db.systemConfiguration.findUnique({
        where: { key: 'translation.default_provider' },
      });
      expect(modifiedConfig?.value).toBe('openai');

      // Second seed - should skip all existing entries
      const secondResult = await seedSystemConfiguration({ verbose: false });
      expect(secondResult.created).toBe(0);
      expect(secondResult.skipped).toBe(19);

      // Verify the modified value was NOT overwritten
      const configAfterSecondSeed = await db.systemConfiguration.findUnique({
        where: { key: 'translation.default_provider' },
      });
      expect(configAfterSecondSeed?.value).toBe('openai'); // Still 'openai', not 'gemini'
    });

    it('should respect .env values when provided', async () => {
      // Set environment variable
      process.env.TRANSLATION_DEFAULT_PROVIDER = 'openai';

      await seedSystemConfiguration({ verbose: false });

      const db = getTestDb();
      const config = await db.systemConfiguration.findUnique({
        where: { key: 'translation.default_provider' },
      });

      expect(config?.value).toBe('openai');

      // Clean up
      delete process.env.TRANSLATION_DEFAULT_PROVIDER;
    });

    it('should use default values when .env is not set', async () => {
      // Ensure .env variable is not set
      delete process.env.TRANSLATION_DEFAULT_PROVIDER;

      await seedSystemConfiguration({ verbose: false });

      const db = getTestDb();
      const config = await db.systemConfiguration.findUnique({
        where: { key: 'translation.default_provider' },
      });

      expect(config?.value).toBe('gemini'); // Default value
    });

    it('should handle dry run mode', async () => {
      const result = await seedSystemConfiguration({ dryRun: true });

      expect(result.created).toBe(19);
      expect(result.skipped).toBe(0);

      // In dry run, nothing should be created in database
      const db = getTestDb();
      const configs = await db.systemConfiguration.findMany();
      expect(configs).toHaveLength(0);
    });

    it('should return correct statistics', async () => {
      // Seed half of the configs first (simplified - only key and value)
      const db = getTestDb();
      await db.systemConfiguration.createMany({
        data: CONFIG_PARAMETERS.slice(0, 9).map((param: { key: string; defaultValue: string | number | boolean }) => ({
          key: param.key,
          value: String(param.defaultValue),
        })),
      });

      const result = await seedSystemConfiguration({ verbose: false });

      // Should skip the 9 existing, create 10 new
      expect(result.created).toBe(10);
      expect(result.skipped).toBe(9);
      expect(result.errors).toHaveLength(0);

      // Verify total is 19
      const allConfigs = await db.systemConfiguration.findMany();
      expect(allConfigs).toHaveLength(19);
    });

    it('should seed all translation parameters with correct defaults', async () => {
      await seedSystemConfiguration({ verbose: false });

      const db = getTestDb();
      const translationConfigs = await db.systemConfiguration.findMany({
        where: {
          key: { startsWith: 'translation.' },
        },
        orderBy: { key: 'asc' },
      });

      expect(translationConfigs).toHaveLength(4);

      // Verify specific translation configs
      const providerConfig = translationConfigs.find((c: { key: string }) => c.key === 'translation.default_provider');
      expect(providerConfig?.value).toBe('gemini');

      const modelConfig = translationConfigs.find((c: { key: string }) => c.key === 'translation.default_model');
      expect(modelConfig?.value).toBe('gemini-2.5-flash-lite');

      const ttlConfig = translationConfigs.find((c: { key: string }) => c.key === 'translation.cache_ttl');
      expect(ttlConfig?.value).toBe('3600');

      const preTranslateConfig = translationConfigs.find((c: { key: string }) => c.key === 'translation.enable_pre_translation');
      expect(preTranslateConfig?.value).toBe('false');
    });

    it('should seed boolean values as strings', async () => {
      await seedSystemConfiguration({ verbose: false });

      const db = getTestDb();
      // Find configs that should be boolean
      const boolConfigKeys = [
        'translation.enable_pre_translation',
        'generation.batch_enabled',
        'curation.require_manual_review',
        'moderation.nsfw_filter_enabled',
      ];

      const boolConfigs = await db.systemConfiguration.findMany({
        where: {
          key: { in: boolConfigKeys },
        },
      });

      // All boolean configs should be stored as 'true' or 'false' strings
      boolConfigs.forEach((config: { value: string }) => {
        expect(['true', 'false']).toContain(config.value);
      });
    });
  });

  describe('CONFIG_PARAMETERS constant', () => {
    it('should have exactly 19 parameters', () => {
      expect(CONFIG_PARAMETERS).toHaveLength(19);
    });

    it('should have unique keys', () => {
      const keys = CONFIG_PARAMETERS.map((p: { key: string }) => p.key);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(19);
    });

    it('should have valid envVar format (uppercase with underscores)', () => {
      CONFIG_PARAMETERS.forEach((param: { envVar: string }) => {
        expect(param.envVar).toBe(param.envVar.toUpperCase());
        expect(param.envVar).not.toContain('.');
      });
    });

    it('should have valid dot-notation keys', () => {
      CONFIG_PARAMETERS.forEach((param: { key: string }) => {
        expect(param.key).toMatch(/^[a-z][a-z0-9._]*$/);
      });
    });
  });
});
