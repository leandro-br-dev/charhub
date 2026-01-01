/**
 * Enhanced Diversification Algorithm
 * Selects diverse images for character generation based on gender, species, and other criteria
 */

import { prisma } from '../../config/database';
import { AgeRating } from '../../generated/prisma';
import { logger } from '../../config/logger';

/**
 * Selection criteria with diversity options
 */
export interface SelectionCriteria {
  count: number;
  ageRatingDistribution?: Partial<Record<AgeRating, number>>;
  styleBalance?: boolean;
  tagDiversity?: boolean;
  genderBalance?: boolean; // NEW: Enable gender balancing
  speciesDiversity?: boolean; // NEW: Enable species diversity
  maxConsecutiveSameGender?: number; // NEW: Max consecutive same gender (default: 3)
  maxConsecutiveSameSpecies?: number; // NEW: Max consecutive same species (default: 2)
}

/**
 * Diversity tracking state
 */
interface DiversityState {
  consecutiveGender: { type: string; count: number };
  consecutiveSpecies: { type: string; count: number };
  usedGenders: Map<string, number>;
  usedSpecies: Map<string, number>;
}

/**
 * Enhanced Diversification Algorithm
 */
export class DiversificationAlgorithm {
  private readonly defaultDistribution: Record<AgeRating, number> = {
    [AgeRating.L]: 3,      // 15%
    [AgeRating.TEN]: 3,    // 15%
    [AgeRating.TWELVE]: 3, // 15%
    [AgeRating.FOURTEEN]: 4, // 20%
    [AgeRating.SIXTEEN]: 4, // 20%
    [AgeRating.EIGHTEEN]: 3, // 15%
  };

  // Target distribution for gender (can be overridden)
  private readonly targetGenderDistribution: Record<string, number> = {
    'female': 0.45,   // 45% female
    'male': 0.40,     // 40% male
    'non-binary': 0.10, // 10% non-binary
    'unknown': 0.05,  // 5% unknown
  };

  // Target distribution for species
  private readonly targetSpeciesDistribution: Record<string, number> = {
    'human': 0.50,    // 50% human
    'elf': 0.12,      // 12% elf
    'robot': 0.08,    // 8% robot
    'furry': 0.08,    // 8% furry
    'demon': 0.06,    // 6% demon
    'angel': 0.04,    // 4% angel
    'unknown': 0.12,  // 12% other/unknown
  };

  /**
   * Select diverse images from approved queue
   */
  async selectImages(criteria: SelectionCriteria): Promise<string[]> {
    const {
      count,
      ageRatingDistribution,
      styleBalance = true,
      tagDiversity = true,
      genderBalance = true, // NEW: Default enabled
      speciesDiversity = true, // NEW: Default enabled
      maxConsecutiveSameGender = 3, // NEW: Default max 3
      maxConsecutiveSameSpecies = 2, // NEW: Default max 2
    } = criteria;

    logger.info({ criteria }, 'Starting enhanced image selection with diversification');

    // Get distribution
    const distribution = ageRatingDistribution || this.defaultDistribution;

    // Get recent generated characters for diversity tracking
    const recentGenerated = await this.getRecentGeneratedCharacters(50);
    const currentDistribution = this.calculateCurrentDistribution(recentGenerated);

    logger.info(
      {
        currentGenderDist: currentDistribution.gender,
        currentSpeciesDist: currentDistribution.species,
      },
      'Current distribution calculated'
    );

    // Initialize diversity state
    const diversityState: DiversityState = {
      consecutiveGender: { type: '', count: 0 },
      consecutiveSpecies: { type: '', count: 0 },
      usedGenders: new Map(),
      usedSpecies: new Map(),
    };

    // Select images per age rating
    const selected: string[] = [];
    const usedTags = new Set<string>();

    for (const [rating, targetCount] of Object.entries(distribution)) {
      const ratingImages = await this.selectForRating(
        rating as AgeRating,
        targetCount,
        usedTags,
        styleBalance,
        tagDiversity,
        genderBalance,
        speciesDiversity,
        currentDistribution,
        diversityState,
        maxConsecutiveSameGender,
        maxConsecutiveSameSpecies
      );

      selected.push(...ratingImages);
    }

    // If we didn't get enough, fill remaining with any approved images
    if (selected.length < count) {
      const remaining = count - selected.length;
      const additional = await this.selectRemaining(
        remaining,
        selected,
        usedTags,
        genderBalance,
        speciesDiversity,
        currentDistribution,
        diversityState,
        maxConsecutiveSameGender,
        maxConsecutiveSameSpecies
      );
      selected.push(...additional);
    }

    // Trim if we got too many
    const finalSelection = selected.slice(0, count);

    // Log final diversity stats
    const finalStats = await this.calculateSelectionStats(finalSelection);

    logger.info(
      {
        requested: count,
        selected: finalSelection.length,
        finalGenderDist: finalStats.gender,
        finalSpeciesDist: finalStats.species,
      },
      'Enhanced diversified image selection completed'
    );

    return finalSelection;
  }

  /**
   * Get recent generated characters for diversity tracking
   */
  private async getRecentGeneratedCharacters(limit: number): Promise<Array<{ gender: string | null; species: string | null }>> {
    const characters = await prisma.character.findMany({
      where: { visibility: 'PUBLIC' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        gender: true,
        species: {
          select: { name: true },
        },
      },
    });

    // Map to old format for compatibility
    return characters.map(char => ({
      gender: char.gender,
      species: char.species?.name || null,
    }));
  }

  /**
   * Calculate current distribution of gender and species
   */
  private calculateCurrentDistribution(
    characters: Array<{ gender: string | null; species: string | null }>
  ): {
    gender: Record<string, number>;
    species: Record<string, number>;
  } {
    const genderCounts = new Map<string, number>();
    const speciesCounts = new Map<string, number>();
    const total = characters.length || 1; // Avoid division by zero

    for (const char of characters) {
      const gender = char.gender || 'unknown';
      const species = char.species || 'unknown';

      genderCounts.set(gender, (genderCounts.get(gender) || 0) + 1);
      speciesCounts.set(species, (speciesCounts.get(species) || 0) + 1);
    }

    const genderDist: Record<string, number> = {};
    const speciesDist: Record<string, number> = {};

    for (const [key, value] of genderCounts.entries()) {
      genderDist[key] = value / total;
    }

    for (const [key, value] of speciesCounts.entries()) {
      speciesDist[key] = value / total;
    }

    return { gender: genderDist, species: speciesDist };
  }

  /**
   * Select images for specific age rating
   */
  private async selectForRating(
    rating: AgeRating,
    count: number,
    usedTags: Set<string>,
    styleBalance: boolean,
    tagDiversity: boolean,
    genderBalance: boolean,
    speciesDiversity: boolean,
    currentDistribution: { gender: Record<string, number>; species: Record<string, number> },
    diversityState: DiversityState,
    maxConsecutiveSameGender: number,
    maxConsecutiveSameSpecies: number
  ): Promise<string[]> {
    // Get approved images for this rating
    const images = await prisma.curatedImage.findMany({
      where: {
        status: 'APPROVED',
        ageRating: rating,
        generatedCharId: null,
      },
      orderBy: [
        { qualityScore: 'desc' },
        { createdAt: 'asc' },
      ],
      take: count * 3, // Get more to allow for filtering
    });

    // Filter and score for diversity
    const scored = images.map(img => ({
      id: img.id,
      image: img,
      score: this.calculateDiversityScore(
        img,
        usedTags,
        styleBalance,
        genderBalance,
        speciesDiversity,
        currentDistribution
      ),
      tags: img.tags,
      qualityScore: img.qualityScore || 0,
      gender: img.gender || 'unknown',
      species: img.species || 'unknown',
    }));

    // Sort by diversity score, then quality
    scored.sort((a, b) => {
      if (Math.abs(a.score - b.score) < 0.1) {
        return b.qualityScore - a.qualityScore;
      }
      return b.score - a.score;
    });

    // Select top images with diversity constraints
    const selected: string[] = [];
    for (const item of scored) {
      if (selected.length >= count) break;

      // Check consecutive limits
      if (genderBalance && this.wouldExceedConsecutiveLimit(
        item.gender,
        diversityState.consecutiveGender,
        maxConsecutiveSameGender
      )) {
        continue;
      }

      if (speciesDiversity && this.wouldExceedConsecutiveLimit(
        item.species,
        diversityState.consecutiveSpecies,
        maxConsecutiveSameSpecies
      )) {
        continue;
      }

      // Check tag diversity
      if (tagDiversity && this.hasTooManySharedTags(item.tags, usedTags)) {
        continue;
      }

      selected.push(item.id);

      // Update diversity state
      this.updateDiversityState(
        item.gender,
        item.species,
        diversityState,
        item.tags,
        usedTags,
        tagDiversity
      );
    }

    return selected;
  }

  /**
   * Calculate diversity score for an image
   * Higher score = more underrepresented = higher priority
   */
  private calculateDiversityScore(
    image: any,
    usedTags: Set<string>,
    styleBalance: boolean,
    genderBalance: boolean,
    speciesDiversity: boolean,
    currentDistribution: { gender: Record<string, number>; species: Record<string, number> }
  ): number {
    let score = 0.5; // Base score

    // Tag diversity bonus
    const sharedTags = (image.tags || []).filter((t: string) => usedTags.has(t)).length;
    score -= sharedTags * 0.05; // Penalty for shared tags

    // Quality bonus
    if (image.qualityScore) {
      score += (image.qualityScore / 5) * 0.2;
    }

    // Style bonus (if enabled)
    if (styleBalance && (image.tags || []).some((t: string) =>
      ['anime', 'realistic', 'fantasy', 'sci-fi'].includes(t.toLowerCase())
    )) {
      score += 0.1;
    }

    // Gender diversity bonus (if enabled)
    if (genderBalance && image.gender) {
      const currentGenderDist = currentDistribution.gender[image.gender] || 0;
      const targetGenderDist = this.targetGenderDistribution[image.gender] || 0.1;
      const genderGap = targetGenderDist - currentGenderDist;
      score += genderGap * 2.0; // Bonus for underrepresented genders
    }

    // Species diversity bonus (if enabled)
    if (speciesDiversity && image.species) {
      const currentSpeciesDist = currentDistribution.species[image.species] || 0;
      const targetSpeciesDist = this.targetSpeciesDistribution[image.species] || 0.05;
      const speciesGap = targetSpeciesDist - currentSpeciesDist;
      score += speciesGap * 2.0; // Bonus for underrepresented species
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Check if selecting this type would exceed consecutive limit
   */
  private wouldExceedConsecutiveLimit(
    type: string,
    consecutive: { type: string; count: number },
    maxLimit: number
  ): boolean {
    if (consecutive.type === type) {
      return consecutive.count >= maxLimit;
    }
    return false;
  }

  /**
   * Update diversity state after selecting an image
   */
  private updateDiversityState(
    gender: string,
    species: string,
    state: DiversityState,
    tags: string[],
    usedTags: Set<string>,
    tagDiversity: boolean
  ): void {
    // Update consecutive gender
    if (state.consecutiveGender.type === gender) {
      state.consecutiveGender.count++;
    } else {
      state.consecutiveGender = { type: gender, count: 1 };
    }

    // Update consecutive species
    if (state.consecutiveSpecies.type === species) {
      state.consecutiveSpecies.count++;
    } else {
      state.consecutiveSpecies = { type: species, count: 1 };
    }

    // Update totals
    state.usedGenders.set(gender, (state.usedGenders.get(gender) || 0) + 1);
    state.usedSpecies.set(species, (state.usedSpecies.get(species) || 0) + 1);

    // Update used tags
    if (tagDiversity) {
      for (const tag of (tags || []).slice(0, 5)) {
        usedTags.add(tag);
      }
    }
  }

  /**
   * Select remaining images to fill quota
   */
  private async selectRemaining(
    count: number,
    exclude: string[],
    usedTags: Set<string>,
    genderBalance: boolean,
    speciesDiversity: boolean,
    _currentDistribution: { gender: Record<string, number>; species: Record<string, number> }, // eslint-disable-line @typescript-eslint/no-unused-vars
    diversityState: DiversityState,
    maxConsecutiveSameGender: number,
    maxConsecutiveSameSpecies: number
  ): Promise<string[]> {
    const images = await prisma.curatedImage.findMany({
      where: {
        status: 'APPROVED',
        generatedCharId: null,
        id: { notIn: exclude },
      },
      orderBy: { qualityScore: 'desc' },
      take: count * 2,
    });

    const selected: string[] = [];
    for (const img of images) {
      if (selected.length >= count) break;

      const gender = img.gender || 'unknown';
      const species = img.species || 'unknown';

      // Check consecutive limits
      if (genderBalance && this.wouldExceedConsecutiveLimit(
        gender,
        diversityState.consecutiveGender,
        maxConsecutiveSameGender
      )) {
        continue;
      }

      if (speciesDiversity && this.wouldExceedConsecutiveLimit(
        species,
        diversityState.consecutiveSpecies,
        maxConsecutiveSameSpecies
      )) {
        continue;
      }

      if (!this.hasTooManySharedTags(img.tags || [], usedTags)) {
        selected.push(img.id);
        this.updateDiversityState(
          gender,
          species,
          diversityState,
          img.tags || [],
          usedTags,
          true
        );
      }
    }

    return selected;
  }

  /**
   * Check if image has too many shared tags
   */
  private hasTooManySharedTags(tags: string[], usedTags: Set<string>): boolean {
    const shared = tags.filter(t => usedTags.has(t)).length;
    return shared > 2; // Max 2 shared tags
  }

  /**
   * Calculate final selection statistics
   */
  private async calculateSelectionStats(selectionIds: string[]): Promise<{
    gender: Record<string, number>;
    species: Record<string, number>;
  }> {
    if (selectionIds.length === 0) {
      return { gender: {}, species: {} };
    }

    const images = await prisma.curatedImage.findMany({
      where: { id: { in: selectionIds } },
      select: { gender: true, species: true },
    });

    const genderCounts = new Map<string, number>();
    const speciesCounts = new Map<string, number>();
    const total = images.length;

    for (const img of images) {
      const gender = img.gender || 'unknown';
      const species = img.species || 'unknown';

      genderCounts.set(gender, (genderCounts.get(gender) || 0) + 1);
      speciesCounts.set(species, (speciesCounts.get(species) || 0) + 1);
    }

    const genderDist: Record<string, number> = {};
    const speciesDist: Record<string, number> = {};

    for (const [key, value] of genderCounts.entries()) {
      genderDist[key] = value / total;
    }

    for (const [key, value] of speciesCounts.entries()) {
      speciesDist[key] = value / total;
    }

    return { gender: genderDist, species: speciesDist };
  }

  /**
   * Get current selection statistics
   */
  async getSelectionStats(): Promise<{
    byAgeRating: Record<string, number>;
    totalApproved: number;
    recentQuality: { avg: number; min: number; max: number };
    byGender: Record<string, number>; // NEW
    bySpecies: Record<string, number>; // NEW
  }> {
    const [approved, byRating, byGender, bySpecies] = await Promise.all([
      prisma.curatedImage.count({
        where: { status: 'APPROVED', generatedCharId: null },
      }),
      prisma.curatedImage.groupBy({
        by: ['ageRating'],
        where: { status: 'APPROVED', generatedCharId: null },
        _count: true,
      }),
      // NEW: Group by gender
      prisma.curatedImage.groupBy({
        by: ['gender'],
        where: { status: 'APPROVED', generatedCharId: null },
        _count: true,
      }),
      // NEW: Group by species
      prisma.curatedImage.groupBy({
        by: ['species'],
        where: { status: 'APPROVED', generatedCharId: null },
        _count: true,
      }),
    ]);

    // Get quality stats
    const qualityStats = await prisma.curatedImage.aggregate({
      where: {
        status: 'APPROVED',
        generatedCharId: null,
        qualityScore: { not: null },
      },
      _avg: { qualityScore: true },
      _min: { qualityScore: true },
      _max: { qualityScore: true },
    });

    return {
      byAgeRating: Object.fromEntries(
        byRating.map(r => [r.ageRating, r._count])
      ),
      totalApproved: approved,
      recentQuality: {
        avg: qualityStats._avg.qualityScore || 0,
        min: qualityStats._min.qualityScore || 0,
        max: qualityStats._max.qualityScore || 0,
      },
      // NEW: Gender distribution
      byGender: Object.fromEntries(
        byGender.map(g => [g.gender || 'unknown', g._count])
      ),
      // NEW: Species distribution
      bySpecies: Object.fromEntries(
        bySpecies.map(s => [s.species || 'unknown', s._count])
      ),
    };
  }
}

// Singleton instance
export const diversificationAlgorithm = new DiversificationAlgorithm();
