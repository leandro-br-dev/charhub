/**
 * Automated Character Generation Integration Tests
 * Tests for FEATURE-012: Name diversity & ethnicity classification
 *
 * This test suite validates the full character generation flow
 * with name diversity tracking and ethnicity-based name generation.
 */
import { setupTestDatabase, cleanDatabase, teardownTestDatabase } from '../../test-utils/database';
import { createTestUser } from '../../test-utils/factories';
import { getTestDb } from '../../test-utils/database';
import { nameFrequencyService } from '../../services/nameFrequencyService';
import { recentCharactersService } from '../../services/recentCharactersService';
import { analyzeCharacterImage } from '../../agents/characterImageAnalysisAgent';
import { buildNameDiversityContext } from '../../controllers/automatedCharacterGenerationController';
import type { CharacterImageAnalysisResult } from '../../agents/characterImageAnalysisAgent';

// Mock external dependencies
jest.mock('../../services/llm');
jest.mock('../../services/llm/gemini');
jest.mock('../../services/r2Service');
jest.mock('../../queues/QueueManager');
jest.mock('../../agents/imageClassificationAgent');
jest.mock('../../websocket/characterGenerationHandler');

describe('Automated Character Generation - Name Diversity (FEATURE-012)', () => {
  let testUser: any;

  beforeAll(async () => {
    await setupTestDatabase();

    // Create test user
    testUser = await createTestUser({
      preferredLanguage: 'en',
      birthDate: new Date('1990-01-01'),
    });
  });

  afterAll(async () => {
    await cleanDatabase();
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Clean characters but keep user
    const db = getTestDb();
    await db.character.deleteMany({});
    await db.characterImage.deleteMany({});
  });

  describe('Name Frequency Tracking', () => {
    it('should track name usage in character generation', async () => {
      const db = getTestDb();

      // Create characters with various names
      await db.character.create({
        data: {
          userId: testUser.id,
          firstName: 'Maria',
          lastName: 'Silva',
          gender: 'FEMALE',
          visibility: 'PUBLIC',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date(),
        },
      });

      await db.character.create({
        data: {
          userId: testUser.id,
          firstName: 'Maria',
          lastName: 'Santos',
          gender: 'FEMALE',
          visibility: 'PUBLIC',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date(),
        },
      });

      await db.character.create({
        data: {
          userId: testUser.id,
          firstName: 'Joao',
          lastName: 'Silva',
          gender: 'MALE',
          visibility: 'PUBLIC',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date(),
        },
      });

      // Query name frequency
      const frequency = await nameFrequencyService.getTopNames({ gender: 'FEMALE' });

      expect(frequency.topFirstNames).toHaveLength(1);
      expect(frequency.topFirstNames[0]).toEqual({ name: 'Maria', count: 2 });

      expect(frequency.topLastNames).toHaveLength(2);
      expect(frequency.topLastNames).toContainEqual({ name: 'Silva', count: 1 });
      expect(frequency.topLastNames).toContainEqual({ name: 'Santos', count: 1 });
    });

    it('should filter name frequency by time period', async () => {
      const db = getTestDb();

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40);

      const newDate = new Date();

      // Create old character
      await db.character.create({
        data: {
          userId: testUser.id,
          firstName: 'OldName',
          lastName: 'OldLast',
          gender: 'FEMALE',
          visibility: 'PUBLIC',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: oldDate,
        },
      });

      // Create new character
      await db.character.create({
        data: {
          userId: testUser.id,
          firstName: 'NewName',
          lastName: 'NewLast',
          gender: 'FEMALE',
          visibility: 'PUBLIC',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: newDate,
        },
      });

      // Query with 30 days filter
      const frequency = await nameFrequencyService.getTopNames({ days: 30 });

      expect(frequency.topFirstNames).toHaveLength(1);
      expect(frequency.topFirstNames[0].name).toBe('NewName');
      expect(frequency.topFirstNames[0].name).not.toBe('OldName');
    });

    it('should exclude system and private characters from frequency', async () => {
      const db = getTestDb();

      // Public regular character
      await db.character.create({
        data: {
          userId: testUser.id,
          firstName: 'PublicChar',
          lastName: 'Public',
          gender: 'FEMALE',
          visibility: 'PUBLIC',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date(),
        },
      });

      // Private character
      await db.character.create({
        data: {
          userId: testUser.id,
          firstName: 'PrivateChar',
          lastName: 'Private',
          gender: 'FEMALE',
          visibility: 'PRIVATE',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date(),
        },
      });

      // System character
      await db.character.create({
        data: {
          userId: testUser.id,
          firstName: 'SystemChar',
          lastName: 'System',
          gender: 'FEMALE',
          visibility: 'PUBLIC',
          isSystemCharacter: true,
          ageRating: 'L',
          createdAt: new Date(),
        },
      });

      const frequency = await nameFrequencyService.getTopNames();

      expect(frequency.topFirstNames).toHaveLength(1);
      expect(frequency.topFirstNames[0].name).toBe('PublicChar');
    });
  });

  describe('Recent Characters Tracking', () => {
    const BOT_USER_ID = '00000000-0000-0000-0000-000000000001';

    beforeEach(async () => {
      const db = getTestDb();

      // Create bot user
      await db.user.upsert({
        where: { id: BOT_USER_ID },
        update: {},
        create: {
          id: BOT_USER_ID,
          email: 'bot@charhub.ai',
          displayName: 'AI Bot',
          avatarUrl: 'https://example.com/bot.jpg',
          provider: 'SYSTEM',
          providerAccountId: 'bot_account',
        },
      });
    });

    it('should track recent bot-generated characters', async () => {
      const db = getTestDb();

      // Create bot characters
      await db.character.create({
        data: {
          userId: BOT_USER_ID,
          firstName: 'BotChar1',
          lastName: 'BotLast1',
          gender: 'FEMALE',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
      });

      await db.character.create({
        data: {
          userId: BOT_USER_ID,
          firstName: 'BotChar2',
          lastName: 'BotLast2',
          gender: 'FEMALE',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date('2024-01-01T11:00:00Z'),
        },
      });

      await db.character.create({
        data: {
          userId: BOT_USER_ID,
          firstName: 'BotChar3',
          lastName: 'BotLast3',
          gender: 'FEMALE',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date('2024-01-01T12:00:00Z'),
        },
      });

      const recent = await recentCharactersService.getRecentCharacters('FEMALE', 10);

      expect(recent.firstNames).toEqual(['BotChar3', 'BotChar2', 'BotChar1']);
      expect(recent.lastNames).toEqual(['BotLast3', 'BotLast2', 'BotLast1']);
    });

    it('should filter recent characters by gender', async () => {
      const db = getTestDb();

      // Create female bot characters
      await db.character.create({
        data: {
          userId: BOT_USER_ID,
          firstName: 'FemaleBot',
          lastName: 'Bot',
          gender: 'FEMALE',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
      });

      // Create male bot character
      await db.character.create({
        data: {
          userId: BOT_USER_ID,
          firstName: 'MaleBot',
          lastName: 'Bot',
          gender: 'MALE',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date('2024-01-01T11:00:00Z'),
        },
      });

      const femaleRecent = await recentCharactersService.getRecentCharacters('FEMALE', 10);
      const maleRecent = await recentCharactersService.getRecentCharacters('MALE', 10);

      expect(femaleRecent.firstNames).toContain('FemaleBot');
      expect(femaleRecent.firstNames).not.toContain('MaleBot');

      expect(maleRecent.firstNames).toContain('MaleBot');
      expect(maleRecent.firstNames).not.toContain('FemaleBot');
    });

    it('should exclude non-bot characters from recent list', async () => {
      const db = getTestDb();

      // Create bot character
      await db.character.create({
        data: {
          userId: BOT_USER_ID,
          firstName: 'BotChar',
          lastName: 'Bot',
          gender: 'FEMALE',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
      });

      // Create regular user character
      await db.character.create({
        data: {
          userId: testUser.id,
          firstName: 'UserChar',
          lastName: 'User',
          gender: 'FEMALE',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date('2024-01-01T11:00:00Z'),
        },
      });

      const recent = await recentCharactersService.getRecentCharacters('FEMALE', 10);

      expect(recent.firstNames).toContain('BotChar');
      expect(recent.firstNames).not.toContain('UserChar');
    });
  });

  describe('Ethnicity-Based Name Generation', () => {
    it('should use ethnicity data from image analysis', async () => {
      const mockImageAnalysis = {
        physicalCharacteristics: {
          gender: 'female',
          species: 'human',
          hairColor: 'black',
          eyeColor: 'brown',
          skinTone: 'olive',
        },
        ethnicity: {
          primary: 'Japanese',
          confidence: 'high',
          features: ['East Asian features', 'dark hair', 'olive skin'],
        },
        visualStyle: {
          artStyle: 'anime',
        },
        clothing: {},
        suggestedTraits: {},
        overallDescription: 'A Japanese female character',
      };

      // Mock analyzeCharacterImage
      jest.spyOn(require('../../agents/characterImageAnalysisAgent'), 'analyzeCharacterImage')
        .mockResolvedValue(mockImageAnalysis);

      const analysis = await analyzeCharacterImage('https://example.com/test.jpg');

      expect(analysis.ethnicity).toBeDefined();
      expect(analysis.ethnicity?.primary).toBe('Japanese');
      expect(analysis.ethnicity?.confidence).toBe('high');
    });

    it('should provide ethnicity guidelines for name generation', async () => {
      const mockImageAnalysis: CharacterImageAnalysisResult = {
        physicalCharacteristics: {
          gender: 'male',
          species: 'human',
        },
        ethnicity: {
          primary: 'East Asian',
          confidence: 'medium',
        },
        visualStyle: {},
        clothing: {},
        suggestedTraits: {},
        overallDescription: 'An East Asian male character',
      };

      // Mock services
      jest.spyOn(nameFrequencyService, 'getTopNames').mockResolvedValue({
        topFirstNames: [{ name: 'Wei', count: 5 }],
        topLastNames: [{ name: 'Chen', count: 3 }],
      });

      jest.spyOn(recentCharactersService, 'getRecentCharacters').mockResolvedValue({
        firstNames: ['Min-jun'],
        lastNames: ['Kim'],
      });

      const context = await buildNameDiversityContext(mockImageAnalysis);

      expect(context).toContain('Ethnicity: East Asian');
      expect(context).toContain('OVERUSED NAMES TO AVOID');
      expect(context).toContain('RECENT CHARACTER NAMES TO AVOID');
      expect(context).toContain('DO NOT use any names from the "OVERUSED" list');
      expect(context).toContain('DO NOT use any names from the "RECENT" list');
    });

    it('should handle unknown or low confidence ethnicity', async () => {
      const mockImageAnalysis: CharacterImageAnalysisResult = {
        physicalCharacteristics: {
          gender: 'female',
          species: 'human',
        },
        ethnicity: {
          primary: 'Unknown',
          confidence: 'low',
        },
        visualStyle: {},
        clothing: {},
        suggestedTraits: {},
        overallDescription: 'A character with unknown ethnicity',
      };

      jest.spyOn(nameFrequencyService, 'getTopNames').mockResolvedValue({
        topFirstNames: [],
        topLastNames: [],
      });

      jest.spyOn(recentCharactersService, 'getRecentCharacters').mockResolvedValue({
        firstNames: [],
        lastNames: [],
      });

      const context = await buildNameDiversityContext(mockImageAnalysis);

      // Should still provide context even with unknown ethnicity
      expect(context).toContain('Ethnicity: Unknown');
      expect(context).toContain('Use diverse international names from any culture');
    });

    it('should handle fantasy/non-human species', async () => {
      const mockImageAnalysis: CharacterImageAnalysisResult = {
        physicalCharacteristics: {
          gender: 'female',
          species: 'elf',
        },
        ethnicity: {
          primary: 'Fantasy/Non-Human',
          confidence: 'high',
        },
        visualStyle: {},
        clothing: {},
        suggestedTraits: {},
        overallDescription: 'An elven character',
      };

      jest.spyOn(nameFrequencyService, 'getTopNames').mockResolvedValue({
        topFirstNames: [],
        topLastNames: [],
      });

      jest.spyOn(recentCharactersService, 'getRecentCharacters').mockResolvedValue({
        firstNames: [],
        lastNames: [],
      });

      const context = await buildNameDiversityContext(mockImageAnalysis);

      expect(context).toContain('Species: elf');
      expect(context).toContain('Use fantasy names');
      expect(context).toContain('For fantasy species (Elf, Dwarf, Alien), use fantasy-appropriate names');
    });
  });

  describe('Name Variety Score', () => {
    const BOT_USER_ID = '00000000-0000-0000-0000-000000000001';

    beforeEach(async () => {
      const db = getTestDb();

      // Create bot user
      await db.user.upsert({
        where: { id: BOT_USER_ID },
        update: {},
        create: {
          id: BOT_USER_ID,
          email: 'bot@charhub.ai',
          displayName: 'AI Bot',
          avatarUrl: 'https://example.com/bot.jpg',
          provider: 'SYSTEM',
          providerAccountId: 'bot_account',
        },
      });
    });

    it('should calculate high variety score for diverse names', async () => {
      const db = getTestDb();

      // Create bot characters with unique names
      await db.character.create({
        data: {
          userId: BOT_USER_ID,
          firstName: 'Character1',
          lastName: 'Last1',
          gender: 'FEMALE',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date(),
        },
      });

      await db.character.create({
        data: {
          userId: BOT_USER_ID,
          firstName: 'Character2',
          lastName: 'Last2',
          gender: 'FEMALE',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date(),
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
          createdAt: new Date(),
        },
      });

      const score = await recentCharactersService.getNameVarietyScore('FEMALE', 10);

      expect(score).toBe(1.0); // All unique names
    });

    it('should calculate lower variety score for duplicate names', async () => {
      const db = getTestDb();

      // Create bot characters with duplicate first names
      await db.character.create({
        data: {
          userId: BOT_USER_ID,
          firstName: 'Maria',
          lastName: 'Silva',
          gender: 'FEMALE',
          isSystemCharacter: false,
          ageRating: 'L',
          createdAt: new Date(),
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
          createdAt: new Date(),
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
          createdAt: new Date(),
        },
      });

      const score = await recentCharactersService.getNameVarietyScore('FEMALE', 10);

      expect(score).toBeGreaterThan(0.7);
      expect(score).toBeLessThan(1.0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty frequency data gracefully', async () => {
      const frequency = await nameFrequencyService.getTopNames();

      expect(frequency.topFirstNames).toEqual([]);
      expect(frequency.topLastNames).toEqual([]);
    });

    it('should handle empty recent characters gracefully', async () => {
      const recent = await recentCharactersService.getRecentCharacters('FEMALE', 10);

      expect(recent.firstNames).toEqual([]);
      expect(recent.lastNames).toEqual([]);
    });

    it('should return perfect variety score for no characters', async () => {
      const score = await recentCharactersService.getNameVarietyScore('FEMALE', 10);

      expect(score).toBe(1.0);
    });
  });
});
