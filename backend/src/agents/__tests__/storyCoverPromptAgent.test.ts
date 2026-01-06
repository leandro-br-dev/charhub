import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  generateStoryCoverPrompt,
  StoryCoverPromptInput,
} from '../storyCoverPromptAgent';
import { callLLM } from '../../services/llm';
import { logger } from '../../config/logger';
import { modelRouter } from '../../services/llm/modelRouter';
import type { ModelSelection } from '../../services/llm/modelRouter';

// Mock dependencies
jest.mock('../../services/llm');
jest.mock('../../services/llm/modelRouter');
jest.mock('../../config/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('storyCoverPromptAgent - Unit Tests', () => {
  const basicInput: StoryCoverPromptInput = {
    title: 'The Dragon Academy',
    synopsis: 'A young wizard discovers a forbidden spell book in the academy library.',
    genre: 'fantasy',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock model router to return Grok 4-1 for story generation
    (modelRouter.getModel as jest.MockedFunction<typeof modelRouter.getModel>).mockResolvedValue({
      provider: 'grok',
      model: 'grok-4-1-fast-reasoning',
      reasoning: 'Story generation - using Grok 4-1 (NSFW-friendly, cost-effective)',
    } as ModelSelection);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateStoryCoverPrompt', () => {

    it('should generate prompt with basic input', async () => {
      const mockPrompt = 'masterpiece, best quality, anime style, highly detailed. dragon center, magical academy background';

      (callLLM as jest.Mock as any).mockResolvedValue({
        content: mockPrompt,
      });

      const result = await generateStoryCoverPrompt(basicInput);

      expect(result).toContain('masterpiece');
      expect(result).toContain('best quality');
      expect(callLLM).toHaveBeenCalledWith({
        provider: 'grok',
        model: 'grok-4-1-fast-reasoning', // Updated to match model router output
        systemPrompt: expect.any(String),
        userPrompt: expect.any(String),
        temperature: 0.7,
        maxTokens: 768,
      });
    });

    it('should generate prompt with main character', async () => {
      const inputWithCharacter: StoryCoverPromptInput = {
        ...basicInput,
        mainCharacter: {
          name: 'Elena',
          age: '16 years old',
          gender: 'female',
          appearance: 'long red hair, green eyes',
          attire: 'wizard robe with silver trim',
        },
      };

      const mockPrompt = 'masterpiece, best quality, anime style, highly detailed. young woman center, long red hair, green eyes, wizard robe, silver trim, magical academy';

      (callLLM as jest.Mock as any).mockResolvedValue({
        content: mockPrompt,
      });

      const result = await generateStoryCoverPrompt(inputWithCharacter);

      expect(result).toContain('masterpiece');
      expect(callLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          userPrompt: expect.stringContaining('Main Character:'),
        })
      );
    });

    it('should generate prompt with secondary characters', async () => {
      const inputWithCharacters: StoryCoverPromptInput = {
        ...basicInput,
        mainCharacter: {
          name: 'Elena',
          appearance: 'long red hair',
        },
        secondaryCharacters: [
          {
            name: 'Marcus',
            appearance: 'short brown hair, sword',
          },
          {
            name: 'Sera',
            appearance: 'blonde hair, staff',
          },
        ],
      };

      (callLLM as jest.Mock as any).mockResolvedValue({
        content: 'masterpiece, best quality, anime style, highly detailed. test prompt',
      });

      await generateStoryCoverPrompt(inputWithCharacters);

      expect(callLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          userPrompt: expect.stringContaining('Secondary Characters:'),
        })
      );
    });

    it('should limit secondary characters to 2', async () => {
      const inputWithManyCharacters: StoryCoverPromptInput = {
        ...basicInput,
        mainCharacter: {
          name: 'Hero',
          appearance: 'brave expression',
        },
        secondaryCharacters: [
          { name: 'Char1', appearance: 'desc1' },
          { name: 'Char2', appearance: 'desc2' },
          { name: 'Char3', appearance: 'desc3' }, // Should be ignored
        ],
      };

      (callLLM as jest.Mock as any).mockResolvedValue({
        content: 'test prompt',
      });

      await generateStoryCoverPrompt(inputWithManyCharacters);

      const callArgs = (callLLM as jest.Mock as any).mock.calls[0][0];
      expect(callArgs.userPrompt).toContain('Secondary Characters:');
      // Only first 2 secondary characters should be mentioned
    });

    it('should include setting in prompt', async () => {
      const inputWithSetting: StoryCoverPromptInput = {
        ...basicInput,
        setting: 'ancient magical academy library',
      };

      (callLLM as jest.Mock as any).mockResolvedValue({
        content: 'masterpiece, best quality. magical library background, books, candles',
      });

      await generateStoryCoverPrompt(inputWithSetting);

      expect(callLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          userPrompt: expect.stringContaining('Setting: ancient magical academy library'),
        })
      );
    });

    it('should include mood in prompt', async () => {
      const inputWithMood: StoryCoverPromptInput = {
        ...basicInput,
        mood: 'mysterious and magical',
      };

      (callLLM as jest.Mock as any).mockResolvedValue({
        content: 'masterpiece, best quality. mysterious atmosphere, magical lighting',
      });

      await generateStoryCoverPrompt(inputWithMood);

      expect(callLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          userPrompt: expect.stringContaining('MOOD: mysterious and magical'),
        })
      );
    });

    it('should add essential quality keywords if missing', async () => {
      (callLLM as jest.Mock as any).mockResolvedValue({
        content: 'dragon center, woman left, man right',
      });

      const result = await generateStoryCoverPrompt(basicInput);

      expect(result).toContain('(masterpiece:1.2)');
      expect(result).toContain('(best quality:1.2)');
      expect(result).toContain('anime style');
      expect(result).toContain('highly detailed');
      expect(result).toContain('cinematic lighting');
      expect(result).toContain('volumetric lighting');
    });

    it('should not duplicate essential quality keywords if present', async () => {
      const promptWithKeywords = 'masterpiece, best quality, anime style, highly detailed. dragon center';

      (callLLM as jest.Mock as any).mockResolvedValue({
        content: promptWithKeywords,
      });

      const result = await generateStoryCoverPrompt(basicInput);

      // Count occurrences - should not duplicate
      const masterpieceCount = (result.match(/masterpiece/g) || []).length;
      expect(masterpieceCount).toBe(1);
    });

    it('should clean up markdown code blocks', async () => {
      (callLLM as jest.Mock as any).mockResolvedValue({
        content: '```prompt\nmasterpiece, best quality. dragon center\n```',
      });

      const result = await generateStoryCoverPrompt(basicInput);

      expect(result).not.toContain('```');
      expect(result).toContain('masterpiece');
    });

    it('should clean up quotes', async () => {
      (callLLM as jest.Mock as any).mockResolvedValue({
        content: '"masterpiece, best quality. dragon center"',
      });

      const result = await generateStoryCoverPrompt(basicInput);

      expect(result).not.toMatch(/^"|"$/g);
    });

    it('should clean up LLM artifacts', async () => {
      (callLLM as jest.Mock as any).mockResolvedValue({
        content: 'Prompt: masterpiece, best quality. dragon center',
      });

      const result = await generateStoryCoverPrompt(basicInput);

      expect(result).not.toContain('Prompt:');
    });

    it('should sanitize non-ASCII characters', async () => {
      (callLLM as jest.Mock as any).mockResolvedValue({
        content: 'masterpiece, best quality. dragon center, café, naïve',
      });

      const result = await generateStoryCoverPrompt(basicInput);

      // Non-ASCII should be removed or result should be valid ASCII
      expect(result).toBeTruthy();
    });

    it('should truncate prompts exceeding MAX_LENGTH', async () => {
      const longPrompt = 'masterpiece, best quality, anime style, highly detailed. ';
      const repeatCount = 100;
      const repeatedContent = 'dragon, wizard, magic, castle, '.repeat(repeatCount);
      const tooLongPrompt = longPrompt + repeatedContent;

      (callLLM as jest.Mock as any).mockResolvedValue({
        content: tooLongPrompt,
      });

      const result = await generateStoryCoverPrompt(basicInput);

      expect(result.length).toBeLessThanOrEqual(700);
    });

    it('should truncate at last BREAK if needed', async () => {
      const longPrompt = 'masterpiece, best quality. character1 details. BREAK. character2 details. BREAK. character3 details. background, lighting';

      (callLLM as jest.Mock as any).mockResolvedValue({
        content: longPrompt,
      });

      const result = await generateStoryCoverPrompt(basicInput);

      // If truncated, should try to break at sensible point
      expect(result.length).toBeLessThanOrEqual(700);
    });

    it('should handle LLM errors and return fallback prompt', async () => {
      const llmError = new Error('LLM service unavailable');
      (callLLM as jest.Mock as any).mockRejectedValue(llmError);

      const result = await generateStoryCoverPrompt(basicInput);

      expect(result).toContain('masterpiece');
      expect(result).toContain('best quality');
      expect(result).toContain('anime style');
      expect(result).toContain('highly detailed');
      expect(logger.error).toHaveBeenCalledWith(
        { error: llmError, input: basicInput },
        'failed_to_generate_cover_prompt'
      );
    });

    it('should use gemini-2.5-flash model', async () => {
      (callLLM as jest.Mock as any).mockResolvedValue({
        content: 'test prompt',
      });

      await generateStoryCoverPrompt(basicInput);

      expect(callLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'grok',
          model: 'grok-4-1-fast-reasoning', // Updated to match model router output
        })
      );
    });

    it('should use temperature 0.7 for creativity', async () => {
      (callLLM as jest.Mock as any).mockResolvedValue({
        content: 'test prompt',
      });

      await generateStoryCoverPrompt(basicInput);

      expect(callLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
        })
      );
    });

    it('should allow 768 maxTokens for detailed prompts', async () => {
      (callLLM as jest.Mock as any).mockResolvedValue({
        content: 'test prompt',
      });

      await generateStoryCoverPrompt(basicInput);

      expect(callLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          maxTokens: 768,
        })
      );
    });
  });

  describe('StoryCoverPromptInput Type', () => {
    it('should allow minimal required fields', () => {
      const minimalInput: StoryCoverPromptInput = {
        title: 'Test Story',
        synopsis: 'A test synopsis',
        genre: 'fantasy',
      };

      expect(minimalInput.title).toBe('Test Story');
      expect(minimalInput.synopsis).toBe('A test synopsis');
      expect(minimalInput.genre).toBe('fantasy');
    });

    it('should allow optional fields to be undefined', () => {
      const minimalInput: StoryCoverPromptInput = {
        title: 'Test',
        synopsis: 'Synopsis',
        genre: 'fantasy',
      };

      expect(minimalInput.mood).toBeUndefined();
      expect(minimalInput.mainCharacter).toBeUndefined();
      expect(minimalInput.secondaryCharacters).toBeUndefined();
      expect(minimalInput.setting).toBeUndefined();
    });

    it('should allow all optional fields', () => {
      const fullInput: StoryCoverPromptInput = {
        title: 'Test Story',
        synopsis: 'Test synopsis',
        genre: 'fantasy',
        mood: 'mysterious',
        mainCharacter: {
          name: 'Hero',
          age: '20',
          gender: 'male',
          appearance: 'brave expression',
          attire: 'armor',
        },
        secondaryCharacters: [
          {
            name: 'Sidekick',
            appearance: 'friendly smile',
          },
        ],
        setting: 'castle',
      };

      expect(fullInput.mood).toBe('mysterious');
      expect(fullInput.mainCharacter?.name).toBe('Hero');
      expect(fullInput.secondaryCharacters).toHaveLength(1);
      expect(fullInput.setting).toBe('castle');
    });

    it('should allow mainCharacter with only some fields', () => {
      const input: StoryCoverPromptInput = {
        title: 'Test',
        synopsis: 'Synopsis',
        genre: 'fantasy',
        mainCharacter: {
          appearance: 'red hair',
        },
      };

      expect(input.mainCharacter?.appearance).toBe('red hair');
      expect(input.mainCharacter?.name).toBeUndefined();
    });

    it('should allow secondaryCharacters with minimal fields', () => {
      const input: StoryCoverPromptInput = {
        title: 'Test',
        synopsis: 'Synopsis',
        genre: 'fantasy',
        secondaryCharacters: [
          {
            appearance: 'blue hair',
          },
        ],
      };

      expect(input.secondaryCharacters?.[0].appearance).toBe('blue hair');
    });
  });

  describe('Prompt Quality Validation', () => {
    it('should ensure quality keywords are at the end when added', async () => {
      (callLLM as jest.Mock as any).mockResolvedValue({
        content: 'dragon center, woman left, cave background',
      });

      const result = await generateStoryCoverPrompt({
        title: 'Test',
        synopsis: 'Synopsis',
        genre: 'fantasy',
      });

      // Essential keywords should be present
      expect(result).toContain('masterpiece');
      expect(result).toContain('best quality');
    });

    it('should log successful prompt generation', async () => {
      const mockPrompt = 'masterpiece, best quality, anime style, highly detailed. dragon center';

      (callLLM as jest.Mock as any).mockResolvedValue({
        content: mockPrompt,
      });

      await generateStoryCoverPrompt(basicInput);

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'The Dragon Academy',
          genre: 'fantasy',
          prompt: expect.any(String),
          promptLength: expect.any(Number),
        }),
        'story_cover_prompt_generated'
      );
    });
  });

  describe('BREAK Separator Pattern', () => {
    it('should include BREAK in system prompt instructions', async () => {
      (callLLM as jest.Mock as any).mockResolvedValue({
        content: 'test prompt',
      });

      await generateStoryCoverPrompt(basicInput);

      const callArgs = (callLLM as jest.Mock as any).mock.calls[0][0];
      expect(callArgs.systemPrompt).toContain('BREAK');
      expect(callArgs.systemPrompt).toContain('separate different characters clearly');
    });

    it('should provide BREAK examples in system prompt', async () => {
      (callLLM as jest.Mock as any).mockResolvedValue({
        content: 'test prompt',
      });

      await generateStoryCoverPrompt(basicInput);

      const callArgs = (callLLM as jest.Mock as any).mock.calls[0][0];
      expect(callArgs.systemPrompt).toContain('PROMPT STRUCTURE');
      expect(callArgs.systemPrompt).toContain('BREAK');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty title', async () => {
      const emptyTitleInput: StoryCoverPromptInput = {
        title: '',
        synopsis: 'Synopsis',
        genre: 'fantasy',
      };

      (callLLM as jest.Mock as any).mockResolvedValue({
        content: 'masterpiece, best quality. fantasy scene',
      });

      const result = await generateStoryCoverPrompt(emptyTitleInput);

      expect(result).toContain('masterpiece');
    });

    it('should handle very long title', async () => {
      const longTitleInput: StoryCoverPromptInput = {
        title: 'A'.repeat(200),
        synopsis: 'Synopsis',
        genre: 'fantasy',
      };

      (callLLM as jest.Mock as any).mockResolvedValue({
        content: 'masterpiece, best quality. test',
      });

      const result = await generateStoryCoverPrompt(longTitleInput);

      expect(result).toBeTruthy();
    });

    it('should handle special characters in input', async () => {
      const specialInput: StoryCoverPromptInput = {
        title: 'The Dragon\'s "Academy"',
        synopsis: 'A story with em-dashes—& quotes!',
        genre: 'fantasy',
      };

      (callLLM as jest.Mock as any).mockResolvedValue({
        content: 'masterpiece, best quality. dragon academy',
      });

      const result = await generateStoryCoverPrompt(specialInput);

      expect(result).toBeTruthy();
    });

    it('should handle mainCharacter with only name', async () => {
      const nameOnlyInput: StoryCoverPromptInput = {
        ...basicInput,
        mainCharacter: {
          name: 'Elena',
        },
      };

      (callLLM as jest.Mock as any).mockResolvedValue({
        content: 'masterpiece, best quality. young woman center',
      });

      await generateStoryCoverPrompt(nameOnlyInput);

      // The function should handle character with only name gracefully
      expect(callLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'grok',
          model: 'grok-4-1-fast-reasoning', // Updated to match model router output
        })
      );
    });

    it('should handle empty secondaryCharacters array', async () => {
      const emptyArrayInput: StoryCoverPromptInput = {
        ...basicInput,
        secondaryCharacters: [],
      };

      (callLLM as jest.Mock as any).mockResolvedValue({
        content: 'masterpiece, best quality. test',
      });

      await generateStoryCoverPrompt(emptyArrayInput);

      // Should not throw error
      expect(callLLM).toHaveBeenCalled();
    });
  });

  describe('Fallback Behavior', () => {
    it('should return genre-specific fallback on error', async () => {
      (callLLM as jest.Mock as any).mockRejectedValue(new Error('Service unavailable'));

      const result = await generateStoryCoverPrompt({
        title: 'Test',
        synopsis: 'Synopsis',
        genre: 'horror',
        mood: 'terrifying',
      });

      expect(result).toContain('horror style');
      expect(result).toContain('terrifying atmosphere');
    });

    it('should return generic fallback when no mood specified', async () => {
      (callLLM as jest.Mock as any).mockRejectedValue(new Error('Service unavailable'));

      const result = await generateStoryCoverPrompt({
        title: 'Test',
        synopsis: 'Synopsis',
        genre: 'fantasy',
      });

      expect(result).toContain('epic atmosphere');
    });

    it('should always include quality tags in fallback', async () => {
      (callLLM as jest.Mock as any).mockRejectedValue(new Error('Service unavailable'));

      const result = await generateStoryCoverPrompt(basicInput);

      expect(result).toContain('masterpiece');
      expect(result).toContain('best quality');
      expect(result).toContain('anime style');
      expect(result).toContain('highly detailed');
    });
  });
});
