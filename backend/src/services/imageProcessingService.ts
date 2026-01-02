import sharp from 'sharp';
import { logger } from '../config/logger';

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  sizeBytes: number;
  contentType: string;
  format: 'webp' | 'png' | 'jpeg';
}

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'png' | 'jpeg';
  maintainAspectRatio?: boolean;
}

/**
 * Default processing options for different image types
 * Optimized for maximum file size of ~200KB per image
 */
export const IMAGE_PROCESSING_DEFAULTS = {
  AVATAR: {
    maxWidth: 400,
    maxHeight: 400,
    quality: 75,
    format: 'webp' as const,
  },
  COVER: {
    maxWidth: 1280,
    maxHeight: 720,
    quality: 70,
    format: 'webp' as const,
  },
  SAMPLE: {
    maxWidth: 800,
    maxHeight: 800,
    quality: 72,
    format: 'webp' as const,
  },
  STICKER: {
    maxWidth: 400,
    maxHeight: 400,
    quality: 75,
    format: 'webp' as const,
  },
  OTHER: {
    maxWidth: 1280,
    maxHeight: 1280,
    quality: 70,
    format: 'webp' as const,
  },
  // Reference images for multi-stage character generation
  // Stored at higher quality for consistency in character generation
  REFERENCE: {
    maxWidth: 768,
    maxHeight: 1152,  // Accommodates both square (768x768) and portrait (768x1152)
    quality: 85,
    format: 'webp' as const,
  },
};

/**
 * Process and optimize an image buffer
 * - Converts to WebP format for better compression
 * - Resizes to fit within max dimensions while maintaining aspect ratio
 * - Applies quality compression
 *
 * @param buffer Original image buffer
 * @param options Processing options
 * @returns Processed image with metadata
 */
export async function processImage(
  buffer: Buffer,
  options: ImageProcessingOptions = {}
): Promise<ProcessedImage> {
  const startTime = Date.now();

  try {
    const {
      maxWidth = 1920,
      maxHeight = 1920,
      quality = 85,
      format = 'webp',
      maintainAspectRatio = true,
    } = options;

    // Get original image metadata
    const image = sharp(buffer);
    const metadata = await image.metadata();

    logger.info(
      {
        originalWidth: metadata.width,
        originalHeight: metadata.height,
        originalFormat: metadata.format,
        originalSize: buffer.length,
      },
      'Processing image'
    );

    // Calculate new dimensions
    let resizeWidth = metadata.width;
    let resizeHeight = metadata.height;

    if (resizeWidth && resizeHeight && (resizeWidth > maxWidth || resizeHeight > maxHeight)) {
      if (maintainAspectRatio) {
        const aspectRatio = resizeWidth / resizeHeight;

        if (resizeWidth > maxWidth) {
          resizeWidth = maxWidth;
          resizeHeight = Math.round(resizeWidth / aspectRatio);
        }

        if (resizeHeight > maxHeight) {
          resizeHeight = maxHeight;
          resizeWidth = Math.round(resizeHeight * aspectRatio);
        }
      } else {
        resizeWidth = Math.min(resizeWidth, maxWidth);
        resizeHeight = Math.min(resizeHeight, maxHeight);
      }
    }

    // Process image based on target format
    let processedBuffer: Buffer;
    let contentType: string;

    const pipeline = image.resize(resizeWidth, resizeHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    });

    switch (format) {
      case 'webp':
        processedBuffer = await pipeline.webp({ quality, effort: 4 }).toBuffer();
        contentType = 'image/webp';
        break;
      case 'jpeg':
        processedBuffer = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
        contentType = 'image/jpeg';
        break;
      case 'png':
        processedBuffer = await pipeline
          .png({ quality, compressionLevel: 9, effort: 7 })
          .toBuffer();
        contentType = 'image/png';
        break;
      default:
        throw new Error(`Unsupported output format: ${format}`);
    }

    // Get final image metadata
    const finalMetadata = await sharp(processedBuffer).metadata();

    const processingTime = Date.now() - startTime;
    const compressionRatio = ((1 - processedBuffer.length / buffer.length) * 100).toFixed(2);

    logger.info(
      {
        finalWidth: finalMetadata.width,
        finalHeight: finalMetadata.height,
        finalFormat: format,
        finalSize: processedBuffer.length,
        originalSize: buffer.length,
        compressionRatio: `${compressionRatio}%`,
        processingTime: `${processingTime}ms`,
      },
      'Image processed successfully'
    );

    return {
      buffer: processedBuffer,
      width: finalMetadata.width || resizeWidth || 0,
      height: finalMetadata.height || resizeHeight || 0,
      sizeBytes: processedBuffer.length,
      contentType,
      format,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to process image');
    throw new Error('Image processing failed');
  }
}

/**
 * Process image with default settings for a specific type
 * Applies adaptive compression to keep file size under 200KB
 *
 * @param buffer Original image buffer
 * @param type Image type (AVATAR, COVER, SAMPLE, STICKER, OTHER)
 * @param targetSizeKB Target file size in KB (default: 200)
 * @returns Processed image
 */
export async function processImageByType(
  buffer: Buffer,
  type: keyof typeof IMAGE_PROCESSING_DEFAULTS,
  targetSizeKB: number = 200
): Promise<ProcessedImage> {
  const defaults = IMAGE_PROCESSING_DEFAULTS[type];
  let processed = await processImage(buffer, defaults);

  // If still too large, apply adaptive compression
  const targetBytes = targetSizeKB * 1024;
  if (processed.sizeBytes > targetBytes) {
    logger.info(
      { currentSize: processed.sizeBytes, targetSize: targetBytes },
      'Image exceeds target size, applying adaptive compression'
    );

    // Try reducing quality iteratively
    let quality = defaults.quality;
    let attempts = 0;
    const maxAttempts = 5;

    while (processed.sizeBytes > targetBytes && quality > 30 && attempts < maxAttempts) {
      quality -= 10;
      attempts++;

      logger.info({ attempt: attempts, quality }, 'Retrying with lower quality');

      processed = await processImage(buffer, {
        ...defaults,
        quality,
      });
    }

    // If still too large, reduce dimensions
    if (processed.sizeBytes > targetBytes) {
      logger.info('Still too large, reducing dimensions');

      const scaleFactor = 0.8;
      processed = await processImage(buffer, {
        ...defaults,
        maxWidth: Math.floor(defaults.maxWidth * scaleFactor),
        maxHeight: Math.floor(defaults.maxHeight * scaleFactor),
        quality: quality,
      });
    }
  }

  // Log final result
  const finalSizeKB = (processed.sizeBytes / 1024).toFixed(2);
  logger.info(
    {
      type,
      finalSize: `${finalSizeKB}KB`,
      targetSize: `${targetSizeKB}KB`,
      withinTarget: processed.sizeBytes <= targetBytes,
    },
    'Image processing complete'
  );

  return processed;
}

/**
 * Validate image buffer and check if it's a valid image
 *
 * @param buffer Image buffer to validate
 * @returns True if valid image
 */
export async function validateImage(buffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(buffer).metadata();
    return !!(metadata.width && metadata.height && metadata.format);
  } catch {
    return false;
  }
}

/**
 * Get image metadata without processing
 *
 * @param buffer Image buffer
 * @returns Image metadata
 */
export async function getImageMetadata(buffer: Buffer) {
  try {
    return await sharp(buffer).metadata();
  } catch (error) {
    logger.error({ error }, 'Failed to get image metadata');
    throw new Error('Failed to read image metadata');
  }
}
