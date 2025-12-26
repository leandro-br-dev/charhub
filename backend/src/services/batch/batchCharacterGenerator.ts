/**
 * Batch Character Generator
 * Orchestrates character generation from curated images
 */

import { prisma } from '../../config/database';
import { CurationStatus } from '../../generated/prisma';
import { logger } from '../../config/logger';
import { diversificationAlgorithm } from './diversificationAlgorithm';
import type { CreateCharacterInput } from '../../validators';

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
  userId: string;
  maxRetries?: number;
  delayBetweenMs?: number;
}

/**
 * Batch Character Generator
 */
export class BatchCharacterGenerator {
  private readonly maxRetries: number = 3;
  private readonly delayBetweenMs: number = 30000; // 30 seconds
  private readonly botUserId: string;

  constructor() {
    this.botUserId = process.env.OFFICIAL_BOT_USER_ID || 'bot_charhub_official';
  }

  /**
   * Generate characters from curated images
   */
  async generateBatch(options: BatchGenerationOptions): Promise<{
    results: GenerationResult[];
    successCount: number;
    failureCount: number;
    totalDuration: number;
  }> {
    const startTime = Date.now();
    const { count, maxRetries = this.maxRetries, delayBetweenMs = this.delayBetweenMs } = options;

    logger.info({ count }, 'Starting batch character generation');

    // 1. Select diverse images
    const selectedImageIds = await diversificationAlgorithm.selectImages({ count });
    logger.info({ selected: selectedImageIds.length }, 'Images selected for generation');

    // 2. Create batch log
    const batchLog = await prisma.batchGenerationLog.create({
      data: {
        scheduledAt: new Date(),
        targetCount: count,
        selectedImages: selectedImageIds,
        generatedCharIds: [],
      },
    });

    // 3. Generate characters sequentially
    const results: GenerationResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < selectedImageIds.length; i++) {
      const imageId = selectedImageIds[i];
      logger.info({ imageId, progress: `${i + 1}/${selectedImageIds.length}` }, 'Generating character');

      const result = await this.generateSingleCharacter(imageId, maxRetries);
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
   * Generate a single character from curated image
   */
  private async generateSingleCharacter(
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
        // Call character generation service
        const character = await this.callCharacterGeneration(curatedImage);

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
   * Call character generation service
   */
  private async callCharacterGeneration(curatedImage: any): Promise<any> {
    // Import character service to avoid circular dependency
    const { createCharacter } = await import('../characterService');

    // Build character data from curated image analysis
    const characterData: CreateCharacterInput = {
      firstName: this.generateFirstName(),
      lastName: this.generateLastName(),
      age: this.estimateAge(curatedImage),
      gender: this.estimateGender(curatedImage),
      species: this.estimateSpecies(curatedImage),
      style: this.estimateStyle(curatedImage) as any,
      physicalCharacteristics: curatedImage.description || '',
      personality: this.generatePersonality(curatedImage),
      history: this.generateHistory(curatedImage),
      visibility: 'PUBLIC' as const,
      ageRating: curatedImage.ageRating,
      contentTags: curatedImage.contentTags || [],
      userId: this.botUserId,
      attireIds: [],
      tagIds: [],
    };

    // Create character
    const character = await createCharacter(characterData);

    // Generate avatar (if needed)
    // TODO: Queue avatar generation job

    return character;
  }

  /**
   * Generate first name from image tags
   */
  private generateFirstName(): string {
    const names = [
      'Aria', 'Luna', 'Nova', 'Zara', 'Kai', 'Leo', 'Mika', 'Ren',
      'Sora', 'Yuki', 'Kira', 'Rio', 'Ace', 'Max', 'Sky', 'Storm',
    ];
    return names[Math.floor(Math.random() * names.length)];
  }

  /**
   * Generate last name
   */
  private generateLastName(): string {
    const names = [
      'Storm', 'Light', 'Shadow', 'Frost', 'Blaze', 'Moon', 'Star', 'Cloud',
      'Wright', 'Fox', 'Wolf', 'Hawk', 'Raven', 'Drake', 'Steel', 'Silver',
    ];
    return names[Math.floor(Math.random() * names.length)];
  }

  /**
   * Estimate age from tags
   */
  private estimateAge(_curatedImage: any): number {
    // TODO: Better age estimation from tags
    return 25;
  }

  /**
   * Estimate gender from tags
   */
  private estimateGender(curatedImage: any): string {
    const tags = curatedImage.tags || [];
    if (tags.some((t: string) => /girl|woman|female/i.test(t))) return 'female';
    if (tags.some((t: string) => /boy|man|male/i.test(t))) return 'male';
    return 'non-binary';
  }

  /**
   * Estimate species from tags
   */
  private estimateSpecies(curatedImage: any): string {
    const tags = curatedImage.tags || [];
    if (tags.some((t: string) => /elf|fairy/i.test(t))) return 'elf';
    if (tags.some((t: string) => /demon|devil/i.test(t))) return 'demon';
    if (tags.some((t: string) => /android|robot|cyborg/i.test(t))) return 'android';
    return 'human';
  }

  /**
   * Estimate visual style
   */
  private estimateStyle(curatedImage: any): string {
    const tags = curatedImage.tags || [];
    if (tags.some((t: string) => /anime|manga/i.test(t))) return 'ANIME';
    if (tags.some((t: string) => /realistic/i.test(t))) return 'REALISTIC';
    return 'ANIME';
  }

  /**
   * Generate personality from tags
   */
  private generatePersonality(curatedImage: any): string {
    // Extract personality from tags or use defaults
    const tags = curatedImage.tags || [];
    const traits = tags.slice(0, 5).join(', ');
    return traits || 'Mysterious and adventurous';
  }

  /**
   * Generate history/background
   */
  private generateHistory(curatedImage: any): string {
    return `A character discovered from ${curatedImage.sourcePlatform}.`;
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
