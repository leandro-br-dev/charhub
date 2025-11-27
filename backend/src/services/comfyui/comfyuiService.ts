/**
 * ComfyUI Service
 * HTTP client for communicating with ComfyUI API
 * Based on old project: backend/app/services/image_generator.py
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../../config/logger';
import type {
  ComfyWorkflow,
  ComfyQueueResponse,
  ComfyHistoryResponse,
  ImageGenerationResult,
  SDPrompt,
} from './types';
import { ImageGenerationType } from './types';
import avatarWorkflow from './workflows/avatar.workflow.json';
import stickerWorkflow from './workflows/sticker.workflow.json';

interface ComfyUIConfig {
  baseUrl: string;
  timeout?: number;
  serviceToken?: string;
}

export class ComfyUIService {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(config?: ComfyUIConfig) {
    this.baseUrl = config?.baseUrl || process.env.COMFYUI_URL || 'http://localhost:8188';
    const timeout = config?.timeout || parseInt(process.env.COMFYUI_TIMEOUT || '300000', 10);

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(config?.serviceToken && { Authorization: `Bearer ${config.serviceToken}` }),
      },
    });

    logger.info({ baseUrl: this.baseUrl }, 'ComfyUI Service initialized');
  }

  /**
   * Queue a prompt/workflow in ComfyUI
   */
  async queuePrompt(workflow: ComfyWorkflow): Promise<ComfyQueueResponse> {
    try {
      logger.debug('Queueing prompt to ComfyUI');
      const response = await this.client.post<ComfyQueueResponse>('/prompt', {
        prompt: workflow,
      });

      logger.info({ promptId: response.data.prompt_id }, 'Prompt queued successfully');
      return response.data;
    } catch (error) {
      logger.error({ err: error }, 'Failed to queue prompt in ComfyUI');
      throw new Error(`Failed to queue prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get history for a specific prompt ID
   */
  async getHistory(promptId: string): Promise<ComfyHistoryResponse | null> {
    try {
      const response = await this.client.get<ComfyHistoryResponse>(`/history/${promptId}`);
      return response.data;
    } catch (error) {
      logger.error({ err: error, promptId }, 'Failed to get history from ComfyUI');
      return null;
    }
  }

  /**
   * Get generated image bytes from ComfyUI
   */
  async getImage(filename: string, subfolder: string, type: string): Promise<Buffer | null> {
    try {
      logger.debug({ filename, subfolder, type }, 'Fetching image from ComfyUI');

      const response = await this.client.get('/view', {
        params: { filename, subfolder, type },
        responseType: 'arraybuffer',
      });

      logger.info({ filename, size: response.data.length }, 'Image fetched successfully');
      return Buffer.from(response.data);
    } catch (error) {
      logger.error({ err: error, filename }, 'Failed to get image from ComfyUI');
      return null;
    }
  }

  /**
   * Free ComfyUI memory (unload models)
   */
  async freeMemory(): Promise<boolean> {
    try {
      logger.info('Requesting ComfyUI to free memory');
      await this.client.post('/free', {
        unload_models: true,
        free_memory: true,
      });
      logger.info('ComfyUI memory freed successfully');
      return true;
    } catch (error: any) {
      // 404 is acceptable (endpoint might not exist in some versions)
      if (error?.response?.status === 404) {
        logger.warn('ComfyUI /free endpoint not found (404) - skipping');
        return true;
      }
      logger.error({ err: error }, 'Failed to free ComfyUI memory');
      return false;
    }
  }

  /**
   * Execute a workflow and wait for completion
   * Polls history until image is ready
   */
  async executeWorkflow(workflow: ComfyWorkflow): Promise<ImageGenerationResult> {
    // Queue the prompt
    const queueResponse = await this.queuePrompt(workflow);
    const promptId = queueResponse.prompt_id;

    // Poll for completion
    const maxAttempts = 60; // 10 minutes max (60 * 10s)
    const pollInterval = 10000; // 10 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const history = await this.getHistory(promptId);
      if (!history || !history[promptId]) {
        continue;
      }

      const promptData = history[promptId];
      const outputs = promptData.outputs || {};

      // Find the SaveImage node
      const saveNodeId = Object.keys(workflow).find(
        (nodeId) => workflow[nodeId].class_type === 'SaveImage'
      );

      if (!saveNodeId || !outputs[saveNodeId]?.images?.[0]) {
        continue;
      }

      // Image is ready
      const imageInfo = outputs[saveNodeId].images[0];
      logger.info({ promptId, attempt: attempt + 1, filename: imageInfo.filename }, 'Image generation completed');

      const imageBytes = await this.getImage(imageInfo.filename, imageInfo.subfolder, imageInfo.type);
      if (!imageBytes) {
        throw new Error('Failed to retrieve generated image bytes');
      }

      return {
        imageBytes,
        filename: imageInfo.filename,
        promptId,
      };
    }

    throw new Error(`Image generation timed out after ${maxAttempts * pollInterval / 1000}s`);
  }

  /**
   * Generate avatar image
   */
  async generateAvatar(prompt: SDPrompt): Promise<ImageGenerationResult> {
    logger.info('Starting avatar generation');
    const workflow = this.prepareWorkflow(ImageGenerationType.AVATAR, prompt);
    return this.executeWorkflow(workflow);
  }

  /**
   * Generate sticker image
   */
  async generateSticker(prompt: SDPrompt): Promise<ImageGenerationResult> {
    logger.info('Starting sticker generation');
    const workflow = this.prepareWorkflow(ImageGenerationType.STICKER, prompt);
    return this.executeWorkflow(workflow);
  }

  /**
   * Prepare workflow with prompts and LoRAs
   */
  private prepareWorkflow(type: ImageGenerationType, prompt: SDPrompt): ComfyWorkflow {
    let workflow: ComfyWorkflow;

    switch (type) {
      case ImageGenerationType.AVATAR:
        workflow = JSON.parse(JSON.stringify(avatarWorkflow));
        break;
      case ImageGenerationType.STICKER:
        workflow = JSON.parse(JSON.stringify(stickerWorkflow));
        break;
      default:
        throw new Error(`Unsupported generation type: ${type}`);
    }

    // Set random seed
    const seed = Math.floor(Date.now() * 1000) % (2 ** 32);
    workflow['3'].inputs.seed = seed;

    // For sticker workflow, also set FaceDetailer seed
    if (type === ImageGenerationType.STICKER && workflow['14']) {
      workflow['14'].inputs.seed = seed;
    }

    // Set prompts
    workflow['6'].inputs.text = prompt.positive;
    workflow['7'].inputs.text = prompt.negative;

    // Set LoRAs if provided
    if (prompt.loras && prompt.loras.length > 0) {
      const loraNode = workflow['11'];
      prompt.loras.slice(0, 4).forEach((lora, index) => {
        const loraNum = (index + 1).toString().padStart(2, '0');
        loraNode.inputs[`lora_${loraNum}`] = lora.filepathRelative.replace(/\//g, '\\');
        loraNode.inputs[`strength_${loraNum}`] = lora.strength;
      });
    }

    return workflow;
  }

  /**
   * Health check - verify ComfyUI is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/system_stats', { timeout: 5000 });
      return true;
    } catch (error) {
      logger.error({ err: error }, 'ComfyUI health check failed');
      return false;
    }
  }
}

// Singleton instance
export const comfyuiService = new ComfyUIService();
