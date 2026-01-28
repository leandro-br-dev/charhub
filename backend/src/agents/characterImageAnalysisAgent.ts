import { callLLM } from '../services/llm';
import { trackFromLLMResponse } from '../services/llm/llmUsageTracker';
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
    genderConfidence?: 'high' | 'medium' | 'low'; // Confidence in gender detection
    species?: string; // e.g., "human", "elf", "demon", "android", etc.
    distinctiveFeatures?: string[]; // e.g., ["scars on face", "pointed ears", "wings"]
  };

  // Ethnicity Classification (for name generation guidance)
  ethnicity?: {
    primary: string; // Primary ethnicity classification
    confidence?: 'high' | 'medium' | 'low'; // Confidence level in classification
    features?: string[]; // Visual features that support the classification
  };

  // Theme Classification (for character theme detection)
  themeClassification?: {
    theme: 'FANTASY' | 'DARK_FANTASY' | 'FURRY' | 'SCI_FI' | 'GENERAL';
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
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
    '    "genderConfidence": "high|medium|low (optional, confidence in gender detection)",',
    '    "species": "string (e.g., human, elf, demon, android) (optional)",',
    '    "distinctiveFeatures": ["string array of notable features"] (optional)',
    '  },',
    '  "ethnicity": {',
    '    "primary": "string (Japanese|East Asian|Southeast Asian|South Asian|Middle Eastern|African|European|Latin American|Indigenous|Fantasy/Non-Human|Unknown)",',
    '    "confidence": "high|medium|low (optional, based on visual clarity)",',
    '    "features": ["array of visual features that support classification (e.g., skin tone, facial features, hair, clothing)"] (optional)',
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
    '    "personality": ["string array of personality traits"] (optional),',
    '    "archetype": "string (e.g., warrior, mage, scholar) (optional)",',
    '    "suggestedOccupation": "string (optional)"',
    '  },',
    '  "themeClassification": {',
    '    "theme": "FANTASY|DARK_FANTASY|FURRY|SCI_FI|GENERAL (optional)",',
    '    "confidence": "high|medium|low (optional)",',
    '    "reasoning": "string explanation for theme classification (optional)"',
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
    '',
    'GENDER CLASSIFICATION GUIDELINES:',
    '- For humanoid characters (humans, elves, demons, angels, vampires, yokai, kitsune, etc.):',
    '  - You MUST choose one of: "male", "female", or "non-binary"',
    '  - NEVER use "ambiguous" for humanoid characters',
    '  - If uncertain, make your BEST GUESS based on visual cues',
    '- For non-humanoid characters (animals, creatures, monsters, robots, slimes, abstract beings):',
    '  - Use "ambiguous" if gender cannot be determined',
    '  - For creatures with clear sexual dimorphism, use "male" or "female"',
    '',
    'When determining gender for humanoids, consider:',
    '1. Facial structure (jawline, cheekbones, eye shape)',
    '2. Body proportions (shoulder width, hip width, height)',
    '3. Clothing and styling choices',
    '4. Breast presence or absence (for visible anatomy)',
    '5. Overall presentation and expression',
    '',
    'If gender is not immediately obvious but the character is clearly humanoid:',
    '- Look for subtle cues in facial features',
    '- Consider anime/manga art style conventions',
    '- Make a confident determination rather than using "ambiguous"',
    '- When in doubt for humanoid characters, lean toward "female" (most common in anime art)',
    '',
    'THEME CLASSIFICATION GUIDELINES:',
    '- FANTASY: Bright colors, magical elements, medieval/high fantasy setting, elves, wizards, nature spirits, enchanted forests',
    '- DARK_FANTASY: Dark color palette, gothic elements, demons, vampires, dark magic, horror undertones, shadows, corrupted aesthetics',
    '- FURRY: Anthropomorphic animal characters, kemono style, beast-people, animal-human hybrids with fur/feathers/scales',
    '- SCI_FI: Futuristic elements, cybernetic enhancements, robots, androids, space themes, advanced technology, holographic displays',
    '- GENERAL: Modern/contemporary setting, casual clothing, no strong thematic elements, everyday scenarios',
    '',
    'When analyzing theme, consider:',
    '1. Color palette (dark vs bright, saturated vs muted)',
    '2. Setting and background elements (castles, forests, cities, space, etc.)',
    '3. Character type (human, fantasy creature, robot, animal-human hybrid)',
    '4. Mood and atmosphere (whimsical, ominous, futuristic, ordinary)',
    '5. Clothing and equipment style (armor, robes, tech wear, casual)',
    '',
    'Confidence levels:',
    '- high: Multiple clear visual indicators match the theme',
    '- medium: Some visual indicators present, theme is likely but not certain',
    '- low: Few or ambiguous indicators, theme is a tentative guess',
    '',
    'ETHNICITY CLASSIFICATION: Base ethnicity on VISUAL FEATURES (skin tone, facial features, hair, clothing, cultural markers)',
    '  - Japanese: East Asian features with Japanese cultural elements',
    '  - East Asian: Chinese, Korean, or general East Asian features',
    '  - Southeast Asian: Thai, Vietnamese, Filipino, Indonesian features',
    '  - South Asian: Indian, Pakistani, Bangladeshi features',
    '  - Middle Eastern: Arab, Persian, Turkish features',
    '  - African: Sub-Saharan African features',
    '  - European: Caucasian features (various regions)',
    '  - Latin American: Hispanic/Latino features (mixed heritage)',
    '  - Indigenous: Native/Aboriginal features',
    '  - Fantasy/Non-Human: Clearly non-human species (elf, alien, etc.)',
    '  - Unknown: Cannot determine or mixed/ambiguous features',
    '- CONFIDENCE LEVELS: "high" (clear features), "medium" (somewhat clear), "low" (unclear or ambiguous)',
    '- If you cannot identify a character or the image is unclear, set overallDescription to "Unable to analyze character from image" and leave other fields empty',
  ].join('\n');
}

function buildUserPrompt(): string {
  return [
    'Analyze the character in the provided image and extract information as per the JSON schema.',
    '',
    'CRITICAL: Only describe what is ACTUALLY VISIBLE in the image. Do not invent or hallucinate details.',
    'If a feature is not clearly visible, omit it from the JSON response.',
    'Focus on objective, observable visual details only.',
  ].join('\n');
}

export async function analyzeCharacterImage(imageUrl: string): Promise<CharacterImageAnalysisResult> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt();

  try {
    const response = await callLLM({
      provider: 'grok',
      model: 'grok-4-1-fast-non-reasoning',
      systemPrompt,
      userPrompt,
      images: [imageUrl], // Pass image URL for vision analysis
      temperature: 0.3, // Slightly higher than 0 for more creative trait suggestions
      maxTokens: 1024,
    } as any);

    // Track LLM usage for cost analysis
    trackFromLLMResponse(response, {
      feature: 'IMAGE_ANALYSIS',
      featureId: imageUrl, // Use imageUrl as the feature ID
      operation: 'character_image_analysis',
      cached: false,
      metadata: {
        imageUrl,
        analysisType: 'character',
      },
    });

    const raw = (response.content || '').trim();

    try {
      const parsed = parseJsonSafe<CharacterImageAnalysisResult>(raw);

      // Validate and sanitize the response
      const result: CharacterImageAnalysisResult = {
        physicalCharacteristics: parsed.physicalCharacteristics || {},
        ethnicity: parsed.ethnicity, // Optional field, don't provide default
        themeClassification: parsed.themeClassification, // Optional field, don't provide default
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
        ethnicity: undefined,
        themeClassification: undefined,
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
      ethnicity: undefined,
      themeClassification: undefined,
      visualStyle: {},
      clothing: {},
      suggestedTraits: {},
      overallDescription: 'Error analyzing character image',
    };
  }
}
