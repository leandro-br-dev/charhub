import { prisma } from '../config/database';
import type { FavoriteCharacter } from '../generated/prisma/index';

export interface FavoriteStats {
  characterId: string;
  favoriteCount: number;
  isFavoritedByUser: boolean;
}

export const favoriteService = {
  /**
   * Add a character to user's favorites
   */
  async addFavorite(userId: string, characterId: string): Promise<FavoriteCharacter> {
    // Check if character exists and is not a system character
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { id: true, isSystemCharacter: true, visibility: true }
    });

    if (!character) {
      throw new Error('Character not found');
    }

    if (character.isSystemCharacter) {
      throw new Error('Cannot favorite system characters');
    }

    // Create favorite (will throw if already exists due to unique constraint)
    try {
      const favorite = await prisma.favoriteCharacter.create({
        data: {
          userId,
          characterId
        }
      });

      return favorite;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new Error('Character is already favorited');
      }
      throw error;
    }
  },

  /**
   * Remove a character from user's favorites
   */
  async removeFavorite(userId: string, characterId: string): Promise<void> {
    const deleted = await prisma.favoriteCharacter.deleteMany({
      where: {
        userId,
        characterId
      }
    });

    if (deleted.count === 0) {
      throw new Error('Favorite not found');
    }
  },

  /**
   * Check if a character is favorited by a user
   */
  async isFavorited(userId: string, characterId: string): Promise<boolean> {
    const favorite = await prisma.favoriteCharacter.findUnique({
      where: {
        userId_characterId: {
          userId,
          characterId
        }
      }
    });

    return favorite !== null;
  },

  /**
   * Get favorite count for a character
   */
  async getFavoriteCount(characterId: string): Promise<number> {
    const count = await prisma.favoriteCharacter.count({
      where: { characterId }
    });

    return count;
  },

  /**
   * Get favorite stats for a character (count + is favorited by user)
   */
  async getFavoriteStats(characterId: string, userId?: string): Promise<FavoriteStats> {
    const count = await this.getFavoriteCount(characterId);
    const isFavoritedByUser = userId ? await this.isFavorited(userId, characterId) : false;

    return {
      characterId,
      favoriteCount: count,
      isFavoritedByUser
    };
  },

  /**
   * Get user's favorite characters with pagination
   */
  async getUserFavorites(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [favorites, total] = await Promise.all([
      prisma.favoriteCharacter.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          characterId: true,
          createdAt: true
        }
      }),
      prisma.favoriteCharacter.count({
        where: { userId }
      })
    ]);

    // Get character details
    const characterIds = favorites.map(f => f.characterId);
    const characters = await prisma.character.findMany({
      where: {
        id: { in: characterIds },
        isSystemCharacter: false
      },
      include: {
        tags: true,
        creator: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true
          }
        }
      }
    });

    // Map back to maintain order
    const favoriteCharacters = favorites.map(fav => {
      const character = characters.find(c => c.id === fav.characterId);
      return {
        ...character,
        favoritedAt: fav.createdAt
      };
    }).filter(Boolean); // Remove nulls if character was deleted

    return {
      characters: favoriteCharacters,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
};
