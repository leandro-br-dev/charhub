/**
 * Prompt Engineering Service Unit Tests
 * Tests for FEATURE-013: Negative prompt enhancement
 */
import { PromptEngineering } from '../promptEngineering';
import { STANDARD_NEGATIVE_PROMPT, AVATAR_NEGATIVE_PROMPT, REFERENCE_NEGATIVE_PROMPT } from '../promptEngineering';
import { callGemini } from '../../llm/gemini';

// Mock dependencies
jest.mock('../../llm/gemini');

describe('PromptEngineering', () => {
  let promptEngineering: PromptEngineering;

  beforeEach(() => {
    promptEngineering = new PromptEngineering();
    jest.clearAllMocks();
  });

  describe('FEATURE-013: Negative Prompt Enhancement', () => {
    describe('STANDARD_NEGATIVE_PROMPT constant', () => {
      it('should include facial artifact inhibitors', () => {
        expect(STANDARD_NEGATIVE_PROMPT).toContain('(water droplets:1.3)');
        expect(STANDARD_NEGATIVE_PROMPT).toContain('(tear drops:1.3)');
        expect(STANDARD_NEGATIVE_PROMPT).toContain('(sweat drops:1.3)');
        expect(STANDARD_NEGATIVE_PROMPT).toContain('(rain on face:1.3)');
        expect(STANDARD_NEGATIVE_PROMPT).toContain('(liquid on face:1.3)');
      });

      it('should include facial feature inhibitors', () => {
        expect(STANDARD_NEGATIVE_PROMPT).toContain('(facial scars:1.2)');
        expect(STANDARD_NEGATIVE_PROMPT).toContain('(face marks:1.2)');
        expect(STANDARD_NEGATIVE_PROMPT).toContain('(blemishes:1.2)');
        expect(STANDARD_NEGATIVE_PROMPT).toContain('(freckles:1.1)');
        expect(STANDARD_NEGATIVE_PROMPT).toContain('(moles:1.1)');
      });

      it('should include skin imperfections inhibitors', () => {
        expect(STANDARD_NEGATIVE_PROMPT).toContain('(skin imperfections:1.1)');
        expect(STANDARD_NEGATIVE_PROMPT).toContain('(wounds:1.2)');
        expect(STANDARD_NEGATIVE_PROMPT).toContain('(bruises:1.2)');
        expect(STANDARD_NEGATIVE_PROMPT).toContain('(cuts:1.2)');
      });

      it('should include dirt and grime inhibitors', () => {
        expect(STANDARD_NEGATIVE_PROMPT).toContain('(dirt on face:1.2)');
        expect(STANDARD_NEGATIVE_PROMPT).toContain('(grime:1.1)');
        expect(STANDARD_NEGATIVE_PROMPT).toContain('(blood on face:1.3)');
      });

      it('should include asymmetry inhibitors', () => {
        expect(STANDARD_NEGATIVE_PROMPT).toContain('(asymmetrical face features:1.1)');
        expect(STANDARD_NEGATIVE_PROMPT).toContain('(misaligned eyes:1.2)');
      });

      it('should include all standard quality inhibitors', () => {
        expect(STANDARD_NEGATIVE_PROMPT).toContain('2girls');
        expect(STANDARD_NEGATIVE_PROMPT).toContain('(multiple girls:1.3)');
        expect(STANDARD_NEGATIVE_PROMPT).toContain('(multiple characters:1.3)');
        expect(STANDARD_NEGATIVE_PROMPT).toContain('badhandv4');
        expect(STANDARD_NEGATIVE_PROMPT).toContain('negative_hand-neg');
        expect(STANDARD_NEGATIVE_PROMPT).toContain('ng_deepnegative_v1_75t');
        expect(STANDARD_NEGATIVE_PROMPT).toContain('verybadimagenegative_v1.3');
      });
    });

    describe('AVATAR_NEGATIVE_PROMPT constant', () => {
      it('should extend standard prompt with body exclusions', () => {
        expect(AVATAR_NEGATIVE_PROMPT).toContain(STANDARD_NEGATIVE_PROMPT);
        expect(AVATAR_NEGATIVE_PROMPT).toContain('(body:1.2)');
        expect(AVATAR_NEGATIVE_PROMPT).toContain('(shoulders:1.1)');
        expect(AVATAR_NEGATIVE_PROMPT).toContain('(chest:1.1)');
      });
    });

    describe('REFERENCE_NEGATIVE_PROMPT constant', () => {
      it('should be same as standard prompt', () => {
        expect(REFERENCE_NEGATIVE_PROMPT).toBe(STANDARD_NEGATIVE_PROMPT);
      });
    });
  });

  describe('buildAvatarPrompt', () => {
    it('should use AVATAR_NEGATIVE_PROMPT for avatar generation', async () => {
      (callGemini as jest.Mock).mockResolvedValue({
        content: 'purple hair, blue eyes, anime style',
      });

      const character = {
        name: 'TestCharacter',
        gender: 'female',
        physicalCharacteristics: 'long purple hair, blue eyes',
      };

      const result = await promptEngineering.buildAvatarPrompt(character);

      expect(result.negative).toBe(AVATAR_NEGATIVE_PROMPT);
    });

    it('should include camera angle for portrait in positive prompt', async () => {
      (callGemini as jest.Mock).mockResolvedValue({
        content: 'anime girl, purple hair',
      });

      const character = {
        name: 'TestCharacter',
        gender: 'female',
      };

      const result = await promptEngineering.buildAvatarPrompt(character);

      expect(result.positive).toContain('close-up portrait');
      expect(result.positive).toContain('detailed face');
      expect(result.positive).toContain('headshot');
    });
  });

  describe('buildStickerPrompt', () => {
    it('should use STANDARD_NEGATIVE_PROMPT for sticker generation', async () => {
      (callGemini as jest.Mock).mockResolvedValue({
        content: 'anime girl, happy expression',
      });

      const character = {
        name: 'TestCharacter',
        gender: 'female',
      };

      const result = await promptEngineering.buildStickerPrompt(
        character,
        'happy',
        'waving hand'
      );

      expect(result.negative).toBe(STANDARD_NEGATIVE_PROMPT);
    });

    it('should include full body in positive prompt', async () => {
      (callGemini as jest.Mock).mockResolvedValue({
        content: 'anime girl',
      });

      const character = {
        name: 'TestCharacter',
        gender: 'female',
      };

      const result = await promptEngineering.buildStickerPrompt(
        character,
        'happy',
        'waving hand'
      );

      expect(result.positive).toContain('full body');
    });
  });

  describe('buildCoverPrompt', () => {
    it('should use STANDARD_NEGATIVE_PROMPT for cover generation', async () => {
      (callGemini as jest.Mock).mockResolvedValue({
        content: '((beach)), ((pink bikini))',
      });

      const character = {
        name: 'TestCharacter',
        gender: 'female',
      };

      const result = await promptEngineering.buildCoverPrompt(character, 'beach with pink bikini');

      expect(result.negative).toBe(STANDARD_NEGATIVE_PROMPT);
    });

    it('should include full body in positive prompt', async () => {
      (callGemini as jest.Mock).mockResolvedValue({
        content: 'anime girl, standing',
      });

      const character = {
        name: 'TestCharacter',
        gender: 'female',
      };

      const result = await promptEngineering.buildCoverPrompt(character);

      expect(result.positive).toContain('full body');
      expect(result.positive).toContain('standing');
      expect(result.positive).toContain('looking at viewer');
    });
  });

  describe('Prompt Enhancement Quality', () => {
    it('should use appropriate weights for facial artifacts', () => {
      // Water/liquid artifacts should have highest weight (1.3)
      const waterRegex = /\(water droplets:1\.3\)/;
      const tearRegex = /\(tear drops:1\.3\)/;
      const sweatRegex = /\(sweat drops:1\.3\)/;
      const rainRegex = /\(rain on face:1\.3\)/;
      const liquidRegex = /\(liquid on face:1\.3\)/;

      expect(STANDARD_NEGATIVE_PROMPT).toMatch(waterRegex);
      expect(STANDARD_NEGATIVE_PROMPT).toMatch(tearRegex);
      expect(STANDARD_NEGATIVE_PROMPT).toMatch(sweatRegex);
      expect(STANDARD_NEGATIVE_PROMPT).toMatch(rainRegex);
      expect(STANDARD_NEGATIVE_PROMPT).toMatch(liquidRegex);
    });

    it('should use medium-high weights for facial features', () => {
      // Scars and marks should have weight 1.2
      expect(STANDARD_NEGATIVE_PROMPT).toContain('(facial scars:1.2)');
      expect(STANDARD_NEGATIVE_PROMPT).toContain('(face marks:1.2)');

      // Blemishes should have weight 1.2
      expect(STANDARD_NEGATIVE_PROMPT).toContain('(blemishes:1.2)');

      // Freckles and moles should have lower weight (1.1)
      expect(STANDARD_NEGATIVE_PROMPT).toContain('(freckles:1.1)');
      expect(STANDARD_NEGATIVE_PROMPT).toContain('(moles:1.1)');
    });

    it('should prioritize blood on face removal', () => {
      // Blood on face should have highest weight (1.3) - most critical
      expect(STANDARD_NEGATIVE_PROMPT).toContain('(blood on face:1.3)');
    });

    it('should handle misaligned eyes with high priority', () => {
      // Eye misalignment should have weight 1.2 - important for portraits
      expect(STANDARD_NEGATIVE_PROMPT).toContain('(misaligned eyes:1.2)');
    });
  });

  describe('Negative Prompt Structure', () => {
    it('should maintain proper prompt format', () => {
      // Should be comma-separated tags
      const tags = STANDARD_NEGATIVE_PROMPT.split(',').map(t => t.trim());

      // All FEATURE-013 enhancements should be present
      expect(tags).toContain('(water droplets:1.3)');
      expect(tags).toContain('(tear drops:1.3)');
      expect(tags).toContain('(sweat drops:1.3)');
      expect(tags).toContain('(rain on face:1.3)');
      expect(tags).toContain('(liquid on face:1.3)');
      expect(tags).toContain('(facial scars:1.2)');
      expect(tags).toContain('(face marks:1.2)');
      expect(tags).toContain('(blemishes:1.2)');
      expect(tags).toContain('(freckles:1.1)');
      expect(tags).toContain('(moles:1.1)');
      expect(tags).toContain('(skin imperfections:1.1)');
      expect(tags).toContain('(wounds:1.2)');
      expect(tags).toContain('(bruises:1.2)');
      expect(tags).toContain('(cuts:1.2)');
      expect(tags).toContain('(dirt on face:1.2)');
      expect(tags).toContain('(grime:1.1)');
      expect(tags).toContain('(blood on face:1.3)');
      expect(tags).toContain('(asymmetrical face features:1.1)');
      expect(tags).toContain('(misaligned eyes:1.2)');
    });

    it('should not have duplicate tags', () => {
      const tags = STANDARD_NEGATIVE_PROMPT.split(',').map(t => t.trim());
      const uniqueTags = new Set(tags);

      expect(tags.length).toBe(uniqueTags.size);
    });
  });

  describe('Integration with Multi-Stage Generator', () => {
    it('should provide different negative prompts for different views', () => {
      // Avatar should exclude body parts
      expect(AVATAR_NEGATIVE_PROMPT).toContain('(body:1.2)');
      expect(AVATAR_NEGATIVE_PROMPT).toContain('(shoulders:1.1)');
      expect(AVATAR_NEGATIVE_PROMPT).toContain('(chest:1.1)');

      // Reference should use standard prompt
      expect(REFERENCE_NEGATIVE_PROMPT).not.toContain('(body:1.2)');
      expect(REFERENCE_NEGATIVE_PROMPT).not.toContain('(shoulders:1.1)');
      expect(REFERENCE_NEGATIVE_PROMPT).not.toContain('(chest:1.1)');
    });
  });

  describe('Error Handling', () => {
    it('should handle LLM failures gracefully', async () => {
      (callGemini as jest.Mock).mockRejectedValue(new Error('LLM API error'));

      const character = {
        name: 'TestCharacter',
        gender: 'female',
        physicalCharacteristics: 'long purple hair',
      };

      const result = await promptEngineering.buildAvatarPrompt(character);

      // Should still have valid negative prompt even if LLM fails
      expect(result.negative).toBe(AVATAR_NEGATIVE_PROMPT);
      expect(result.positive).toBeDefined();
    });

    it('should handle empty descriptions', async () => {
      (callGemini as jest.Mock).mockResolvedValue({
        content: '',
      });

      const character = {
        name: 'TestCharacter',
        gender: 'female',
        physicalCharacteristics: '',
      };

      const result = await promptEngineering.buildAvatarPrompt(character);

      // Should still have valid negative prompt
      expect(result.negative).toBe(AVATAR_NEGATIVE_PROMPT);
      expect(result.positive).toBeDefined();
    });
  });
});
