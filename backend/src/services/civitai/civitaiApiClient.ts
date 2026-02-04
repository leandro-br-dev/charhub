/**
 * Civitai API Client
 * Handles API requests to Civitai for image discovery
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../../config/logger';
import { getVariedSearchParams } from './searchVariation';
import { systemConfigurationService } from '../config/systemConfigurationService';

// Civitai API Types
export interface CivitaiImage {
  id: string;
  url: string;
  hash: string;
  width: number;
  height: number;
  nsfw: string; // "None", "Soft", "Mature", "X"
  nsfwLevel: number;
  stats?: {
    cryCount: number;
    rating: number;
    ratingCount: number;
  };
  meta?: {
    [key: string]: any;
  };
  post?: {
    id: string;
    title?: string;
    user?: string;
    publishedAt?: string;
  };
  tags?: string[];
}

export interface CivitaiSearchOptions {
  limit?: number;
  period?: 'Day' | 'Week' | 'Month' | 'Year' | 'AllTime';
  sort?: 'Newest' | 'Most Reactions' | 'Most Comments' | 'Trending';
  nsfw?: string; // "None", "Soft", "Mature", "X"
  tag?: string; // Single tag (e.g., "woman", "warrior", "elf")
  tags?: string[]; // DEPRECATED: Use 'tag' instead (singular)
  userId?: string;
  username?: string;
  modelId?: string;
  modelVersionId?: string;
  // Filter for anime-style character images
  animeStyle?: boolean;
  // Use search variation system to avoid repetition
  useVariation?: boolean;
}

export interface CivitaiImageResult {
  id: string;
  url: string;
  sourceUrl: string;
  rating?: number;
  tags?: string[];
  author?: string;
  nsfwLevel: number;
  width: number;
  height: number;
}

/**
 * Civitai API Client
 */
export class CivitaiApiClient {
  private client: AxiosInstance;
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly rateLimitPerDay: number;
  private requestCount = 0;
  private lastResetTime = Date.now();

  constructor() {
    this.baseUrl = process.env.CIVITAI_API_BASE_URL || 'https://civitai.com/api/v1';
    this.apiKey = process.env.CIVITAI_API_KEY;
    this.rateLimitPerDay = parseInt(process.env.CIVITAI_RATE_LIMIT || '1000', 10);

    // Create axios instance
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
      },
    });

    logger.info({ baseUrl: this.baseUrl, hasApiKey: !!this.apiKey }, 'CivitaiApiClient initialized');
  }

  /**
   * Check rate limit and reset if needed
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;

    // Reset counter if new day
    if (now - this.lastResetTime > dayInMs) {
      this.requestCount = 0;
      this.lastResetTime = now;
      logger.info('Rate limit counter reset for new day');
    }

    // Check if we've hit the limit
    if (this.requestCount >= this.rateLimitPerDay) {
      logger.warn({ requestCount: this.requestCount, limit: this.rateLimitPerDay }, 'Rate limit exceeded');
      return false;
    }

    return true;
  }

  /**
   * Increment request counter
   */
  private incrementCounter(): void {
    this.requestCount++;
  }

  /**
   * Get trending images
   */
  async getTrendingImages(options: CivitaiSearchOptions = {}): Promise<CivitaiImageResult[]> {
    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded');
    }

    try {
      // Apply search variation if requested (default: true for automatic calls)
      const useVariation = options.useVariation ?? true;
      let period = options.period || 'Week';
      let sort = options.sort || 'Most Reactions';
      let tag = options.tag;

      // Apply variation to avoid repetition
      if (useVariation) {
        const variation = getVariedSearchParams();
        period = options.period || variation.period;
        sort = options.sort || variation.sort;
        tag = options.tag || variation.tag;
      }

      const {
        limit = 100,
        nsfw = 'None',
        animeStyle = false,
      } = options;

      const params: Record<string, any> = {
        limit,
        period,
        sort,
        nsfw,
      };

      // Add tag filter if provided (singular, not plural)
      // Civitai API accepts tag names as strings (e.g., "woman", "warrior", "elf")
      if (tag) {
        params.tag = tag;
      }

      // Filter for anime-style character images
      if (animeStyle) {
        // Filter for image type (still images only)
        params.types = 'image';

        // Use anime-related base models if configured (from SystemConfiguration)
        const animeModelIdsStr = await systemConfigurationService.get('curation.anime_model_ids', '');
        const animeModelIds = animeModelIdsStr ? animeModelIdsStr.split(',').map(id => id.trim()) : [];

        // Add model filter if specific anime models are configured
        if (animeModelIds.length > 0) {
          // Civitai API doesn't support multiple modelIds in one request,
          // so we'll use the first one and let post-filtering handle the rest
          params.modelId = animeModelIds[0];
        }
      }

      // Add user filter if provided
      if (options.username) {
        params.username = options.username;
      }

      // Add model filter if provided (overrides animeStyle model filter)
      if (options.modelId) {
        params.modelId = options.modelId;
      }

      // Log search parameters for debugging
      logger.info(
        {
          period,
          sort,
          tag,
          limit,
          nsfw,
          animeStyle,
          useVariation,
        },
        'Fetching images from Civitai with parameters'
      );

      const response = await this.client.get<{ items: CivitaiImage[], metadata: any }>('/images', { params });
      this.incrementCounter();

      let images = response.data.items || [];

      logger.info(
        { fetchedCount: images.length, period, sort, nsfw },
        'Fetched images from Civitai API'
      );

      // Post-filter for anime-style character images if requested
      // Use baseModel filter instead of the overly restrictive metadata filter
      if (animeStyle) {
        const beforeFilter = images.length;
        images = this.filterByBaseModel(images);
        logger.info(
          { beforeFilter, afterFilter: images.length, animeStyle },
          'Applied baseModel filter for anime-style images'
        );
      }

      logger.info(
        { finalCount: images.length, period, sort, nsfw, animeStyle },
        'Returning filtered images from Civitai'
      );

      // Transform to our format
      return this.transformImages(images);
    } catch (error) {
      logger.error({ error, options }, 'Failed to fetch trending images from Civitai');
      throw error;
    }
  }

  /**
   * Search images by tags
   */
  async searchByTags(tags: string[], options: Omit<CivitaiSearchOptions, 'tags'> = {}): Promise<CivitaiImageResult[]> {
    return this.getTrendingImages({ ...options, tags });
  }

  /**
   * Get images by user
   */
  async getUserImages(username: string, options: Omit<CivitaiSearchOptions, 'username'> = {}): Promise<CivitaiImageResult[]> {
    return this.getTrendingImages({ ...options, username });
  }

  /**
   * Transform Civitai images to our format
   */
  private transformImages(images: CivitaiImage[]): CivitaiImageResult[] {
    return images.map((img) => ({
      id: String(img.id), // Convert number ID to string for our database
      url: img.url,
      sourceUrl: `https://civitai.com/images/${img.id}`,
      rating: img.stats?.rating,
      tags: img.tags || [],
      author: img.post?.user,
      nsfwLevel: img.nsfwLevel,
      width: img.width,
      height: img.height,
    }));
  }

  /**
   * Filter images by baseModel (more reliable than metadata filtering)
   * This uses the baseModel field which is consistently provided by the API
   */
  private filterByBaseModel(images: CivitaiImage[]): CivitaiImage[] {
    // Known anime/character-focused base models
    const animeBaseModels = [
      'illustrious',
      'pony',
      'noobai',
      'nai',
      'anything',
      'counterfeit',
      'dreamlike',
      'pastel',
      'meinamix',
      'animagine',
      'cetusmix',
      'ghostmix',
      'abyssorangemix',
      'bluemix',
      'aom3',
    ];

    return images.filter((img) => {
      // Check if image has baseModel field
      const baseModel = (img as any).baseModel;

      if (!baseModel) {
        // If no baseModel, keep the image (don't be too restrictive)
        return true;
      }

      const baseModelLower = String(baseModel).toLowerCase();

      // Check if baseModel contains any anime keywords
      const isAnimeModel = animeBaseModels.some(keyword =>
        baseModelLower.includes(keyword)
      );

      // Also apply basic quality filters
      const hasReasonableSize = img.width >= 512 && img.height >= 512;
      const hasReasonableAspectRatio = (img.width / img.height) >= 0.3 && (img.width / img.height) <= 3.0;

      // Keep image if it's anime model OR has reasonable dimensions
      // This is less restrictive than requiring ALL conditions
      return isAnimeModel || (hasReasonableSize && hasReasonableAspectRatio);
    });
  }

  // DEPRECATED: filterAnimeCharacterImages() method was removed
  // It was too restrictive (0% pass rate in testing) and has been replaced by filterByBaseModel()
  // which uses the more reliable baseModel field from the API response.

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): { used: number; limit: number; remaining: number; resetIn: number } {
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;
    const timeUntilReset = this.lastResetTime + dayInMs - now;

    return {
      used: this.requestCount,
      limit: this.rateLimitPerDay,
      remaining: Math.max(0, this.rateLimitPerDay - this.requestCount),
      resetIn: Math.max(0, timeUntilReset),
    };
  }
}

// Singleton instance
export const civitaiApiClient = new CivitaiApiClient();
