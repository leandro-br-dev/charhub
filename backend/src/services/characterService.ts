import { Prisma, AgeRating, ContentTag, Visibility } from '../generated/prisma';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import type { CreateCharacterInput, UpdateCharacterInput } from '../validators';
import { translationService } from './translation/translationService';

/**
 * Character Service
 *
 * Handles character CRUD operations and business logic.
 * Based on old project with improvements for the new architecture.
 */

// Type definitions
export interface CharacterWithRelations {
  id: string;
  firstName: string;
  lastName: string | null;
  age: number | null;
  gender: string | null;
  species: string | null;
  style: string | null;
  avatar: string | null;
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
  lora?: unknown | null;
  mainAttire?: unknown | null;
  attires?: unknown[];
  tags?: unknown[];
  stickers?: unknown[];
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
 * Create a new character
 */
export async function createCharacter(data: CreateCharacterInput) {
  try {
    const { attireIds, tagIds, contentTags, ...characterData } = data;

    // Create character with relations
    const character = await prisma.character.create({
      data: {
        ...characterData,
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

    return character;
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

    return character;
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
    gender?: string;
    ageRatings?: string[];
    skip?: number;
    limit?: number;
  }
) {
  try {
    const { search, tags, gender, ageRatings, skip = 0, limit = 20 } = options || {};

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

    // Add gender filter
    if (gender && gender !== 'all') {
      where.gender = gender;
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

    logger.debug(
      { userId, filters: options, count: characters.length },
      'Characters fetched for user'
    );

    return characters;
  } catch (error) {
    logger.error({ error, userId, options }, 'Error getting characters by user');
    throw error;
  }
}

/**
 * Get public characters
 */
export async function getPublicCharacters(options?: {
  search?: string;
  tags?: string[];
  gender?: string;
  ageRatings?: string[];
  skip?: number;
  limit?: number;
}) {
  try {
    const { search, tags, gender, ageRatings, skip = 0, limit = 20 } = options || {};

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

    // Add gender filter
    if (gender && gender !== 'all') {
      where.gender = gender;
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

    logger.debug(
      { filters: options, count: characters.length },
      'Public characters fetched'
    );

    return characters;
  } catch (error) {
    logger.error({ error, options }, 'Error getting public characters');
    throw error;
  }
}

/**
 * Get public characters + user's own characters (all visibility levels)
 * Used for dashboard when user is authenticated
 */
export async function getPublicAndOwnCharacters(userId: string, options?: {
  search?: string;
  tags?: string[];
  gender?: string;
  ageRatings?: string[];
  skip?: number;
  limit?: number;
}) {
  try {
    const { search, tags, gender, ageRatings, skip = 0, limit = 20 } = options || {};

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

    // Add gender filter
    if (gender && gender !== 'all') {
      where.gender = gender;
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

    logger.debug(
      { userId, filters: options, count: characters.length },
      'Public and own characters fetched'
    );

    return characters;
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
    const { attireIds, tagIds, contentTags, ...updateData } = data;

    // Check if translatable fields are being updated
    const translatableFields = ['personality', 'history', 'physicalCharacteristics'];
    const hasTranslatableChanges = translatableFields.some((field) => field in updateData);

    // Increment contentVersion if translatable content changed
    const finalUpdateData: any = { ...updateData };
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

    return character;
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
        avatar: true,
        personality: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    logger.debug(
      { userId, filters: options, count: characters.length },
      'Characters fetched for conversation'
    );

    return characters;
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
    return characters as CharacterWithRelations[];
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
