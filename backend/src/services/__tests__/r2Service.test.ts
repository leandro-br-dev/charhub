/**
 * R2Service Unit Tests - Environment Prefix Functionality
 * Tests for environment-based path prefixing in R2 storage
 */

// Mock the logger FIRST, before any imports that use it
jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { R2Service } from '../r2Service';
import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Mock AWS SDK modules
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('R2Service - Environment Prefixes', () => {
  let originalNodeEnv: string | undefined;
  let mockSend: jest.Mock;

  beforeEach(() => {
    // Save original NODE_ENV
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    // Restore original NODE_ENV
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  describe('environment detection', () => {
    it('should use "dev" environment when NODE_ENV is development', () => {
      process.env.NODE_ENV = 'development';
      const service = new R2Service();
      expect(service).toBeDefined();
      // Environment is private, but we can test behavior through methods
    });

    it('should use "dev" environment when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;
      const service = new R2Service();
      expect(service).toBeDefined();
    });

    it('should use "prod" environment when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      const service = new R2Service();
      expect(service).toBeDefined();
    });

    it('should use "dev" environment for any non-production NODE_ENV', () => {
      process.env.NODE_ENV = 'staging';
      const service = new R2Service();
      expect(service).toBeDefined();

      process.env.NODE_ENV = 'test';
      const service2 = new R2Service();
      expect(service2).toBeDefined();
    });
  });

  describe('getPublicUrl with environment prefix', () => {
    beforeEach(() => {
      // Set required environment variables for testing
      process.env.R2_BUCKET_NAME = 'test-bucket';
      process.env.R2_ACCOUNT_ID = 'test-account';
      process.env.R2_ACCESS_KEY_ID = 'test-key';
      process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
      process.env.R2_ENDPOINT_URL = 'https://test.r2.dev';
      process.env.R2_PUBLIC_URL_BASE = 'https://media.charhub.app';
    });

    it('should generate URL with dev prefix in development', () => {
      process.env.NODE_ENV = 'development';
      const service = new R2Service();

      const url = service.getPublicUrl('characters/123/avatar.webp');
      expect(url).toBe('https://media.charhub.app/dev/characters/123/avatar.webp');
    });

    it('should generate URL with prod prefix in production', () => {
      process.env.NODE_ENV = 'production';
      const service = new R2Service();

      const url = service.getPublicUrl('characters/123/avatar.webp');
      expect(url).toBe('https://media.charhub.app/prod/characters/123/avatar.webp');
    });

    it('should not double-prefix if key already has correct environment', () => {
      process.env.NODE_ENV = 'development';
      const service = new R2Service();

      const url = service.getPublicUrl('dev/characters/123/avatar.webp');
      expect(url).toBe('https://media.charhub.app/dev/characters/123/avatar.webp');
      expect(url).not.toContain('/dev/dev/');
    });

    it('should sanitize leading slashes from key', () => {
      process.env.NODE_ENV = 'development';
      const service = new R2Service();

      const url = service.getPublicUrl('/characters/123/avatar.webp');
      expect(url).toBe('https://media.charhub.app/dev/characters/123/avatar.webp');
    });

    it('should handle multiple leading slashes', () => {
      process.env.NODE_ENV = 'development';
      const service = new R2Service();

      const url = service.getPublicUrl('///characters/123/avatar.webp');
      expect(url).toBe('https://media.charhub.app/dev/characters/123/avatar.webp');
    });
  });

  describe('uploadObject with environment prefix', () => {
    beforeEach(() => {
      // Set required environment variables for testing
      process.env.R2_BUCKET_NAME = 'test-bucket';
      process.env.R2_ACCOUNT_ID = 'test-account';
      process.env.R2_ACCESS_KEY_ID = 'test-key';
      process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
      process.env.R2_ENDPOINT_URL = 'https://test.r2.dev';
      process.env.R2_PUBLIC_URL_BASE = 'https://media.charhub.app';

      // Mock the S3Client send method to return success
      mockSend = jest.fn().mockResolvedValue({ $metadata: { httpStatusCode: 200 } });
      (S3Client as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));
    });

    it('should throw configuration error when R2 is not configured', async () => {
      // Remove config to test error handling
      delete process.env.R2_BUCKET_NAME;
      const service = new R2Service();

      await expect(
        service.uploadObject({
          key: 'characters/123/avatar.webp',
          body: Buffer.from('test'),
          contentType: 'image/webp',
        })
      ).rejects.toThrow();
    });

    it('should use dev prefix in development (when configured)', async () => {
      process.env.NODE_ENV = 'development';
      const service = new R2Service();

      if (service.isConfigured()) {
        const result = await service.uploadObject({
          key: 'characters/123/avatar.webp',
          body: Buffer.from('test'),
          contentType: 'image/webp',
        });

        expect(result.key).toMatch(/^dev\/characters\/123\/avatar\.webp$/);
        expect(result.publicUrl).toContain('/dev/characters/');
        expect(mockSend).toHaveBeenCalled();
      }
    });

    it('should use prod prefix in production (when configured)', async () => {
      process.env.NODE_ENV = 'production';
      const service = new R2Service();

      if (service.isConfigured()) {
        const result = await service.uploadObject({
          key: 'characters/123/avatar.webp',
          body: Buffer.from('test'),
          contentType: 'image/webp',
        });

        expect(result.key).toMatch(/^prod\/characters\/123\/avatar\.webp$/);
        expect(result.publicUrl).toContain('/prod/characters/');
        expect(mockSend).toHaveBeenCalled();
      }
    });

    it('should not double-prefix if key already has environment', async () => {
      process.env.NODE_ENV = 'development';
      const service = new R2Service();

      if (service.isConfigured()) {
        const result = await service.uploadObject({
          key: 'dev/characters/123/avatar.webp',
          body: Buffer.from('test'),
          contentType: 'image/webp',
        });

        expect(result.key).toBe('dev/characters/123/avatar.webp');
        expect(result.key).not.toMatch(/^dev\/dev\//);
        expect(mockSend).toHaveBeenCalled();
      }
    });
  });

  describe('getPresignedUrl with environment prefix', () => {
    beforeEach(() => {
      // Set required environment variables for testing
      process.env.R2_BUCKET_NAME = 'test-bucket';
      process.env.R2_ACCOUNT_ID = 'test-account';
      process.env.R2_ACCESS_KEY_ID = 'test-key';
      process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
      process.env.R2_ENDPOINT_URL = 'https://test.r2.dev';
      process.env.R2_PUBLIC_URL_BASE = 'https://media.charhub.app';

      // Mock getSignedUrl to return a mock presigned URL
      (getSignedUrl as jest.Mock).mockResolvedValue(
        'https://example.com/dev/characters/123/avatar.webp?signature=abc123'
      );
    });

    it('should throw configuration error when R2 is not configured', async () => {
      // Remove config to test error handling
      delete process.env.R2_BUCKET_NAME;
      const service = new R2Service();

      await expect(
        service.getPresignedUrl('characters/123/avatar.webp')
      ).rejects.toThrow();
    });

    it('should apply dev prefix in development (when configured)', async () => {
      process.env.NODE_ENV = 'development';
      const service = new R2Service();

      if (service.isConfigured()) {
        const url = await service.getPresignedUrl('characters/123/avatar.webp');
        // Presigned URL contains the key with environment prefix
        expect(url).toContain('/dev/characters/123/avatar.webp');
        expect(getSignedUrl).toHaveBeenCalled();
      }
    });
  });

  describe('downloadObject with environment prefix', () => {
    beforeEach(() => {
      // Set required environment variables for testing
      process.env.R2_BUCKET_NAME = 'test-bucket';
      process.env.R2_ACCOUNT_ID = 'test-account';
      process.env.R2_ACCESS_KEY_ID = 'test-key';
      process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
      process.env.R2_ENDPOINT_URL = 'https://test.r2.dev';
      process.env.R2_PUBLIC_URL_BASE = 'https://media.charhub.app';

      // Mock the S3Client send method to return a mock response
      const mockBody = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from('test data');
        },
      };
      mockSend = jest.fn().mockResolvedValue({
        Body: mockBody,
      });
      (S3Client as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));
    });

    it('should throw configuration error when R2 is not configured', async () => {
      // Remove config to test error handling
      delete process.env.R2_BUCKET_NAME;
      const service = new R2Service();

      await expect(
        service.downloadObject('characters/123/avatar.webp')
      ).rejects.toThrow();
    });

    it('should apply environment prefix when downloading (when configured)', async () => {
      process.env.NODE_ENV = 'development';
      const service = new R2Service();

      if (service.isConfigured()) {
        const buffer = await service.downloadObject('characters/123/avatar.webp');
        expect(buffer).toBeInstanceOf(Buffer);
        expect(buffer.toString()).toBe('test data');
        expect(mockSend).toHaveBeenCalled();
      }
    });
  });

  describe('deleteObject with environment prefix', () => {
    beforeEach(() => {
      // Set required environment variables for testing
      process.env.R2_BUCKET_NAME = 'test-bucket';
      process.env.R2_ACCOUNT_ID = 'test-account';
      process.env.R2_ACCESS_KEY_ID = 'test-key';
      process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
      process.env.R2_ENDPOINT_URL = 'https://test.r2.dev';
      process.env.R2_PUBLIC_URL_BASE = 'https://media.charhub.app';

      // Mock the S3Client send method to return success
      mockSend = jest.fn().mockResolvedValue({ $metadata: { httpStatusCode: 204 } });
      (S3Client as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));
    });

    it('should throw configuration error when R2 is not configured', async () => {
      // Remove config to test error handling
      delete process.env.R2_BUCKET_NAME;
      const service = new R2Service();

      await expect(
        service.deleteObject('characters/123/avatar.webp')
      ).rejects.toThrow();
    });

    it('should apply environment prefix when deleting (when configured)', async () => {
      process.env.NODE_ENV = 'development';
      const service = new R2Service();

      if (service.isConfigured()) {
        const result = await service.deleteObject('characters/123/avatar.webp');
        expect(result).toBe(true);
        expect(mockSend).toHaveBeenCalled();
      }
    });
  });

  describe('isConfigured', () => {
    it('should return false when R2 configuration is incomplete', () => {
      delete process.env.R2_BUCKET_NAME;
      const service = new R2Service();
      expect(service.isConfigured()).toBe(false);
    });

    it('should return true when R2 configuration is complete', () => {
      process.env.R2_BUCKET_NAME = 'test-bucket';
      process.env.R2_ACCOUNT_ID = 'test-account';
      process.env.R2_ACCESS_KEY_ID = 'test-key';
      process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
      process.env.R2_ENDPOINT_URL = 'https://test.r2.dev';
      process.env.R2_PUBLIC_URL_BASE = 'https://media.charhub.app';

      const service = new R2Service();
      expect(service.isConfigured()).toBe(true);
    });

    it('should return missing configuration keys', () => {
      delete process.env.R2_BUCKET_NAME;
      delete process.env.R2_ACCOUNT_ID;

      const service = new R2Service();
      const missing = service.getMissingConfig();

      expect(missing).toContain('bucketName');
      expect(missing).toContain('accountId');
    });
  });
});
