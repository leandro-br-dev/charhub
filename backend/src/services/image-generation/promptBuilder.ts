/**
 * Prompt Builder Service
 *
 * Builds positive and negative prompts for image generation
 * based on character data and generation context.
 */

import type { Character } from '../../generated/prisma';

export interface ImagePrompt {
  positive: string;
  negative: string;
}

/**
 * Default negative prompt for image generation
 * Prevents common quality issues
 */
export const DEFAULT_NEGATIVE_PROMPT = (
  'low quality, blurry, distorted, deformed, ugly, bad anatomy, '
  + 'bad proportions, extra limbs, missing limbs, floating limbs, '
  + 'disconnected limbs, mutation, mutated, out of frame, cropped, '
  + 'worst quality, low resolution, jpeg artifacts, text, watermark, signature'
);

/**
 * Build prompts for image generation based on character data
 *
 * @param character - Character data from database
 * @param species - Optional species name (if character.speciesId is set)
 * @param customPositive - Optional custom positive prompt to override
 * @param customNegative - Optional custom negative prompt to override
 * @returns Image prompt with positive and negative text
 */
export function buildImagePrompt(
  character: Pick<Character, 'firstName' | 'lastName' | 'gender' | 'physicalCharacteristics' | 'personality' | 'reference' | 'style'>,
  species?: { name: string } | null,
  customPositive?: string,
  customNegative?: string
): ImagePrompt {
  // Use custom prompts if provided
  if (customPositive && customPositive.trim()) {
    return {
      positive: customPositive.trim(),
      negative: customNegative?.trim() || DEFAULT_NEGATIVE_PROMPT,
    };
  }

  // Build prompt from character data
  const parts: string[] = [];

  // Add species name if available
  if (species?.name) {
    parts.push(species.name.toLowerCase());
  } else if (character.gender) {
    // Fallback to gender if no species
    const genderMap: Record<string, string> = {
      MALE: 'male',
      FEMALE: 'female',
      NON_BINARY: 'non-binary person',
      UNKNOWN: 'character',
    };
    parts.push(genderMap[character.gender] || 'character');
  } else {
    parts.push('character');
  }

  // Add physical description
  if (character.physicalCharacteristics) {
    parts.push(character.physicalCharacteristics);
  }

  // Add personality traits (helps with facial expression and style)
  if (character.personality) {
    // Extract key personality traits (first few words)
    const traits = character.personality
      .split(',')[0]
      .split(' ')
      .slice(0, 5)
      .join(' ');
    parts.push(traits);
  }

  // Add reference/source style if specified
  if (character.reference) {
    parts.push(`in the style of ${character.reference}`);
  }

  // Add quality boosters
  parts.push('high quality, detailed, professional, well-composed');

  const positive = parts.join(', ');

  return {
    positive,
    negative: customNegative?.trim() || DEFAULT_NEGATIVE_PROMPT,
  };
}

/**
 * Build prompts for multi-stage reference generation
 * Enhances prompts based on the specific view being generated
 *
 * @param basePrompt - Base prompt from character data
 * @param viewType - Type of reference view being generated
 * @returns Enhanced prompt for the specific view
 */
export function buildReferencePrompt(
  basePrompt: ImagePrompt,
  viewType: 'avatar' | 'front' | 'side' | 'back'
): ImagePrompt {
  const viewPrompts = {
    avatar: {
      prefix: 'portrait, headshot, face focus, detailed facial features',
      negative: 'full body, multiple views, wide angle',
    },
    front: {
      prefix: 'full body, standing, front view, looking at camera',
      negative: 'cropped, headshot only, side view, back view',
    },
    side: {
      prefix: 'full body, standing, side view, profile',
      negative: 'front view, back view, looking at camera',
    },
    back: {
      prefix: 'full body, standing, back view, rear view',
      negative: 'front view, face visible, looking at camera',
    },
  };

  const viewConfig = viewPrompts[viewType];

  return {
    positive: `${viewConfig.prefix}, ${basePrompt.positive}`,
    negative: `${basePrompt.negative}, ${viewConfig.negative}`,
  };
}
