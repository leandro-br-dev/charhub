import { Prisma, AgeRating, ContentTag, Visibility, CharacterGender } from '../generated/prisma';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import type { CreateCharacterInput, UpdateCharacterInput } from '../validators';
import type { UserRole } from '../types';
import { translationService } from './translation/translationService';

/**
 * CharHub Official user ID (UUID constant)
 * Characters owned by this user can only be edited by ADMINs
 */
export const CHARHUB_OFFICIAL_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Sort options for character lists
 */
export type CharacterSortBy = 'popular' | 'newest' | 'favorites';

/**
 * Character Service
 *
 * Handles character CRUD operations and business logic.
 * Based on old project with improvements for the new architecture.
 */

/**
 * Validates and normalizes gender string to CharacterGender enum
 * - Converts to uppercase
 * - Validates against enum values
 * - Falls back to UNKNOWN if invalid
 */
function validateGender(gender: string | null | undefined): CharacterGender | null {
  if (!gender) return null;

  // Convert to uppercase and trim
  const normalized = gender.toUpperCase().trim();

  // Check if it's a valid CharacterGender enum value
  const validValues = Object.values(CharacterGender);
  if (validValues.includes(normalized as CharacterGender)) {
    return normalized as CharacterGender;
  }

  // Invalid value - log warning and return UNKNOWN as fallback
  logger.warn(`Invalid gender value: "${gender}", defaulting to UNKNOWN`);
  return 'UNKNOWN';
}

/**
 * Find species ID by name (case-insensitive search)
 * Searches both the name field and description field
 * Returns null if species not found
 */
async function findSpeciesIdByName(speciesName: string | null | undefined): Promise<string | null> {
  if (!speciesName || speciesName.trim() === '') return null;

  try {
    // Search for species by name (case-insensitive) or description
    const species = await prisma.species.findFirst({
      where: {
        OR: [
          { name: { equals: speciesName, mode: 'insensitive' } },
          { description: { contains: speciesName, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });

    if (species) {
      return species.id;
    }

    // Species not found - log info and return null
    logger.info(`Species not found for name "${speciesName}", will be stored as null`);
    return null;
  } catch (error) {
    logger.error({ error, speciesName }, 'Error finding species by name');
    return null;
  }
}

/**
 * Map gender string from frontend (e.g., "Male") to Prisma enum (e.g., "MALE")
 * Used in search/filter operations
 */
function mapGenderToEnum(gender: string): CharacterGender | null {
  const genderMap: Record<string, CharacterGender | null> = {
    'Male': 'MALE',
    'Female': 'FEMALE',
    'NonBinary': 'NON_BINARY',
    'Other': 'OTHER',
    'Unknown': null,
    'unknown': null,
  };
  return genderMap[gender] ?? (gender as CharacterGender);
}

// Type definitions
export interface CharacterWithRelations {
  id: string;
  firstName: string;
  lastName: string | null;
  age: number | null;
  gender: CharacterGender | null;
  speciesId: string | null;
  style: string | null;
  physicalCharacteristics: string | null;
  personality: string | null;
  history: string | null;
  visibility: Visibility;
  originalLanguageCode: string | null;
  ageRating: AgeRating;
  contentTags: ContentTag[];
  userId: string;
  loraId: string | null;
  mainAttireId: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  creator?: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  species?: {
    id: string;
    name: string;
  } | null;
  lora?: unknown | null;
  mainAttire?: unknown | null;
  attires?: unknown[];
  tags?: unknown[];
  stickers?: unknown[];
}

export interface CharacterListResult {
  characters: CharacterWithRelations[];
  total: number;
  hasMore: boolean;
}

// Include options for character queries
const characterInclude = {
  creator: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
    },
  },
  species: {
    select: {
      id: true,
      name: true,
    },
  },
  lora: true,
  mainAttire: {
    include: {
      owner: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  },
  attires: {
    include: {
      owner: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  },
  tags: true,
  stickers: {
    where: {
      status: 'COMPLETED',
    },
  },
  images: {
    orderBy: {
      createdAt: 'desc',
    },
    take: 20, // Limit total images returned
  },
} as const;

/**
 * Helper: Extract active avatar URL from character images
 */
export function getActiveAvatarUrl(images?: any[]): string | null {
  if (!images || images.length === 0) return null;
  const activeAvatar = images.find((img: any) => img.type === 'AVATAR' && img.isActive);
  return activeAvatar?.url || null;
}

/**
 * Helper: Enrich character with computed avatar field
 */
export function enrichCharacterWithAvatar<T extends Record<string, any>>(
  character: T
): T & { avatar: string | null } {
  return {
    ...character,
    avatar: getActiveAvatarUrl((character as any).images),
  };
}

/**
 * Helper: Enrich array of characters with computed avatar field
 */
export function enrichCharactersWithAvatar<T extends Record<string, any>>(
  characters: T[]
): Array<T & { avatar: string | null }> {
  return characters.map(enrichCharacterWithAvatar);
}

/**
 * Create a new character
 */
export async function createCharacter(data: CreateCharacterInput) {
  try {
    const { attireIds, tagIds, contentTags, species, gender, ...characterData } = data;

    // Validate gender and find species ID (async operation)
    const validatedGender = validateGender(gender);
    const speciesId = await findSpeciesIdByName(species);

    // Create character with relations
    const character = await prisma.character.create({
      data: {
        ...characterData,
        // Use validated gender enum value
        gender: validatedGender,
        // Use species ID from lookup (null if not found)
        ...(speciesId ? { speciesId } : {}),
        contentTags: contentTags || [],
        // Connect attires if provided
        ...(attireIds && attireIds.length > 0
          ? {
              attires: {
                connect: attireIds.map(id => ({ id })),
              },
            }
          : {}),
        // Ensure main attire is in the attires list
        ...(data.mainAttireId &&
        (!attireIds || !attireIds.includes(data.mainAttireId))
          ? {
              attires: {
                connect: [
                  ...(attireIds?.map(id => ({ id })) || []),
                  { id: data.mainAttireId },
                ],
              },
            }
          : {}),
        // Connect tags if provided
        ...(tagIds && tagIds.length > 0
          ? {
              tags: {
                connect: tagIds.map(id => ({ id })),
              },
            }
          : {}),
      },
      include: characterInclude,
    });

    logger.info(
      { characterId: character.id, userId: data.userId },
      'Character created successfully'
    );

    return enrichCharacterWithAvatar(character);
  } catch (error) {
    logger.error({ error, data }, 'Error creating character');
    throw error;
  }
}

/**
 * Get character by ID
 */
export async function getCharacterById(characterId: string) {
  try {
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      include: characterInclude,
    });

    if (!character) {
      return null;
    }

    return enrichCharacterWithAvatar(character);
  } catch (error) {
    logger.error({ error, characterId }, 'Error getting character by ID');
    throw error;
  }
}

/**
 * Get characters by user ID
 */
export async function getCharactersByUserId(
  userId: string,
  options?: {
    search?: string;
    tags?: string[];
    gender?: string | string[];
    species?: string | string[];
    ageRatings?: string[];
    blockedTags?: string[];
    skip?: number;
    limit?: number;
  }
) {
  try {
    const { search, tags, gender, species, ageRatings, blockedTags, skip = 0, limit = 20 } = options || {};

    // Build where clause
    const where: Prisma.CharacterWhereInput = {
      userId,
      isSystemCharacter: false, // Hide system characters
    };

    // Add search filter
    if (search && search.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        {
          physicalCharacteristics: { contains: searchTerm, mode: 'insensitive' },
        },
        { personality: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Add gender filter (support multiple values)
    if (gender && gender !== 'all') {
      const genderArray = Array.isArray(gender) ? gender : [gender];
      const genderValues = genderArray.map(g => mapGenderToEnum(g)).filter(v => v !== undefined);
      if (genderValues.length === 1) {
        where.gender = genderValues[0];
      } else if (genderValues.length > 1) {
        const hasNull = genderArray.includes('unknown') || genderArray.includes('Unknown');
        const nonNullValues = genderValues.filter(v => v !== null) as CharacterGender[];
        if (hasNull && nonNullValues.length > 0) {
          where.OR = [
            { gender: null },
            { gender: { in: nonNullValues } }
          ];
        } else if (hasNull) {
          where.gender = null;
        } else {
          where.gender = { in: nonNullValues };
        }
      }
    }

    // Add species filter (support multiple values)
    if (species) {
      const speciesArray = Array.isArray(species) ? species : [species];
      const speciesValues = speciesArray.map(s => s === 'unknown' ? null : s).filter(v => v !== undefined);
      if (speciesValues.length === 1) {
        where.speciesId = speciesValues[0];
      } else if (speciesValues.length > 1) {
        const hasNull = speciesArray.includes('unknown');
        const nonNullValues = speciesValues.filter(v => v !== null) as string[];
        if (hasNull && nonNullValues.length > 0) {
          where.AND = [
            ...(where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : []),
            { OR: [
              { speciesId: null },
              { speciesId: { in: nonNullValues } }
            ]}
          ];
        } else if (hasNull) {
          where.speciesId = null;
        } else {
          where.speciesId = { in: nonNullValues };
        }
      }
    }

    // Add tags filter
    if (tags && tags.length > 0) {
      where.tags = {
        some: {
          id: {
            in: tags,
          },
        },
      };
    }

    // Add age ratings filter
    if (ageRatings && ageRatings.length > 0) {
      where.ageRating = {
        in: ageRatings as any[],
      } as any;
    }

    const characters = await prisma.character.findMany({
      where,
      include: characterInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    // Filter out characters with blocked content tags (post-query filtering)
    let filteredCharacters = characters;
    if (blockedTags && blockedTags.length > 0) {
      filteredCharacters = characters.filter(char => {
        // Check if character has any blocked tag
        const charTags = char.contentTags as string[];
        const hasBlockedTag = charTags.some(tag => blockedTags.includes(tag));
        return !hasBlockedTag; // Keep only characters without blocked tags
      });
    }

    logger.debug(
      { userId, filters: options, count: filteredCharacters.length, blocked: characters.length - filteredCharacters.length },
      'Characters fetched for user'
    );

    return enrichCharactersWithAvatar(filteredCharacters);
  } catch (error) {
    logger.error({ error, userId, options }, 'Error getting characters by user');
    throw error;
  }
}

/**
 * Get public characters with pagination
 */
export async function getPublicCharacters(options?: {
  search?: string;
  tags?: string[];
  gender?: string | string[];
  species?: string | string[];
  ageRatings?: string[];
  blockedTags?: string[];
  skip?: number;
  limit?: number;
}): Promise<CharacterListResult> {
  try {
    const { search, tags, gender, species, ageRatings, blockedTags, skip = 0, limit = 20 } = options || {};

    const where: Prisma.CharacterWhereInput = {
      visibility: Visibility.PUBLIC,
      isSystemCharacter: false, // Hide system characters
    };

    // Add search filter
    if (search && search.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        {
          physicalCharacteristics: { contains: searchTerm, mode: 'insensitive' },
        },
        { personality: { contains: searchTerm, mode: 'insensitive' } },
        { history: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Add gender filter (support multiple values)
    if (gender && gender !== 'all') {
      const genderArray = Array.isArray(gender) ? gender : [gender];
      const genderValues = genderArray.map(g => mapGenderToEnum(g)).filter(v => v !== undefined);
      if (genderValues.length === 1) {
        where.gender = genderValues[0];
      } else if (genderValues.length > 1) {
        const hasNull = genderArray.includes('unknown') || genderArray.includes('Unknown');
        const nonNullValues = genderValues.filter(v => v !== null) as CharacterGender[];
        if (hasNull && nonNullValues.length > 0) {
          const existingOR = where.OR;
          where.OR = [
            ...(existingOR ? [typeof existingOR === 'boolean' ? {} : existingOR] as any : []),
            { gender: null },
            { gender: { in: nonNullValues } }
          ];
        } else if (hasNull) {
          where.gender = null;
        } else {
          where.gender = { in: nonNullValues as any };
        }
      }
    }

    // Add species filter (support multiple values)
    if (species) {
      const speciesArray = Array.isArray(species) ? species : [species];
      const speciesValues = speciesArray.map(s => s === 'unknown' ? null : s).filter(v => v !== undefined);
      if (speciesValues.length === 1) {
        where.speciesId = speciesValues[0];
      } else if (speciesValues.length > 1) {
        const hasNull = speciesArray.includes('unknown');
        const nonNullValues = speciesValues.filter(v => v !== null) as string[];
        if (hasNull && nonNullValues.length > 0) {
          where.AND = [
            ...(where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : []),
            { OR: [
              { speciesId: null },
              { speciesId: { in: nonNullValues } }
            ]}
          ];
        } else if (hasNull) {
          where.speciesId = null;
        } else {
          where.speciesId = { in: nonNullValues };
        }
      }
    }

    // Add tags filter
    if (tags && tags.length > 0) {
      where.tags = {
        some: {
          id: {
            in: tags,
          },
        },
      };
    }

    // Add age ratings filter
    if (ageRatings && ageRatings.length > 0) {
      where.ageRating = {
        in: ageRatings as any[],
      } as any;
    }

    // Get total count (for pagination)
    const total = await prisma.character.count({ where });

    const characters = await prisma.character.findMany({
      where,
      include: characterInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    // Filter out characters with blocked content tags (post-query filtering)
    // This is done in memory because Prisma doesn't support complex array intersection queries easily
    let filteredCharacters = characters;
    if (blockedTags && blockedTags.length > 0) {
      filteredCharacters = characters.filter(char => {
        // Check if character has any blocked tag
        const charTags = char.contentTags as string[];
        const hasBlockedTag = charTags.some(tag => blockedTags.includes(tag));
        return !hasBlockedTag; // Keep only characters without blocked tags
      });
    }

    // Calculate hasMore based on skip, limit, and total
    // Note: This is approximate since we filter in memory
    const hasMore = skip + (limit || 20) < total;

    logger.debug(
      { filters: options, count: filteredCharacters.length, total, hasMore, blocked: characters.length - filteredCharacters.length },
      'Public characters fetched'
    );

    return {
      characters: enrichCharactersWithAvatar(filteredCharacters),
      total,
      hasMore,
    };
  } catch (error) {
    logger.error({ error, options }, 'Error getting public characters');
    throw error;
  }
}

/**
 * Get public characters + user's own characters (all visibility levels) with pagination
 * Used for dashboard when user is authenticated
 */
export async function getPublicAndOwnCharacters(userId: string, options?: {
  search?: string;
  tags?: string[];
  gender?: string | string[];
  species?: string | string[];
  ageRatings?: string[];
  blockedTags?: string[];
  skip?: number;
  limit?: number;
}): Promise<CharacterListResult> {
  try {
    const { search, tags, gender, species, ageRatings, blockedTags, skip = 0, limit = 20 } = options || {};

    const where: Prisma.CharacterWhereInput = {
      isSystemCharacter: false,
      OR: [
        { visibility: Visibility.PUBLIC }, // Public characters from anyone
        { userId }, // User's own characters (any visibility)
      ],
    };

    // Add search filter
    if (search && search.trim()) {
      const searchTerm = search.trim();
      const searchConditions: Prisma.CharacterWhereInput[] = [
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        {
          physicalCharacteristics: { contains: searchTerm, mode: 'insensitive' },
        },
        { personality: { contains: searchTerm, mode: 'insensitive' } },
        { history: { contains: searchTerm, mode: 'insensitive' } },
      ];

      // Combine with existing OR condition
      where.AND = [
        { OR: where.OR },
        { OR: searchConditions },
      ];
      delete where.OR;
    }

    // Add gender filter (support multiple values)
    if (gender && gender !== 'all') {
      const genderArray = Array.isArray(gender) ? gender : [gender];
      const genderValues = genderArray.map(g => mapGenderToEnum(g)).filter(v => v !== undefined);
      if (genderValues.length === 1) {
        where.gender = genderValues[0];
      } else if (genderValues.length > 1) {
        const hasNull = genderArray.includes('unknown') || genderArray.includes('Unknown');
        const nonNullValues = genderValues.filter(v => v !== null) as CharacterGender[];
        if (hasNull && nonNullValues.length > 0) {
          where.AND = [
            ...(where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : []),
            { OR: [
              { gender: null },
              { gender: { in: nonNullValues } }
            ]}
          ];
        } else if (hasNull) {
          where.gender = null;
        } else {
          where.gender = { in: nonNullValues };
        }
      }
    }

    // Add species filter (support multiple values)
    if (species) {
      const speciesArray = Array.isArray(species) ? species : [species];
      const speciesValues = speciesArray.map(s => s === 'unknown' ? null : s).filter(v => v !== undefined);
      if (speciesValues.length === 1) {
        where.speciesId = speciesValues[0];
      } else if (speciesValues.length > 1) {
        const hasNull = speciesArray.includes('unknown');
        const nonNullValues = speciesValues.filter(v => v !== null) as string[];
        if (hasNull && nonNullValues.length > 0) {
          where.AND = [
            ...(where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : []),
            { OR: [
              { speciesId: null },
              { speciesId: { in: nonNullValues } }
            ]}
          ];
        } else if (hasNull) {
          where.speciesId = null;
        } else {
          where.speciesId = { in: nonNullValues };
        }
      }
    }

    // Add tags filter
    if (tags && tags.length > 0) {
      where.tags = {
        some: {
          id: {
            in: tags,
          },
        },
      };
    }

    // Add age ratings filter
    if (ageRatings && ageRatings.length > 0) {
      where.ageRating = {
        in: ageRatings as any[],
      } as any;
    }

    // Get total count (for pagination)
    const total = await prisma.character.count({ where });

    const characters = await prisma.character.findMany({
      where,
      include: characterInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    // Filter out characters with blocked content tags (post-query filtering)
    let filteredCharacters = characters;
    if (blockedTags && blockedTags.length > 0) {
      filteredCharacters = characters.filter(char => {
        // Check if character has any blocked tag
        const charTags = char.contentTags as string[];
        const hasBlockedTag = charTags.some(tag => blockedTags.includes(tag));
        return !hasBlockedTag; // Keep only characters without blocked tags
      });
    }

    // Calculate hasMore based on skip, limit, and total
    // Note: This is approximate since we filter in memory
    const hasMore = skip + (limit || 20) < total;

    logger.debug(
      { userId, filters: options, count: filteredCharacters.length, total, hasMore, blocked: characters.length - filteredCharacters.length },
      'Public and own characters fetched'
    );

    return {
      characters: enrichCharactersWithAvatar(filteredCharacters),
      total,
      hasMore,
    };
  } catch (error) {
    logger.error({ error, userId, options }, 'Error getting public and own characters');
    throw error;
  }
}

/**
 * Update character
 */
export async function updateCharacter(
  characterId: string,
  data: UpdateCharacterInput
) {
  try {
    const { attireIds, tagIds, contentTags, species, gender, ...updateData } = data;

    // Check if translatable fields are being updated
    const translatableFields = ['personality', 'history', 'physicalCharacteristics'];
    const hasTranslatableChanges = translatableFields.some((field) => field in updateData);

    // Increment contentVersion if translatable content changed
    const finalUpdateData: any = { ...updateData };

    // Validate gender enum value
    if (gender !== undefined) {
      finalUpdateData.gender = validateGender(gender);
    }

    // Find species ID from species name (async operation)
    if (species !== undefined) {
      const speciesId = await findSpeciesIdByName(species);
      finalUpdateData.speciesId = speciesId;
    }

    if (hasTranslatableChanges) {
      finalUpdateData.contentVersion = { increment: 1 };
    }

    const character = await prisma.character.update({
      where: { id: characterId },
      data: {
        ...finalUpdateData,
        ...(contentTags !== undefined && { contentTags }),
        // Update attires if provided
        ...(attireIds !== undefined && {
          attires: {
            set: attireIds.map(id => ({ id })),
          },
        }),
        // Ensure main attire is in the attires list
        ...(data.mainAttireId &&
        attireIds &&
        !attireIds.includes(data.mainAttireId) && {
          attires: {
            connect: { id: data.mainAttireId },
          },
        }),
        // Replace tags if provided
        ...(tagIds !== undefined && {
          tags: {
            set: tagIds.map(id => ({ id })),
          },
        }),
      },
      include: characterInclude,
    });

    // Invalidate translations if content changed
    if (hasTranslatableChanges) {
      await translationService.invalidateTranslations('Character', characterId);
      logger.info(
        { characterId, newVersion: character.contentVersion },
        'Character content updated - translations invalidated'
      );
    }

    logger.info({ characterId }, 'Character updated successfully');

    return enrichCharacterWithAvatar(character);
  } catch (error) {
    logger.error({ error, characterId, data }, 'Error updating character');
    throw error;
  }
}

/**
 * Delete character
 */
export async function deleteCharacter(characterId: string) {
  try {
    // Check if character is used in conversations (would be handled by foreign key constraints)
    // For now, just delete - cascade rules in Prisma will handle relations

    const character = await prisma.character.delete({
      where: { id: characterId },
    });

    logger.info({ characterId }, 'Character deleted successfully');

    return character;
  } catch (error) {
    logger.error({ error, characterId }, 'Error deleting character');
    throw error;
  }
}

/**
 * Check if user owns character
 */
export async function isCharacterOwner(
  characterId: string,
  userId: string
): Promise<boolean> {
  try {
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { userId: true },
    });

    return character?.userId === userId;
  } catch (error) {
    logger.error({ error, characterId, userId }, 'Error checking ownership');
    return false;
  }
}

/**
 * Check if user can edit a character
 * - User is owner, OR
 * - User is ADMIN and character belongs to CharHub Official
 */
export function canEditCharacter(
  userId: string,
  userRole: UserRole | undefined,
  characterUserId: string
): boolean {
  // User is owner
  if (userId === characterUserId) {
    return true;
  }

  // User is ADMIN and character is official
  if (userRole === 'ADMIN' && characterUserId === CHARHUB_OFFICIAL_ID) {
    return true;
  }

  return false;
}

/**
 * Check if user can access character based on visibility
 * - PRIVATE: Only owner can access
 * - UNLISTED: Anyone with the link can access (authenticated or not)
 * - PUBLIC: Everyone can access
 */
export async function canAccessCharacter(
  characterId: string,
  userId?: string
): Promise<boolean> {
  try {
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: {
        userId: true,
        visibility: true,
      },
    });

    if (!character) {
      return false;
    }

    // Owner can always access
    if (userId && character.userId === userId) {
      return true;
    }

    // PUBLIC: everyone can access
    if (character.visibility === Visibility.PUBLIC) {
      return true;
    }

    // UNLISTED: anyone with the link can access
    if (character.visibility === Visibility.UNLISTED) {
      return true;
    }

    // PRIVATE: only owner can access
    return false;
  } catch (error) {
    logger.error({ error, characterId, userId }, 'Error checking character access');
    return false;
  }
}

/**
 * Get character count by user
 */
export async function getCharacterCountByUser(userId: string): Promise<number> {
  try {
    return await prisma.character.count({
      where: { userId },
    });
  } catch (error) {
    logger.error({ error, userId }, 'Error getting character count');
    throw error;
  }
}

/**
 * Get characters for adding to conversations (excludes already added ones)
 * This is used by the AddParticipantModal
 */
export async function getMyCharactersForConversation(
  userId: string,
  options?: {
    search?: string;
    excludeIds?: string[];
    skip?: number;
    limit?: number;
  }
) {
  try {
    const { search, excludeIds = [], skip = 0, limit = 20 } = options || {};

    const where: Prisma.CharacterWhereInput = {
      userId,
      isSystemCharacter: false, // Hide system characters
      id: excludeIds.length > 0 ? { notIn: excludeIds } : undefined,
    };

    if (search && search.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        { personality: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const characters = await prisma.character.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        personality: true,
        images: {
          where: {
            type: 'AVATAR',
            isActive: true,
          },
          select: {
            type: true,
            url: true,
            isActive: true,
          },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    logger.debug(
      { userId, filters: options, count: characters.length },
      'Characters fetched for conversation'
    );

    return enrichCharactersWithAvatar(characters);
  } catch (error) {
    logger.error({ error, userId, options }, 'Error getting characters for conversation');
    throw error;
  }
}

/**
 * Toggle favorite status for a character
 */
export async function toggleFavoriteCharacter(
  userId: string,
  characterId: string,
  isFavorite: boolean
): Promise<{ success: boolean; isFavorite: boolean }> {
  try {
    // Verify character exists
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { id: true },
    });

    if (!character) {
      throw new Error('Character not found');
    }

    if (isFavorite) {
      // Add to favorites
      await prisma.favoriteCharacter.upsert({
        where: {
          userId_characterId: {
            userId,
            characterId,
          },
        },
        create: {
          userId,
          characterId,
        },
        update: {}, // No-op if already exists
      });

      logger.debug({ userId, characterId }, 'Character added to favorites');
      return { success: true, isFavorite: true };
    } else {
      // Remove from favorites
      await prisma.favoriteCharacter.deleteMany({
        where: {
          userId,
          characterId,
        },
      });

      logger.debug({ userId, characterId }, 'Character removed from favorites');
      return { success: true, isFavorite: false };
    }
  } catch (error) {
    logger.error({ error, userId, characterId, isFavorite }, 'Error toggling favorite');
    throw error;
  }
}

/**
 * Get user's favorite characters
 */
export async function getFavoriteCharacters(
  userId: string,
  options: {
    skip?: number;
    limit?: number;
  } = {}
): Promise<CharacterWithRelations[]> {
  try {
    const { skip = 0, limit = 20 } = options;

    // Get favorite character IDs
    const favorites = await prisma.favoriteCharacter.findMany({
      where: { userId },
      select: { characterId: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    if (favorites.length === 0) {
      return [];
    }

    const characterIds = favorites.map(f => f.characterId);

    // Fetch full character data
    const characters = await prisma.character.findMany({
      where: {
        id: { in: characterIds },
        visibility: { in: [Visibility.PUBLIC, Visibility.UNLISTED] }, // Show public and unlisted favorites
        isSystemCharacter: false, // Hide system characters
      },
      include: characterInclude,
    });

    logger.debug({ userId, count: characters.length }, 'Favorite characters fetched');
    return characters as any;
  } catch (error) {
    logger.error({ error, userId }, 'Error getting favorite characters');
    throw error;
  }
}

/**
 * Check if a character is favorited by user
 */
export async function isCharacterFavorited(
  userId: string,
  characterId: string
): Promise<boolean> {
  try {
    const favorite = await prisma.favoriteCharacter.findUnique({
      where: {
        userId_characterId: {
          userId,
          characterId,
        },
      },
    });

    return !!favorite;
  } catch (error) {
    logger.error({ error, userId, characterId }, 'Error checking favorite status');
    return false;
  }
}

/**
 * Get popular characters sorted by conversation count
 * Characters with more conversations appear first
 */
export async function getPopularCharacters(options?: {
  search?: string;
  tags?: string[];
  gender?: string | string[];
  species?: string | string[];
  ageRatings?: string[];
  blockedTags?: string[];
  skip?: number;
  limit?: number;
}): Promise<CharacterListResult> {
  try {
    const { search, tags, gender, species, ageRatings, blockedTags, skip = 0, limit = 20 } = options || {};

    const where: Prisma.CharacterWhereInput = {
      visibility: Visibility.PUBLIC,
      isSystemCharacter: false, // Hide system characters
    };

    // Add search filter
    if (search && search.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        {
          physicalCharacteristics: { contains: searchTerm, mode: 'insensitive' },
        },
        { personality: { contains: searchTerm, mode: 'insensitive' } },
        { history: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Add gender filter (support multiple values)
    if (gender && gender !== 'all') {
      const genderArray = Array.isArray(gender) ? gender : [gender];
      const genderValues = genderArray.map(g => mapGenderToEnum(g)).filter(v => v !== undefined);
      if (genderValues.length === 1) {
        where.gender = genderValues[0];
      } else if (genderValues.length > 1) {
        const hasNull = genderArray.includes('unknown') || genderArray.includes('Unknown');
        const nonNullValues = genderValues.filter(v => v !== null) as CharacterGender[];
        if (hasNull && nonNullValues.length > 0) {
          const existingOR = where.OR;
          where.OR = [
            ...(existingOR ? [typeof existingOR === 'boolean' ? {} : existingOR] as any : []),
            { gender: null },
            { gender: { in: nonNullValues } }
          ];
        } else if (hasNull) {
          where.gender = null;
        } else {
          where.gender = { in: nonNullValues as any };
        }
      }
    }

    // Add species filter (support multiple values)
    if (species) {
      const speciesArray = Array.isArray(species) ? species : [species];
      const speciesValues = speciesArray.map(s => s === 'unknown' ? null : s).filter(v => v !== undefined);
      if (speciesValues.length === 1) {
        where.speciesId = speciesValues[0];
      } else if (speciesValues.length > 1) {
        const hasNull = speciesArray.includes('unknown');
        const nonNullValues = speciesValues.filter(v => v !== null) as string[];
        if (hasNull && nonNullValues.length > 0) {
          where.AND = [
            ...(where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : []),
            { OR: [
              { speciesId: null },
              { speciesId: { in: nonNullValues } }
            ]}
          ];
        } else if (hasNull) {
          where.speciesId = null;
        } else {
          where.speciesId = { in: nonNullValues };
        }
      }
    }

    // Add tags filter
    if (tags && tags.length > 0) {
      where.tags = {
        some: {
          id: {
            in: tags,
          },
        },
      };
    }

    // Add age ratings filter
    if (ageRatings && ageRatings.length > 0) {
      where.ageRating = {
        in: ageRatings as any[],
      } as any;
    }

    // Get all matching characters with their conversation counts
    const characters = await prisma.character.findMany({
      where,
      include: characterInclude,
      orderBy: { createdAt: 'desc' }, // Default order, will be re-sorted by conversation count
      take: skip + limit + 100, // Fetch extra to account for filtering
    });

    // Filter out characters with blocked content tags
    let filteredCharacters = characters;
    if (blockedTags && blockedTags.length > 0) {
      filteredCharacters = characters.filter(char => {
        const charTags = char.contentTags as string[];
        const hasBlockedTag = charTags.some(tag => blockedTags.includes(tag));
        return !hasBlockedTag;
      });
    }

    // Get conversation counts for all characters
    const characterIds = filteredCharacters.map(c => c.id);

    // Fetch conversation counts in batch
    const conversationCounts = await Promise.all(
      characterIds.map(async (characterId) => {
        const participations = await prisma.conversationParticipant.findMany({
          where: {
            OR: [
              { actingCharacterId: characterId },
              { representingCharacterId: characterId }
            ]
          },
          select: {
            conversationId: true
          },
          distinct: ['conversationId']
        });
        return {
          characterId,
          count: participations.length
        };
      })
    );

    // Create a map for quick lookup
    const countMap = new Map(
      conversationCounts.map(cc => [cc.characterId, cc.count])
    );

    // Sort characters by conversation count (descending)
    const sortedCharacters = filteredCharacters.sort((a, b) => {
      const countA = countMap.get(a.id) || 0;
      const countB = countMap.get(b.id) || 0;
      return countB - countA; // Descending order (most popular first)
    });

    // Apply pagination after sorting
    const paginatedCharacters = sortedCharacters.slice(skip, skip + limit);

    logger.debug(
      { filters: options, count: paginatedCharacters.length, total: sortedCharacters.length },
      'Popular characters fetched'
    );

    return {
      characters: enrichCharactersWithAvatar(paginatedCharacters),
      total: sortedCharacters.length,
      hasMore: skip + limit < sortedCharacters.length,
    };
  } catch (error) {
    logger.error({ error, options }, 'Error getting popular characters');
    throw error;
  }
}

/**
 * Get newest characters sorted by creation date (newest first)
 */
export async function getNewestCharacters(options?: {
  search?: string;
  tags?: string[];
  gender?: string | string[];
  species?: string | string[];
  ageRatings?: string[];
  blockedTags?: string[];
  skip?: number;
  limit?: number;
}): Promise<CharacterListResult> {
  try {
    const { search, tags, gender, species, ageRatings, blockedTags, skip = 0, limit = 20 } = options || {};

    const where: Prisma.CharacterWhereInput = {
      visibility: Visibility.PUBLIC,
      isSystemCharacter: false, // Hide system characters
    };

    // Add search filter
    if (search && search.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        {
          physicalCharacteristics: { contains: searchTerm, mode: 'insensitive' },
        },
        { personality: { contains: searchTerm, mode: 'insensitive' } },
        { history: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Add gender filter (support multiple values)
    if (gender && gender !== 'all') {
      const genderArray = Array.isArray(gender) ? gender : [gender];
      const genderValues = genderArray.map(g => mapGenderToEnum(g)).filter(v => v !== undefined);
      if (genderValues.length === 1) {
        where.gender = genderValues[0];
      } else if (genderValues.length > 1) {
        const hasNull = genderArray.includes('unknown') || genderArray.includes('Unknown');
        const nonNullValues = genderValues.filter(v => v !== null) as CharacterGender[];
        if (hasNull && nonNullValues.length > 0) {
          const existingOR = where.OR;
          where.OR = [
            ...(existingOR ? [typeof existingOR === 'boolean' ? {} : existingOR] as any : []),
            { gender: null },
            { gender: { in: nonNullValues } }
          ];
        } else if (hasNull) {
          where.gender = null;
        } else {
          where.gender = { in: nonNullValues as any };
        }
      }
    }

    // Add species filter (support multiple values)
    if (species) {
      const speciesArray = Array.isArray(species) ? species : [species];
      const speciesValues = speciesArray.map(s => s === 'unknown' ? null : s).filter(v => v !== undefined);
      if (speciesValues.length === 1) {
        where.speciesId = speciesValues[0];
      } else if (speciesValues.length > 1) {
        const hasNull = speciesArray.includes('unknown');
        const nonNullValues = speciesValues.filter(v => v !== null) as string[];
        if (hasNull && nonNullValues.length > 0) {
          where.AND = [
            ...(where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : []),
            { OR: [
              { speciesId: null },
              { speciesId: { in: nonNullValues } }
            ]}
          ];
        } else if (hasNull) {
          where.speciesId = null;
        } else {
          where.speciesId = { in: nonNullValues };
        }
      }
    }

    // Add tags filter
    if (tags && tags.length > 0) {
      where.tags = {
        some: {
          id: {
            in: tags,
          },
        },
      };
    }

    // Add age ratings filter
    if (ageRatings && ageRatings.length > 0) {
      where.ageRating = {
        in: ageRatings as any[],
      } as any;
    }

    // Get total count (for pagination)
    const total = await prisma.character.count({ where });

    const characters = await prisma.character.findMany({
      where,
      include: characterInclude,
      orderBy: { createdAt: 'desc' }, // Newest first
      skip,
      take: limit,
    });

    // Filter out characters with blocked content tags (post-query filtering)
    let filteredCharacters = characters;
    if (blockedTags && blockedTags.length > 0) {
      filteredCharacters = characters.filter(char => {
        const charTags = char.contentTags as string[];
        const hasBlockedTag = charTags.some(tag => blockedTags.includes(tag));
        return !hasBlockedTag;
      });
    }

    // Calculate hasMore based on skip, limit, and total
    const hasMore = skip + (limit || 20) < total;

    logger.debug(
      { filters: options, count: filteredCharacters.length, total, hasMore, blocked: characters.length - filteredCharacters.length },
      'Newest characters fetched'
    );

    return {
      characters: enrichCharactersWithAvatar(filteredCharacters),
      total,
      hasMore,
    };
  } catch (error) {
    logger.error({ error, options }, 'Error getting newest characters');
    throw error;
  }
}

/**
 * Get characters available for user to assume as persona
 * Returns: User's own characters + Public characters
 * Used for persona selection in conversations
 *
 * @param userId - The user's ID
 * @param options - Query options (page, limit, search)
 * @returns Array of characters available for persona selection
 */
export async function getAvailablePersonas(
  userId: string,
  options: { page?: number; limit?: number; search?: string }
): Promise<CharacterWithRelations[]> {
  try {
    const { page = 1, limit = 20, search } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.CharacterWhereInput = {
      isSystemCharacter: false,
      OR: [
        { userId: userId },  // User's own characters
        { visibility: Visibility.PUBLIC }  // Public characters
      ],
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const characters = await prisma.character.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        gender: true,
        style: true,
        visibility: true,
        userId: true,
        images: {
          where: { type: 'AVATAR', isActive: true },
          select: { url: true },
          take: 1,
        },
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
          }
        }
      },
      orderBy: [
        { userId: userId ? 'desc' : 'asc' },  // Own characters first
        { firstName: 'asc' }
      ],
      skip,
      take: limit,
    });

    logger.debug(
      { userId, count: characters.length, search, page },
      'Available personas fetched'
    );

    return characters as unknown as CharacterWithRelations[];
  } catch (error) {
    logger.error({ error, userId, options }, 'Error getting available personas');
    throw error;
  }
}
