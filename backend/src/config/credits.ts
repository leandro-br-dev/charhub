/**
 * Credit Costs Configuration
 *
 * Defines credit costs for various operations in the system.
 * These costs are charged to users before the operation is executed.
 *
 * IMPORTANT: If generation fails, credits should be refunded.
 */

/**
 * Credit costs for character generation
 */
export const CHARACTER_GENERATION_COSTS = {
  /** Text-only character generation (no avatar) */
  TEXT_ONLY: 75,

  /** Character generation with avatar image */
  WITH_IMAGE: 100,
} as const;

/**
 * Credit costs for image generation
 */
export const IMAGE_GENERATION_COSTS = {
  /** Single avatar generation */
  SINGLE: 50,

  /** Single image generation with reference image (IP-Adapter) */
  WITH_REFERENCE: 75,

  /** Multi-stage reference dataset (4 images: avatar, front, side, back) */
  REFERENCE_SET: 100,

  /** Single sticker generation */
  STICKER: 25,

  /** Bulk sticker generation (8 emotions) - discounted rate */
  STICKER_BULK: 150, // ~18.75 per sticker vs 25 for single
} as const;

/**
 * Credit costs for story generation
 */
export const STORY_GENERATION_COSTS = {
  /** Text-only story generation */
  TEXT_ONLY: 75,

  /** Story generation with cover image */
  WITH_IMAGE: 100,
} as const;

/**
 * Combined credit costs object
 */
export const CREDIT_COSTS = {
  ...CHARACTER_GENERATION_COSTS,
  ...IMAGE_GENERATION_COSTS,
  ...STORY_GENERATION_COSTS,
} as const;

/**
 * Get credit cost for image generation type
 */
export function getImageGenerationCost(type: 'avatar' | 'sticker' | 'cover' | 'multi-stage-dataset', options?: {
  withReference?: boolean;
  isBulk?: boolean;
}): number {
  switch (type) {
    case 'avatar':
      return options?.withReference ? IMAGE_GENERATION_COSTS.WITH_REFERENCE : IMAGE_GENERATION_COSTS.SINGLE;

    case 'sticker':
      return options?.isBulk ? IMAGE_GENERATION_COSTS.STICKER_BULK : IMAGE_GENERATION_COSTS.STICKER;

    case 'cover':
      return IMAGE_GENERATION_COSTS.SINGLE;

    case 'multi-stage-dataset':
      return IMAGE_GENERATION_COSTS.REFERENCE_SET;

    default:
      return IMAGE_GENERATION_COSTS.SINGLE;
  }
}
