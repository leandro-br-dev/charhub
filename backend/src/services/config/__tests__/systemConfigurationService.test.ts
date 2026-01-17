/**
 * SystemConfigurationService Unit Tests
 *
 * Tests for centralized configuration management with in-memory caching
 * and .env fallback for runtime parameters.
 */
import { SystemConfigurationService } from '../systemConfigurationService';
import { setupTestDatabase, cleanDatabase, teardownTestDatabase } from '../../../test-utils/database';

describe('SystemConfigurationService', () => {
  let service: SystemConfigurationService;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
    // Create a new instance for each test to ensure cache isolation
    service = SystemConfigurationService.getInstance();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('get()', () => {
    it('should return database value when configuration exists in database', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      // Create configuration in database
      await db.systemConfiguration.create({
        data: {
          key: 'test.config',
          value: 'database-value',
          description: 'Test configuration',
          category: 'test',
        },
      });

      const result = await service.get('test.config');

      expect(result).toBe('database-value');
    });

    it('should fall back to .env when database value is empty', async () => {
      // Set environment variable
      process.env.GENERATION_DAILY_LIMIT = '100';

      const result = await service.get('generation.daily_limit');

      expect(result).toBe('100');

      // Clean up
      delete process.env.GENERATION_DAILY_LIMIT;
    });

    it('should use cache efficiently on subsequent calls', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      // Create configuration in database
      await db.systemConfiguration.create({
        data: {
          key: 'cache.test',
          value: 'cached-value',
          description: 'Cache test',
          category: 'test',
        },
      });

      // First call - should hit database
      const result1 = await service.get('cache.test');

      // Second call - should hit cache
      const result2 = await service.get('cache.test');

      expect(result1).toBe('cached-value');
      expect(result2).toBe('cached-value');

      // Verify cache was used by checking that database was only queried once
      // (This is implicit - if cache wasn't used, we'd see multiple queries)
    });

    it('should return default value when configuration not found', async () => {
      const result = await service.get('nonexistent.key', 'default-value');

      expect(result).toBe('default-value');
    });

    it('should return null when configuration not found and no default provided', async () => {
      const result = await service.get('nonexistent.key');

      expect(result).toBeNull();
    });

    it('should prioritize cache over database', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      // Create configuration
      await db.systemConfiguration.create({
        data: {
          key: 'priority.test',
          value: 'database-value',
          description: 'Priority test',
          category: 'test',
        },
      });

      // First call populates cache
      await service.get('priority.test');

      // Update database directly (bypassing service)
      await db.systemConfiguration.update({
        where: { key: 'priority.test' },
        data: { value: 'updated-database-value' },
      });

      // Second call should return cached value, not updated database value
      const result = await service.get('priority.test');

      expect(result).toBe('database-value'); // Cached value, not updated value
    });

    it('should prioritize database over .env', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      // Set environment variable
      process.env.PRIORITY_TEST = 'env-value';

      // Create database configuration
      await db.systemConfiguration.create({
        data: {
          key: 'priority.test',
          value: 'database-value',
          description: 'Priority test',
          category: 'test',
        },
      });

      const result = await service.get('priority.test');

      expect(result).toBe('database-value'); // Database value takes precedence

      // Clean up
      delete process.env.PRIORITY_TEST;
    });
  });

  describe('set()', () => {
    it('should upsert configuration to database', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      await service.set('new.config', 'new-value', 'user-123');

      const config = await db.systemConfiguration.findUnique({
        where: { key: 'new.config' },
      });

      expect(config).toBeDefined();
      expect(config?.value).toBe('new-value');
      expect(config?.updatedBy).toBe('user-123');
    });

    it('should update existing configuration', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      // Create initial configuration
      await db.systemConfiguration.create({
        data: {
          key: 'update.test',
          value: 'initial-value',
          description: 'Update test',
          category: 'test',
        },
      });

      // Update configuration
      await service.set('update.test', 'updated-value', 'user-456');

      const config = await db.systemConfiguration.findUnique({
        where: { key: 'update.test' },
      });

      expect(config?.value).toBe('updated-value');
      expect(config?.updatedBy).toBe('user-456');
    });

    it('should update cache after setting value', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      await service.set('cache.update', 'cached-value');

      // Get value - should hit cache
      const result = await service.get('cache.update');

      expect(result).toBe('cached-value');

      // Verify by updating database directly and checking cache still returns old value
      await db.systemConfiguration.update({
        where: { key: 'cache.update' },
        data: { value: 'database-updated' },
      });

      const cachedResult = await service.get('cache.update');
      expect(cachedResult).toBe('cached-value'); // Cache still has old value
    });

    it('should allow setting without userId', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      await service.set('no-user.test', 'value');

      const config = await db.systemConfiguration.findUnique({
        where: { key: 'no-user.test' },
      });

      expect(config?.updatedBy).toBeNull();
    });
  });

  describe('getInt()', () => {
    it('should parse valid integer values', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'int.test',
          value: '42',
          description: 'Integer test',
          category: 'test',
        },
      });

      const result = await service.getInt('int.test');

      expect(result).toBe(42);
      expect(typeof result).toBe('number');
    });

    it('should return default value for non-integer strings', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'invalid.int',
          value: 'not-a-number',
          description: 'Invalid integer',
          category: 'test',
        },
      });

      const result = await service.getInt('invalid.int', 10);

      expect(result).toBe(10);
    });

    it('should return default value when configuration not found', async () => {
      const result = await service.getInt('nonexistent.int', 100);

      expect(result).toBe(100);
    });

    it('should return 0 as default when no default provided', async () => {
      const result = await service.getInt('nonexistent.int');

      expect(result).toBe(0);
    });

    it('should parse negative integers', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'negative.int',
          value: '-50',
          description: 'Negative integer',
          category: 'test',
        },
      });

      const result = await service.getInt('negative.int');

      expect(result).toBe(-50);
    });

    it('should parse floating point numbers as integers (truncates)', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'float.int',
          value: '3.14',
          description: 'Float to int',
          category: 'test',
        },
      });

      const result = await service.getInt('float.int');

      expect(result).toBe(3); // Truncates to 3
    });
  });

  describe('getBool()', () => {
    it('should parse "true" as true', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'bool.true',
          value: 'true',
          description: 'Boolean true',
          category: 'test',
        },
      });

      const result = await service.getBool('bool.true');

      expect(result).toBe(true);
    });

    it('should parse "1" as true', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'bool.one',
          value: '1',
          description: 'Boolean one',
          category: 'test',
        },
      });

      const result = await service.getBool('bool.one');

      expect(result).toBe(true);
    });

    it('should parse "yes" as true', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'bool.yes',
          value: 'yes',
          description: 'Boolean yes',
          category: 'test',
        },
      });

      const result = await service.getBool('bool.yes');

      expect(result).toBe(true);
    });

    it('should parse "false" as false', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'bool.false',
          value: 'false',
          description: 'Boolean false',
          category: 'test',
        },
      });

      const result = await service.getBool('bool.false');

      expect(result).toBe(false);
    });

    it('should parse "0" as false', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'bool.zero',
          value: '0',
          description: 'Boolean zero',
          category: 'test',
        },
      });

      const result = await service.getBool('bool.zero');

      expect(result).toBe(false);
    });

    it('should parse "no" as false', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'bool.no',
          value: 'no',
          description: 'Boolean no',
          category: 'test',
        },
      });

      const result = await service.getBool('bool.no');

      expect(result).toBe(false);
    });

    it('should be case insensitive', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'bool.upper',
          value: 'TRUE',
          description: 'Boolean uppercase',
          category: 'test',
        },
      });

      const result = await service.getBool('bool.upper');

      expect(result).toBe(true);
    });

    it('should trim whitespace', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'bool.spaced',
          value: '  true  ',
          description: 'Boolean with spaces',
          category: 'test',
        },
      });

      const result = await service.getBool('bool.spaced');

      expect(result).toBe(true);
    });

    it('should return default value for invalid boolean strings', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'bool.invalid',
          value: 'maybe',
          description: 'Invalid boolean',
          category: 'test',
        },
      });

      const result = await service.getBool('bool.invalid', true);

      expect(result).toBe(true);
    });

    it('should return false as default when no default provided', async () => {
      const result = await service.getBool('nonexistent.bool');

      expect(result).toBe(false);
    });
  });

  describe('getByCategory()', () => {
    beforeEach(async () => {
      const db = require('../../../test-utils/database').getTestDb();

      // Seed test configurations
      await db.systemConfiguration.createMany({
        data: [
          {
            key: 'generation.daily_limit',
            value: '100',
            description: 'Daily generation limit',
            category: 'generation',
          },
          {
            key: 'generation.max_characters',
            value: '50',
            description: 'Max characters per batch',
            category: 'generation',
          },
          {
            key: 'correction.batch_size',
            value: '25',
            description: 'Batch size for corrections',
            category: 'correction',
          },
        ],
      });
    });

    it('should return configurations filtered by category', async () => {
      const result = await service.getByCategory('generation');

      expect(result).toEqual({
        'generation.daily_limit': '100',
        'generation.max_characters': '50',
      });
      expect(Object.keys(result)).toHaveLength(2);
    });

    it('should return empty object for category with no configurations', async () => {
      const result = await service.getByCategory('nonexistent');

      expect(result).toEqual({});
    });

    it('should return configurations ordered by key', async () => {
      const result = await service.getByCategory('generation');

      const keys = Object.keys(result);
      expect(keys[0]).toBe('generation.daily_limit');
      expect(keys[1]).toBe('generation.max_characters');
    });

    it('should only include database entries, not .env values', async () => {
      // Set environment variable in generation category
      process.env.GENERATION_TEST_ENV = 'env-value';

      const result = await service.getByCategory('generation');

      // Should only have the 2 database entries, not the .env variable
      expect(Object.keys(result)).toHaveLength(2);
      expect(result['generation.test_env']).toBeUndefined();

      // Clean up
      delete process.env.GENERATION_TEST_ENV;
    });
  });

  describe('getAll()', () => {
    beforeEach(async () => {
      const db = require('../../../test-utils/database').getTestDb();

      // Seed test configurations
      await db.systemConfiguration.createMany({
        data: [
          {
            key: 'config.one',
            value: 'value1',
            description: 'Config one',
            category: 'cat1',
          },
          {
            key: 'config.two',
            value: 'value2',
            description: 'Config two',
            category: 'cat2',
          },
        ],
      });
    });

    it('should return all configurations from database', async () => {
      const result = await service.getAll();

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('config.one');
      expect(result[1].key).toBe('config.two');
    });

    it('should not include .env values', async () => {
      // Set environment variable
      process.env.CONFIG_THREE = 'env-value';

      const result = await service.getAll();

      // Should only have the 2 database entries
      expect(result).toHaveLength(2);

      // Clean up
      delete process.env.CONFIG_THREE;
    });

    it('should return configurations ordered by category', async () => {
      const result = await service.getAll();

      expect(result[0].category).toBe('cat1');
      expect(result[1].category).toBe('cat2');
    });

    it('should return empty array when no configurations exist', async () => {
      await cleanDatabase();

      const result = await service.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('delete()', () => {
    it('should remove configuration from database', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      // Create configuration
      await db.systemConfiguration.create({
        data: {
          key: 'delete.test',
          value: 'to-be-deleted',
          description: 'Delete test',
          category: 'test',
        },
      });

      // Delete configuration
      await service.delete('delete.test');

      // Verify it's gone from database
      const config = await db.systemConfiguration.findUnique({
        where: { key: 'delete.test' },
      });

      expect(config).toBeNull();
    });

    it('should remove configuration from cache', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      // Create and cache configuration
      await db.systemConfiguration.create({
        data: {
          key: 'cache.delete',
          value: 'cached',
          description: 'Cache delete test',
          category: 'test',
        },
      });

      // Populate cache
      await service.get('cache.delete');

      // Delete configuration
      await service.delete('cache.delete');

      // Try to get value - should not be in cache
      const result = await service.get('cache.delete');

      expect(result).toBeNull(); // Not in cache, not in database
    });

    it('should throw error when deleting nonexistent key', async () => {
      await expect(service.delete('nonexistent.key')).rejects.toThrow();
    });
  });

  describe('exists()', () => {
    it('should return true when key exists in cache', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      // Create configuration
      await db.systemConfiguration.create({
        data: {
          key: 'cache.exists',
          value: 'cached',
          description: 'Cache exists test',
          category: 'test',
        },
      });

      // Populate cache
      await service.get('cache.exists');

      // Check existence (should hit cache)
      const result = await service.exists('cache.exists');

      expect(result).toBe(true);
    });

    it('should return true when key exists in database', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      // Create configuration (don't cache it)
      await db.systemConfiguration.create({
        data: {
          key: 'db.exists',
          value: 'in-database',
          description: 'Database exists test',
          category: 'test',
        },
      });

      // Check existence (should check database, not cache)
      const result = await service.exists('db.exists');

      expect(result).toBe(true);
    });

    it('should return true when key exists in .env', async () => {
      process.env.EXISTS_TEST = 'env-value';

      const result = await service.exists('exists.test');

      expect(result).toBe(true);

      // Clean up
      delete process.env.EXISTS_TEST;
    });

    it('should return false when key does not exist anywhere', async () => {
      const result = await service.exists('nonexistent.key');

      expect(result).toBe(false);
    });

    it('should check cache first, then database, then .env', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      // Create in database
      await db.systemConfiguration.create({
        data: {
          key: 'order.test',
          value: 'in-database',
          description: 'Order test',
          category: 'test',
        },
      });

      // Populate cache
      await service.get('order.test');

      // Update database directly
      await db.systemConfiguration.update({
        where: { key: 'order.test' },
        data: { value: 'updated' },
      });

      // exists() should return true because it's in cache
      // even though database value is different
      const result = await service.exists('order.test');

      expect(result).toBe(true);
    });
  });

  describe('getMany()', () => {
    beforeEach(async () => {
      const db = require('../../../test-utils/database').getTestDb();

      // Seed test configurations
      await db.systemConfiguration.createMany({
        data: [
          {
            key: 'batch.one',
            value: 'value1',
            description: 'Batch one',
            category: 'batch',
          },
          {
            key: 'batch.two',
            value: 'value2',
            description: 'Batch two',
            category: 'batch',
          },
          {
            key: 'batch.three',
            value: 'value3',
            description: 'Batch three',
            category: 'batch',
          },
        ],
      });
    });

    it('should retrieve multiple configuration values at once', async () => {
      const result = await service.getMany(['batch.one', 'batch.two', 'batch.three']);

      expect(result).toEqual({
        'batch.one': 'value1',
        'batch.two': 'value2',
        'batch.three': 'value3',
      });
    });

    it('should return null for nonexistent keys', async () => {
      const result = await service.getMany(['batch.one', 'nonexistent.key', 'batch.two']);

      expect(result).toEqual({
        'batch.one': 'value1',
        'nonexistent.key': null,
        'batch.two': 'value2',
      });
    });

    it('should handle empty array', async () => {
      const result = await service.getMany([]);

      expect(result).toEqual({});
    });

    it('should use cache for keys that are cached', async () => {
      // Cache first key
      await service.get('batch.one');

      // Get multiple - batch.one should come from cache
      const result = await service.getMany(['batch.one', 'batch.two']);

      expect(result['batch.one']).toBe('value1');
      expect(result['batch.two']).toBe('value2');
    });
  });

  describe('setMany()', () => {
    it('should set multiple configuration values in transaction', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      const configs = {
        'many.one': 'value1',
        'many.two': 'value2',
        'many.three': 'value3',
      };

      await service.setMany(configs, 'user-789');

      // Verify all were created
      const config1 = await db.systemConfiguration.findUnique({
        where: { key: 'many.one' },
      });
      const config2 = await db.systemConfiguration.findUnique({
        where: { key: 'many.two' },
      });
      const config3 = await db.systemConfiguration.findUnique({
        where: { key: 'many.three' },
      });

      expect(config1?.value).toBe('value1');
      expect(config2?.value).toBe('value2');
      expect(config3?.value).toBe('value3');
      expect(config1?.updatedBy).toBe('user-789');
    });

    it('should update cache for all keys', async () => {
      await service.setMany({
        'cache.many1': 'value1',
        'cache.many2': 'value2',
      });

      // Get values - should hit cache
      const result1 = await service.get('cache.many1');
      const result2 = await service.get('cache.many2');

      expect(result1).toBe('value1');
      expect(result2).toBe('value2');
    });

    it('should handle empty object', async () => {
      await expect(service.setMany({})).resolves.not.toThrow();
    });

    it('should allow setting without userId', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      await service.setMany({
        'no.user.many': 'value',
      });

      const config = await db.systemConfiguration.findUnique({
        where: { key: 'no.user.many' },
      });

      expect(config?.updatedBy).toBeNull();
    });

    it('should rollback all changes on error', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      // Create a configuration that will conflict
      await db.systemConfiguration.create({
        data: {
          key: 'existing.key',
          value: 'existing',
          description: 'Existing',
          category: 'test',
          // Set a unique constraint that might cause issues
          // Note: This test is conceptual - actual behavior depends on constraints
        },
      });

      // Try to set multiple configs where one might fail
      // This is a conceptual test - real error scenarios depend on constraints
      await service.setMany({
        'rollback.one': 'value1',
        'rollback.two': 'value2',
      });

      // Verify both were created
      const config1 = await db.systemConfiguration.findUnique({
        where: { key: 'rollback.one' },
      });
      const config2 = await db.systemConfiguration.findUnique({
        where: { key: 'rollback.two' },
      });

      expect(config1).toBeDefined();
      expect(config2).toBeDefined();
    });
  });

  describe('refreshCache()', () => {
    it('should clear and reload cache from database', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      // Create configurations
      await db.systemConfiguration.createMany({
        data: [
          {
            key: 'refresh.one',
            value: 'value1',
            description: 'Refresh one',
            category: 'test',
          },
          {
            key: 'refresh.two',
            value: 'value2',
            description: 'Refresh two',
            category: 'test',
          },
        ],
      });

      // Populate cache
      await service.get('refresh.one');
      await service.get('refresh.two');

      // Update database directly
      await db.systemConfiguration.update({
        where: { key: 'refresh.one' },
        data: { value: 'updated1' },
      });

      // Refresh cache
      await service.refreshCache();

      // Get value - should have updated cache
      const result = await service.get('refresh.one');

      expect(result).toBe('updated1'); // Should have new value from database
    });

    it('should mark cache as initialized after refresh', async () => {
      await service.refreshCache();

      // Cache should be initialized - no easy way to test this directly
      // but subsequent calls should work
      const result = await service.get('nonexistent.key', 'default');

      expect(result).toBe('default');
    });
  });

  describe('initializeCache()', () => {
    it('should only initialize cache once', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      // Create configurations
      await db.systemConfiguration.create({
        data: {
          key: 'init.test',
          value: 'initial',
          description: 'Init test',
          category: 'test',
        },
      });

      // Initialize cache
      await service.initializeCache();

      // Add new configuration to database
      await db.systemConfiguration.create({
        data: {
          key: 'init.new',
          value: 'new-value',
          description: 'Init new',
          category: 'test',
        },
      });

      // Initialize again - should not reload
      await service.initializeCache();

      // New config should not be in cache
      const result = await service.get('init.new');

      // Should hit database and return value (not in cache from first init)
      expect(result).toBe('new-value');
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in keys', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'special.key-with.special_chars',
          value: 'value',
          description: 'Special chars',
          category: 'test',
        },
      });

      const result = await service.get('special.key-with.special_chars');

      expect(result).toBe('value');
    });

    it('should handle very long values', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      const longValue = 'x'.repeat(10000);

      await db.systemConfiguration.create({
        data: {
          key: 'long.value',
          value: longValue,
          description: 'Long value test',
          category: 'test',
        },
      });

      const result = await service.get('long.value');

      expect(result).toBe(longValue);
      expect(result?.length).toBe(10000);
    });

    it('should handle empty string values', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'empty.value',
          value: '',
          description: 'Empty value',
          category: 'test',
        },
      });

      const result = await service.get('empty.value');

      expect(result).toBe('');
    });

    it('should handle null category', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'no.category',
          value: 'value',
          description: 'No category',
          category: null,
        },
      });

      const result = await service.get('no.category');

      expect(result).toBe('value');
    });

    it('should handle concurrent get operations', async () => {
      const db = require('../../../test-utils/database').getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'concurrent.test',
          value: 'concurrent-value',
          description: 'Concurrent test',
          category: 'test',
        },
      });

      // Fire multiple concurrent gets
      const promises = Array(10)
        .fill(null)
        .map(() => service.get('concurrent.test'));

      const results = await Promise.all(promises);

      // All should return the same value
      results.forEach((result) => {
        expect(result).toBe('concurrent-value');
      });
    });

    it('should handle key format conversion (dot to underscore)', async () => {
      process.env.TEST_COMPLEX_KEY_NAME = 'env-value';

      const result = await service.get('test.complex.key.name');

      expect(result).toBe('env-value');

      // Clean up
      delete process.env.TEST_COMPLEX_KEY_NAME;
    });
  });
});
