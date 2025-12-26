/**
 * Civitai API Client
 * Handles API requests to Civitai for image discovery
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../../config/logger';

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
  period?: 'Day' | 'Week' | 'Month' | 'Year' | 'All';
  sort?: 'Newest' | 'Most Reactions' | 'Most Comments' | 'Trending';
  nsfw?: string; // "None", "Soft", "Mature", "X"
  tags?: string[];
  userId?: string;
  username?: string;
  modelId?: string;
  modelVersionId?: string;
  // Filter for anime-style character images
  animeStyle?: boolean;
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
      const {
        limit = 100,
        period = 'Week',
        sort = 'Most Reactions',
        nsfw = 'None',
        animeStyle = false,
      } = options;

      const params: Record<string, any> = {
        limit,
        period,
        sort,
        nsfw,
      };

      // Filter for anime-style character images
      // Civitai uses numeric tag IDs, but we can use specific model types known for anime
      if (animeStyle) {
        // Filter for image type (still images only)
        params.types = 'image';

        // Use anime-related base models if configured
        // These are popular anime model IDs on Civitai
        const animeModelIds = process.env.CIVITAI_ANIME_MODEL_IDS?.split(',').map(id => id.trim()) || [];

        // Add model filter if specific anime models are configured
        if (animeModelIds.length > 0) {
          // Civitai API doesn't support multiple modelIds in one request,
          // so we'll use the first one and let post-filtering handle the rest
          params.modelId = animeModelIds[0];
        }

        logger.info({ animeStyle, animeModelIds }, 'Filtering for anime-style images');
      }

      // Note: Civitai API uses numeric tag IDs, not tag names
      // Tag filtering can be added later if needed

      // Add user filter if provided
      if (options.username) {
        params.username = options.username;
      }

      // Add model filter if provided (overrides animeStyle model filter)
      if (options.modelId) {
        params.modelId = options.modelId;
      }

      const response = await this.client.get<{ items: CivitaiImage[], metadata: any }>('/images', { params });
      this.incrementCounter();

      let images = response.data.items || [];

      // Post-filter for anime-style character images if requested
      if (animeStyle) {
        images = this.filterAnimeCharacterImages(images);
      }

      logger.info(
        { count: images.length, period, sort, nsfw, animeStyle },
        'Fetched trending images from Civitai'
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
   * Post-filter images for anime-style character content
   * This filters out images that don't appear to be character-focused
   */
  private filterAnimeCharacterImages(images: CivitaiImage[]): CivitaiImage[] {
    return images.filter((img) => {
      const meta = img.meta;

      if (!meta) {
        return false;
      }

      // Check for anime-related base models
      // Common anime model names on Civitai
      const animeModelKeywords = [
        'anime',
        'anything',
        'counterfeit',
        'dreamlike',
        'pastel',
        'meinamix',
        'niji',
        'cetus',
        'fantasy',
        'ghost',
        'moxie',
        '7th',
        'f222',
        'orangemix',
        'someya',
        'acertain',
      ];

      const samplers = [
        'euler',
        'euler a',
        'ddim',
        'plms',
        'dpm++',
        'dpmsolver',
      ];

      // Check model name for anime keywords
      const modelName = (meta.Model || meta.sd_model_name || '').toLowerCase();
      const hasAnimeModel = animeModelKeywords.some(keyword => modelName.includes(keyword));

      // Check for character-focused indicators
      // Character images typically have specific samplers and formats
      const samplerName = (meta.Sampler || meta.sampler_name || '').toLowerCase();
      const hasCharacterSampler = samplers.some(s => samplerName.includes(s));

      // Check for standard image sizes (not too small/large for portraits)
      const aspectRatio = img.width / img.height;
      const isPortraitOrSquare = aspectRatio >= 0.5 && aspectRatio <= 2.0;
      const reasonableResolution = img.width >= 512 && img.height >= 512;

      // Check if image has positive prompt (character images typically have detailed prompts)
      const hasPositivePrompt = meta.sd_prompt && meta.sd_prompt.length > 50;

      // Filter for anime-style character images
      // Must have at least anime model OR reasonable prompt, AND proper resolution
      const isAnimeCharacter = hasAnimeModel && hasCharacterSampler && isPortraitOrSquare && reasonableResolution;

      if (isAnimeCharacter) {
        logger.debug({
          imageId: img.id,
          model: modelName,
          sampler: samplerName,
          hasPrompt: hasPositivePrompt,
        }, 'Anime character image passed filter');
      }

      return isAnimeCharacter;
    });
  }

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
