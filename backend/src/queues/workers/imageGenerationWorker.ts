/**
 * Image Generation Worker
 * Processes image generation jobs using ComfyUI
 * Based on old project: backend/app/tasks/character_asset_tasks.py
 */

import { Job } from 'bullmq';
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { comfyuiService, promptEngineering, ImageGenerationType } from '../../services/comfyui';
import { r2Service } from '../../services/r2Service';
import { convertToWebP, getContrastingChromaKey } from '../../utils/imageUtils';
import type {
  ImageGenerationJobData,
  ImageGenerationJobResult,
  AvatarGenerationJobData,
  StickerGenerationJobData,
  BulkStickerGenerationJobData,
} from '../jobs/imageGenerationJob';
import { StickerStatus } from '../../generated/prisma';

/**
 * Process image generation job
 */
export async function processImageGeneration(
  job: Job<ImageGenerationJobData>
): Promise<ImageGenerationJobResult> {
  const { type, userId } = job.data;

  logger.info({ jobId: job.id, type, userId }, 'Processing image generation job');

  try {
    switch (type) {
      case 'avatar':
        return await processAvatarGeneration(job.data as AvatarGenerationJobData);
      case 'sticker':
        // Check if it's bulk or single
        const stickerData = job.data as StickerGenerationJobData | BulkStickerGenerationJobData;
        if ('emotions' in stickerData) {
          return await processBulkStickerGeneration(stickerData as BulkStickerGenerationJobData);
        }
        return await processStickerGeneration(stickerData as StickerGenerationJobData);
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
  const { characterId } = data;

  // Get character data
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: { lora: true, mainAttire: true },
  });

  if (!character) {
    throw new Error(`Character ${characterId} not found`);
  }

  // Build prompt (with LLM-powered translation to SD tags)
  const prompt = await promptEngineering.buildAvatarPrompt({
    name: `${character.firstName} ${character.lastName || ''}`.trim(),
    style: character.style || undefined,
    age: character.age || undefined,
    gender: character.gender || undefined,
    species: character.species || undefined,
    physicalCharacteristics: character.physicalCharacteristics || undefined,
    defaultAttire: character.mainAttire?.description || undefined,
    lora: character.lora
      ? {
          name: character.lora.name,
          filepathRelative: character.lora.filepathRelative || '',
        }
      : undefined,
  });

  logger.info({ characterId, prompt: prompt.positive }, 'Generated avatar prompt');

  // Generate image with ComfyUI
  const result = await comfyuiService.generateAvatar(prompt);

  // Convert to WebP
  const webpBuffer = await convertToWebP(result.imageBytes, {
    prompt: prompt.positive,
    character: character.firstName,
    type: 'avatar',
  });

  // Upload to R2
  const objectKey = `characters/${characterId}/avatar/avatar_${Date.now()}.webp`;
  const { publicUrl } = await r2Service.uploadObject({
    key: objectKey,
    body: webpBuffer,
    contentType: 'image/webp',
  });

  // Save to database - deactivate other avatars and set this as active
  await prisma.$transaction([
    // Deactivate all existing avatars for this character
    prisma.characterImage.updateMany({
      where: {
        characterId,
        type: 'AVATAR',
      },
      data: { isActive: false },
    }),
    // Create new avatar as active
    prisma.characterImage.create({
      data: {
        characterId,
        type: 'AVATAR',
        url: publicUrl,
        key: objectKey,
        contentType: 'image/webp',
        sizeBytes: webpBuffer.length,
        isActive: false, // User must manually activate
      },
    }),
  ]);

  logger.info({ characterId, url: publicUrl }, 'Avatar generated successfully');

  return {
    success: true,
    imageUrl: publicUrl,
    characterId,
  };
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
    include: { lora: true, mainAttire: true },
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
        // Fetch avatar image
        const response = await fetch(existingAvatar.url);
        const avatarBuffer = Buffer.from(await response.arrayBuffer());
        const chromaKey = await getContrastingChromaKey(avatarBuffer);
        chromaKeyPrompt = `solid ${chromaKey.name} background, plain background, simple background, chroma key`;
        logger.info({ characterId, chromaKey }, 'Using dynamic chroma key color');
      } catch (error) {
        logger.warn({ err: error }, 'Failed to calculate chroma key, using default green');
      }
    }

    // Build prompt (with LLM-powered translation to SD tags)
    const prompt = await promptEngineering.buildStickerPrompt(
      {
        name: `${character.firstName} ${character.lastName || ''}`.trim(),
        style: character.style || undefined,
        age: character.age || undefined,
        gender: character.gender || undefined,
        species: character.species || undefined,
        physicalCharacteristics: character.physicalCharacteristics || undefined,
        defaultAttire: customInstructions || character.mainAttire?.description || undefined,
        lora: character.lora
          ? {
              name: character.lora.name,
              filepathRelative: character.lora.filepathRelative || '',
            }
          : undefined,
      },
      emotion,
      actionTag,
      chromaKeyPrompt
    );

    logger.info({ characterId, emotion, prompt: prompt.positive }, 'Generated sticker prompt');

    // Generate image with ComfyUI
    const result = await comfyuiService.generateSticker(prompt);

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
