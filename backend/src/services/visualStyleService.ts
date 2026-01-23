/**
 * Visual Style Service
 *
 * Manages visual style configurations for image generation,
 * including checkpoints, LoRAs, and prompt modifiers.
 */

import { prisma } from '../config/database';
import { logger } from '../config/logger';
import type { VisualStyle, ContentType, Theme } from '../generated/prisma';

export interface LoRAConfig {
  id: string;
  name: string;
  filename: string;
  path: string;
  filepathRelative?: string | null;
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
 * @param contentType - Optional content type for checkpoint override (FURRY, HENTAI, etc) - DEPRECATED, use theme instead
 * @param theme - Optional theme for Style + Theme combination (DARK_FANTASY, FANTASY, FURRY, etc)
 * @returns Visual style configuration or null if not found
 */
export async function getVisualStyleConfiguration(
  style: VisualStyle,
  contentType?: ContentType,
  theme?: Theme
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
      themeCheckpoints: {
        include: {
          checkpoint: true,
          loraOverride: true
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

  // DEBUG: Log input parameters
  logger.info({ style, contentType, theme, defaultCheckpoint: checkpoint?.filename }, 'getVisualStyleConfiguration: Input params');

  // Priority 1: Check for Theme-based override (NEW system)
  if (theme) {
    const themeOverride = styleConfig.themeCheckpoints.find(
      tc => tc.theme === theme
    );
    logger.info({ theme, themeOverrideFound: !!themeOverride, themeOverrideCheckpoint: themeOverride?.checkpoint?.filename, allThemeCheckpoints: styleConfig.themeCheckpoints.map(tc => ({ theme: tc.theme, checkpoint: tc.checkpoint?.filename })) }, 'getVisualStyleConfiguration: Theme-based check');
    if (themeOverride) {
      checkpoint = themeOverride.checkpoint;
      checkpointConfig = themeOverride.checkpoint?.config as Record<string, any> | null;
    }
  }

  // Priority 2: Check for content-type override (LEGACY system - deprecated)
  if (!theme && contentType) {
    const contentOverride = styleConfig.contentCheckpoints.find(
      cc => cc.contentType === contentType
    );
    if (contentOverride) {
      checkpoint = contentOverride.checkpoint;
      checkpointConfig = contentOverride.checkpoint?.config as Record<string, any> | null;
    }
  }

  // DEBUG: Log final checkpoint selection
  logger.info({ style, contentType, theme, finalCheckpoint: checkpoint?.filename, finalCheckpointName: checkpoint?.name }, 'getVisualStyleConfiguration: Final checkpoint selected');

  if (!checkpoint) {
    return null;
  }

  // Build LoRA configurations
  let loras: LoRAConfig[] = styleConfig.styleLoras
    .filter(lora => lora.lora.isActive)
    .map(mapping => ({
      id: mapping.lora.id,
      name: mapping.lora.name,
      filename: mapping.lora.filename,
      path: mapping.lora.path,
      filepathRelative: mapping.lora.filepathRelative,
      triggerWords: mapping.lora.triggerWords,
      weight: mapping.weight ?? mapping.lora.weight,
      priority: mapping.priority
    }));

  // If theme has a LoRA override, use it instead of style LoRAs
  if (theme) {
    const themeOverride = styleConfig.themeCheckpoints.find(
      tc => tc.theme === theme
    );

    if (themeOverride?.loraOverride) {
      loras = [{
        id: themeOverride.loraOverride.id,
        name: themeOverride.loraOverride.name,
        filename: themeOverride.loraOverride.filename,
        path: themeOverride.loraOverride.path,
        filepathRelative: themeOverride.loraOverride.filepathRelative,
        triggerWords: themeOverride.loraOverride.triggerWords,
        weight: themeOverride.loraStrength ?? themeOverride.loraOverride.weight,
        priority: 0
      }];
    } else if (themeOverride && !themeOverride.loraOverride) {
      // Theme explicitly has no LoRA (checkpoint-only)
      loras = [];
    }
  }

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
  theme: Theme | undefined,
  basePositive: string,
  baseNegative: string
): Promise<{
  positive: string;
  negative: string;
}> {
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
 * Build ComfyUI API payload with visual style
 *
 * @param style - The visual style
 * @param contentType - Optional content type for checkpoint override (DEPRECATED, use theme)
 * @param theme - Optional theme for Style + Theme combination
 * @param basePrompt - Base positive prompt
 * @param negativePrompt - Negative prompt
 * @returns ComfyUI API payload with checkpoint and LoRAs
 */
export async function buildComfyUIPayload(
  style: VisualStyle,
  contentType: ContentType | undefined,
  theme: Theme | undefined,
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
    theme,
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

// ============================================================================
// STYLE + THEME SYSTEM
// ============================================================================

export interface StyleThemeCombination {
  style: VisualStyle;
  theme: Theme;
  checkpoint: {
    id: string;
    name: string;
    filename: string;
    path: string;
  };
  lora?: {
    id: string;
    name: string;
    filename: string;
    filepathRelative: string;
    strength: number;
  };
}

/**
 * Get checkpoint + LoRA configuration for a Style + Theme combination
 *
 * @param style - The visual style (ANIME, REALISTIC, etc)
 * @param theme - The theme (DARK_FANTASY, FANTASY, FURRY, etc)
 * @returns Style + Theme combination or null if not found
 */
export async function getStyleThemeCombination(
  style: VisualStyle,
  theme: Theme
): Promise<StyleThemeCombination | null> {
  try {
    const combo = await prisma.styleThemeCheckpoint.findUnique({
      where: {
        styleId_theme: {
          styleId: (await getStyleConfigId(style)),
          theme,
        },
      },
      include: {
        checkpoint: true,
        loraOverride: true,
      },
    });

    if (!combo) {
      logger.warn({ style, theme }, 'Style + Theme combination not found');
      return null;
    }

    return {
      style,
      theme,
      checkpoint: {
        id: combo.checkpoint.id,
        name: combo.checkpoint.name,
        filename: combo.checkpoint.filename,
        path: combo.checkpoint.path,
      },
      lora: combo.loraOverride ? {
        id: combo.loraOverride.id,
        name: combo.loraOverride.name,
        filename: combo.loraOverride.filename,
        filepathRelative: combo.loraOverride.filepathRelative!,
        strength: combo.loraStrength ?? combo.loraOverride.weight,
      } : undefined,
    };
  } catch (error) {
    logger.error({ error, style, theme }, 'Failed to get Style + Theme combination');
    return null;
  }
}

/**
 * Get all available themes for a style
 *
 * @param style - The visual style
 * @returns Array of available themes
 */
export async function getAvailableThemesForStyle(style: VisualStyle): Promise<Theme[]> {
  try {
    const styleConfig = await prisma.visualStyleConfig.findUnique({
      where: { style },
      select: { supportedThemes: true },
    });

    return styleConfig?.supportedThemes ?? [];
  } catch (error) {
    logger.error({ error, style }, 'Failed to get available themes');
    return [];
  }
}

/**
 * Get style config ID from enum
 *
 * @param style - The visual style
 * @returns The style config ID
 */
async function getStyleConfigId(style: VisualStyle): Promise<string> {
  const styleConfig = await prisma.visualStyleConfig.findUnique({
    where: { style },
    select: { id: true },
  });

  if (!styleConfig) {
    throw new Error(`Style config not found for: ${style}`);
  }

  return styleConfig.id;
}
