import { prisma } from '../config/database';
import { r2Service } from './r2Service';
import { processImageByType, IMAGE_PROCESSING_DEFAULTS } from './imageProcessingService';
import { logger } from '../config/logger';

export interface CompressionResult {
  processed: number;
  failed: number;
  bytesReclaimed: number;
  errors: string[];
}

export interface CompressionOptions {
  limit: number;
  targetSizeKB: number; // Images above this size will be compressed to approximately this size
}

export interface OversizedStats {
  totalImages: number;
  oversizedCount: Record<string, number>;
  totalBytesOversized: number;
}

export const imageCompressionService = {
  /**
   * Get statistics about oversized images
   */
  async getOversizedStats(): Promise<OversizedStats> {
    const thresholds = [200, 300, 500, 1000]; // KB

    const totalImages = await prisma.characterImage.count();

    const oversizedCount: Record<string, number> = {};
    let totalBytesOversized = 0;

    for (const threshold of thresholds) {
      const count = await prisma.characterImage.count({
        where: {
          sizeBytes: { gt: threshold * 1024 }
        }
      });
      oversizedCount[`>${threshold}KB`] = count;
    }

    const oversizedImages = await prisma.characterImage.findMany({
      where: {
        sizeBytes: { gt: 200 * 1024 }
      },
      select: { sizeBytes: true }
    });

    totalBytesOversized = oversizedImages.reduce(
      (sum, img) => sum + ((img.sizeBytes || 0) - 200 * 1024),
      0
    );

    return { totalImages, oversizedCount, totalBytesOversized };
  },

  /**
   * Compress oversized images
   */
  async compressOversizedImages(options: CompressionOptions): Promise<CompressionResult> {
    const { limit, targetSizeKB } = options;
    const result: CompressionResult = {
      processed: 0,
      failed: 0,
      bytesReclaimed: 0,
      errors: [],
    };

    // Fetch oversized images - select images above target size
    const oversizedImages = await prisma.characterImage.findMany({
      where: {
        sizeBytes: { gt: targetSizeKB * 1024 },
      },
      take: limit,
      orderBy: { sizeBytes: 'desc' }, // Start with largest
      select: {
        id: true,
        key: true,
        type: true,
        sizeBytes: true,
      },
    });

    logger.info({
      found: oversizedImages.length,
      targetSizeKB,
    }, 'Starting image compression job');

    for (const image of oversizedImages) {
      try {
        if (!image.key) {
          result.errors.push(`Image ${image.id}: No R2 key`);
          result.failed++;
          continue;
        }

        const originalSize = image.sizeBytes || 0;

        // Download from R2
        const buffer = await r2Service.downloadObject(image.key);

        if (!buffer) {
          result.errors.push(`Image ${image.id}: Download failed`);
          result.failed++;
          continue;
        }

        // Determine image type for processing
        const imageType = this.mapImageType(image.type);

        // Compress using existing service
        const processed = await processImageByType(buffer, imageType, targetSizeKB);

        // Upload compressed version (overwrite)
        await r2Service.uploadObject({
          key: image.key,
          body: processed.buffer,
          contentType: processed.contentType,
        });

        // Update database
        await prisma.characterImage.update({
          where: { id: image.id },
          data: {
            sizeBytes: processed.sizeBytes,
            width: processed.width,
            height: processed.height,
          },
        });

        result.bytesReclaimed += originalSize - processed.sizeBytes;
        result.processed++;

        logger.info({
          imageId: image.id,
          originalSize,
          newSize: processed.sizeBytes,
          saved: originalSize - processed.sizeBytes,
        }, 'Image compressed successfully');

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Image ${image.id}: ${errorMsg}`);
        result.failed++;
        logger.error({ imageId: image.id, error }, 'Failed to compress image');
      }
    }

    logger.info({
      processed: result.processed,
      failed: result.failed,
      bytesReclaimed: result.bytesReclaimed,
    }, 'Image compression job completed');

    return result;
  },

  /**
   * Map ImageType enum to processing type
   */
  mapImageType(type: string): keyof typeof IMAGE_PROCESSING_DEFAULTS {
    switch (type) {
      case 'AVATAR':
        return 'AVATAR';
      case 'COVER':
        return 'COVER';
      case 'SAMPLE':
        return 'SAMPLE';
      case 'STICKER':
        return 'STICKER';
      case 'REFERENCE':
        return 'REFERENCE';
      default:
        return 'OTHER';
    }
  },
};
