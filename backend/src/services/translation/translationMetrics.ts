import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { logger } from '../../config/logger';

export class TranslationMetrics {
  /**
   * Calculate cache hit rate
   */
  async getCacheHitRate(hours: number = 24): Promise<number> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const total = await prisma.contentTranslation.count({
        where: { createdAt: { gte: since } },
      });

      // Estimate hits based on requests vs creations
      // (Real implementation requires logging each request)
      const estimatedRequests = total * 5; // Estimate: each translation is requested 5x
      const cacheHitRate = total > 0 ? ((estimatedRequests - total) / estimatedRequests) * 100 : 0;

      return cacheHitRate;
    } catch (error) {
      logger.error({ error }, 'Error calculating cache hit rate');
      return 0;
    }
  }

  /**
   * Average translation time
   */
  async getAverageTranslationTime(hours: number = 24): Promise<number> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const result = await prisma.contentTranslation.aggregate({
        where: {
          createdAt: { gte: since },
          translationTimeMs: { not: null },
        },
        _avg: {
          translationTimeMs: true,
        },
      });

      return result._avg.translationTimeMs || 0;
    } catch (error) {
      logger.error({ error }, 'Error calculating average translation time');
      return 0;
    }
  }

  /**
   * Most translated language pairs
   */
  async getTopLanguagePairs(limit: number = 10) {
    try {
      const pairs = await prisma.contentTranslation.groupBy({
        by: ['originalLanguageCode', 'targetLanguageCode'],
        _count: true,
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: limit,
      });

      return pairs.map((p) => ({
        from: p.originalLanguageCode,
        to: p.targetLanguageCode,
        count: p._count,
      }));
    } catch (error) {
      logger.error({ error }, 'Error getting top language pairs');
      return [];
    }
  }

  /**
   * Most translated content
   */
  async getMostTranslatedContent(contentType: string, limit: number = 10) {
    try {
      const content = await prisma.contentTranslation.groupBy({
        by: ['contentId'],
        where: { contentType },
        _count: true,
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: limit,
      });

      return content.map((c) => ({
        contentId: c.contentId,
        translationCount: c._count,
      }));
    } catch (error) {
      logger.error({ error }, 'Error getting most translated content');
      return [];
    }
  }

  /**
   * General statistics
   */
  async getGeneralStats() {
    try {
      const [total, active, outdated, failed, avgTime, cacheSize] = await Promise.all([
        prisma.contentTranslation.count(),
        prisma.contentTranslation.count({ where: { status: 'ACTIVE' } }),
        prisma.contentTranslation.count({ where: { status: 'OUTDATED' } }),
        prisma.contentTranslation.count({ where: { status: 'FAILED' } }),
        this.getAverageTranslationTime(24),
        redis.dbsize(),
      ]);

      return {
        total,
        active,
        outdated,
        failed,
        avgTranslationTimeMs: Math.round(avgTime),
        redisCacheSize: cacheSize,
      };
    } catch (error) {
      logger.error({ error }, 'Error getting general stats');
      return {
        total: 0,
        active: 0,
        outdated: 0,
        failed: 0,
        avgTranslationTimeMs: 0,
        redisCacheSize: 0,
      };
    }
  }

  /**
   * Translations by content type
   */
  async getTranslationsByContentType() {
    try {
      const byType = await prisma.contentTranslation.groupBy({
        by: ['contentType'],
        _count: true,
        where: { status: 'ACTIVE' },
      });

      return byType.map((t) => ({
        contentType: t.contentType,
        count: t._count,
      }));
    } catch (error) {
      logger.error({ error }, 'Error getting translations by content type');
      return [];
    }
  }
}

export const translationMetrics = new TranslationMetrics();
