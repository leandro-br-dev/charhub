/**
 * Age Rating Classifier Service
 * Enhanced age detection logic for content curation
 */

import { AgeRating, ContentTag } from '../../generated/prisma';
import { logger } from '../../config/logger';

/**
 * Classification result with confidence
 */
export interface AgeRatingClassification {
  rating: AgeRating;
  confidence: number; // 0-1
  reasoning: string[];
  suggestedTags: ContentTag[];
}

/**
 * Age Rating Classifier Service
 */
export class AgeRatingClassifier {
  // Tag severity mapping
  private readonly tagSeverity: Record<ContentTag, number> = {
    // Severe tags (18+)
    NUDITY: 5,
    SEXUAL: 5,
    VIOLENCE: 4,
    GORE: 4,

    // Moderate tags (16+)
    LANGUAGE: 2,
    ALCOHOL: 2,
    DRUGS: 3,

    // Mild tags (12+/14+)
    HORROR: 2,
    PSYCHOLOGICAL: 2,
    CRIME: 2,
    GAMBLING: 2,

    // Context-dependent
    DISCRIMINATION: 4,
  };

  /**
   * Classify age rating from content tags
   */
  classifyFromTags(contentTags: ContentTag[]): AgeRatingClassification {
    const reasoning: string[] = [];
    const suggestedTags: ContentTag[] = [];
    let maxSeverity = 0;

    // Calculate severity score
    for (const tag of contentTags) {
      const severity = this.tagSeverity[tag] || 0;
      maxSeverity = Math.max(maxSeverity, severity);
      suggestedTags.push(tag);

      switch (tag) {
        case 'NUDITY':
        case 'SEXUAL':
          reasoning.push('Contains nudity or sexual content (18+)');
          break;
        case 'VIOLENCE':
        case 'GORE':
          reasoning.push('Contains violence or gore (16-18+)');
          break;
        case 'LANGUAGE':
          reasoning.push('Contains strong language (16+)');
          break;
        case 'ALCOHOL':
        case 'DRUGS':
          reasoning.push('Contains substance use (14-16+)');
          break;
        case 'HORROR':
        case 'PSYCHOLOGICAL':
          reasoning.push('Contains horror or psychological themes (12-14+)');
          break;
        case 'CRIME':
        case 'DISCRIMINATION':
          reasoning.push('Contains mature themes (14-16+)');
          break;
      }
    }

    // Determine rating based on severity
    let rating: AgeRating;
    let confidence: number;

    if (maxSeverity >= 5) {
      rating = AgeRating.EIGHTEEN;
      confidence = 0.95;
    } else if (maxSeverity >= 4) {
      rating = AgeRating.SIXTEEN;
      confidence = 0.9;
    } else if (maxSeverity >= 3) {
      rating = AgeRating.FOURTEEN;
      confidence = 0.85;
    } else if (maxSeverity >= 2) {
      rating = AgeRating.TWELVE;
      confidence = 0.8;
    } else {
      rating = AgeRating.TEN;
      confidence = 0.7;
    }

    // If no tags, default to L
    if (contentTags.length === 0) {
      rating = AgeRating.L;
      confidence = 0.5;
      reasoning.push('No content tags detected - defaulting to L');
    }

    logger.debug({
      contentTags,
      rating,
      confidence,
      reasoning,
    }, 'Age rating classified from tags');

    return {
      rating,
      confidence,
      reasoning,
      suggestedTags,
    };
  }

  /**
   * Validate and potentially override AI classification
   */
  validateClassification(
    aiRating: AgeRating,
    contentTags: ContentTag[],
    confidence: number
  ): AgeRatingClassification {
    // If AI confidence is low, use our rule-based classification
    if (confidence < 0.7) {
      logger.info(
        { aiRating, confidence },
        'AI confidence low, using rule-based classification'
      );
      return this.classifyFromTags(contentTags);
    }

    // If AI says L but we have severe tags, override
    if (aiRating === AgeRating.L) {
      const classification = this.classifyFromTags(contentTags);
      if (classification.rating !== AgeRating.L) {
        logger.info(
          { aiRating, overrideRating: classification.rating },
          'Overriding AI classification due to severe content tags'
        );
        return classification;
      }
    }

    // Trust the AI classification
    return {
      rating: aiRating,
      confidence,
      reasoning: [`AI classified as ${aiRating} with ${Math.round(confidence * 100)}% confidence`],
      suggestedTags: contentTags,
    };
  }

  /**
   * Get minimum age for rating (in years)
   */
  getMinimumAge(rating: AgeRating): number {
    const ageMap: Record<AgeRating, number> = {
      [AgeRating.L]: 0,
      [AgeRating.TEN]: 10,
      [AgeRating.TWELVE]: 12,
      [AgeRating.FOURTEEN]: 14,
      [AgeRating.SIXTEEN]: 16,
      [AgeRating.EIGHTEEN]: 18,
    };

    return ageMap[rating] || 0;
  }

  /**
   * Check if rating is appropriate for given age
   */
  isAppropriateForAge(rating: AgeRating, age: number): boolean {
    const minimumAge = this.getMinimumAge(rating);
    return age >= minimumAge;
  }

  /**
   * Get rating color for UI
   */
  getRatingColor(rating: AgeRating): string {
    const colors: Record<AgeRating, string> = {
      [AgeRating.L]: 'green',
      [AgeRating.TEN]: 'blue',
      [AgeRating.TWELVE]: 'yellow',
      [AgeRating.FOURTEEN]: 'orange',
      [AgeRating.SIXTEEN]: 'red',
      [AgeRating.EIGHTEEN]: 'darkred',
    };

    return colors[rating] || 'gray';
  }
}

// Singleton instance
export const ageRatingClassifier = new AgeRatingClassifier();
