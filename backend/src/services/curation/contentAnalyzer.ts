/**
 * Content Analyzer Service
 * Wraps existing image classification agents for curation
 */

import { classifyImageViaLLM, ImageClassificationResult } from '../../agents/imageClassificationAgent';
import { analyzeCharacterImage, CharacterImageAnalysisResult } from '../../agents/characterImageAnalysisAgent';
import { logger } from '../../config/logger';

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
      if (options?.checkDuplicates && options.existingImages) {
        // TODO: Implement duplicate detection using image similarity
        // For now, just check if URL is in existing list
        isDuplicate = options.existingImages.includes(imageUrl);
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
   */
  private calculateQualityScore(
    classification: ImageClassificationResult,
    characterAnalysis: CharacterImageAnalysisResult
  ): number {
    let score = 3.0; // Base score

    // Deduct for NSFW content (prefer SFW for curated content)
    const nsfwTags = ['NUDITY', 'SEXUAL', 'GORE'];
    const hasNsfw = classification.contentTags.some(tag => nsfwTags.includes(tag));
    if (hasNsfw) {
      score -= 2.0;
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
   */
  private isNsfwContent(classification: ImageClassificationResult): boolean {
    const nsfwTags = ['NUDITY', 'SEXUAL'];
    return classification.contentTags.some(tag => nsfwTags.includes(tag));
  }

  /**
   * Determine if image should be auto-approved
   */
  shouldAutoApproved(result: ContentAnalysisResult, threshold: number = 4.0): boolean {
    // Auto-approve if:
    // - Quality score meets threshold
    // - Not NSFW
    // - Not a duplicate
    // - Age rating is not EIGHTEEN (conservative)

    return (
      result.qualityScore >= threshold &&
      !result.isNsfw &&
      !result.isDuplicate &&
      result.ageRating !== 'EIGHTEEN'
    );
  }

  /**
   * Determine if image should be rejected
   */
  shouldReject(result: ContentAnalysisResult): boolean {
    // Reject if:
    // - NSFW (nudity, sexual content)
    // - Duplicate
    // - Quality too low (< 2.0)
    // - Analysis failed

    const hasNudityOrSexual = result.contentTags.some(tag =>
      ['NUDITY', 'SEXUAL'].includes(tag)
    );

    return (
      hasNudityOrSexual ||
      result.isDuplicate ||
      result.qualityScore < 2.0 ||
      result.overallDescription.includes('Unable to analyze')
    );
  }
}

// Singleton instance
export const contentAnalyzer = new ContentAnalyzer();
