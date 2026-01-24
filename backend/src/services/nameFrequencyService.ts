import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { CharacterGender } from '../generated/prisma';

/**
 * Result interface for name frequency queries
 */
export interface NameFrequencyResult {
  topFirstNames: Array<{ name: string; count: number }>;
  topLastNames: Array<{ name: string; count: number }>;
}

/**
 * Options for name frequency queries
 */
export interface NameFrequencyOptions {
  gender?: CharacterGender;
  days?: number;
  limit?: number;
}

/**
 * Service for tracking and querying name frequency data
 *
 * This service provides methods to retrieve the most frequently used
 * names and surnames in the character database, which is used to
 * improve name diversity in automated character generation.
 */
export class NameFrequencyService {
  /**
   * Get the most used names/surnames in the specified time period
   *
   * This method queries the Character table to find the top N first names
   * and last names used in characters created within the specified time range.
   * Results are filtered by gender (if provided) and exclude system/hidden
   * characters to ensure data represents real user-created content.
   *
   * @param options - Query options
   * @param options.gender - Filter by gender (optional)
   * @param options.days - Number of days to look back (default: 30)
   * @param options.limit - Maximum number of names to return (default: 30)
   * @returns Promise resolving to top first and last names with counts
   *
   * @example
   * ```typescript
   * // Get top 30 names from last 30 days
   * const result = await nameFrequencyService.getTopNames();
   *
   * // Get top 50 female names from last 60 days
   * const femaleNames = await nameFrequencyService.getTopNames({
   *   gender: 'FEMALE',
   *   days: 60,
   *   limit: 50
   * });
   * ```
   */
  async getTopNames(options?: NameFrequencyOptions): Promise<NameFrequencyResult> {
    const { gender, days = 30, limit = 30 } = options || {};

    const cutoffDate = new Date();
    // Handle negative days by treating as no time filter (include all characters)
    if (days >= 0) {
      cutoffDate.setDate(cutoffDate.getDate() - days);
    } else {
      // Set to a very old date to include all characters
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 100);
    }

    try {
      // Query first names with frequency count
      // Note: Results are sorted by count (desc) only
      const firstNameQuery = prisma.character.groupBy({
        by: ['firstName'],
        where: {
          isSystemCharacter: false,
          visibility: { not: 'PRIVATE' },
          createdAt: { gte: cutoffDate },
          ...(gender && { gender }),
        },
        _count: { firstName: true },
        orderBy: { _count: { firstName: 'desc' } },
        take: limit,
      });

      // Query last names with frequency count
      // Note: Results are sorted by count (desc) only
      const lastNameQuery = prisma.character.groupBy({
        by: ['lastName'],
        where: {
          isSystemCharacter: false,
          visibility: { not: 'PRIVATE' },
          lastName: { not: null },
          createdAt: { gte: cutoffDate },
          ...(gender && { gender }),
        },
        _count: { lastName: true },
        orderBy: { _count: { lastName: 'desc' } },
        take: limit,
      });

      // Execute both queries in parallel for better performance
      const [firstNames, lastNames] = await Promise.all([
        firstNameQuery,
        lastNameQuery,
      ]);

      const result: NameFrequencyResult = {
        topFirstNames: firstNames.map(item => ({
          name: item.firstName,
          count: item._count.firstName,
        })),
        topLastNames: lastNames.map(item => ({
          name: item.lastName || '',
          count: item._count.lastName,
        })),
      };

      logger.info({
        gender,
        days,
        limit,
        firstNameCount: result.topFirstNames.length,
        lastNameCount: result.topLastNames.length,
      }, 'Name frequency data retrieved successfully');

      return result;
    } catch (error) {
      logger.error({
        error,
        gender,
        days,
        limit,
      }, 'Failed to retrieve name frequency data');

      // Return empty results on error to allow generation to continue
      return { topFirstNames: [], topLastNames: [] };
    }
  }

  /**
   * Get name frequency statistics for analytics
   *
   * This method provides additional statistics about name usage,
   * such as total unique names, average frequency, etc.
   *
   * @param options - Query options (same as getTopNames)
   * @returns Promise resolving to detailed statistics
   */
  async getNameFrequencyStats(options?: NameFrequencyOptions): Promise<{
    totalFirstNames: number;
    totalLastNames: number;
    mostCommonFirstName: { name: string; count: number } | null;
    mostCommonLastName: { name: string; count: number } | null;
  }> {
    const { gender, days = 30 } = options || {};
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    try {
      const [totalFirstNames, totalLastNames, mostUsedFirst, mostUsedLast] = await Promise.all([
        prisma.character.count({
          where: {
            isSystemCharacter: false,
            visibility: { not: 'PRIVATE' },
            createdAt: { gte: cutoffDate },
            ...(gender && { gender }),
          },
        }),
        prisma.character.count({
          where: {
            isSystemCharacter: false,
            visibility: { not: 'PRIVATE' },
            lastName: { not: null },
            createdAt: { gte: cutoffDate },
            ...(gender && { gender }),
          },
        }),
        prisma.character.groupBy({
          by: ['firstName'],
          where: {
            isSystemCharacter: false,
            visibility: { not: 'PRIVATE' },
            createdAt: { gte: cutoffDate },
            ...(gender && { gender }),
          },
          _count: { firstName: true },
          orderBy: { _count: { firstName: 'desc' } },
          take: 1,
        }),
        prisma.character.groupBy({
          by: ['lastName'],
          where: {
            isSystemCharacter: false,
            visibility: { not: 'PRIVATE' },
            lastName: { not: null },
            createdAt: { gte: cutoffDate },
            ...(gender && { gender }),
          },
          _count: { lastName: true },
          orderBy: { _count: { lastName: 'desc' } },
          take: 1,
        }),
      ]);

      return {
        totalFirstNames,
        totalLastNames,
        mostCommonFirstName: mostUsedFirst[0]
          ? { name: mostUsedFirst[0].firstName, count: mostUsedFirst[0]._count.firstName }
          : null,
        mostCommonLastName: mostUsedLast[0]
          ? { name: mostUsedLast[0].lastName || '', count: mostUsedLast[0]._count.lastName }
          : null,
      };
    } catch (error) {
      logger.error({ error, options }, 'Failed to retrieve name frequency stats');
      return {
        totalFirstNames: 0,
        totalLastNames: 0,
        mostCommonFirstName: null,
        mostCommonLastName: null,
      };
    }
  }
}

// Export singleton instance for use across the application
export const nameFrequencyService = new NameFrequencyService();
