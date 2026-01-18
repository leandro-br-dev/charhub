/**
 * Data Completeness Correction Service
 *
 * Identifies and fixes incomplete bot-generated character data.
 *
 * Addresses issues where:
 * - firstName is "Character" (LLM fallback default)
 * - speciesId is NULL (missing species classification)
 *
 * Uses existing compileCharacterDataWithLLM to regenerate missing data.
 */

import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { CHARHUB_OFFICIAL_ID } from '../characterService';
import { compileCharacterDataWithLLM } from '../../controllers/automatedCharacterGenerationController';
import type { GeneratedCharacterData } from '../../controllers/automatedCharacterGenerationController';
import { CharacterGender, Prisma } from '../../generated/prisma';

/**
 * Result of a batch correction operation
 */
export interface CorrectionResult {
  targetCount: number;
  successCount: number;
  failureCount: number;
  errors: Array<{ characterId: string; error: string }>;
  duration: number;
}

/**
 * Character data for correction
 */
interface IncompleteCharacter {
  id: string;
  firstName: string;
  lastName: string | null;
  age: number | null;
  gender: string | null;
  speciesId: string | null;
  style: string | null;
  physicalCharacteristics: string | null;
  personality: string | null;
  history: string | null;
  reference: string | null;
  visibility: string;
  ageRating: string;
  contentTags: string[];
  createdAt: Date;
  updatedAt: Date;
  images: Array<{
    id: string;
    url: string;
    key: string | null;
  }>;
}

/**
 * Data Completeness Correction Service
 *
 * Finds and fixes incomplete bot-generated character data using LLM.
 */
class DataCompletenessCorrectionService {
  private readonly BOT_USER_ID = CHARHUB_OFFICIAL_ID; // '00000000-0000-0000-0000-000000000001'
  private readonly DEFAULT_FIRST_NAME = 'Character';

  /**
   * Find bot-generated characters with incomplete data
   *
   * Query criteria:
   * - userId = BOT_USER_ID (bot user only)
   * - speciesId IS NULL OR firstName = 'Character' (LLM fallback)
   * - Order by createdAt (oldest first)
   *
   * @param limit - Maximum number of characters to return
   * @returns Array of characters needing correction
   */
  async findCharactersWithIncompleteData(limit: number = 50): Promise<IncompleteCharacter[]> {
    try {
      logger.info({ limit }, 'Finding characters with incomplete data');

      const characters = await prisma.character.findMany({
        where: {
          userId: this.BOT_USER_ID,
          OR: [
            { speciesId: null },
            { firstName: this.DEFAULT_FIRST_NAME },
          ],
        },
        orderBy: {
          createdAt: 'asc', // Oldest first
        },
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          age: true,
          gender: true,
          speciesId: true,
          style: true,
          physicalCharacteristics: true,
          personality: true,
          history: true,
          reference: true,
          visibility: true,
          ageRating: true,
          contentTags: true,
          createdAt: true,
          updatedAt: true,
          // Include images for potential image analysis
          images: {
            where: {
              type: 'SAMPLE', // User-uploaded reference images
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
            select: {
              id: true,
              url: true,
              key: true,
            },
          },
        },
      });

      logger.info({
        count: characters.length,
        limit,
      }, 'Found characters with incomplete data');

      return characters;
    } catch (error) {
      logger.error({ error }, 'Error finding characters with incomplete data');
      return [];
    }
  }

  /**
   * Fix incomplete character data using LLM
   *
   * Process:
   * 1. Retrieve character data
   * 2. Build user description from existing data
   * 3. Call compileCharacterDataWithLLM with:
   *    - Empty string for userDescription (to trigger LLM creativity)
   *    - Null for imageAnalysis (no image available)
   *    - Existing character data as textData
   *    - 'en' as preferredLanguage (bot characters default to English)
   * 4. Update character with corrected data
   * 5. Map species name to Species table using improved identification logic
   *
   * @param characterId - ID of character to correct
   * @returns true if correction succeeded, false otherwise
   */
  async correctCharacterData(characterId: string): Promise<boolean> {
    const startTime = Date.now();

    try {
      logger.info({ characterId }, 'Starting character data correction');

      // Retrieve character with existing data
      const character = await prisma.character.findUnique({
        where: { id: characterId },
        include: {
          images: {
            where: { type: 'SAMPLE' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!character) {
        logger.warn({ characterId }, 'Character not found for correction');
        return false;
      }

      // Verify this is a bot character
      if (character.userId !== this.BOT_USER_ID) {
        logger.warn({
          characterId,
          userId: character.userId,
        }, 'Character is not owned by bot user, skipping correction');
        return false;
      }

      // Build textData from existing character data
      const textData: GeneratedCharacterData = {
        firstName: character.firstName,
        lastName: character.lastName || undefined,
        age: character.age || undefined,
        gender: character.gender || undefined,
        species: character.speciesId ? 'existing' : undefined, // Signal that species exists
        style: character.style || undefined,
        physicalCharacteristics: character.physicalCharacteristics || undefined,
        personality: character.personality || undefined,
        history: character.history || undefined,
      };

      // Build user description from existing data
      // If firstName is "Character", pass empty string to trigger LLM name generation
      const needsNameGeneration = character.firstName === this.DEFAULT_FIRST_NAME;
      const userDescription = needsNameGeneration
        ? ''
        : `${character.firstName} ${character.lastName || ''}. ${character.physicalCharacteristics || ''}`.trim();

      // Compile new data using LLM
      // Pass null for imageAnalysis since we're not re-analyzing images
      // Pass null for user since this is a bot operation
      const compiledData = await compileCharacterDataWithLLM(
        userDescription || null,
        null, // No image analysis
        textData,
        'en', // Bot characters default to English
        undefined // No user context for bot operations
      );

      logger.info({
        characterId,
        compiledData: {
          firstName: compiledData.firstName,
          lastName: compiledData.lastName,
          age: compiledData.age,
          gender: compiledData.gender,
          species: compiledData.species,
        },
      }, 'Character data compiled by LLM');

      // Find species ID using improved identification logic
      const speciesId = await this.identifySpecies(compiledData.species, characterId);

      logger.info({
        characterId,
        speciesFromLLM: compiledData.species,
        identifiedSpeciesId: speciesId,
      }, 'Species identification completed');

      // Update character with corrected data
      await prisma.character.update({
        where: { id: characterId },
        data: {
          firstName: compiledData.firstName,
          lastName: compiledData.lastName || null,
          age: compiledData.age || null,
          gender: (compiledData.gender as CharacterGender | null) || null,
          speciesId: speciesId,
          physicalCharacteristics: compiledData.physicalCharacteristics || null,
          personality: compiledData.personality || null,
          history: compiledData.history || null,
        },
      });

      const duration = Date.now() - startTime;
      logger.info({
        characterId,
        duration,
      }, 'Character data correction completed successfully');

      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({
        characterId,
        error,
        duration,
      }, 'Character data correction failed');

      return false;
    }
  }

  /**
   * Identify species from LLM response using multiple fallback strategies
   *
   * Fallback strategy:
   * 1. Try exact match (case-insensitive)
   * 2. Try partial match (species name contains LLM response or vice versa)
   * 3. Try to identify species from character description/history
   * 4. Use "Unknown" species as final fallback
   *
   * @param speciesName - Species name from LLM
   * @param characterId - Character ID for logging
   * @returns Species ID (never null - always returns a valid ID)
   */
  private async identifySpecies(
    speciesName: string | undefined,
    characterId: string
  ): Promise<string> {
    const UNKNOWN_SPECIES_ID = 'b09b64de-bc83-4c70-9008-0e4a6b43fa48';

    // If no species name provided, return Unknown immediately
    if (!speciesName || speciesName.trim().length === 0) {
      logger.warn({
        characterId,
        reason: 'no_species_name_provided',
      }, 'Species identification failed - using Unknown fallback');
      return UNKNOWN_SPECIES_ID;
    }

    const normalizedSpeciesName = speciesName.trim();

    // Strategy 1: Try exact match (case-insensitive)
    logger.info({
      characterId,
      strategy: 'exact_match',
      speciesName: normalizedSpeciesName,
    }, 'Attempting species identification - Strategy 1: Exact match');

    let species = await prisma.species.findFirst({
      where: {
        name: { equals: normalizedSpeciesName, mode: 'insensitive' },
      },
      select: { id: true, name: true },
    });

    if (species) {
      logger.info({
        characterId,
        strategy: 'exact_match',
        speciesName: normalizedSpeciesName,
        matchedSpeciesId: species.id,
        matchedSpeciesName: species.name,
      }, 'Species found via exact match');
      return species.id;
    }

    // Strategy 2: Try partial match (contains)
    logger.info({
      characterId,
      strategy: 'partial_match',
      speciesName: normalizedSpeciesName,
    }, 'Species identification - Strategy 2: Partial match');

    // Try: LLM response contains species name (e.g., "Dark Elf" contains "Elf")
    species = await prisma.species.findFirst({
      where: {
        name: { contains: normalizedSpeciesName, mode: 'insensitive' },
      },
      select: { id: true, name: true },
    });

    if (species) {
      logger.info({
        characterId,
        strategy: 'partial_match_llm_contains_species',
        speciesName: normalizedSpeciesName,
        matchedSpeciesId: species.id,
        matchedSpeciesName: species.name,
      }, 'Species found via partial match (LLM response contains species name)');
      return species.id;
    }

    // Try: Species name contains LLM response (e.g., "Wood" matches "Wood Elf")
    species = await prisma.species.findFirst({
      where: {
        name: { mode: 'insensitive', contains: normalizedSpeciesName },
      },
      select: { id: true, name: true },
    });

    if (species) {
      logger.info({
        characterId,
        strategy: 'partial_match_species_contains_llm',
        speciesName: normalizedSpeciesName,
        matchedSpeciesId: species.id,
        matchedSpeciesName: species.name,
      }, 'Species found via partial match (Species name contains LLM response)');
      return species.id;
    }

    // Strategy 3: Try word-based matching (check if any word in LLM response matches a species)
    logger.info({
      characterId,
      strategy: 'word_match',
      speciesName: normalizedSpeciesName,
    }, 'Species identification - Strategy 3: Word-based match');

    const words = normalizedSpeciesName.split(/\s+/);
    for (const word of words) {
      if (word.length < 3) continue; // Skip short words

      species = await prisma.species.findFirst({
        where: {
          name: { equals: word, mode: 'insensitive' },
        },
        select: { id: true, name: true },
      });

      if (species) {
        logger.info({
          characterId,
          strategy: 'word_match',
          speciesName: normalizedSpeciesName,
          matchedWord: word,
          matchedSpeciesId: species.id,
          matchedSpeciesName: species.name,
        }, 'Species found via word-based match');
        return species.id;
      }
    }

    // Strategy 4: Fallback to "Unknown" species
    logger.warn({
      characterId,
      strategy: 'fallback_to_unknown',
      speciesName: normalizedSpeciesName,
      fallbackSpeciesId: UNKNOWN_SPECIES_ID,
    }, 'Species identification failed - using Unknown fallback');

    return UNKNOWN_SPECIES_ID;
  }

  /**
   * Run batch correction on multiple characters
   *
   * Process:
   * 1. Find characters with incomplete data (up to limit)
   * 2. For each character, attempt correction
   * 3. Track successes and failures
   * 4. Log results to CorrectionJobLog
   * 5. Return correction summary
   *
   * Continues to next character on failure (does not stop batch).
   *
   * @param limit - Maximum number of characters to process
   * @returns Correction result with statistics
   */
  async runBatchCorrection(limit: number = 50): Promise<CorrectionResult> {
    const startTime = Date.now();
    const errors: Array<{ characterId: string; error: string }> = [];

    let successCount = 0;
    let failureCount = 0;

    try {
      logger.info({ limit }, 'Starting batch data completeness correction');

      // Find characters needing correction
      const characters = await this.findCharactersWithIncompleteData(limit);
      const targetCount = characters.length;

      if (targetCount === 0) {
        logger.info('No characters found needing correction');

        // Log job completion even if no characters found
        await prisma.correctionJobLog.create({
          data: {
            jobType: 'data-completeness-correction',
            targetCount: 0,
            successCount: 0,
            failureCount: 0,
            duration: 0,
            completedAt: new Date(),
            errors: [],
            metadata: {
              message: 'No characters found needing correction',
            },
          },
        });

        return {
          targetCount: 0,
          successCount: 0,
          failureCount: 0,
          errors: [],
          duration: 0,
        };
      }

      logger.info({ targetCount }, `Processing ${targetCount} characters for correction`);

      // Process each character
      for (const character of characters) {
        try {
          const success = await this.correctCharacterData(character.id);

          if (success) {
            successCount++;
            logger.info({
              characterId: character.id,
              progress: `${successCount}/${targetCount}`,
            }, 'Character corrected successfully');
          } else {
            failureCount++;
            errors.push({
              characterId: character.id,
              error: 'Correction returned false (check logs for details)',
            });
            logger.warn({
              characterId: character.id,
              progress: `${successCount + failureCount}/${targetCount}`,
            }, 'Character correction failed');
          }
        } catch (error) {
          failureCount++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({
            characterId: character.id,
            error: errorMessage,
          });

          logger.error({
            characterId: character.id,
            error,
            progress: `${successCount + failureCount}/${targetCount}`,
          }, 'Character correction threw error');
        }
      }

      const duration = Math.floor((Date.now() - startTime) / 1000); // Convert to seconds

      // Log job completion to database
      await prisma.correctionJobLog.create({
        data: {
          jobType: 'data-completeness-correction',
          targetCount,
          successCount,
          failureCount,
          duration,
          completedAt: new Date(),
          errors: errors.length > 0 ? (errors as Prisma.InputJsonValue) : Prisma.JsonNull,
          metadata: {
            processedAt: new Date().toISOString(),
            limit,
          },
        },
      });

      logger.info({
        targetCount,
        successCount,
        failureCount,
        duration,
        errorRate: `${((failureCount / targetCount) * 100).toFixed(2)}%`,
      }, 'Batch data completeness correction completed');

      return {
        targetCount,
        successCount,
        failureCount,
        errors,
        duration,
      };
    } catch (error) {
      const duration = Math.floor((Date.now() - startTime) / 1000);

      logger.error({
        error,
        duration,
      }, 'Batch correction failed at job level');

      // Log failed job
      try {
        await prisma.correctionJobLog.create({
          data: {
            jobType: 'data-completeness-correction',
            targetCount: 0,
            successCount: 0,
            failureCount: 0,
            duration,
            completedAt: new Date(),
            errors: [{
              characterId: 'N/A',
              error: error instanceof Error ? error.message : 'Unknown error',
            }],
            metadata: {
              message: 'Batch job failed before processing characters',
            },
          },
        });
      } catch (logError) {
        logger.error({ error: logError }, 'Failed to log correction job failure');
      }

      return {
        targetCount: 0,
        successCount: 0,
        failureCount: 0,
        errors: [{
          characterId: 'N/A',
          error: error instanceof Error ? error.message : 'Unknown error',
        }],
        duration,
      };
    }
  }
}

// Export singleton instance
export const dataCompletenessCorrectionService = new DataCompletenessCorrectionService();

// Export class for testing
export { DataCompletenessCorrectionService };
