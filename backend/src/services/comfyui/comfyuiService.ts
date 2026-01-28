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
  ReferenceImage,
  PrepareReferencesResponse,
  GenerateWithReferencesRequest,
  GenerateWithReferencesResponse,
  CleanupResponse,
  LoraConfig,
} from './types';
import { ImageGenerationType } from './types';
import type { VisualStyle, ContentType, Theme } from '../../generated/prisma';
import {
  getVisualStyleConfiguration,
  buildComfyUIPayload,
  isValidVisualStyle,
} from '../visualStyleService';
import avatarWorkflow from './workflows/avatar.workflow.json';
import avatarWithIPAdapterWorkflow from './workflows/avatar-with-ipadapter.workflow.json';
import coverWorkflow from './workflows/cover.workflow.json';
import coverWithIPAdapterWorkflow from './workflows/cover-with-ipadapter.workflow.json';
import coverWithReferencesWorkflow from './workflows/cover-with-references.workflow.json';
import stickerWorkflow from './workflows/sticker.workflow.json';
import multiRefFaceWorkflow from './workflows/multi-ref-face.workflow.json';
import multiRefFrontWorkflow from './workflows/multi-ref-front.workflow.json';
import multiRefSideWorkflow from './workflows/multi-ref-side.workflow.json';
import multiRefBackWorkflow from './workflows/multi-ref-back.workflow.json';

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

    // Build headers - token is optional (ComfyUI typically doesn't use auth)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const serviceToken = config?.serviceToken || process.env.COMFYUI_SERVICE_TOKEN;
    if (serviceToken) {
      headers['Authorization'] = `Bearer ${serviceToken}`;
      logger.info('ComfyUI Service Token configured');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout,
      headers,
    });

    logger.info({ baseUrl: this.baseUrl }, 'ComfyUI Service initialized');
  }

  /**
   * Queue a prompt/workflow in ComfyUI
   */
  async queuePrompt(workflow: ComfyWorkflow): Promise<ComfyQueueResponse> {
    try {
      logger.debug('Queueing prompt to ComfyUI via middleware');
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
      logger.debug({ filename, subfolder, type }, 'Fetching image from ComfyUI via middleware');

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
      logger.info('Requesting ComfyUI to free memory via middleware');
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
  async generateAvatar(
    prompt: SDPrompt,
    visualStyle?: VisualStyle,
    theme?: Theme
  ): Promise<ImageGenerationResult> {
    logger.info({ visualStyle, theme }, 'Starting avatar generation');
    let workflow = this.prepareWorkflow(ImageGenerationType.AVATAR, prompt);

    // Apply visual style if provided (FEATURE-014: prefer theme over contentType)
    if (visualStyle) {
      workflow = await this.applyVisualStyleToWorkflow(workflow, visualStyle, undefined, theme);
    }

    return this.executeWorkflow(workflow);
  }

  /**
   * Generate sticker image
   */
  async generateSticker(
    prompt: SDPrompt,
    visualStyle?: VisualStyle,
    theme?: Theme
  ): Promise<ImageGenerationResult> {
    logger.info({ visualStyle, theme }, 'Starting sticker generation');
    let workflow = this.prepareWorkflow(ImageGenerationType.STICKER, prompt);

    // Apply visual style if provided (FEATURE-014: prefer theme over contentType)
    if (visualStyle) {
      workflow = await this.applyVisualStyleToWorkflow(workflow, visualStyle, undefined, theme);
    }

    return this.executeWorkflow(workflow);
  }

  /**
   * Generate cover image (portrait 3:4 aspect ratio)
   */
  async generateCover(
    prompt: SDPrompt,
    visualStyle?: VisualStyle,
    theme?: Theme
  ): Promise<ImageGenerationResult> {
    logger.info({ visualStyle, theme }, 'Starting cover generation');
    let workflow = this.prepareWorkflow(ImageGenerationType.COVER, prompt);

    // Apply visual style if provided (FEATURE-014: prefer theme over contentType)
    if (visualStyle) {
      workflow = await this.applyVisualStyleToWorkflow(workflow, visualStyle, undefined, theme);
    }

    return this.executeWorkflow(workflow);
  }

  /**
   * Prepare workflow with prompts and LoRAs
   */
  private prepareWorkflow(type: ImageGenerationType, prompt: SDPrompt): ComfyWorkflow {
    let workflow: ComfyWorkflow;

    switch (type) {
      case ImageGenerationType.AVATAR:
        // Use IP-Adapter workflow if reference image is provided
        if (prompt.referenceImagePath) {
          workflow = JSON.parse(JSON.stringify(avatarWithIPAdapterWorkflow));
          logger.info({ referenceImagePath: prompt.referenceImagePath }, 'Using avatar workflow with IP-Adapter');
        } else {
          workflow = JSON.parse(JSON.stringify(avatarWorkflow));
          logger.info('Using standard avatar workflow');
        }
        break;
      case ImageGenerationType.COVER:
        // Use IP-Adapter workflow if reference image is provided
        if (prompt.referenceImagePath) {
          workflow = JSON.parse(JSON.stringify(coverWithIPAdapterWorkflow));
          logger.info({ referenceImagePath: prompt.referenceImagePath }, 'Using cover workflow with IP-Adapter');
        } else {
          workflow = JSON.parse(JSON.stringify(coverWorkflow));
          logger.info('Using standard cover workflow');
        }
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

    // Set reference image for IP-Adapter if provided
    if (prompt.referenceImagePath && workflow['16']) {
      workflow['16'].inputs.image = prompt.referenceImagePath;
      logger.info({ referenceImage: prompt.referenceImagePath }, 'Set reference image for IP-Adapter');
    }

    return workflow;
  }

  /**
   * Upload image to ComfyUI server
   * Required for LoadImage nodes to access images
   */
  async uploadImage(imageBuffer: Buffer, filename: string, overwrite: boolean = false): Promise<string> {
    try {
      const FormData = (await import('form-data')).default;
      const formData = new FormData();

      // Add image file
      formData.append('image', imageBuffer, {
        filename,
        contentType: 'image/png',
      });

      // Add metadata
      formData.append('type', 'input');
      formData.append('overwrite', overwrite.toString());

      // Upload to ComfyUI via middleware v2.0
      const response = await this.client.post('/upload/image', formData, {
        headers: formData.getHeaders(),
      });

      // Response contains: { name: string, subfolder: string, type: string }
      const uploadedFilename = response.data.name;
      logger.info({ filename: uploadedFilename }, 'Image uploaded to ComfyUI');

      return uploadedFilename;
    } catch (error) {
      logger.error({ err: error, filename }, 'Failed to upload image to ComfyUI');
      throw new Error(`Failed to upload image to ComfyUI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * ============================================================================
   * MIDDLEWARE v2.0 HIGH-LEVEL API METHODS
   * ============================================================================
   */

  /**
   * Prepare reference images - download to temp folder without executing workflow
   * Calls POST /api/prepare
   */
  async prepareReferences(characterId: string, referenceImages: ReferenceImage[]): Promise<PrepareReferencesResponse> {
    try {
      logger.info({ characterId, imageCount: referenceImages.length }, 'Preparing reference images via middleware');

      const response = await this.client.post<PrepareReferencesResponse>('/api/prepare', {
        characterId,
        referenceImages,
      });

      logger.info({ referencePath: response.data.referencePath, imageCount: response.data.imageCount }, 'Reference images prepared');
      return response.data;
    } catch (error) {
      logger.error({ err: error, characterId }, 'Failed to prepare reference images');
      throw new Error(`Failed to prepare reference images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate image with reference images using middleware high-level API
   * Downloads references, injects paths, and queues workflow
   * Calls POST /api/generate
   */
  async generateWithReferences(
    characterId: string,
    workflow: ComfyWorkflow,
    referenceImages: ReferenceImage[],
    nodeOverrides?: Record<string, any>
  ): Promise<GenerateWithReferencesResponse> {
    try {
      logger.info({ characterId, imageCount: referenceImages.length }, 'Generating with references via middleware');

      const request: GenerateWithReferencesRequest = {
        characterId,
        workflow,
        referenceImages,
        nodeOverrides,
      };

      const response = await this.client.post<GenerateWithReferencesResponse>('/api/generate', request);

      logger.info({ promptId: response.data.prompt_id, referencePath: response.data.referencePath }, 'Generation queued with references');
      return response.data;
    } catch (error) {
      logger.error({ err: error, characterId }, 'Failed to generate with references');
      throw new Error(`Failed to generate with references: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cleanup temporary reference images for a character
   * Calls POST /api/cleanup
   */
  async cleanupReferences(characterId: string): Promise<CleanupResponse> {
    try {
      logger.info({ characterId }, 'Cleaning up reference images via middleware');

      const response = await this.client.post<CleanupResponse>('/api/cleanup', {
        characterId,
      });

      logger.info({ characterId, message: response.data.message }, 'Reference images cleaned up');
      return response.data;
    } catch (error) {
      // Non-critical - log warning but don't throw
      logger.warn({ err: error, characterId }, 'Failed to cleanup reference images (non-critical)');
      return {
        success: false,
        message: `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Generate multi-stage character image (face, front, side, or back)
   * Uses workflows with LoadImagesFromDir for multiple reference support
   */
  async generateMultiRef(
    viewType: 'face' | 'front' | 'side' | 'back',
    referencePath: string,
    prompt: SDPrompt
  ): Promise<ImageGenerationResult> {
    logger.info({ viewType, referencePath }, 'Starting multi-reference generation');

    // Select appropriate workflow
    let workflowTemplate: ComfyWorkflow;
    switch (viewType) {
      case 'face':
        workflowTemplate = JSON.parse(JSON.stringify(multiRefFaceWorkflow));
        break;
      case 'front':
        workflowTemplate = JSON.parse(JSON.stringify(multiRefFrontWorkflow));
        break;
      case 'side':
        workflowTemplate = JSON.parse(JSON.stringify(multiRefSideWorkflow));
        break;
      case 'back':
        workflowTemplate = JSON.parse(JSON.stringify(multiRefBackWorkflow));
        break;
      default:
        throw new Error(`Invalid viewType: ${viewType}`);
    }

    // Set random seed for KSampler
    const seed = Math.floor(Date.now() * 1000) % (2 ** 32);
    workflowTemplate['3'].inputs.seed = seed;

    // Set FaceDetailer seed for body views
    if (viewType !== 'face' && workflowTemplate['14']) {
      workflowTemplate['14'].inputs.seed = seed;
    }

    // Set prompts
    workflowTemplate['6'].inputs.text = prompt.positive;
    workflowTemplate['7'].inputs.text = prompt.negative;

    // Set LoRAs if provided
    if (prompt.loras && prompt.loras.length > 0) {
      const loraNode = workflowTemplate['11'];
      prompt.loras.slice(0, 4).forEach((lora, index) => {
        const loraNum = (index + 1).toString().padStart(2, '0');
        loraNode.inputs[`lora_${loraNum}`] = lora.filepathRelative.replace(/\//g, '\\');
        loraNode.inputs[`strength_${loraNum}`] = lora.strength;
      });
    }

    // Replace @REFERENCE_PATH@ placeholder with actual path
    // The LoadImagesFromDir node expects a Windows-style path
    if (workflowTemplate['43']) {
      workflowTemplate['43'].inputs.directory = referencePath;
      logger.debug({ referencePath }, 'Set reference directory in workflow');
    }

    // Execute the workflow
    return this.executeWorkflow(workflowTemplate);
  }

  /**
   * Generate cover image with reference images
   * Uses LoadImagesFromDir for multiple reference support
   */
  async generateCoverWithReferences(
    referencePath: string,
    prompt: SDPrompt,
    visualStyle?: VisualStyle,
    theme?: Theme
  ): Promise<ImageGenerationResult> {
    logger.info({ referencePath, visualStyle, theme }, 'Starting cover generation with references');

    const workflowTemplate = JSON.parse(JSON.stringify(coverWithReferencesWorkflow));

    // Set random seed for KSampler
    const seed = Math.floor(Date.now() * 1000) % (2 ** 32);
    workflowTemplate['3'].inputs.seed = seed;

    // Set prompts
    workflowTemplate['6'].inputs.text = prompt.positive;
    workflowTemplate['7'].inputs.text = prompt.negative;

    // Set LoRAs if provided
    if (prompt.loras && prompt.loras.length > 0) {
      const loraNode = workflowTemplate['11'];
      prompt.loras.slice(0, 4).forEach((lora, index) => {
        const loraNum = (index + 1).toString().padStart(2, '0');
        loraNode.inputs[`lora_${loraNum}`] = lora.filepathRelative.replace(/\//g, '\\');
        loraNode.inputs[`strength_${loraNum}`] = lora.strength;
      });
    }

    // Apply visual style if provided
    if (visualStyle) {
      const styledWorkflow = await this.applyVisualStyleToWorkflow(workflowTemplate, visualStyle, undefined, theme);
      // Replace @REFERENCE_PATH@ placeholder with actual path (in case it was modified)
      if (styledWorkflow['43']) {
        styledWorkflow['43'].inputs.directory = referencePath;
        logger.debug({ referencePath }, 'Set reference directory in styled workflow');
      }
      return this.executeWorkflow(styledWorkflow);
    }

    // Replace @REFERENCE_PATH@ placeholder with actual path
    if (workflowTemplate['43']) {
      workflowTemplate['43'].inputs.directory = referencePath;
      logger.debug({ referencePath }, 'Set reference directory in workflow');
    }

    // Execute the workflow
    return this.executeWorkflow(workflowTemplate);
  }

  /**
   * ============================================================================
   * END MIDDLEWARE v2.0 HIGH-LEVEL API METHODS
   * ============================================================================
   */

  /**
   * ============================================================================
   * VISUAL STYLE REFERENCE SYSTEM INTEGRATION
   * ============================================================================
   */

  /**
   * Prepare SDPrompt with visual style configuration
   * Applies checkpoint-specific config, LoRAs, and prompt modifiers
   *
   * @param basePrompt - Base positive prompt
   * @param baseNegative - Base negative prompt
   * @param style - Visual style (ANIME, REALISTIC, etc)
   * @param theme - Optional theme for Style + Theme combination
   * @param existingLoras - Optional existing LoRAs to merge with style
   * @returns Enhanced SDPrompt with style applied
   */
  async applyVisualStyleToPrompt(
    basePrompt: string,
    baseNegative: string,
    style: VisualStyle,
    theme?: Theme,
    existingLoras?: LoraConfig[]
  ): Promise<SDPrompt> {
    // Validate style
    const valid = await isValidVisualStyle(style);
    if (!valid) {
      logger.warn({ style }, 'Invalid visual style, using base prompt');
      return {
        positive: basePrompt,
        negative: baseNegative,
        loras: existingLoras || []
      };
    }

    // Get visual style configuration
    const config = await getVisualStyleConfiguration(style, undefined, theme);
    if (!config) {
      logger.warn({ style }, 'No visual style configuration found, using base prompt');
      return {
        positive: basePrompt,
        negative: baseNegative,
        loras: existingLoras || []
      };
    }

    // Build enhanced prompts
    const { positive, negative } = await this.applyVisualStyleToPrompts(
      style,
      undefined,
      theme,
      basePrompt,
      baseNegative
    );

    // Merge style LoRAs with existing LoRAs
    // Style LoRAs take priority but existing ones are appended
    const loras: LoraConfig[] = existingLoras ? [...existingLoras] : [];

    // Add style LoRAs (convert to expected format)
    config.loras.forEach(styleLora => {
      // Check if LoRA with same filename already exists
      const existingIndex = loras.findIndex(
        l => l.filepathRelative.includes(styleLora.filename)
      );

      if (existingIndex >= 0) {
        // Update existing LoRA weight
        loras[existingIndex].strength = styleLora.weight;
      } else {
        // Add new style LoRA
        // Normalize Windows path to forward slashes for ComfyUI
        const normalizedPath = styleLora.path.replace(/\\/g, '/');
        loras.push({
          name: styleLora.name,
          filepathRelative: normalizedPath,
          strength: styleLora.weight
        });
      }
    });

    return {
      positive,
      negative,
      loras
    };
  }

  /**
   * Get visual style configuration for external use
   *
   * @param style - Visual style to query
   * @param theme - Optional theme for Style + Theme combination
   * @returns Style configuration or null
   */
  async getVisualStyleConfig(
    style: VisualStyle,
    theme?: Theme
  ): Promise<{
    checkpoint: string;
    checkpointConfig: {
      sampler?: string;
      cfg?: number;
      steps?: number;
      clipSkip?: number;
    };
    loras: Array<{ filename: string; weight: number }>;
    positive: string;
    negative: string;
  } | null> {
    return buildComfyUIPayload(
      style,
      undefined,
      theme,
      '', // Base prompt will be added by caller
      ''
    );
  }

  /**
   * Apply visual style to prompts (internal helper)
   */
  private async applyVisualStyleToPrompts(
    style: VisualStyle,
    contentType: ContentType | undefined,
    theme: Theme | undefined,
    basePositive: string,
    baseNegative: string
  ): Promise<{ positive: string; negative: string }> {
    const config = await getVisualStyleConfiguration(style, contentType, theme);

    if (!config) {
      return { positive: basePositive, negative: baseNegative };
    }

    let positive = basePositive;
    let negative = baseNegative;

    // Add LoRA trigger words to positive prompt
    const triggerWords = config.loras
      .map(lora => lora.triggerWords)
      .filter(Boolean)
      .join(', ');
    if (triggerWords) {
      positive = `${positive}, ${triggerWords}`;
    }

    // Add style-specific suffixes
    if (config.positivePromptSuffix) {
      positive = `${positive}, ${config.positivePromptSuffix}`;
    }

    if (config.negativePromptSuffix) {
      negative = `${negative}, ${config.negativePromptSuffix}`;
    }

    return { positive, negative };
  }

  /**
   * Update workflow with visual style checkpoint and LoRAs
   * This method modifies the workflow in-place to use the style's resources
   *
   * @param workflow - ComfyUI workflow to modify
   * @param style - Visual style to apply
   * @param contentType - Optional content type for checkpoint override (DEPRECATED, use theme)
   * @param theme - Optional theme for Style + Theme combination
   * @returns Modified workflow with style applied
   */
  async applyVisualStyleToWorkflow(
    workflow: ComfyWorkflow,
    style: VisualStyle,
    contentType?: ContentType,
    theme?: Theme
  ): Promise<ComfyWorkflow> {
    logger.info({ style, contentType, theme, caller: new Error().stack?.split('\n')[2]?.trim() }, 'applyVisualStyleToWorkflow: Called with parameters');

    const config = await getVisualStyleConfiguration(style, contentType, theme);

    logger.info({
      style,
      contentType,
      theme,
      configFound: !!config,
      checkpoint: config?.checkpoint?.filename,
      checkpointName: config?.checkpoint?.name,
      loraCount: config?.loras?.length
    }, 'applyVisualStyleToWorkflow: Configuration retrieved');

    if (!config) {
      logger.warn({ style }, 'No visual style configuration found, workflow unchanged');
      return workflow;
    }

    // Deep clone workflow to avoid modifying original
    const modifiedWorkflow = JSON.parse(JSON.stringify(workflow));

    // ============================================================================
    // SWAP CHECKPOINT IN THE WORKFLOW
    // ============================================================================
    if (config.checkpoint) {
      // Find all CheckpointLoaderSimple nodes and update them
      let checkpointUpdated = false;

      for (const nodeId in modifiedWorkflow) {
        const node = modifiedWorkflow[nodeId];
        if (node.class_type === 'CheckpointLoaderSimple') {
          // Update checkpoint filename
          const oldCheckpoint = node.inputs.ckpt_name;
          node.inputs.ckpt_name = config.checkpoint.filename;
          checkpointUpdated = true;

          logger.info(
            { nodeId, oldCheckpoint, newCheckpoint: config.checkpoint.filename },
            'Checkpoint swapped in workflow'
          );
        }
      }

      if (!checkpointUpdated) {
        logger.warn(
          { style, checkpoint: config.checkpoint.filename },
          'No CheckpointLoaderSimple node found in workflow, checkpoint not swapped'
        );
      }
    }
    // ============================================================================

    // Update LoRAs in LoraLoader node (node 11 in most workflows)
    // Handle both LoraLoader and Lora Loader Stack (rgthree) types
    const loraNodeId = Object.keys(modifiedWorkflow).find(id => {
      const node = modifiedWorkflow[id];
      return node.class_type === 'LoraLoader' ||
             node.class_type === 'Lora Loader Stack (rgthree)' ||
             node.class_type === 'Lora Loader Stack (rgthree)'; // with space
    });

    if (loraNodeId) {
      const loraNode = modifiedWorkflow[loraNodeId].inputs;

      // Determine the type of LoRA loader and update accordingly
      const isRgthreeStack = modifiedWorkflow[loraNodeId].class_type.includes('rgthree');

      if (isRgthreeStack) {
        // Clear existing LoRAs for rgthree stack (up to 10 slots)
        for (let i = 1; i <= 10; i++) {
          const loraNum = i.toString().padStart(2, '0');
          if (loraNode[`lora_${loraNum}`] !== undefined) {
            loraNode[`lora_${loraNum}`] = 'None';
          }
          if (loraNode[`strength_${loraNum}`] !== undefined) {
            loraNode[`strength_${loraNum}`] = 0;
          }
        }

        // Apply style LoRAs (use filepathRelative with Windows-style path)
        config.loras.slice(0, 10).forEach((lora, index) => {
          const loraNum = (index + 1).toString().padStart(2, '0');
          // Convert forward slashes to backslashes for ComfyUI Windows paths
          const loraPath = lora.filepathRelative || lora.filename;
          loraNode[`lora_${loraNum}`] = loraPath.replace(/\//g, '\\');
          loraNode[`strength_${loraNum}`] = lora.weight;
        });
      } else {
        // Standard LoraLoader (up to 4 slots)
        for (let i = 1; i <= 4; i++) {
          const loraNum = i.toString().padStart(2, '0');
          loraNode[`lora_${loraNum}`] = 'None';
          loraNode[`strength_${loraNum}`] = 0;
        }

        // Apply style LoRAs (use filepathRelative with Windows-style path)
        config.loras.slice(0, 4).forEach((lora, index) => {
          const loraNum = (index + 1).toString().padStart(2, '0');
          // Convert forward slashes to backslashes for ComfyUI Windows paths
          const loraPath = lora.filepathRelative || lora.filename;
          loraNode[`lora_${loraNum}`] = loraPath.replace(/\//g, '\\');
          loraNode[`strength_${loraNum}`] = lora.weight;
        });
      }

      logger.info(
        { loraCount: config.loras.length, nodeId: loraNodeId },
        'Applied visual style LoRAs to workflow'
      );
    }

    // Log final checkpoint in workflow for verification
    const finalCheckpoint = Object.values(modifiedWorkflow).find(
      (node: any) => node.class_type === 'CheckpointLoaderSimple'
    ) as any;
    logger.info(
      {
        style,
        contentType,
        theme,
        finalCheckpointInWorkflow: finalCheckpoint?.inputs?.ckpt_name,
        configCheckpoint: config?.checkpoint?.filename
      },
      'applyVisualStyleToWorkflow: Final checkpoint in workflow'
    );

    return modifiedWorkflow;
  }

  /**
   * ============================================================================
   * END VISUAL STYLE REFERENCE SYSTEM INTEGRATION
   * ============================================================================
   */

  /**
   * Health check - verify ComfyUI middleware is accessible
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
