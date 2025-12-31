/**
 * Curation Queue Service
 * Manages the queue of images awaiting curation and processing
 */

import { prisma } from '../../config/database';
import { CurationStatus, AgeRating, ContentTag } from '../../generated/prisma';
import { logger } from '../../config/logger';
import { contentAnalyzer } from './contentAnalyzer';
import { ageRatingClassifier } from './ageRatingClassifier';
import { qualityScorer } from './qualityScorer';
import type { CivitaiImageResult } from '../civitai';

// Minimum quality threshold for images from Civitai
const MIN_CIVITAI_RATING = 3.0; // Minimum 3/5 rating (60% quality)

/**
 * Curation queue item
 */
export interface CurationQueueItem {
  id: string;
  sourceUrl: string;
  sourceId?: string;
  sourcePlatform: string;
  status: CurationStatus;
  ageRating?: AgeRating;
  qualityScore?: number;
  contentTags: ContentTag[];
  description?: string;
  localPath?: string;
  createdAt: Date;
}

/**
 * Curation Queue Service
 */
export class CurationQueue {
  /**
   * Add image to curation queue
   */
  async addToQueue(image: CivitaiImageResult): Promise<CurationQueueItem | null> {
    try {
      // Quality filter: Skip low-quality images from Civitai
      // Images with rating below threshold are likely poor quality
      if (image.rating !== undefined && image.rating < MIN_CIVITAI_RATING) {
        logger.debug(
          { sourceUrl: image.url, rating: image.rating, minRating: MIN_CIVITAI_RATING },
          'Skipping low-quality image (below rating threshold)'
        );
        return null; // Return null to indicate image was skipped
      }

      // Check if already exists
      const existing = await prisma.curatedImage.findUnique({
        where: { sourceUrl: image.url },
      });

      if (existing) {
        logger.debug({ sourceUrl: image.url }, 'Image already in queue');
        return this.mapToQueueItem(existing);
      }

      // Create new curated image entry
      const curatedImage = await prisma.curatedImage.create({
        data: {
          sourceUrl: image.url,
          sourceId: image.id,
          sourcePlatform: 'civitai',
          tags: image.tags || [],
          sourceRating: image.rating,
          author: image.author,
          status: CurationStatus.PENDING,
          contentTags: [],
        },
      });

      logger.info(
        { id: curatedImage.id, sourceUrl: image.url },
        'Image added to curation queue'
      );

      return this.mapToQueueItem(curatedImage);
    } catch (error) {
      logger.error({ error, image }, 'Failed to add image to queue');
      throw error;
    }
  }

  /**
   * Add multiple images to queue
   */
  async addBatch(images: CivitaiImageResult[]): Promise<CurationQueueItem[]> {
    const results: CurationQueueItem[] = [];
    let skipped = 0;

    for (const image of images) {
      try {
        const item = await this.addToQueue(image);
        if (item) {
          results.push(item);
        } else {
          skipped++; // Image was filtered out (low quality, etc.)
        }
      } catch (error) {
        logger.warn({ url: image.url, error }, 'Failed to add image to batch (continuing)');
      }
    }

    logger.info({ total: images.length, added: results.length, skipped }, 'Batch add to queue completed');
    return results;
  }

  /**
   * Get pending items
   */
  async getPendingItems(limit: number = 50): Promise<CurationQueueItem[]> {
    const items = await prisma.curatedImage.findMany({
      where: {
        status: CurationStatus.PENDING,
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: limit,
    });

    return items.map(item => this.mapToQueueItem(item));
  }

  /**
   * Process pending items (analyze and classify)
   */
  async processPendingItems(limit: number = 20): Promise<{
    processed: number;
    approved: number;
    rejected: number;
    errors: number;
  }> {
    const pending = await this.getPendingItems(limit);

    logger.info({ count: pending.length }, 'Processing pending curation items');

    let approved = 0;
    let rejected = 0;
    let errors = 0;

    for (const item of pending) {
      try {
        await this.analyzeAndClassify(item.id);

        // Check status after analysis
        const updated = await prisma.curatedImage.findUnique({
          where: { id: item.id },
        });

        if (updated?.status === CurationStatus.APPROVED) {
          approved++;
        } else if (updated?.status === CurationStatus.REJECTED) {
          rejected++;
        }
      } catch (error) {
        logger.error({ error, itemId: item.id }, 'Failed to process item');
        errors++;

        // Mark as failed
        await prisma.curatedImage.update({
          where: { id: item.id },
          data: {
            status: CurationStatus.FAILED,
            rejectionReason: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }

    logger.info(
      { processed: pending.length, approved, rejected, errors },
      'Pending items processing completed'
    );

    return {
      processed: pending.length,
      approved,
      rejected,
      errors,
    };
  }

  /**
   * Analyze and classify a single item
   */
  async analyzeAndClassify(itemId: string): Promise<void> {
    try {
      // Get item
      const item = await prisma.curatedImage.findUnique({
        where: { id: itemId },
      });

      if (!item) {
        throw new Error(`Curated image not found: ${itemId}`);
      }

      // Mark as processing
      await prisma.curatedImage.update({
        where: { id: itemId },
        data: { status: CurationStatus.PROCESSING },
      });

      // Analyze content with duplicate detection enabled
      const analysis = await contentAnalyzer.analyzeImage(item.sourceUrl, {
        checkDuplicates: true,
      });

      // Validate age rating
      const ageClassification = ageRatingClassifier.validateClassification(
        analysis.ageRating,
        analysis.contentTags,
        0.8 // Assuming AI confidence
      );

      // Score quality
      const qualityResult = qualityScorer.scoreQuality(analysis);

      // Determine final status
      let finalStatus: CurationStatus;
      let rejectionReason: string | undefined;

      // Check for rejection criteria
      if (contentAnalyzer.shouldReject(analysis)) {
        finalStatus = CurationStatus.REJECTED;
        rejectionReason = 'Content does not meet quality standards';
      } else if (analysis.isDuplicate) {
        finalStatus = CurationStatus.REJECTED;
        rejectionReason = 'Duplicate image';
      } else if (qualityResult.recommendation === 'reject') {
        finalStatus = CurationStatus.REJECTED;
        rejectionReason = qualityResult.reasoning.join('; ');
      } else if (contentAnalyzer.shouldAutoApproved(analysis)) {
        finalStatus = CurationStatus.APPROVED;
      } else {
        // Needs manual review (but auto-approve is enabled, so approve)
        finalStatus = CurationStatus.APPROVED;
      }

      // Extract gender and species for diversity tracking
      const gender = analysis.physicalCharacteristics?.gender || 'unknown';
      const species = analysis.physicalCharacteristics?.species || 'unknown';

      // Update database
      await prisma.curatedImage.update({
        where: { id: itemId },
        data: {
          status: finalStatus,
          ageRating: ageClassification.rating,
          qualityScore: qualityResult.score,
          contentTags: analysis.contentTags,
          description: analysis.description,
          gender, // NEW: Track gender for diversity
          species, // NEW: Track species for diversity
          processedAt: new Date(),
          rejectedAt: finalStatus === CurationStatus.REJECTED ? new Date() : null,
          rejectionReason,
        },
      });

      logger.info(
        {
          itemId,
          status: finalStatus,
          ageRating: ageClassification.rating,
          qualityScore: qualityResult.score,
        },
        'Item analyzed and classified'
      );
    } catch (error) {
      logger.error({ error, itemId }, 'Failed to analyze and classify item');
      throw error;
    }
  }

  /**
   * Get approved items (ready for character generation)
   */
  async getApprovedItems(limit: number = 20): Promise<CurationQueueItem[]> {
    const items = await prisma.curatedImage.findMany({
      where: {
        status: CurationStatus.APPROVED,
        generatedCharId: null, // Not yet generated
      },
      orderBy: {
        qualityScore: 'desc', // Process highest quality first
      },
      take: limit,
    });

    return items.map(item => this.mapToQueueItem(item));
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  }> {
    const [pending, approved, rejected, processing, completed, failed] = await Promise.all([
      prisma.curatedImage.count({ where: { status: CurationStatus.PENDING } }),
      prisma.curatedImage.count({ where: { status: CurationStatus.APPROVED } }),
      prisma.curatedImage.count({ where: { status: CurationStatus.REJECTED } }),
      prisma.curatedImage.count({ where: { status: CurationStatus.PROCESSING } }),
      prisma.curatedImage.count({ where: { status: CurationStatus.COMPLETED } }),
      prisma.curatedImage.count({ where: { status: CurationStatus.FAILED } }),
    ]);

    const total = pending + approved + rejected + processing + completed + failed;

    return {
      pending,
      approved,
      rejected,
      processing,
      completed,
      failed,
      total,
    };
  }

  /**
   * Map Prisma model to queue item
   */
  private mapToQueueItem(item: any): CurationQueueItem {
    return {
      id: item.id,
      sourceUrl: item.sourceUrl,
      sourceId: item.sourceId,
      sourcePlatform: item.sourcePlatform,
      status: item.status,
      ageRating: item.ageRating,
      qualityScore: item.qualityScore,
      contentTags: item.contentTags,
      description: item.description,
      localPath: item.localPath,
      createdAt: item.createdAt,
    };
  }
}

// Singleton instance
export const curationQueue = new CurationQueue();
