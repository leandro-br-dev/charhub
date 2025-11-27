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
}

export enum ImageGenerationType {
  AVATAR = 'avatar',
  STICKER = 'sticker',
  COVER = 'cover',
  SCENE = 'scene',
}
