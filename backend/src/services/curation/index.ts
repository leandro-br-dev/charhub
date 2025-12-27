/**
 * Curation Service
 * Exports all curation-related services
 */

export { ContentAnalyzer, contentAnalyzer } from './contentAnalyzer';
export type { ContentAnalysisResult } from './contentAnalyzer';

export { AgeRatingClassifier, ageRatingClassifier } from './ageRatingClassifier';
export type { AgeRatingClassification } from './ageRatingClassifier';

export { QualityScorer, qualityScorer } from './qualityScorer';
export type { QualityScoreResult } from './qualityScorer';

export { DuplicateDetector, duplicateDetector } from './duplicateDetector';
export type { SimilarityResult } from './duplicateDetector';

export { CurationQueue, curationQueue } from './curationQueue';
export type { CurationQueueItem } from './curationQueue';
