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
        expect(STANDARD_NEGATIVE_PROMPT).toContain('(liquid on face)');
        expect(STANDARD_NEGATIVE_PROMPT).toContain('(facial scars)');
        expect(STANDARD_NEGATIVE_PROMPT).toContain('(face marks)');
        expect(STANDARD_NEGATIVE_PROMPT).toContain('(multiple characters)');
        expect(STANDARD_NEGATIVE_PROMPT).toContain('(multiple views)');
      });

      it('should include facial feature inhibitors', () => {
        expect(STANDARD_NEGATIVE_PROMPT).toContain('(facial scars)');
        expect(STANDARD_NEGATIVE_PROMPT).toContain('(face marks)');
      });

      it('should include asymmetry inhibitors', () => {
        expect(STANDARD_NEGATIVE_PROMPT).toContain('bad anatomy');
        expect(STANDARD_NEGATIVE_PROMPT).toContain('bad eyes');
      });

      it('should include all standard quality inhibitors', () => {
        expect(STANDARD_NEGATIVE_PROMPT).toContain('2girls');
        expect(STANDARD_NEGATIVE_PROMPT).toContain('multiple views');
        expect(STANDARD_NEGATIVE_PROMPT).toContain('bad anatomy');
        expect(STANDARD_NEGATIVE_PROMPT).toContain('bad hands');
        expect(STANDARD_NEGATIVE_PROMPT).toContain('bad eyes');
      });
    });

    describe('AVATAR_NEGATIVE_PROMPT constant', () => {
      it('should extend standard prompt with body exclusions', () => {
        expect(AVATAR_NEGATIVE_PROMPT).toContain(STANDARD_NEGATIVE_PROMPT);
        expect(AVATAR_NEGATIVE_PROMPT).toContain('body');
        expect(AVATAR_NEGATIVE_PROMPT).toContain('shoulders');
        expect(AVATAR_NEGATIVE_PROMPT).toContain('chest');
        expect(AVATAR_NEGATIVE_PROMPT).toContain('full body');
        expect(AVATAR_NEGATIVE_PROMPT).toContain('wide angle');
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
    it('should use appropriate tags for facial artifacts', () => {
      // Liquid artifacts should be present
      expect(STANDARD_NEGATIVE_PROMPT).toContain('(liquid on face)');
    });

    it('should include facial feature inhibitors', () => {
      // Scars and marks should be present
      expect(STANDARD_NEGATIVE_PROMPT).toContain('(facial scars)');
      expect(STANDARD_NEGATIVE_PROMPT).toContain('(face marks)');
    });

    it('should handle asymmetry', () => {
      // Asymmetry indicators should be present
      expect(STANDARD_NEGATIVE_PROMPT).toContain('bad anatomy');
      expect(STANDARD_NEGATIVE_PROMPT).toContain('bad eyes');
    });
  });

  describe('Negative Prompt Structure', () => {
    it('should maintain proper prompt format', () => {
      // Should be comma-separated tags
      const tags = STANDARD_NEGATIVE_PROMPT.split(',').map(t => t.trim());

      // All FEATURE-013 enhancements should be present (simplified format)
      expect(tags).toContain('(liquid on face)');
      expect(tags).toContain('(facial scars)');
      expect(tags).toContain('(face marks)');
      expect(tags).toContain('(multiple characters)');
      expect(tags).toContain('(multiple views)');
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
      expect(AVATAR_NEGATIVE_PROMPT).toContain('body');
      expect(AVATAR_NEGATIVE_PROMPT).toContain('shoulders');
      expect(AVATAR_NEGATIVE_PROMPT).toContain('chest');
      expect(AVATAR_NEGATIVE_PROMPT).toContain('full body');
      expect(AVATAR_NEGATIVE_PROMPT).toContain('wide angle');

      // Reference should use standard prompt
      expect(REFERENCE_NEGATIVE_PROMPT).not.toContain('body,');
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
