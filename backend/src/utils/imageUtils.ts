/**
 * Image Utilities
 * Functions for image processing and manipulation
 * Based on old project: backend/app/utils/image_utils.py
 */

import sharp from 'sharp';
import { logger } from '../config/logger';

interface ChromaKeyColor {
  name: string;
  hex: string;
}

interface ImageMetadata {
  prompt?: string;
  emotion?: string;
  character?: string;
  [key: string]: any;
}

/**
 * Convert image to WebP format with optional metadata
 */
export async function convertToWebP(
  imageBuffer: Buffer,
  metadata?: ImageMetadata,
  quality: number = 85
): Promise<Buffer> {
  try {
    const image = sharp(imageBuffer);
    const imageMetadata = await image.metadata();

    let webpOptions: sharp.WebpOptions = { quality };

    // If image has alpha channel, use lossless compression
    if (imageMetadata.hasAlpha) {
      webpOptions.lossless = true;
      logger.debug('Image has alpha channel, using lossless WebP compression');
    }

    // Convert to WebP
    let pipeline = image.webp(webpOptions);

    // Add EXIF metadata if provided
    if (metadata) {
      // Sharp doesn't support custom EXIF easily, so we'll embed it as a comment
      const metadataString = JSON.stringify(metadata);
      // Note: For full EXIF support, we'd need piexif or exiftool
      // For now, we'll just log it and convert without custom metadata
      logger.debug({ metadata: metadataString }, 'Converting image with metadata');
    }

    const webpBuffer = await pipeline.toBuffer();
    logger.info({ originalSize: imageBuffer.length, webpSize: webpBuffer.length }, 'Image converted to WebP');

    return webpBuffer;
  } catch (error) {
    logger.error({ err: error }, 'Failed to convert image to WebP');
    throw new Error(`WebP conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get contrasting chroma key color based on dominant color
 * Returns opposite color on the color wheel
 */
export async function getContrastingChromaKey(imageBuffer: Buffer): Promise<ChromaKeyColor> {
  try {
    const image = sharp(imageBuffer);

    // Resize to small size for faster processing
    const stats = await image.resize(100, 100, { fit: 'inside' }).stats();

    // Get dominant channel values
    const r = stats.channels[0].mean / 255;
    const g = stats.channels[1].mean / 255;
    const b = stats.channels[2].mean / 255;

    // Convert RGB to HSV
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    const s = max === 0 ? 0 : delta / max;
    const v = max;

    if (delta !== 0) {
      if (max === r) {
        h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
      } else if (max === g) {
        h = ((b - r) / delta + 2) / 6;
      } else {
        h = ((r - g) / delta + 4) / 6;
      }
    }

    // Check if color is too dark, light, or unsaturated
    if (v < 0.2 || v > 0.9 || s < 0.2) {
      logger.debug('Image has low saturation or extreme brightness, using default green');
      return { name: 'green', hex: '#00FF00' };
    }

    // Calculate opposite hue (add 180 degrees / 0.5)
    const oppositeH = (h + 0.5) % 1.0;

    // Convert back to RGB
    const hsvToRgb = (h: number, s: number, v: number): [number, number, number] => {
      const i = Math.floor(h * 6);
      const f = h * 6 - i;
      const p = v * (1 - s);
      const q = v * (1 - f * s);
      const t = v * (1 - (1 - f) * s);

      let r: number, g: number, b: number;

      switch (i % 6) {
        case 0: [r, g, b] = [v, t, p]; break;
        case 1: [r, g, b] = [q, v, p]; break;
        case 2: [r, g, b] = [p, v, t]; break;
        case 3: [r, g, b] = [p, q, v]; break;
        case 4: [r, g, b] = [t, p, v]; break;
        case 5: [r, g, b] = [v, p, q]; break;
        default: [r, g, b] = [0, 0, 0];
      }

      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    };

    const [oppR, oppG, oppB] = hsvToRgb(oppositeH, s, v);
    const hex = `#${oppR.toString(16).padStart(2, '0')}${oppG.toString(16).padStart(2, '0')}${oppB.toString(16).padStart(2, '0')}`;

    // Determine color name
    let colorName = 'blue';
    if (oppositeH < 0.1 || oppositeH > 0.9) colorName = 'red';
    else if (oppositeH >= 0.1 && oppositeH < 0.25) colorName = 'orange';
    else if (oppositeH >= 0.25 && oppositeH < 0.4) colorName = 'green';
    else if (oppositeH >= 0.4 && oppositeH < 0.7) colorName = 'blue';
    else if (oppositeH >= 0.7 && oppositeH < 0.9) colorName = 'magenta';

    logger.info({ colorName, hex, oppositeH }, 'Calculated contrasting chroma key color');
    return { name: colorName, hex };
  } catch (error) {
    logger.error({ err: error }, 'Failed to calculate chroma key color, using default green');
    return { name: 'green', hex: '#00FF00' };
  }
}

/**
 * Resize image to specific dimensions
 */
export async function resizeImage(
  imageBuffer: Buffer,
  width: number,
  height: number,
  fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside' = 'cover'
): Promise<Buffer> {
  try {
    return await sharp(imageBuffer)
      .resize(width, height, { fit })
      .toBuffer();
  } catch (error) {
    logger.error({ err: error, width, height }, 'Failed to resize image');
    throw new Error(`Image resize failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get image metadata (dimensions, format, etc)
 */
export async function getImageMetadata(imageBuffer: Buffer) {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: imageBuffer.length,
      hasAlpha: metadata.hasAlpha,
    };
  } catch (error) {
    logger.error({ err: error }, 'Failed to get image metadata');
    throw new Error(`Failed to get image metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate image buffer
 */
export async function validateImage(imageBuffer: Buffer): Promise<boolean> {
  try {
    await sharp(imageBuffer).metadata();
    return true;
  } catch (error) {
    logger.warn({ err: error }, 'Invalid image buffer');
    return false;
  }
}
