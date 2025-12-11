/**
 * Image Generation Job Definitions
 * Defines job data structures for image generation queue
 */

import { ImageGenerationType } from '../../services/comfyui';

export interface BaseImageJobData {
  userId: string;
  type: ImageGenerationType;
}

export interface AvatarGenerationJobData extends BaseImageJobData {
  type: ImageGenerationType.AVATAR;
  characterId: string;
  referenceImageUrl?: string; // Optional URL to reference image for IP-Adapter
  prompt?: string; // Optional Stable Diffusion prompt for avatar generation
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

export type ImageGenerationJobData =
  | AvatarGenerationJobData
  | StickerGenerationJobData
  | BulkStickerGenerationJobData;

export interface ImageGenerationJobResult {
  success: boolean;
  imageUrl?: string;
  imageUrls?: string[]; // For bulk operations
  characterId?: string;
  error?: string;
}
