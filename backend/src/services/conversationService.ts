import { Prisma } from '../generated/prisma';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import type {
  CreateConversationInput,
  UpdateConversationInput,
  AddParticipantInput,
  ListConversationsQuery,
} from '../validators/conversation.validator';

/**
 * Conversation Service
 *
 * Handles conversation CRUD operations and participant management.
 * Based on Phase 2 (Chat System) requirements.
 */

// Include options for conversation queries
const conversationInclude = {
  owner: {
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
    },
  },
  participants: {
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      actingCharacter: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
          gender: true,
        },
      },
      actingAssistant: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
      representingCharacter: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
          gender: true,
        },
      },
    },
  },
  messages: {
    orderBy: {
      timestamp: 'asc' as const,
    },
    take: 50, // Last 50 messages by default
  },
} as const;

/**
 * Create a new conversation with participants
 */
export async function createConversation(
  userId: string,
  data: CreateConversationInput
) {
  try {
    const { participantIds, settings, projectId, ...conversationData } = data;

    // Create conversation with initial participants
    // participantIds can be: characterIds, assistantIds, or both
    // The frontend is responsible for specifying what type each participant is
    const conversation = await prisma.conversation.create({
      data: {
        ...conversationData,
        userId,
        settings: settings === null ? Prisma.JsonNull : (settings as Prisma.InputJsonValue | undefined),
        projectId: projectId === null ? null : projectId,
        participants: {
          create: participantIds.map((characterId) => ({
            actingCharacterId: characterId,
          })),
        },
      },
      include: conversationInclude,
    });

    logger.info(
      { conversationId: conversation.id, userId },
      'Conversation created successfully'
    );

    return conversation;
  } catch (error) {
    logger.error({ error, userId, data }, 'Error creating conversation');
    throw error;
  }
}

/**
 * Get conversation by ID with messages
 */
export async function getConversationById(
  conversationId: string,
  userId: string
) {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId, // Ensure user owns the conversation
      },
      include: conversationInclude,
    });

    if (!conversation) {
      return null;
    }

    return conversation;
  } catch (error) {
    logger.error(
      { error, conversationId, userId },
      'Error getting conversation by ID'
    );
    throw error;
  }
}

/**
 * List conversations for a user
 */
export async function listConversations(
  userId: string,
  filters: ListConversationsQuery
) {
  try {
    const { search, projectId, skip, limit, sortBy, sortOrder } = filters;

    // Build where clause
    const where: Prisma.ConversationWhereInput = {
      userId,
    };

    // Add search filter (search in title)
    if (search && search.trim()) {
      where.title = {
        contains: search.trim(),
        mode: 'insensitive',
      };
    }

    // Add project filter
    if (projectId) {
      where.projectId = projectId;
    }

    const conversations = await prisma.conversation.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        participants: {
          include: {
            actingCharacter: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
            actingAssistant: {
              select: {
                id: true,
                name: true,
              },
            },
            representingCharacter: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            timestamp: 'desc',
          },
          take: 1, // Only last message for list view
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
    });

    logger.debug(
      { userId, filters, count: conversations.length },
      'Conversations fetched for user'
    );

    return conversations;
  } catch (error) {
    logger.error({ error, userId, filters }, 'Error listing conversations');
    throw error;
  }
}

/**
 * Update conversation
 */
export async function updateConversation(
  conversationId: string,
  userId: string,
  data: UpdateConversationInput
) {
  try {
    // Handle JSON null values properly for Prisma
    const updateData: Prisma.ConversationUpdateInput = {
      title: data.title,
      isTitleUserEdited: data.isTitleUserEdited,
      settings: data.settings === null ? Prisma.JsonNull : (data.settings as Prisma.InputJsonValue | undefined),
    };

    const conversation = await prisma.conversation.update({
      where: {
        id: conversationId,
        userId, // Ensure user owns the conversation
      },
      data: updateData,
      include: conversationInclude,
    });

    logger.info({ conversationId }, 'Conversation updated successfully');

    return conversation;
  } catch (error) {
    logger.error(
      { error, conversationId, data },
      'Error updating conversation'
    );
    throw error;
  }
}

/**
 * Add participant to conversation
 */
export async function addParticipant(
  conversationId: string,
  userId: string,
  participantData: AddParticipantInput
) {
  try {
    // Verify user owns the conversation
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw Object.assign(new Error('Conversation not found'), {
        statusCode: 404,
      });
    }

    // Create participant
    const participant = await prisma.conversationParticipant.create({
      data: {
        conversationId,
        ...participantData,
      },
      include: {
        actingCharacter: true,
        actingAssistant: true,
        representingCharacter: true,
      },
    });

    logger.info(
      { conversationId, participantId: participant.id },
      'Participant added to conversation'
    );

    return participant;
  } catch (error) {
    logger.error(
      { error, conversationId, participantData },
      'Error adding participant'
    );
    throw error;
  }
}

/**
 * Remove participant from conversation
 */
export async function removeParticipant(
  conversationId: string,
  userId: string,
  participantId: string
) {
  try {
    // Verify user owns the conversation
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw Object.assign(new Error('Conversation not found'), {
        statusCode: 404,
      });
    }

    // Delete participant
    await prisma.conversationParticipant.delete({
      where: {
        id: participantId,
        conversationId,
      },
    });

    logger.info(
      { conversationId, participantId },
      'Participant removed from conversation'
    );

    return { success: true };
  } catch (error) {
    logger.error(
      { error, conversationId, participantId },
      'Error removing participant'
    );
    throw error;
  }
}

export async function userHasAccessToConversation(conversationId: string, userId: string): Promise<boolean> {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [
        { userId },
        { participants: { some: { userId } } },
      ],
    },
    select: { id: true },
  });

  return Boolean(conversation);
}

/**
 * Archive conversation (soft delete by marking in settings)
 */
export async function archiveConversation(
  conversationId: string,
  userId: string
) {
  try {
    const conversation = await prisma.conversation.update({
      where: {
        id: conversationId,
        userId,
      },
      data: {
        settings: {
          archived: true,
          archivedAt: new Date().toISOString(),
        },
      },
    });

    logger.info({ conversationId }, 'Conversation archived successfully');

    return conversation;
  } catch (error) {
    logger.error({ error, conversationId }, 'Error archiving conversation');
    throw error;
  }
}

/**
 * Check if user owns conversation
 */
export async function isConversationOwner(
  conversationId: string,
  userId: string
): Promise<boolean> {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId: true },
    });

    return conversation?.userId === userId;
  } catch (error) {
    logger.error(
      { error, conversationId, userId },
      'Error checking conversation ownership'
    );
    return false;
  }
}

/**
 * Get conversation count by user
 */
export async function getConversationCountByUser(
  userId: string
): Promise<number> {
  try {
    return await prisma.conversation.count({
      where: { userId },
    });
  } catch (error) {
    logger.error({ error, userId }, 'Error getting conversation count');
    throw error;
  }
}
