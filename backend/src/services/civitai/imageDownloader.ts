/**
 * Civitai Image Downloader
 * Handles downloading images from Civitai URLs
 */

import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { logger } from '../../config/logger';

export interface DownloadedImage {
  localPath: string;
  filename: string;
  sizeBytes: number;
  width: number;
  height: number;
}

/**
 * Image Downloader Service
 */
export class ImageDownloader {
  private readonly tempDir: string;
  private readonly maxFileSize: number; // 10MB max

  constructor() {
    this.tempDir = process.env.TEMP_IMAGE_DIR || '/tmp/civitai-images';
    this.maxFileSize = parseInt(process.env.MAX_IMAGE_SIZE || '10485760', 10); // 10MB
  }

  /**
   * Initialize temp directory
   */
  async init(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      logger.info({ tempDir: this.tempDir }, 'Image downloader initialized');
    } catch (error) {
      logger.error({ error }, 'Failed to create temp directory');
      throw error;
    }
  }

  /**
   * Download image from URL
   */
  async downloadImage(url: string, width?: number, height?: number): Promise<DownloadedImage> {
    try {
      // Download image
      const response = await axios.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      const sizeBytes = response.data.byteLength;

      // Check file size
      if (sizeBytes > this.maxFileSize) {
        throw new Error(`Image too large: ${sizeBytes} bytes (max ${this.maxFileSize})`);
      }

      // Validate image data
      const contentType = response.headers['content-type'];
      if (!contentType?.startsWith('image/')) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      // Generate unique filename
      const filename = this.generateFilename(url, contentType);
      const localPath = path.join(this.tempDir, filename);

      // Write to disk
      await fs.writeFile(localPath, Buffer.from(response.data));

      logger.info({
        url,
        localPath,
        sizeBytes,
        contentType,
      }, 'Image downloaded successfully');

      return {
        localPath,
        filename,
        sizeBytes,
        width: width || 0,
        height: height || 0,
      };
    } catch (error) {
      logger.error({ error, url }, 'Failed to download image');
      throw error;
    }
  }

  /**
   * Download multiple images
   */
  async downloadImages(
    images: Array<{ url: string; width?: number; height?: number }>
  ): Promise<DownloadedImage[]> {
    const results: DownloadedImage[] = [];
    const errors: Array<{ url: string; error: string }> = [];

    for (const image of images) {
      try {
        const downloaded = await this.downloadImage(image.url, image.width, image.height);
        results.push(downloaded);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ url: image.url, error: errorMsg });
        logger.warn({ url: image.url, error: errorMsg }, 'Failed to download image (continuing)');
      }
    }

    logger.info({
      total: images.length,
      successful: results.length,
      failed: errors.length,
    }, 'Batch download completed');

    return results;
  }

  /**
   * Delete downloaded image
   */
  async deleteImage(localPath: string): Promise<void> {
    try {
      await fs.unlink(localPath);
      logger.info({ localPath }, 'Image deleted successfully');
    } catch (error) {
      logger.warn({ error, localPath }, 'Failed to delete image');
    }
  }

  /**
   * Delete all images in temp directory
   */
  async clearTempDirectory(): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir);
      await Promise.all(
        files.map(file => fs.unlink(path.join(this.tempDir, file)))
      );
      logger.info({ tempDir: this.tempDir }, 'Temp directory cleared');
    } catch (error) {
      logger.error({ error }, 'Failed to clear temp directory');
    }
  }

  /**
   * Generate unique filename for image
   */
  private generateFilename(_url: string, contentType: string): string {
    const ext = this.getExtension(contentType);
    const uniqueId = randomBytes(8).toString('hex');
    return `civitai_${uniqueId}${ext}`;
  }

  /**
   * Get file extension from content type
   */
  private getExtension(contentType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
    };

    return extensions[contentType] || '.jpg';
  }

  /**
   * Get temp directory path
   */
  getTempDir(): string {
    return this.tempDir;
  }
}

// Singleton instance
export const imageDownloader = new ImageDownloader();
