import { prisma } from '../config/database';

export interface StoryStats {
  storyId: string;
  conversationCount: number;
  messageCount: number;
  favoriteCount: number;
  isFavoritedByUser: boolean;
}

export const storyStatsService = {
  /**
   * Get conversation count for a story
   */
  async getConversationCount(storyId: string): Promise<number> {
    const count = await prisma.conversation.count({
      where: {
        settings: {
          path: ['storyId'],
          equals: storyId,
        },
      },
    });
    return count;
  },

  /**
   * Get message count for conversations with this story
   */
  async getMessageCount(storyId: string): Promise<number> {
    // Get all conversation IDs that have this story in their settings
    const conversations = await prisma.conversation.findMany({
      where: {
        settings: {
          path: ['storyId'],
          equals: storyId,
        },
      },
      select: { id: true },
    });

    if (conversations.length === 0) {
      return 0;
    }

    const conversationIds = conversations.map(c => c.id);

    // Count messages in these conversations
    const messageCount = await prisma.message.count({
      where: {
        conversationId: {
          in: conversationIds,
        },
      },
    });

    return messageCount;
  },

  /**
   * Get favorite stats for a story
   */
  async getFavoriteStats(storyId: string, userId?: string): Promise<{
    favoriteCount: number;
    isFavoritedByUser: boolean;
  }> {
    const [favoriteCount, userFavorite] = await Promise.all([
      prisma.storyFavorite.count({
        where: { storyId },
      }),
      userId
        ? prisma.storyFavorite.findUnique({
            where: {
              userId_storyId: {
                userId,
                storyId,
              },
            },
          })
        : Promise.resolve(null),
    ]);

    return {
      favoriteCount,
      isFavoritedByUser: !!userFavorite,
    };
  },

  /**
   * Get complete stats for a story
   */
  async getStoryStats(storyId: string, userId?: string): Promise<StoryStats> {
    const [conversationCount, messageCount, favoriteStats] = await Promise.all([
      this.getConversationCount(storyId),
      this.getMessageCount(storyId),
      this.getFavoriteStats(storyId, userId),
    ]);

    return {
      storyId,
      conversationCount,
      messageCount,
      favoriteCount: favoriteStats.favoriteCount,
      isFavoritedByUser: favoriteStats.isFavoritedByUser,
    };
  },

  /**
   * Toggle favorite status for a story
   */
  async toggleFavorite(storyId: string, userId: string, isFavorite: boolean): Promise<void> {
    if (isFavorite) {
      // Upsert favorite
      await prisma.storyFavorite.upsert({
        where: {
          userId_storyId: {
            userId,
            storyId,
          },
        },
        create: {
          userId,
          storyId,
        },
        update: {},
      });
    } else {
      // Delete favorite
      await prisma.storyFavorite.deleteMany({
        where: {
          userId,
          storyId,
        },
      });
    }
  },
};
