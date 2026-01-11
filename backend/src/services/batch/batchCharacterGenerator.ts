/**
 * Batch Character Generator
 * Orchestrates character generation from curated images using existing AI pipeline
 */

import { prisma } from '../../config/database';
import { CurationStatus, Visibility } from '../../generated/prisma';
import { logger } from '../../config/logger';
import { diversificationAlgorithm } from './diversificationAlgorithm';
import { queueManager } from '../../queues/QueueManager';
import { QueueName } from '../../queues/config';
import { ImageGenerationType } from '../../services/comfyui';
import type { AvatarGenerationJobData } from '../../queues/jobs/imageGenerationJob';
import { r2Service } from '../../services/r2Service';
import { analyzeCharacterImage, type CharacterImageAnalysisResult } from '../../agents/characterImageAnalysisAgent';
import { compileCharacterDataWithLLM } from '../../controllers/automatedCharacterGenerationController';
import { createCharacter } from '../../services/characterService';
import { generateStableDiffusionPrompt } from '../../controllers/automatedCharacterGenerationController';
import type { ImageType } from '../../generated/prisma';
import { multiStageCharacterGenerator } from '../image-generation/multiStageCharacterGenerator';

/**
 * Generation result
 */
export interface GenerationResult {
  curatedImageId: string;
  characterId?: string;
  success: boolean;
  error?: string;
  duration?: number;
}

/**
 * Batch generation options
 */
export interface BatchGenerationOptions {
  count: number;
  userId?: string;
  maxRetries?: number;
  delayBetweenMs?: number;
}

/**
 * Batch Character Generator
 */
export class BatchCharacterGenerator {
  private readonly maxRetries: number = 3;
  private readonly delayBetweenMs: number = 5000; // 5 seconds between generations
  private readonly botUserId: string;

  // Automated reference generation configuration
  private readonly GENERATE_REFERENCES: boolean = process.env.AUTO_GENERATE_REFERENCES !== 'false'; // Default: true
  private readonly REFERENCE_WAIT_TIMEOUT: number = parseInt(process.env.REFERENCE_WAIT_TIMEOUT || '300000', 10); // 5 minutes
  private readonly REFERENCE_POLL_INTERVAL: number = 5000; // Check every 5 seconds
  private readonly REFERENCE_GENERATION_ENABLED: boolean = true; // Master switch for reference generation

  constructor() {
    this.botUserId = process.env.OFFICIAL_BOT_USER_ID || '00000000-0000-0000-0000-000000000001';
  }

  /**
   * Generate characters from curated images using existing AI pipeline
   */
  async generateBatch(options: BatchGenerationOptions): Promise<{
    results: GenerationResult[];
    successCount: number;
    failureCount: number;
    totalDuration: number;
  }> {
    const startTime = Date.now();
    const { count, maxRetries = this.maxRetries, delayBetweenMs = this.delayBetweenMs } = options;

    logger.info({ count }, 'Starting batch character generation with AI pipeline');

    // 1. Select diverse images from approved curated images
    const selectedImageIds = await diversificationAlgorithm.selectImages({ count });
    logger.info({ selected: selectedImageIds.length }, 'Images selected for generation');

    if (selectedImageIds.length === 0) {
      logger.warn('No approved curated images available for generation');
      return {
        results: [],
        successCount: 0,
        failureCount: 0,
        totalDuration: 0,
      };
    }

    // 2. Create batch log
    const batchLog = await prisma.batchGenerationLog.create({
      data: {
        scheduledAt: new Date(),
        targetCount: count,
        selectedImages: selectedImageIds,
        generatedCharIds: [],
      },
    });

    // 3. Generate characters sequentially using existing AI pipeline
    const results: GenerationResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < selectedImageIds.length; i++) {
      const imageId = selectedImageIds[i];
      logger.info({ imageId, progress: `${i + 1}/${selectedImageIds.length}` }, 'Generating character with AI pipeline');

      const result = await this.generateSingleCharacterWithAI(imageId, maxRetries);
      results.push(result);

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }

      // Delay between generations
      if (i < selectedImageIds.length - 1 && delayBetweenMs > 0) {
        await this.delay(delayBetweenMs);
      }
    }

    // 4. Update batch log
    const totalDuration = Math.round((Date.now() - startTime) / 1000);
    await prisma.batchGenerationLog.update({
      where: { id: batchLog.id },
      data: {
        completedAt: new Date(),
        successCount,
        failureCount,
        generatedCharIds: results.filter(r => r.success).map(r => r.characterId!).filter(Boolean) as string[],
        duration: totalDuration,
        errors: results.filter(r => !r.success).map(r => ({ id: r.curatedImageId, error: r.error })),
      },
    });

    logger.info(
      {
        batchId: batchLog.id,
        successCount,
        failureCount,
        duration: totalDuration,
      },
      'Batch generation completed'
    );

    return {
      results,
      successCount,
      failureCount,
      totalDuration,
    };
  }

  /**
   * Generate a single character from curated image using existing AI pipeline
   */
  private async generateSingleCharacterWithAI(
    curatedImageId: string,
    maxRetries: number
  ): Promise<GenerationResult> {
    const startTime = Date.now();

    // Get curated image
    const curatedImage = await prisma.curatedImage.findUnique({
      where: { id: curatedImageId },
    });

    if (!curatedImage) {
      return {
        curatedImageId,
        success: false,
        error: 'Curated image not found',
      };
    }

    // Check if already generated
    if (curatedImage.generatedCharId) {
      return {
        curatedImageId,
        success: true,
        characterId: curatedImage.generatedCharId,
      };
    }

    // Mark as processing
    await prisma.curatedImage.update({
      where: { id: curatedImageId },
      data: { status: CurationStatus.PROCESSING },
    });

    // Try generation with retries
    let lastError: string | undefined;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const character = await this.generateCharacterUsingExistingPipeline(curatedImage);

        const duration = Date.now() - startTime;

        // Update curated image
        await prisma.curatedImage.update({
          where: { id: curatedImageId },
          data: {
            status: CurationStatus.COMPLETED,
            generatedCharId: character.id,
            processedAt: new Date(),
          },
        });

        return {
          curatedImageId,
          success: true,
          characterId: character.id,
          duration,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        logger.warn(
          { curatedImageId, attempt, maxRetries, error: lastError },
          'Character generation attempt failed'
        );

        if (attempt < maxRetries) {
          // Wait before retry
          await this.delay(5000 * attempt); // Exponential backoff
        }
      }
    }

    // All retries failed
    await prisma.curatedImage.update({
      where: { id: curatedImageId },
      data: {
        status: CurationStatus.FAILED,
        rejectionReason: lastError,
      },
    });

    return {
      curatedImageId,
      success: false,
      error: lastError,
    };
  }

  /**
   * Wait for avatar generation to complete
   * Polls database for active avatar image with timeout
   */
  private async waitForAvatarGeneration(characterId: string, jobId: string, timeoutMs: number = this.REFERENCE_WAIT_TIMEOUT): Promise<boolean> {
    const startTime = Date.now();

    logger.info({ characterId, jobId, timeoutMs }, 'Waiting for avatar generation to complete...');

    while (Date.now() - startTime < timeoutMs) {
      const avatar = await prisma.characterImage.findFirst({
        where: {
          characterId,
          type: 'AVATAR' as ImageType,
          isActive: true,
        },
      });

      if (avatar) {
        logger.info({ characterId, jobId, avatarUrl: avatar.url }, 'Avatar generation completed');
        return true;
      }

      // Wait before polling again
      await this.delay(this.REFERENCE_POLL_INTERVAL);
    }

    logger.warn({ characterId, jobId, elapsedMs: Date.now() - startTime }, 'Avatar generation timed out');
    return false;
  }

  /**
   * Generate reference images for automated character generation
   * Uses multiStageCharacterGenerator to generate 4 reference views
   * Gracefully handles failures - continues on error
   */
  private async generateReferenceImagesForAutomated(
    characterId: string,
    curatedImageUrl: string
  ): Promise<{ success: boolean; generatedCount: number; error?: string }> {
    if (!this.REFERENCE_GENERATION_ENABLED || !this.GENERATE_REFERENCES) {
      logger.info({ characterId, reason: 'Reference generation disabled by config' }, 'Skipping reference generation');
      return { success: true, generatedCount: 0 };
    }

    const startTime = Date.now();
    logger.info({ characterId }, 'Starting automated reference generation...');

    try {
      // Build default prompts for reference generation
      const character = await prisma.character.findUnique({
        where: { id: characterId },
        include: { species: true, mainAttire: true },
      });

      if (!character) {
        throw new Error('Character not found');
      }

      // Import prompt builder
      const { buildImagePrompt } = await import('../image-generation/promptBuilder');

      const prompt = buildImagePrompt(
        character,
        character.species,
        undefined, // No custom positive prompt
        undefined  // No custom negative prompt
      );

      // Use Civitai image as sample reference
      const referenceImages = [{ type: 'SAMPLE' as const, url: curatedImageUrl }];

      // Generate all 4 reference views
      await multiStageCharacterGenerator.generateCharacterDataset({
        characterId,
        prompt,
        loras: [], // No custom LoRAs for automated generation
        userSamples: referenceImages,
        userId: this.botUserId,
        userRole: 'ADMIN', // Bot user has admin role
        onProgress: (stage, total, message) => {
          logger.info({ characterId, stage, total, message }, 'Reference generation progress');
        },
      });

      const duration = Date.now() - startTime;
      const generatedCount = 4; // face, front, side, back

      logger.info({
        characterId,
        generatedCount,
        durationMs: duration,
      }, 'Automated reference generation completed successfully');

      return { success: true, generatedCount };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error({
        characterId,
        error: errorMessage,
        durationMs: duration,
      }, 'Automated reference generation failed');

      // Return success=false but don't throw - allow main flow to continue
      return { success: false, generatedCount: 0, error: errorMessage };
    }
  }

  /**
   * Generate character using existing AI pipeline
   * This reuses the same flow as automated character generation
   */
  private async generateCharacterUsingExistingPipeline(curatedImage: any): Promise<any> {
    // Step 1: Download or fetch image from Civitai
    const imageBuffer = await this.fetchImage(curatedImage.sourceUrl);

    // Step 2: Upload to temp location for AI analysis
    const tempFilename = `temp/civitai-${curatedImage.id}-${Date.now()}.webp`;
    const uploadResult = await r2Service.uploadObject({
      key: tempFilename,
      body: imageBuffer,
      contentType: 'image/webp',
    });

    const presignedImageUrl = await r2Service.getPresignedUrl(tempFilename, 3600);

    logger.info({
      curatedImageId: curatedImage.id,
      imageUrl: uploadResult.publicUrl
    }, 'Image uploaded for AI analysis');

    // Step 3: Analyze image using existing AI agent
    logger.info({ curatedImageId: curatedImage.id }, 'Analyzing image with AI...');
    const imageAnalysis: CharacterImageAnalysisResult = await analyzeCharacterImage(presignedImageUrl);

    // Step 4: Compile character data using LLM
    logger.info({ curatedImageId: curatedImage.id }, 'Compiling character data with LLM...');
    const characterData = await compileCharacterDataWithLLM(
      (curatedImage.description || '') + ' Anime style character.', // Explicitly specify anime style
      imageAnalysis,
      null, // No text data for Civitai images
      'en', // Default to English for bot-generated characters
      undefined // No user object for bot generation (no content filtering)
    );

    // Step 5: Create character in database
    logger.info({ curatedImageId: curatedImage.id }, 'Creating character in database...');
    const character = await createCharacter({
      userId: this.botUserId,
      firstName: characterData.firstName,
      lastName: characterData.lastName || null,
      age: characterData.age || null,
      gender: characterData.gender || null,
      species: characterData.species || null,
      style: characterData.style || 'ANIME',
      physicalCharacteristics: characterData.physicalCharacteristics || null,
      personality: characterData.personality || null,
      history: characterData.history || null,
      visibility: Visibility.PUBLIC,
      ageRating: curatedImage.ageRating,
      contentTags: curatedImage.contentTags || [],
      attireIds: [],
      tagIds: [],
    });

    logger.info({
      characterId: character.id,
      firstName: character.firstName,
      lastName: character.lastName,
    }, 'Character created successfully');

    // Step 6: Save Civitai image as reference image
    try {
      const { addCharacterImage } = await import('../imageService');

      const characterImageKey = `characters/${character.id}/reference/civitai_${curatedImage.id}.webp`;

      const characterImageUpload = await r2Service.uploadObject({
        key: characterImageKey,
        body: imageBuffer,
        contentType: 'image/webp',
      });

      await addCharacterImage({
        characterId: character.id,
        url: characterImageUpload.publicUrl,
        key: characterImageKey,
        type: 'SAMPLE' as ImageType,
        contentType: 'image/webp',
        sizeBytes: imageBuffer.length,
        runClassification: false, // Already classified during curation
      });

      logger.info({
        characterId: character.id,
        url: characterImageUpload.publicUrl,
      }, 'Civitai image saved as reference');
    } catch (error) {
      logger.warn({ error, characterId: character.id }, 'Failed to save Civitai image as reference');
      // Continue even if saving reference image fails
    }

    // Step 7: Generate avatar using ComfyUI with IP-Adapter
    let avatarJobId: string | undefined;
    try {
      logger.info({ characterId: character.id }, 'Queuing avatar generation with ComfyUI...');

      // Generate Stable Diffusion prompt
      const stableDiffusionPrompt = await generateStableDiffusionPrompt(characterData, imageAnalysis);

      // Queue avatar generation job with reference image
      const jobData: AvatarGenerationJobData = {
        type: ImageGenerationType.AVATAR,
        userId: this.botUserId,
        characterId: character.id,
        referenceImageUrl: uploadResult.publicUrl, // Use Civitai image as reference
        prompt: stableDiffusionPrompt,
      };

      const job = await queueManager.addJob(
        QueueName.IMAGE_GENERATION,
        'generate-avatar',
        jobData,
        { priority: 5 }
      );

      avatarJobId = job.id;

      logger.info({
        jobId: job.id,
        characterId: character.id,
        hasReferenceImage: true,
      }, 'Avatar generation queued with Civitai reference image');
    } catch (error) {
      logger.warn({ error, characterId: character.id }, 'Failed to queue avatar generation');
      // Continue even if avatar generation fails
    }

    // Step 8: Wait for avatar to complete and generate reference images
    if (avatarJobId && this.REFERENCE_GENERATION_ENABLED) {
      try {
        // Wait for avatar generation to complete
        const avatarCompleted = await this.waitForAvatarGeneration(character.id, avatarJobId);

        if (avatarCompleted) {
          // Generate reference images (4 views: face, front, side, back)
          logger.info({ characterId: character.id, jobId: avatarJobId }, 'Avatar completed, starting reference generation...');

          const referenceResult = await this.generateReferenceImagesForAutomated(
            character.id,
            uploadResult.publicUrl
          );

          if (referenceResult.success) {
            logger.info({
              characterId: character.id,
              generatedCount: referenceResult.generatedCount,
            }, 'Reference generation completed successfully for automated character');
          } else {
            logger.warn({
              characterId: character.id,
              error: referenceResult.error,
            }, 'Reference generation failed for automated character (non-critical)');
          }
        } else {
          logger.warn({ characterId: character.id, jobId: avatarJobId }, 'Avatar generation timed out, skipping reference generation');
        }
      } catch (error) {
        // Reference generation failure should not break the entire flow
        logger.error({
          error: error instanceof Error ? error.message : 'Unknown error',
          characterId: character.id,
        }, 'Reference generation failed for automated character (non-critical, continuing...)');
      }
    }

    return character;
  }

  /**
   * Fetch image from URL
   */
  private async fetchImage(url: string): Promise<Buffer> {
    const axios = (await import('axios')).default;

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });

    return Buffer.from(response.data);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get recent batch logs
   */
  async getRecentBatches(limit: number = 10) {
    return prisma.batchGenerationLog.findMany({
      orderBy: { scheduledAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get batch statistics
   */
  async getBatchStats(): Promise<{
    totalBatches: number;
    totalGenerated: number;
    successRate: number;
    avgDuration: number;
  }> {
    const [totalBatches, aggregates] = await Promise.all([
      prisma.batchGenerationLog.count(),
      prisma.batchGenerationLog.aggregate({
        _sum: {
          successCount: true,
          failureCount: true,
          targetCount: true,
          duration: true,
        },
        _avg: {
          duration: true,
        },
      }),
    ]);

    const totalGenerated = aggregates._sum.successCount || 0;
    const totalTarget = aggregates._sum.targetCount || 0;
    const successRate = totalTarget > 0 ? totalGenerated / totalTarget : 0;
    const avgDuration = aggregates._avg.duration || 0;

    return {
      totalBatches,
      totalGenerated,
      successRate,
      avgDuration: Math.round(avgDuration),
    };
  }
}

// Singleton instance
export const batchCharacterGenerator = new BatchCharacterGenerator();
