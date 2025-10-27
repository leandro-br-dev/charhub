/**
 * Tag system types
 *
 * Tags are used for categorizing and filtering content (characters, stories, assets, etc.)
 * Each tag has a name (in English), type, age rating, and optional content warnings.
 */

import type { AgeRating, ContentTag, TagType } from '../generated/prisma';

/**
 * Source tag definition from JSON files
 */
export interface TagSourceDefinition {
  /** Tag name in English (used for search and database) */
  name: string;

  /** What this tag classifies (CHARACTER, STORY, ASSET, etc.) */
  type: TagType;

  /** Minimum age rating required for this tag */
  ageRating: AgeRating;

  /** Additional content warnings (violence, nudity, etc.) */
  contentTags: ContentTag[];

  /** Human-readable description of the tag */
  description: string;
}

/**
 * Source file structure for tag definitions
 */
export interface TagSourceFile {
  /** Description of what tags are in this file */
  description: string;

  /** Array of tag definitions */
  tags: TagSourceDefinition[];
}

/**
 * Translated tag structure (optimized - no redundancy)
 * Key in parent object is the English name (used for lookup)
 */
export interface TranslatedTag {
  /** Translated name (LLM decides whether to translate or keep in English) */
  name: string;

  /** Translated description (always translated) */
  description: string;
}

/**
 * Translated tags file structure
 */
export interface TranslatedTagsFile {
  /** Description in target language */
  description: string;

  /** Tag translations - key is English name, value is translation */
  tags: Record<string, TranslatedTag>;
}

/**
 * Tag for database insertion
 */
export interface TagForDatabase {
  /** Tag name in English (for search/filtering) */
  name: string;

  /** What this tag classifies */
  type: TagType;

  /** Minimum age rating */
  ageRating: AgeRating;

  /** Content warnings */
  contentTags: ContentTag[];

  /** Whether this tag is searchable */
  searchable: boolean;
}
