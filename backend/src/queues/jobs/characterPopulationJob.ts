/**
 * Character Population Job Data
 */

/**
 * Trigger curation and analysis job
 */
export interface TriggerCurationJobData {
  /** Number of images to fetch and analyze */
  imageCount: number;
  /** Keywords to search for (optional, uses defaults if not provided) */
  keywords?: string[];
}

/**
 * Batch character generation job
 */
export interface BatchGenerationJobData {
  /** Number of characters to generate */
  count: number;
  /** User ID to attribute characters to (defaults to bot) */
  userId?: string;
}

/**
 * Full population pipeline job
 */
export interface FullPopulationJobData {
  /** Number of characters to generate */
  targetCount: number;
  /** Keywords to search */
  keywords?: string[];
  /** User ID (defaults to bot) */
  userId?: string;
}
