/**
 * Quality Scorer Service
 * Assesses image quality for curation decisions
 */

import { logger } from '../../config/logger';

/**
 * Quality score result
 */
export interface QualityScoreResult {
  score: number; // 0-5
  confidence: number; // 0-1
  factors: {
    composition: number; // 0-1
    clarity: number; // 0-1
    creativity: number; // 0-1
    technical: number; // 0-1
  };
  reasoning: string[];
  recommendation: 'approve' | 'review' | 'reject';
}

/**
 * Quality Scorer Service
 */
export class QualityScorer {
  private readonly thresholds = {
    approve: 4.0,
    review: 2.5,
  };

  /**
   * Score image quality based on analysis
   */
  scoreQuality(analysis: {
    description?: string;
    overallDescription?: string;
    physicalCharacteristics?: Record<string, any>;
    visualStyle?: Record<string, any>;
    clothing?: Record<string, any>;
    suggestedTraits?: Record<string, any>;
  }): QualityScoreResult {
    const factors = {
      composition: this.assessComposition(analysis),
      clarity: this.assessClarity(analysis),
      creativity: this.assessCreativity(analysis),
      technical: this.assessTechnical(analysis),
    };

    // Calculate weighted average
    const weights = {
      composition: 0.3,
      clarity: 0.3,
      creativity: 0.2,
      technical: 0.2,
    };

    const weightedScore =
      factors.composition * weights.composition +
      factors.clarity * weights.clarity +
      factors.creativity * weights.creativity +
      factors.technical * weights.technical;

    // Convert to 0-5 scale
    const score = weightedScore * 5;

    // Calculate confidence based on amount of data
    const dataPoints = this.countDataPoints(analysis);
    const confidence = Math.min(1, dataPoints / 10); // Max confidence at 10 data points

    // Generate reasoning
    const reasoning = this.generateReasoning(factors, score, dataPoints);

    // Determine recommendation
    let recommendation: 'approve' | 'review' | 'reject';
    if (score >= this.thresholds.approve) {
      recommendation = 'approve';
    } else if (score >= this.thresholds.review) {
      recommendation = 'review';
    } else {
      recommendation = 'reject';
    }

    logger.debug({
      score,
      confidence,
      recommendation,
      factors,
    }, 'Quality score calculated');

    return {
      score: Math.round(score * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      factors,
      reasoning,
      recommendation,
    };
  }

  /**
   * Assess composition (visual balance, framing)
   */
  private assessComposition(analysis: any): number {
    let score = 0.5; // Base score

    // Boost for visual style info
    if (analysis.visualStyle?.artStyle) {
      score += 0.2;
    }

    // Boost for mood
    if (analysis.visualStyle?.mood) {
      score += 0.1;
    }

    // Boost for color palette
    if (analysis.visualStyle?.colorPalette) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  /**
   * Assess clarity (detail level, description quality)
   */
  private assessClarity(analysis: any): number {
    let score = 0.3; // Base score

    // Check description length
    const desc = analysis.overallDescription || analysis.description || '';
    if (desc.length > 100) {
      score += 0.3;
    } else if (desc.length > 50) {
      score += 0.2;
    }

    // Check for failed analysis
    if (desc.includes('Unable to analyze') || desc.includes('Error')) {
      score = 0.1;
    }

    // Boost for physical characteristics
    if (analysis.physicalCharacteristics) {
      const charCount = Object.keys(analysis.physicalCharacteristics).length;
      score += Math.min(0.3, charCount * 0.05);
    }

    return Math.min(1, score);
  }

  /**
   * Assess creativity (unique traits, diversity)
   */
  private assessCreativity(analysis: any): number {
    let score = 0.4; // Base score

    // Check for distinctive features
    if (analysis.physicalCharacteristics?.distinctiveFeatures?.length > 0) {
      score += 0.2;
    }

    // Check for interesting species
    const interestingSpecies = ['elf', 'demon', 'android', 'robot', 'alien', 'dragon'];
    if (analysis.physicalCharacteristics?.species &&
        interestingSpecies.some(s => analysis.physicalCharacteristics.species.toLowerCase().includes(s))) {
      score += 0.2;
    }

    // Check for accessories
    if (analysis.clothing?.accessories?.length > 0) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  /**
   * Assess technical quality (completeness)
   */
  private assessTechnical(analysis: any): number {
    let score = 0.5; // Base score

    // Check for clothing info
    if (analysis.clothing?.outfit) {
      score += 0.2;
    }

    // Check for style
    if (analysis.clothing?.style) {
      score += 0.1;
    }

    // Check for suggested occupation
    if (analysis.suggestedTraits?.suggestedOccupation) {
      score += 0.1;
    }

    // Check for archetype
    if (analysis.suggestedTraits?.archetype) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  /**
   * Count total data points in analysis
   */
  private countDataPoints(analysis: any): number {
    let count = 0;

    for (const section of Object.values(analysis)) {
      if (typeof section === 'object' && section !== null) {
        count += Object.keys(section).length;
      } else if (typeof section === 'string' && section.length > 0) {
        count += 1;
      }
    }

    return count;
  }

  /**
   * Generate reasoning for score
   */
  private generateReasoning(
    factors: QualityScoreResult['factors'],
    score: number,
    dataPoints: number
  ): string[] {
    const reasoning: string[] = [];

    // Overall assessment
    if (score >= 4.0) {
      reasoning.push('High quality image with detailed analysis');
    } else if (score >= 3.0) {
      reasoning.push('Good quality with acceptable detail level');
    } else if (score >= 2.0) {
      reasoning.push('Moderate quality, some details missing');
    } else {
      reasoning.push('Low quality or incomplete analysis');
    }

    // Factor breakdown
    if (factors.composition >= 0.7) {
      reasoning.push('Good visual composition');
    }
    if (factors.clarity >= 0.7) {
      reasoning.push('Clear character description');
    }
    if (factors.creativity >= 0.7) {
      reasoning.push('Creative character design');
    }
    if (factors.technical >= 0.7) {
      reasoning.push('Complete technical details');
    }

    // Data point assessment
    reasoning.push(`${dataPoints} data points extracted from image`);

    return reasoning;
  }

  /**
   * Get thresholds
   */
  getThresholds() {
    return { ...this.thresholds };
  }

  /**
   * Set custom thresholds
   */
  setThresholds(thresholds: Partial<typeof this.thresholds>) {
    Object.assign(this.thresholds, thresholds);
    logger.info({ thresholds: this.thresholds }, 'Quality thresholds updated');
  }
}

// Singleton instance
export const qualityScorer = new QualityScorer();
