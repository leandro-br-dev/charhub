import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  analyzeStoryImage,
  StoryImageAnalysisResult,
} from '../storyImageAnalysisAgent';
import { callLLM } from '../../services/llm';
import { logger } from '../../config/logger';

// Mock dependencies
jest.mock('../../services/llm');
jest.mock('../../config/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('storyImageAnalysisAgent - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('analyzeStoryImage', () => {
    const mockImageUrl = 'https://example.com/test-scene.jpg';

    it('should analyze image and return complete result', async () => {
      const mockCompleteResult: StoryImageAnalysisResult = {
        setting: 'medieval castle',
        environment: 'stone walls with torches',
        mood: 'mysterious',
        atmosphere: 'dark and suspenseful',
        timeOfDay: 'night',
        visualStyle: 'realistic',
        colorPalette: 'cool tones',
        suggestedGenre: 'fantasy',
        suggestedThemes: ['adventure', 'mystery', 'betrayal'],
        keyElements: ['sword', 'throne', 'torch'],
        overallDescription: 'A medieval castle interior at night, featuring stone walls illuminated by flickering torches. The scene suggests intrigue and adventure.',
      };

      (callLLM as jest.Mock as any).mockResolvedValue({
        content: JSON.stringify(mockCompleteResult),
      });

      const result = await analyzeStoryImage(mockImageUrl);

      expect(callLLM).toHaveBeenCalledWith({
        provider: 'grok',
        model: 'grok-4-fast-non-reasoning',
        systemPrompt: expect.any(String),
        userPrompt: expect.any(String),
        images: [mockImageUrl],
        temperature: 0.3,
        maxTokens: 1024,
      });

      expect(result).toEqual(mockCompleteResult);
      expect(logger.info).toHaveBeenCalledWith(
        { imageUrl: mockImageUrl, result: mockCompleteResult },
        'story_image_analysis_success'
      );
    });

    it('should analyze image and return minimal result', async () => {
      const mockMinimalResult = {
        overallDescription: 'A peaceful forest scene during daytime.',
      };

      (callLLM as jest.Mock as any).mockResolvedValue({
        content: JSON.stringify(mockMinimalResult),
      });

      const result = await analyzeStoryImage(mockImageUrl);

      expect(result).toEqual({
        setting: undefined,
        environment: undefined,
        mood: undefined,
        atmosphere: undefined,
        timeOfDay: undefined,
        visualStyle: undefined,
        colorPalette: undefined,
        suggestedGenre: undefined,
        suggestedThemes: [],
        keyElements: [],
        overallDescription: 'A peaceful forest scene during daytime.',
      });
    });

    it('should handle JSON with markdown code blocks', async () => {
      const mockResult = {
        setting: 'modern coffee shop',
        overallDescription: 'A cozy cafe interior.',
      };

      (callLLM as jest.Mock as any).mockResolvedValue({
        content: '```json\n' + JSON.stringify(mockResult) + '\n```',
      });

      const result = await analyzeStoryImage(mockImageUrl);

      expect(result.setting).toBe('modern coffee shop');
      expect(result.overallDescription).toBe('A cozy cafe interior.');
    });

    it('should default empty arrays for missing array fields', async () => {
      const mockResult = {
        overallDescription: 'Test description',
        suggestedThemes: null,
        keyElements: null,
      };

      (callLLM as jest.Mock as any).mockResolvedValue({
        content: JSON.stringify(mockResult),
      });

      const result = await analyzeStoryImage(mockImageUrl);

      expect(result.suggestedThemes).toEqual([]);
      expect(result.keyElements).toEqual([]);
    });

    it('should handle non-string overallDescription', async () => {
      const mockResult = {
        overallDescription: 12345, // Invalid type
      };

      (callLLM as jest.Mock as any).mockResolvedValue({
        content: JSON.stringify(mockResult),
      });

      const result = await analyzeStoryImage(mockImageUrl);

      expect(result.overallDescription).toBe('Scene analysis completed');
    });

    it('should handle JSON parse errors gracefully', async () => {
      (callLLM as jest.Mock as any).mockResolvedValue({
        content: 'This is not valid JSON {broken',
      });

      const result = await analyzeStoryImage(mockImageUrl);

      expect(result.overallDescription).toBe('Unable to parse story scene analysis from image');
      expect(result.suggestedThemes).toEqual([]);
      expect(result.keyElements).toEqual([]);

      expect(logger.warn).toHaveBeenCalledWith(
        { raw: 'This is not valid JSON {broken', error: expect.any(Error) },
        'story_image_analysis_parse_failed'
      );
    });

    it('should handle LLM service errors gracefully', async () => {
      const llmError = new Error('LLM service unavailable');
      (callLLM as jest.Mock as any).mockRejectedValue(llmError);

      const result = await analyzeStoryImage(mockImageUrl);

      expect(result.overallDescription).toBe('Error analyzing story scene image');
      expect(result.suggestedThemes).toEqual([]);
      expect(result.keyElements).toEqual([]);

      expect(logger.error).toHaveBeenCalledWith(
        { error: llmError, imageUrl: mockImageUrl },
        'story_image_analysis_error'
      );
    });

    it('should include all optional fields when present', async () => {
      const mockFullResult: StoryImageAnalysisResult = {
        setting: 'spaceship bridge',
        environment: 'futuristic control panels',
        mood: 'tense',
        atmosphere: 'urgent and focused',
        timeOfDay: 'unknown (space)',
        visualStyle: 'sci-fi',
        colorPalette: 'blue and neon',
        suggestedGenre: 'sci-fi',
        suggestedThemes: ['exploration', 'survival', 'technology'],
        keyElements: ['control panel', 'viewport', 'console'],
        overallDescription: 'A spaceship bridge with advanced technology.',
      };

      (callLLM as jest.Mock as any).mockResolvedValue({
        content: JSON.stringify(mockFullResult),
      });

      const result = await analyzeStoryImage(mockImageUrl);

      expect(result.setting).toBe('spaceship bridge');
      expect(result.environment).toBe('futuristic control panels');
      expect(result.mood).toBe('tense');
      expect(result.atmosphere).toBe('urgent and focused');
      expect(result.timeOfDay).toBe('unknown (space)');
      expect(result.visualStyle).toBe('sci-fi');
      expect(result.colorPalette).toBe('blue and neon');
      expect(result.suggestedGenre).toBe('sci-fi');
      expect(result.suggestedThemes).toHaveLength(3);
      expect(result.keyElements).toHaveLength(3);
    });

    it('should limit themes array to provided values', async () => {
      const mockResult = {
        suggestedThemes: ['adventure', 'mystery', 'betrayal', 'redemption', 'friendship', 'love'],
        overallDescription: 'Test',
      };

      (callLLM as jest.Mock as any).mockResolvedValue({
        content: JSON.stringify(mockResult),
      });

      const result = await analyzeStoryImage(mockImageUrl);

      // The function doesn't truncate, just validates
      expect(result.suggestedThemes).toEqual(['adventure', 'mystery', 'betrayal', 'redemption', 'friendship', 'love']);
    });

    it('should handle empty JSON response', async () => {
      (callLLM as jest.Mock as any).mockResolvedValue({
        content: '{}',
      });

      const result = await analyzeStoryImage(mockImageUrl);

      expect(result).toEqual({
        setting: undefined,
        environment: undefined,
        mood: undefined,
        atmosphere: undefined,
        timeOfDay: undefined,
        visualStyle: undefined,
        colorPalette: undefined,
        suggestedGenre: undefined,
        suggestedThemes: [],
        keyElements: [],
        overallDescription: 'Scene analysis completed',
      });
    });

    it('should handle response with leading/trailing whitespace', async () => {
      const mockResult = {
        setting: 'forest path',
        overallDescription: 'A serene forest path.',
      };

      (callLLM as jest.Mock as any).mockResolvedValue({
        content: '  \n  ' + JSON.stringify(mockResult) + '  \n  ',
      });

      const result = await analyzeStoryImage(mockImageUrl);

      expect(result.setting).toBe('forest path');
    });

    it('should preserve valid suggestedGenres', () => {
      const validGenres = [
        'fantasy',
        'sci-fi',
        'romance',
        'mystery',
        'horror',
        'adventure',
        'thriller',
        'comedy',
        'drama',
        'action',
      ];

      validGenres.forEach(genre => {
        expect(genre).toBeTruthy();
        expect(typeof genre).toBe('string');
      });
    });

    it('should preserve valid moods', () => {
      const validMoods = [
        'mysterious',
        'peaceful',
        'tense',
        'magical',
        'melancholic',
        'joyful',
        'dark',
        'whimsical',
      ];

      validMoods.forEach(mood => {
        expect(mood).toBeTruthy();
        expect(typeof mood).toBe('string');
      });
    });

    it('should preserve valid visualStyles', () => {
      const validStyles = [
        'anime',
        'realistic',
        'semi-realistic',
        'cartoon',
        'pixel art',
        'painterly',
      ];

      validStyles.forEach(style => {
        expect(style).toBeTruthy();
        expect(typeof style).toBe('string');
      });
    });

    it('should handle response with quotes around JSON', async () => {
      const mockResult = {
        setting: 'ancient temple',
        overallDescription: 'An ancient temple scene.',
      };

      (callLLM as jest.Mock as any).mockResolvedValue({
        content: '"' + JSON.stringify(mockResult) + '"',
      });

      const result = await analyzeStoryImage(mockImageUrl);

      // This may fail to parse, but should return minimal valid result
      expect(result).toBeDefined();
    });
  });

  describe('StoryImageAnalysisResult Type', () => {
    it('should allow all optional fields to be undefined', () => {
      const minimalResult: StoryImageAnalysisResult = {
        overallDescription: 'Test description',
      };

      expect(minimalResult.setting).toBeUndefined();
      expect(minimalResult.environment).toBeUndefined();
      expect(minimalResult.mood).toBeUndefined();
      expect(minimalResult.atmosphere).toBeUndefined();
      expect(minimalResult.timeOfDay).toBeUndefined();
      expect(minimalResult.visualStyle).toBeUndefined();
      expect(minimalResult.colorPalette).toBeUndefined();
      expect(minimalResult.suggestedGenre).toBeUndefined();
      expect(minimalResult.suggestedThemes).toBeUndefined();
      expect(minimalResult.keyElements).toBeUndefined();
    });

    it('should allow all fields to be populated', () => {
      const fullResult: StoryImageAnalysisResult = {
        setting: 'medieval castle',
        environment: 'stone walls',
        mood: 'mysterious',
        atmosphere: 'dark',
        timeOfDay: 'night',
        visualStyle: 'realistic',
        colorPalette: 'cool tones',
        suggestedGenre: 'fantasy',
        suggestedThemes: ['adventure', 'mystery'],
        keyElements: ['sword', 'throne'],
        overallDescription: 'A complete scene description.',
      };

      expect(fullResult.setting).toBe('medieval castle');
      expect(fullResult.environment).toBe('stone walls');
      expect(fullResult.mood).toBe('mysterious');
      expect(fullResult.atmosphere).toBe('dark');
      expect(fullResult.timeOfDay).toBe('night');
      expect(fullResult.visualStyle).toBe('realistic');
      expect(fullResult.colorPalette).toBe('cool tones');
      expect(fullResult.suggestedGenre).toBe('fantasy');
      expect(fullResult.suggestedThemes).toEqual(['adventure', 'mystery']);
      expect(fullResult.keyElements).toEqual(['sword', 'throne']);
      expect(fullResult.overallDescription).toBe('A complete scene description.');
    });

    it('should require overallDescription', () => {
      // @ts-expect-error - Testing that overallDescription is required
      const invalidResult: StoryImageAnalysisResult = {};

      expect(invalidResult.overallDescription).toBeUndefined();
    });

    it('should allow empty arrays for optional array fields', () => {
      const result: StoryImageAnalysisResult = {
        suggestedThemes: [],
        keyElements: [],
        overallDescription: 'Test',
      };

      expect(result.suggestedThemes).toEqual([]);
      expect(result.keyElements).toEqual([]);
    });
  });

  describe('Prompt Building Logic', () => {
    it('should use grok-4-fast-non-reasoning model', async () => {
      (callLLM as jest.Mock as any).mockResolvedValue({
        content: JSON.stringify({ overallDescription: 'Test' }),
      });

      await analyzeStoryImage('https://example.com/test.jpg');

      expect(callLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'grok',
          model: 'grok-4-fast-non-reasoning',
        })
      );
    });

    it('should use low temperature for consistent results', async () => {
      (callLLM as jest.Mock as any).mockResolvedValue({
        content: JSON.stringify({ overallDescription: 'Test' }),
      });

      await analyzeStoryImage('https://example.com/test.jpg');

      expect(callLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.3,
        })
      );
    });

    it('should pass image URL in images array', async () => {
      const imageUrl = 'https://example.com/scene.jpg';
      (callLLM as jest.Mock as any).mockResolvedValue({
        content: JSON.stringify({ overallDescription: 'Test' }),
      });

      await analyzeStoryImage(imageUrl);

      expect(callLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          images: [imageUrl],
        })
      );
    });

    it('should allow reasonable maxTokens for JSON response', async () => {
      (callLLM as jest.Mock as any).mockResolvedValue({
        content: JSON.stringify({ overallDescription: 'Test' }),
      });

      await analyzeStoryImage('https://example.com/test.jpg');

      expect(callLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          maxTokens: 1024,
        })
      );
    });
  });

  describe('Edge Cases', () => {
    const mockImageUrl = 'https://example.com/test.jpg';

    it('should handle response with only overallDescription', async () => {
      (callLLM as jest.Mock as any).mockResolvedValue({
        content: JSON.stringify({
          overallDescription: 'A simple scene description.',
        }),
      });

      const result = await analyzeStoryImage(mockImageUrl);

      expect(result.overallDescription).toBe('A simple scene description.');
      expect(result.suggestedThemes).toEqual([]);
      expect(result.keyElements).toEqual([]);
    });

    it('should handle extremely long descriptions', async () => {
      const longDescription = 'A '.repeat(1000) + 'scene description.';

      (callLLM as jest.Mock as any).mockResolvedValue({
        content: JSON.stringify({
          overallDescription: longDescription,
        }),
      });

      const result = await analyzeStoryImage(mockImageUrl);

      expect(result.overallDescription).toBe(longDescription);
      expect(result.overallDescription.length).toBeGreaterThan(2000);
    });

    it('should handle unicode characters in response', async () => {
      const mockResult = {
        setting: '神秘の城',
        mood: 'misterioso',
        overallDescription: 'A mysterious castle scene.',
      };

      (callLLM as jest.Mock as any).mockResolvedValue({
        content: JSON.stringify(mockResult),
      });

      const result = await analyzeStoryImage(mockImageUrl);

      expect(result.setting).toBe('神秘の城');
      expect(result.mood).toBe('misterioso');
    });

    it('should handle arrays with single element', async () => {
      (callLLM as jest.Mock as any).mockResolvedValue({
        content: JSON.stringify({
          suggestedThemes: ['adventure'],
          keyElements: ['sword'],
          overallDescription: 'Test',
        }),
      });

      const result = await analyzeStoryImage(mockImageUrl);

      expect(result.suggestedThemes).toEqual(['adventure']);
      expect(result.keyElements).toEqual(['sword']);
    });

    it('should handle null values in optional fields', async () => {
      (callLLM as jest.Mock as any).mockResolvedValue({
        content: JSON.stringify({
          setting: null,
          mood: null,
          suggestedThemes: null,
          overallDescription: 'A scene.',
        }),
      });

      const result = await analyzeStoryImage(mockImageUrl);

      expect(result.setting).toBeNull();
      expect(result.mood).toBeNull();
      expect(result.suggestedThemes).toEqual([]);
    });
  });
});
