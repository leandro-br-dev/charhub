/**
 * Character Image Analysis Agent Unit Tests
 * Tests for FEATURE-012: Ethnicity classification in image analysis
 */
import { analyzeCharacterImage, CharacterImageAnalysisResult } from '../characterImageAnalysisAgent';
import { callLLM } from '../../services/llm';
import { trackFromLLMResponse } from '../../services/llm/llmUsageTracker';

// Mock dependencies
jest.mock('../../services/llm');
jest.mock('../../services/llm/llmUsageTracker');

describe('characterImageAnalysisAgent', () => {
  const mockImageUrl = 'https://example.com/test-image.jpg';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeCharacterImage', () => {

    it('should successfully analyze character image with ethnicity', async () => {
      const mockAnalysisResult: CharacterImageAnalysisResult = {
        physicalCharacteristics: {
          hairColor: 'purple',
          hairStyle: 'long',
          eyeColor: 'blue',
          skinTone: 'fair',
          height: 'average',
          build: 'slim',
          age: 'young adult',
          gender: 'female',
          species: 'human',
          distinctiveFeatures: ['pointed ears'],
        },
        ethnicity: {
          primary: 'European',
          confidence: 'high',
          features: ['fair skin', 'blue eyes', 'light hair'],
        },
        visualStyle: {
          artStyle: 'anime',
          colorPalette: 'cool tones',
          mood: 'cheerful',
        },
        clothing: {
          outfit: 'fantasy armor',
          style: 'fantasy',
          accessories: ['sword', 'necklace'],
        },
        suggestedTraits: {
          personality: ['brave', 'curious', 'kind'],
          archetype: 'warrior',
          suggestedOccupation: 'knight',
        },
        overallDescription: 'A young female warrior with purple hair and blue eyes, wearing fantasy armor.',
      };

      (callLLM as jest.Mock).mockResolvedValue({
        content: JSON.stringify(mockAnalysisResult),
        model: 'grok-4-1-fast-non-reasoning',
        provider: 'grok',
        usage: { promptTokens: 100, completionTokens: 200 },
      });

      (trackFromLLMResponse as jest.Mock).mockReturnValue(undefined);

      const result = await analyzeCharacterImage(mockImageUrl);

      expect(result).toEqual(mockAnalysisResult);
      expect(callLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'grok',
          model: 'grok-4-1-fast-non-reasoning',
          images: [mockImageUrl],
          temperature: 0.3,
          maxTokens: 1024,
        })
      );
      expect(trackFromLLMResponse).toHaveBeenCalled();
    });

    it('should handle ethnicity with medium confidence', async () => {
      const mockAnalysisResult: CharacterImageAnalysisResult = {
        physicalCharacteristics: {
          hairColor: 'black',
          eyeColor: 'brown',
          skinTone: 'medium',
          gender: 'male',
          species: 'human',
        },
        ethnicity: {
          primary: 'East Asian',
          confidence: 'medium',
          features: ['dark hair', 'brown eyes', 'epicanthic fold'],
        },
        visualStyle: {
          artStyle: 'anime',
        },
        clothing: {},
        suggestedTraits: {},
        overallDescription: 'A male character with East Asian features.',
      };

      (callLLM as jest.Mock).mockResolvedValue({
        content: JSON.stringify(mockAnalysisResult),
        model: 'grok-4-1-fast-non-reasoning',
        provider: 'grok',
        usage: { promptTokens: 100, completionTokens: 200 },
      });

      (trackFromLLMResponse as jest.Mock).mockReturnValue(undefined);

      const result = await analyzeCharacterImage(mockImageUrl);

      expect(result.ethnicity).toEqual({
        primary: 'East Asian',
        confidence: 'medium',
        features: ['dark hair', 'brown eyes', 'epicanthic fold'],
      });
    });

    it('should handle ethnicity with low confidence', async () => {
      const mockAnalysisResult: CharacterImageAnalysisResult = {
        physicalCharacteristics: {
          gender: 'non-binary',
          species: 'human',
        },
        ethnicity: {
          primary: 'Unknown',
          confidence: 'low',
          features: ['ambiguous features'],
        },
        visualStyle: {},
        clothing: {},
        suggestedTraits: {},
        overallDescription: 'A character with ambiguous ethnicity.',
      };

      (callLLM as jest.Mock).mockResolvedValue({
        content: JSON.stringify(mockAnalysisResult),
        model: 'grok-4-1-fast-non-reasoning',
        provider: 'grok',
        usage: { promptTokens: 100, completionTokens: 200 },
      });

      (trackFromLLMResponse as jest.Mock).mockReturnValue(undefined);

      const result = await analyzeCharacterImage(mockImageUrl);

      expect(result.ethnicity).toEqual({
        primary: 'Unknown',
        confidence: 'low',
        features: ['ambiguous features'],
      });
    });

    it('should handle various ethnicity classifications', async () => {
      const ethnicities = [
        'Japanese',
        'East Asian',
        'Southeast Asian',
        'South Asian',
        'Middle Eastern',
        'African',
        'European',
        'Latin American',
        'Indigenous',
        'Fantasy/Non-Human',
        'Unknown',
      ];

      for (const ethnicity of ethnicities) {
        const mockAnalysisResult: CharacterImageAnalysisResult = {
          physicalCharacteristics: {
            gender: 'female',
            species: 'human',
          },
          ethnicity: {
            primary: ethnicity,
            confidence: 'high',
          },
          visualStyle: {},
          clothing: {},
          suggestedTraits: {},
          overallDescription: `A character with ${ethnicity} ethnicity.`,
        };

        (callLLM as jest.Mock).mockResolvedValue({
          content: JSON.stringify(mockAnalysisResult),
          model: 'grok-4-1-fast-non-reasoning',
          provider: 'grok',
          usage: { promptTokens: 100, completionTokens: 200 },
        });

        (trackFromLLMResponse as jest.Mock).mockReturnValue(undefined);

        const result = await analyzeCharacterImage(mockImageUrl);

        expect(result.ethnicity?.primary).toBe(ethnicity);
      }
    });

    it('should handle fantasy/non-human species ethnicity', async () => {
      const mockAnalysisResult: CharacterImageAnalysisResult = {
        physicalCharacteristics: {
          gender: 'female',
          species: 'elf',
        },
        ethnicity: {
          primary: 'Fantasy/Non-Human',
          confidence: 'high',
          features: ['pointed ears', 'slender build'],
        },
        visualStyle: {
          artStyle: 'anime',
        },
        clothing: {},
        suggestedTraits: {},
        overallDescription: 'An elven character with pointed ears.',
      };

      (callLLM as jest.Mock).mockResolvedValue({
        content: JSON.stringify(mockAnalysisResult),
        model: 'grok-4-1-fast-non-reasoning',
        provider: 'grok',
        usage: { promptTokens: 100, completionTokens: 200 },
      });

      (trackFromLLMResponse as jest.Mock).mockReturnValue(undefined);

      const result = await analyzeCharacterImage(mockImageUrl);

      expect(result.ethnicity?.primary).toBe('Fantasy/Non-Human');
      expect(result.physicalCharacteristics.species).toBe('elf');
    });

    it('should handle missing ethnicity field (backward compatibility)', async () => {
      const mockAnalysisResult: CharacterImageAnalysisResult = {
        physicalCharacteristics: {
          hairColor: 'blonde',
          eyeColor: 'green',
          gender: 'female',
          species: 'human',
        },
        ethnicity: undefined, // No ethnicity data
        visualStyle: {
          artStyle: 'realistic',
        },
        clothing: {},
        suggestedTraits: {},
        overallDescription: 'A female character with blonde hair.',
      };

      (callLLM as jest.Mock).mockResolvedValue({
        content: JSON.stringify(mockAnalysisResult),
        model: 'grok-4-1-fast-non-reasoning',
        provider: 'grok',
        usage: { promptTokens: 100, completionTokens: 200 },
      });

      (trackFromLLMResponse as jest.Mock).mockReturnValue(undefined);

      const result = await analyzeCharacterImage(mockImageUrl);

      expect(result.ethnicity).toBeUndefined();
    });

    it('should handle LLM response parse errors gracefully', async () => {
      (callLLM as jest.Mock).mockResolvedValue({
        content: 'Invalid JSON response',
        model: 'grok-4-1-fast-non-reasoning',
        provider: 'grok',
        usage: { promptTokens: 100, completionTokens: 200 },
      });

      (trackFromLLMResponse as jest.Mock).mockReturnValue(undefined);

      const result = await analyzeCharacterImage(mockImageUrl);

      expect(result).toMatchObject({
        physicalCharacteristics: {},
        ethnicity: undefined,
        visualStyle: {},
        clothing: {},
        suggestedTraits: {},
        overallDescription: 'Unable to parse character analysis from image',
      });
    });

    it('should handle LLM call errors gracefully', async () => {
      (callLLM as jest.Mock).mockRejectedValue(new Error('LLM API error'));

      const result = await analyzeCharacterImage(mockImageUrl);

      expect(result).toMatchObject({
        physicalCharacteristics: {},
        ethnicity: undefined,
        visualStyle: {},
        clothing: {},
        suggestedTraits: {},
        overallDescription: 'Error analyzing character image',
      });
    });

    it('should track LLM usage with correct metadata', async () => {
      const mockAnalysisResult: CharacterImageAnalysisResult = {
        physicalCharacteristics: {
          gender: 'female',
          species: 'human',
        },
        ethnicity: {
          primary: 'European',
          confidence: 'high',
        },
        visualStyle: {},
        clothing: {},
        suggestedTraits: {},
        overallDescription: 'A female character.',
      };

      (callLLM as jest.Mock).mockResolvedValue({
        content: JSON.stringify(mockAnalysisResult),
        model: 'grok-4-1-fast-non-reasoning',
        provider: 'grok',
        usage: { promptTokens: 100, completionTokens: 200 },
      });

      (trackFromLLMResponse as jest.Mock).mockReturnValue(undefined);

      await analyzeCharacterImage(mockImageUrl);

      expect(trackFromLLMResponse).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          feature: 'IMAGE_ANALYSIS',
          featureId: mockImageUrl,
          operation: 'character_image_analysis',
          cached: false,
          metadata: {
            imageUrl: mockImageUrl,
            analysisType: 'character',
          },
        })
      );
    });

    it('should use correct system prompt with ethnicity guidelines', async () => {
      const mockAnalysisResult: CharacterImageAnalysisResult = {
        physicalCharacteristics: {
          gender: 'female',
          species: 'human',
        },
        ethnicity: {
          primary: 'Japanese',
          confidence: 'high',
        },
        visualStyle: {},
        clothing: {},
        suggestedTraits: {},
        overallDescription: 'A Japanese female character.',
      };

      (callLLM as jest.Mock).mockResolvedValue({
        content: JSON.stringify(mockAnalysisResult),
        model: 'grok-4-1-fast-non-reasoning',
        provider: 'grok',
        usage: { promptTokens: 100, completionTokens: 200 },
      });

      (trackFromLLMResponse as jest.Mock).mockReturnValue(undefined);

      await analyzeCharacterImage(mockImageUrl);

      expect(callLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: expect.stringContaining('ETHNICITY CLASSIFICATION'),
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty ethnicity features array', async () => {
      const mockAnalysisResult: CharacterImageAnalysisResult = {
        physicalCharacteristics: {
          gender: 'male',
          species: 'human',
        },
        ethnicity: {
          primary: 'Unknown',
          confidence: 'low',
          features: [],
        },
        visualStyle: {},
        clothing: {},
        suggestedTraits: {},
        overallDescription: 'A character with unknown ethnicity.',
      };

      (callLLM as jest.Mock).mockResolvedValue({
        content: JSON.stringify(mockAnalysisResult),
        model: 'grok-4-1-fast-non-reasoning',
        provider: 'grok',
        usage: { promptTokens: 100, completionTokens: 200 },
      });

      (trackFromLLMResponse as jest.Mock).mockReturnValue(undefined);

      const result = await analyzeCharacterImage(mockImageUrl);

      expect(result.ethnicity?.features).toEqual([]);
    });

    it('should handle ethnicity without confidence level', async () => {
      const mockAnalysisResult: CharacterImageAnalysisResult = {
        physicalCharacteristics: {
          gender: 'female',
          species: 'human',
        },
        ethnicity: {
          primary: 'European',
          // confidence field missing
        },
        visualStyle: {},
        clothing: {},
        suggestedTraits: {},
        overallDescription: 'A European female character.',
      };

      (callLLM as jest.Mock).mockResolvedValue({
        content: JSON.stringify(mockAnalysisResult),
        model: 'grok-4-1-fast-non-reasoning',
        provider: 'grok',
        usage: { promptTokens: 100, completionTokens: 200 },
      });

      (trackFromLLMResponse as jest.Mock).mockReturnValue(undefined);

      const result = await analyzeCharacterImage(mockImageUrl);

      expect(result.ethnicity?.primary).toBe('European');
      expect(result.ethnicity?.confidence).toBeUndefined();
    });
  });
});
