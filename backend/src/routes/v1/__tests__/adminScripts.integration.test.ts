/**
 * Admin Scripts API Integration Tests
 * Tests all admin scripts endpoints with real database and HTTP requests
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
import { imageCompressionService } from '../../../services/imageCompressionService';
import { queueManager } from '../../../queues/QueueManager';

// Mock the services
jest.mock('../../../services/imageCompressionService');
jest.mock('../../../queues/QueueManager');

const app = createTestApp();

describe('Admin Scripts API Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
    await seedTestPlans();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('GET /api/v1/admin/scripts/image-compression/stats', () => {
    it('should return stats for authenticated admin user', async () => {
      const { token } = await createAuthenticatedTestUser({ role: 'ADMIN' });

      const mockStats = {
        totalImages: 1000,
        oversizedCount: {
          '>200KB': 500,
          '>300KB': 300,
          '>500KB': 150,
          '>1000KB': 50,
        },
        totalBytesOversized: 50 * 1024 * 1024, // 50MB
      };

      (imageCompressionService.getOversizedStats as jest.Mock).mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/v1/admin/scripts/image-compression/stats')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
      expect(imageCompressionService.getOversizedStats).toHaveBeenCalled();
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/admin/scripts/image-compression/stats')
        .expect(401);

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin user', async () => {
      const { token } = await createAuthenticatedTestUser({ role: 'BASIC' });

      const response = await request(app)
        .get('/api/v1/admin/scripts/image-compression/stats')
        .set(getAuthHeader(token))
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Admin privileges required');
    });

    it('should return 403 for BASIC user', async () => {
      const { token } = await createAuthenticatedTestUser({ role: 'BASIC' });

      const response = await request(app)
        .get('/api/v1/admin/scripts/image-compression/stats')
        .set(getAuthHeader(token))
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Admin privileges required');
    });

    it('should return 403 for PREMIUM user', async () => {
      const { token } = await createAuthenticatedTestUser({ role: 'PREMIUM' });

      const response = await request(app)
        .get('/api/v1/admin/scripts/image-compression/stats')
        .set(getAuthHeader(token))
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Admin privileges required');
    });

    it('should handle service errors gracefully', async () => {
      const { token } = await createAuthenticatedTestUser({ role: 'ADMIN' });

      (imageCompressionService.getOversizedStats as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app)
        .get('/api/v1/admin/scripts/image-compression/stats')
        .set(getAuthHeader(token))
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to get statistics');
    });
  });

  describe('POST /api/v1/admin/scripts/image-compression', () => {
    it('should queue job for authenticated admin user', async () => {
      const { token } = await createAuthenticatedTestUser({ role: 'ADMIN' });

      const mockJob = {
        id: 'job-123',
        data: { limit: 100, targetSizeKB: 200 },
      };

      (queueManager.addJob as jest.Mock).mockResolvedValue(mockJob);

      const response = await request(app)
        .post('/api/v1/admin/scripts/image-compression')
        .set(getAuthHeader(token))
        .send({ limit: 100, targetSizeKB: 200 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.jobId).toBe('job-123');
      expect(response.body.message).toBe('Image compression job started');
      expect(response.body.limit).toBe(100);
      expect(response.body.targetSizeKB).toBe(200);

      expect(queueManager.addJob).toHaveBeenCalledWith(
        'character-population',
        'image-compression',
        { limit: 100, targetSizeKB: 200 },
        { priority: 5 }
      );
    });

    it('should use default values when limit and targetSizeKB not provided', async () => {
      const { token } = await createAuthenticatedTestUser({ role: 'ADMIN' });

      const mockJob = { id: 'job-456' };
      (queueManager.addJob as jest.Mock).mockResolvedValue(mockJob);

      const response = await request(app)
        .post('/api/v1/admin/scripts/image-compression')
        .set(getAuthHeader(token))
        .send({})
        .expect(200);

      expect(response.body.limit).toBe(100);
      expect(response.body.targetSizeKB).toBe(200);

      expect(queueManager.addJob).toHaveBeenCalledWith(
        'character-population',
        'image-compression',
        { limit: 100, targetSizeKB: 200 },
        { priority: 5 }
      );
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/admin/scripts/image-compression')
        .send({ limit: 100, targetSizeKB: 200 })
        .expect(401);

      expect(response.status).toBe(401);
    });

    it('should require admin role', async () => {
      const { token } = await createAuthenticatedTestUser({ role: 'BASIC' });

      const response = await request(app)
        .post('/api/v1/admin/scripts/image-compression')
        .set(getAuthHeader(token))
        .send({ limit: 100, targetSizeKB: 200 })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Admin privileges required');
    });

    it('should validate limit - reject less than 1', async () => {
      const { token } = await createAuthenticatedTestUser({ role: 'ADMIN' });

      const response = await request(app)
        .post('/api/v1/admin/scripts/image-compression')
        .set(getAuthHeader(token))
        .send({ limit: 0, targetSizeKB: 200 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Limit must be between 1 and 1000');
    });

    it('should validate limit - reject greater than 1000', async () => {
      const { token } = await createAuthenticatedTestUser({ role: 'ADMIN' });

      const response = await request(app)
        .post('/api/v1/admin/scripts/image-compression')
        .set(getAuthHeader(token))
        .send({ limit: 1001, targetSizeKB: 200 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Limit must be between 1 and 1000');
    });

    it('should validate limit - accept minimum value of 1', async () => {
      const { token } = await createAuthenticatedTestUser({ role: 'ADMIN' });

      const mockJob = { id: 'job-789' };
      (queueManager.addJob as jest.Mock).mockResolvedValue(mockJob);

      const response = await request(app)
        .post('/api/v1/admin/scripts/image-compression')
        .set(getAuthHeader(token))
        .send({ limit: 1, targetSizeKB: 200 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.limit).toBe(1);
    });

    it('should validate limit - accept maximum value of 1000', async () => {
      const { token } = await createAuthenticatedTestUser({ role: 'ADMIN' });

      const mockJob = { id: 'job-999' };
      (queueManager.addJob as jest.Mock).mockResolvedValue(mockJob);

      const response = await request(app)
        .post('/api/v1/admin/scripts/image-compression')
        .set(getAuthHeader(token))
        .send({ limit: 1000, targetSizeKB: 200 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.limit).toBe(1000);
    });

    it('should validate targetSizeKB - reject less than 50', async () => {
      const { token } = await createAuthenticatedTestUser({ role: 'ADMIN' });

      const response = await request(app)
        .post('/api/v1/admin/scripts/image-compression')
        .set(getAuthHeader(token))
        .send({ limit: 100, targetSizeKB: 49 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Target size must be between 50 and 5000 KB');
    });

    it('should validate targetSizeKB - reject greater than 5000', async () => {
      const { token } = await createAuthenticatedTestUser({ role: 'ADMIN' });

      const response = await request(app)
        .post('/api/v1/admin/scripts/image-compression')
        .set(getAuthHeader(token))
        .send({ limit: 100, targetSizeKB: 5001 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Target size must be between 50 and 5000 KB');
    });

    it('should validate targetSizeKB - accept minimum value of 50', async () => {
      const { token } = await createAuthenticatedTestUser({ role: 'ADMIN' });

      const mockJob = { id: 'job-50' };
      (queueManager.addJob as jest.Mock).mockResolvedValue(mockJob);

      const response = await request(app)
        .post('/api/v1/admin/scripts/image-compression')
        .set(getAuthHeader(token))
        .send({ limit: 100, targetSizeKB: 50 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.targetSizeKB).toBe(50);
    });

    it('should validate targetSizeKB - accept maximum value of 5000', async () => {
      const { token } = await createAuthenticatedTestUser({ role: 'ADMIN' });

      const mockJob = { id: 'job-5000' };
      (queueManager.addJob as jest.Mock).mockResolvedValue(mockJob);

      const response = await request(app)
        .post('/api/v1/admin/scripts/image-compression')
        .set(getAuthHeader(token))
        .send({ limit: 100, targetSizeKB: 5000 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.targetSizeKB).toBe(5000);
    });

    it('should return jobId in response', async () => {
      const { token } = await createAuthenticatedTestUser({ role: 'ADMIN' });

      const mockJob = { id: 'unique-job-id-12345' };
      (queueManager.addJob as jest.Mock).mockResolvedValue(mockJob);

      const response = await request(app)
        .post('/api/v1/admin/scripts/image-compression')
        .set(getAuthHeader(token))
        .send({ limit: 100, targetSizeKB: 200 })
        .expect(200);

      expect(response.body.jobId).toBe('unique-job-id-12345');
      expect(typeof response.body.jobId).toBe('string');
    });

    it('should handle queue errors gracefully', async () => {
      const { token } = await createAuthenticatedTestUser({ role: 'ADMIN' });

      (queueManager.addJob as jest.Mock).mockRejectedValue(
        new Error('Queue connection failed')
      );

      const response = await request(app)
        .post('/api/v1/admin/scripts/image-compression')
        .set(getAuthHeader(token))
        .send({ limit: 100, targetSizeKB: 200 })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to trigger compression job');
    });

    it('should validate limit is a number', async () => {
      const { token } = await createAuthenticatedTestUser({ role: 'ADMIN' });

      const response = await request(app)
        .post('/api/v1/admin/scripts/image-compression')
        .set(getAuthHeader(token))
        .send({ limit: '100', targetSizeKB: 200 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Limit must be between 1 and 1000');
    });

    it('should validate targetSizeKB is a number', async () => {
      const { token } = await createAuthenticatedTestUser({ role: 'ADMIN' });

      const response = await request(app)
        .post('/api/v1/admin/scripts/image-compression')
        .set(getAuthHeader(token))
        .send({ limit: 100, targetSizeKB: '200' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Target size must be between 50 and 5000 KB');
    });

    it('should accept decimal values for limit (they pass typeof check)', async () => {
      const { token } = await createAuthenticatedTestUser({ role: 'ADMIN' });

      const mockJob = { id: 'job-decimal' };
      (queueManager.addJob as jest.Mock).mockResolvedValue(mockJob);

      // Note: The current implementation uses `typeof limit !== 'number'`
      // which returns false for decimals (100.5 is still a number)
      // So decimals are accepted by the validation
      const response = await request(app)
        .post('/api/v1/admin/scripts/image-compression')
        .set(getAuthHeader(token))
        .send({ limit: 100.5, targetSizeKB: 200 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should accept decimal values for targetSizeKB (they pass typeof check)', async () => {
      const { token } = await createAuthenticatedTestUser({ role: 'ADMIN' });

      const mockJob = { id: 'job-decimal-2' };
      (queueManager.addJob as jest.Mock).mockResolvedValue(mockJob);

      // Note: The current implementation uses `typeof targetSizeKB !== 'number'`
      // which returns false for decimals (200.5 is still a number)
      // So decimals are accepted by the validation
      const response = await request(app)
        .post('/api/v1/admin/scripts/image-compression')
        .set(getAuthHeader(token))
        .send({ limit: 100, targetSizeKB: 200.5 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative values for limit', async () => {
      const { token } = await createAuthenticatedTestUser({ role: 'ADMIN' });

      const response = await request(app)
        .post('/api/v1/admin/scripts/image-compression')
        .set(getAuthHeader(token))
        .send({ limit: -1, targetSizeKB: 200 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Limit must be between 1 and 1000');
    });

    it('should handle negative values for targetSizeKB', async () => {
      const { token } = await createAuthenticatedTestUser({ role: 'ADMIN' });

      const response = await request(app)
        .post('/api/v1/admin/scripts/image-compression')
        .set(getAuthHeader(token))
        .send({ limit: 100, targetSizeKB: -1 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Target size must be between 50 and 5000 KB');
    });

    it('should handle zero for targetSizeKB', async () => {
      const { token } = await createAuthenticatedTestUser({ role: 'ADMIN' });

      const response = await request(app)
        .post('/api/v1/admin/scripts/image-compression')
        .set(getAuthHeader(token))
        .send({ limit: 100, targetSizeKB: 0 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Target size must be between 50 and 5000 KB');
    });

    it('should handle null values for limit', async () => {
      const { token } = await createAuthenticatedTestUser({ role: 'ADMIN' });

      const response = await request(app)
        .post('/api/v1/admin/scripts/image-compression')
        .set(getAuthHeader(token))
        .send({ limit: null, targetSizeKB: 200 })
        .expect(400);

      // Note: null fails the typeof check before defaults are applied
      // typeof null === 'object', not 'number'
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Limit must be between 1 and 1000');
    });

    it('should handle null values for targetSizeKB', async () => {
      const { token } = await createAuthenticatedTestUser({ role: 'ADMIN' });

      const response = await request(app)
        .post('/api/v1/admin/scripts/image-compression')
        .set(getAuthHeader(token))
        .send({ limit: 100, targetSizeKB: null })
        .expect(400);

      // Note: null fails the typeof check before defaults are applied
      // typeof null === 'object', not 'number'
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Target size must be between 50 and 5000 KB');
    });
  });
});
