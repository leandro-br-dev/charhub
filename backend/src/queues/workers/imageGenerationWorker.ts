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
import { StickerStatus } from '../../generated/prisma';

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
  const { characterId, userId, referenceImageUrl, prompt: providedPrompt } = data;

  // Calculate cost
  const cost = getImageGenerationCost('avatar', { withReference: !!referenceImageUrl });

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

    // Download and upload reference image to ComfyUI if provided (for IP-Adapter)
    let referenceImageFilename: string | undefined;
    if (referenceImageUrl) {
      try {
        // Extract R2 key from URL
        // URL format: https://pub-xxx.r2.dev/characters/xxx/reference/uploaded_xxx.webp
        // or: https://media.charhub.app/characters/xxx/reference/uploaded_xxx.webp
        const urlObj = new URL(referenceImageUrl);
        const r2Key = urlObj.pathname.replace(/^\//, ''); // Remove leading slash

        // Download image directly from R2 using SDK (more reliable than fetch with presigned URL)
        const imageBuffer = await r2Service.downloadObject(r2Key);
        logger.info({ r2Key, sizeBytes: imageBuffer.length }, 'Downloaded reference image from R2');

        // Upload to ComfyUI server
        const tempFilename = `ref_${Date.now()}_${characterId}.png`;
        referenceImageFilename = await comfyuiService.uploadImage(imageBuffer, tempFilename, true);

        logger.info({ referenceImageFilename, originalUrl: referenceImageUrl }, 'Reference image uploaded to ComfyUI for IP-Adapter');
      } catch (error) {
        logger.warn({ error, referenceImageUrl }, 'Failed to upload reference image to ComfyUI, proceeding without IP-Adapter');
      }
    }

    // Use provided prompt if available, otherwise build from character data
    let prompt: any;
    if (providedPrompt && providedPrompt.trim().length > 0) {
      // Use the pre-generated Stable Diffusion prompt
      logger.info({ characterId, providedPrompt }, 'Using pre-generated Stable Diffusion prompt');
      prompt = {
        positive: providedPrompt,
        negative: 'low quality, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry',
        referenceImagePath: referenceImageFilename,
      };
    } else {
      // Fallback: Build prompt using LLM-powered translation to SD tags
      logger.info({ characterId }, 'No prompt provided, building from character data');
      prompt = await promptEngineering.buildAvatarPrompt({
        name: `${character.firstName} ${character.lastName || ''}`.trim(),
        style: character.style || undefined,
        age: character.age || undefined,
        gender: character.gender || undefined,
        species: character.species?.name || undefined,
        physicalCharacteristics: character.physicalCharacteristics || undefined,
        defaultAttire: character.mainAttire?.description || undefined,
        lora: character.lora
          ? {
              name: character.lora.name,
              filepathRelative: character.lora.filepathRelative || '',
            }
          : undefined,
      });

      // Add reference image filename to prompt if available (for ComfyUI LoadImage node)
      if (referenceImageFilename) {
        prompt.referenceImagePath = referenceImageFilename;
      }
    }

    logger.info({ characterId, prompt: prompt.positive, hasReferenceImage: !!referenceImageFilename, usedProvidedPrompt: !!providedPrompt }, 'Avatar prompt ready');

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
          isActive: true, // Set as active avatar automatically
        },
      }),
    ]);

    logger.info({ characterId, url: publicUrl }, 'Avatar generated successfully');

    return {
      success: true,
      imageUrl: publicUrl,
      characterId,
    };
  }, userId, cost, `Avatar generation for character ${characterId}`);
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

    // Build prompt (with LLM-powered translation to SD tags)
    const prompt = await promptEngineering.buildStickerPrompt(
      {
        name: `${character.firstName} ${character.lastName || ''}`.trim(),
        style: character.style || undefined,
        age: character.age || undefined,
        gender: character.gender || undefined,
        species: character.species?.name || undefined,
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
  const { characterId, userId, prompt, loras, referenceImages } = data;

  // Calculate cost
  const cost = getImageGenerationCost('multi-stage-dataset');

  logger.info({ jobId: job.id, characterId, userSamples: referenceImages?.length || 0, cost }, 'Processing multi-stage dataset generation');

  // Update job progress
  job.updateProgress({ stage: 0, total: 4, message: 'Starting multi-stage generation...' });

  // Execute with credit management
  await executeWithCredits(async () => {
    // Use the multi-stage character generator
    await multiStageCharacterGenerator.generateCharacterDataset({
      characterId,
      prompt,
      loras,
      userSamples: referenceImages || [],
      userId,
      onProgress: (stage, total, message) => {
        logger.info({ jobId: job.id, stage, total, message }, 'Multi-stage progress update');
        job.updateProgress({ stage, total, message });
      },
    });

    logger.info({ jobId: job.id, characterId }, 'Multi-stage dataset generation completed');
  }, userId, cost, `Multi-stage reference dataset for character ${characterId}`);

  return {
    success: true,
    characterId,
  };
}
