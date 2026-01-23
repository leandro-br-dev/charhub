/**
 * Prompt Engineering Service
 * Builds Stable Diffusion prompts from character/story data
 * Based on old project: backend/app/prompts/image_gen_prompts.py
 */

import type { SDPrompt, LoraConfig } from './types';
import { callGemini } from '../llm/gemini';

// Aesthetic quality tags for pony/illustrious models
const AESTHETIC_SCORE_TAGS = 'score_9, score_8_up, score_7_up';

// Standard negative prompt to avoid common issues
// Simplified with: no numerical weights, max 5 parenthetical tags, no unused embeddings
const STANDARD_NEGATIVE_PROMPT =
  '2girls, multiple views, grid layout, chibi, miniature, ' +
  'clone, duplicate, cropped, ' +
  'worst quality, bad quality, jpeg artifacts, sketch, signature, watermark, username, ' +
  'censored, bar_censor, mosaic_censor, simple background, conjoined, bad anatomy, bad hands, ' +
  'bad mouth, bad tongue, bad arms, extra arms, bad eyes, extra limbs, speech bubble, dialogue bubble, ' +
  'emoji, icon, text box, ' +
  // Facial artifact inhibitors (FEATURE-013) - simplified to essential tags only
  '(liquid on face), (facial scars), (face marks), (multiple characters), (multiple views)';

// Avatar-specific negative prompt (face-only generation)
const AVATAR_NEGATIVE_PROMPT =
  STANDARD_NEGATIVE_PROMPT +
  ', body, shoulders, chest, full body, wide angle';

// Reference image negative prompt (full body views)
const REFERENCE_NEGATIVE_PROMPT = STANDARD_NEGATIVE_PROMPT;

interface CharacterPromptData {
  name: string;
  style?: string;
  age?: number;
  gender?: string;
  species?: string;
  physicalCharacteristics?: string;
  defaultAttire?: string;
  lora?: {
    name: string;
    filepathRelative: string;
  };
}

export class PromptEngineering {
  /**
   * Convert prose description to Stable Diffusion tags (en-US)
   * Uses LLM to extract visual features and translate to SD format
   */
  async convertToSDTags(description: string, forCover = false): Promise<string> {
    if (!description || description.trim().length === 0) {
      return '';
    }

    // For cover: each tag gets its own parentheses for emphasis
    // This is important because user-provided tags should override reference images
    const userPrompt = forCover
      ? `Convert the following scene/clothing description into Stable Diffusion tags in English.

RULES:
1. Extract ONLY visual/physical features (location, clothing, accessories, props, background elements)
2. Use danbooru-style tags: "beach, pink bikini, yellow float"
3. **CRITICAL**: Wrap EACH tag separately in double parentheses - ((tag1)), ((tag2)), ((tag3))
   This ensures maximum emphasis to override reference images
4. Output ONLY the tags separated by commas, NO explanations
5. Use English (en-US) only
6. Keep it concise - max 15 tags
7. Use specific colors, styles, and measurements when mentioned

Example:
Input: "beach with pink bikini and yellow float"
Output: ((beach)), ((pink bikini)), ((yellow float))

Description:
${description}

SD Tags:`
      : `Convert the following character description into concise Stable Diffusion tags in English.

RULES:
1. Extract ONLY visual/physical features (hair, eyes, body, clothing, accessories)
2. Use danbooru-style tags: "blue hair, red eyes, tall, slender"
3. Output ONLY the tags separated by commas, NO explanations
4. Use English (en-US) only
5. Keep it concise - max 15 tags
6. Use specific colors, styles, and measurements when mentioned

Description:
${description}

SD Tags:`;

    try {
      const response = await callGemini({
        model: 'gemini-2.5-flash-lite',
        systemPrompt: forCover
          ? 'You are a Stable Diffusion prompt expert. Output ONLY tags with each tag wrapped in its own double parentheses ((tag)), separated by commas. This is critical for proper emphasis.'
          : 'You are a Stable Diffusion prompt expert. Output only comma-separated tags, nothing else.',
        userPrompt,
        maxTokens: 150,
        temperature: 0.3,
      });

      return response.content.trim();
    } catch (error) {
      console.error('Failed to convert description to SD tags:', error);
      // Fallback: return empty string if LLM fails
      return '';
    }
  }

  /**
   * Build avatar prompt for character portrait
   */
  async buildAvatarPrompt(character: CharacterPromptData): Promise<SDPrompt> {
    const genderTag = this.getGenderTag(character.gender);
    const loraName = character.lora?.name?.split('|')[0]?.trim() || character.name;

    // Convert character descriptions to SD tags (in English)
    const physicalTags = character.physicalCharacteristics
      ? await this.convertToSDTags(character.physicalCharacteristics)
      : '';
    const attireTags = character.defaultAttire ? await this.convertToSDTags(character.defaultAttire) : '';

    const positiveParts = [
      `(${AESTHETIC_SCORE_TAGS})`,
      'masterpiece, best quality, ultra-detailed, cinematic lighting',
      character.style ? `(${character.style})` : null,
      '(close-up portrait), (detailed face), looking at viewer, headshot',
      'solo',
      genderTag,
      loraName,
      physicalTags,
      attireTags,
    ];

    const loras: LoraConfig[] = character.lora
      ? [
          {
            name: character.lora.name,
            filepathRelative: character.lora.filepathRelative,
            strength: 1.0,
          },
        ]
      : [];

    return {
      positive: this.joinPromptParts(positiveParts),
      negative: AVATAR_NEGATIVE_PROMPT,
      loras,
    };
  }

  /**
   * Build sticker prompt with emotion/action
   */
  async buildStickerPrompt(
    character: CharacterPromptData,
    _emotion: string,
    actionTag: string,
    chromaKeyPrompt: string = 'solid green background, plain background, simple background, chroma key'
  ): Promise<SDPrompt> {
    const genderTag = this.getGenderTag(character.gender);
    const loraName = character.lora?.name?.split('|')[0]?.trim() || character.name;

    // Convert character descriptions to SD tags (in English)
    const physicalTags = character.physicalCharacteristics
      ? await this.convertToSDTags(character.physicalCharacteristics)
      : '';
    const attireTags = character.defaultAttire ? await this.convertToSDTags(character.defaultAttire) : '';

    const positiveParts = [
      AESTHETIC_SCORE_TAGS,
      'masterpiece, best quality, ultra-detailed',
      'solo',
      'full body',
      loraName,
      genderTag,
      physicalTags,
      attireTags,
      actionTag,
      chromaKeyPrompt,
    ];

    const loras: LoraConfig[] = character.lora
      ? [
          {
            name: character.lora.name,
            filepathRelative: character.lora.filepathRelative,
            strength: 1.0,
          },
        ]
      : [];

    return {
      positive: this.joinPromptParts(positiveParts),
      negative: STANDARD_NEGATIVE_PROMPT,
      loras,
    };
  }

  /**
   * Get standard emotions for sticker generation
   */
  getStandardEmotions(): Record<string, string> {
    return {
      happy: 'smiling, cheerful expression',
      sad: 'sad expression, looking down',
      angry: 'angry expression, furrowed brows, crossing arms',
      surprised: 'surprised expression, open mouth, wide eyes',
      neutral: 'neutral expression, looking at viewer',
      thinking: 'thinking, hand on chin, pensive look',
      shy: 'shy, blushing, looking away, timid pose',
      waving: 'waving hand, friendly smile',
    };
  }

  /**
   * Build cover prompt with custom user prompt and character context
   * Uses LLM to convert user prompt to SD tags and adds character details
   * User prompt tags get priority and emphasis (individual double parentheses)
   */
  async buildCoverPrompt(
    character: CharacterPromptData,
    userPrompt?: string
  ): Promise<SDPrompt> {
    const genderTag = this.getGenderTag(character.gender);
    const loraName = character.lora?.name?.split('|')[0]?.trim() || character.name;

    // Check if user provided a custom prompt
    const hasUserPrompt = userPrompt && userPrompt.trim().length > 0;

    // Convert user prompt to SD tags with forCover=true for individual parentheses
    // LLM will return: ((beach)), ((pink bikini)), ((yellow float))
    let userPromptTags = '';
    if (hasUserPrompt) {
      userPromptTags = await this.convertToSDTags(userPrompt, true);
    }

    // When user provides a custom prompt, don't include physicalTags or defaultAttire
    // to avoid conflicts (e.g., "white shirt" + "yellow bikini")
    // Reference images will provide the correct visual character traits
    const physicalTags = !hasUserPrompt && character.physicalCharacteristics
      ? await this.convertToSDTags(character.physicalCharacteristics)
      : '';

    // Only include default attire if user didn't provide a custom prompt
    const attireTags = (!hasUserPrompt && character.defaultAttire)
      ? await this.convertToSDTags(character.defaultAttire)
      : '';

    const positiveParts = [
      `(${AESTHETIC_SCORE_TAGS})`,
      'masterpiece, best quality, ultra-detailed, cinematic lighting',
      character.style ? `(${character.style})` : null,
      '(full body), (detailed body), standing, looking at viewer',
      'solo',
      genderTag,
      loraName,
      physicalTags,
      attireTags,
      // User prompt tags - LLM already returns them with individual ((parentheses))
      // No need to wrap again - just include directly
      userPromptTags,
    ];

    const loras: LoraConfig[] = character.lora
      ? [
          {
            name: character.lora.name,
            filepathRelative: character.lora.filepathRelative,
            strength: 1.0,
          },
        ]
      : [];

    return {
      positive: this.joinPromptParts(positiveParts),
      negative: STANDARD_NEGATIVE_PROMPT,
      loras,
    };
  }

  /**
   * Convert gender to SD tag
   */
  private getGenderTag(gender?: string): string {
    if (!gender) return '1person';
    const genderLower = gender.toLowerCase();
    if (genderLower.includes('femin') || genderLower === 'female' || genderLower === 'girl') {
      return '1girl';
    }
    if (genderLower.includes('mascul') || genderLower === 'male' || genderLower === 'boy') {
      return '1boy';
    }
    return '1person';
  }

  /**
   * Join prompt parts, filtering nulls and empty strings
   */
  private joinPromptParts(parts: (string | null)[]): string {
    return parts
      .filter((part) => part && part.trim().length > 0)
      .join(', ')
      .trim();
  }

  /**
   * Enhance prompt with LLM-generated description tags
   * This can be called optionally to improve quality
   */
  async enhancePromptWithLLM(
    basePrompt: string,
    _characterDescription: string
  ): Promise<string> {
    // TODO: Integrate with LLM service to convert prose to SD tags
    // For now, just return the base prompt
    return basePrompt;
  }
}

// Export negative prompt constants for use by other services
export { STANDARD_NEGATIVE_PROMPT, AVATAR_NEGATIVE_PROMPT, REFERENCE_NEGATIVE_PROMPT };

// Singleton instance
export const promptEngineering = new PromptEngineering();
