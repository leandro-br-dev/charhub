/**
 * Prompt Engineering Service
 * Builds Stable Diffusion prompts from character/story data
 * Based on old project: backend/app/prompts/image_gen_prompts.py
 */

import type { SDPrompt, LoraConfig } from './types';

// Aesthetic quality tags for pony/illustrious models
const AESTHETIC_SCORE_TAGS = 'score_9, score_8_up, score_7_up';

// Standard negative prompt to avoid common issues
const STANDARD_NEGATIVE_PROMPT =
  '2girls, (multiple girls:1.3), (multiple characters:1.3), multiple views, grid layout, chibi, miniature, ' +
  'clone, duplicate, cropped, badhandv4, negative_hand-neg, ng_deepnegative_v1_75t, verybadimagenegative_v1.3, ' +
  '(worst quality, bad quality, jpeg artifacts:1.2), sketch, signature, watermark, username, ' +
  '(censored, bar_censor, mosaic_censor:1.2), simple background, conjoined, bad anatomy, bad hands, ' +
  'bad mouth, bad tongue, bad arms, extra arms, bad eyes, extra limbs, speech bubble, dialogue bubble, ' +
  'emoji, icon, text box';

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
   * Build avatar prompt for character portrait
   */
  buildAvatarPrompt(character: CharacterPromptData): SDPrompt {
    const genderTag = this.getGenderTag(character.gender);
    const loraName = character.lora?.name?.split('|')[0]?.trim() || character.name;

    const positiveParts = [
      `(${AESTHETIC_SCORE_TAGS})`,
      'masterpiece, best quality, ultra-detailed, cinematic lighting',
      character.style ? `(${character.style})` : null,
      '(close-up portrait:1.2), (detailed face:1.1), looking at viewer, headshot',
      'solo',
      genderTag,
      `(${loraName}:1.2)`,
      character.physicalCharacteristics || '',
      character.defaultAttire || '',
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
   * Build sticker prompt with emotion/action
   */
  buildStickerPrompt(
    character: CharacterPromptData,
    _emotion: string,
    actionTag: string,
    chromaKeyPrompt: string = 'solid green background, plain background, simple background, chroma key'
  ): SDPrompt {
    const genderTag = this.getGenderTag(character.gender);
    const loraName = character.lora?.name?.split('|')[0]?.trim() || character.name;

    const positiveParts = [
      AESTHETIC_SCORE_TAGS,
      'masterpiece, best quality, ultra-detailed',
      'solo',
      'full body',
      loraName,
      genderTag,
      character.physicalCharacteristics || '',
      character.defaultAttire || '',
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

// Singleton instance
export const promptEngineering = new PromptEngineering();
