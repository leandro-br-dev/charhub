/**
 * Civitai Search Keywords Manager
 * Manages keywords for diverse image search
 */

import { logger } from '../../config/logger';
import { systemConfigurationService } from '../config/systemConfigurationService';

/**
 * Keywords Manager
 */
export class KeywordsManager {
  private defaultKeywords: string[];
  private keywordsLoaded = false;
  private readonly categoryGroups: Record<string, string[]>;

  constructor() {
    // Initialize with default keywords (will be overridden by database values if present)
    this.defaultKeywords = this.getDefaultKeywords();

    // Organize keywords into categories for diversity
    this.categoryGroups = {
      // Styles
      styles: ['anime', 'realistic', 'semi-realistic', 'cartoon', 'manga', 'manhwa', 'chibi', 'pixel art'],

      // Themes
      themes: ['fantasy', 'sci-fi', 'cyberpunk', 'medieval', 'modern', 'steampunk', 'post-apocalyptic'],

      // Character types
      characters: ['warrior', 'mage', 'knight', 'ninja', 'samurai', 'adventurer', 'hero', 'villain'],

      // Genders
      genders: ['girl', 'woman', 'boy', 'man', 'non-binary'],

      // Traits
      traits: ['magical', 'mysterious', 'elegant', 'fierce', 'gentle', 'bold', 'graceful'],
    };

    logger.info(
      { keywordsCount: this.defaultKeywords.length, categories: Object.keys(this.categoryGroups) },
      'KeywordsManager initialized'
    );
  }

  /**
   * Ensure keywords are loaded from database
   * Uses lazy loading pattern to avoid async constructor
   */
  private async ensureKeywordsLoaded(): Promise<void> {
    if (this.keywordsLoaded) {
      return;
    }

    try {
      const keywordsStr = await systemConfigurationService.get('curation.search_keywords');

      if (keywordsStr) {
        this.defaultKeywords = keywordsStr.split(',').map(k => k.trim());
        logger.info(
          { keywordsCount: this.defaultKeywords.length, source: 'database' },
          'Keywords loaded from SystemConfiguration'
        );
      }

      this.keywordsLoaded = true;
    } catch (error) {
      logger.warn({ error }, 'Failed to load keywords from database, using defaults');
      this.keywordsLoaded = true;
    }
  }

  /**
   * Get all keywords
   */
  async getAllKeywords(): Promise<string[]> {
    await this.ensureKeywordsLoaded();
    return [...this.defaultKeywords];
  }

  /**
   * Get random keywords for diverse search
   */
  async getRandomKeywords(count: number = 5): Promise<string[]> {
    await this.ensureKeywordsLoaded();
    const shuffled = [...this.defaultKeywords].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Get keywords from specific category
   */
  getCategoryKeywords(category: string, count?: number): string[] {
    const keywords = this.categoryGroups[category] || [];
    return count ? keywords.slice(0, count) : keywords;
  }

  /**
   * Get diverse keyword set (balanced across categories)
   */
  getDiverseKeywordSet(total: number = 10): string[] {
    const result: string[] = [];
    const categories = Object.keys(this.categoryGroups);
    const perCategory = Math.ceil(total / categories.length);

    for (const category of categories) {
      const keywords = this.getRandomFromCategory(category, perCategory);
      result.push(...keywords);
    }

    // Trim if we got too many
    return result.slice(0, total);
  }

  /**
   * Get balanced keywords for age/gender diversity
   */
  getBalancedDemographicKeywords(): {
    male: string[];
    female: string[];
    neutral: string[];
  } {
    const allTraits = this.getCategoryKeywords('traits');
    const allThemes = this.getCategoryKeywords('themes');
    const allStyles = this.getCategoryKeywords('styles');

    // Split traits by perceived gender (for diversity)
    const neutralTraits = allTraits.filter(t =>
      ['magical', 'mysterious', 'elegant', 'bold', 'graceful'].includes(t)
    );

    const femaleTraits = allTraits.filter(t =>
      ['gentle', 'graceful', 'elegant'].includes(t)
    );

    const maleTraits = allTraits.filter(t =>
      ['fierce', 'bold'].includes(t)
    );

    return {
      male: [...this.getCategoryKeywords('genders').filter(g => ['boy', 'man'].includes(g)), ...maleTraits],
      female: [...this.getCategoryKeywords('genders').filter(g => ['girl', 'woman'].includes(g)), ...femaleTraits],
      neutral: [...neutralTraits, ...allThemes, ...allStyles],
    };
  }

  /**
   * Get keywords for specific age rating distribution
   */
  getKeywordsForAgeRating(ageRating: 'L' | 'TEN' | 'TWELVE' | 'FOURTEEN' | 'SIXTEEN' | 'EIGHTEEN'): string[] {
    // All ages can use safe keywords
    const safeKeywords = [
      ...this.getCategoryKeywords('styles'),
      ...this.getCategoryKeywords('themes').filter(t => !['cyberpunk', 'post-apocalyptic'].includes(t)),
    ];

    // Add more mature themes for higher ratings
    if (ageRating === 'SIXTEEN' || ageRating === 'EIGHTEEN') {
      safeKeywords.push('cyberpunk', 'post-apocalyptic');
    }

    return safeKeywords;
  }

  /**
   * Get random keywords from category
   */
  private getRandomFromCategory(category: string, count: number): string[] {
    const keywords = this.categoryGroups[category] || [];
    const shuffled = [...keywords].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, keywords.length));
  }

  /**
   * Get default keywords if database value not set
   */
  private getDefaultKeywords(): string[] {
    return [
      // Styles
      'anime', 'realistic', 'manga', 'fantasy', 'semi-realistic',
      // Themes
      'sci-fi', 'cyberpunk', 'medieval', 'modern', 'steampunk',
      // Characters
      'warrior', 'mage', 'knight', 'adventurer', 'hero',
      // Genders
      'girl', 'woman', 'man', 'boy',
      // Traits
      'magical', 'mysterious', 'elegant', 'fierce',
    ];
  }

  /**
   * Validate if keyword is in allowed list
   */
  async isValidKeyword(keyword: string): Promise<boolean> {
    await this.ensureKeywordsLoaded();
    return this.defaultKeywords.includes(keyword.toLowerCase());
  }

  /**
   * Add custom keyword (with validation)
   */
  async addCustomKeyword(keyword: string): Promise<boolean> {
    await this.ensureKeywordsLoaded();
    const normalized = keyword.toLowerCase().trim();

    // Check if already exists
    if (this.defaultKeywords.includes(normalized)) {
      return false;
    }

    // Add to defaults (in-memory only)
    this.defaultKeywords.push(normalized);
    logger.info({ keyword: normalized }, 'Custom keyword added');
    return true;
  }
}

// Singleton instance
export const keywordsManager = new KeywordsManager();
