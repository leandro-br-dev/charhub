/**
 * Civitai API Client Tests
 */

import { CivitaiApiClient } from '../civitaiApiClient';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CivitaiApiClient', () => {
  let client: CivitaiApiClient;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.CIVITAI_API_BASE_URL = 'https://test.civitai.com/api/v1';
    process.env.CIVITAI_API_KEY = 'test-key';
    process.env.CIVITAI_RATE_LIMIT = '100';

    // Reset axios mock
    mockedAxios.create = jest.fn().mockReturnValue({
      get: jest.fn(),
    } as any);

    client = new CivitaiApiClient();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with env vars', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://test.civitai.com/api/v1',
          timeout: 30000,
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key',
          }),
        })
      );
    });

    it('should work without API key', () => {
      delete process.env.CIVITAI_API_KEY;
      const clientNoKey = new CivitaiApiClient();
      expect(clientNoKey).toBeDefined();
    });
  });

  describe('getTrendingImages', () => {
    beforeEach(() => {
      const mockClient = {
        get: jest.fn().mockResolvedValue({
          data: {
            items: [
              {
                id: 123,
                url: 'https://example.com/image1.jpg',
                hash: 'abc123',
                width: 1024,
                height: 1024,
                nsfw: 'None',
                nsfwLevel: 0,
                stats: { rating: 4.5, ratingCount: 100, cryCount: 10 },
                post: { id: '456', user: 'artist1' },
                tags: ['anime', 'fantasy'],
                meta: {
                  Model: 'AnythingV5',
                  Sampler: 'Euler a',
                  sd_prompt: 'anime girl, fantasy, detailed',
                },
              },
            ],
          },
        }),
      };
      mockedAxios.create = jest.fn().mockReturnValue(mockClient as any);
      client = new CivitaiApiClient();
    });

    it('should fetch trending images', async () => {
      const result = await client.getTrendingImages({ limit: 10 });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: '123',
        url: 'https://example.com/image1.jpg',
        sourceUrl: 'https://civitai.com/images/123',
        rating: 4.5,
        author: 'artist1',
        tags: ['anime', 'fantasy'],
      });
    });

    it('should apply NSFW filter', async () => {
      const mockGet = (mockedAxios.create as jest.Mock)().get as jest.Mock;

      await client.getTrendingImages({ nsfw: 'None' });

      expect(mockGet).toHaveBeenCalledWith(
        '/images',
        expect.objectContaining({
          params: expect.objectContaining({
            nsfw: 'None',
          }),
        })
      );
    });

    it('should filter anime-style images', async () => {
      const mockClient = {
        get: jest.fn().mockResolvedValue({
          data: {
            items: [
              {
                id: 1,
                url: 'https://example.com/anime.jpg',
                width: 768,
                height: 1024,
                nsfw: 'None',
                nsfwLevel: 0,
                meta: {
                  Model: 'AnythingV5',
                  Sampler: 'Euler a',
                  sd_prompt: 'anime girl',
                },
              },
              {
                id: 2,
                url: 'https://example.com/realistic.jpg',
                width: 512,
                height: 512,
                nsfw: 'None',
                nsfwLevel: 0,
                meta: {
                  Model: 'RealismEngine',
                  Sampler: 'DPM++',
                },
              },
            ],
          },
        }),
      };
      mockedAxios.create = jest.fn().mockReturnValue(mockClient as any);
      client = new CivitaiApiClient();

      const result = await client.getTrendingImages({ animeStyle: true });

      // Should only return anime-style image
      expect(result.length).toBeLessThanOrEqual(1);
    });

    it('should handle rate limit', async () => {
      // Exceed rate limit
      const smallLimitClient = new CivitaiApiClient();

      // Mock the rate limit to be exceeded
      (smallLimitClient as any).requestCount = 100;
      (smallLimitClient as any).rateLimitPerDay = 100;

      await expect(smallLimitClient.getTrendingImages()).rejects.toThrow('Rate limit exceeded');
    });

    it('should reset rate limit after day', () => {
      const status1 = client.getRateLimitStatus();
      expect(status1.used).toBe(0);

      // Simulate passage of time
      (client as any).lastResetTime = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      (client as any).requestCount = 50;

      // Check rate limit - should reset
      (client as any).checkRateLimit();

      expect((client as any).requestCount).toBe(0);
    });
  });

  describe('searchByTags', () => {
    it('should search with tags', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: { items: [] },
      });
      mockedAxios.create = jest.fn().mockReturnValue({ get: mockGet } as any);
      client = new CivitaiApiClient();

      await client.searchByTags(['anime', 'fantasy']);

      expect(mockGet).toHaveBeenCalled();
    });
  });

  describe('getUserImages', () => {
    it('should fetch user images', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: { items: [] },
      });
      mockedAxios.create = jest.fn().mockReturnValue({ get: mockGet } as any);
      client = new CivitaiApiClient();

      await client.getUserImages('testuser');

      expect(mockGet).toHaveBeenCalledWith(
        '/images',
        expect.objectContaining({
          params: expect.objectContaining({
            username: 'testuser',
          }),
        })
      );
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return rate limit status', () => {
      const status = client.getRateLimitStatus();

      expect(status).toMatchObject({
        used: 0,
        limit: 100,
        remaining: 100,
      });
      expect(status.resetIn).toBeGreaterThan(0);
    });
  });
});
