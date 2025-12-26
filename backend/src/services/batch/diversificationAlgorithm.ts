/**
 * Diversification Algorithm
 * Selects diverse images for character generation
 */

import { prisma } from '../../config/database';
import { AgeRating } from '../../generated/prisma';
import { logger } from '../../config/logger';

/**
 * Selection criteria
 */
export interface SelectionCriteria {
  count: number;
  ageRatingDistribution?: Partial<Record<AgeRating, number>>;
  styleBalance?: boolean;
  tagDiversity?: boolean;
  genderBalance?: boolean;
}

/**
 * Diversification Algorithm
 */
export class DiversificationAlgorithm {
  private readonly defaultDistribution: Record<AgeRating, number> = {
    [AgeRating.L]: 3,      // 15%
    [AgeRating.TEN]: 3,    // 15%
    [AgeRating.TWELVE]: 3, // 15%
    [AgeRating.FOURTEEN]: 4, // 20%
    [AgeRating.SIXTEEN]: 4, // 20%
    [AgeRating.EIGHTEEN]: 3, // 15%
  };

  /**
   * Select diverse images from approved queue
   */
  async selectImages(criteria: SelectionCriteria): Promise<string[]> {
    const { count, ageRatingDistribution, styleBalance = true, tagDiversity = true } = criteria;

    logger.info({ criteria }, 'Starting image selection with diversification');

    // Get distribution
    const distribution = ageRatingDistribution || this.defaultDistribution;

    // Select images per age rating
    const selected: string[] = [];
    const usedTags = new Set<string>();

    for (const [rating, targetCount] of Object.entries(distribution)) {
      const ratingImages = await this.selectForRating(
        rating as AgeRating,
        targetCount,
        usedTags,
        styleBalance,
        tagDiversity
      );

      selected.push(...ratingImages);
    }

    // If we didn't get enough, fill remaining with any approved images
    if (selected.length < count) {
      const remaining = count - selected.length;
      const additional = await this.selectRemaining(
        remaining,
        selected,
        usedTags
      );
      selected.push(...additional);
    }

    // Trim if we got too many
    const finalSelection = selected.slice(0, count);

    logger.info(
      { requested: count, selected: finalSelection.length },
      'Diversified image selection completed'
    );

    return finalSelection;
  }

  /**
   * Select images for specific age rating
   */
  private async selectForRating(
    rating: AgeRating,
    count: number,
    usedTags: Set<string>,
    styleBalance: boolean,
    tagDiversity: boolean
  ): Promise<string[]> {
    // Get approved images for this rating
    const images = await prisma.curatedImage.findMany({
      where: {
        status: 'APPROVED',
        ageRating: rating,
        generatedCharId: null,
      },
      orderBy: [
        { qualityScore: 'desc' },
        { createdAt: 'asc' },
      ],
      take: count * 3, // Get more to allow for filtering
    });

    // Filter and score for diversity
    const scored = images.map(img => ({
      id: img.id,
      score: this.calculateDiversityScore(img, usedTags, styleBalance),
      tags: img.tags,
      qualityScore: img.qualityScore || 0,
    }));

    // Sort by diversity score, then quality
    scored.sort((a, b) => {
      if (Math.abs(a.score - b.score) < 0.1) {
        return b.qualityScore - a.qualityScore;
      }
      return b.score - a.score;
    });

    // Select top images
    const selected: string[] = [];
    for (const item of scored) {
      if (selected.length >= count) break;

      // Check tag diversity
      if (tagDiversity && this.hasTooManySharedTags(item.tags, usedTags)) {
        continue;
      }

      selected.push(item.id);

      // Mark tags as used
      if (tagDiversity) {
        for (const tag of item.tags.slice(0, 5)) {
          usedTags.add(tag);
        }
      }
    }

    return selected;
  }

  /**
   * Select remaining images to fill quota
   */
  private async selectRemaining(
    count: number,
    exclude: string[],
    usedTags: Set<string>
  ): Promise<string[]> {
    const images = await prisma.curatedImage.findMany({
      where: {
        status: 'APPROVED',
        generatedCharId: null,
        id: { notIn: exclude },
      },
      orderBy: { qualityScore: 'desc' },
      take: count * 2,
    });

    const selected: string[] = [];
    for (const img of images) {
      if (selected.length >= count) break;

      if (!this.hasTooManySharedTags(img.tags, usedTags)) {
        selected.push(img.id);
        for (const tag of img.tags.slice(0, 5)) {
          usedTags.add(tag);
        }
      }
    }

    return selected;
  }

  /**
   * Calculate diversity score for an image
   */
  private calculateDiversityScore(
    image: any,
    usedTags: Set<string>,
    styleBalance: boolean
  ): number {
    let score = 0.5; // Base score

    // Tag diversity bonus
    const sharedTags = image.tags.filter((t: string) => usedTags.has(t)).length;
    score -= sharedTags * 0.05; // Penalty for shared tags

    // Quality bonus
    if (image.qualityScore) {
      score += (image.qualityScore / 5) * 0.2;
    }

    // Style bonus (if enabled)
    if (styleBalance && image.tags.some((t: string) =>
      ['anime', 'realistic', 'fantasy', 'sci-fi'].includes(t.toLowerCase())
    )) {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Check if image has too many shared tags
   */
  private hasTooManySharedTags(tags: string[], usedTags: Set<string>): boolean {
    const shared = tags.filter(t => usedTags.has(t)).length;
    return shared > 2; // Max 2 shared tags
  }

  /**
   * Get current selection statistics
   */
  async getSelectionStats(): Promise<{
    byAgeRating: Record<string, number>;
    totalApproved: number;
    recentQuality: { avg: number; min: number; max: number };
  }> {
    const [approved, byRating] = await Promise.all([
      prisma.curatedImage.count({
        where: { status: 'APPROVED', generatedCharId: null },
      }),
      prisma.curatedImage.groupBy({
        by: ['ageRating'],
        where: { status: 'APPROVED', generatedCharId: null },
        _count: true,
      }),
    ]);

    // Get quality stats
    const qualityStats = await prisma.curatedImage.aggregate({
      where: {
        status: 'APPROVED',
        generatedCharId: null,
        qualityScore: { not: null },
      },
      _avg: { qualityScore: true },
      _min: { qualityScore: true },
      _max: { qualityScore: true },
    });

    return {
      byAgeRating: Object.fromEntries(
        byRating.map(r => [r.ageRating, r._count])
      ),
      totalApproved: approved,
      recentQuality: {
        avg: qualityStats._avg.qualityScore || 0,
        min: qualityStats._min.qualityScore || 0,
        max: qualityStats._max.qualityScore || 0,
      },
    };
  }
}

// Singleton instance
export const diversificationAlgorithm = new DiversificationAlgorithm();
