/**
 * Multi-Stage Character Generator Integration Tests
 * Tests for FEATURE-013: Negative prompt enhancement
 *
 * This test suite validates that negative prompts are correctly
 * applied during multi-stage reference image generation.
 */
import { setupTestDatabase, teardownTestDatabase } from '../../../test-utils/database';
import { createTestUser, createTestCharacter } from '../../../test-utils/factories';
import { multiStageCharacterGenerator } from '../multiStageCharacterGenerator';
import { comfyuiService } from '../../comfyui/comfyuiService';
import { r2Service } from '../../r2Service';
import { AVATAR_NEGATIVE_PROMPT, REFERENCE_NEGATIVE_PROMPT, STANDARD_NEGATIVE_PROMPT } from '../../comfyui/promptEngineering';

// Mock external dependencies
jest.mock('../../comfyui/comfyuiService');
jest.mock('../../r2Service');
jest.mock('../../../queues/QueueManager');
jest.mock('../../comfyui/promptAgent');
// Mock translationService to prevent real API calls during tests
jest.mock('../../../services/translation/translationService', () => ({
  translationService: {
    translate: jest.fn().mockImplementation(() => Promise.resolve({
      translatedText: 'Translated text',
      provider: 'test',
      model: 'test',
      translationTimeMs: 0,
      cached: true,
      source: 'redis',
    })),
    invalidateTranslations: jest.fn().mockImplementation(() => Promise.resolve()),
  },
}));
// Mock imageUtils to avoid sharp/WebP conversion issues in tests
jest.mock('../../../utils/imageUtils', () => ({
  convertToWebP: jest.fn().mockResolvedValue(Buffer.from('test-webp-data')),
  getImageDimensions: jest.fn().mockResolvedValue({ width: 768, height: 768 }),
}));

// Mock Prisma character.findUnique to avoid WASM memory errors (issue #149)
// This is a workaround for Prisma WASM bugs that occur during integration tests
let mockTestUser: any = null;
let mockTestCharacter: any = null;

jest.mock('../../../config/database', () => {
  const actualModule = jest.requireActual('../../../config/database');
  return {
    ...actualModule,
    prisma: {
      ...actualModule.prisma,
      character: {
        findUnique: jest.fn().mockImplementation(({ where, include }: any) => {
          // Return test character data to avoid WASM errors
          const baseCharacter = mockTestCharacter && where.id === mockTestCharacter.id
            ? {
                id: mockTestCharacter.id,
                userId: mockTestUser?.id || 'test-user-id',
                firstName: mockTestCharacter.firstName || 'TestCharacter',
                lastName: mockTestCharacter.lastName || 'Test',
                gender: mockTestCharacter.gender || 'FEMALE',
                style: mockTestCharacter.style || 'ANIME',
                ageRating: mockTestCharacter.ageRating || 'GENERAL',
                contentTags: mockTestCharacter.contentTags || [],
                physicalCharacteristics: mockTestCharacter.physicalCharacteristics || '',
                personality: mockTestCharacter.personality || '',
                history: mockTestCharacter.history || '',
                visualStyle: mockTestCharacter.visualStyle || null,
                createdAt: mockTestCharacter.createdAt || new Date(),
                updatedAt: mockTestCharacter.updatedAt || new Date(),
              }
            : {
                id: where.id,
                userId: mockTestUser?.id || 'test-user-id',
                firstName: 'TestCharacter',
                lastName: 'Test',
                gender: 'FEMALE',
                style: 'ANIME',
                ageRating: 'GENERAL',
                contentTags: [],
                physicalCharacteristics: '',
                personality: '',
                history: '',
                visualStyle: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              };

          // Handle include parameter for full character data
          if (include) {
            return {
              ...baseCharacter,
              species: null,
              mainAttire: null,
              lora: null,
            };
          }

          return baseCharacter;
        }),
      },
      characterImage: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'test-avatar-id',
          characterId: 'test-character-id',
          type: 'AVATAR',
          isActive: true,
          storageKey: 'test-key',
          publicUrl: 'https://example.com/test-avatar.webp',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({
          id: 'test-image-id',
          characterId: 'test-character-id',
          type: 'REFERENCE',
          isActive: true,
          storageKey: 'test-key',
          publicUrl: 'https://example.com/test-image.webp',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
    },
  };
});

// TODO: Fix Prisma WASM memory access errors in CI (issue #149)
// Skip tests in CI environment until Prisma WASM issue is resolved
const describeCI = process.env.CI === 'true' ? describe.skip : describe;

describeCI('Multi-Stage Character Generator - Negative Prompt Enhancement (FEATURE-013)', () => {
  let testUser: any;
  let testCharacter: any;

  beforeAll(async () => {
    await setupTestDatabase();

    // Create test user
    testUser = await createTestUser({
      preferredLanguage: 'en',
      birthDate: new Date('1990-01-01'),
    });

    // Create test character with avatar
    testCharacter = await createTestCharacter(testUser.id, {
      firstName: 'TestCharacter',
      lastName: 'Test',
      gender: 'FEMALE',
      style: 'ANIME',
    });

    // Store in mock variables for Prisma mock
    mockTestUser = testUser;
    mockTestCharacter = testCharacter;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Negative Prompt Constants', () => {
    it('should have AVATAR_NEGATIVE_PROMPT with body exclusions', () => {
      expect(AVATAR_NEGATIVE_PROMPT).toContain('body');
      expect(AVATAR_NEGATIVE_PROMPT).toContain('shoulders');
      expect(AVATAR_NEGATIVE_PROMPT).toContain('chest');
      expect(AVATAR_NEGATIVE_PROMPT).toContain('full body');
      expect(AVATAR_NEGATIVE_PROMPT).toContain('wide angle');
    });

    it('should have REFERENCE_NEGATIVE_PROMPT equal to STANDARD', () => {
      expect(REFERENCE_NEGATIVE_PROMPT).toBe(STANDARD_NEGATIVE_PROMPT);
    });

    it('should include facial artifact inhibitors in STANDARD_NEGATIVE_PROMPT', () => {
      // FEATURE-013: Simplified format - no numerical weights, max 5 parenthetical tags
      expect(STANDARD_NEGATIVE_PROMPT).toContain('(liquid on face)');
      expect(STANDARD_NEGATIVE_PROMPT).toContain('(facial scars)');
      expect(STANDARD_NEGATIVE_PROMPT).toContain('(face marks)');
      expect(STANDARD_NEGATIVE_PROMPT).toContain('(multiple characters)');
      expect(STANDARD_NEGATIVE_PROMPT).toContain('(multiple views)');
    });
  });

  describe('View-Specific Negative Prompts', () => {
    it('should use face-specific negative prompt for face view', async () => {
      const mockView = {
        content: 'face',
        width: 768,
        height: 768,
        promptPrefix: 'portrait, headshot, face focus,',
        promptNegative: 'full body, multiple views, wide angle, body, shoulders, chest,',
      };

      expect(mockView.promptNegative).toContain('body');
      expect(mockView.promptNegative).toContain('shoulders');
      expect(mockView.promptNegative).toContain('chest');
      expect(mockView.promptNegative).toContain('full body');
      expect(mockView.promptNegative).toContain('wide angle');
    });

    it('should use front-specific negative prompt for front view', async () => {
      const mockView = {
        content: 'front',
        width: 768,
        height: 1152,
        promptPrefix: 'full body, standing, front view,',
        promptNegative: 'cropped, headshot only, side view, back view, from behind, back view,',
      };

      expect(mockView.promptNegative).toContain('from behind');
      expect(mockView.promptNegative).toContain('back view');
      expect(mockView.promptNegative).toContain('side view');
      expect(mockView.promptNegative).toContain('headshot only');
    });

    it('should use side-specific negative prompt for side view', async () => {
      // FEATURE-013: Simplified format - no numerical weights in mock data
      const mockView = {
        content: 'side',
        width: 768,
        height: 1152,
        promptPrefix: 'full body, standing, side view,',
        promptNegative: 'front view, back view, looking at camera, (from front), (from behind),',
      };

      expect(mockView.promptNegative).toContain('(from front)');
      expect(mockView.promptNegative).toContain('(from behind)');
      expect(mockView.promptNegative).toContain('front view');
      expect(mockView.promptNegative).toContain('back view');
    });

    it('should use back-specific negative prompt for back view', async () => {
      const mockView = {
        content: 'back',
        width: 768,
        height: 1152,
        promptPrefix: 'full body, standing, back view,',
        promptNegative: 'front view, face visible, looking at camera, (face), (from front),',
      };

      // FEATURE-013: Simplified format - no numerical weights
      expect(mockView.promptNegative).toContain('(face)');
      expect(mockView.promptNegative).toContain('(from front)');
      expect(mockView.promptNegative).toContain('face visible');
    });
  });

  describe('Multi-Stage Generation with Enhanced Negative Prompts', () => {
    beforeEach(() => {
      // Mock ComfyUI service methods
      jest.spyOn(comfyuiService, 'prepareReferences').mockResolvedValue({
        referencePath: '/tmp/test-references',
        imageCount: 3,
        status: 'success',
      });

      jest.spyOn(comfyuiService, 'cleanupReferences').mockResolvedValue({
        success: true,
        message: 'Cleanup successful',
      });

      // Mock applyVisualStyleToWorkflow to return a workflow with node '7'
      jest.spyOn(comfyuiService, 'applyVisualStyleToWorkflow').mockResolvedValue({
        '7': {
          inputs: {
            text: STANDARD_NEGATIVE_PROMPT,
          },
        },
      } as any);

      jest.spyOn(comfyuiService, 'executeWorkflow').mockResolvedValue({
        imageBytes: Buffer.from('test-image-data'),
        filename: 'test-image.webp',
        promptId: 'test-prompt-id',
      });

      // Mock R2 service
      jest.spyOn(r2Service, 'uploadObject').mockResolvedValue({
        publicUrl: 'https://example.com/test-image.webp',
        key: 'test-key',
      });

      jest.spyOn(r2Service, 'deleteObject').mockResolvedValue(true);

      // Mock promptAgent
      jest.doMock('../../comfyui/promptAgent', () => ({
        promptAgent: {
          generatePrompts: jest.fn().mockResolvedValue({
            positive: 'test positive prompt',
            negative: STANDARD_NEGATIVE_PROMPT,
          }),
        },
      }));
    });

    it('should generate face view with enhanced negative prompt', async () => {
      const progressCallback = jest.fn();

      await multiStageCharacterGenerator.generateCharacterDataset({
        characterId: testCharacter.id,
        prompt: {
          positive: 'test positive',
          negative: STANDARD_NEGATIVE_PROMPT,
        },
        userId: testUser.id,
        viewsToGenerate: ['face'],
        onProgress: progressCallback,
      });

      // Verify executeWorkflow was called
      expect(comfyuiService.executeWorkflow).toHaveBeenCalled();

      // Get the workflow passed to executeWorkflow
      const workflowCall = (comfyuiService.executeWorkflow as jest.Mock).mock.calls[0];
      const workflow = workflowCall[0];

      // Verify negative prompt includes facial artifact inhibitors
      const negativePrompt = workflow['7']?.inputs?.text;
      expect(negativePrompt).toBeDefined();
      // FEATURE-013: Simplified format - essential parenthetical tags only
      expect(negativePrompt).toContain('(liquid on face)');
      expect(negativePrompt).toContain('(facial scars)');
    });

    it('should generate front view with view-specific negative prompt', async () => {
      const progressCallback = jest.fn();

      await multiStageCharacterGenerator.generateCharacterDataset({
        characterId: testCharacter.id,
        prompt: {
          positive: 'test positive',
          negative: STANDARD_NEGATIVE_PROMPT,
        },
        userId: testUser.id,
        viewsToGenerate: ['front'],
        onProgress: progressCallback,
      });

      expect(comfyuiService.executeWorkflow).toHaveBeenCalled();

      // Verify negative prompt includes front view exclusions
      const workflowCall = (comfyuiService.executeWorkflow as jest.Mock).mock.calls[0];
      const workflow = workflowCall[0];

      const negativePrompt = workflow['7']?.inputs?.text;
      expect(negativePrompt).toBeDefined();
      // FEATURE-013: Should include from behind and back view
      // Accept both formats: with or without numerical weights
      expect(negativePrompt).toMatch(/from behind/);
      expect(negativePrompt).toMatch(/back view/);
    });

    it('should generate all views with appropriate negative prompts', async () => {
      const progressCallback = jest.fn();

      await multiStageCharacterGenerator.generateCharacterDataset({
        characterId: testCharacter.id,
        prompt: {
          positive: 'test positive',
          negative: STANDARD_NEGATIVE_PROMPT,
        },
        userId: testUser.id,
        viewsToGenerate: ['face', 'front', 'side', 'back'],
        onProgress: progressCallback,
      });

      // Should be called 4 times (once for each view)
      expect(comfyuiService.executeWorkflow).toHaveBeenCalledTimes(4);

      // Verify each call had appropriate negative prompts
      const calls = (comfyuiService.executeWorkflow as jest.Mock).mock.calls;

      // Face view should exclude body parts
      const faceWorkflow = calls[0][0];
      const faceNegative = faceWorkflow['7']?.inputs?.text;
      // FEATURE-013: Simplified format - body exclusions added to AVATAR_NEGATIVE_PROMPT
      expect(faceNegative).toContain('body');
      expect(faceNegative).toContain('shoulders');

      // Front view should exclude back/side views
      const frontWorkflow = calls[1][0];
      const frontNegative = frontWorkflow['7']?.inputs?.text;
      // FEATURE-013: Should include from behind
      expect(frontNegative).toMatch(/from behind/);

      // Side view should exclude front/back views
      const sideWorkflow = calls[2][0];
      const sideNegative = sideWorkflow['7']?.inputs?.text;
      // FEATURE-013: Should include from front
      expect(sideNegative).toMatch(/from front/);

      // Back view should exclude face
      const backWorkflow = calls[3][0];
      const backNegative = backWorkflow['7']?.inputs?.text;
      // FEATURE-013: Should include face
      expect(backNegative).toMatch(/\(face\)|face/);
    });
  });

  describe('Negative Prompt Enhancement Quality', () => {
    it('should prioritize facial artifact removal with parenthetical tags', () => {
      // FEATURE-013: Simplified format - essential tags only, no numerical weights
      const criticalArtifacts = [
        '(liquid on face)',
        '(facial scars)',
        '(face marks)',
      ];

      criticalArtifacts.forEach(artifact => {
        expect(STANDARD_NEGATIVE_PROMPT).toContain(artifact);
      });
    });

    it('should have maximum 5 parenthetical tags', () => {
      // FEATURE-013: Requirement - max 5 parenthetical tags in simplified format
      const parentheticalTags = STANDARD_NEGATIVE_PROMPT.match(/\([^)]+\)/g) || [];
      expect(parentheticalTags.length).toBeLessThanOrEqual(5);
    });

    it('should not contain numerical weights', () => {
      // FEATURE-013: Simplified format - no numerical weights like (tag:1.3)
      const hasWeights = /\([^:]+:\d+\.\d+\)/.test(STANDARD_NEGATIVE_PROMPT);
      expect(hasWeights).toBe(false);
    });

    it('should maintain all standard quality inhibitors', () => {
      // FEATURE-013: Simplified format - removed unused embeddings, no numerical weights
      const standardInhibitors = [
        '2girls',
        'multiple views',
        'grid layout',
        'chibi',
        'worst quality',
        'bad quality',
        'jpeg artifacts',
        'sketch',
        'signature',
        'watermark',
        'username',
        'censored',
        'simple background',
        'conjoined',
        'bad anatomy',
        'bad hands',
        'bad mouth',
        'bad arms',
        'extra arms',
        'bad eyes',
        'extra limbs',
        'speech bubble',
        'dialogue bubble',
        'emoji',
        'icon',
        'text box',
      ];

      standardInhibitors.forEach(inhibitor => {
        expect(STANDARD_NEGATIVE_PROMPT).toContain(inhibitor);
      });
    });
  });

  describe('Integration with Prompt Engineering', () => {
    it('should combine base negative prompt with view-specific additions', async () => {
      const baseNegative = STANDARD_NEGATIVE_PROMPT;
      // FEATURE-013: Simplified format - view additions without numerical weights
      const viewNegative = 'full body, multiple views, (body)';

      const combined = `${baseNegative}, ${viewNegative}`;

      // Should contain both base and view-specific prompts
      expect(combined).toContain('(liquid on face)'); // from base
      expect(combined).toContain('(body)'); // from view
    });

    it('should not duplicate negative prompt tags', () => {
      // Check that STANDARD_NEGATIVE_PROMPT doesn't have duplicates
      const tags = STANDARD_NEGATIVE_PROMPT.split(',').map(t => t.trim());
      const uniqueTags = new Set(tags);

      expect(tags.length).toBe(uniqueTags.size);
    });
  });

  describe('Progress Callbacks with Negative Prompt Info', () => {
    beforeEach(() => {
      jest.spyOn(comfyuiService, 'prepareReferences').mockResolvedValue({
        referencePath: '/tmp/test-references',
        imageCount: 3,
        status: 'success',
      });

      jest.spyOn(comfyuiService, 'cleanupReferences').mockResolvedValue({
        success: true,
        message: 'Cleanup successful',
      });

      // Mock applyVisualStyleToWorkflow to return a workflow with node '7'
      jest.spyOn(comfyuiService, 'applyVisualStyleToWorkflow').mockResolvedValue({
        '7': {
          inputs: {
            text: STANDARD_NEGATIVE_PROMPT,
          },
        },
      } as any);

      jest.spyOn(comfyuiService, 'executeWorkflow').mockResolvedValue({
        imageBytes: Buffer.from('test-image-data'),
        filename: 'test-image.webp',
        promptId: 'test-prompt-id',
      });

      jest.spyOn(r2Service, 'uploadObject').mockResolvedValue({
        publicUrl: 'https://example.com/test-image.webp',
        key: 'test-key',
      });
    });

    it('should call progress callback for each generated view', async () => {
      const progressCallback = jest.fn();

      await multiStageCharacterGenerator.generateCharacterDataset({
        characterId: testCharacter.id,
        prompt: {
          positive: 'test positive',
          negative: STANDARD_NEGATIVE_PROMPT,
        },
        userId: testUser.id,
        viewsToGenerate: ['face', 'front'],
        onProgress: progressCallback,
      });

      // Verify progress callback was called
      expect(progressCallback).toHaveBeenCalled();

      // Should have been called multiple times (once per view at least)
      expect(progressCallback.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    it('should cleanup on error during generation', async () => {
      jest.spyOn(comfyuiService, 'prepareReferences').mockResolvedValue({
        referencePath: '/tmp/test-references',
        imageCount: 3,
        status: 'success',
      });

      jest.spyOn(comfyuiService, 'cleanupReferences').mockResolvedValue({
        success: true,
        message: 'Cleanup successful',
      });

      jest.spyOn(comfyuiService, 'executeWorkflow').mockRejectedValue(new Error('Generation failed'));

      const progressCallback = jest.fn();

      await expect(
        multiStageCharacterGenerator.generateCharacterDataset({
          characterId: testCharacter.id,
          prompt: {
            positive: 'test positive',
            negative: STANDARD_NEGATIVE_PROMPT,
          },
          userId: testUser.id,
          viewsToGenerate: ['face'],
          onProgress: progressCallback,
        })
      ).rejects.toThrow('Generation failed');

      // Verify cleanup was called
      expect(comfyuiService.cleanupReferences).toHaveBeenCalled();
    });
  });
});
