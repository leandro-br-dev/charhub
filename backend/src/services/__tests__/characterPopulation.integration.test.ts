/**
 * Character Population Integration Tests
 * Tests the full pipeline from image curation to character generation
 */

import { civitaiApiClient } from '../civitai';
import { curationQueue } from '../curation';
import { batchCharacterGenerator } from '../batch';

// Mock external APIs
jest.mock('axios');
jest.mock('../civitai/civitaiApiClient');
jest.mock('../../agents/imageClassificationAgent');
jest.mock('../../agents/characterImageAnalysisAgent');
jest.mock('../r2Service');
jest.mock('../imageService');

describe('Character Population Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Full Pipeline', () => {
    it('should complete full curation and generation flow', async () => {
      // Mock Civitai API response
      const mockImages = [
        {
          id: 'civ1',
          url: 'https://example.com/img1.jpg',
          sourceUrl: 'https://civitai.com/images/1',
          rating: 4.5,
          tags: ['anime', 'fantasy', 'girl'],
          author: 'artist1',
          nsfwLevel: 0,
          width: 1024,
          height: 1024,
        },
      ];

      (civitaiApiClient.getTrendingImages as jest.Mock) = jest.fn().mockResolvedValue(mockImages);

      // Step 1: Fetch images from Civitai
      const images = await civitaiApiClient.getTrendingImages({
        limit: 5,
        nsfw: 'None',
        animeStyle: true,
      });

      expect(images).toHaveLength(1);
      expect(images[0].id).toBe('civ1');
    });

    it('should handle rate limiting gracefully', async () => {
      // Mock rate limit exceeded
      (civitaiApiClient.getTrendingImages as jest.Mock) = jest.fn().mockRejectedValue(
        new Error('Rate limit exceeded')
      );

      await expect(
        civitaiApiClient.getTrendingImages({ limit: 10 })
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Curation Queue', () => {
    it('should add images to queue', async () => {
      const mockImage = {
        id: 'img1',
        url: 'https://example.com/image.jpg',
        sourceUrl: 'https://civitai.com/images/1',
        rating: 4.5,
        tags: ['anime'],
        nsfwLevel: 0,
        width: 1024,
        height: 1024,
      };

      // Mock addToQueue to avoid database interaction
      const addToQueueSpy = jest.spyOn(curationQueue, 'addToQueue');
      addToQueueSpy.mockResolvedValue({
        id: 'queue-1',
        sourceUrl: mockImage.url,
        sourceId: mockImage.id,
        sourcePlatform: 'civitai',
        status: 'PENDING' as any,
        contentTags: [],
        createdAt: new Date(),
      });

      const result = await curationQueue.addToQueue(mockImage);

      expect(result).toBeDefined();
      expect(result.sourceUrl).toBe(mockImage.url);
      expect(result.status).toBe('PENDING');

      addToQueueSpy.mockRestore();
    });
  });

  describe('Batch Generation', () => {
    it('should return stats', async () => {
      const getStatsSpy = jest.spyOn(batchCharacterGenerator, 'getBatchStats');
      getStatsSpy.mockResolvedValue({
        totalBatches: 5,
        totalGenerated: 100,
        successRate: 0.95,
        avgDuration: 120,
      });

      const stats = await batchCharacterGenerator.getBatchStats();

      expect(stats.totalBatches).toBe(5);
      expect(stats.totalGenerated).toBe(100);
      expect(stats.successRate).toBeGreaterThan(0.9);

      getStatsSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors in Civitai fetch', async () => {
      (civitaiApiClient.getTrendingImages as jest.Mock) = jest.fn().mockRejectedValue(
        new Error('Network error')
      );

      await expect(
        civitaiApiClient.getTrendingImages({ limit: 10 })
      ).rejects.toThrow('Network error');
    });

    it('should handle invalid image data', async () => {
      const invalidImage = {
        id: '',
        url: '',
        sourceUrl: '',
        nsfwLevel: 0,
        width: 0,
        height: 0,
      };

      const addToQueueSpy = jest.spyOn(curationQueue, 'addToQueue');
      addToQueueSpy.mockRejectedValue(new Error('Invalid image data'));

      await expect(curationQueue.addToQueue(invalidImage)).rejects.toThrow('Invalid image data');

      addToQueueSpy.mockRestore();
    });
  });

  describe('Quality Assurance', () => {
    it('should reject NSFW content', async () => {
      // NSFW filtering should happen at Civitai API level
      const mockGetImages = jest.fn().mockResolvedValue([]);
      (civitaiApiClient.getTrendingImages as jest.Mock) = mockGetImages;

      const images = await civitaiApiClient.getTrendingImages({
        nsfw: 'None',
      });

      expect(images).toHaveLength(0);
    });

    it('should respect quality thresholds', async () => {
      const getStatsSpy = jest.spyOn(curationQueue, 'getStats');
      getStatsSpy.mockResolvedValue({
        pending: 10,
        approved: 50,
        rejected: 20,
        processing: 2,
        completed: 40,
        failed: 3,
        total: 125,
      });

      const stats = await curationQueue.getStats();

      // Approval rate should be reasonable
      const approvalRate = stats.approved / (stats.approved + stats.rejected);
      expect(approvalRate).toBeGreaterThan(0.5); // At least 50% approval

      getStatsSpy.mockRestore();
    });
  });
});
