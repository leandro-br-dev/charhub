/**
 * User Service Unit Tests
 * Tests for content filtering functions (age ratings and blocked tags)
 */
import {
  getAllowedAgeRatingsForUser,
  getUserContentFilters,
  validateAgeRating,
  getMaxAllowedAgeRating,
} from '../userService';
import { setupTestDatabase, cleanDatabase, teardownTestDatabase } from '../../test-utils/database';
import { createTestUser } from '../../test-utils/factories';
import type { AgeRating } from '../../types';

describe('UserService - Content Filtering', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('getAllowedAgeRatingsForUser', () => {
    it('should return only "L" for null birthDate', () => {
      const ratings = getAllowedAgeRatingsForUser(null);
      expect(ratings).toEqual(['L']);
    });

    it('should return correct ratings for 8 year old (below TEN)', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 8);

      const ratings = getAllowedAgeRatingsForUser(birthDate);
      expect(ratings).toEqual(['L']); // Only L, not yet 10
    });

    it('should return L and TEN for 10 year old', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 10);

      const ratings = getAllowedAgeRatingsForUser(birthDate);
      expect(ratings).toEqual(['L', 'TEN']);
    });

    it('should return L, TEN, TWELVE for 12 year old', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 12);

      const ratings = getAllowedAgeRatingsForUser(birthDate);
      expect(ratings).toEqual(['L', 'TEN', 'TWELVE']);
    });

    it('should return L, TEN, TWELVE, FOURTEEN for 14 year old', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 14);

      const ratings = getAllowedAgeRatingsForUser(birthDate);
      expect(ratings).toEqual(['L', 'TEN', 'TWELVE', 'FOURTEEN']);
    });

    it('should return L through SIXTEEN for 16 year old', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 16);

      const ratings = getAllowedAgeRatingsForUser(birthDate);
      expect(ratings).toEqual(['L', 'TEN', 'TWELVE', 'FOURTEEN', 'SIXTEEN']);
    });

    it('should return all ratings for 18+ year old', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 20);

      const ratings = getAllowedAgeRatingsForUser(birthDate);
      expect(ratings).toEqual(['L', 'TEN', 'TWELVE', 'FOURTEEN', 'SIXTEEN', 'EIGHTEEN']);
    });

    it('should return all ratings for exactly 18 year old', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 18);

      const ratings = getAllowedAgeRatingsForUser(birthDate);
      expect(ratings).toEqual(['L', 'TEN', 'TWELVE', 'FOURTEEN', 'SIXTEEN', 'EIGHTEEN']);
    });

    it('should handle edge case of 17 year old (should NOT include EIGHTEEN)', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 17);

      const ratings = getAllowedAgeRatingsForUser(birthDate);
      expect(ratings).not.toContain('EIGHTEEN');
      expect(ratings).toEqual(['L', 'TEN', 'TWELVE', 'FOURTEEN', 'SIXTEEN']);
    });

    it('should handle edge case of birthday today (turning 18)', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 18);
      // Set to exactly today, 18 years ago
      birthDate.setHours(0, 0, 0, 0);

      const ratings = getAllowedAgeRatingsForUser(birthDate);
      expect(ratings).toContain('EIGHTEEN');
    });
  });

  describe('getMaxAllowedAgeRating', () => {
    it('should return L for null birthDate', () => {
      const maxRating = getMaxAllowedAgeRating(null);
      expect(maxRating).toBe('L');
    });

    it('should return L for 5 year old', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 5);

      const maxRating = getMaxAllowedAgeRating(birthDate);
      expect(maxRating).toBe('L');
    });

    it('should return TEN for 10 year old', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 10);

      const maxRating = getMaxAllowedAgeRating(birthDate);
      expect(maxRating).toBe('TEN');
    });

    it('should return TWELVE for 12 year old', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 12);

      const maxRating = getMaxAllowedAgeRating(birthDate);
      expect(maxRating).toBe('TWELVE');
    });

    it('should return FOURTEEN for 14 year old', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 14);

      const maxRating = getMaxAllowedAgeRating(birthDate);
      expect(maxRating).toBe('FOURTEEN');
    });

    it('should return SIXTEEN for 16 year old', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 16);

      const maxRating = getMaxAllowedAgeRating(birthDate);
      expect(maxRating).toBe('SIXTEEN');
    });

    it('should return EIGHTEEN for 18+ year old', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 25);

      const maxRating = getMaxAllowedAgeRating(birthDate);
      expect(maxRating).toBe('EIGHTEEN');
    });
  });

  describe('validateAgeRating', () => {
    it('should allow L rating for any age', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 5);

      const isValid = validateAgeRating('L', birthDate);
      expect(isValid).toBe(true);
    });

    it('should allow L rating for null birthDate', () => {
      const isValid = validateAgeRating('L', null);
      expect(isValid).toBe(true);
    });

    it('should reject TEN rating for 9 year old', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 9);

      const isValid = validateAgeRating('TEN', birthDate);
      expect(isValid).toBe(false);
    });

    it('should allow TEN rating for 10 year old', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 10);

      const isValid = validateAgeRating('TEN', birthDate);
      expect(isValid).toBe(true);
    });

    it('should reject EIGHTEEN rating for 17 year old', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 17);

      const isValid = validateAgeRating('EIGHTEEN', birthDate);
      expect(isValid).toBe(false);
    });

    it('should allow EIGHTEEN rating for 18 year old', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 18);

      const isValid = validateAgeRating('EIGHTEEN', birthDate);
      expect(isValid).toBe(true);
    });

    it('should reject EIGHTEEN rating for null birthDate', () => {
      const isValid = validateAgeRating('EIGHTEEN', null);
      expect(isValid).toBe(false);
    });

    it('should allow SIXTEEN rating for 20 year old', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 20);

      const isValid = validateAgeRating('SIXTEEN', birthDate);
      expect(isValid).toBe(true);
    });
  });

  describe('getUserContentFilters', () => {
    it('should return filters for user with birthDate and no blocked tags', async () => {
      const birthDate = new Date('1995-05-20'); // 28+ years old
      const user = await createTestUser({
        birthDate,
        blockedTags: [],
      });

      const filters = await getUserContentFilters(user.id);

      expect(filters).toBeDefined();
      expect(filters.allowedAgeRatings).toEqual(['L', 'TEN', 'TWELVE', 'FOURTEEN', 'SIXTEEN', 'EIGHTEEN']);
      expect(filters.blockedTags).toEqual([]);
    });

    it('should return filters for user with birthDate and blocked tags', async () => {
      const birthDate = new Date('2010-01-01'); // ~14 years old
      const user = await createTestUser({
        birthDate,
        blockedTags: ['VIOLENCE', 'HORROR'],
      });

      const filters = await getUserContentFilters(user.id);

      expect(filters).toBeDefined();
      expect(filters.allowedAgeRatings).toEqual(['L', 'TEN', 'TWELVE', 'FOURTEEN']);
      expect(filters.allowedAgeRatings).not.toContain('SIXTEEN');
      expect(filters.allowedAgeRatings).not.toContain('EIGHTEEN');
      expect(filters.blockedTags).toEqual(['VIOLENCE', 'HORROR']);
    });

    it('should return only L rating for user without birthDate', async () => {
      const user = await createTestUser({
        birthDate: null,
        blockedTags: [],
      });

      const filters = await getUserContentFilters(user.id);

      expect(filters).toBeDefined();
      expect(filters.allowedAgeRatings).toEqual(['L']);
      expect(filters.blockedTags).toEqual([]);
    });

    it('should handle user with null blockedTags', async () => {
      const birthDate = new Date('2000-01-01'); // 24+ years old
      const user = await createTestUser({
        birthDate,
        blockedTags: null,
      });

      const filters = await getUserContentFilters(user.id);

      expect(filters).toBeDefined();
      expect(filters.allowedAgeRatings).toEqual(['L', 'TEN', 'TWELVE', 'FOURTEEN', 'SIXTEEN', 'EIGHTEEN']);
      expect(filters.blockedTags).toEqual([]);
    });

    it('should throw error for non-existent user', async () => {
      await expect(getUserContentFilters('non-existent-id')).rejects.toThrow('User not found');
    });

    it('should handle user with multiple blocked tags', async () => {
      const birthDate = new Date('1990-01-01'); // 34+ years old
      const user = await createTestUser({
        birthDate,
        blockedTags: ['VIOLENCE', 'HORROR', 'SEXUAL', 'GORE'],
      });

      const filters = await getUserContentFilters(user.id);

      expect(filters.blockedTags).toHaveLength(4);
      expect(filters.blockedTags).toContain('VIOLENCE');
      expect(filters.blockedTags).toContain('HORROR');
      expect(filters.blockedTags).toContain('SEXUAL');
      expect(filters.blockedTags).toContain('GORE');
    });
  });

  describe('Integration - Age Rating System', () => {
    it('should progressively unlock ratings as user gets older', () => {
      const testAges = [
        { age: 5, expected: ['L'] },
        { age: 10, expected: ['L', 'TEN'] },
        { age: 12, expected: ['L', 'TEN', 'TWELVE'] },
        { age: 14, expected: ['L', 'TEN', 'TWELVE', 'FOURTEEN'] },
        { age: 16, expected: ['L', 'TEN', 'TWELVE', 'FOURTEEN', 'SIXTEEN'] },
        { age: 18, expected: ['L', 'TEN', 'TWELVE', 'FOURTEEN', 'SIXTEEN', 'EIGHTEEN'] },
      ];

      testAges.forEach(({ age, expected }) => {
        const birthDate = new Date();
        birthDate.setFullYear(birthDate.getFullYear() - age);

        const ratings = getAllowedAgeRatingsForUser(birthDate);
        expect(ratings).toEqual(expected);
      });
    });

    it('should ensure maxAllowedRating is always included in allowedRatings', () => {
      const testAges = [0, 5, 10, 12, 14, 16, 18, 25];

      testAges.forEach(age => {
        const birthDate = new Date();
        birthDate.setFullYear(birthDate.getFullYear() - age);

        const maxRating = getMaxAllowedAgeRating(birthDate);
        const allowedRatings = getAllowedAgeRatingsForUser(birthDate);

        expect(allowedRatings).toContain(maxRating);
        expect(allowedRatings[allowedRatings.length - 1]).toBe(maxRating);
      });
    });

    it('should validate that all ratings below max are allowed', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 18);

      const allRatings: AgeRating[] = ['L', 'TEN', 'TWELVE', 'FOURTEEN', 'SIXTEEN', 'EIGHTEEN'];

      allRatings.forEach(rating => {
        const isValid = validateAgeRating(rating, birthDate);
        expect(isValid).toBe(true);
      });
    });
  });
});
