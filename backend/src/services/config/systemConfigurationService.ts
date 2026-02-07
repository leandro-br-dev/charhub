import { prisma } from '../../config/database';

/**
 * SystemConfigurationService (Simplified)
 *
 * Provides centralized configuration management with in-memory caching
 * and .env fallback for runtime parameters.
 *
 * Features:
 * - Singleton pattern for consistent instance across application
 * - In-memory caching for fast reads
 * - Database values take precedence over .env values
 * - Cache invalidation on set operations
 * - .env fallback for missing database values
 *
 * @module SystemConfigurationService
 */

export interface SystemConfiguration {
  id: string;
  key: string;
  value: string;
}

class SystemConfigurationService {
  private cache: Map<string, string> = new Map();
  private static instance: SystemConfigurationService;
  private cacheInitialized: boolean = false;

  private constructor() {}

  /**
   * Get singleton instance of SystemConfigurationService
   */
  static getInstance(): SystemConfigurationService {
    if (!SystemConfigurationService.instance) {
      SystemConfigurationService.instance = new SystemConfigurationService();
    }
    return SystemConfigurationService.instance;
  }

  /**
   * Get configuration value by key
   *
   * Resolution order:
   * 1. In-memory cache
   * 2. Database
   * 3. .env file
   * 4. Default value (if provided)
   *
   * @param key - Configuration key (e.g., "generation.daily_limit")
   * @param defaultValue - Optional default value if not found
   * @returns Configuration value or null
   */
  async get(key: string, defaultValue?: string): Promise<string | null> {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Check database
    const config = await prisma.systemConfiguration.findUnique({
      where: { key },
    });

    if (config) {
      this.cache.set(key, config.value);
      return config.value;
    }

    // Fallback to .env (convert key format: generation.daily_limit -> GENERATION_DAILY_LIMIT)
    const envKey = this.keyToEnvFormat(key);
    const envValue = process.env[envKey];

    if (envValue) {
      this.cache.set(key, envValue);
      return envValue;
    }

    // Return default value or null
    return defaultValue ?? null;
  }

  /**
   * Get configuration value as integer
   *
   * @param key - Configuration key
   * @param defaultValue - Optional default value if not found or invalid
   * @returns Configuration value as number
   */
  async getInt(key: string, defaultValue?: number): Promise<number> {
    const value = await this.get(key);

    if (value === null) {
      return defaultValue ?? 0;
    }

    const parsed = parseInt(value, 10);

    if (isNaN(parsed)) {
      return defaultValue ?? 0;
    }

    return parsed;
  }

  /**
   * Get configuration value as boolean
   *
   * Accepts: "true", "1", "yes" as true
   *          "false", "0", "no" as false
   *
   * @param key - Configuration key
   * @param defaultValue - Optional default value if not found or invalid
   * @returns Configuration value as boolean
   */
  async getBool(key: string, defaultValue?: boolean): Promise<boolean> {
    const value = await this.get(key);

    if (value === null) {
      return defaultValue ?? false;
    }

    const normalized = value.toLowerCase().trim();

    if (['true', '1', 'yes'].includes(normalized)) {
      return true;
    }

    if (['false', '0', 'no'].includes(normalized)) {
      return false;
    }

    return defaultValue ?? false;
  }

  /**
   * Set configuration value (upsert to database)
   *
   * Invalidates cache for the key after updating database.
   *
   * @param key - Configuration key
   * @param value - Configuration value
   * @param _userId - Optional user ID who made the change (for logging only, unused in simplified version)
   */
  async set(key: string, value: string, _userId?: string): Promise<void> {
    // Upsert to database (simplified - only key and value)
    await prisma.systemConfiguration.upsert({
      where: { key },
      create: {
        key,
        value,
      },
      update: {
        value,
      },
    });

    // Update cache
    this.cache.set(key, value);
  }

  /**
   * Get all configurations from database (simplified)
   *
   * Returns array of [key, value] tuples for easier consumption.
   * Note: This does not include .env values, only database entries.
   *
   * @returns Array of [key, value] tuples
   */
  async getAll(): Promise<[string, string][]> {
    const configs = await prisma.systemConfiguration.findMany({
      orderBy: {
        key: 'asc',
      },
    });

    return configs.map((config) => [config.key, config.value]);
  }

  /**
   * Refresh cache from database
   *
   * Clears all cache entries and reloads from database.
   * Useful after bulk updates or manual database changes.
   */
  async refreshCache(): Promise<void> {
    // Clear cache
    this.cache.clear();

    // Reload all configurations from database into cache
    const configs = await prisma.systemConfiguration.findMany();

    for (const config of configs) {
      this.cache.set(config.key, config.value);
    }

    this.cacheInitialized = true;
  }

  /**
   * Initialize cache on service startup
   *
   * Loads all database configurations into cache.
   * Called automatically on first get() if not initialized.
   */
  async initializeCache(): Promise<void> {
    if (this.cacheInitialized) {
      return;
    }

    await this.refreshCache();
  }

  /**
   * Delete configuration key
   *
   * Removes from database and cache.
   *
   * @param key - Configuration key to delete
   */
  async delete(key: string): Promise<void> {
    // Delete from database
    await prisma.systemConfiguration.delete({
      where: { key },
    });

    // Remove from cache
    this.cache.delete(key);
  }

  /**
   * Check if configuration key exists
   *
   * Checks cache, database, and .env (in that order).
   *
   * @param key - Configuration key
   * @returns True if key exists in any source
   */
  async exists(key: string): Promise<boolean> {
    // Check cache
    if (this.cache.has(key)) {
      return true;
    }

    // Check database
    const config = await prisma.systemConfiguration.findUnique({
      where: { key },
    });

    if (config) {
      return true;
    }

    // Check .env
    const envKey = this.keyToEnvFormat(key);
    return process.env[envKey] !== undefined;
  }

  /**
   * Convert configuration key to .env format
   *
   * Example: "generation.daily_limit" -> "GENERATION_DAILY_LIMIT"
   *
   * @param key - Configuration key in dot notation
   * @returns Environment variable name
   */
  private keyToEnvFormat(key: string): string {
    return key.toUpperCase().replace(/\./g, '_');
  }

  /**
   * Clear cache and reset initialization flag
   *
   * FOR TESTING ONLY: Clears all cache entries and resets the cacheInitialized flag.
   * Use this in test beforeEach hooks to ensure cache isolation between tests.
   *
   * @internal
   */
  clearCacheForTesting(): void {
    this.cache.clear();
    this.cacheInitialized = false;
  }

  /**
   * Get multiple configuration values at once
   *
   * Optimized for batch retrieval of multiple keys.
   *
   * @param keys - Array of configuration keys
   * @returns Object with key-value pairs
   */
  async getMany(keys: string[]): Promise<Record<string, string | null>> {
    const result: Record<string, string | null> = {};

    // Use Promise.all for concurrent reads
    const values = await Promise.all(keys.map((key) => this.get(key)));

    for (let i = 0; i < keys.length; i++) {
      result[keys[i]] = values[i];
    }

    return result;
  }

  /**
   * Set multiple configuration values at once
   *
   * Optimized for batch updates. Uses transaction for atomicity.
   *
   * @param configs - Object with key-value pairs
   * @param _userId - Optional user ID who made the change (for logging only, unused in simplified version)
   */
  async setMany(configs: Record<string, string>, _userId?: string): Promise<void> {
    // Use transaction for atomic batch update
    await prisma.$transaction(async (tx) => {
      for (const [key, value] of Object.entries(configs)) {
        await tx.systemConfiguration.upsert({
          where: { key },
          create: {
            key,
            value,
          },
          update: {
            value,
          },
        });

        // Update cache
        this.cache.set(key, value);
      }
    });
  }
}

// Export singleton instance
export const systemConfigurationService = SystemConfigurationService.getInstance();

// Export class for testing
export { SystemConfigurationService };
