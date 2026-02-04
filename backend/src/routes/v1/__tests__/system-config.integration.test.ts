/**
 * System Configuration API Integration Tests (Simplified)
 *
 * Tests for system configuration endpoints:
 * - GET /api/v1/system-config - get all configs
 * - GET /api/v1/system-config/:key - get single config
 * - POST /api/v1/system-config - create config
 * - PUT /api/v1/system-config/:key - update config
 * - DELETE /api/v1/system-config/:key - delete config
 * - Admin-only access
 */

import request from 'supertest';
import { createTestApp } from '../../../test-utils/app';
import {
  setupTestDatabase,
  teardownTestDatabase,
  getTestDb,
} from '../../../test-utils/database';
import {
  createAuthenticatedTestUser,
  getAuthHeader,
} from '../../../test-utils/auth';
import { CONFIG_PARAMETERS } from '../../../scripts/seeds/systemConfiguration';

const app = createTestApp();

// Increase timeout for database operations
jest.setTimeout(30000);

// Skip tests in CI due to Prisma WASM memory access errors (issue #149)
const describeCI = process.env.CI === 'true' ? describe.skip : describe;

/**
 * Seed system configuration using test database (simplified)
 */
async function seedSystemConfigurationForTest(): Promise<void> {
  const db = getTestDb();

  for (const param of CONFIG_PARAMETERS) {
    const envValue = process.env[param.envVar];
    const value = envValue ?? String(param.defaultValue);

    await db.systemConfiguration.upsert({
      where: { key: param.key },
      update: {},
      create: {
        key: param.key,
        value: String(value),
      },
    });
  }
}

describeCI('System Configuration API Integration Tests', () => {
  let adminToken: string;
  let regularToken: string;

  beforeAll(async () => {
    await setupTestDatabase();

    // Create admin user
    const admin = await createAuthenticatedTestUser({ role: 'ADMIN' });
    adminToken = admin.token;

    // Create regular user
    const regular = await createAuthenticatedTestUser({ role: 'BASIC' });
    regularToken = regular.token;

    // Seed system configuration using test database
    await seedSystemConfigurationForTest();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('GET /api/v1/system-config', () => {
    it('should return all configurations for admin users', async () => {
      const response = await request(app)
        .get('/api/v1/system-config')
        .set(getAuthHeader(adminToken))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.configs).toBeDefined();
      expect(response.body.data.count).toBeDefined();
      // Note: This count may vary if additional configs are added via seeds
      // The important thing is that configs are returned correctly
      expect(response.body.data.configs.length).toBeGreaterThan(0);
    });

    it('should return configs as {key, value} pairs', async () => {
      const response = await request(app)
        .get('/api/v1/system-config')
        .set(getAuthHeader(adminToken))
        .expect(200);

      const configs = response.body.data.configs;
      expect(Array.isArray(configs)).toBe(true);
      expect(configs[0]).toHaveProperty('key');
      expect(configs[0]).toHaveProperty('value');
    });

    it('should deny access to non-admin users', async () => {
      const response = await request(app)
        .get('/api/v1/system-config')
        .set(getAuthHeader(regularToken))
        .expect(403);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('ADMIN_REQUIRED');
    });

    it('should deny access to unauthenticated users', async () => {
      await request(app)
        .get('/api/v1/system-config')
        .expect(401);
    });
  });

  describe('GET /api/v1/system-config/:key', () => {
    it('should return single configuration by key', async () => {
      const response = await request(app)
        .get('/api/v1/system-config/translation.default_provider')
        .set(getAuthHeader(adminToken))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.key).toBe('translation.default_provider');
      expect(response.body.data.value).toBeDefined();
    });

    it('should return 404 for non-existent key', async () => {
      const response = await request(app)
        .get('/api/v1/system-config/nonexistent.key')
        .set(getAuthHeader(adminToken))
        .expect(404);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should reject invalid key format', async () => {
      const response = await request(app)
        .get('/api/v1/system-config/invalid key with spaces')
        .set(getAuthHeader(adminToken))
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INVALID_FORMAT');
    });

    it('should deny access to non-admin users', async () => {
      await request(app)
        .get('/api/v1/system-config/translation.default_provider')
        .set(getAuthHeader(regularToken))
        .expect(403);
    });
  });

  describe('POST /api/v1/system-config', () => {
    it('should create new configuration', async () => {
      const response = await request(app)
        .post('/api/v1/system-config')
        .set(getAuthHeader(adminToken))
        .send({
          key: 'test.new.config',
          value: 'test-value',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.key).toBe('test.new.config');
      expect(response.body.data.value).toBe('test-value');
    });

    it('should reject duplicate key', async () => {
      const response = await request(app)
        .post('/api/v1/system-config')
        .set(getAuthHeader(adminToken))
        .send({
          key: 'translation.default_provider', // Already exists
          value: 'openai',
        })
        .expect(409);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('ALREADY_EXISTS');
    });

    it('should reject invalid key format', async () => {
      const response = await request(app)
        .post('/api/v1/system-config')
        .set(getAuthHeader(adminToken))
        .send({
          key: 'invalid key with spaces!',
          value: 'value',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INVALID_FORMAT');
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/system-config')
        .set(getAuthHeader(adminToken))
        .send({
          key: 'test.key',
          // value is missing
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('MISSING_REQUIRED_FIELD');
    });

    it('should deny access to non-admin users', async () => {
      await request(app)
        .post('/api/v1/system-config')
        .set(getAuthHeader(regularToken))
        .send({
          key: 'test.key',
          value: 'value',
        })
        .expect(403);
    });
  });

  describe('PUT /api/v1/system-config/:key', () => {
    it('should update existing configuration', async () => {
      const response = await request(app)
        .put('/api/v1/system-config/translation.default_provider')
        .set(getAuthHeader(adminToken))
        .send({
          value: 'openai',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.value).toBe('openai');
    });

    it('should return 404 for non-existent key', async () => {
      const response = await request(app)
        .put('/api/v1/system-config/nonexistent.key')
        .set(getAuthHeader(adminToken))
        .send({
          value: 'new-value',
        })
        .expect(404);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should reject missing value field', async () => {
      const response = await request(app)
        .put('/api/v1/system-config/translation.default_provider')
        .set(getAuthHeader(adminToken))
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('MISSING_REQUIRED_FIELD');
    });

    it('should reject empty value', async () => {
      const response = await request(app)
        .put('/api/v1/system-config/translation.default_provider')
        .set(getAuthHeader(adminToken))
        .send({
          value: '',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('MISSING_REQUIRED_FIELD');
    });

    it('should deny access to non-admin users', async () => {
      await request(app)
        .put('/api/v1/system-config/translation.default_provider')
        .set(getAuthHeader(regularToken))
        .send({
          value: 'openai',
        })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/system-config/:key', () => {
    it('should delete configuration', async () => {
      // First create a test config
      await request(app)
        .post('/api/v1/system-config')
        .set(getAuthHeader(adminToken))
        .send({
          key: 'test.delete.me',
          value: 'value',
        })
        .expect(201);

      // Then delete it
      const response = await request(app)
        .delete('/api/v1/system-config/test.delete.me')
        .set(getAuthHeader(adminToken))
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify it's gone
      await request(app)
        .get('/api/v1/system-config/test.delete.me')
        .set(getAuthHeader(adminToken))
        .expect(404);
    });

    it('should return 404 for non-existent key', async () => {
      const response = await request(app)
        .delete('/api/v1/system-config/nonexistent.key')
        .set(getAuthHeader(adminToken))
        .expect(404);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should deny access to non-admin users', async () => {
      await request(app)
        .delete('/api/v1/system-config/translation.default_provider')
        .set(getAuthHeader(regularToken))
        .expect(403);
    });
  });
});
