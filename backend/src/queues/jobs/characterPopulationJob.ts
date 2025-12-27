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

/**
 * Hourly generation job - generates at most 1 character per hour
 * Checks daily limit before generating
 */
export interface HourlyGenerationJobData {
  /** Maximum characters to generate per day */
  dailyLimit?: number;
  /** User ID to attribute characters to (defaults to bot) */
  userId?: string;
}

/**
 * Daily curation job - fetches and curates images once per day
 */
export interface DailyCurationJobData {
  /** Number of images to fetch (default from BATCH_SIZE_PER_RUN) */
  imageCount?: number;
  /** Keywords to search for (optional) */
  keywords?: string[];
}

/**
 * Union type for all character population job data types
 */
export type CharacterPopulationJobData =
  | TriggerCurationJobData
  | BatchGenerationJobData
  | FullPopulationJobData
  | HourlyGenerationJobData
  | DailyCurationJobData;
