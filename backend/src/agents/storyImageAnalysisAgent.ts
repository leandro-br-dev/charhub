import { callLLM } from '../services/llm';
import { logger } from '../config/logger';
import { parseJsonSafe } from '../utils/json';

export type StoryImageAnalysisResult = {
  // Setting & Environment
  setting?: string; // e.g., "medieval castle", "modern coffee shop", "spaceship bridge"
  environment?: string; // Brief description of the environment

  // Atmosphere & Mood
  mood?: string; // e.g., "mysterious", "peaceful", "tense", "magical"
  atmosphere?: string; // Brief description of the atmosphere

  // Visual Analysis
  timeOfDay?: string; // e.g., "day", "night", "sunset", "dawn"
  visualStyle?: string; // e.g., "anime", "realistic", "semi-realistic", "cartoon"
  colorPalette?: string; // e.g., "warm tones", "cool tones", "dark", "vibrant"

  // Story Suggestions
  suggestedGenre?: string; // e.g., "fantasy", "sci-fi", "romance", "mystery", "horror"
  suggestedThemes?: string[]; // e.g., ["adventure", "betrayal", "friendship"]
  keyElements?: string[]; // e.g., ["sword", "magic circle", "throne", "spaceship"]

  // Overall Description
  overallDescription: string; // 2-3 sentence description in en-US
};

function buildSystemPrompt(): string {
  return [
    'You are a precise story scene image analyzer specialized in extracting story-relevant details from images.',
    'Given an input image, analyze the scene and return strictly a JSON object with the following structure:',
    '',
    '{',
    '  "setting": "string (optional) - e.g., medieval castle, modern coffee shop, spaceship bridge, forest path",',
    '  "environment": "string (optional) - brief description of the environment",',
    '  "mood": "string (optional) - e.g., mysterious, peaceful, tense, magical, melancholic",',
    '  "atmosphere": "string (optional) - brief description of the atmosphere",',
    '  "timeOfDay": "string (optional) - e.g., day, night, sunset, dawn",',
    '  "visualStyle": "string (optional) - e.g., anime, realistic, semi-realistic, cartoon, pixel art",',
    '  "colorPalette": "string (optional) - e.g., warm tones, cool tones, dark, vibrant, muted",',
    '  "suggestedGenre": "string (optional) - e.g., fantasy, sci-fi, romance, mystery, horror, adventure",',
    '  "suggestedThemes": ["array of 3-5 themes"] (optional) - e.g., ["adventure", "betrayal", "friendship", "redemption"]',
    '  "keyElements": ["array of 3-5 notable objects/elements"] (optional) - e.g., ["sword", "magic circle", "throne"]',
    '  "overallDescription": "2-3 sentence description in en-US of what this scene could be for a story"',
    '}',
    '',
    'Important guidelines:',
    '- All fields except "overallDescription" are optional - only include what you can confidently identify',
    '- Be specific but concise in descriptions',
    '- For arrays, limit to 3-5 most prominent items',
    '- Use en-US for all text',
    '- Return ONLY valid JSON, no markdown, no commentary',
    '- Focus on elements that would be relevant for creating a story or narrative',
    '- If the image is unclear or not a scene, set overallDescription to "Unable to analyze scene from image" and leave other fields empty',
  ].join('\n');
}

function buildUserPrompt(): string {
  return [
    'Analyze the scene in the provided image and extract story-relevant information as per the JSON schema.',
    '',
    'CRITICAL: Only describe what is ACTUALLY VISIBLE in the image. Do not invent or hallucinate details.',
    'If a feature is not clearly visible, omit it from the JSON response.',
    'Focus on objective, observable visual details that would be relevant for creating a story.',
    '',
    'Think about: Where could this story take place? What kind of story might happen here?',
  ].join('\n');
}

export async function analyzeStoryImage(imageUrl: string): Promise<StoryImageAnalysisResult> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt();

  try {
    const response = await callLLM({
      provider: 'grok',
      model: 'grok-4-fast-non-reasoning',
      systemPrompt,
      userPrompt,
      images: [imageUrl], // Pass image URL for vision analysis
      temperature: 0.3,
      maxTokens: 1024,
    } as any);

    const raw = (response.content || '').trim();

    try {
      const parsed = parseJsonSafe<StoryImageAnalysisResult>(raw);

      // Validate and sanitize the response
      const result: StoryImageAnalysisResult = {
        setting: parsed.setting,
        environment: parsed.environment,
        mood: parsed.mood,
        atmosphere: parsed.atmosphere,
        timeOfDay: parsed.timeOfDay,
        visualStyle: parsed.visualStyle,
        colorPalette: parsed.colorPalette,
        suggestedGenre: parsed.suggestedGenre,
        suggestedThemes: parsed.suggestedThemes || [],
        keyElements: parsed.keyElements || [],
        overallDescription: typeof parsed.overallDescription === 'string'
          ? parsed.overallDescription
          : 'Scene analysis completed',
      };

      logger.info({ imageUrl, result }, 'story_image_analysis_success');
      return result;

    } catch (parseError) {
      logger.warn({ raw, error: parseError }, 'story_image_analysis_parse_failed');

      // Return minimal valid result
      return {
        suggestedThemes: [],
        keyElements: [],
        overallDescription: 'Unable to parse story scene analysis from image',
      };
    }

  } catch (error) {
    logger.error({ error, imageUrl }, 'story_image_analysis_error');

    // Return minimal valid result on error
    return {
      suggestedThemes: [],
      keyElements: [],
      overallDescription: 'Error analyzing story scene image',
    };
  }
}
