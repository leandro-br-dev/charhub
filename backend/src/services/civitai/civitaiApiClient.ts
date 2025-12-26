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
        sort = 'Trending',
        nsfw = 'None',
      } = options;

      const params: Record<string, any> = {
        limit,
        period,
        sort,
        nsfw,
      };

      // Add tags if provided
      if (options.tags && options.tags.length > 0) {
        params.tags = options.tags.join(',');
      }

      // Add user filter if provided
      if (options.username) {
        params.username = options.username;
      }

      // Add model filter if provided
      if (options.modelId) {
        params.modelId = options.modelId;
      }

      const response = await this.client.get<CivitaiImage[]>('/images', { params });
      this.incrementCounter();

      logger.info(
        { count: response.data.length, period, sort, nsfw },
        'Fetched trending images from Civitai'
      );

      // Transform to our format
      return this.transformImages(response.data);
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
      id: img.id,
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
