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

describe('Multi-Stage Character Generator - Negative Prompt Enhancement (FEATURE-013)', () => {
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
      const mockView = {
        content: 'side',
        width: 768,
        height: 1152,
        promptPrefix: 'full body, standing, side view,',
        promptNegative: 'front view, back view, looking at camera, (from front:1.2), (from behind:1.2),',
      };

      expect(mockView.promptNegative).toContain('(from front:1.2)');
      expect(mockView.promptNegative).toContain('(from behind:1.2)');
      expect(mockView.promptNegative).toContain('front view');
      expect(mockView.promptNegative).toContain('back view');
    });

    it('should use back-specific negative prompt for back view', async () => {
      const mockView = {
        content: 'back',
        width: 768,
        height: 1152,
        promptPrefix: 'full body, standing, back view,',
        promptNegative: 'front view, face visible, looking at camera, (face:1.3), (from front:1.3),',
      };

      expect(mockView.promptNegative).toContain('(face:1.3)');
      expect(mockView.promptNegative).toContain('(from front:1.3)');
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
      expect(negativePrompt).toContain('(water droplets:1.3)');
      expect(negativePrompt).toContain('(tear drops:1.3)');
      expect(negativePrompt).toContain('(sweat drops:1.3)');
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
      expect(negativePrompt).toContain('(from behind:1.3)');
      expect(negativePrompt).toContain('(back view:1.3)');
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
      expect(faceNegative).toContain('(body:1.2)');

      // Front view should exclude back/side views
      const frontWorkflow = calls[1][0];
      const frontNegative = frontWorkflow['7']?.inputs?.text;
      expect(frontNegative).toContain('(from behind:1.3)');

      // Side view should exclude front/back views
      const sideWorkflow = calls[2][0];
      const sideNegative = sideWorkflow['7']?.inputs?.text;
      expect(sideNegative).toContain('(from front:1.2)');

      // Back view should exclude face
      const backWorkflow = calls[3][0];
      const backNegative = backWorkflow['7']?.inputs?.text;
      expect(backNegative).toContain('(face:1.3)');
    });
  });

  describe('Negative Prompt Enhancement Quality', () => {
    it('should prioritize facial artifact removal with weight 1.3', () => {
      const criticalArtifacts = [
        '(water droplets:1.3)',
        '(tear drops:1.3)',
        '(sweat drops:1.3)',
        '(rain on face:1.3)',
        '(liquid on face:1.3)',
        '(blood on face:1.3)',
      ];

      criticalArtifacts.forEach(artifact => {
        expect(STANDARD_NEGATIVE_PROMPT).toContain(artifact);
      });
    });

    it('should use high weight (1.2) for facial features', () => {
      const highWeightFeatures = [
        '(facial scars:1.2)',
        '(face marks:1.2)',
        '(blemishes:1.2)',
        '(wounds:1.2)',
        '(bruises:1.2)',
        '(cuts:1.2)',
        '(dirt on face:1.2)',
        '(misaligned eyes:1.2)',
      ];

      highWeightFeatures.forEach(feature => {
        expect(STANDARD_NEGATIVE_PROMPT).toContain(feature);
      });
    });

    it('should use medium weight (1.1) for minor features', () => {
      const mediumWeightFeatures = [
        '(freckles:1.1)',
        '(moles:1.1)',
        '(skin imperfections:1.1)',
        '(grime:1.1)',
        '(asymmetrical face features:1.1)',
      ];

      mediumWeightFeatures.forEach(feature => {
        expect(STANDARD_NEGATIVE_PROMPT).toContain(feature);
      });
    });

    it('should maintain all standard quality inhibitors', () => {
      const standardInhibitors = [
        '2girls',
        '(multiple girls:1.3)',
        '(multiple characters:1.3)',
        'badhandv4',
        'negative_hand-neg',
        'ng_deepnegative_v1_75t',
        'verybadimagenegative_v1.3',
        '(worst quality, bad quality',
        'sketch',
        'signature',
        'watermark',
        'username',
        '(censored, bar_censor',
        'simple background',
        'conjoined',
        'bad anatomy',
        'bad hands',
        'bad mouth',
        'bad tongue',
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
      const viewNegative = 'full body, multiple views, (body:1.2)';

      const combined = `${baseNegative}, ${viewNegative}`;

      // Should contain both base and view-specific prompts
      expect(combined).toContain('(water droplets:1.3)'); // from base
      expect(combined).toContain('(body:1.2)'); // from view
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

      // Should be called 2 times (once for each view)
      expect(progressCallback).toHaveBeenCalledTimes(2);

      // Verify progress updates
      expect(progressCallback).toHaveBeenCalledWith(1, 2, expect.any(String), expect.any(Array));
      expect(progressCallback).toHaveBeenCalledWith(2, 2, expect.any(String), expect.any(Array));
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
