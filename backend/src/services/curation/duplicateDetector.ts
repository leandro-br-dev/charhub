/**
 * Duplicate Detector Service
 * Detects similar or duplicate images to avoid redundancy
 */

import { logger } from '../../config/logger';

/**
 * Similarity result
 */
export interface SimilarityResult {
  isDuplicate: boolean;
  similarity: number; // 0-1
  reason: string;
  matchId?: string;
}

/**
 * Image signature for comparison
 */
export interface ImageSignature {
  id: string;
  url: string;
  tags: string[];
  author?: string;
  style?: string;
  species?: string;
  gender?: string;
}

/**
 * Duplicate Detector Service
 */
export class DuplicateDetector {
  private readonly signatures: Map<string, ImageSignature> = new Map();
  private readonly duplicateThreshold = 0.85; // 85% similarity = duplicate

  /**
   * Add image signature to database
   */
  addSignature(signature: ImageSignature): void {
    this.signatures.set(signature.id, signature);
    logger.debug({ id: signature.id }, 'Image signature added');
  }

  /**
   * Add multiple signatures
   */
  addSignatures(signatures: ImageSignature[]): void {
    for (const sig of signatures) {
      this.addSignature(sig);
    }
    logger.info({ count: signatures.length }, 'Batch signatures added');
  }

  /**
   * Check if image is duplicate
   */
  async checkDuplicate(signature: Partial<ImageSignature>): Promise<SimilarityResult> {
    let maxSimilarity = 0;
    let matchId: string | undefined;
    let reason = 'No similar images found';

    // Check against all stored signatures
    for (const [id, stored] of this.signatures.entries()) {
      const similarity = this.calculateSimilarity(signature, stored);

      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        matchId = id;
      }

      if (similarity >= this.duplicateThreshold) {
        reason = `Found ${Math.round(similarity * 100)}% similar image`;
        break;
      }
    }

    const isDuplicate = maxSimilarity >= this.duplicateThreshold;

    if (isDuplicate) {
      logger.info(
        { matchId, similarity: maxSimilarity },
        'Duplicate image detected'
      );
    }

    return {
      isDuplicate,
      similarity: maxSimilarity,
      reason,
      matchId,
    };
  }

  /**
   * Check batch of images for duplicates
   */
  async checkBatch(signatures: Partial<ImageSignature>[]): Promise<Map<string, SimilarityResult>> {
    const results = new Map<string, SimilarityResult>();

    // First, check each signature against existing database
    for (const sig of signatures) {
      if (sig.id) {
        const result = await this.checkDuplicate(sig);
        results.set(sig.id, result);

        // Add to database if not duplicate
        if (!result.isDuplicate) {
          this.addSignature(sig as ImageSignature);
        }
      }
    }

    // Then, check within the new batch for internal duplicates
    for (let i = 0; i < signatures.length; i++) {
      for (let j = i + 1; j < signatures.length; j++) {
        const sig1 = signatures[i];
        const sig2 = signatures[j];

        if (sig1.id && sig2.id) {
          const similarity = this.calculateSimilarity(sig1, sig2 as ImageSignature);
          if (similarity >= this.duplicateThreshold) {
            results.set(sig2.id, {
              isDuplicate: true,
              similarity,
              reason: `Duplicate of ${sig1.id} within batch`,
              matchId: sig1.id,
            });
          }
        }
      }
    }

    logger.info(
      { total: signatures.length, duplicates: Array.from(results.values()).filter(r => r.isDuplicate).length },
      'Batch duplicate check completed'
    );

    return results;
  }

  /**
   * Calculate similarity between two image signatures
   */
  private calculateSimilarity(sig1: Partial<ImageSignature>, sig2: ImageSignature): number {
    // Early return if required fields missing
    if (!sig2.id) return 0;

    let score = 0;
    let factors = 0;

    // URL comparison (exact match = 100%)
    if (sig1.url && sig2.url) {
      factors += 2;
      if (sig1.url === sig2.url) {
        score += 2;
      }
    }

    // Tag overlap (only if both have tags)
    if (sig1.tags?.length && sig2.tags?.length) {
      factors += 3;
      const overlap = this.getTagOverlap(sig1.tags, sig2.tags);
      score += overlap * 3;
    }

    // Author match (only add to factors if both have author info)
    if (sig1.author && sig2.author) {
      factors += 1;
      if (sig1.author === sig2.author) {
        score += 0.5; // Same author adds some similarity
      }
    }

    // Style match (only add to factors if both have style info)
    if (sig1.style && sig2.style) {
      factors += 1;
      if (sig1.style === sig2.style) {
        score += 1;
      }
    }

    // Species match (only add to factors if both have species info)
    if (sig1.species && sig2.species) {
      factors += 1;
      if (sig1.species === sig2.species) {
        score += 0.5;
      }
    }

    // Gender match (only add to factors if both have gender info)
    if (sig1.gender && sig2.gender) {
      factors += 1;
      if (sig1.gender === sig2.gender) {
        score += 0.5;
      }
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Calculate tag overlap (Jaccard similarity)
   */
  private getTagOverlap(tags1: string[], tags2: string[]): number {
    const set1 = new Set(tags1.map(t => t.toLowerCase()));
    const set2 = new Set(tags2.map(t => t.toLowerCase()));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Clear all signatures
   */
  clearSignatures(): void {
    this.signatures.clear();
    logger.info('All signatures cleared');
  }

  /**
   * Get signature count
   */
  getCount(): number {
    return this.signatures.size;
  }

  /**
   * Remove signature by ID
   */
  removeSignature(id: string): boolean {
    return this.signatures.delete(id);
  }
}

// Singleton instance
export const duplicateDetector = new DuplicateDetector();
