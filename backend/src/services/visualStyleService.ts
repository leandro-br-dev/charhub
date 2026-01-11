/**
 * Visual Style Service
 *
 * Manages visual style configurations for image generation,
 * including checkpoints, LoRAs, and prompt modifiers.
 */

import { prisma } from '../config/database';
import type { VisualStyle, ContentType } from '../generated/prisma';

export interface LoRAConfig {
  id: string;
  name: string;
  filename: string;
  path: string;
  triggerWords: string | null;
  weight: number;
  priority: number;
}

export interface CheckpointConfig {
  id: string;
  name: string;
  filename: string;
  path: string;
  sampler?: string;
  cfg?: number;
  steps?: number;
  clipSkip?: number;
}

export interface VisualStyleConfiguration {
  style: VisualStyle;
  name: string;
  description: string | null;
  checkpoint: CheckpointConfig | null; // Can be null - checkpoint swap not yet implemented
  loras: LoRAConfig[];
  positivePromptSuffix: string | null;
  negativePromptSuffix: string | null;
}

/**
 * Get visual style configuration for image generation
 *
 * @param style - The visual style (ANIME, REALISTIC, etc)
 * @param contentType - Optional content type for checkpoint override (FURRY, HENTAI, etc)
 * @returns Visual style configuration or null if not found
 */
export async function getVisualStyleConfiguration(
  style: VisualStyle,
  contentType?: ContentType
): Promise<VisualStyleConfiguration | null> {
  // Fetch the visual style config with all relations
  const styleConfig = await prisma.visualStyleConfig.findUnique({
    where: { style },
    include: {
      defaultCheckpoint: true,
      contentCheckpoints: {
        include: {
          checkpoint: true
        }
      },
      styleLoras: {
        include: {
          lora: true
        },
        orderBy: {
          priority: 'asc'
        }
      }
    }
  });

  if (!styleConfig || !styleConfig.isActive) {
    return null;
  }

  // Determine which checkpoint to use
  let checkpoint = styleConfig.defaultCheckpoint;
  let checkpointConfig = styleConfig.defaultCheckpoint?.config as Record<string, any> | null;

  // Check for content-type override
  if (contentType) {
    const contentOverride = styleConfig.contentCheckpoints.find(
      cc => cc.contentType === contentType
    );
    if (contentOverride) {
      checkpoint = contentOverride.checkpoint;
      checkpointConfig = contentOverride.checkpoint?.config as Record<string, any> | null;
    }
  }

  if (!checkpoint) {
    return null;
  }

  // Build LoRA configurations
  const loras: LoRAConfig[] = styleConfig.styleLoras
    .filter(lora => lora.lora.isActive)
    .map(mapping => ({
      id: mapping.lora.id,
      name: mapping.lora.name,
      filename: mapping.lora.filename,
      path: mapping.lora.path,
      triggerWords: mapping.lora.triggerWords,
      weight: mapping.weight ?? mapping.lora.weight,
      priority: mapping.priority
    }));

  return {
    style: styleConfig.style,
    name: styleConfig.name,
    description: styleConfig.description,
    checkpoint: {
      id: checkpoint.id,
      name: checkpoint.name,
      filename: checkpoint.filename,
      path: checkpoint.path,
      sampler: checkpointConfig?.sampler,
      cfg: checkpointConfig?.cfg,
      steps: checkpointConfig?.steps,
      clipSkip: checkpointConfig?.clipSkip
    },
    loras,
    positivePromptSuffix: styleConfig.positivePromptSuffix,
    negativePromptSuffix: styleConfig.negativePromptSuffix
  };
}

/**
 * Get all available visual styles
 *
 * @returns List of all active visual styles
 */
export async function getAllVisualStyles(): Promise<Array<{
  style: VisualStyle;
  name: string;
  description: string | null;
}>> {
  const styles = await prisma.visualStyleConfig.findMany({
    where: { isActive: true },
    select: {
      style: true,
      name: true,
      description: true
    },
    orderBy: {
      style: 'asc'
    }
  });

  return styles;
}

/**
 * Get checkpoint overrides for a specific style
 *
 * @param style - The visual style
 * @returns Content type -> checkpoint mapping
 */
export async function getCheckpointOverrides(
  style: VisualStyle
): Promise<Array<{
  contentType: ContentType;
  checkpointName: string;
  checkpointFilename: string;
}>> {
  const styleConfig = await prisma.visualStyleConfig.findUnique({
    where: { style },
    include: {
      contentCheckpoints: {
        include: {
          checkpoint: true
        }
      }
    }
  });

  if (!styleConfig) {
    return [];
  }

  return styleConfig.contentCheckpoints.map(cc => ({
    contentType: cc.contentType,
    checkpointName: cc.checkpoint.name,
    checkpointFilename: cc.checkpoint.filename
  }));
}

/**
 * Apply visual style to prompts
 *
 * @param style - The visual style
 * @param contentType - Optional content type for checkpoint override
 * @param basePositive - Base positive prompt
 * @param baseNegative - Base negative prompt
 * @returns Enhanced prompts with style suffixes
 */
export async function applyVisualStyleToPrompts(
  style: VisualStyle,
  contentType: ContentType | undefined,
  basePositive: string,
  baseNegative: string
): Promise<{
  positive: string;
  negative: string;
}> {
  const config = await getVisualStyleConfiguration(style, contentType);

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
 * Build ComfyUI API payload with visual style
 *
 * @param style - The visual style
 * @param contentType - Optional content type for checkpoint override
 * @param basePrompt - Base positive prompt
 * @param negativePrompt - Negative prompt
 * @returns ComfyUI API payload with checkpoint and LoRAs
 */
export async function buildComfyUIPayload(
  style: VisualStyle,
  contentType: ContentType | undefined,
  basePrompt: string,
  negativePrompt: string
): Promise<{
  checkpoint: string;
  checkpointConfig: {
    sampler?: string;
    cfg?: number;
    steps?: number;
    clipSkip?: number;
  };
  loras: Array<{
    filename: string;
    weight: number;
  }>;
  positive: string;
  negative: string;
} | null> {
  const config = await getVisualStyleConfiguration(style, contentType);

  if (!config) {
    return null;
  }

  // Apply style to prompts
  const { positive, negative } = await applyVisualStyleToPrompts(
    style,
    contentType,
    basePrompt,
    negativePrompt
  );

  return {
    checkpoint: config.checkpoint?.filename || '',
    checkpointConfig: {
      sampler: config.checkpoint?.sampler,
      cfg: config.checkpoint?.cfg,
      steps: config.checkpoint?.steps,
      clipSkip: config.checkpoint?.clipSkip
    },
    loras: config.loras.map(lora => ({
      filename: lora.filename,
      weight: lora.weight
    })),
    positive,
    negative
  };
}

/**
 * Validate visual style exists and is active
 *
 * @param style - The visual style to validate
 * @returns True if style is valid and active
 */
export async function isValidVisualStyle(style: VisualStyle): Promise<boolean> {
  const config = await prisma.visualStyleConfig.findUnique({
    where: { style },
    select: { isActive: true }
  });

  return config?.isActive ?? false;
}
