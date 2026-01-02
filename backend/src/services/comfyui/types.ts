/**
 * ComfyUI Service Types
 * Defines interfaces for ComfyUI workflows and API responses
 */

export interface ComfyWorkflow {
  [nodeId: string]: ComfyNode;
}

export interface ComfyNode {
  inputs: Record<string, any>;
  class_type: string;
  _meta?: {
    title?: string;
  };
}

export interface ComfyQueueResponse {
  prompt_id: string;
  number: number;
  node_errors?: Record<string, any>;
}

export interface ComfyHistoryResponse {
  [promptId: string]: {
    prompt: any[];
    outputs: {
      [nodeId: string]: {
        images?: Array<{
          filename: string;
          subfolder: string;
          type: string;
        }>;
      };
    };
    status: {
      status_str: string;
      completed: boolean;
      messages?: any[];
    };
  };
}

export interface ImageGenerationResult {
  imageBytes: Buffer;
  filename: string;
  promptId: string;
}

export interface LoraConfig {
  name: string;
  filepathRelative: string;
  strength: number;
}

export interface GenerationOptions {
  width?: number;
  height?: number;
  steps?: number;
  cfg?: number;
  sampler?: string;
  scheduler?: string;
  seed?: number;
  loras?: LoraConfig[];
}

export interface SDPrompt {
  positive: string;
  negative: string;
  loras?: LoraConfig[];
  referenceImagePath?: string; // Optional path to reference image for IP-Adapter
}

export enum ImageGenerationType {
  AVATAR = 'avatar',
  STICKER = 'sticker',
  COVER = 'cover',
  SCENE = 'scene',
  OTHER = 'other',
  // Multi-stage reference generation - single workflow for all views
  REFERENCE = 'reference',
}

// Middleware v2.0 High-Level API types
export interface ReferenceImage {
  type: string;
  url: string;
}

export interface PrepareReferencesRequest {
  characterId: string;
  referenceImages: ReferenceImage[];
}

export interface PrepareReferencesResponse {
  referencePath: string;
  imageCount: number;
  status: string;
}

export interface GenerateWithReferencesRequest {
  characterId: string;
  workflow: ComfyWorkflow;
  referenceImages: ReferenceImage[];
  nodeOverrides?: Record<string, any>;
}

export interface GenerateWithReferencesResponse {
  prompt_id: string;
  referencePath: string;
  status: string;
  imageCount: number;
}

export interface CleanupRequest {
  characterId: string;
}

export interface CleanupResponse {
  success: boolean;
  message: string;
}
