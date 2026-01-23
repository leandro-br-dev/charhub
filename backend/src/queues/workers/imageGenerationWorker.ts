/**
 * Image Generation Worker
 * Processes image generation jobs using ComfyUI
 * Based on old project: backend/app/tasks/character_asset_tasks.py
 */

import { Job } from 'bullmq';
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { comfyuiService, promptEngineering, promptAgent, ImageGenerationType, AVATAR_NEGATIVE_PROMPT, STANDARD_NEGATIVE_PROMPT } from '../../services/comfyui';
import type { ReferenceImage } from '../../services/comfyui/types';
import { r2Service } from '../../services/r2Service';
import { convertToWebP, getContrastingChromaKey } from '../../utils/imageUtils';
import { multiStageCharacterGenerator } from '../../services/image-generation/multiStageCharacterGenerator';
import { createTransaction } from '../../services/creditService';
import { getImageGenerationCost } from '../../config/credits';
import type {
  ImageGenerationJobData,
  ImageGenerationJobResult,
  AvatarGenerationJobData,
  StickerGenerationJobData,
  BulkStickerGenerationJobData,
  CoverGenerationJobData,
  MultiStageDatasetGenerationJobData,
  MultiStageGenerationResult,
} from '../jobs/imageGenerationJob';
import { StickerStatus, Theme } from '../../generated/prisma';

/**
 * Execute operation with credit management
 * Deducts credits before operation, refunds if operation fails
 */
async function executeWithCredits<T>(
  operation: () => Promise<T>,
  userId: string,
  cost: number,
  reason: string
): Promise<T> {
  // Deduct credits upfront
  const { transaction } = await createTransaction(
    userId,
    'CONSUMPTION',
    -cost,
    reason
  );

  logger.info({ userId, cost, transactionId: transaction.id }, 'Credits deducted for image generation');

  try {
    // Execute the operation
    const result = await operation();
    return result;
  } catch (error) {
    // Refund credits if operation fails
    logger.warn({ userId, cost, originalTransactionId: transaction.id }, 'Image generation failed, refunding credits');
    await createTransaction(
      userId,
      'REFUND',
      cost,
      `Refund for failed: ${reason}`
    );
    throw error;
  }
}

/**
 * Apply visual style to prompt based on character configuration
 * This is the centralized integration point for the Visual Style Reference System
 */
async function applyVisualStyleToPrompt(
  prompt: { positive: string; negative: string; loras?: any[]; referenceImagePath?: string },
  characterStyle: string | null
): Promise<{ positive: string; negative: string; loras?: any[]; referenceImagePath?: string }> {
  if (!characterStyle) {
    return prompt; // No style set, return prompt as-is
  }

  try {
    // Apply visual style using ComfyUI service integration
    const enhancedPrompt = await comfyuiService.applyVisualStyleToPrompt(
      prompt.positive,
      prompt.negative,
      characterStyle as any, // VisualStyle enum
      undefined, // contentType - DEPRECATED, use theme instead
      prompt.loras // Preserve existing LoRAs
    );

    // Preserve referenceImagePath if it exists
    const result = { ...enhancedPrompt };
    if (prompt.referenceImagePath) {
      result.referenceImagePath = prompt.referenceImagePath;
    }

    logger.info({
      style: characterStyle,
      loraCount: result.loras?.length || 0,
    }, 'Visual style applied to prompt');

    return result;
  } catch (error) {
    logger.warn({ error, style: characterStyle }, 'Failed to apply visual style, using base prompt');
    return prompt; // Fall back to base prompt on error
  }
}

/**
 * Process image generation job
 */
export async function processImageGeneration(
  job: Job<ImageGenerationJobData>
): Promise<ImageGenerationJobResult | MultiStageGenerationResult> {
  const { type, userId } = job.data;

  logger.info({ jobId: job.id, type, userId }, 'Processing image generation job');

  try {
    switch (type) {
      case 'avatar':
        return await processAvatarGeneration(job.data as AvatarGenerationJobData);
      case 'sticker': {
        // Check if it's bulk or single
        const stickerData = job.data as StickerGenerationJobData | BulkStickerGenerationJobData;
        if ('emotions' in stickerData) {
          return await processBulkStickerGeneration(stickerData as BulkStickerGenerationJobData);
        }
        return await processStickerGeneration(stickerData as StickerGenerationJobData);
      }
      case 'cover':
        return await processCoverGeneration(job.data as CoverGenerationJobData);
      case 'multi-stage-dataset':
        return await processMultiStageDatasetGeneration(job.data as MultiStageDatasetGenerationJobData, job);
      default:
        throw new Error(`Unsupported generation type: ${type}`);
    }
  } catch (error) {
    logger.error({ err: error, jobId: job.id }, 'Image generation job failed');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process avatar generation
 */
async function processAvatarGeneration(
  data: AvatarGenerationJobData
): Promise<ImageGenerationJobResult> {
  const { characterId, userId, referenceImageUrl, prompt: providedPrompt, imageType = 'AVATAR' } = data;

  const isCover = imageType === 'COVER';
  const imageTypeName = isCover ? 'cover' : 'avatar';

  // Calculate cost
  const cost = getImageGenerationCost(imageTypeName, { withReference: !!referenceImageUrl });

  // Execute with credit management
  return executeWithCredits(async () => {
    // Get character data
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      include: { lora: true, mainAttire: true, species: true },
    });

    if (!character) {
      throw new Error(`Character ${characterId} not found`);
    }

    // For cover with references: use prepareReferences to upload all images
    let referencePath: string | undefined;
    let referenceCount = 0;

    if (isCover) {
      // Fetch ALL existing reference images for this character
      const referenceImages = await prisma.characterImage.findMany({
        where: {
          characterId,
          type: 'REFERENCE',
        },
        orderBy: { createdAt: 'desc' },
        take: 8, // Get up to 8 reference images
        select: { url: true, key: true },
      });

      // Also include user-provided reference image if available
      const allReferences: ReferenceImage[] = [];
      if (referenceImageUrl) {
        allReferences.push({ type: 'SAMPLE', url: referenceImageUrl });
      }
      referenceImages.forEach(img => {
        allReferences.push({ type: 'REFERENCE', url: img.url });
      });

      referenceCount = allReferences.length;

      // Prepare references folder in ComfyUI if we have any
      if (allReferences.length > 0) {
        try {
          // Cleanup old references first
          await comfyuiService.cleanupReferences(characterId);

          // Prepare new references
          const prepareResponse = await comfyuiService.prepareReferences(characterId, allReferences);
          referencePath = prepareResponse.referencePath;
          logger.info({ characterId, referencePath, imageCount: allReferences.length }, 'References prepared for cover generation');
        } catch (error) {
          logger.warn({ error }, 'Failed to prepare references for cover, proceeding without references');
        }
      }
    }

    // Build prompt based on image type
    let prompt: any;
    if (isCover) {
      // For cover: use promptAgent to generate positive prompt only
      // Use STANDARD_NEGATIVE_PROMPT with facial artifact inhibitors (FEATURE-013)
      logger.info({ characterId, providedPrompt }, 'Building cover prompts with promptAgent');

      const { positive } = await promptAgent.generatePrompts({
        character: {
          name: `${character.firstName} ${character.lastName || ''}`.trim(),
          gender: character.gender || undefined,
          age: character.age || undefined,
          species: character.species?.name || undefined,
          physicalCharacteristics: character.physicalCharacteristics || undefined,
          personality: character.personality || undefined,
          defaultAttire: character.mainAttire?.description || undefined,
          style: character.style || undefined,
          // FEATURE-014: Add visualStyle and theme
          visualStyle: character.style || undefined,
          theme: character.theme || undefined,
        },
        generation: {
          type: 'COVER',
          isNsfw: false, // TODO: detect from character settings
        },
        userInput: providedPrompt ? {
          prompt: providedPrompt,
          isAdditive: false, // User prompt for cover is usually substitutive (replaces clothing/scene)
        } : undefined,
        hasReferenceImages: !!referencePath,
        referenceImageCount: referenceCount,
        // FEATURE-014: Add style and theme names for LLM
        overrides: {
          styleName: character.style ? formatStyleName(character.style) : undefined,
          themeName: character.theme ? formatThemeName(character.theme) : undefined,
        },
      });

      prompt = {
        positive,
        // STANDARD_NEGATIVE_PROMPT includes facial artifact inhibitors (FEATURE-013)
        negative: STANDARD_NEGATIVE_PROMPT,
      };

      // Add LoRAs if available
      if (character.lora) {
        prompt.loras = [{
          name: character.lora.name,
          filepathRelative: character.lora.filepathRelative || '',
          strength: 1.0,
        }];
      }
    } else {
      // For avatar: handle reference image and build prompt
      let referenceImageFilename: string | undefined;

      // For avatar with single reference image
      const referenceImages = await prisma.characterImage.findMany({
        where: { characterId, type: 'REFERENCE' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { url: true, key: true },
      });

      const referenceUrls = [...(referenceImageUrl ? [referenceImageUrl] : []), ...referenceImages.map(img => img.url)];

      if (referenceUrls.length > 0) {
        try {
          const firstRefUrl = referenceUrls[0];
          const urlObj = new URL(firstRefUrl);
          const r2Key = urlObj.pathname.replace(/^\//, '');

          const imageBuffer = await r2Service.downloadObject(r2Key);
          logger.info({ r2Key, sizeBytes: imageBuffer.length }, 'Downloaded reference image from R2');

          const tempFilename = `ref_${Date.now()}_${characterId}.png`;
          referenceImageFilename = await comfyuiService.uploadImage(imageBuffer, tempFilename, true);

          logger.info({ referenceImageFilename, originalUrl: firstRefUrl }, 'Reference image uploaded to ComfyUI for IP-Adapter');
        } catch (error) {
          logger.warn({ error }, 'Failed to upload reference image to ComfyUI, proceeding without IP-Adapter');
        }
      }

      // Use promptAgent to generate positive prompt for avatar
      // Use AVATAR_NEGATIVE_PROMPT with facial artifact inhibitors (FEATURE-013)
      logger.info({ characterId, providedPrompt }, 'Building avatar prompts with promptAgent');

      const { positive } = await promptAgent.generatePrompts({
        character: {
          name: `${character.firstName} ${character.lastName || ''}`.trim(),
          gender: character.gender || undefined,
          age: character.age || undefined,
          species: character.species?.name || undefined,
          physicalCharacteristics: character.physicalCharacteristics || undefined,
          personality: character.personality || undefined,
          defaultAttire: character.mainAttire?.description || undefined,
          style: character.style || undefined,
          // FEATURE-014: Add visualStyle
          visualStyle: character.style || undefined,
        },
        generation: {
          type: 'AVATAR',
          isNsfw: false, // TODO: detect from character settings
        },
        userInput: providedPrompt ? {
          prompt: providedPrompt,
          isAdditive: true, // Avatar user prompt is usually additive (adds details)
        } : undefined,
        hasReferenceImages: !!referenceImageFilename,
        // FEATURE-014: Add style name for LLM
        overrides: {
          styleName: character.style ? formatStyleName(character.style) : undefined,
          themeName: undefined, // Avatar doesn't use theme
        },
      });

      prompt = {
        positive,
        // AVATAR_NEGATIVE_PROMPT includes facial artifact inhibitors (FEATURE-013)
        // and body exclusions for face-only generation
        negative: AVATAR_NEGATIVE_PROMPT,
        referenceImagePath: referenceImageFilename,
      };

      // Add LoRAs if available
      if (character.lora) {
        prompt.loras = [{
          name: character.lora.name,
          filepathRelative: character.lora.filepathRelative || '',
          strength: 1.0,
        }];
      }
    }

    // ============================================================================
    // VISUAL STYLE REFERENCE SYSTEM INTEGRATION
    // Automatically applies checkpoint, LoRAs, and prompt modifiers based on character.style
    // ============================================================================
    // Get character tags for content type detection
    // Apply visual style to prompt (for prompt modifiers)
    // Note: LoRAs and checkpoint are handled in comfyuiService via workflow
    prompt = await applyVisualStyleToPrompt(
      prompt,
      character.style
    );
    // ============================================================================

    logger.info({ characterId, imageType, prompt: prompt.positive, hasReferences: !!referencePath }, `${imageTypeName} prompt ready`);

    // Generate image with ComfyUI
    // Pass visual style and theme for automatic checkpoint and LoRA swap (FEATURE-014)
    const result = isCover
      ? (referencePath
          ? await comfyuiService.generateCoverWithReferences(referencePath, prompt, character.style as any, character.theme ?? undefined)
          : await comfyuiService.generateCover(prompt, character.style as any, character.theme ?? undefined))
      : await comfyuiService.generateAvatar(prompt, character.style as any, character.theme ?? undefined);

    // Convert to WebP
    const webpBuffer = await convertToWebP(result.imageBytes, {
      prompt: prompt.positive,
      character: character.firstName,
      type: imageTypeName,
    });

    // Upload to R2
    const objectKey = `characters/${characterId}/${imageTypeName}/${imageTypeName}_${Date.now()}.webp`;
    const { publicUrl } = await r2Service.uploadObject({
      key: objectKey,
      body: webpBuffer,
      contentType: 'image/webp',
    });

    // Save to database
    if (isCover) {
      // For cover: don't deactivate other images, just create new cover
      await prisma.characterImage.create({
        data: {
          characterId,
          type: 'COVER',
          url: publicUrl,
          key: objectKey,
          contentType: 'image/webp',
          sizeBytes: webpBuffer.length,
          isActive: false, // Covers are not active by default
        },
      });
    } else {
      // For avatar: deactivate other avatars and set this as active
      await prisma.$transaction([
        prisma.characterImage.updateMany({
          where: { characterId, type: 'AVATAR' },
          data: { isActive: false },
        }),
        prisma.characterImage.create({
          data: {
            characterId,
            type: 'AVATAR',
            url: publicUrl,
            key: objectKey,
            contentType: 'image/webp',
            sizeBytes: webpBuffer.length,
            isActive: true,
          },
        }),
      ]);
    }

    logger.info({ characterId, imageType, url: publicUrl }, `${imageTypeName} generated successfully`);

    return {
      success: true,
      imageUrl: publicUrl,
      characterId,
    };
  }, userId, cost, `${imageTypeName} generation for character ${characterId}`);
}

/**
 * Process single sticker generation
 */
async function processStickerGeneration(
  data: StickerGenerationJobData
): Promise<ImageGenerationJobResult> {
  const { characterId, emotion, actionTag, customInstructions } = data;

  // Get character data
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: { lora: true, mainAttire: true, species: true },
  });

  if (!character) {
    throw new Error(`Character ${characterId} not found`);
  }

  // Get or create sticker record
  let sticker = await prisma.characterSticker.findFirst({
    where: { characterId, emotionTag: emotion },
  });

  if (!sticker) {
    sticker = await prisma.characterSticker.create({
      data: {
        characterId,
        emotionTag: emotion,
        actionTag,
        status: StickerStatus.GENERATING,
      },
    });
  } else {
    await prisma.characterSticker.update({
      where: { id: sticker.id },
      data: { status: StickerStatus.GENERATING },
    });
  }

  try {
    // Determine chroma key color
    let chromaKeyPrompt = 'solid green background, plain background, simple background, chroma key';

    // If character has an avatar, calculate contrasting color
    const existingAvatar = await prisma.characterImage.findFirst({
      where: { characterId, type: 'AVATAR' },
      orderBy: { createdAt: 'desc' },
    });

    if (existingAvatar?.url) {
      try {
        // Download avatar image from R2
        const urlObj = new URL(existingAvatar.url);
        const r2Key = urlObj.pathname.replace(/^\//, '');
        const avatarBuffer = await r2Service.downloadObject(r2Key);

        const chromaKey = await getContrastingChromaKey(avatarBuffer);
        chromaKeyPrompt = `solid ${chromaKey.name} background, plain background, simple background, chroma key`;
        logger.info({ characterId, chromaKey }, 'Using dynamic chroma key color');
      } catch (error) {
        logger.warn({ err: error }, 'Failed to calculate chroma key, using default green');
      }
    }

    // Use promptAgent to generate positive prompt for sticker
    // Use STANDARD_NEGATIVE_PROMPT with facial artifact inhibitors (FEATURE-013)
    logger.info({ characterId, emotion, actionTag }, 'Building sticker prompts with promptAgent');

    const { positive } = await promptAgent.generatePrompts({
      character: {
        name: `${character.firstName} ${character.lastName || ''}`.trim(),
        gender: character.gender || undefined,
        age: character.age || undefined,
        species: character.species?.name || undefined,
        physicalCharacteristics: character.physicalCharacteristics || undefined,
        personality: character.personality || undefined,
        defaultAttire: character.mainAttire?.description || undefined,
        style: character.style || undefined,
      },
      generation: {
        type: 'STICKER',
        isNsfw: false, // Stickers are always SFW
        emotion,
      },
      userInput: {
        prompt: `${actionTag || ''} ${customInstructions || ''} ${chromaKeyPrompt}`.trim(),
        isAdditive: true, // Adds details to the sticker
      },
      overrides: {
        background: chromaKeyPrompt,
      },
    });

    let prompt: any = {
      positive,
      // STANDARD_NEGATIVE_PROMPT includes facial artifact inhibitors (FEATURE-013)
      negative: STANDARD_NEGATIVE_PROMPT,
    };

    // Add LoRAs if available
    if (character.lora) {
      prompt.loras = [{
        name: character.lora.name,
        filepathRelative: character.lora.filepathRelative || '',
        strength: 1.0,
      }];
    }

    // ============================================================================
    // VISUAL STYLE REFERENCE SYSTEM INTEGRATION
    // Automatically applies checkpoint, LoRAs, and prompt modifiers for stickers too
    // ============================================================================
    // Get character tags for content type detection
    // Apply visual style to prompt (for prompt modifiers)
    // Note: LoRAs and checkpoint are handled in comfyuiService via workflow
    prompt = await applyVisualStyleToPrompt(
      prompt,
      character.style
    );
    // ============================================================================

    logger.info({ characterId, emotion, prompt: prompt.positive }, 'Generated sticker prompt');

    // Generate image with ComfyUI
    // Pass visual style for automatic checkpoint and LoRA swap
    const result = await comfyuiService.generateSticker(prompt, character.style as any, character.theme ?? undefined);

    // Convert to WebP (stickers have transparency)
    const webpBuffer = await convertToWebP(result.imageBytes, {
      prompt: prompt.positive,
      character: character.firstName,
      emotion,
      type: 'sticker',
    });

    // Upload to R2
    const objectKey = `characters/${characterId}/stickers/${emotion}_${Date.now()}.webp`;
    const { publicUrl } = await r2Service.uploadObject({
      key: objectKey,
      body: webpBuffer,
      contentType: 'image/webp',
    });

    // Update sticker record
    await prisma.characterSticker.update({
      where: { id: sticker.id },
      data: {
        imageUrl: publicUrl,
        promptUsed: prompt.positive,
        status: StickerStatus.COMPLETED,
      },
    });

    logger.info({ characterId, emotion, url: publicUrl }, 'Sticker generated successfully');

    return {
      success: true,
      imageUrl: publicUrl,
      characterId,
    };
  } catch (error) {
    // Mark sticker as failed
    await prisma.characterSticker.update({
      where: { id: sticker.id },
      data: { status: StickerStatus.FAILED },
    });
    throw error;
  }
}

/**
 * Process bulk sticker generation
 */
async function processBulkStickerGeneration(
  data: BulkStickerGenerationJobData
): Promise<ImageGenerationJobResult> {
  const { characterId, emotions, customInstructions, userId } = data;

  const standardEmotions = promptEngineering.getStandardEmotions();
  const emotionsToGenerate = emotions || Object.keys(standardEmotions);

  logger.info({ characterId, emotions: emotionsToGenerate }, 'Starting bulk sticker generation');

  const results: string[] = [];
  const errors: string[] = [];

  for (const emotion of emotionsToGenerate) {
    const actionTag = standardEmotions[emotion] || 'neutral expression';

    try {
      const result = await processStickerGeneration({
        type: ImageGenerationType.STICKER,
        characterId,
        userId,
        emotion,
        actionTag,
        customInstructions,
      });

      if (result.success && result.imageUrl) {
        results.push(result.imageUrl);
      } else {
        errors.push(`${emotion}: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      logger.error({ err: error, emotion }, 'Failed to generate sticker');
      errors.push(`${emotion}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    success: errors.length === 0,
    imageUrls: results,
    characterId,
    error: errors.length > 0 ? errors.join('; ') : undefined,
  };
}

/**
 * Process story cover generation
 */
async function processCoverGeneration(
  data: CoverGenerationJobData
): Promise<ImageGenerationJobResult> {
  const { storyId, referenceImageUrl, prompt } = data;

  logger.info({ storyId, prompt }, 'Processing story cover generation');

  // Get story data
  const story = await prisma.story.findUnique({
    where: { id: storyId },
  });

  if (!story) {
    throw new Error(`Story ${storyId} not found`);
  }

  // Download and upload reference image to ComfyUI if provided (for IP-Adapter)
  let referenceImageFilename: string | undefined;
  if (referenceImageUrl) {
    try {
      const urlObj = new URL(referenceImageUrl);
      const r2Key = urlObj.pathname.replace(/^\//, '');

      const imageBuffer = await r2Service.downloadObject(r2Key);
      logger.info({ r2Key, sizeBytes: imageBuffer.length }, 'Downloaded reference image from R2');

      const tempFilename = `ref_${Date.now()}_${storyId}.png`;
      referenceImageFilename = await comfyuiService.uploadImage(imageBuffer, tempFilename, true);

      logger.info({ referenceImageFilename, originalUrl: referenceImageUrl }, 'Reference image uploaded to ComfyUI for IP-Adapter');
    } catch (error) {
      logger.warn({ error, referenceImageUrl }, 'Failed to upload reference image to ComfyUI, proceeding without IP-Adapter');
    }
  }

  // Build prompt for cover generation
  const coverPrompt: any = {
    positive: prompt,
    negative: 'text, words, letters, numbers, writing, book title, author name, logo, signature, watermark, username, low quality, bad anatomy, bad hands, error, missing fingers, extra digit, fewer digits, cropped, worst quality, normal quality, jpeg artifacts, blurry, censored, bar censor, mosaic censor',
    referenceImagePath: referenceImageFilename,
  };

  logger.info({ storyId, prompt: coverPrompt.positive, hasReferenceImage: !!referenceImageFilename }, 'Cover prompt ready');

  // Generate image with ComfyUI (using avatar generation as base)
  const result = await comfyuiService.generateAvatar(coverPrompt);

  // Convert to WebP
  const webpBuffer = await convertToWebP(result.imageBytes, {
    prompt: coverPrompt.positive,
    character: story.title,
    type: 'cover',
  });

  // Upload to R2
  const objectKey = `stories/${storyId}/cover/cover_${Date.now()}.webp`;
  const { publicUrl } = await r2Service.uploadObject({
    key: objectKey,
    body: webpBuffer,
    contentType: 'image/webp',
  });

  // Update story with cover image
  await prisma.story.update({
    where: { id: storyId },
    data: { coverImage: publicUrl },
  });

  logger.info({ storyId, url: publicUrl }, 'Story cover generated successfully');

  return {
    success: true,
    imageUrl: publicUrl,
  };
}

/**
 * Process multi-stage character dataset generation
 * Generates 4 reference images sequentially: avatar, front, side, back
 */
async function processMultiStageDatasetGeneration(
  data: MultiStageDatasetGenerationJobData,
  job: Job<ImageGenerationJobData>
): Promise<MultiStageGenerationResult> {
  const { characterId, userId, userRole, prompt, loras, referenceImages, viewsToGenerate } = data;

  // Get character data for visual style and content type detection
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: { lora: true, mainAttire: true, species: true, tags: true },
  });

  if (!character) {
    throw new Error(`Character ${characterId} not found`);
  }

  // Calculate cost - adjust based on number of views being generated
  const viewsCount = viewsToGenerate?.length || 4;
  const baseCost = getImageGenerationCost('multi-stage-dataset');
  const cost = Math.ceil(baseCost * (viewsCount / 4)); // Proportional cost

  logger.info({ jobId: job.id, characterId, userSamples: referenceImages?.length || 0, cost, viewsToGenerate, visualStyle: character.style, theme: character.theme }, 'Processing multi-stage dataset generation');

  // Update job progress
  job.updateProgress({ stage: 0, total: viewsCount, message: 'Starting multi-stage generation...' });

  // Execute with credit management
  await executeWithCredits(async () => {
    // Use the multi-stage character generator
    await multiStageCharacterGenerator.generateCharacterDataset({
      characterId,
      prompt,
      loras,
      userSamples: referenceImages || [],
      userId,
      userRole,
      visualStyle: character.style as any,
      theme: character.theme as any,
      viewsToGenerate,
      onProgress: (stage, total, message, completedImages) => {
        // Include completedImages in progress for real-time UI updates
        job.updateProgress({ stage, total, message, completedImages });
      },
    });

    logger.info({ jobId: job.id, characterId }, 'Multi-stage dataset generation completed');
  }, userId, cost, `Multi-stage reference dataset for character ${characterId}`);

  return {
    success: true,
    characterId,
  };
}

/**
 * Format style enum to display name
 */
function formatStyleName(style?: string | null): string | undefined {
  if (!style) return undefined;
  const styleMap: Record<string, string> = {
    'ANIME': 'Anime',
    'REALISTIC': 'Realistic',
    'SEMI_REALISTIC': 'Semi-Realistic',
    'CARTOON': 'Cartoon',
    'CHIBI': 'Chibi',
    'PIXEL_ART': 'Pixel Art',
  };
  return styleMap[style] || style;
}

/**
 * Format theme enum to display name
 */
function formatThemeName(theme?: Theme | null): string | undefined {
  if (!theme) return undefined;
  const themeMap: Record<string, string> = {
    'DARK_FANTASY': 'Dark Fantasy',
    'FANTASY': 'Fantasy',
    'FURRY': 'Furry',
    'HENTAI': 'Hentai',
  };
  return themeMap[theme] || theme;
}
