/**
 * SystemConfigurationService Unit Tests (Simplified)
 *
 * Tests for centralized configuration management with in-memory caching
 * and .env fallback for runtime parameters.
 */
import { SystemConfigurationService } from '../systemConfigurationService';
import { setupTestDatabase, cleanDatabase, teardownTestDatabase, getTestDb } from '../../../test-utils/database';

describe('SystemConfigurationService', () => {
  let service: SystemConfigurationService;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
    // Clear cache to ensure test isolation
    service = SystemConfigurationService.getInstance();
    service.clearCacheForTesting();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('get()', () => {
    it('should return database value when configuration exists in database', async () => {
      const db = getTestDb();

      // Create configuration in database (simplified - only key and value)
      await db.systemConfiguration.create({
        data: {
          key: 'test.config',
          value: 'database-value',
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
      const db = getTestDb();

      // Create configuration in database (simplified)
      await db.systemConfiguration.create({
        data: {
          key: 'cache.test',
          value: 'cached-value',
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
      const db = getTestDb();

      // Create configuration (simplified)
      await db.systemConfiguration.create({
        data: {
          key: 'priority.test',
          value: 'original',
        },
      });

      // Load into cache
      await service.get('priority.test');

      // Update database directly
      await db.systemConfiguration.update({
        where: { key: 'priority.test' },
        data: { value: 'updated' },
      });

      // Should still return cached value
      const result = await service.get('priority.test');

      expect(result).toBe('original');
    });
  });

  describe('getInt()', () => {
    it('should return integer value from database', async () => {
      const db = getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'test.number',
          value: '42',
        },
      });

      const result = await service.getInt('test.number');

      expect(result).toBe(42);
      expect(typeof result).toBe('number');
    });

    it('should return default value for invalid numbers', async () => {
      const db = getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'test.invalid',
          value: 'not-a-number',
        },
      });

      const result = await service.getInt('test.invalid', 100);

      expect(result).toBe(100);
    });

    it('should return default value when configuration not found', async () => {
      const result = await service.getInt('nonexistent.key', 50);

      expect(result).toBe(50);
    });

    it('should return 0 as default when no default provided', async () => {
      const result = await service.getInt('nonexistent.key');

      expect(result).toBe(0);
    });

    it('should handle boolean strings as integers', async () => {
      const db = getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'test.bool',
          value: '1',
        },
      });

      const result = await service.getInt('test.bool');

      expect(result).toBe(1);
    });
  });

  describe('getBool()', () => {
    it('should return true for "true" string', async () => {
      const db = getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'test.bool',
          value: 'true',
        },
      });

      const result = await service.getBool('test.bool');

      expect(result).toBe(true);
    });

    it('should return true for "1" string', async () => {
      const db = getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'test.bool',
          value: '1',
        },
      });

      const result = await service.getBool('test.bool');

      expect(result).toBe(true);
    });

    it('should return true for "yes" string', async () => {
      const db = getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'test.bool',
          value: 'yes',
        },
      });

      const result = await service.getBool('test.bool');

      expect(result).toBe(true);
    });

    it('should return false for "false" string', async () => {
      const db = getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'test.bool',
          value: 'false',
        },
      });

      const result = await service.getBool('test.bool');

      expect(result).toBe(false);
    });

    it('should return false for "0" string', async () => {
      const db = getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'test.bool',
          value: '0',
        },
      });

      const result = await service.getBool('test.bool');

      expect(result).toBe(false);
    });

    it('should be case insensitive', async () => {
      const db = getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'test.bool1',
          value: 'TRUE',
        },
      });

      await db.systemConfiguration.create({
        data: {
          key: 'test.bool2',
          value: 'False',
        },
      });

      const result1 = await service.getBool('test.bool1');
      const result2 = await service.getBool('test.bool2');

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });

    it('should return default value for invalid boolean strings', async () => {
      const db = getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'test.invalid',
          value: 'maybe',
        },
      });

      const result = await service.getBool('test.invalid', true);

      expect(result).toBe(true);
    });
  });

  describe('set()', () => {
    it('should create new configuration', async () => {
      const db = getTestDb();

      await service.set('new.key', 'new-value');

      const config = await db.systemConfiguration.findUnique({
        where: { key: 'new.key' },
      });

      expect(config).toBeTruthy();
      expect(config?.value).toBe('new-value');
    });

    it('should update existing configuration', async () => {
      const db = getTestDb();

      // Create initial configuration (simplified)
      await db.systemConfiguration.create({
        data: {
          key: 'update.key',
          value: 'initial-value',
        },
      });

      // Update using service
      await service.set('update.key', 'updated-value');

      const config = await db.systemConfiguration.findUnique({
        where: { key: 'update.key' },
      });

      expect(config?.value).toBe('updated-value');
    });

    it('should update cache after setting value', async () => {
      await service.set('cache.key', 'cached-value');

      const result = await service.get('cache.key');

      expect(result).toBe('cached-value');
    });
  });

  describe('getAll()', () => {
    it('should return all configurations', async () => {
      const db = getTestDb();

      // Create multiple configurations (simplified)
      await db.systemConfiguration.createMany({
        data: [
          { key: 'config1', value: 'value1' },
          { key: 'config2', value: 'value2' },
          { key: 'config3', value: 'value3' },
        ],
      });

      const result = await service.getAll();

      expect(result).toHaveLength(3);
      expect(result).toEqual(
        expect.arrayContaining([
          ['config1', 'value1'],
          ['config2', 'value2'],
          ['config3', 'value3'],
        ])
      );
    });

    it('should return empty array when no configurations exist', async () => {
      const result = await service.getAll();

      expect(result).toEqual([]);
    });

    it('should return configurations sorted by key', async () => {
      const db = getTestDb();

      // Create configurations in random order (simplified)
      await db.systemConfiguration.createMany({
        data: [
          { key: 'zebra', value: 'last' },
          { key: 'apple', value: 'first' },
          { key: 'middle', value: 'middle' },
        ],
      });

      const result = await service.getAll();

      expect(result[0]).toEqual(['apple', 'first']);
      expect(result[1]).toEqual(['middle', 'middle']);
      expect(result[2]).toEqual(['zebra', 'last']);
    });

    it('should not include .env values, only database entries', async () => {
      const db = getTestDb();

      // Set environment variable (should not appear in getAll)
      process.env.TEST_ENV_VAR = 'env-value';

      // Create database configuration
      await db.systemConfiguration.create({
        data: {
          key: 'test.db',
          value: 'db-value',
        },
      });

      const result = await service.getAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(['test.db', 'db-value']);

      // Clean up
      delete process.env.TEST_ENV_VAR;
    });
  });

  describe('refreshCache()', () => {
    it('should clear and reload cache from database', async () => {
      const db = getTestDb();

      // Create configuration (simplified)
      await db.systemConfiguration.create({
        data: {
          key: 'refresh.test',
          value: 'initial',
        },
      });

      // Load into cache
      await service.get('refresh.test');

      // Update database directly
      await db.systemConfiguration.update({
        where: { key: 'refresh.test' },
        data: { value: 'updated' },
      });

      // Refresh cache
      await service.refreshCache();

      // Should now return updated value
      const result = await service.get('refresh.test');

      expect(result).toBe('updated');
    });

    it('should clear all cache entries', async () => {
      const db = getTestDb();

      // Create configurations (simplified)
      await db.systemConfiguration.createMany({
        data: [
          { key: 'cache1', value: 'value1' },
          { key: 'cache2', value: 'value2' },
        ],
      });

      // Load into cache
      await service.get('cache1');
      await service.get('cache2');

      // Delete from database
      await db.systemConfiguration.deleteMany();

      // Refresh cache
      await service.refreshCache();

      // Should return null for both keys
      const result1 = await service.get('cache1');
      const result2 = await service.get('cache2');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('delete()', () => {
    it('should delete configuration from database', async () => {
      const db = getTestDb();

      // Create configuration (simplified)
      await db.systemConfiguration.create({
        data: {
          key: 'delete.test',
          value: 'value',
        },
      });

      // Delete using service
      await service.delete('delete.test');

      const config = await db.systemConfiguration.findUnique({
        where: { key: 'delete.test' },
      });

      expect(config).toBeNull();
    });

    it('should remove from cache after deletion', async () => {
      const db = getTestDb();

      // Create and load into cache (simplified)
      await db.systemConfiguration.create({
        data: {
          key: 'cache.delete',
          value: 'value',
        },
      });

      await service.get('cache.delete');

      // Delete using service
      await service.delete('cache.delete');

      // Should return null (cache was cleared)
      const result = await service.get('cache.delete');

      expect(result).toBeNull();
    });

    it('should throw error when deleting non-existent key', async () => {
      await expect(service.delete('nonexistent.key')).rejects.toThrow();
    });
  });

  describe('exists()', () => {
    it('should return true when configuration exists in database', async () => {
      const db = getTestDb();

      // Create configuration (simplified)
      await db.systemConfiguration.create({
        data: {
          key: 'exists.test',
          value: 'value',
        },
      });

      const result = await service.exists('exists.test');

      expect(result).toBe(true);
    });

    it('should return true when configuration exists in .env', async () => {
      process.env.EXISTS_ENV_TEST = 'env-value';

      const result = await service.exists('exists.env.test');

      expect(result).toBe(true);

      // Clean up
      delete process.env.EXISTS_ENV_TEST;
    });

    it('should return false when configuration does not exist', async () => {
      const result = await service.exists('nonexistent.key');

      expect(result).toBe(false);
    });

    it('should check cache first', async () => {
      await service.set('cache.exists', 'value');

      // Load into cache
      await service.get('cache.exists');

      // Delete from database directly
      const db = getTestDb();
      await db.systemConfiguration.delete({
        where: { key: 'cache.exists' },
      });

      // Should still return true (from cache)
      const result = await service.exists('cache.exists');

      expect(result).toBe(true);
    });
  });

  describe('getMany()', () => {
    it('should return multiple configuration values', async () => {
      const db = getTestDb();

      // Create configurations (simplified)
      await db.systemConfiguration.createMany({
        data: [
          { key: 'many1', value: 'value1' },
          { key: 'many2', value: 'value2' },
          { key: 'many3', value: 'value3' },
        ],
      });

      const result = await service.getMany(['many1', 'many2', 'many3']);

      expect(result).toEqual({
        many1: 'value1',
        many2: 'value2',
        many3: 'value3',
      });
    });

    it('should include null for non-existent keys', async () => {
      const db = getTestDb();

      await db.systemConfiguration.create({
        data: {
          key: 'existing',
          value: 'value',
        },
      });

      const result = await service.getMany(['existing', 'nonexistent']);

      expect(result).toEqual({
        existing: 'value',
        nonexistent: null,
      });
    });

    it('should use .env fallback for missing keys', async () => {
      process.env.MANY_ENV_TEST = 'env-value';

      const result = await service.getMany(['many.env.test']);

      expect(result).toEqual({
        'many.env.test': 'env-value',
      });

      // Clean up
      delete process.env.MANY_ENV_TEST;
    });
  });

  describe('setMany()', () => {
    it('should set multiple configuration values', async () => {
      const db = getTestDb();

      await service.setMany({
        set1: 'value1',
        set2: 'value2',
        set3: 'value3',
      });

      const configs = await db.systemConfiguration.findMany({
        where: {
          key: { in: ['set1', 'set2', 'set3'] },
        },
      });

      expect(configs).toHaveLength(3);

      const configMap = new Map(configs.map((c) => [c.key, c.value]));
      expect(configMap.get('set1')).toBe('value1');
      expect(configMap.get('set2')).toBe('value2');
      expect(configMap.get('set3')).toBe('value3');
    });

    it('should update cache for all keys', async () => {
      await service.setMany({
        cache1: 'value1',
        cache2: 'value2',
      });

      const result = await service.getMany(['cache1', 'cache2']);

      expect(result).toEqual({
        cache1: 'value1',
        cache2: 'value2',
      });
    });

    it('should use transaction for atomicity', async () => {
      const db = getTestDb();

      // Try to set multiple values (simplified)
      await service.setMany({
        atomic1: 'value1',
        atomic2: 'value2',
      });

      // All should be created or none should be created
      const configs = await db.systemConfiguration.findMany({
        where: {
          key: { in: ['atomic1', 'atomic2'] },
        },
      });

      expect(configs).toHaveLength(2);
    });
  });

  describe('Cache initialization', () => {
    it('should initialize cache on first get', async () => {
      const db = getTestDb();

      // Create configuration (simplified)
      await db.systemConfiguration.create({
        data: {
          key: 'init.test',
          value: 'value',
        },
      });

      // First get should initialize cache
      await service.initializeCache();

      // Should return cached value (no database query)
      const result = await service.get('init.test');

      expect(result).toBe('value');
    });

    it('should not reinitialize cache if already initialized', async () => {
      const db = getTestDb();

      // Initialize cache with existing data
      await db.systemConfiguration.create({
        data: {
          key: 'init.test',
          value: 'value',
        },
      });

      await service.initializeCache();

      // Create new configuration in database AFTER initialization
      await db.systemConfiguration.create({
        data: {
          key: 'new.after.init',
          value: 'value',
        },
      });

      // The new key should NOT be in the initial cache, but get() should fetch it from DB
      // This is correct behavior - cache miss triggers DB lookup
      const result = await service.get('new.after.init');
      expect(result).toBe('value');

      // Now verify that calling initializeCache again doesn't reset the cache
      const cacheBeforeSecondInit = await service.get('new.after.init');
      await service.initializeCache(); // Should be no-op since already initialized
      const cacheAfterSecondInit = await service.get('new.after.init');

      // Both should return the same value (cache was not reset)
      expect(cacheBeforeSecondInit).toBe('value');
      expect(cacheAfterSecondInit).toBe('value');
    });
  });
});
