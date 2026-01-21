/**
 * Name Frequency Service Unit Tests
 * Tests for FEATURE-012: Name diversity & ethnicity classification
 */
import { NameFrequencyService } from '../nameFrequencyService';
import { setupTestDatabase, cleanDatabase, teardownTestDatabase } from '../../test-utils/database';
import { createTestUser, createTestCharacter } from '../../test-utils/factories';
import { getTestDb } from '../../test-utils/database';
import { CharacterGender } from '../../generated/prisma';

describe('NameFrequencyService', () => {
  let nameFrequencyService: NameFrequencyService;

  beforeAll(async () => {
    await setupTestDatabase();
    nameFrequencyService = new NameFrequencyService();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('getTopNames', () => {
    it('should return empty arrays when no characters exist', async () => {
      const result = await nameFrequencyService.getTopNames();

      expect(result.topFirstNames).toEqual([]);
      expect(result.topLastNames).toEqual([]);
    });

    it('should return top first names ordered by frequency', async () => {
      const user = await createTestUser();

      // Create characters with various first names
      await createTestCharacter(user.id, { firstName: 'Maria', lastName: 'Silva', gender: 'FEMALE' });
      await createTestCharacter(user.id, { firstName: 'Maria', lastName: 'Santos', gender: 'FEMALE' });
      await createTestCharacter(user.id, { firstName: 'Joao', lastName: 'Silva', gender: 'MALE' });
      await createTestCharacter(user.id, { firstName: 'Ana', lastName: 'Costa', gender: 'FEMALE' });

      const result = await nameFrequencyService.getTopNames({ limit: 10 });

      expect(result.topFirstNames).toHaveLength(3);
      expect(result.topFirstNames[0]).toEqual({ name: 'Maria', count: 2 });
      expect(result.topFirstNames[1]).toEqual({ name: 'Joao', count: 1 });
      expect(result.topFirstNames[2]).toEqual({ name: 'Ana', count: 1 });
    });

    it('should return top last names ordered by frequency', async () => {
      const user = await createTestUser();

      // Create characters with various last names
      await createTestCharacter(user.id, { firstName: 'Maria', lastName: 'Silva', gender: 'FEMALE' });
      await createTestCharacter(user.id, { firstName: 'Joao', lastName: 'Silva', gender: 'MALE' });
      await createTestCharacter(user.id, { firstName: 'Ana', lastName: 'Silva', gender: 'FEMALE' });
      await createTestCharacter(user.id, { firstName: 'Pedro', lastName: 'Santos', gender: 'MALE' });

      const result = await nameFrequencyService.getTopNames({ limit: 10 });

      expect(result.topLastNames).toHaveLength(2);
      expect(result.topLastNames[0]).toEqual({ name: 'Silva', count: 3 });
      expect(result.topLastNames[1]).toEqual({ name: 'Santos', count: 1 });
    });

    it('should filter by gender when provided', async () => {
      const user = await createTestUser();

      // Create characters with different genders
      await createTestCharacter(user.id, { firstName: 'Maria', lastName: 'Silva', gender: 'FEMALE' });
      await createTestCharacter(user.id, { firstName: 'Joao', lastName: 'Silva', gender: 'MALE' });
      await createTestCharacter(user.id, { firstName: 'Ana', lastName: 'Santos', gender: 'FEMALE' });
      await createTestCharacter(user.id, { firstName: 'Pedro', lastName: 'Costa', gender: 'MALE' });

      const femaleResult = await nameFrequencyService.getTopNames({ gender: CharacterGender.FEMALE });

      expect(femaleResult.topFirstNames).toHaveLength(2);
      expect(femaleResult.topFirstNames).toEqual([
        { name: 'Maria', count: 1 },
        { name: 'Ana', count: 1 },
      ]);

      const maleResult = await nameFrequencyService.getTopNames({ gender: CharacterGender.MALE });

      expect(maleResult.topFirstNames).toHaveLength(2);
      expect(maleResult.topFirstNames).toEqual([
        { name: 'Joao', count: 1 },
        { name: 'Pedro', count: 1 },
      ]);
    });

    it('should respect limit parameter', async () => {
      const user = await createTestUser();

      // Create more characters than the limit
      for (let i = 0; i < 15; i++) {
        await createTestCharacter(user.id, {
          firstName: `Name${i}`,
          lastName: `Last${i % 5}`,
          gender: 'FEMALE',
        });
      }

      const result = await nameFrequencyService.getTopNames({ limit: 5 });

      expect(result.topFirstNames.length).toBeLessThanOrEqual(5);
      expect(result.topLastNames.length).toBeLessThanOrEqual(5);
    });

    it('should filter by days parameter', async () => {
      const user = await createTestUser();
      const db = getTestDb();

      // Create an old character (31 days ago)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);

      await db.character.create({
        data: {
          userId: user.id,
          firstName: 'OldName',
          lastName: 'OldLast',
          gender: 'FEMALE',
          visibility: 'PUBLIC',
          isSystemCharacter: false,
          createdAt: oldDate,
          ageRating: 'L',
        },
      });

      // Create a recent character (today)
      await createTestCharacter(user.id, { firstName: 'NewName', lastName: 'NewLast', gender: 'FEMALE' });

      // Query with 30 days filter
      const result = await nameFrequencyService.getTopNames({ days: 30 });

      expect(result.topFirstNames).toHaveLength(1);
      expect(result.topFirstNames[0].name).toBe('NewName');
      expect(result.topFirstNames[0].name).not.toBe('OldName');
    });

    it('should exclude system characters from results', async () => {
      const user = await createTestUser();
      const db = getTestDb();

      // Create system character
      await db.character.create({
        data: {
          userId: user.id,
          firstName: 'SystemBot',
          lastName: 'Bot',
          gender: 'MALE',
          visibility: 'PUBLIC',
          isSystemCharacter: true,
          ageRating: 'L',
        },
      });

      // Create regular character
      await createTestCharacter(user.id, { firstName: 'Regular', lastName: 'Character', gender: 'FEMALE' });

      const result = await nameFrequencyService.getTopNames();

      expect(result.topFirstNames).toHaveLength(1);
      expect(result.topFirstNames[0].name).toBe('Regular');
      expect(result.topFirstNames[0].name).not.toBe('SystemBot');
    });

    it('should exclude private characters from results', async () => {
      const user = await createTestUser();
      const db = getTestDb();

      // Create private character
      await db.character.create({
        data: {
          userId: user.id,
          firstName: 'PrivateChar',
          lastName: 'Private',
          gender: 'FEMALE',
          visibility: 'PRIVATE',
          isSystemCharacter: false,
          ageRating: 'L',
        },
      });

      // Create public character
      await createTestCharacter(user.id, { firstName: 'PublicChar', lastName: 'Public', gender: 'FEMALE' });

      const result = await nameFrequencyService.getTopNames();

      expect(result.topFirstNames).toHaveLength(1);
      expect(result.topFirstNames[0].name).toBe('PublicChar');
      expect(result.topFirstNames[0].name).not.toBe('PrivateChar');
    });

    it('should handle null last names correctly', async () => {
      const user = await createTestUser();
      const db = getTestDb();

      // Create character with null lastName
      await db.character.create({
        data: {
          userId: user.id,
          firstName: 'NoLastName',
          lastName: null,
          gender: 'MALE',
          visibility: 'PUBLIC',
          isSystemCharacter: false,
          ageRating: 'L',
        },
      });

      // Create character with lastName
      await createTestCharacter(user.id, { firstName: 'HasLastName', lastName: 'Silva', gender: 'MALE' });

      const result = await nameFrequencyService.getTopNames();

      expect(result.topFirstNames).toHaveLength(2);
      expect(result.topLastNames).toHaveLength(1); // null lastName should be excluded
      expect(result.topLastNames[0].name).toBe('Silva');
    });

    it('should return empty results on database error', async () => {
      // Mock prisma.groupBy to throw error
      const db = getTestDb();
      jest.spyOn(db.character, 'groupBy').mockRejectedValueOnce(new Error('Database error'));

      const result = await nameFrequencyService.getTopNames();

      expect(result.topFirstNames).toEqual([]);
      expect(result.topLastNames).toEqual([]);
    });
  });

  describe('getNameFrequencyStats', () => {
    it('should return statistics for name frequency', async () => {
      const user = await createTestUser();

      // Create test characters
      await createTestCharacter(user.id, { firstName: 'Maria', lastName: 'Silva', gender: 'FEMALE' });
      await createTestCharacter(user.id, { firstName: 'Maria', lastName: 'Santos', gender: 'FEMALE' });
      await createTestCharacter(user.id, { firstName: 'Joao', lastName: 'Silva', gender: 'MALE' });

      const stats = await nameFrequencyService.getNameFrequencyStats();

      expect(stats.totalFirstNames).toBe(3);
      expect(stats.totalLastNames).toBe(3);
      expect(stats.mostCommonFirstName).toEqual({ name: 'Maria', count: 2 });
      expect(stats.mostCommonLastName).toEqual({ name: 'Silva', count: 2 });
    });

    it('should filter by gender when provided', async () => {
      const user = await createTestUser();

      // Create test characters
      await createTestCharacter(user.id, { firstName: 'Maria', lastName: 'Silva', gender: 'FEMALE' });
      await createTestCharacter(user.id, { firstName: 'Joao', lastName: 'Silva', gender: 'MALE' });

      const femaleStats = await nameFrequencyService.getNameFrequencyStats({ gender: CharacterGender.FEMALE });

      expect(femaleStats.totalFirstNames).toBe(1);
      expect(femaleStats.mostCommonFirstName).toEqual({ name: 'Maria', count: 1 });
    });

    it('should return null for most common when no characters exist', async () => {
      const stats = await nameFrequencyService.getNameFrequencyStats();

      expect(stats.totalFirstNames).toBe(0);
      expect(stats.totalLastNames).toBe(0);
      expect(stats.mostCommonFirstName).toBeNull();
      expect(stats.mostCommonLastName).toBeNull();
    });

    it('should return zero stats on database error', async () => {
      // Mock prisma to throw error
      const db = getTestDb();
      jest.spyOn(db.character, 'count').mockRejectedValueOnce(new Error('Database error'));

      const stats = await nameFrequencyService.getNameFrequencyStats();

      expect(stats.totalFirstNames).toBe(0);
      expect(stats.totalLastNames).toBe(0);
      expect(stats.mostCommonFirstName).toBeNull();
      expect(stats.mostCommonLastName).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty result when all names are filtered out', async () => {
      const user = await createTestUser();
      const db = getTestDb();

      // Create only private characters
      await db.character.create({
        data: {
          userId: user.id,
          firstName: 'Private',
          lastName: 'Character',
          gender: 'FEMALE',
          visibility: 'PRIVATE',
          isSystemCharacter: false,
          ageRating: 'L',
        },
      });

      const result = await nameFrequencyService.getTopNames();

      expect(result.topFirstNames).toEqual([]);
      expect(result.topLastNames).toEqual([]);
    });

    it('should handle limit larger than available names', async () => {
      const user = await createTestUser();

      // Create only 2 characters
      await createTestCharacter(user.id, { firstName: 'Maria', lastName: 'Silva', gender: 'FEMALE' });
      await createTestCharacter(user.id, { firstName: 'Joao', lastName: 'Santos', gender: 'MALE' });

      const result = await nameFrequencyService.getTopNames({ limit: 100 });

      expect(result.topFirstNames.length).toBeLessThanOrEqual(2);
    });

    it('should handle zero limit gracefully', async () => {
      const user = await createTestUser();

      await createTestCharacter(user.id, { firstName: 'Maria', lastName: 'Silva', gender: 'FEMALE' });

      const result = await nameFrequencyService.getTopNames({ limit: 0 });

      expect(result.topFirstNames).toEqual([]);
      expect(result.topLastNames).toEqual([]);
    });

    it('should handle negative days parameter', async () => {
      const user = await createTestUser();

      await createTestCharacter(user.id, { firstName: 'Maria', lastName: 'Silva', gender: 'FEMALE' });

      // Negative days should still return results (looks into future)
      const result = await nameFrequencyService.getTopNames({ days: -1 });

      expect(result.topFirstNames).toHaveLength(1);
    });
  });
});
