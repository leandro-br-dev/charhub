import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { CharacterGender } from '../generated/prisma';

/**
 * Result interface for recent characters queries
 */
export interface RecentCharactersResult {
  firstNames: string[];
  lastNames: string[];
}

/**
 * Options for recent characters queries
 */
export interface RecentCharactersOptions {
  gender?: CharacterGender;
  limit?: number;
}

/**
 * Service for tracking and querying recent AI-generated characters
 *
 * This service provides methods to retrieve the most recently created
 * characters by the bot user, which is used to improve name diversity
 * in automated character generation by avoiding recently used names.
 */
export class RecentCharactersService {
  /**
   * Bot user ID for automated character generation
   * All auto-generated characters are created by this system user
   */
  private readonly BOT_USER_ID = '00000000-0000-0000-0000-000000000001';

  /**
   * Get the most recently created AI-generated characters
   *
   * This method fetches the last N characters created by the bot user,
   * optionally filtered by gender. The names from these characters are
   * returned as exclusion lists to prevent name repetition in recent
   * generations.
   *
   * @param gender - Filter by gender (optional)
   * @param limit - Maximum number of characters to fetch (default: 10)
   * @returns Promise resolving to first and last name arrays
   *
   * @example
   * ```typescript
   * // Get last 10 characters (any gender)
   * const recent = await recentCharactersService.getRecentCharacters();
   *
   * // Get last 20 female characters
   * const recentFemale = await recentCharactersService.getRecentCharacters(
   *   'FEMALE',
   *   20
   * );
   * ```
   */
  async getRecentCharacters(
    gender?: CharacterGender,
    limit: number = 10
  ): Promise<RecentCharactersResult> {
    try {
      const characters = await prisma.character.findMany({
        where: {
          userId: this.BOT_USER_ID,
          isSystemCharacter: false,
          ...(gender && { gender }),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          firstName: true,
          lastName: true,
        },
      });

      const result: RecentCharactersResult = {
        firstNames: characters.map(c => c.firstName),
        lastNames: characters.map(c => c.lastName).filter(Boolean) as string[],
      };

      logger.info({
        count: characters.length,
        gender,
        limit,
        firstNames: result.firstNames,
        lastNames: result.lastNames,
      }, 'Recent characters data retrieved successfully');

      return result;
    } catch (error) {
      logger.error({
        error,
        gender,
        limit,
      }, 'Failed to retrieve recent characters');

      // Return empty results on error to allow generation to continue
      return { firstNames: [], lastNames: [] };
    }
  }

  /**
   * Get recent characters with full data
   *
   * This method returns the full character objects for recent
   * bot-generated characters, useful for debugging and analytics.
   *
   * @param gender - Filter by gender (optional)
   * @param limit - Maximum number of characters to fetch (default: 10)
   * @returns Promise resolving to array of character objects
   */
  async getRecentCharactersFull(
    gender?: CharacterGender,
    limit: number = 10
  ) {
    try {
      const characters = await prisma.character.findMany({
        where: {
          userId: this.BOT_USER_ID,
          isSystemCharacter: false,
          ...(gender && { gender }),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          gender: true,
          age: true,
          species: true,
          createdAt: true,
        },
      });

      logger.info({
        count: characters.length,
        gender,
        limit,
      }, 'Recent characters full data retrieved');

      return characters;
    } catch (error) {
      logger.error({
        error,
        gender,
        limit,
      }, 'Failed to retrieve recent characters full data');

      return [];
    }
  }

  /**
   * Get name variety score for recent characters
   *
   * This method calculates a score indicating how much name variety
   * exists in recent auto-generated characters. A higher score indicates
   * better name diversity.
   *
   * @param gender - Filter by gender (optional)
   * @param limit - Number of recent characters to analyze (default: 10)
   * @returns Promise resolving to variety score (0.0 to 1.0)
   */
  async getNameVarietyScore(
    gender?: CharacterGender,
    limit: number = 10
  ): Promise<number> {
    try {
      const characters = await prisma.character.findMany({
        where: {
          userId: this.BOT_USER_ID,
          isSystemCharacter: false,
          ...(gender && { gender }),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          firstName: true,
          lastName: true,
        },
      });

      if (characters.length === 0) {
        return 1.0; // No characters = perfect variety (vacuously true)
      }

      // Count unique first and last names
      const uniqueFirstNames = new Set(characters.map(c => c.firstName)).size;
      const uniqueLastNames = new Set(characters.map(c => c.lastName).filter(Boolean)).size;

      // Calculate variety score (average of first and last name variety)
      const firstNameVariety = uniqueFirstNames / characters.length;
      const lastNameVariety = uniqueLastNames / characters.length;

      const varietyScore = (firstNameVariety + lastNameVariety) / 2;

      logger.info({
        varietyScore,
        uniqueFirstNames,
        uniqueLastNames,
        totalCharacters: characters.length,
        gender,
      }, 'Name variety score calculated');

      return varietyScore;
    } catch (error) {
      logger.error({
        error,
        gender,
        limit,
      }, 'Failed to calculate name variety score');

      return 0.0; // Assume no variety on error
    }
  }
}

// Export singleton instance for use across the application
export const recentCharactersService = new RecentCharactersService();
