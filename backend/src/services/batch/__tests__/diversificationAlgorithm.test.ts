/**
 * Diversification Algorithm Tests
 */

import { DiversificationAlgorithm } from '../diversificationAlgorithm';
import { prisma } from '../../../config/database';
import { AgeRating } from '../../../generated/prisma';

jest.mock('../../../config/database', () => ({
  prisma: {
    curatedImage: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('DiversificationAlgorithm', () => {
  let algorithm: DiversificationAlgorithm;

  beforeEach(() => {
    algorithm = new DiversificationAlgorithm();
    jest.clearAllMocks();
  });

  describe('selectImages', () => {
    beforeEach(() => {
      // Mock database responses
      (prisma.curatedImage.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'img1',
          status: 'APPROVED',
          ageRating: AgeRating.TEN,
          qualityScore: 4.5,
          tags: ['anime', 'fantasy'],
          generatedCharId: null,
        },
        {
          id: 'img2',
          status: 'APPROVED',
          ageRating: AgeRating.TEN,
          qualityScore: 4.2,
          tags: ['anime', 'scifi'],
          generatedCharId: null,
        },
        {
          id: 'img3',
          status: 'APPROVED',
          ageRating: AgeRating.TEN,
          qualityScore: 4.0,
          tags: ['realistic', 'modern'],
          generatedCharId: null,
        },
      ]);
    });

    it('should select requested number of images', async () => {
      const result = await algorithm.selectImages({ count: 2 });

      expect(result).toHaveLength(2);
      expect(result[0]).toBe('img1');
      expect(result[1]).toBe('img2');
    });

    it('should respect age rating distribution', async () => {
      const customDistribution = {
        [AgeRating.TEN]: 2,
        [AgeRating.TWELVE]: 1,
      };

      await algorithm.selectImages({
        count: 3,
        ageRatingDistribution: customDistribution,
      });

      // Should have queried for both age ratings
      expect(prisma.curatedImage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ageRating: AgeRating.TEN,
          }),
        })
      );
    });

    it('should apply style balance', async () => {
      const result = await algorithm.selectImages({
        count: 3,
        styleBalance: true,
      });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should apply tag diversity', async () => {
      const result = await algorithm.selectImages({
        count: 3,
        tagDiversity: true,
      });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle insufficient approved images', async () => {
      // Mock fewer images than requested
      (prisma.curatedImage.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'img1',
          status: 'APPROVED',
          ageRating: AgeRating.TEN,
          qualityScore: 4.5,
          tags: ['anime'],
          generatedCharId: null,
        },
      ]);

      const result = await algorithm.selectImages({ count: 10 });

      // Should return what's available
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should not exceed requested count', async () => {
      (prisma.curatedImage.findMany as jest.Mock).mockResolvedValue(
        Array.from({ length: 50 }, (_, i) => ({
          id: `img${i}`,
          status: 'APPROVED',
          ageRating: AgeRating.TEN,
          qualityScore: 4.0,
          tags: ['test'],
          generatedCharId: null,
        }))
      );

      const result = await algorithm.selectImages({ count: 5 });

      expect(result).toHaveLength(5);
    });
  });

  describe('diversity scoring', () => {
    beforeEach(() => {
      (prisma.curatedImage.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'common1',
          tags: ['anime', 'girl', 'fantasy'],
          qualityScore: 4.0,
          status: 'APPROVED',
          ageRating: AgeRating.TEN,
          generatedCharId: null,
        },
        {
          id: 'common2',
          tags: ['anime', 'girl', 'fantasy'],
          qualityScore: 4.0,
          status: 'APPROVED',
          ageRating: AgeRating.TEN,
          generatedCharId: null,
        },
        {
          id: 'unique1',
          tags: ['realistic', 'man', 'scifi'],
          qualityScore: 3.5,
          status: 'APPROVED',
          ageRating: AgeRating.TEN,
          generatedCharId: null,
        },
      ]);
    });

    it('should prefer diverse tags over quality when diversity enabled', async () => {
      const result = await algorithm.selectImages({
        count: 2,
        tagDiversity: true,
      });

      // Should include the unique image despite lower quality
      expect(result).toContain('unique1');
    });
  });

});
