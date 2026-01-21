/**
 * Recent Characters Service Unit Tests
 * Tests for FEATURE-012: Name diversity & ethnicity classification
 */
import { RecentCharactersService } from '../recentCharactersService';
import { setupTestDatabase, cleanDatabase, teardownTestDatabase } from '../../test-utils/database';
import { getTestDb } from '../../test-utils/database';
import { CharacterGender } from '../../generated/prisma';

describe('RecentCharactersService', () => {
  let recentCharactersService: RecentCharactersService;
  const BOT_USER_ID = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    await setupTestDatabase();
    recentCharactersService = new RecentCharactersService();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('getRecentCharacters', () => {
    it('should return empty arrays when no bot-generated characters exist', async () => {
      const result = await recentCharactersService.getRecentCharacters();

      expect(result.firstNames).toEqual([]);
      expect(result.lastNames).toEqual([]);
    });

    it('should return recent bot-generated characters ordered by creation date', async () => {
      const db = getTestDb();

      // Create bot user first
      await db.user.create({
        data: {
          id: BOT_USER_ID,
          email: 'bot@charhub.ai',
          displayName: 'AI Bot',
          avatarUrl: 'https://example.com/bot.jpg',
          provider: 'SYSTEM',
          providerAccountId: 'bot_account',
        },
      });

      // Create characters in chronological order
      await db.character.create({
        data: {
          userId: BOT_USER_ID,
          firstName: 'Character1',
          lastName: 'Last1',
          gender: 'FEMALE',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
      });

      await db.character.create({
        data: {
          userId: BOT_USER_ID,
          firstName: 'Character2',
          lastName: 'Last2',
          gender: 'MALE',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date('2024-01-01T11:00:00Z'),
        },
      });

      await db.character.create({
        data: {
          userId: BOT_USER_ID,
          firstName: 'Character3',
          lastName: 'Last3',
          gender: 'FEMALE',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date('2024-01-01T12:00:00Z'),
        },
      });

      const result = await recentCharactersService.getRecentCharacters();

      // Should return in reverse chronological order (newest first)
      expect(result.firstNames).toEqual(['Character3', 'Character2', 'Character1']);
      expect(result.lastNames).toEqual(['Last3', 'Last2', 'Last1']);
    });

    it('should filter by gender when provided', async () => {
      const db = getTestDb();

      // Create bot user
      await db.user.create({
        data: {
          id: BOT_USER_ID,
          email: 'bot@charhub.ai',
          displayName: 'AI Bot',
          avatarUrl: 'https://example.com/bot.jpg',
          provider: 'SYSTEM',
          providerAccountId: 'bot_account',
        },
      });

      // Create characters with different genders
      await db.character.create({
        data: {
          userId: BOT_USER_ID,
          firstName: 'Maria',
          lastName: 'Silva',
          gender: 'FEMALE',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
      });

      await db.character.create({
        data: {
          userId: BOT_USER_ID,
          firstName: 'Joao',
          lastName: 'Santos',
          gender: 'MALE',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date('2024-01-01T11:00:00Z'),
        },
      });

      await db.character.create({
        data: {
          userId: BOT_USER_ID,
          firstName: 'Ana',
          lastName: 'Costa',
          gender: 'FEMALE',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date('2024-01-01T12:00:00Z'),
        },
      });

      const femaleResult = await recentCharactersService.getRecentCharacters(CharacterGender.FEMALE);

      expect(femaleResult.firstNames).toEqual(['Ana', 'Maria']);
      expect(femaleResult.lastNames).toEqual(['Costa', 'Silva']);

      const maleResult = await recentCharactersService.getRecentCharacters(CharacterGender.MALE);

      expect(maleResult.firstNames).toEqual(['Joao']);
      expect(maleResult.lastNames).toEqual(['Santos']);
    });

    it('should respect limit parameter', async () => {
      const db = getTestDb();

      // Create bot user
      await db.user.create({
        data: {
          id: BOT_USER_ID,
          email: 'bot@charhub.ai',
          displayName: 'AI Bot',
          avatarUrl: 'https://example.com/bot.jpg',
          provider: 'SYSTEM',
          providerAccountId: 'bot_account',
        },
      });

      // Create 10 characters
      for (let i = 0; i < 10; i++) {
        await db.character.create({
          data: {
            userId: BOT_USER_ID,
            firstName: `Character${i}`,
            lastName: `Last${i}`,
            gender: 'FEMALE',
            isSystemCharacter: false,
            ageRating: 'L',
            createdAt: new Date(`2024-01-01T${10 + i}:00:00Z`),
          },
        });
      }

      const result = await recentCharactersService.getRecentCharacters(undefined, 5);

      expect(result.firstNames).toHaveLength(5);
      expect(result.lastNames).toHaveLength(5);
      expect(result.firstNames).toEqual([
        'Character9',
        'Character8',
        'Character7',
        'Character6',
        'Character5',
      ]);
    });

    it('should exclude non-bot user characters', async () => {
      const db = getTestDb();

      // Create bot user
      await db.user.create({
        data: {
          id: BOT_USER_ID,
          email: 'bot@charhub.ai',
          displayName: 'AI Bot',
          avatarUrl: 'https://example.com/bot.jpg',
          provider: 'SYSTEM',
          providerAccountId: 'bot_account',
        },
      });

      // Create regular user
      const regularUser = await db.user.create({
        data: {
          email: 'user@example.com',
          displayName: 'Regular User',
          avatarUrl: 'https://example.com/user.jpg',
          provider: 'SYSTEM',
          providerAccountId: 'user_account',
        },
      });

      // Create bot character
      await db.character.create({
        data: {
          userId: BOT_USER_ID,
          firstName: 'BotCharacter',
          lastName: 'BotLast',
          gender: 'FEMALE',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
      });

      // Create regular user character
      await db.character.create({
        data: {
          userId: regularUser.id,
          firstName: 'UserCharacter',
          lastName: 'UserLast',
          gender: 'MALE',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date('2024-01-01T11:00:00Z'),
        },
      });

      const result = await recentCharactersService.getRecentCharacters();

      expect(result.firstNames).toEqual(['BotCharacter']);
      expect(result.firstNames).not.toContain('UserCharacter');
    });

    it('should exclude system characters', async () => {
      const db = getTestDb();

      // Create bot user
      await db.user.create({
        data: {
          id: BOT_USER_ID,
          email: 'bot@charhub.ai',
          displayName: 'AI Bot',
          avatarUrl: 'https://example.com/bot.jpg',
          provider: 'SYSTEM',
          providerAccountId: 'bot_account',
        },
      });

      // Create system character
      await db.character.create({
        data: {
          userId: BOT_USER_ID,
          firstName: 'SystemChar',
          lastName: 'System',
          gender: 'FEMALE',
          isSystemCharacter: true,
          ageRating: 'L',
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
      });

      // Create regular character
      await db.character.create({
        data: {
          userId: BOT_USER_ID,
          firstName: 'RegularChar',
          lastName: 'Regular',
          gender: 'MALE',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date('2024-01-01T11:00:00Z'),
        },
      });

      const result = await recentCharactersService.getRecentCharacters();

      expect(result.firstNames).toEqual(['RegularChar']);
      expect(result.firstNames).not.toContain('SystemChar');
    });

    it('should handle null last names correctly', async () => {
      const db = getTestDb();

      // Create bot user
      await db.user.create({
        data: {
          id: BOT_USER_ID,
          email: 'bot@charhub.ai',
          displayName: 'AI Bot',
          avatarUrl: 'https://example.com/bot.jpg',
          provider: 'SYSTEM',
          providerAccountId: 'bot_account',
        },
      });

      // Create character with null lastName
      await db.character.create({
        data: {
          userId: BOT_USER_ID,
          firstName: 'NoLast',
          lastName: null,
          gender: 'MALE',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
      });

      // Create character with lastName
      await db.character.create({
        data: {
          userId: BOT_USER_ID,
          firstName: 'HasLast',
          lastName: 'Silva',
          gender: 'FEMALE',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date('2024-01-01T11:00:00Z'),
        },
      });

      const result = await recentCharactersService.getRecentCharacters();

      expect(result.firstNames).toEqual(['HasLast', 'NoLast']);
      expect(result.lastNames).toEqual(['Silva']); // null lastName filtered out
    });

    it('should return empty results on database error', async () => {
      // Mock prisma.findMany to throw error
      const db = getTestDb();
      jest.spyOn(db.character, 'findMany').mockRejectedValueOnce(new Error('Database error'));

      const result = await recentCharactersService.getRecentCharacters();

      expect(result.firstNames).toEqual([]);
      expect(result.lastNames).toEqual([]);
    });
  });

  describe('getRecentCharactersFull', () => {
    it('should return full character objects', async () => {
      const db = getTestDb();

      // Create bot user
      await db.user.create({
        data: {
          id: BOT_USER_ID,
          email: 'bot@charhub.ai',
          displayName: 'AI Bot',
          avatarUrl: 'https://example.com/bot.jpg',
          provider: 'SYSTEM',
          providerAccountId: 'bot_account',
        },
      });

      // Create character
      await db.character.create({
        data: {
          userId: BOT_USER_ID,
          firstName: 'TestChar',
          lastName: 'TestLast',
          gender: 'FEMALE',
          age: 25,
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
      });

      const result = await recentCharactersService.getRecentCharactersFull();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: expect.any(String),
        firstName: 'TestChar',
        lastName: 'TestLast',
        gender: 'FEMALE',
        age: 25,
      });
      // species may be null or a string - don't assert specific value
    });

    it('should return empty array on database error', async () => {
      // Mock prisma.findMany to throw error
      const db = getTestDb();
      jest.spyOn(db.character, 'findMany').mockRejectedValueOnce(new Error('Database error'));

      const result = await recentCharactersService.getRecentCharactersFull();

      expect(result).toEqual([]);
    });
  });

  describe('getNameVarietyScore', () => {
    it('should return 1.0 for no characters', async () => {
      const score = await recentCharactersService.getNameVarietyScore();

      expect(score).toBe(1.0);
    });

    it('should return 1.0 for all unique names', async () => {
      const db = getTestDb();

      // Create bot user
      await db.user.create({
        data: {
          id: BOT_USER_ID,
          email: 'bot@charhub.ai',
          displayName: 'AI Bot',
          avatarUrl: 'https://example.com/bot.jpg',
          provider: 'SYSTEM',
          providerAccountId: 'bot_account',
        },
      });

      // Create characters with all unique names
      await db.character.create({
        data: {
          userId: BOT_USER_ID,
          firstName: 'Character1',
          lastName: 'Last1',
          gender: 'FEMALE',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
      });

      await db.character.create({
        data: {
          userId: BOT_USER_ID,
          firstName: 'Character2',
          lastName: 'Last2',
          gender: 'MALE',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date('2024-01-01T11:00:00Z'),
        },
      });

      await db.character.create({
        data: {
          userId: BOT_USER_ID,
          firstName: 'Character3',
          lastName: 'Last3',
          gender: 'FEMALE',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date('2024-01-01T12:00:00Z'),
        },
      });

      const score = await recentCharactersService.getNameVarietyScore();

      expect(score).toBe(1.0);
    });

    it('should return lower score for duplicate names', async () => {
      const db = getTestDb();

      // Create bot user
      await db.user.create({
        data: {
          id: BOT_USER_ID,
          email: 'bot@charhub.ai',
          displayName: 'AI Bot',
          avatarUrl: 'https://example.com/bot.jpg',
          provider: 'SYSTEM',
          providerAccountId: 'bot_account',
        },
      });

      // Create characters with duplicate first names
      await db.character.create({
        data: {
          userId: BOT_USER_ID,
          firstName: 'Maria',
          lastName: 'Silva',
          gender: 'FEMALE',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
      });

      await db.character.create({
        data: {
          userId: BOT_USER_ID,
          firstName: 'Maria',
          lastName: 'Santos',
          gender: 'FEMALE',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date('2024-01-01T11:00:00Z'),
        },
      });

      await db.character.create({
        data: {
          userId: BOT_USER_ID,
          firstName: 'Joao',
          lastName: 'Costa',
          gender: 'MALE',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date('2024-01-01T12:00:00Z'),
        },
      });

      const score = await recentCharactersService.getNameVarietyScore();

      // 2 unique first names out of 3 = 0.666...
      // 3 unique last names out of 3 = 1.0
      // Average = (0.666... + 1.0) / 2 = 0.833...
      expect(score).toBeGreaterThan(0.8);
      expect(score).toBeLessThan(0.9);
    });

    it('should return 0.0 on database error', async () => {
      // Mock prisma.findMany to throw error
      const { prisma } = require('../../config/database');
      jest.spyOn(prisma.character, 'findMany').mockRejectedValue(new Error('Database error'));

      const score = await recentCharactersService.getNameVarietyScore();

      expect(score).toBe(0.0);

      // Restore mock
      jest.restoreAllMocks();
    });
  });

  describe('Edge Cases', () => {
    it('should handle limit larger than available characters', async () => {
      const db = getTestDb();

      // Create bot user
      await db.user.create({
        data: {
          id: BOT_USER_ID,
          email: 'bot@charhub.ai',
          displayName: 'AI Bot',
          avatarUrl: 'https://example.com/bot.jpg',
          provider: 'SYSTEM',
          providerAccountId: 'bot_account',
        },
      });

      // Create only 2 characters
      await db.character.create({
        data: {
          userId: BOT_USER_ID,
          firstName: 'Character1',
          lastName: 'Last1',
          gender: 'FEMALE',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
      });

      await db.character.create({
        data: {
          userId: BOT_USER_ID,
          firstName: 'Character2',
          lastName: 'Last2',
          gender: 'MALE',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date('2024-01-01T11:00:00Z'),
        },
      });

      const result = await recentCharactersService.getRecentCharacters(undefined, 100);

      expect(result.firstNames).toHaveLength(2);
    });

    it('should handle limit of zero', async () => {
      const result = await recentCharactersService.getRecentCharacters(undefined, 0);

      expect(result.firstNames).toEqual([]);
      expect(result.lastNames).toEqual([]);
    });
  });
});
