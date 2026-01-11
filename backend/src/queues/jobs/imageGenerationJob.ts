/**
 * Image Generation Job Definitions
 * Defines job data structures for image generation queue
 */

import { ImageGenerationType } from '../../services/comfyui';
import type { ReferenceImage } from '../../services/comfyui/types';
import type { UserRole } from '../../types';

export interface BaseImageJobData {
  userId: string;
  type: ImageGenerationType;
}

export interface AvatarGenerationJobData extends BaseImageJobData {
  type: ImageGenerationType.AVATAR;
  characterId: string;
  referenceImageUrl?: string; // Optional URL to reference image for IP-Adapter
  prompt?: string; // Optional Stable Diffusion prompt for avatar generation
  imageType?: 'AVATAR' | 'COVER'; // Whether to save as AVATAR or COVER type
}

export interface StickerGenerationJobData extends BaseImageJobData {
  type: ImageGenerationType.STICKER;
  characterId: string;
  emotion: string;
  actionTag: string;
  customInstructions?: string;
}

export interface BulkStickerGenerationJobData extends BaseImageJobData {
  type: ImageGenerationType.STICKER;
  characterId: string;
  emotions?: string[]; // If not provided, generate all standard emotions
  customInstructions?: string;
}

export interface CoverGenerationJobData extends BaseImageJobData {
  type: ImageGenerationType.COVER;
  storyId: string;
  referenceImageUrl?: string;
  prompt: string;
}

/**
 * Multi-Stage Character Dataset Generation Job Data
 * Generates 4 reference images sequentially: avatar, front, side, back
 */
export interface MultiStageDatasetGenerationJobData {
  type: 'multi-stage-dataset';
  userId: string;
  userRole?: UserRole;
  characterId: string;
  prompt: {
    positive: string;
    negative: string;
  };
  loras?: Array<{
    name: string;
    filepathRelative: string;
    strength: number;
  }>;
  referenceImages?: ReferenceImage[]; // Optional initial user-provided references
  viewsToGenerate?: ('face' | 'front' | 'side' | 'back')[]; // Optional: specific views to regenerate
}

export type ImageGenerationJobData =
  | AvatarGenerationJobData
  | StickerGenerationJobData
  | BulkStickerGenerationJobData
  | CoverGenerationJobData
  | MultiStageDatasetGenerationJobData;

export interface ImageGenerationJobResult {
  success: boolean;
  imageUrl?: string;
  imageUrls?: string[]; // For bulk operations
  characterId?: string;
  error?: string;
}

/**
 * Multi-stage generation result
 * In the new flow, images are saved directly to the database during generation,
 * so this result only indicates success/failure and the character ID.
 */
export interface MultiStageGenerationResult {
  success: boolean;
  characterId: string;
  error?: string;
}
