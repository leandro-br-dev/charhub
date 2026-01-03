/**
 * Search Variation System Tests
 */

import {
  getVariedSearchParams,
  getSearchParamsWithTag,
  getAvailableTags,
  isValidTag,
  type SearchVariationConfig,
} from '../searchVariation';

describe('SearchVariation', () => {
  describe('getVariedSearchParams', () => {
    it('should return valid search configuration', () => {
      const result = getVariedSearchParams();

      expect(result).toMatchObject({
        period: expect.any(String),
        sort: expect.any(String),
        tag: expect.any(String),
      });
    });

    it('should return valid period from pool', () => {
      const result = getVariedSearchParams();

      expect(['Day', 'Week', 'Month', 'Year', 'AllTime']).toContain(result.period);
    });

    it('should return valid sort from pool', () => {
      const result = getVariedSearchParams();

      expect(['Newest', 'Most Reactions', 'Most Comments', 'Trending']).toContain(result.sort);
    });

    it('should prioritize Most Reactions sort', () => {
      // Run many times to check distribution
      const sorts: Record<string, number> = {
        'Most Reactions': 0,
        'Trending': 0,
        'Newest': 0,
      };

      const iterations = 1000;
      for (let i = 0; i < iterations; i++) {
        const result = getVariedSearchParams();
        sorts[result.sort]++;
      }

      // Most Reactions should be most common (target 60%)
      const mostReactionsRatio = sorts['Most Reactions'] / iterations;
      expect(mostReactionsRatio).toBeGreaterThan(0.5); // At least 50%
      expect(mostReactionsRatio).toBeLessThan(0.7); // Less than 70%

      // Trending should be second (target 25%)
      const trendingRatio = sorts['Trending'] / iterations;
      expect(trendingRatio).toBeGreaterThan(0.2); // At least 20%
      expect(trendingRatio).toBeLessThan(0.3); // Less than 30%

      // Newest should be least common (target 15%)
      const newestRatio = sorts['Newest'] / iterations;
      expect(newestRatio).toBeGreaterThan(0.1); // At least 10%
      expect(newestRatio).toBeLessThan(0.2); // Less than 20%
    });

    it('should prioritize Week period', () => {
      // Run many times to check distribution
      const periods: Record<string, number> = {
        'Day': 0,
        'Week': 0,
        'Month': 0,
        'Year': 0,
        'AllTime': 0,
      };

      const iterations = 1000;
      for (let i = 0; i < iterations; i++) {
        const result = getVariedSearchParams();
        periods[result.period]++;
      }

      // Week should be most common (target 35%)
      const weekRatio = periods['Week'] / iterations;
      expect(weekRatio).toBeGreaterThan(0.3); // At least 30%
      expect(weekRatio).toBeLessThan(0.4); // Less than 40%
    });

    it('should return valid tag from pool', () => {
      const result = getVariedSearchParams();
      const availableTags = getAvailableTags();

      expect(availableTags).toContain(result.tag);
    });

    it('should return different results on multiple calls (variety)', () => {
      const results: SearchVariationConfig[] = [];

      for (let i = 0; i < 50; i++) {
        results.push(getVariedSearchParams());
      }

      // Check that we got some variety
      const uniqueSorts = new Set(results.map(r => r.sort));
      const uniquePeriods = new Set(results.map(r => r.period));
      const uniqueTags = new Set(results.map(r => r.tag));

      // Should have at least some variety
      expect(uniqueSorts.size).toBeGreaterThan(1);
      expect(uniquePeriods.size).toBeGreaterThan(1);
      expect(uniqueTags.size).toBeGreaterThan(1);
    });
  });

  describe('getSearchParamsWithTag', () => {
    it('should return config with specified tag', () => {
      const result = getSearchParamsWithTag('elf');

      expect(result.tag).toBe('elf');
    });

    it('should return valid period and sort with custom tag', () => {
      const result = getSearchParamsWithTag('elf');

      expect(['Day', 'Week', 'Month', 'Year', 'AllTime']).toContain(result.period);
      expect(['Newest', 'Most Reactions', 'Most Comments', 'Trending']).toContain(result.sort);
    });

    it('should return varied configs for same tag', () => {
      const results = Array.from({ length: 20 }, () =>
        getSearchParamsWithTag('elf')
      );

      const sorts = new Set(results.map(r => r.sort));
      const periods = new Set(results.map(r => r.period));

      // All should have the specified tag
      expect(results.every(r => r.tag === 'elf')).toBe(true);

      // But periods and sorts should vary
      expect(sorts.size).toBeGreaterThan(1);
      expect(periods.size).toBeGreaterThan(1);
    });
  });

  describe('getAvailableTags', () => {
    it('should return array of tags', () => {
      const tags = getAvailableTags();

      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeGreaterThan(0);
    });

    it('should include expected character tags', () => {
      const tags = getAvailableTags();

      // Should include common character tags
      expect(tags).toContain('woman');
      expect(tags).toContain('man');
      expect(tags).toContain('elf');
      expect(tags).toContain('robot');
      expect(tags).toContain('warrior');
      expect(tags).toContain('mage');
    });

    it('should include gender tags', () => {
      const tags = getAvailableTags();

      expect(tags).toContain('woman');
      expect(tags).toContain('man');
      expect(tags).toContain('girl');
      expect(tags).toContain('boy');
    });

    it('should include fantasy race tags', () => {
      const tags = getAvailableTags();

      expect(tags).toContain('elf');
      expect(tags).toContain('dwarf');
      expect(tags).toContain('orc');
      expect(tags).toContain('vampire');
      expect(tags).toContain('demon');
      expect(tags).toContain('angel');
    });

    it('should include sci-fi tags', () => {
      const tags = getAvailableTags();

      expect(tags).toContain('robot');
      expect(tags).toContain('cyborg');
      expect(tags).toContain('android');
      expect(tags).toContain('alien');
    });

    it('should include class/archetype tags', () => {
      const tags = getAvailableTags();

      expect(tags).toContain('warrior');
      expect(tags).toContain('mage');
      expect(tags).toContain('wizard');
      expect(tags).toContain('knight');
    });

    it('should include setting/theme tags', () => {
      const tags = getAvailableTags();

      expect(tags).toContain('fantasy');
      expect(tags).toContain('sci-fi');
      expect(tags).toContain('cyberpunk');
      expect(tags).toContain('medieval');
    });
  });

  describe('isValidTag', () => {
    it('should return true for valid tags', () => {
      expect(isValidTag('woman')).toBe(true);
      expect(isValidTag('elf')).toBe(true);
      expect(isValidTag('robot')).toBe(true);
      expect(isValidTag('warrior')).toBe(true);
    });

    it('should return false for invalid tags', () => {
      expect(isValidTag('invalid-tag-123')).toBe(false);
      expect(isValidTag('')).toBe(false);
      expect(isValidTag('notarealtag')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isValidTag('ELF')).toBe(true);
      expect(isValidTag('Elf')).toBe(true);
      expect(isValidTag('eLf')).toBe(true);
    });

    it('should return false for edge cases', () => {
      expect(isValidTag(null as any)).toBe(false);
      expect(isValidTag(undefined as any)).toBe(false);
    });
  });

  describe('weighted random selection', () => {
    it('should distribute periods according to weights', () => {
      const counts: Record<string, number> = {
        'Day': 0,
        'Week': 0,
        'Month': 0,
        'Year': 0,
        'AllTime': 0,
      };

      const iterations = 5000;
      for (let i = 0; i < iterations; i++) {
        const result = getVariedSearchParams();
        counts[result.period]++;
      }

      // Check approximate weights (within 5% tolerance)
      // Expected: Day=20%, Week=35%, Month=25%, Year=15%, AllTime=5%
      expect(counts['Day'] / iterations).toBeCloseTo(0.20, 1);
      expect(counts['Week'] / iterations).toBeCloseTo(0.35, 1);
      expect(counts['Month'] / iterations).toBeCloseTo(0.25, 1);
      expect(counts['Year'] / iterations).toBeCloseTo(0.15, 1);
      expect(counts['AllTime'] / iterations).toBeCloseTo(0.05, 1);
    });

    it('should distribute sorts according to weights', () => {
      const counts: Record<string, number> = {
        'Most Reactions': 0,
        'Trending': 0,
        'Newest': 0,
        'Most Comments': 0,
      };

      const iterations = 5000;
      for (let i = 0; i < iterations; i++) {
        const result = getVariedSearchParams();
        counts[result.sort]++;
      }

      // Check approximate weights (within 5% tolerance)
      // Expected: Most Reactions=60%, Trending=25%, Newest=15%, Most Comments=0%
      expect(counts['Most Reactions'] / iterations).toBeCloseTo(0.60, 1);
      expect(counts['Trending'] / iterations).toBeCloseTo(0.25, 1);
      expect(counts['Newest'] / iterations).toBeCloseTo(0.15, 1);
    });
  });
});
