/**
 * Data Completeness Correction Service
 *
 * Identifies and fixes incomplete bot-generated character data.
 *
 * Addresses issues where:
 * - firstName is "Character" (LLM fallback default)
 * - speciesId is NULL (missing species classification)
 * - gender is "UNKNOWN" (for humanoid species)
 * - theme is "DARK_FANTASY" (needs re-evaluation)
 * - contentTags is empty (for non-L ratings)
 *
 * Uses existing compileCharacterDataWithLLM to regenerate missing data.
 *
 * Phase 6 Improvements:
 * - Expanded reprocessing criteria (all incomplete fields)
 * - Random selection instead of oldest-first
 * - 7-day cooldown per character
 * - Track which fields were corrected in logs
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
   * Expanded query criteria (Phase 6):
   * - userId = BOT_USER_ID (bot user only)
   * - NOT corrected in last 7 days (cooldown)
   * - Any of these conditions:
   *   - speciesId IS NULL
   *   - firstName = 'Character' (LLM fallback)
   *   - gender = 'UNKNOWN' (for humanoid species)
   *   - theme = 'DARK_FANTASY' AND created after 2026-01-20
   *   - contentTags = '{}' AND ageRating != 'L'
   *
   * Selection: Random instead of oldest-first
   *
   * @param limit - Maximum number of characters to return
   * @returns Array of characters needing correction
   */
  async findCharactersWithIncompleteData(limit: number = 50): Promise<IncompleteCharacter[]> {
    try {
      logger.info({ limit }, 'Finding characters with incomplete data');

      // Calculate 7 days ago for cooldown
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Get 2x limit to allow for cooldown filtering and randomization
      const candidates = await prisma.character.findMany({
        where: {
          userId: this.BOT_USER_ID,
          // Cooldown: not corrected in last 7 days
          NOT: {
            correctionJobLogs: {
              some: {
                jobType: 'data-completeness-correction',
                startedAt: { gte: sevenDaysAgo },
              },
            },
          },
          // Expanded reprocessing criteria
          OR: [
            { speciesId: null },
            { firstName: this.DEFAULT_FIRST_NAME },
            { gender: 'UNKNOWN' },
            {
              // Theme needs evaluation if DARK_FANTASY and created after feature
              theme: 'DARK_FANTASY',
              createdAt: { gte: new Date('2026-01-20') },
            },
            {
              // Empty content tags for non-L ratings
              contentTags: { equals: [] },
              ageRating: { not: 'L' },
            },
          ],
        },
        // Use raw query for random ordering (PostgreSQL-specific)
        orderBy: [
          { id: 'asc' }, // Fallback ordering
        ],
        take: limit * 2, // Get more to shuffle and filter
        select: {
          id: true,
          firstName: true,
          lastName: true,
          age: true,
          gender: true,
          speciesId: true,
          style: true,
          theme: true,
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

      // Shuffle array for random selection
      const shuffled = this.shuffleArray(candidates);

      // Take only the requested limit
      const characters = shuffled.slice(0, limit);

      logger.info({
        count: characters.length,
        limit,
        totalCandidates: candidates.length,
      }, 'Found characters with incomplete data');

      return characters;
    } catch (error) {
      logger.error({ error }, 'Error finding characters with incomplete data');
      return [];
    }
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   *
   * @param array - Array to shuffle
   * @returns Shuffled array
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
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
   * @deprecated Use correctCharacter() instead for Phase 6 improvements
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
      const fuzzySpecies = fuzzyResults[0].item;
      if (fuzzySpecies) {
        logger.info({
          characterId,
          strategy: 'fuzzy_search',
          speciesName: normalizedSpeciesName,
          matchedSpeciesId: fuzzySpecies.id,
          matchedSpeciesName: fuzzySpecies.name,
          score: fuzzyResults[0].score,
        }, 'Species found via fuzzy search');
        return fuzzySpecies.id;
      }
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
   * Resolve species ID from species name using improved fuzzy matching
   *
   * @param speciesName - Species name from LLM or character data
   * @param characterId - Character ID for logging
   * @returns Species ID (never null - always returns a valid ID)
   */
  async resolveSpeciesId(speciesName: string, characterId: string): Promise<string> {
    if (!speciesName || speciesName.trim().length === 0) {
      logger.warn({
        characterId,
        reason: 'no_species_name_provided',
      }, 'Species resolution failed - using Unknown fallback');
      return 'b09b64de-bc83-4c70-9008-0e4a6b43fa48'; // Unknown species ID
    }

    return await this.identifySpecies(speciesName, characterId);
  }

  /**
   * Infer gender from description for humanoid characters
   *
   * @param physicalCharacteristics - Physical description text
   * @param speciesId - Species ID to check if humanoid
   * @returns Inferred gender (or UNKNOWN if cannot infer)
   */
  private async inferGenderFromDescription(
    physicalCharacteristics: string | null,
    speciesId: string | null
  ): Promise<CharacterGender> {
    if (!physicalCharacteristics) {
      return 'UNKNOWN' as CharacterGender;
    }

    // Check if species is humanoid
    if (speciesId) {
      const species = await prisma.species.findUnique({
        where: { id: speciesId },
        select: { name: true, category: true },
      });

      if (species) {
        const humanoidCategories = ['humanoid', 'human', 'elf', 'demon', 'angel', 'vampire'];
        const isHumanoid = humanoidCategories.some(cat =>
          species.category?.toLowerCase().includes(cat) ||
          species.name.toLowerCase().includes(cat)
        );

        if (!isHumanoid) {
          // Not humanoid, UNKNOWN is acceptable
          return 'UNKNOWN' as CharacterGender;
        }
      }
    }

    // Infer from pronouns in description
    const desc = physicalCharacteristics.toLowerCase();
    if (desc.includes(' she ') || desc.includes(' her ') || desc.includes('female') || desc.includes('woman')) {
      return 'FEMALE' as CharacterGender;
    }
    if (desc.includes(' he ') || desc.includes(' his ') || desc.includes('male') || desc.includes('man')) {
      return 'MALE' as CharacterGender;
    }
    if (desc.includes(' they ') || desc.includes(' them ') || desc.includes('non-binary')) {
      return 'NON_BINARY' as CharacterGender;
    }

    // Default humanoids to FEMALE (most common in anime)
    return 'FEMALE' as CharacterGender;
  }

  /**
   * Infer theme from character data
   *
   * @param character - Character data
   * @returns Inferred theme
   */
  private async inferThemeFromCharacter(character: IncompleteCharacter): Promise<string> {
    const desc = (
      (character.physicalCharacteristics || '') +
      ' ' +
      (character.personality || '') +
      ' ' +
      (character.history || '')
    ).toLowerCase();

    // Check for theme indicators
    if (desc.includes('furry') || desc.includes('anthropomorphic') || desc.includes('animal') || desc.includes('beast')) {
      return 'FURRY';
    }
    if (desc.includes('robot') || desc.includes('cyborg') || desc.includes('android') || desc.includes('mecha') || desc.includes('sci-fi') || desc.includes('futuristic')) {
      return 'SCI_FI';
    }
    if (desc.includes('dark') || desc.includes('gothic') || desc.includes('demon') || desc.includes('vampire') || desc.includes('horror')) {
      return 'DARK_FANTASY';
    }
    if (desc.includes('magic') || desc.includes('fantasy') || desc.includes('medieval') || desc.includes('wizard') || desc.includes('elf')) {
      return 'FANTASY';
    }

    // Default to FANTASY
    return 'FANTASY';
  }

  /**
   * Infer content tags from text
   *
   * @param personality - Personality text
   * @param history - History text
   * @param physicalCharacteristics - Physical description
   * @param ageRating - Age rating to respect
   * @returns Inferred content tags
   */
  private async inferContentTagsFromText(
    personality: string | null,
    history: string | null,
    physicalCharacteristics: string | null,
    ageRating: string
  ): Promise<string[]> {
    // Don't add tags for L-rated content
    if (ageRating === 'L') {
      return [];
    }

    const combinedText = `${personality || ''} ${history || ''} ${physicalCharacteristics || ''}`.toLowerCase();
    const tags: string[] = [];

    // Define tag patterns with minimum age rating
    const tagPatterns: Array<{ tag: string; patterns: string[]; minRating: string }> = [
      {
        tag: 'VIOLENCE',
        patterns: ['fight', 'battle', 'war', 'combat', 'blood', 'weapon', 'sword', 'warrior', 'attack'],
        minRating: 'TWELVE',
      },
      {
        tag: 'SEXUAL',
        patterns: ['love', 'romantic', 'affection', 'relationship', 'attractive'],
        minRating: 'TEN',
      },
      {
        tag: 'HORROR',
        patterns: ['terror', 'nightmare', 'creepy', 'horror', 'fear', 'haunted', 'scary'],
        minRating: 'FOURTEEN',
      },
      {
        tag: 'PSYCHOLOGICAL',
        patterns: ['trauma', 'mental', 'psychological', 'mind', 'insanity'],
        minRating: 'FOURTEEN',
      },
      {
        tag: 'LANGUAGE',
        patterns: ['profanity', 'swearing', 'curse'],
        minRating: 'TWELVE',
      },
    ];

    // Age rating order (from least to most mature)
    const ratingOrder = ['L', 'TEN', 'TWELVE', 'FOURTEEN', 'SIXTEEN', 'EIGHTEEN'];
    const currentRatingIndex = ratingOrder.indexOf(ageRating);

    for (const { tag, patterns, minRating } of tagPatterns) {
      // Check if pattern matches
      if (patterns.some(p => combinedText.includes(p))) {
        // Check if tag is allowed for this age rating
        const minRatingIndex = ratingOrder.indexOf(minRating);
        if (currentRatingIndex >= minRatingIndex) {
          tags.push(tag);
        }
      }
    }

    return tags;
  }

  /**
   * Correct all incomplete fields for a character (Phase 6)
   *
   * Process:
   * 1. Identify which fields are incomplete
   * 2. Fix each incomplete field:
   *    - speciesId: use resolveSpeciesId()
   *    - firstName: recompile with LLM if generic
   *    - gender: infer from description for humanoids
   *    - theme: infer from character data
   *    - contentTags: infer from text if empty and non-L rating
   * 3. Track which fields were corrected
   * 4. Log correction with fields corrected
   *
   * @param characterId - ID of character to correct
   * @returns Object with success status and corrected fields
   */
  async correctCharacter(characterId: string): Promise<{ success: boolean; fieldsCorrected: string[]; error?: string }> {
    const startTime = Date.now();
    const fieldsCorrected: string[] = [];

    try {
      logger.info({ characterId }, 'Starting comprehensive character correction');

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
        return { success: false, fieldsCorrected: [], error: 'Character not found' };
      }

      // Verify this is a bot character
      if (character.userId !== this.BOT_USER_ID) {
        logger.warn({
          characterId,
          userId: character.userId,
        }, 'Character is not owned by bot user, skipping correction');
        return { success: false, fieldsCorrected: [], error: 'Not a bot character' };
      }

      const updates: any = {};
      const before: any = {
        speciesId: character.speciesId,
        firstName: character.firstName,
        gender: character.gender,
        theme: character.theme,
        contentTags: character.contentTags,
      };

      // 1. Fix speciesId if NULL
      if (!character.speciesId) {
        // Try to get species from character data or use LLM
        let speciesName = 'Unknown';
        if (character.history || character.physicalCharacteristics) {
          // Use existing data to infer species
          const textData = await compileCharacterDataWithLLM(
            '',
            null,
            {
              species: undefined,
              firstName: character.firstName,
              lastName: character.lastName || undefined,
              age: character.age || undefined,
              gender: character.gender || undefined,
            },
            'en',
            undefined
          );
          speciesName = textData.species || 'Unknown';
        }

        const speciesId = await this.resolveSpeciesId(speciesName, characterId);
        if (speciesId) {
          updates.speciesId = speciesId;
          fieldsCorrected.push('speciesId');
          logger.info({ characterId, speciesId }, 'Fixed speciesId');
        }
      }

      // 2. Fix firstName if generic
      if (character.firstName === this.DEFAULT_FIRST_NAME) {
        // Recompile with LLM to get a proper name
        const compiledData = await compileCharacterDataWithLLM(
          '', // Empty description to trigger LLM creativity
          null, // No image analysis
          {
            firstName: character.firstName,
            lastName: character.lastName || undefined,
            age: character.age || undefined,
            gender: character.gender || undefined,
            species: character.speciesId ? 'existing' : undefined,
          },
          'en',
          undefined
        );

        if (compiledData.firstName && compiledData.firstName !== this.DEFAULT_FIRST_NAME) {
          updates.firstName = compiledData.firstName;
          fieldsCorrected.push('firstName');
          logger.info({ characterId, firstName: compiledData.firstName }, 'Fixed firstName');
        }
      }

      // 3. Fix gender if UNKNOWN (for humanoids)
      if (character.gender === 'UNKNOWN') {
        const gender = await this.inferGenderFromDescription(
          character.physicalCharacteristics,
          character.speciesId
        );
        if (gender !== 'UNKNOWN') {
          updates.gender = gender;
          fieldsCorrected.push('gender');
          logger.info({ characterId, gender }, 'Fixed gender');
        }
      }

      // 4. Fix theme if DARK_FANTASY (created after 2026-01-20)
      if (character.theme === 'DARK_FANTASY' && character.createdAt >= new Date('2026-01-20')) {
        const theme = await this.inferThemeFromCharacter(character);
        if (theme !== 'DARK_FANTASY') {
          updates.theme = theme as any;
          fieldsCorrected.push('theme');
          logger.info({ characterId, theme }, 'Fixed theme');
        }
      }

      // 5. Fix contentTags if empty and non-L rating
      if (character.contentTags.length === 0 && character.ageRating !== 'L') {
        const tags = await this.inferContentTagsFromText(
          character.personality,
          character.history,
          character.physicalCharacteristics,
          character.ageRating
        );
        if (tags.length > 0) {
          updates.contentTags = tags;
          fieldsCorrected.push('contentTags');
          logger.info({ characterId, tags }, 'Fixed contentTags');
        }
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        await prisma.character.update({
          where: { id: characterId },
          data: updates,
        });

        const duration = Date.now() - startTime;
        logger.info({
          characterId,
          fieldsCorrected,
          duration,
        }, 'Character correction completed successfully');

        // Log individual correction
        await prisma.correctionJobLog.create({
          data: {
            jobType: 'data-completeness-correction',
            targetCount: 1,
            successCount: 1,
            failureCount: 0,
            duration: Math.floor(duration / 1000),
            completedAt: new Date(),
            characterId: characterId,
            fieldsCorrected: fieldsCorrected,
            details: {
              before,
              after: updates,
              timestamp: new Date().toISOString(),
            },
          },
        });

        return { success: true, fieldsCorrected };
      } else {
        logger.info({ characterId }, 'No corrections needed');
        return { success: true, fieldsCorrected: [] };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({
        characterId,
        error: errorMessage,
        duration,
      }, 'Character correction failed');

      // Log failed correction
      await prisma.correctionJobLog.create({
        data: {
          jobType: 'data-completeness-correction',
          targetCount: 1,
          successCount: 0,
          failureCount: 1,
          duration: Math.floor(duration / 1000),
          completedAt: new Date(),
          characterId: characterId,
          fieldsCorrected: [],
          details: {
            error: errorMessage,
            timestamp: new Date().toISOString(),
          },
        },
      }).catch(logError => {
        logger.error({ error: logError }, 'Failed to log correction failure');
      });

      return { success: false, fieldsCorrected, error: errorMessage };
    }
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
          const result = await this.correctCharacter(character.id);

          if (result.success) {
            if (result.fieldsCorrected.length > 0) {
              successCount++;
              logger.info({
                characterId: character.id,
                fieldsCorrected: result.fieldsCorrected,
                progress: `${successCount}/${targetCount}`,
              }, 'Character corrected successfully');
            } else {
              // No corrections needed (character already complete)
              logger.info({
                characterId: character.id,
                progress: `${successCount}/${targetCount}`,
              }, 'Character already complete, no corrections needed');
            }
          } else {
            failureCount++;
            errors.push({
              characterId: character.id,
              error: result.error || 'Correction failed (check logs for details)',
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
