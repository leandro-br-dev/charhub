/**
 * Content Analyzer Service
 * Wraps existing image classification agents for curation
 */

import { classifyImageViaLLM, ImageClassificationResult } from '../../agents/imageClassificationAgent';
import { analyzeCharacterImage, CharacterImageAnalysisResult } from '../../agents/characterImageAnalysisAgent';
import { logger } from '../../config/logger';
import { duplicateDetector } from './duplicateDetector';
import { prisma } from '../../config/database';

/**
 * Full content analysis result
 */
export interface ContentAnalysisResult {
  // From image classification
  ageRating: ImageClassificationResult['ageRating'];
  contentTags: ImageClassificationResult['contentTags'];
  description: ImageClassificationResult['description'];

  // From character image analysis
  physicalCharacteristics: CharacterImageAnalysisResult['physicalCharacteristics'];
  visualStyle: CharacterImageAnalysisResult['visualStyle'];
  clothing: CharacterImageAnalysisResult['clothing'];
  suggestedTraits: CharacterImageAnalysisResult['suggestedTraits'];
  overallDescription: CharacterImageAnalysisResult['overallDescription'];

  // Computed
  qualityScore: number; // 0-5
  isNsfw: boolean;
  isDuplicate: boolean;

  // Metadata
  analyzedAt: Date;
}

/**
 * Content Analyzer Service
 */
export class ContentAnalyzer {
  /**
   * Analyze image for curation
   */
  async analyzeImage(imageUrl: string, options?: {
    checkDuplicates?: boolean;
    existingImages?: string[];
  }): Promise<ContentAnalysisResult> {
    try {
      logger.info({ imageUrl }, 'Starting content analysis');

      // Run both analyses in parallel
      const [classification, characterAnalysis] = await Promise.all([
        classifyImageViaLLM(imageUrl),
        analyzeCharacterImage(imageUrl),
      ]);

      // Calculate quality score
      const qualityScore = this.calculateQualityScore(classification, characterAnalysis);

      // Check NSFW
      const isNsfw = this.isNsfwContent(classification);

      // Check duplicates (if requested)
      let isDuplicate = false;
      if (options?.checkDuplicates) {
        // Create signature for duplicate detection
        const signature = {
          id: imageUrl,
          url: imageUrl,
          tags: classification.contentTags,
          style: characterAnalysis.visualStyle?.artStyle,
          species: characterAnalysis.physicalCharacteristics?.species,
          gender: characterAnalysis.physicalCharacteristics?.gender,
        };

        // Check against existing curated images in database
        const existingImages = await prisma.curatedImage.findMany({
          where: {
            status: { in: ['APPROVED', 'COMPLETED'] },
          },
          select: {
            id: true,
            sourceUrl: true,
            tags: true,
          },
        });

        // Load existing signatures into detector
        duplicateDetector.clearSignatures();
        duplicateDetector.addSignatures(
          existingImages.map(img => ({
            id: img.id,
            url: img.sourceUrl,
            tags: img.tags || [],
          }))
        );

        // Check for duplicates
        const duplicateResult = await duplicateDetector.checkDuplicate(signature);
        isDuplicate = duplicateResult.isDuplicate;

        if (isDuplicate) {
          logger.info(
            {
              imageUrl,
              matchId: duplicateResult.matchId,
              similarity: duplicateResult.similarity
            },
            'Duplicate image detected during analysis'
          );
        }
      }

      const result: ContentAnalysisResult = {
        ageRating: classification.ageRating,
        contentTags: classification.contentTags,
        description: classification.description,

        physicalCharacteristics: characterAnalysis.physicalCharacteristics,
        visualStyle: characterAnalysis.visualStyle,
        clothing: characterAnalysis.clothing,
        suggestedTraits: characterAnalysis.suggestedTraits,
        overallDescription: characterAnalysis.overallDescription,

        qualityScore,
        isNsfw,
        isDuplicate,

        analyzedAt: new Date(),
      };

      logger.info(
        {
          imageUrl,
          ageRating: result.ageRating,
          qualityScore: result.qualityScore,
          isNsfw: result.isNsfw,
          isDuplicate: result.isDuplicate,
        },
        'Content analysis completed'
      );

      return result;
    } catch (error) {
      logger.error({ error, imageUrl }, 'Content analysis failed');
      throw error;
    }
  }

  /**
   * Analyze multiple images in batch
   */
  async analyzeBatch(imageUrls: string[], options?: {
    checkDuplicates?: boolean;
  }): Promise<Map<string, ContentAnalysisResult>> {
    const results = new Map<string, ContentAnalysisResult>();

    // Get all existing URLs for duplicate checking
    const existingUrls = options?.checkDuplicates ? [] : undefined;

    for (const url of imageUrls) {
      try {
        const result = await this.analyzeImage(url, {
          checkDuplicates: options?.checkDuplicates,
          existingImages: existingUrls,
        });
        results.set(url, result);
      } catch (error) {
        logger.warn({ url, error }, 'Failed to analyze image in batch (continuing)');
      }
    }

    logger.info(
      { total: imageUrls.length, successful: results.size },
      'Batch analysis completed'
    );

    return results;
  }

  /**
   * Calculate quality score (0-5)
   * Updated to allow soft NSFW content with minimal penalty
   */
  private calculateQualityScore(
    classification: ImageClassificationResult,
    characterAnalysis: CharacterImageAnalysisResult
  ): number {
    let score = 3.0; // Base score

    // Minor deduction for explicit content only (gore, extreme violence)
    // Soft NSFW (nudity, revealing clothing) is allowed with minimal penalty
    const explicitTags = ['GORE', 'EXTREME_VIOLENCE'];
    const hasExplicit = classification.contentTags.some(tag => explicitTags.includes(tag));
    if (hasExplicit) {
      score -= 1.0; // Smaller penalty for mature content
    }

    // Boost for detailed analysis
    if (characterAnalysis.overallDescription &&
        characterAnalysis.overallDescription.length > 50) {
      score += 0.5;
    }

    // Boost for physical characteristics
    if (characterAnalysis.physicalCharacteristics &&
        Object.keys(characterAnalysis.physicalCharacteristics).length > 3) {
      score += 0.5;
    }

    // Boost for visual style info
    if (characterAnalysis.visualStyle?.artStyle) {
      score += 0.5;
    }

    // Boost for clothing info
    if (characterAnalysis.clothing?.outfit) {
      score += 0.5;
    }

    // Clamp to 0-5
    return Math.max(0, Math.min(5, score));
  }

  /**
   * Check if content is NSFW
   * Updated to track NSFW but not reject it automatically
   */
  private isNsfwContent(classification: ImageClassificationResult): boolean {
    const nsfwTags = ['NUDITY', 'SEXUAL', 'GORE'];
    return classification.contentTags.some(tag => nsfwTags.includes(tag));
  }

  /**
   * Determine if image should be auto-approved
   * Updated to allow soft NSFW content (16+, 18+) if quality is good
   */
  shouldAutoApproved(result: ContentAnalysisResult, threshold: number = 4.0): boolean {
    // Auto-approve if:
    // - Quality score meets threshold
    // - Not a duplicate
    // - Not explicit pornography (we allow soft NSFW)

    // Allow EIGHTEEN (soft NSFW) content now
    return (
      result.qualityScore >= threshold &&
      !result.isDuplicate &&
      !this.isExplicitContent(result)
    );
  }

  /**
   * Check if content is explicit pornography (should be rejected)
   * Differentiates between tasteful nudity and explicit content
   */
  private isExplicitContent(result: ContentAnalysisResult): boolean {
    // This is a simplified check - in a real implementation, you'd use
    // a more sophisticated AI classifier to distinguish between:
    // - Soft NSFW: revealing clothing, swimwear, artistic nudity (ALLOW)
    // - Explicit: sexual acts, genitalia, pornography (REJECT)

    // For now, we'll be permissive and allow content unless it's clearly objectionable
    // The AI classification agent should provide more nuanced tags

    // If the description contains explicit keywords, reject
    const explicitKeywords = [
      'sexual intercourse',
      'genitalia',
      'explicit sexual act',
      'hardcore pornography'
    ];

    const description = result.overallDescription.toLowerCase();
    return explicitKeywords.some(keyword => description.includes(keyword));
  }

  /**
   * Determine if image should be rejected
   * Updated to allow soft NSFW content while rejecting explicit content
   */
  shouldReject(result: ContentAnalysisResult): boolean {
    // Reject if:
    // - Duplicate
    // - Quality too low (< 2.0)
    // - Analysis failed
    // - Explicit pornography (not soft NSFW)

    return (
      result.isDuplicate ||
      result.qualityScore < 2.0 ||
      result.overallDescription.includes('Unable to analyze') ||
      this.isExplicitContent(result)
    );
  }
}

// Singleton instance
export const contentAnalyzer = new ContentAnalyzer();
