/**
 * Avatar Correction Service
 *
 * Finds bot-generated characters without active AVATAR images and generates them.
 * This service ensures all bot-generated characters have proper avatar images.
 *
 * Phase 1 of FEATURE-011: Character Generation Flow Adjustment & Correction System
 */

import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { ImageType, ContentType } from '../../generated/prisma';
import { comfyuiService } from '../comfyui/comfyuiService';
import { r2Service } from '../r2Service';
import { promptAgent } from '../comfyui/promptAgent';
import { convertToWebP } from '../../utils/imageUtils';

/**
 * Result of batch correction operation
 */
export interface CorrectionResult {
  targetCount: number;
  successCount: number;
  failureCount: number;
  errors: Array<{ characterId: string; error: string }>;
  duration: number;
}

/**
 * Avatar Correction Service
 *
 * Responsible for finding and fixing bot-generated characters that are missing
 * their AVATAR images. This is a maintenance service to ensure data integrity.
 */
class AvatarCorrectionService {
  private readonly BOT_USER_ID = '00000000-0000-0000-0000-000000000001';

  /**
   * Find bot-generated characters without active AVATAR images
   *
   * @param limit - Maximum number of characters to return
   * @returns Array of Character objects needing correction
   */
  async findCharactersWithoutAvatars(limit: number = 50): Promise<any[]> {
    logger.info({ limit, botUserId: this.BOT_USER_ID }, 'Finding characters without avatars');

    const characters = await prisma.character.findMany({
      where: {
        userId: this.BOT_USER_ID,
        images: {
          none: {
            type: ImageType.AVATAR,
            isActive: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc', // Oldest first
      },
      take: limit,
      include: {
        lora: true,
        mainAttire: true,
        species: true,
        tags: true,
      },
    });

    logger.info({ count: characters.length }, `Found ${characters.length} characters without avatars`);

    return characters;
  }

  /**
   * Detect content type from character data
   * Used for checkpoint selection in visual style system
   */
  private detectContentType(
    speciesName?: string | null,
    physicalCharacteristics?: string | null,
    tags?: string[] | null
  ): ContentType | undefined {
    if (!speciesName && !physicalCharacteristics && !tags) {
      return undefined;
    }

    const lowerSpecies = speciesName?.toLowerCase() || '';
    const lowerPhysical = physicalCharacteristics?.toLowerCase() || '';
    const lowerTags = tags?.map(t => t.toLowerCase()).join(' ') || '';

    const combinedText = `${lowerSpecies} ${lowerPhysical} ${lowerTags}`;

    // Detect FURRY content
    if (
      combinedText.includes('furry') ||
      combinedText.includes('anthro') ||
      combinedText.includes('anthropomorphic') ||
      combinedText.includes('kemono')
    ) {
      return 'FURRY';
    }

    // Detect HENTAI content
    if (
      combinedText.includes('nsfw') ||
      combinedText.includes('explicit') ||
      combinedText.includes('ecchi')
    ) {
      return 'HENTAI';
    }

    return undefined;
  }

  /**
   * Apply visual style to prompt
   * Uses ComfyUI service to add style-specific LoRAs and prompt modifiers
   */
  private async applyVisualStyleToPrompt(
    prompt: { positive: string; negative: string; loras?: any[] },
    characterStyle: string | null,
    speciesName?: string | null,
    physicalCharacteristics?: string | null,
    tags?: string[] | null
  ): Promise<{ positive: string; negative: string; loras?: any[] }> {
    if (!characterStyle) {
      return prompt;
    }

    try {
      const contentType = this.detectContentType(speciesName, physicalCharacteristics, tags);

      const enhancedPrompt = await comfyuiService.applyVisualStyleToPrompt(
        prompt.positive,
        prompt.negative,
        characterStyle as any,
        contentType,
        prompt.loras
      );

      logger.info({
        style: characterStyle,
        contentType,
        loraCount: enhancedPrompt.loras?.length || 0,
      }, 'Visual style applied to prompt');

      return enhancedPrompt;
    } catch (error) {
      logger.warn({ error, style: characterStyle }, 'Failed to apply visual style, using base prompt');
      return prompt;
    }
  }

  /**
   * Generate AVATAR image for a single character
   *
   * This method:
   * 1. Fetches the character data
   * 2. Generates prompts using promptAgent
   * 3. Applies visual style (checkpoint + LoRAs)
   * 4. Executes ComfyUI workflow to generate avatar
   * 5. Converts to WebP
   * 6. Uploads to R2
   * 7. Saves to database
   *
   * @param characterId - ID of the character to correct
   * @returns true if successful, false otherwise
   */
  async correctCharacterAvatar(characterId: string): Promise<boolean> {
    const startTime = Date.now();
    logger.info({ characterId }, 'Starting avatar correction');

    try {
      // Fetch character with all needed data
      const character = await prisma.character.findUnique({
        where: { id: characterId },
        include: {
          lora: true,
          mainAttire: true,
          species: true,
          tags: true,
        },
      });

      if (!character) {
        logger.warn({ characterId }, 'Character not found');
        return false;
      }

      // Verify it's a bot user's character
      if (character.userId !== this.BOT_USER_ID) {
        logger.warn({ characterId, userId: character.userId }, 'Character does not belong to bot user');
        return false;
      }

      // Check if avatar already exists
      const existingAvatar = await prisma.characterImage.findFirst({
        where: {
          characterId,
          type: ImageType.AVATAR,
          isActive: true,
        },
      });

      if (existingAvatar) {
        logger.info({ characterId, existingAvatarId: existingAvatar.id }, 'Avatar already exists, skipping');
        return true;
      }

      // Get character tags for content type detection
      const tagNames = character.tags.map(t => t.name);

      // Generate prompts for avatar
      const { positive, negative } = await promptAgent.generatePrompts({
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
          type: 'AVATAR',
          isNsfw: false,
        },
        userInput: undefined,
        hasReferenceImages: false,
      });

      // Build prompt payload
      const promptPayload: any = {
        positive,
        negative,
      };

      // Add LoRAs if available
      if (character.lora) {
        promptPayload.loras = [{
          name: character.lora.name,
          filepathRelative: character.lora.filepathRelative || '',
          strength: 1.0,
        }];
      }

      // Apply visual style to prompt
      const enhancedPrompt = await this.applyVisualStyleToPrompt(
        promptPayload,
        character.style,
        character.species?.name,
        character.physicalCharacteristics,
        tagNames
      );

      // Execute ComfyUI workflow for avatar generation
      logger.info({ characterId }, 'Executing avatar generation workflow');
      const workflowResult = await comfyuiService.generateAvatar(
        enhancedPrompt,
        character.style as any,
        this.detectContentType(character.species?.name, character.physicalCharacteristics, tagNames)
      );

      // Convert to WebP
      const webpBuffer = await convertToWebP(workflowResult.imageBytes, {
        prompt: enhancedPrompt.positive,
        character: character.firstName,
        type: 'avatar',
      });

      // Upload to R2
      const r2Key = `characters/${characterId}/avatar/corrected_${Date.now()}.webp`;
      const { publicUrl } = await r2Service.uploadObject({
        key: r2Key,
        body: webpBuffer,
        contentType: 'image/webp',
        cacheControl: 'public, max-age=3600',
      });

      logger.info({ characterId, r2Key, publicUrl }, 'Avatar uploaded to R2');

      // Deactivate existing avatars and create new one
      await prisma.$transaction([
        prisma.characterImage.updateMany({
          where: { characterId, type: ImageType.AVATAR },
          data: { isActive: false },
        }),
        prisma.characterImage.create({
          data: {
            characterId,
            type: ImageType.AVATAR,
            url: publicUrl,
            key: r2Key,
            sizeBytes: webpBuffer.length,
            contentType: 'image/webp',
            isActive: true,
            ageRating: character.ageRating,
            contentTags: character.contentTags,
          },
        }),
      ]);

      const duration = Date.now() - startTime;
      logger.info({ characterId, duration, imageUrl: publicUrl }, 'Avatar correction completed successfully');

      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({ err: error, characterId, duration }, 'Avatar correction failed');
      return false;
    }
  }

  /**
   * Run batch correction on multiple characters
   *
   * Processes multiple characters in sequence, continuing on errors.
   * Tracks success/failure for logging and monitoring.
   *
   * @param limit - Maximum number of characters to process
   * @returns CorrectionResult with statistics
   */
  async runBatchCorrection(limit: number = 50): Promise<CorrectionResult> {
    const startTime = Date.now();
    logger.info({ limit }, 'Starting batch avatar correction');

    // Find characters needing correction
    const characters = await this.findCharactersWithoutAvatars(limit);

    if (characters.length === 0) {
      logger.info('No characters found needing correction');
      return {
        targetCount: 0,
        successCount: 0,
        failureCount: 0,
        errors: [],
        duration: 0,
      };
    }

    logger.info({ targetCount: characters.length }, 'Processing characters for correction');

    // Process each character
    const errors: Array<{ characterId: string; error: string }> = [];
    let successCount = 0;
    let failureCount = 0;

    for (const character of characters) {
      try {
        const success = await this.correctCharacterAvatar(character.id);

        if (success) {
          successCount++;
          logger.info({ characterId: character.id, progress: `${successCount}/${characters.length}` }, 'Avatar corrected successfully');
        } else {
          failureCount++;
          errors.push({
            characterId: character.id,
            error: 'Avatar generation returned false (see logs for details)',
          });
          logger.warn({ characterId: character.id, progress: `${successCount + failureCount}/${characters.length}` }, 'Avatar correction failed');
        }

        // Small delay between generations to avoid overwhelming ComfyUI
        if (characters.indexOf(character) < characters.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds
        }
      } catch (error) {
        failureCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({
          characterId: character.id,
          error: errorMessage,
        });
        logger.error({ err: error, characterId: character.id }, 'Unexpected error during avatar correction');
      }
    }

    const duration = Date.now() - startTime;

    const result: CorrectionResult = {
      targetCount: characters.length,
      successCount,
      failureCount,
      errors,
      duration,
    };

    logger.info({
      targetCount: result.targetCount,
      successCount: result.successCount,
      failureCount: result.failureCount,
      duration,
    }, 'Batch avatar correction completed');

    return result;
  }
}

// Singleton instance
export const avatarCorrectionService = new AvatarCorrectionService();

// Export class for testing
export { AvatarCorrectionService };
