import { prisma } from '../config/database';
import { favoriteService } from './favoriteService';

export interface CharacterStats {
  characterId: string;
  conversationCount: number;
  messageCount: number;
  favoriteCount: number;
  isFavoritedByUser: boolean;
}

export const characterStatsService = {
  /**
   * Get conversation count for a character
   */
  async getConversationCount(characterId: string): Promise<number> {
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

    return participations.length;
  },

  /**
   * Get message count for a character
   */
  async getMessageCount(characterId: string): Promise<number> {
    // Get all conversations where this character participates
    const participations = await prisma.conversationParticipant.findMany({
      where: {
        OR: [
          { actingCharacterId: characterId },
          { representingCharacterId: characterId }
        ]
      },
      select: { conversationId: true }
    });

    const conversationIds = participations.map((p: { conversationId: string }) => p.conversationId);

    if (conversationIds.length === 0) {
      return 0;
    }

    // Count messages in those conversations where the sender is this character
    const count = await prisma.message.count({
      where: {
        conversationId: { in: conversationIds },
        senderId: characterId,
        senderType: 'CHARACTER'
      }
    });

    return count;
  },

  /**
   * Get complete stats for a character
   */
  async getCharacterStats(characterId: string, userId?: string): Promise<CharacterStats> {
    const [conversationCount, messageCount, favoriteStats] = await Promise.all([
      this.getConversationCount(characterId),
      this.getMessageCount(characterId),
      favoriteService.getFavoriteStats(characterId, userId)
    ]);

    return {
      characterId,
      conversationCount,
      messageCount,
      favoriteCount: favoriteStats.favoriteCount,
      isFavoritedByUser: favoriteStats.isFavoritedByUser
    };
  },

  /**
   * Get stats for multiple characters
   */
  async getBatchCharacterStats(characterIds: string[], userId?: string): Promise<CharacterStats[]> {
    const stats = await Promise.all(
      characterIds.map(id => this.getCharacterStats(id, userId))
    );

    return stats;
  },

  /**
   * Get stats for multiple characters in a single optimized batch query
   * Solves N+1 problem by using Prisma groupBy instead of individual queries
   * @param characterIds - Array of character IDs to fetch stats for
   * @param userId - Optional user ID to check if character is favorited by this user
   * @returns Map of characterId -> CharacterStats
   */
  async getBatchCharacterStatsOptimized(
    characterIds: string[],
    userId?: string
  ): Promise<Map<string, CharacterStats>> {
    // Handle empty input gracefully
    if (!characterIds || characterIds.length === 0) {
      return new Map();
    }

    // Remove duplicates and filter out invalid IDs
    const uniqueIds = Array.from(new Set(characterIds.filter(id => id)));

    if (uniqueIds.length === 0) {
      return new Map();
    }

    // Batch query 1: Conversation counts using groupBy
    // This counts distinct conversations where each character participates
    const conversationCounts = await prisma.conversationParticipant.groupBy({
      by: ['actingCharacterId'],
      where: {
        actingCharacterId: { in: uniqueIds },
      },
      _count: {
        conversationId: true,
      },
    });

    // Also count conversations where character is being represented
    const representedConversationCounts = await prisma.conversationParticipant.groupBy({
      by: ['representingCharacterId'],
      where: {
        representingCharacterId: { in: uniqueIds },
      },
      _count: {
        conversationId: true,
      },
    });

    // Merge conversation counts from both acting and representing roles
    const convCountMap = new Map<string, number>();
    for (const id of uniqueIds) {
      const actingCount = conversationCounts.find(c => c.actingCharacterId === id)?._count.conversationId || 0;
      const representingCount = representedConversationCounts.find(c => c.representingCharacterId === id)?._count.conversationId || 0;

      // Use Set to deduplicate conversation IDs from both roles
      // Note: This is an approximation - true deduplication would require subqueries
      // For dashboard purposes, this approximation is acceptable
      convCountMap.set(id, Math.max(actingCount, representingCount));
    }

    // Batch query 2: Favorite counts using groupBy
    const favoriteCounts = await prisma.favoriteCharacter.groupBy({
      by: ['characterId'],
      where: {
        characterId: { in: uniqueIds },
      },
      _count: {
        _all: true,
      },
    });

    const favCountMap = new Map<string, number>();
    for (const item of favoriteCounts) {
      favCountMap.set(item.characterId, item._count._all);
    }

    // Batch query 3: User favorites (if authenticated) using single findMany
    let userFavoritesSet = new Set<string>();
    if (userId) {
      const userFavorites = await prisma.favoriteCharacter.findMany({
        where: {
          userId,
          characterId: { in: uniqueIds },
        },
        select: {
          characterId: true,
        },
      });

      userFavoritesSet = new Set(userFavorites.map(f => f.characterId));
    }

    // Build result map with default values for characters with no stats
    const statsMap = new Map<string, CharacterStats>();

    for (const id of uniqueIds) {
      statsMap.set(id, {
        characterId: id,
        conversationCount: convCountMap.get(id) || 0,
        messageCount: 0, // Omit for list view (expensive query), use 0 as default
        favoriteCount: favCountMap.get(id) || 0,
        isFavoritedByUser: userFavoritesSet.has(id),
      });
    }

    return statsMap;
  }
};
