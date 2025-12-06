import { callLLM } from '../services/llm';
import { logger } from '../config/logger';
import { parseJsonSafe } from '../utils/json';

export type CharacterImageAnalysisResult = {
  // Physical Appearance
  physicalCharacteristics: {
    hairColor?: string;
    hairStyle?: string;
    eyeColor?: string;
    skinTone?: string;
    height?: 'very short' | 'short' | 'average' | 'tall' | 'very tall';
    build?: 'slim' | 'average' | 'athletic' | 'muscular' | 'heavyset';
    age?: 'child' | 'teenager' | 'young adult' | 'adult' | 'middle-aged' | 'elderly';
    gender?: 'male' | 'female' | 'non-binary' | 'ambiguous';
    species?: string; // e.g., "human", "elf", "demon", "android", etc.
    distinctiveFeatures?: string[]; // e.g., ["scars on face", "pointed ears", "wings"]
  };

  // Visual Style
  visualStyle: {
    artStyle?: 'anime' | 'realistic' | 'semi-realistic' | 'cartoon' | 'chibi' | 'pixel art' | 'other';
    colorPalette?: string; // e.g., "warm tones", "cool tones", "monochrome", "vibrant"
    mood?: string; // e.g., "cheerful", "mysterious", "intense", "melancholic"
  };

  // Clothing & Accessories
  clothing: {
    outfit?: string; // Brief description of main clothing
    style?: string; // e.g., "casual", "formal", "fantasy", "sci-fi", "modern"
    accessories?: string[]; // e.g., ["sword", "necklace", "hat"]
  };

  // Suggested Character Traits (based on visual analysis)
  suggestedTraits: {
    personality?: string[]; // e.g., ["confident", "mysterious", "friendly"]
    archetype?: string; // e.g., "warrior", "mage", "scholar", "rebel"
    suggestedOccupation?: string; // e.g., "knight", "student", "detective"
  };

  // Overall Description
  overallDescription: string; // 2-3 sentence description in en-US
};

function buildSystemPrompt(): string {
  return [
    'You are a precise character image analyzer specialized in extracting character details from images.',
    'Given an input image, analyze the character and return strictly a JSON object with the following structure:',
    '',
    '{',
    '  "physicalCharacteristics": {',
    '    "hairColor": "string (optional)",',
    '    "hairStyle": "string (optional)",',
    '    "eyeColor": "string (optional)",',
    '    "skinTone": "string (optional)",',
    '    "height": "very short|short|average|tall|very tall (optional)",',
    '    "build": "slim|average|athletic|muscular|heavyset (optional)",',
    '    "age": "child|teenager|young adult|adult|middle-aged|elderly (optional)",',
    '    "gender": "male|female|non-binary|ambiguous (optional)",',
    '    "species": "string (e.g., human, elf, demon, android) (optional)",',
    '    "distinctiveFeatures": ["string array of notable features"] (optional)',
    '  },',
    '  "visualStyle": {',
    '    "artStyle": "anime|realistic|semi-realistic|cartoon|chibi|pixel art|other (optional)",',
    '    "colorPalette": "string description (optional)",',
    '    "mood": "string (optional)"',
    '  },',
    '  "clothing": {',
    '    "outfit": "string description (optional)",',
    '    "style": "string (e.g., casual, formal, fantasy, sci-fi) (optional)",',
    '    "accessories": ["string array"] (optional)',
    '  },',
    '  "suggestedTraits": {',
    '    "personality": ["string array of personality traits"] (optional)",',
    '    "archetype": "string (e.g., warrior, mage, scholar) (optional)",',
    '    "suggestedOccupation": "string (optional)"',
    '  },',
    '  "overallDescription": "2-3 sentence description in en-US"',
    '}',
    '',
    'Important guidelines:',
    '- All fields except "overallDescription" are optional - only include what you can confidently identify',
    '- Be specific but concise in descriptions',
    '- For arrays, limit to 3-5 most prominent items',
    '- Use en-US for all text',
    '- Return ONLY valid JSON, no markdown, no commentary',
    '- If you cannot identify a character or the image is unclear, set overallDescription to "Unable to analyze character from image" and leave other fields empty',
  ].join('\n');
}

function buildUserPrompt(imageUrl: string): string {
  return [
    `Image URL: ${imageUrl}`,
    '',
    'Analyze this image and extract character information as per the JSON schema provided.',
    'Focus on visual details that can help describe and generate this character.',
  ].join('\n');
}

export async function analyzeCharacterImage(imageUrl: string): Promise<CharacterImageAnalysisResult> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(imageUrl);

  try {
    const response = await callLLM({
      provider: 'grok',
      model: 'grok-4-fast-non-reasoning',
      systemPrompt,
      userPrompt,
      temperature: 0.3, // Slightly higher than 0 for more creative trait suggestions
      maxTokens: 1024,
    } as any);

    const raw = (response.content || '').trim();

    try {
      const parsed = parseJsonSafe<CharacterImageAnalysisResult>(raw);

      // Validate and sanitize the response
      const result: CharacterImageAnalysisResult = {
        physicalCharacteristics: parsed.physicalCharacteristics || {},
        visualStyle: parsed.visualStyle || {},
        clothing: parsed.clothing || {},
        suggestedTraits: parsed.suggestedTraits || {},
        overallDescription: typeof parsed.overallDescription === 'string'
          ? parsed.overallDescription
          : 'Character analysis completed',
      };

      logger.info({ imageUrl, result }, 'character_image_analysis_success');
      return result;

    } catch (parseError) {
      logger.warn({ raw, error: parseError }, 'character_image_analysis_parse_failed');

      // Return minimal valid result
      return {
        physicalCharacteristics: {},
        visualStyle: {},
        clothing: {},
        suggestedTraits: {},
        overallDescription: 'Unable to parse character analysis from image',
      };
    }

  } catch (error) {
    logger.error({ error, imageUrl }, 'character_image_analysis_error');

    // Return minimal valid result on error
    return {
      physicalCharacteristics: {},
      visualStyle: {},
      clothing: {},
      suggestedTraits: {},
      overallDescription: 'Error analyzing character image',
    };
  }
}
