/**
 * Story Cover Prompt Agent
 *
 * Specialized AI agent that generates detailed, attractive Stable Diffusion prompts
 * for story cover images based on story synopsis, characters, and themes.
 */

import { logger } from '../config/logger';
import { callLLM } from '../services/llm';
import { trackFromLLMResponse } from '../services/llm/llmUsageTracker';
import { modelRouter } from '../services/llm/modelRouter';

export interface StoryCoverPromptInput {
  title: string;
  synopsis: string;
  genre: string;
  mood?: string;
  mainCharacter?: {
    name?: string;
    description?: string;
    age?: string;
    gender?: string;
    appearance?: string;
    attire?: string;
  };
  secondaryCharacters?: Array<{
    name?: string;
    description?: string;
    appearance?: string;
    attire?: string;
  }>;
  setting?: string;
}

/**
 * Generate a detailed Stable Diffusion prompt for story cover image
 * Uses LLM to create attractive, story-specific prompts
 */
export async function generateStoryCoverPrompt(input: StoryCoverPromptInput): Promise<string> {
  const {
    title,
    synopsis,
    genre,
    mood,
    mainCharacter,
    secondaryCharacters = [],
    setting,
  } = input;

  try {
    // Build character descriptions for the prompt
    const characterDescriptions: string[] = [];

    if (mainCharacter) {
      const mcDesc = [
        mainCharacter.name ? `named ${mainCharacter.name}` : '',
        mainCharacter.age ? `${mainCharacter.age} years old` : '',
        mainCharacter.gender || '',
        mainCharacter.appearance || '',
        mainCharacter.attire ? `wearing ${mainCharacter.attire}` : '',
      ].filter(Boolean).join(', ');

      if (mcDesc) {
        characterDescriptions.push(`Main character (center, prominent): ${mcDesc}`);
      }
    }

    // Add up to 2 secondary characters
    secondaryCharacters.slice(0, 2).forEach((char, index) => {
      const charDesc = [
        char.name ? `named ${char.name}` : '',
        char.appearance || '',
        char.attire ? `wearing ${char.attire}` : '',
      ].filter(Boolean).join(', ');

      if (charDesc) {
        const position = index === 0 ? 'visible on one side' : 'visible on the other side';
        characterDescriptions.push(`Secondary character (${position}): ${charDesc}`);
      }
    });

    const systemPrompt = [
      'You are an expert AI art director specializing in creating Stable Diffusion prompts for story book covers.',
      '',
      'Your task is to generate a DETAILED, ATTRACTIVE prompt that will create a compelling cover image with clearly separated characters.',
      '',
      'CRITICAL REQUIREMENTS:',
      '- Use BREAK to separate different characters clearly',
      '- Describe each character with SPECIFIC VISUAL DETAILS (hair, eyes, clothing, pose)',
      '- Include technical keywords for each character (body type, expression, accessories)',
      '- Put main character FIRST, then use BREAK, then secondary characters',
      '- Use COMMAS to separate description elements within each character',
      '',
      'PROMPT STRUCTURE:',
      '[Character 1 details], [pose/expression], [clothing/attire], [position]',
      'BREAK',
      '[Character 2 details], [pose/expression], [clothing/attire], [position]',
      'BREAK (if more characters)',
      '[Background/setting]',
      '[Lighting/mood keywords]',
      '[Quality tags at the END]',
      '',
      'EXAMPLES OF CHARACTER DESCRIPTIONS:',
      '- "grey hair, long hair, green eyes, twintails, pointy ears, medium breasts, earrings, mature female, subtle curves, kimono, floral print, leaning forward, smile, alluring gaze"',
      '- "red scales, dragon, large wings, amber eyes, semi-recumbent, claws visible, tail visible, powerful build"',
      '- "young woman, long red hair, green eyes, peasant dress, reaching out, excited expression, touching something"',
      '',
      'EXAMPLE OF COMPLETE PROMPT:',
      'obsidian dragon, red sheen, ember eyes, dark purple wings, large claws, semi-recumbent position, powerful build, BREAK, young woman left, long flowing red hair, green eyes, simple peasant dress, warm earth tones, reaching out hand, excited expression, touching scales, BREAK, young woman right, long brown hair, blushing, shy expression, pastel blue dress, holding basket, basket with fruit flowers, cave entrance background, fertile valley view, village visible, playful lighting, humorous mood, (masterpiece:1.2), (best quality:1.2), anime style, highly detailed, cinematic lighting, volumetric lighting',
      '',
      'QUALITY TAGS (always add at the end):',
      '- (masterpiece:1.2), (best quality:1.2), anime style, highly detailed, cinematic lighting, volumetric lighting, detailed background',
      '',
      'POSITIONING KEYWORDS:',
      '- Use "left" or "right" to position characters on sides',
      '- Use "center" for main character',
      '- Use "side-by-side" for characters positioned together',
      '- Use "looking at viewer" or "looking at another" for gaze direction',
      '',
      'DO NOT INCLUDE:',
      '- text, words, letters, numbers, writing, book title, logo',
      '- Names like "Ignis" or character names - use visual descriptions only',
      '- Long emotional descriptions - use expression keywords (smile, blush, confident, shy, etc.)',
      '',
      'Return ONLY the prompt text, nothing else.',
    ].join('\n');

    // Build character context for LLM
    const characterContext = [
      mainCharacter ? `Main Character: ${mainCharacter.gender}, ${mainCharacter.age || 'unknown age'}, ${mainCharacter.appearance || 'not specified'}, ${mainCharacter.attire || 'attire not specified'}` : 'Main Character: not specified',
      secondaryCharacters.length > 0
        ? `Secondary Characters: ${secondaryCharacters.map(c => c.description || c.appearance || 'not specified').join('; ')}`
        : '',
      setting ? `Setting: ${setting}` : '',
    ].filter(Boolean).join('\n');

    const userPrompt = [
      `STORY TITLE: ${title}`,
      `GENRE: ${genre}`,
      `MOOD: ${mood || 'not specified'}`,
      '',
      `SYNOPSIS: ${synopsis}`,
      '',
      characterContext,
      '',
      'Generate a detailed Stable Diffusion prompt for this story cover.',
      '',
      'Remember:',
      '- Describe what should be VISIBLE in the image',
      '- Make it ATTRACTIVE and COMPELLING',
      '- Include the main character prominently',
      '- Use anime/manga style',
      '- Add quality keywords',
      '',
      'Return ONLY the prompt text, nothing else.',
    ].join('\n');

    // Get model for story generation (Grok 4-1 for all)
    const modelSelection = await modelRouter.getModel({ feature: 'STORY_GENERATION' });

    logger.info({
      provider: modelSelection.provider,
      model: modelSelection.model,
      reasoning: modelSelection.reasoning,
    }, 'Model selected for story cover prompt generation');

    const response = await callLLM({
      provider: modelSelection.provider,
      model: modelSelection.model,
      systemPrompt,
      userPrompt,
      temperature: 0.7, // Slightly higher for creativity
      maxTokens: 768, // Increased for more detailed prompts with BREAK syntax
    } as any);

    // Track LLM usage for cost analysis
    trackFromLLMResponse(response, {
      userId: undefined,
      feature: 'AUTOMATED_GENERATION',
      featureId: undefined,
      operation: 'story_cover_prompt_generation',
    });

    let prompt = (response.content || '').trim();

    // Clean up the prompt
    // Remove markdown code blocks if present
    prompt = prompt.replace(/```[\s\S]*?```/g, '');
    // Remove quotes
    prompt = prompt.replace(/^["']|["']$/g, '');
    // Remove common LLM artifacts
    prompt = prompt.replace(/^(Prompt:|Positive:|Image:)\s*/i, '');

    // Ensure essential quality keywords are present
    const essentialKeywords = [
      '(masterpiece:1.2)',
      '(best quality:1.2)',
      'anime style',
      'highly detailed',
      'cinematic lighting',
      'volumetric lighting',
    ];

    const hasEssentialKeywords = essentialKeywords.some(kw =>
      prompt.toLowerCase().includes(kw.toLowerCase())
    );

    if (!hasEssentialKeywords) {
      prompt = `${prompt}, ${essentialKeywords.join(', ')}`;
    }

    // Final sanity check: ensure only ASCII characters
    // eslint-disable-next-line no-control-regex
    let sanitizedPrompt = prompt.replace(/[^\x00-\x7F]+/g, '');

    // Enforce maximum length limit (700 chars to allow for detailed multi-character prompts)
    const MAX_PROMPT_LENGTH = 700;
    if (sanitizedPrompt.length > MAX_PROMPT_LENGTH) {
      // Truncate to last complete sentence under limit
      sanitizedPrompt = sanitizedPrompt.substring(0, MAX_PROMPT_LENGTH);
      const lastComma = sanitizedPrompt.lastIndexOf(',');
      const lastPeriod = sanitizedPrompt.lastIndexOf('.');
      const lastBreak = sanitizedPrompt.lastIndexOf('BREAK');
      const cutPoint = Math.max(lastComma, lastPeriod, lastBreak);
      if (cutPoint > 300) {
        sanitizedPrompt = sanitizedPrompt.substring(0, cutPoint);
      }
      sanitizedPrompt = sanitizedPrompt.trim();
    }

    logger.info({
      title,
      genre,
      prompt: sanitizedPrompt,
      promptLength: sanitizedPrompt.length,
    }, 'story_cover_prompt_generated');

    return sanitizedPrompt;
  } catch (error) {
    logger.error({ error, input }, 'failed_to_generate_cover_prompt');

    // Fallback prompt
    return `masterpiece, best quality, anime style, highly detailed, 8k, cinematic lighting, vibrant colors, professional book cover illustration, ${genre} style, ${mood || 'epic'} atmosphere`;
  }
}
