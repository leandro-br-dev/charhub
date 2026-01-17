/**
 * AvatarCorrectionService Unit Tests
 *
 * Tests for finding and fixing bot-generated characters that are missing
 * their AVATAR images.
 */
import { AvatarCorrectionService } from '../avatarCorrectionService';
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

jest.mock('../../comfyui/comfyuiService', () => ({
  comfyuiService: {
    applyVisualStyleToPrompt: jest.fn().mockResolvedValue({
      positive: 'enhanced positive prompt',
      negative: 'enhanced negative prompt',
      loras: [],
    }),
    generateAvatar: jest.fn().mockResolvedValue({
      imageBytes: Buffer.from('fake-image-data'),
      metadata: { width: 512, height: 512 },
    }),
  },
}));

jest.mock('../../comfyui/promptAgent', () => ({
  promptAgent: {
    generatePrompts: jest.fn().mockResolvedValue({
      positive: 'test positive prompt',
      negative: 'test negative prompt',
    }),
  },
}));

jest.mock('../../r2Service', () => ({
  r2Service: {
    uploadObject: jest.fn().mockResolvedValue({
      publicUrl: 'https://example.com/uploaded.webp',
      key: 'test-key',
    }),
  },
}));

jest.mock('../../../utils/imageUtils', () => ({
  convertToWebP: jest.fn().mockResolvedValue(Buffer.from('webp-data')),
}));

// Mock prisma with a factory function to avoid hoisting issues
jest.mock('../../../config/database', () => {
  const mockPrisma = {
    character: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    characterImage: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  return {
    prisma: mockPrisma,
    __mockPrisma: mockPrisma, // Export for access in tests
  };
});

// Get access to the mocked prisma
const { prisma: mockPrisma } = require('../../../config/database');

describe('AvatarCorrectionService', () => {
  let service: AvatarCorrectionService;
  const BOT_USER_ID = '00000000-0000-0000-0000-000000000001';

  // Mock character data for use across all test sections
  const mockCharacter = {
    id: 'char-123',
    userId: BOT_USER_ID,
    firstName: 'Test',
    lastName: 'Character',
    gender: 'FEMALE',
    age: 25,
    species: {
      id: 'species-1',
        name: 'Human',
      },
      physicalCharacteristics: 'Blue eyes, brown hair',
      personality: 'Brave and kind',
      style: 'anime',
      mainAttire: {
        description: 'Casual outfit',
      },
      lora: {
        id: 'lora-1',
        name: 'test-lora',
        filepathRelative: 'loras/test.safetensors',
      },
      tags: [
        { id: 'tag-1', name: 'fantasy' },
        { id: 'tag-2', name: 'adventure' },
      ],
      ageRating: 'SAFE',
      contentTags: [],
    };

  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
    service = new AvatarCorrectionService();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('findCharactersWithoutAvatars()', () => {
    it('should find characters without active AVATAR images', async () => {
      const mockCharacters = [
        {
          id: 'char-1',
          userId: BOT_USER_ID,
          firstName: 'Test',
          lastName: null,
          images: [],
        },
      ];

      mockPrisma.character.findMany.mockResolvedValue(mockCharacters);

      const result = await service.findCharactersWithoutAvatars(50);

      expect(result).toEqual(mockCharacters);
      expect(mockPrisma.character.findMany).toHaveBeenCalledWith({
        where: {
          userId: BOT_USER_ID,
          images: {
            none: {
              type: 'AVATAR',
              isActive: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: 50,
        include: {
          lora: true,
          mainAttire: true,
          species: true,
          tags: true,
        },
      });
    });

    it('should only return bot user characters', async () => {
      const mockCharacters = [
        {
          id: 'char-1',
          userId: BOT_USER_ID,
          firstName: 'BotChar',
          images: [],
        },
      ];

      mockPrisma.character.findMany.mockResolvedValue(mockCharacters);

      await service.findCharactersWithoutAvatars(50);

      expect(mockPrisma.character.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: BOT_USER_ID,
          }),
        })
      );
    });

    it('should respect the limit parameter', async () => {
      mockPrisma.character.findMany.mockResolvedValue([]);

      await service.findCharactersWithoutAvatars(25);

      expect(mockPrisma.character.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 25,
        })
      );
    });

    it('should order results by createdAt ascending', async () => {
      mockPrisma.character.findMany.mockResolvedValue([]);

      await service.findCharactersWithoutAvatars(50);

      expect(mockPrisma.character.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            createdAt: 'asc',
          },
        })
      );
    });

    it('should include related data (lora, mainAttire, species, tags)', async () => {
      mockPrisma.character.findMany.mockResolvedValue([]);

      await service.findCharactersWithoutAvatars(50);

      expect(mockPrisma.character.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            lora: true,
            mainAttire: true,
            species: true,
            tags: true,
          },
        })
      );
    });

    it('should return empty array when no characters found', async () => {
      mockPrisma.character.findMany.mockResolvedValue([]);

      const result = await service.findCharactersWithoutAvatars(50);

      expect(result).toEqual([]);
    });
  });

  describe('correctCharacterAvatar()', () => {
    beforeEach(() => {
      // Reset mocks with default successful responses
      mockPrisma.character.findUnique.mockResolvedValue(mockCharacter);
      mockPrisma.characterImage.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation((callback: any) => callback(mockPrisma));
    });

    it('should generate AVATAR image for character', async () => {
      const result = await service.correctCharacterAvatar('char-123');

      expect(result).toBe(true);
    });

    it('should return false when character not found', async () => {
      mockPrisma.character.findUnique.mockResolvedValue(null);

      const result = await service.correctCharacterAvatar('nonexistent');

      expect(result).toBe(false);
    });

    it('should return false for non-bot user characters', async () => {
      const nonBotCharacter = {
        ...mockCharacter,
        userId: 'other-user-id',
      };

      mockPrisma.character.findUnique.mockResolvedValue(nonBotCharacter);

      const result = await service.correctCharacterAvatar('char-123');

      expect(result).toBe(false);
    });

    it('should skip characters that already have active avatar', async () => {
      mockPrisma.characterImage.findFirst.mockResolvedValue({
        id: 'avatar-1',
        url: 'existing-avatar.jpg',
      });

      const result = await service.correctCharacterAvatar('char-123');

      expect(result).toBe(true);
      // Should not call generateAvatar
      const { comfyuiService } = require('../../comfyui/comfyuiService');
      expect(comfyuiService.generateAvatar).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.character.findUnique.mockRejectedValue(
        new Error('Database error')
      );

      const result = await service.correctCharacterAvatar('char-123');

      expect(result).toBe(false);
    });

    it('should generate prompts using promptAgent', async () => {
      await service.correctCharacterAvatar('char-123');

      const { promptAgent } = require('../../comfyui/promptAgent');

      expect(promptAgent.generatePrompts).toHaveBeenCalledWith({
        character: expect.objectContaining({
          name: 'Test Character',
          gender: 'FEMALE',
          age: 25,
          species: 'Human',
        }),
        generation: {
          type: 'AVATAR',
          isNsfw: false,
        },
        userInput: undefined,
        hasReferenceImages: false,
      });
    });

    it('should apply visual style to prompt', async () => {
      await service.correctCharacterAvatar('char-123');

      const { comfyuiService } = require('../../comfyui/comfyuiService');

      expect(comfyuiService.applyVisualStyleToPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          positive: expect.any(String),
          negative: expect.any(String),
        }),
        'anime',
        undefined,
        undefined
      );
    });

    it('should include LoRA if character has one', async () => {
      await service.correctCharacterAvatar('char-123');

      const { comfyuiService } = require('../../comfyui/comfyuiService');

      const callArgs = comfyuiService.generateAvatar.mock.calls[0];
      const promptPayload = callArgs[0];

      expect(promptPayload.loras).toEqual([
        {
          name: 'test-lora',
          filepathRelative: 'loras/test.safetensors',
          strength: 1.0,
        },
      ]);
    });

    it('should detect FURRY content type', async () => {
      const furryCharacter = {
        ...mockCharacter,
        species: {
          id: 'species-2',
          name: 'Furry Wolf',
        },
        tags: [{ id: 'tag-1', name: 'anthro' }],
      };

      mockPrisma.character.findUnique.mockResolvedValue(furryCharacter);

      await service.correctCharacterAvatar('char-123');

      const { comfyuiService } = require('../../comfyui/comfyuiService');

      expect(comfyuiService.generateAvatar).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        'FURRY'
      );
    });

    it('should detect HENTAI content type', async () => {
      const nsfwCharacter = {
        ...mockCharacter,
        tags: [{ id: 'tag-1', name: 'nsfw' }],
      };

      mockPrisma.character.findUnique.mockResolvedValue(nsfwCharacter);

      await service.correctCharacterAvatar('char-123');

      const { comfyuiService } = require('../../comfyui/comfyuiService');

      expect(comfyuiService.generateAvatar).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        'HENTAI'
      );
    });

    it('should upload generated image to R2', async () => {
      await service.correctCharacterAvatar('char-123');

      const { r2Service } = require('../../r2Service');

      expect(r2Service.uploadObject).toHaveBeenCalledWith(
        expect.objectContaining({
          key: expect.stringMatching(/^characters\/char-123\/avatar\/corrected_\d+\.webp$/),
          contentType: 'image/webp',
          cacheControl: 'public, max-age=3600',
        })
      );
    });

    it('should convert image to WebP format', async () => {
      await service.correctCharacterAvatar('char-123');

      const { convertToWebP } = require('../../../utils/imageUtils');

      expect(convertToWebP).toHaveBeenCalledWith(
        Buffer.from('fake-image-data'),
        expect.objectContaining({
          prompt: expect.any(String),
          character: 'Test',
          type: 'avatar',
        })
      );
    });

    it('should create character image record in database', async () => {
      const mockCreate = jest.fn().mockResolvedValue({
        id: 'img-1',
        url: 'https://example.com/uploaded.webp',
      });

      mockPrisma.characterImage.create = mockCreate;

      await service.correctCharacterAvatar('char-123');

      expect(mockPrisma.characterImage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          characterId: 'char-123',
          type: 'AVATAR',
          url: 'https://example.com/uploaded.webp',
          isActive: true,
          contentType: 'image/webp',
        }),
      });
    });

    it('should deactivate existing avatars before creating new one', async () => {
      await service.correctCharacterAvatar('char-123');

      expect(mockPrisma.$transaction).toHaveBeenCalled();

      const transactionCallback = mockPrisma.$transaction.mock.calls[0][0];
      expect(transactionCallback).toBeInstanceOf(Function);
    });

    it('should preserve character ageRating and contentTags', async () => {
      const characterWithRating = {
        ...mockCharacter,
        ageRating: 'MATURE',
        contentTags: ['violence', 'language'],
      };

      mockPrisma.character.findUnique.mockResolvedValue(characterWithRating);

      await service.correctCharacterAvatar('char-123');

      const mockCreate = mockPrisma.characterImage.create as jest.Mock;
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ageRating: 'MATURE',
            contentTags: ['violence', 'language'],
          }),
        })
      );
    });
  });

  describe('runBatchCorrection()', () => {
    const mockCharacters = [
      { id: 'char-1', firstName: 'Character 1' },
      { id: 'char-2', firstName: 'Character 2' },
      { id: 'char-3', firstName: 'Character 3' },
    ];

    beforeEach(() => {
      // Mock findCharactersWithoutAvatars to return test characters
      jest
        .spyOn(service, 'findCharactersWithoutAvatars')
        .mockResolvedValue(mockCharacters as any);
    });

    it('should process all characters without avatars', async () => {
      // Mock all corrections to succeed
      jest.spyOn(service, 'correctCharacterAvatar').mockResolvedValue(true);

      const result = await service.runBatchCorrection(50);

      expect(result.targetCount).toBe(3);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should track successful and failed corrections', async () => {
      // Mock 2 success, 1 failure
      jest.spyOn(service, 'correctCharacterAvatar')
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const result = await service.runBatchCorrection(50);

      expect(result.targetCount).toBe(3);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        characterId: 'char-2',
        error: 'Avatar generation returned false (see logs for details)',
      });
    });

    it('should handle individual character errors gracefully', async () => {
      // Mock one to throw error
      jest.spyOn(service, 'correctCharacterAvatar')
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Generation failed'))
        .mockResolvedValueOnce(true);

      const result = await service.runBatchCorrection(50);

      expect(result.targetCount).toBe(3);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.errors[0].error).toBe('Generation failed');
    });

    it('should return empty result when no characters need correction', async () => {
      jest.spyOn(service, 'findCharactersWithoutAvatars').mockResolvedValue([]);

      const result = await service.runBatchCorrection(50);

      expect(result).toEqual({
        targetCount: 0,
        successCount: 0,
        failureCount: 0,
        errors: [],
        duration: 0,
      });
    });

    it('should log results properly', async () => {
      jest.spyOn(service, 'correctCharacterAvatar').mockResolvedValue(true);

      const result = await service.runBatchCorrection(50);

      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(typeof result.duration).toBe('number');
    });

    it('should process characters sequentially', async () => {
      const processingOrder: string[] = [];

      jest.spyOn(service, 'correctCharacterAvatar').mockImplementation(
        async (id) => {
          processingOrder.push(id);
          await new Promise((resolve) => setTimeout(resolve, 10));
          return true;
        }
      );

      await service.runBatchCorrection(50);

      // Should process in order
      expect(processingOrder).toEqual(['char-1', 'char-2', 'char-3']);
    });

    it('should respect the limit parameter', async () => {
      jest.spyOn(service, 'correctCharacterAvatar').mockResolvedValue(true);

      await service.runBatchCorrection(2);

      expect(service.findCharactersWithoutAvatars).toHaveBeenCalledWith(2);
    });

    it('should handle all failures', async () => {
      jest.spyOn(service, 'correctCharacterAvatar').mockResolvedValue(false);

      const result = await service.runBatchCorrection(50);

      expect(result.targetCount).toBe(3);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(3);
      expect(result.errors).toHaveLength(3);
    });

    it('should continue processing after failures', async () => {
      jest.spyOn(service, 'correctCharacterAvatar')
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Error 2'));

      const result = await service.runBatchCorrection(50);

      // Should still process all characters
      expect(result.targetCount).toBe(3);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(2);
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('should handle character without species', async () => {
      const characterWithoutSpecies = {
        id: 'char-no-species',
        userId: BOT_USER_ID,
        firstName: 'NoSpecies',
        lastName: 'Character',
        species: null,
        tags: [],
        lora: null,
        mainAttire: null,
      };

      mockPrisma.character.findUnique.mockResolvedValue(characterWithoutSpecies);
      mockPrisma.characterImage.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation((cb: any) => cb(mockPrisma));

      const result = await service.correctCharacterAvatar('char-no-species');

      expect(result).toBe(true);
    });

    it('should handle character without LoRA', async () => {
      const characterWithoutLora = {
        ...mockCharacter,
        lora: null,
      };

      mockPrisma.character.findUnique.mockResolvedValue(characterWithoutLora);
      mockPrisma.characterImage.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation((cb: any) => cb(mockPrisma));

      await service.correctCharacterAvatar('char-no-lora');

      const { comfyuiService } = require('../../comfyui/comfyuiService');
      const callArgs = comfyuiService.generateAvatar.mock.calls[0];
      const promptPayload = callArgs[0];

      expect(promptPayload.loras).toBeUndefined();
    });

    it('should handle promptAgent errors', async () => {
      const { promptAgent } = require('../../comfyui/promptAgent');
      promptAgent.generatePrompts.mockRejectedValue(
        new Error('Prompt generation failed')
      );

      const result = await service.correctCharacterAvatar('char-123');

      expect(result).toBe(false);
    });

    it('should handle ComfyUI errors', async () => {
      const { comfyuiService } = require('../../comfyui/comfyuiService');
      comfyuiService.generateAvatar.mockRejectedValue(
        new Error('ComfyUI error')
      );

      const result = await service.correctCharacterAvatar('char-123');

      expect(result).toBe(false);
    });

    it('should handle R2 upload errors', async () => {
      const { r2Service } = require('../../r2Service');
      r2Service.uploadObject.mockRejectedValue(
        new Error('R2 upload failed')
      );

      const result = await service.correctCharacterAvatar('char-123');

      expect(result).toBe(false);
    });

    it('should handle visual style application errors gracefully', async () => {
      const { comfyuiService } = require('../../comfyui/comfyuiService');
      comfyuiService.applyVisualStyleToPrompt.mockRejectedValue(
        new Error('Style application failed')
      );

      // Should still complete, using base prompt
      const result = await service.correctCharacterAvatar('char-123');

      expect(result).toBe(true);
    });

    it('should handle character with no tags', async () => {
      const characterWithoutTags = {
        ...mockCharacter,
        tags: [],
      };

      mockPrisma.character.findUnique.mockResolvedValue(characterWithoutTags);
      mockPrisma.characterImage.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation((cb: any) => cb(mockPrisma));

      const result = await service.correctCharacterAvatar('char-123');

      expect(result).toBe(true);
    });
  });

  describe('Content Type Detection', () => {
    beforeEach(() => {
      // Reset mocks for content type detection tests
      mockPrisma.character.findUnique.mockResolvedValue(mockCharacter);
      mockPrisma.characterImage.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation((cb: any) => cb(mockPrisma));

      // Clear comfyuiService mock calls
      const { comfyuiService } = require('../../comfyui/comfyuiService');
      comfyuiService.generateAvatar.mockClear();
      comfyuiService.applyVisualStyleToPrompt.mockClear();
    });

    it('should detect FURRY from species name', async () => {
      const furryCharacter = {
        ...mockCharacter,
        species: {
          id: 'species-2',
          name: 'Furry Dragon',
        },
        tags: [],
      };

      mockPrisma.character.findUnique.mockResolvedValue(furryCharacter);
      mockPrisma.characterImage.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation((cb: any) => cb(mockPrisma));

      await service.correctCharacterAvatar('char-123');

      const { comfyuiService } = require('../../comfyui/comfyuiService');

      expect(comfyuiService.generateAvatar).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        'FURRY'
      );
    });

    it('should detect FURRY from physical characteristics', async () => {
      const furryCharacter = {
        ...mockCharacter,
        physicalCharacteristics: 'Anthropomorphic fox with fur',
        tags: [],
      };

      mockPrisma.character.findUnique.mockResolvedValue(furryCharacter);
      mockPrisma.characterImage.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation((cb: any) => cb(mockPrisma));

      await service.correctCharacterAvatar('char-123');

      const { comfyuiService } = require('../../comfyui/comfyuiService');

      expect(comfyuiService.generateAvatar).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        'FURRY'
      );
    });

    it('should detect HENTAI from content tags', async () => {
      const nsfwCharacter = {
        ...mockCharacter,
        tags: [
          { id: 'tag-1', name: 'ecchi' },
        ],
      };

      mockPrisma.character.findUnique.mockResolvedValue(nsfwCharacter);
      mockPrisma.characterImage.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation((cb: any) => cb(mockPrisma));

      await service.correctCharacterAvatar('char-123');

      const { comfyuiService } = require('../../comfyui/comfyuiService');

      expect(comfyuiService.generateAvatar).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        'HENTAI'
      );
    });

    it('should return undefined for safe content', async () => {
      await service.correctCharacterAvatar('char-123');

      const { comfyuiService } = require('../../comfyui/comfyuiService');

      expect(comfyuiService.generateAvatar).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        undefined
      );
    });
  });
});
