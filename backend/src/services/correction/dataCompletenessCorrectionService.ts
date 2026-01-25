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
import Fuse from 'fuse.js';

/**
 * Species synonym mapping
 * Maps common species name variations to canonical species names
 */
const SPECIES_SYNONYMS: Record<string, string> = {
  // Japanese/Asian mythological creatures
  'wolf yokai': 'Yokai',
  'fox spirit': 'Kitsune',
  'fox yokai': 'Kitsune',
  'cat girl': 'Nekomimi',
  'catgirl': 'Nekomimi',
  'cat person': 'Nekomimi',
  'nekomimi': 'Nekomimi',
  'dog girl': 'Inumimi',
  'doggirl': 'Inumimi',
  'dog person': 'Inumimi',
  'inumimi': 'Inumimi',
  'rabbit girl': 'Usagimimi',
  'rabbitgirl': 'Usagimimi',
  'rabbit person': 'Usagimimi',
  'usagimimi': 'Usagimimi',
  'bunnygirl': 'Usagimimi',
  'tanuki': 'Tanuki',
  'kappa': 'Kappa',
  'tengu': 'Tengu',
  'oni': 'Oni',
  'slime': 'Slime',
  'slime girl': 'Slime',
  'slime person': 'Slime',

  // Robot/Android variants
  'android': 'Robot',
  'cyborg': 'Robot',
  'gynoid': 'Robot',
  'mec': 'Robot',
  'mecha': 'Robot',
  'machine': 'Robot',
  'automaton': 'Robot',
  'ai': 'Robot',

  // Elf variants
  'half-elf': 'Elf',
  'half elf': 'Elf',
  'dark elf': 'Elf',
  'darkelf': 'Elf',
  'drow': 'Elf',
  'high elf': 'Elf',
  'highelf': 'Elf',
  'wood elf': 'Elf',
  'woodelf': 'Elf',
  'night elf': 'Elf',
  'nightelf': 'Elf',
  'santa elf': 'Elf',

  // Demon/Vampire variants
  'succubus': 'Demon',
  'incubus': 'Demon',
  'devil': 'Demon',
  'archdemon': 'Demon',
  'arch demon': 'Demon',
  'imp': 'Demon',
  'hellspawn': 'Demon',
  'demon girl': 'Demon',
  'demongirl': 'Demon',
  'demon person': 'Demon',

  'vampire': 'Vampire',
  'vampiress': 'Vampire',
  'dhampir': 'Vampire',
  'nosferatu': 'Vampire',

  // Dragon variants
  'dragon girl': 'Dragon',
  'dragonborn': 'Dragon',
  'dragon person': 'Dragon',
  'dracokin': 'Dragon',
  'half-dragon': 'Dragon',
  'wyrm': 'Dragon',
  'drake': 'Dragon',

  // Spirit/Ghost variants
  'ghost': 'Spirit',
  'phantom': 'Spirit',
  'wraith': 'Spirit',
  'specter': 'Spirit',
  'poltergeist': 'Spirit',
  'soul': 'Spirit',
  'will-o-wisp': 'Spirit',
  'spirit girl': 'Spirit',
  'spirit person': 'Spirit',

  // Angel variants
  'angel': 'Angel',
  'seraph': 'Angel',
  'cherub': 'Angel',
  'archangel': 'Angel',
  'fallen angel': 'Demon',
  'fallenangel': 'Demon',

  // Human variants
  'humanoid': 'Human',
  'demihuman': 'Human',
  'semi-human': 'Human',
  'person': 'Human',
  'mortal': 'Human',

  // Animal/Beast variants
  'werewolf': 'Werewolf',
  'wolf man': 'Werewolf',
  'wolfman': 'Werewolf',
  'wolfgirl': 'Werewolf',
  'lycan': 'Werewolf',
  'lycanthrope': 'Werewolf',

  'mermaid': 'Merfolk',
  'merman': 'Merfolk',
  'merperson': 'Merfolk',
  'merfolk': 'Merfolk',
  'fish person': 'Merfolk',

  'centaur': 'Centaur',
  'minotaur': 'Minotaur',
  'satyr': 'Satyr',
  'faun': 'Satyr',

  'fairy': 'Fairy',
  'faerie': 'Fairy',
  'pixie': 'Fairy',
  'sprite': 'Fairy',
  'nymph': 'Fairy',

  'gnome': 'Gnome',
  'halfling': 'Halfling',
  'hobbit': 'Halfling',
  'dwarf': 'Dwarf',
  'dwarven': 'Dwarf',

  // Monster variants
  'orc': 'Orc',
  'goblin': 'Goblin',
  'hobgoblin': 'Goblin',
  'ogre': 'Ogre',
  'troll': 'Troll',
  'giant': 'Giant',
  'cyclops': 'Giant',

  // Aliens
  'alien': 'Alien',
  'extraterrestrial': 'Alien',
  'martian': 'Alien',
  'space alien': 'Alien',

  // Other common variants
  'harpy': 'Harpy',
  'siren': 'Harpy',
  'lamia': 'Lamia',
  'naga': 'Lamia',
  'arachne': 'Arachne',
  'spider girl': 'Arachne',
  'spidergirl': 'Arachne',

  'kobold': 'Kobold',
  'lizard person': 'Reptilian',
  'lizardfolk': 'Reptilian',
  'reptilian': 'Reptilian',

  // Compound girl variants (foxgirl, wolfgirl already handled above)
  'foxgirl': 'Kitsune',

  // Furry/Anthro variants
  'anthro': 'Unknown',
  'anthropomorphic': 'Unknown',
  'furry': 'Unknown',
  'feral': 'Unknown',
  'kemono': 'Unknown',
};

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
      let userDescription = '';
      if (!needsNameGeneration) {
        const parts = [character.firstName];
        if (character.lastName) parts.push(character.lastName);
        if (character.physicalCharacteristics) parts.push(character.physicalCharacteristics);
        userDescription = parts.join('. ') + '.';
      }

      // Compile new data using LLM
      // Pass null for imageAnalysis since we're not re-analyzing images
      // Pass null for user since this is a bot operation
      const compiledData = await compileCharacterDataWithLLM(
        userDescription,
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
   * Enhanced fallback strategy with fuzzy matching and synonym resolution:
   * 1. Check synonym mapping for common species variations
   * 2. Try exact match (case-insensitive)
   * 3. Try fuzzy search with Fuse.js (Levenshtein distance)
   * 4. Try partial match (species name contains LLM response or vice versa)
   * 5. Try word-based matching (any word matches a species)
   * 6. Fallback to Human if humanoid terms present
   * 7. Use "Unknown" species as final fallback
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

    const normalizedSpeciesName = speciesName.trim().toLowerCase();

    // Fetch all species once for multiple matching attempts
    const allSpecies = await prisma.species.findMany({
      select: { id: true, name: true },
    });

    // Strategy 1: Check synonym mapping first (highest priority)
    logger.info({
      characterId,
      strategy: 'synonym_mapping',
      speciesName: normalizedSpeciesName,
    }, 'Attempting species identification - Strategy 1: Synonym mapping');

    const canonicalName = SPECIES_SYNONYMS[normalizedSpeciesName];
    if (canonicalName) {
      const species = allSpecies.find(
        s => s.name.toLowerCase() === canonicalName.toLowerCase()
      );
      if (species) {
        logger.info({
          characterId,
          strategy: 'synonym_mapping',
          speciesName: normalizedSpeciesName,
          canonicalName,
          matchedSpeciesId: species.id,
          matchedSpeciesName: species.name,
        }, 'Species found via synonym mapping');
        return species.id;
      }
    }

    // Strategy 2: Try exact match (case-insensitive)
    logger.info({
      characterId,
      strategy: 'exact_match',
      speciesName: normalizedSpeciesName,
    }, 'Attempting species identification - Strategy 2: Exact match');

    let species = allSpecies.find(
      s => s.name.toLowerCase() === normalizedSpeciesName
    );

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

    // Strategy 3: Try fuzzy search with Fuse.js
    logger.info({
      characterId,
      strategy: 'fuzzy_search',
      speciesName: normalizedSpeciesName,
    }, 'Attempting species identification - Strategy 3: Fuzzy search');

    const fuse = new Fuse(allSpecies, {
      keys: ['name'],
      threshold: 0.4, // Allow 40% difference (0.0 = perfect, 1.0 = match anything)
      includeScore: true,
      ignoreLocation: true, // Better for multi-word species names
    });

    const fuzzyResults = fuse.search(speciesName);
    if (fuzzyResults.length > 0 && fuzzyResults[0].score && fuzzyResults[0].score < 0.3) {
      species = fuzzyResults[0].item;
      logger.info({
        characterId,
        strategy: 'fuzzy_search',
        speciesName: normalizedSpeciesName,
        matchedSpeciesId: species.id,
        matchedSpeciesName: species.name,
        score: fuzzyResults[0].score,
      }, 'Species found via fuzzy search');
      return species.id;
    }

    // Strategy 4: Try partial match (contains)
    logger.info({
      characterId,
      strategy: 'partial_match',
      speciesName: normalizedSpeciesName,
    }, 'Attempting species identification - Strategy 4: Partial match');

    // Try: LLM response contains species name (e.g., "Dark Elf" contains "Elf")
    species = allSpecies.find(s =>
      normalizedSpeciesName.includes(s.name.toLowerCase()) ||
      s.name.toLowerCase().includes(normalizedSpeciesName)
    );

    if (species) {
      logger.info({
        characterId,
        strategy: 'partial_match',
        speciesName: normalizedSpeciesName,
        matchedSpeciesId: species.id,
        matchedSpeciesName: species.name,
      }, 'Species found via partial match');
      return species.id;
    }

    // Strategy 5: Try word-based matching (check if any word in LLM response matches a species)
    logger.info({
      characterId,
      strategy: 'word_match',
      speciesName: normalizedSpeciesName,
    }, 'Attempting species identification - Strategy 5: Word-based match');

    const words = normalizedSpeciesName.split(/\s+/);
    for (const word of words) {
      if (word.length < 3) continue; // Skip short words

      species = allSpecies.find(s =>
        s.name.toLowerCase() === word ||
        s.name.toLowerCase().includes(word) ||
        word.includes(s.name.toLowerCase())
      );

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

    // Strategy 6: Fallback to Human if humanoid terms present
    logger.info({
      characterId,
      strategy: 'humanoid_fallback',
      speciesName: normalizedSpeciesName,
    }, 'Attempting species identification - Strategy 6: Humanoid fallback');

    const humanoidTerms = ['girl', 'boy', 'woman', 'man', 'person', 'human', 'humanoid'];
    if (humanoidTerms.some(term => normalizedSpeciesName.includes(term))) {
      species = allSpecies.find(s => s.name.toLowerCase() === 'human');
      if (species) {
        logger.info({
          characterId,
          strategy: 'humanoid_fallback',
          speciesName: normalizedSpeciesName,
          matchedSpeciesId: species.id,
          matchedSpeciesName: species.name,
        }, 'Species found via humanoid fallback (Human)');
        return species.id;
      }
    }

    // Strategy 7: Final fallback to "Unknown" species
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
