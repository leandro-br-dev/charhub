/**
 * Credits API Integration Tests
 * Tests all credits endpoints with real database and HTTP requests
 */
import request from 'supertest';
import { createTestApp } from '../../../test-utils/app';
import {
  setupTestDatabase,
  cleanDatabase,
  teardownTestDatabase,
  seedTestPlans,
} from '../../../test-utils/database';
import {
  createAuthenticatedTestUser,
  getAuthHeader,
} from '../../../test-utils/auth';
import { createTransaction } from '../../../services/creditService';

const app = createTestApp();

describe('Credits API Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
    await seedTestPlans();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('GET /api/v1/credits/balance', () => {
    it('should return current balance for authenticated user', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      // Add some credits
      await createTransaction(user.id, 'GRANT_INITIAL', 100, 'Test credits');

      const response = await request(app)
        .get('/api/v1/credits/balance')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.balance).toBe(100);
      expect(response.body.data.userId).toBe(user.id);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/credits/balance')
        .expect(401);

      // Auth middleware returns different response format
      expect(response.status).toBe(401);
    });

    it('should return 0 balance for new user with no transactions', async () => {
      const { token } = await createAuthenticatedTestUser();

      const response = await request(app)
        .get('/api/v1/credits/balance')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.data.balance).toBe(0);
    });
  });

  describe('GET /api/v1/credits/transactions', () => {
    it('should return transaction history with pagination', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      // Create multiple transactions
      await createTransaction(user.id, 'GRANT_INITIAL', 100, 'Initial');
      await createTransaction(user.id, 'CONSUMPTION', -10, 'Chat');
      await createTransaction(user.id, 'SYSTEM_REWARD', 50, 'Daily reward');

      const response = await request(app)
        .get('/api/v1/credits/transactions?limit=10&offset=0')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(3);
      expect(response.body.data.total).toBe(3);
      expect(response.body.data.limit).toBe(10);
      expect(response.body.data.offset).toBe(0);
    });

    it('should filter transactions by type', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      await createTransaction(user.id, 'GRANT_INITIAL', 100, 'Initial');
      await createTransaction(user.id, 'CONSUMPTION', -10, 'Chat');
      await createTransaction(user.id, 'CONSUMPTION', -5, 'Image');

      const response = await request(app)
        .get('/api/v1/credits/transactions?type=CONSUMPTION')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.data.transactions).toHaveLength(2);
      expect(response.body.data.transactions[0].transactionType).toBe('CONSUMPTION');
      expect(response.body.data.transactions[1].transactionType).toBe('CONSUMPTION');
    });

    it('should respect pagination offset', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      // Create 5 transactions
      for (let i = 0; i < 5; i++) {
        await createTransaction(user.id, 'GRANT_INITIAL', 10, `Transaction ${i}`);
      }

      const response = await request(app)
        .get('/api/v1/credits/transactions?limit=2&offset=2')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.data.transactions).toHaveLength(2);
      expect(response.body.data.total).toBe(5);
      expect(response.body.data.offset).toBe(2);
    });

    it('should return empty array for user with no transactions', async () => {
      const { token } = await createAuthenticatedTestUser();

      const response = await request(app)
        .get('/api/v1/credits/transactions')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.data.transactions).toEqual([]);
      expect(response.body.data.total).toBe(0);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/v1/credits/transactions')
        .expect(401);
    });
  });

  describe('POST /api/v1/credits/check-balance', () => {
    it('should return true when user has enough credits', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      await createTransaction(user.id, 'GRANT_INITIAL', 100, 'Test credits');

      const response = await request(app)
        .post('/api/v1/credits/check-balance')
        .set(getAuthHeader(token))
        .send({ requiredCredits: 50 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.hasEnough).toBe(true);
      expect(response.body.data.currentBalance).toBe(100);
      expect(response.body.data.requiredCredits).toBe(50);
      expect(response.body.data.deficit).toBe(0);
    });

    it('should return false when user has insufficient credits', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      await createTransaction(user.id, 'GRANT_INITIAL', 30, 'Test credits');

      const response = await request(app)
        .post('/api/v1/credits/check-balance')
        .set(getAuthHeader(token))
        .send({ requiredCredits: 50 })
        .expect(200);

      expect(response.body.data.hasEnough).toBe(false);
      expect(response.body.data.currentBalance).toBe(30);
      expect(response.body.data.deficit).toBe(20);
    });

    it('should return 400 for invalid requiredCredits', async () => {
      const { token } = await createAuthenticatedTestUser();

      const response = await request(app)
        .post('/api/v1/credits/check-balance')
        .set(getAuthHeader(token))
        .send({ requiredCredits: -10 })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INVALID_INPUT');
      expect(response.body.error.message).toBe('requiredCredits must be a positive number');
      expect(response.body.error.field).toBe('requiredCredits');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/v1/credits/check-balance')
        .send({ requiredCredits: 10 })
        .expect(401);
    });
  });

  describe('POST /api/v1/credits/daily-reward', () => {
    it('should claim daily reward successfully', async () => {
      const { token } = await createAuthenticatedTestUser();

      const response = await request(app)
        .post('/api/v1/credits/daily-reward')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.credits).toBeGreaterThan(0); // 50 or 100 depending on plan
      expect(response.body.data.newBalance).toBe(response.body.data.credits);
      expect(response.body.message).toContain('You received');
    });

    it('should return 400 when daily reward already claimed', async () => {
      const { token } = await createAuthenticatedTestUser();

      // Claim first time
      await request(app)
        .post('/api/v1/credits/daily-reward')
        .set(getAuthHeader(token))
        .expect(200);

      // Try to claim again
      const response = await request(app)
        .post('/api/v1/credits/daily-reward')
        .set(getAuthHeader(token))
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('ALREADY_EXISTS');
      expect(response.body.error.message).toBe('Daily reward already claimed today');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/v1/credits/daily-reward')
        .expect(401);
    });
  });

  describe('GET /api/v1/credits/daily-reward/status', () => {
    it('should return claimed=false when reward not claimed', async () => {
      const { token } = await createAuthenticatedTestUser();

      const response = await request(app)
        .get('/api/v1/credits/daily-reward/status')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.claimed).toBe(false);
      expect(response.body.data.canClaimAt).toBeDefined();
    });

    it('should return claimed=true after claiming reward', async () => {
      const { token } = await createAuthenticatedTestUser();

      // Claim reward
      await request(app)
        .post('/api/v1/credits/daily-reward')
        .set(getAuthHeader(token));

      // Check status
      const response = await request(app)
        .get('/api/v1/credits/daily-reward/status')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.data.claimed).toBe(true);
      expect(response.body.data.canClaimAt).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/v1/credits/daily-reward/status')
        .expect(401);
    });
  });

  describe('GET /api/v1/credits/first-chat-reward/status', () => {
    it('should return claimed=false for new user', async () => {
      const { token } = await createAuthenticatedTestUser();

      const response = await request(app)
        .get('/api/v1/credits/first-chat-reward/status')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.claimed).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/v1/credits/first-chat-reward/status')
        .expect(401);
    });
  });

  describe('GET /api/v1/credits/service-costs', () => {
    it('should return all service costs', async () => {
      const { token } = await createAuthenticatedTestUser();

      const response = await request(app)
        .get('/api/v1/credits/service-costs')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(typeof response.body.data).toBe('object');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/v1/credits/service-costs')
        .expect(401);
    });
  });

  describe('POST /api/v1/credits/estimate-cost', () => {
    it('should estimate cost for service request', async () => {
      const { token } = await createAuthenticatedTestUser();

      const response = await request(app)
        .post('/api/v1/credits/estimate-cost')
        .set(getAuthHeader(token))
        .send({
          serviceType: 'CHAT_MESSAGE',
          characterCount: 100,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.serviceType).toBe('CHAT_MESSAGE');
      expect(response.body.data.estimatedCost).toBeDefined();
      expect(typeof response.body.data.estimatedCost).toBe('number');
    });

    it('should return 400 when serviceType is missing', async () => {
      const { token } = await createAuthenticatedTestUser();

      const response = await request(app)
        .post('/api/v1/credits/estimate-cost')
        .set(getAuthHeader(token))
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('MISSING_REQUIRED_FIELD');
      expect(response.body.error.message).toBe('serviceType is required');
      expect(response.body.error.field).toBe('serviceType');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/v1/credits/estimate-cost')
        .send({ serviceType: 'CHAT_MESSAGE' })
        .expect(401);
    });
  });

  describe('GET /api/v1/credits/usage', () => {
    it('should return monthly usage statistics', async () => {
      const { token } = await createAuthenticatedTestUser();

      const response = await request(app)
        .get('/api/v1/credits/usage')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      // Usage structure depends on usageService implementation
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/v1/credits/usage')
        .expect(401);
    });
  });

  describe('GET /api/v1/credits/plan', () => {
    it('should return null for user with no active plan', async () => {
      const { token } = await createAuthenticatedTestUser();

      const response = await request(app)
        .get('/api/v1/credits/plan')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeNull();
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/v1/credits/plan')
        .expect(401);
    });
  });
});
