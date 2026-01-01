import { Router, Request, Response } from 'express';
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { optionalAuth } from '../../middleware/auth';
import * as userService from '../../services/userService';

const router = Router();

/**
 * GET /api/v1/character-filters
 * Returns available filter values with counts
 * Query params:
 *   - include: comma-separated list of filters to include (genders, species). If not provided, returns all
 * Respects user's age rating restrictions
 */
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.user?.id;
    const { ageRatings, include } = req.query;

    // Parse include parameter
    const includeGenders = !include ||
      (typeof include === 'string' && include.split(',').includes('genders'));
    const includeSpecies = !include ||
      (typeof include === 'string' && include.split(',').includes('species'));

    // Build base filters respecting user's content preferences
    let effectiveAgeRatings: string[] | undefined;

    if (userId) {
      try {
        const userFilters = await userService.getUserContentFilters(userId);

        // Use requested ratings intersected with allowed, or all allowed
        const requestedRatings = Array.isArray(ageRatings)
          ? ageRatings.map(String)
          : typeof ageRatings === 'string'
            ? ageRatings.split(',')
            : undefined;

        if (requestedRatings && requestedRatings.length > 0) {
          effectiveAgeRatings = requestedRatings.filter(rating =>
            userFilters.allowedAgeRatings.includes(rating as any)
          );
        } else {
          effectiveAgeRatings = userFilters.allowedAgeRatings;
        }
      } catch (error) {
        logger.error({ error, userId }, 'Error fetching user content filters');
        effectiveAgeRatings = Array.isArray(ageRatings)
          ? ageRatings.map(String)
          : typeof ageRatings === 'string'
            ? ageRatings.split(',')
            : undefined;
      }
    } else {
      effectiveAgeRatings = Array.isArray(ageRatings)
        ? ageRatings.map(String)
        : typeof ageRatings === 'string'
          ? ageRatings.split(',')
          : undefined;
    }

    // Build base where clause for public characters
    const baseFilters: any = {
      visibility: 'PUBLIC',
      isSystemCharacter: false,
    };

    // Apply age rating filter
    if (effectiveAgeRatings && effectiveAgeRatings.length > 0) {
      baseFilters.ageRating = { in: effectiveAgeRatings };
    }

    const response: any = {
      success: true,
      data: {}
    };

    // Get gender distribution (only if requested)
    if (includeGenders) {
      const genderCounts = await prisma.character.groupBy({
        by: ['gender'],
        where: baseFilters,
        _count: { gender: true },
      });

      response.data.genders = genderCounts
        .map(g => ({
          value: g.gender || 'unknown',
          count: g._count.gender
        }))
        .filter(g => g.count > 0)
        .sort((a, b) => b.count - a.count);
    }

    // Get species distribution (only if requested)
    if (includeSpecies) {
      // Get species with character data
      const charactersWithSpecies = await prisma.character.findMany({
        where: baseFilters,
        select: {
          speciesId: true,
        },
      });

      // Count species by grouping the results
      const speciesCountMap = new Map<string, number>();
      for (const char of charactersWithSpecies) {
        if (char.speciesId) {
          speciesCountMap.set(char.speciesId, (speciesCountMap.get(char.speciesId) || 0) + 1);
        }
      }

      // Get species names for labels
      const speciesIds = Array.from(speciesCountMap.keys());
      const speciesRecords = await prisma.species.findMany({
        where: { id: { in: speciesIds } },
        select: { id: true, name: true },
      });
      const speciesNameMap = new Map(speciesRecords.map(s => [s.id, s.name]));

      response.data.species = Array.from(speciesCountMap.entries())
        .map(([id, count]) => ({
          value: id,
          name: speciesNameMap.get(id) || 'Unknown',
          count
        }))
        .sort((a, b) => b.count - a.count);
    }

    res.json(response);
  } catch (error) {
    logger.error({ error }, 'Error getting filter options');
    res.status(500).json({
      success: false,
      message: 'Failed to load filter options',
    });
  }
});

export default router;
