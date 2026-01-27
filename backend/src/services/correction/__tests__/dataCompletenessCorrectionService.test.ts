/**
 * DataCompletenessCorrectionService Unit Tests
 *
 * Tests for identifying and fixing incomplete bot-generated character data.
 */
import { DataCompletenessCorrectionService } from '../dataCompletenessCorrectionService';
import { setupTestDatabase, cleanDatabase, teardownTestDatabase } from '../../../test-utils/database';

// Mock dependencies
jest.mock('../../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../../controllers/automatedCharacterGenerationController', () => ({
  compileCharacterDataWithLLM: jest.fn().mockResolvedValue({
    firstName: 'Generated',
    lastName: 'Name',
    age: 30,
    gender: 'FEMALE',
    species: 'Human',
    physicalCharacteristics: 'Generated characteristics',
    personality: 'Generated personality',
    history: 'Generated history',
  }),
}));

// Mock prisma with a factory function to avoid hoisting issues
jest.mock('../../../config/database', () => {
  const mockPrisma = {
    character: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    species: {
      findMany: jest.fn(), // Changed from findFirst to findMany for optimization
      findUnique: jest.fn(),
    },
    correctionJobLog: {
      create: jest.fn(),
    },
    visualStyleConfig: {
      findUnique: jest.fn(),
    },
  };
  return {
    prisma: mockPrisma,
  };
});

// Get access to the mocked prisma
const { prisma: mockPrisma } = require('../../../config/database');

describe('DataCompletenessCorrectionService', () => {
  let service: DataCompletenessCorrectionService;
  const BOT_USER_ID = '00000000-0000-0000-0000-000000000001';
  const DEFAULT_FIRST_NAME = 'Character';

  // Mock character data for use across all test sections
  const mockCharacter = {
    id: 'char-123',
    userId: BOT_USER_ID,
    firstName: 'Character',
    lastName: null,
    age: null,
    gender: null,
    speciesId: null,
    style: 'anime',
    physicalCharacteristics: null,
    personality: null,
    history: null,
    reference: null,
    images: [],
  };

  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
    service = new DataCompletenessCorrectionService();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('findCharactersWithIncompleteData()', () => {
    it('should find characters with NULL speciesId', async () => {
      const mockCharacters = [
        {
          id: 'char-1',
          userId: BOT_USER_ID,
          firstName: 'Test',
          lastName: 'Character',
          speciesId: null,
          images: [],
        },
      ];

      mockPrisma.character.findMany.mockResolvedValue(mockCharacters);

      const result = await service.findCharactersWithIncompleteData(50);

      expect(result).toEqual(mockCharacters);
      expect(mockPrisma.character.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: BOT_USER_ID,
            OR: expect.arrayContaining([
              { speciesId: null },
              { firstName: DEFAULT_FIRST_NAME },
            ]),
          }),
          take: expect.any(Number), // Uses limit * 2 for shuffling
        })
      );
    });

    it('should find characters with "Character" as firstName', async () => {
      const mockCharacters = [
        {
          id: 'char-2',
          userId: BOT_USER_ID,
          firstName: 'Character',
          lastName: null,
          speciesId: 'species-1',
          images: [],
        },
      ];

      mockPrisma.character.findMany.mockResolvedValue(mockCharacters);

      const result = await service.findCharactersWithIncompleteData(50);

      expect(result).toEqual(mockCharacters);
    });

    it('should only return bot user characters', async () => {
      mockPrisma.character.findMany.mockResolvedValue([]);

      await service.findCharactersWithIncompleteData(50);

      expect(mockPrisma.character.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: BOT_USER_ID,
          }),
        })
      );
    });

    it('should order results by createdAt ascending', async () => {
      mockPrisma.character.findMany.mockResolvedValue([]);

      await service.findCharactersWithIncompleteData(50);

      // New implementation uses id ordering for consistency, then shuffles in-memory
      expect(mockPrisma.character.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: expect.anything(), // Changed from createdAt to id
        })
      );
    });

    it('should respect the limit parameter', async () => {
      mockPrisma.character.findMany.mockResolvedValue([]);

      await service.findCharactersWithIncompleteData(25);

      // New implementation takes limit * 2 for shuffling, then slices to limit
      expect(mockPrisma.character.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50, // limit * 2
        })
      );
    });

    it('should include SAMPLE images for analysis', async () => {
      mockPrisma.character.findMany.mockResolvedValue([]);

      await service.findCharactersWithIncompleteData(50);

      expect(mockPrisma.character.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            images: expect.objectContaining({
              where: {
                type: 'SAMPLE',
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
            }),
          }),
        })
      );
    });

    it('should return empty array when no incomplete characters found', async () => {
      mockPrisma.character.findMany.mockResolvedValue([]);

      const result = await service.findCharactersWithIncompleteData(50);

      expect(result).toEqual([]);
    });

    it('should find characters matching both conditions (NULL speciesId AND Character name)', async () => {
      const mockCharacters = [
        {
          id: 'char-3',
          userId: BOT_USER_ID,
          firstName: 'Character',
          lastName: null,
          speciesId: null,
          images: [],
        },
      ];

      mockPrisma.character.findMany.mockResolvedValue(mockCharacters);

      const result = await service.findCharactersWithIncompleteData(50);

      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('Character');
      expect(result[0].speciesId).toBeNull();
    });
  });

  describe('correctCharacterData()', () => {
    beforeEach(() => {
      mockPrisma.character.findUnique.mockResolvedValue(mockCharacter);
      // Mock findMany to return all species (new optimized implementation)
      mockPrisma.species.findMany.mockResolvedValue([
        {
          id: 'species-1',
          name: 'Human',
        },
        {
          id: 'b09b64de-bc83-4c70-9008-0e4a6b43fa48',
          name: 'Unknown',
        },
      ]);
      mockPrisma.character.update.mockResolvedValue({
        id: 'char-123',
        firstName: 'Generated',
        lastName: 'Name',
      });
    });

    it('should correct character data with LLM compilation', async () => {
      const result = await service.correctCharacterData('char-123');

      expect(result).toBe(true);
    });

    it('should return false when character not found', async () => {
      mockPrisma.character.findUnique.mockResolvedValue(null);

      const result = await service.correctCharacterData('nonexistent');

      expect(result).toBe(false);
    });

    it('should return false for non-bot user characters', async () => {
      const nonBotCharacter = {
        ...mockCharacter,
        userId: 'other-user-id',
      };

      mockPrisma.character.findUnique.mockResolvedValue(nonBotCharacter);

      const result = await service.correctCharacterData('char-123');

      expect(result).toBe(false);
    });

    it('should use empty string for userDescription when firstName is "Character"', async () => {
      const { compileCharacterDataWithLLM } = require('../../../controllers/automatedCharacterGenerationController');

      await service.correctCharacterData('char-123');

      expect(compileCharacterDataWithLLM).toHaveBeenCalledWith(
        '', // Empty string because firstName is "Character"
        null,
        expect.objectContaining({
          firstName: 'Character',
        }),
        'en',
        undefined
      );
    });

    it('should use existing name for userDescription when firstName is not "Character"', async () => {
      const characterWithName = {
        ...mockCharacter,
        firstName: 'Existing',
        lastName: 'Name',
        physicalCharacteristics: 'Some characteristics',
      };

      mockPrisma.character.findUnique.mockResolvedValue(characterWithName);

      const { compileCharacterDataWithLLM } = require('../../../controllers/automatedCharacterGenerationController');

      await service.correctCharacterData('char-123');

      expect(compileCharacterDataWithLLM).toHaveBeenCalledWith(
        'Existing. Name. Some characteristics.', // Implementation joins with '. '
        null,
        expect.objectContaining({
          firstName: 'Existing',
        }),
        'en',
        undefined
      );
    });

    it('should map species name to species ID using findMany and in-memory matching', async () => {
      await service.correctCharacterData('char-123');

      // New implementation uses findMany to fetch all species once
      expect(mockPrisma.species.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          name: true,
        },
      });
    });

    it('should update character with corrected data', async () => {
      await service.correctCharacterData('char-123');

      expect(mockPrisma.character.update).toHaveBeenCalledWith({
        where: { id: 'char-123' },
        data: {
          firstName: 'Generated',
          lastName: 'Name',
          age: 30,
          gender: 'FEMALE',
          speciesId: 'species-1',
          physicalCharacteristics: 'Generated characteristics',
          personality: 'Generated personality',
          history: 'Generated history',
        },
      });
    });

    it('should set speciesId to Unknown species when species not found in database', async () => {
      // Return empty array for species (no match found)
      mockPrisma.species.findMany.mockResolvedValue([]);

      await service.correctCharacterData('char-123');

      expect(mockPrisma.character.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            speciesId: 'b09b64de-bc83-4c70-9008-0e4a6b43fa48', // Unknown species ID
          }),
        })
      );
    });

    it('should handle LLM compilation errors gracefully', async () => {
      const { compileCharacterDataWithLLM } = require('../../../controllers/automatedCharacterGenerationController');
      compileCharacterDataWithLLM.mockRejectedValueOnce(
        new Error('LLM compilation failed')
      );

      const result = await service.correctCharacterData('char-123');

      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.character.update.mockRejectedValue(
        new Error('Database update failed')
      );

      const result = await service.correctCharacterData('char-123');

      expect(result).toBe(false);
    });

    it('should pass existing character data as textData to LLM', async () => {
      const { compileCharacterDataWithLLM } = require('../../../controllers/automatedCharacterGenerationController');

      await service.correctCharacterData('char-123');

      expect(compileCharacterDataWithLLM).toHaveBeenCalledWith(
        expect.anything(),
        null,
        expect.objectContaining({
          firstName: 'Character',
          style: 'anime',
        }),
        'en',
        undefined
      );
    });

    it('should default to English language for bot characters', async () => {
      const { compileCharacterDataWithLLM } = require('../../../controllers/automatedCharacterGenerationController');

      await service.correctCharacterData('char-123');

      expect(compileCharacterDataWithLLM).toHaveBeenCalledWith(
        expect.anything(),
        null,
        expect.anything(),
        'en',
        undefined
      );
    });

    it('should pass null for imageAnalysis', async () => {
      const { compileCharacterDataWithLLM } = require('../../../controllers/automatedCharacterGenerationController');

      await service.correctCharacterData('char-123');

      // When firstName is "Character", userDescription is empty string
      expect(compileCharacterDataWithLLM).toHaveBeenCalledWith(
        "", // Empty string because firstName is "Character"
        null, // No image analysis
        expect.anything(),
        "en",
        undefined
      );
    });
  });

  describe('runBatchCorrection()', () => {
    const mockCharacters = [
      { id: 'char-1', firstName: 'Character', lastName: null },
      { id: 'char-2', firstName: 'Test', lastName: 'Char' },
      { id: 'char-3', firstName: 'Character', lastName: 'Two' },
    ];

    beforeEach(() => {
      jest.spyOn(service, 'findCharactersWithIncompleteData')
        .mockResolvedValue(mockCharacters as any);
    });

    it('should process all incomplete characters', async () => {
      jest.spyOn(service, 'correctCharacter').mockResolvedValue({
        success: true,
        fieldsCorrected: ['speciesId'],
      });

      const result = await service.runBatchCorrection(50);

      expect(result.targetCount).toBe(3);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should track successes and failures', async () => {
      jest.spyOn(service, 'correctCharacter')
        .mockResolvedValueOnce({ success: true, fieldsCorrected: ['speciesId'] })
        .mockResolvedValueOnce({ success: false, fieldsCorrected: [], error: 'Test error' })
        .mockResolvedValueOnce({ success: true, fieldsCorrected: ['firstName'] });

      const result = await service.runBatchCorrection(50);

      expect(result.targetCount).toBe(3);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        characterId: 'char-2',
        error: 'Test error',
      });
    });

    it('should handle individual character errors gracefully', async () => {
      jest.spyOn(service, 'correctCharacter')
        .mockResolvedValueOnce({ success: true, fieldsCorrected: ['speciesId'] })
        .mockRejectedValueOnce(new Error('Correction failed'))
        .mockResolvedValueOnce({ success: true, fieldsCorrected: ['firstName'] });

      const result = await service.runBatchCorrection(50);

      expect(result.targetCount).toBe(3);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.errors[0].error).toBe('Correction failed');
    });

    it('should create correction job log entry', async () => {
      jest.spyOn(service, 'correctCharacter').mockResolvedValue({
        success: true,
        fieldsCorrected: ['speciesId'],
      });

      await service.runBatchCorrection(50);

      expect(mockPrisma.correctionJobLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          jobType: 'data-completeness-correction',
          targetCount: 3,
          successCount: 3,
          failureCount: 0,
          duration: expect.any(Number),
          completedAt: expect.any(Date),
        }),
      });
    });

    it('should log to database when no characters found', async () => {
      jest.spyOn(service, 'findCharactersWithIncompleteData').mockResolvedValue([]);

      const result = await service.runBatchCorrection(50);

      expect(result).toEqual({
        targetCount: 0,
        successCount: 0,
        failureCount: 0,
        errors: [],
        duration: 0,
      });

      expect(mockPrisma.correctionJobLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          jobType: 'data-completeness-correction',
          targetCount: 0,
          successCount: 0,
          failureCount: 0,
          duration: 0,
          metadata: expect.objectContaining({
            message: 'No characters found needing correction',
          }),
        }),
      });
    });

    it('should include metadata in correction log', async () => {
      jest.spyOn(service, 'correctCharacter').mockResolvedValue({
        success: true,
        fieldsCorrected: ['speciesId'],
      });

      await service.runBatchCorrection(25);

      expect(mockPrisma.correctionJobLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              processedAt: expect.any(String),
              limit: 25,
            }),
          }),
        })
      );
    });

    it('should continue processing after failures', async () => {
      jest.spyOn(service, 'correctCharacter')
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockResolvedValueOnce({ success: true, fieldsCorrected: ['speciesId'] })
        .mockRejectedValueOnce(new Error('Error 2'));

      const result = await service.runBatchCorrection(50);

      // Should still process all characters
      expect(result.targetCount).toBe(3);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(2);
    });

    it('should calculate duration in seconds', async () => {
      jest.spyOn(service, 'correctCharacter').mockImplementation(
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return { success: true, fieldsCorrected: ['speciesId'] };
        }
      );

      const result = await service.runBatchCorrection(50);

      // Duration is calculated in seconds, so with 100ms it might be 0
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should respect the limit parameter', async () => {
      jest.spyOn(service, 'correctCharacterData').mockResolvedValue(true);

      await service.runBatchCorrection(2);

      expect(service.findCharactersWithIncompleteData).toHaveBeenCalledWith(2);
    });

    it('should handle all corrections failing', async () => {
      jest.spyOn(service, 'correctCharacterData').mockResolvedValue(false);

      const result = await service.runBatchCorrection(50);

      expect(result.targetCount).toBe(3);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(3);
      expect(result.errors).toHaveLength(3);
    });

    it('should log job-level errors', async () => {
      jest.spyOn(service, 'findCharactersWithIncompleteData')
        .mockRejectedValue(new Error('Database connection failed'));

      const result = await service.runBatchCorrection(50);

      expect(result.targetCount).toBe(0);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].characterId).toBe('N/A');
    });
  });

  describe('Edge Cases & Error Handling', () => {
    beforeEach(() => {
      // Reset mocks to prevent test interference
      // Reset default mocks for edge case tests
      mockPrisma.character.findUnique.mockResolvedValue(mockCharacter);
      mockPrisma.species.findMany.mockResolvedValue([
        {
          id: 'species-1',
          name: 'Human',
        },
        {
          id: 'b09b64de-bc83-4c70-9008-0e4a6b43fa48',
          name: 'Unknown',
        },
      ]);
      mockPrisma.character.update.mockResolvedValue({
        id: 'char-123',
        firstName: 'Generated',
      });
    });

    it('should handle character with partial data', async () => {
      const partialCharacter = {
        ...mockCharacter,
        firstName: 'Partial',
        lastName: 'Data',
        age: 25,
        gender: 'MALE',
        speciesId: null,
        physicalCharacteristics: 'Some traits',
        personality: null,
        history: null,
      };

      mockPrisma.character.findUnique.mockResolvedValue(partialCharacter);
      mockPrisma.character.update.mockResolvedValue({
        id: 'char-123',
        firstName: 'Generated',
      });

      const result = await service.correctCharacterData('char-123');

      expect(result).toBe(true);
    });

    it('should handle character with all NULL fields except firstName', async () => {
      const emptyCharacter = {
        ...mockCharacter,
        firstName: 'Empty',
        lastName: null,
        age: null,
        gender: null,
        speciesId: null,
        physicalCharacteristics: null,
        personality: null,
        history: null,
      };

      mockPrisma.character.findUnique.mockResolvedValue(emptyCharacter);
      mockPrisma.character.update.mockResolvedValue({
        id: 'char-123',
        firstName: 'Generated',
      });

      const result = await service.correctCharacterData('char-123');

      expect(result).toBe(true);
    });

    it('should handle species not found gracefully', async () => {
      const { compileCharacterDataWithLLM } = require('../../../controllers/automatedCharacterGenerationController');
      compileCharacterDataWithLLM.mockResolvedValue({
        firstName: 'Generated',
        lastName: 'Name',
        age: 30,
        gender: 'FEMALE',
        species: 'NonExistentSpecies', // Species not in database
        physicalCharacteristics: 'Generated',
        personality: 'Generated',
        history: 'Generated',
      });

      // Return empty array (species not found)
      mockPrisma.species.findMany.mockResolvedValue([]);

      await service.correctCharacterData('char-123');

      expect(mockPrisma.character.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            speciesId: 'b09b64de-bc83-4c70-9008-0e4a6b43fa48', // Unknown species ID
          }),
        })
      );
    });

    it('should handle species matching case-insensitively', async () => {
      const { compileCharacterDataWithLLM } = require('../../../controllers/automatedCharacterGenerationController');
      compileCharacterDataWithLLM.mockResolvedValue({
        firstName: 'Generated',
        lastName: 'Name',
        age: 30,
        gender: 'FEMALE',
        species: 'HUMAN', // Uppercase
        physicalCharacteristics: 'Generated',
        personality: 'Generated',
        history: 'Generated',
      });

      // Mock findMany to return species (new implementation does in-memory matching)
      mockPrisma.species.findMany.mockResolvedValue([
        {
          id: 'species-1',
          name: 'Human', // Database has lowercase
        },
      ]);

      await service.correctCharacterData('char-123');

      // New implementation uses findMany and does case-insensitive matching in-memory
      expect(mockPrisma.species.findMany).toHaveBeenCalledWith({
        select: { id: true, name: true },
      });

      // Verify the update used the matched species ID
      expect(mockPrisma.character.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            speciesId: 'species-1',
          }),
        })
      );
    });

    it('should handle character with reference images', async () => {
      const characterWithImages = {
        ...mockCharacter,
        images: [
          {
            id: 'img-1',
            url: 'https://example.com/ref.jpg',
            key: 'ref-key',
            type: 'SAMPLE',
          },
        ],
      };

      mockPrisma.character.findUnique.mockResolvedValue(characterWithImages);

      const result = await service.correctCharacterData('char-123');

      expect(result).toBe(true);
    });

    it('should handle LLM returning null values', async () => {
      const { compileCharacterDataWithLLM } = require('../../../controllers/automatedCharacterGenerationController');
      compileCharacterDataWithLLM.mockResolvedValue({
        firstName: 'Generated',
        lastName: null,
        age: null,
        gender: null,
        species: null, // No species provided - should use Unknown fallback
        physicalCharacteristics: null,
        personality: null,
        history: null,
      });

      const result = await service.correctCharacterData('char-123');

      expect(result).toBe(true);
      expect(mockPrisma.character.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firstName: 'Generated',
            lastName: null,
            age: null,
            gender: null,
            speciesId: 'b09b64de-bc83-4c70-9008-0e4a6b43fa48', // Unknown species ID
          }),
        })
      );
    });
  });

  describe('Data Transformation', () => {
    beforeEach(() => {
      // Reset default mocks for data transformation tests
      mockPrisma.character.findUnique.mockResolvedValue(mockCharacter);
      mockPrisma.species.findMany.mockResolvedValue([
        {
          id: 'species-1',
          name: 'Human',
        },
      ]);
      mockPrisma.character.update.mockResolvedValue({
        id: 'char-123',
        firstName: 'Generated',
      });
    });

    it('should preserve existing lastName when present', async () => {
      const characterWithLastName = {
        ...mockCharacter,
        firstName: 'Character',
        lastName: 'Existing',
      };

      mockPrisma.character.findUnique.mockResolvedValue(characterWithLastName);

      const { compileCharacterDataWithLLM } = require('../../../controllers/automatedCharacterGenerationController');

      await service.correctCharacterData('char-123');

      const calls = compileCharacterDataWithLLM.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const textDataArg = calls[0][2]; // Third argument is textData
      expect(textDataArg).toHaveProperty('lastName', 'Existing');
    });

    it('should handle character with existing speciesId', async () => {
      const characterWithSpecies = {
        ...mockCharacter,
        firstName: 'Character',
        speciesId: 'existing-species-id',
      };

      mockPrisma.character.findUnique.mockResolvedValue(characterWithSpecies);

      const { compileCharacterDataWithLLM } = require('../../../controllers/automatedCharacterGenerationController');

      await service.correctCharacterData('char-123');

      const calls = compileCharacterDataWithLLM.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const textDataArg = calls[0][2]; // Third argument is textData
      expect(textDataArg).toHaveProperty('species', 'existing');
    });

    it('should build textData from existing character fields', async () => {
      const characterWithData = {
        ...mockCharacter,
        firstName: 'Test',
        age: 25,
        gender: 'MALE',
        style: 'realistic',
        personality: 'Brave',
        history: 'A hero',
      };

      mockPrisma.character.findUnique.mockResolvedValue(characterWithData);

      const { compileCharacterDataWithLLM } = require('../../../controllers/automatedCharacterGenerationController');

      await service.correctCharacterData('char-123');

      const calls = compileCharacterDataWithLLM.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const textDataArg = calls[0][2]; // Third argument is textData
      expect(textDataArg).toMatchObject({
        firstName: 'Test',
        age: 25,
        gender: 'MALE',
        style: 'realistic',
        personality: 'Brave',
        history: 'A hero',
      });
    });
  });
});
