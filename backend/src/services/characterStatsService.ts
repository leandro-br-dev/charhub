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
  }
};
