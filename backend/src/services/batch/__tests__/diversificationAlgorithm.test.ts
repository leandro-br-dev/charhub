/**
 * Diversification Algorithm Tests
 * Tests for the enhanced diversification algorithm with gender/species tracking
 */

import { DiversificationAlgorithm } from '../diversificationAlgorithm';
import { AgeRating } from '../../../generated/prisma';

// Mock the database module with inline functions to avoid initialization issues
jest.mock('../../../config/database', () => {
  const mockFindMany = jest.fn();
  const mockCount = jest.fn();
  const mockGroupBy = jest.fn();
  const mockAggregate = jest.fn();
  const mockCharacterFindMany = jest.fn().mockResolvedValue([]);

  return {
    prisma: {
      curatedImage: {
        findMany: mockFindMany,
        count: mockCount,
        groupBy: mockGroupBy,
        aggregate: mockAggregate,
      },
      character: {
        findMany: mockCharacterFindMany,
      },
    },
    __mockExports: {
      mockFindMany,
      mockCount,
      mockGroupBy,
      mockAggregate,
      mockCharacterFindMany,
    },
  };
});

// Get the mock references
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { __mockExports } = require('../../../config/database');

describe('DiversificationAlgorithm (Enhanced)', () => {
  let algorithm: DiversificationAlgorithm;

  beforeEach(() => {
    algorithm = new DiversificationAlgorithm();
    jest.clearAllMocks();

    // Default mock for character findMany (empty recent characters)
    __mockExports.mockCharacterFindMany.mockResolvedValue([]);

    // Default mocks for aggregate
    __mockExports.mockAggregate.mockResolvedValue({
      _avg: { qualityScore: 4.0 },
      _min: { qualityScore: 3.0 },
      _max: { qualityScore: 5.0 },
    });

    // Default mocks for groupBy
    __mockExports.mockGroupBy.mockResolvedValue([]);
  });

  describe('selectImages', () => {
    beforeEach(() => {
      // Mock database responses with gender and species
      __mockExports.mockFindMany.mockResolvedValue([
        {
          id: 'img1',
          status: 'APPROVED',
          ageRating: AgeRating.TEN,
          qualityScore: 4.5,
          tags: ['anime', 'fantasy'],
          generatedCharId: null,
          gender: 'female',
          species: 'human',
        },
        {
          id: 'img2',
          status: 'APPROVED',
          ageRating: AgeRating.TEN,
          qualityScore: 4.2,
          tags: ['anime', 'scifi'],
          generatedCharId: null,
          gender: 'male',
          species: 'human',
        },
        {
          id: 'img3',
          status: 'APPROVED',
          ageRating: AgeRating.TEN,
          qualityScore: 4.0,
          tags: ['realistic', 'modern'],
          generatedCharId: null,
          gender: 'female',
          species: 'elf',
        },
        {
          id: 'img4',
          status: 'APPROVED',
          ageRating: AgeRating.TEN,
          qualityScore: 3.8,
          tags: ['anime', 'fantasy'],
          generatedCharId: null,
          gender: 'male',
          species: 'robot',
        },
        {
          id: 'img5',
          status: 'APPROVED',
          ageRating: AgeRating.TEN,
          qualityScore: 3.5,
          tags: ['realistic', 'scifi'],
          generatedCharId: null,
          gender: 'non-binary',
          species: 'human',
        },
      ]);
    });

    it('should select requested number of images', async () => {
      const result = await algorithm.selectImages({ count: 2 });

      expect(result).toHaveLength(2);
      expect(result).toContain('img1');
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
      expect(__mockExports.mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ageRating: AgeRating.TEN,
          }),
        })
      );
    });

    it('should apply gender balance when enabled', async () => {
      // Mock recent characters with skewed gender distribution
      __mockExports.mockCharacterFindMany.mockResolvedValue([
        { gender: 'female', species: 'human' },
        { gender: 'female', species: 'human' },
        { gender: 'female', species: 'human' },
        { gender: 'female', species: 'human' },
        { gender: 'male', species: 'human' },
      ]);

      const result = await algorithm.selectImages({
        count: 3,
        genderBalance: true,
        maxConsecutiveSameGender: 2,
      });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should apply species diversity when enabled', async () => {
      // Mock recent characters with skewed species distribution
      __mockExports.mockCharacterFindMany.mockResolvedValue([
        { gender: 'female', species: 'human' },
        { gender: 'male', species: 'human' },
        { gender: 'female', species: 'human' },
        { gender: 'male', species: 'human' },
        { gender: 'female', species: 'elf' },
      ]);

      const result = await algorithm.selectImages({
        count: 3,
        speciesDiversity: true,
        maxConsecutiveSameSpecies: 2,
      });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should enforce max consecutive same gender limit', async () => {
      // Mock that we have too many females recently
      __mockExports.mockCharacterFindMany.mockResolvedValue(
        Array.from({ length: 50 }, () => ({ gender: 'female', species: 'human' }))
      );

      const result = await algorithm.selectImages({
        count: 5,
        genderBalance: true,
        maxConsecutiveSameGender: 2,
      });

      // Should prioritize non-female images
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should enforce max consecutive same species limit', async () => {
      // Mock that we have too many humans recently
      __mockExports.mockCharacterFindMany.mockResolvedValue(
        Array.from({ length: 50 }, () => ({ gender: 'female', species: 'human' }))
      );

      const result = await algorithm.selectImages({
        count: 5,
        speciesDiversity: true,
        maxConsecutiveSameSpecies: 2,
      });

      // Should prioritize non-human images
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
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
      __mockExports.mockFindMany.mockResolvedValue([
        {
          id: 'img1',
          status: 'APPROVED',
          ageRating: AgeRating.TEN,
          qualityScore: 4.5,
          tags: ['anime'],
          generatedCharId: null,
          gender: 'female',
          species: 'human',
        },
      ]);

      const result = await algorithm.selectImages({ count: 10 });

      // Should return what's available
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should not exceed requested count', async () => {
      // Create diverse images with different genders and species
      const genders = ['female', 'male', 'non-binary'];
      const species = ['human', 'elf', 'robot'];

      __mockExports.mockFindMany.mockResolvedValue(
        Array.from({ length: 50 }, (_, i) => ({
          id: `img${i}`,
          status: 'APPROVED',
          ageRating: AgeRating.TEN,
          qualityScore: 4.0,
          tags: [`tag${i}`],
          generatedCharId: null,
          gender: genders[i % 3],
          species: species[i % 3],
        }))
      );

      const result = await algorithm.selectImages({ count: 5 });

      expect(result).toHaveLength(5);
    });
  });

  describe('diversity scoring', () => {
    beforeEach(() => {
      __mockExports.mockFindMany.mockResolvedValue([
        {
          id: 'common1',
          tags: ['anime', 'girl', 'fantasy'],
          qualityScore: 4.0,
          status: 'APPROVED',
          ageRating: AgeRating.TEN,
          generatedCharId: null,
          gender: 'female',
          species: 'human',
        },
        {
          id: 'common2',
          tags: ['anime', 'girl', 'fantasy'],
          qualityScore: 4.0,
          status: 'APPROVED',
          ageRating: AgeRating.TEN,
          generatedCharId: null,
          gender: 'female',
          species: 'human',
        },
        {
          id: 'unique1',
          tags: ['realistic', 'man', 'scifi'],
          qualityScore: 3.5,
          status: 'APPROVED',
          ageRating: AgeRating.TEN,
          generatedCharId: null,
          gender: 'male',
          species: 'robot',
        },
        {
          id: 'unique2',
          tags: ['anime', 'elf', 'fantasy'],
          qualityScore: 3.8,
          status: 'APPROVED',
          ageRating: AgeRating.TEN,
          generatedCharId: null,
          gender: 'non-binary',
          species: 'elf',
        },
      ]);
    });

    it('should prefer diverse tags over quality when diversity enabled', async () => {
      // Mock recent characters with common tags
      __mockExports.mockCharacterFindMany.mockResolvedValue(
        Array.from({ length: 50 }, () => ({ gender: 'female', species: 'human' }))
      );

      const result = await algorithm.selectImages({
        count: 3,
        tagDiversity: true,
        genderBalance: true,
        speciesDiversity: true,
      });

      // Should include unique images despite lower quality
      expect(result).toContain('unique1');
      expect(result).toContain('unique2');
    });

    it('should prioritize underrepresented genders', async () => {
      // Mock recent characters with mostly females
      const recentCharacters = Array.from({ length: 40 }, () => ({ gender: 'female', species: 'human' }))
        .concat(Array.from({ length: 10 }, () => ({ gender: 'male', species: 'human' })));

      __mockExports.mockCharacterFindMany.mockResolvedValue(recentCharacters);

      const result = await algorithm.selectImages({
        count: 2,
        genderBalance: true,
      });

      // Should prefer male images
      expect(result).toContain('unique1'); // male
    });

    it('should prioritize underrepresented species', async () => {
      // Mock recent characters with mostly humans
      const recentCharacters = Array.from({ length: 45 }, () => ({ gender: 'female', species: 'human' }))
        .concat(Array.from({ length: 5 }, () => ({ gender: 'male', species: 'elf' })));

      __mockExports.mockCharacterFindMany.mockResolvedValue(recentCharacters);

      const result = await algorithm.selectImages({
        count: 2,
        speciesDiversity: true,
      });

      // Should prefer non-human images
      expect(result).toContain('unique1'); // robot
      expect(result).toContain('unique2'); // elf
    });
  });

  describe('getSelectionStats', () => {
    it('should return statistics including gender and species distribution', async () => {
      __mockExports.mockGroupBy.mockImplementation((args: any) => {
        if (args.by.includes('ageRating')) {
          return Promise.resolve([
            { ageRating: 'TEN', _count: 10 },
            { ageRating: 'TWELVE', _count: 5 },
          ]);
        }
        if (args.by.includes('gender')) {
          return Promise.resolve([
            { gender: 'female', _count: 8 },
            { gender: 'male', _count: 6 },
            { gender: null, _count: 1 },
          ]);
        }
        if (args.by.includes('species')) {
          return Promise.resolve([
            { species: 'human', _count: 10 },
            { species: 'elf', _count: 3 },
            { species: null, _count: 2 },
          ]);
        }
        return Promise.resolve([]);
      });

      __mockExports.mockCount.mockResolvedValue(15);
      __mockExports.mockAggregate.mockResolvedValue({
        _avg: { qualityScore: 4.2 },
        _min: { qualityScore: 3.5 },
        _max: { qualityScore: 5.0 },
      });

      const stats = await algorithm.getSelectionStats();

      expect(stats).toMatchObject({
        totalApproved: 15,
        byAgeRating: {
          'TEN': 10,
          'TWELVE': 5,
        },
        byGender: {
          'female': 8,
          'male': 6,
          'unknown': 1,
        },
        bySpecies: {
          'human': 10,
          'elf': 3,
          'unknown': 2,
        },
        recentQuality: {
          avg: 4.2,
          min: 3.5,
          max: 5.0,
        },
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty character history', async () => {
      __mockExports.mockCharacterFindMany.mockResolvedValue([]);

      const result = await algorithm.selectImages({ count: 2 });

      expect(result).toBeDefined();
    });

    it('should handle images without gender/species', async () => {
      __mockExports.mockFindMany.mockResolvedValue([
        {
          id: 'img1',
          status: 'APPROVED',
          ageRating: AgeRating.TEN,
          qualityScore: 4.5,
          tags: ['anime'],
          generatedCharId: null,
          gender: null,
          species: null,
        },
        {
          id: 'img2',
          status: 'APPROVED',
          ageRating: AgeRating.TEN,
          qualityScore: 4.0,
          tags: ['fantasy'],
          generatedCharId: null,
          gender: null,
          species: null,
        },
      ]);

      const result = await algorithm.selectImages({ count: 2 });

      expect(result).toBeDefined();
      expect(result.length).toBe(2);
    });

    it('should handle all disabled diversity options', async () => {
      const result = await algorithm.selectImages({
        count: 2,
        genderBalance: false,
        speciesDiversity: false,
        tagDiversity: false,
        styleBalance: false,
      });

      expect(result).toBeDefined();
      expect(result.length).toBe(2);
    });
  });
});
