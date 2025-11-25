import { Prisma } from '../generated/prisma';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { createMessage } from './messageService';
import { decryptMessage } from './encryption';
import { claimFirstChatReward } from '../services/creditService';
import type {
  CreateConversationInput,
  UpdateConversationInput,
  AddParticipantInput,
  ListConversationsQuery,
} from '../validators/conversation.validator';
import { updateParticipantSchema } from '../validators/conversation.validator';

/**
 * Conversation Service
 *
 * Handles conversation CRUD operations and participant management.
 * Based on Phase 2 (Chat System) requirements.
 */

// Include options for conversation queries
const conversationInclude: any = {
  owner: {
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
    },
  },
  conversationOwner: {
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
    },
  },
  members: {
    where: {
      isActive: true,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          preferredLanguage: true,
        },
      },
    },
    orderBy: [
      { role: 'asc' },
      { joinedAt: 'asc' },
    ],
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
          contentTags: true,
          personality: true,
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
          contentTags: true,
          personality: true,
        },
      },
    },
  },
  messages: {
    orderBy: {
      timestamp: 'asc',
    },
    take: 50, // Last 50 messages by default
  },
};

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

    // Award daily first chat reward
    try {
      await claimFirstChatReward(userId);
      logger.info({ userId, conversationId: conversation.id }, 'Checked for and awarded first chat of the day reward.');
    } catch (rewardError) {
      logger.error({ error: rewardError, userId }, 'Failed to process first chat reward.');
    }

    // If settings contains initialMessage, create it as the first message using the system narrator
    if (settings && typeof settings === 'object' && 'initialMessage' in settings && settings.initialMessage) {
      const SYSTEM_NARRATOR_ID = '00000000-0000-0000-0000-000000000001';

      try {
        await createMessage({
          conversationId: conversation.id,
          content: String(settings.initialMessage),
          senderId: SYSTEM_NARRATOR_ID,
          senderType: 'SYSTEM',
        });
        logger.info(
          { conversationId: conversation.id },
          'Initial narration message created for story'
        );
      } catch (error) {
        logger.error(
          { error, conversationId: conversation.id },
          'Failed to create initial narration message'
          );
      }
    }

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
    // First, try to find the conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: conversationInclude,
    });

    if (!conversation) {
      return null;
    }

    // Check if user has access (owner OR active member for multi-user)
    const isOwner = conversation.userId === userId;

    if (isOwner) {
      return conversation;
    }

    // If not owner, check if it's multi-user and user is an active member
    if (conversation.isMultiUser) {
      const membership = await prisma.userConversationMembership.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId
          }
        }
      });

      if (membership?.isActive) {
        return conversation;
      }
    }

    // User doesn't have access
    return null;
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

    // Build where clause - include conversations where user is owner OR active member
    const where: Prisma.ConversationWhereInput = {
      OR: [
        // User is owner
        { userId },
        // User is active member in multi-user conversation
        {
          isMultiUser: true,
          members: {
            some: {
              userId,
              isActive: true
            }
          }
        }
      ]
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

    // Decrypt last message (if present) for each conversation
    const decrypted = conversations.map((conv) => {
      if (!conv.messages || conv.messages.length === 0) return conv;
      const safeMessages = conv.messages.map((msg) => {
        try {
          return { ...msg, content: decryptMessage(msg.content) };
        } catch (error) {
          logger.error({ error, messageId: msg.id, conversationId: conv.id }, 'Failed to decrypt last message for conversation list');
          return { ...msg, content: '[Decryption failed - content unavailable]' } as typeof msg;
        }
      });
      return { ...conv, messages: safeMessages };
    });

    logger.debug(
      { userId, filters, count: conversations.length },
      'Conversations fetched for user'
    );

    return decrypted;
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

/**
 * Update participant configuration (configOverride, representingCharacterId)
 */
export async function updateParticipant(
  conversationId: string,
  participantId: string,
  userId: string,
  data: unknown
) {
  try {
    // Verify ownership
    const isOwner = await isConversationOwner(conversationId, userId);
    if (!isOwner) {
      throw Object.assign(new Error('You do not have permission to update this conversation'), {
        statusCode: 403,
      });
    }

    // Validate input
    const payload = updateParticipantSchema.parse(data);

    // Ensure participant exists in conversation
    const participant = await prisma.conversationParticipant.findFirst({
      where: { id: participantId, conversationId },
      select: { id: true, actingCharacterId: true, actingAssistantId: true, userId: true },
    });

    if (!participant) {
      throw Object.assign(new Error('Participant not found'), { statusCode: 404 });
    }

    const updateData: any = {};
    if (typeof payload.configOverride !== 'undefined') {
      updateData.configOverride = payload.configOverride;
    }
    if (typeof payload.representingCharacterId !== 'undefined') {
      // Only allow persona changes for ASSISTANT or USER participants
      if (participant.actingAssistantId || participant.userId) {
        updateData.representingCharacterId = payload.representingCharacterId;
      }
    }

    await prisma.conversationParticipant.update({
      where: { id: participantId },
      data: updateData,
    });

    logger.info({ conversationId, participantId }, 'Participant updated successfully');
    return { success: true };
  } catch (error) {
    logger.error({ error, conversationId, participantId }, 'Error updating participant');
    throw error;
  }
}

export async function userHasAccessToConversation(conversationId: string, userId: string): Promise<boolean> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, isMultiUser: true, userId: true, ownerUserId: true },
  });

  if (!conversation) return false;

  // Check multi-user membership
  if (conversation.isMultiUser) {
    const membership = await prisma.userConversationMembership.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      select: { isActive: true }
    });
    return membership?.isActive || false;
  }

  // Legacy single-user: check ownership or participant
  const hasAccess = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [
        { userId },
        { participants: { some: { userId } } },
      ],
    },
    select: { id: true },
  });

  return Boolean(hasAccess);
}

/**
 * Get conversation members (multi-user aware)
 */
export async function getConversationMembers(conversationId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { isMultiUser: true, userId: true, createdAt: true }
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  if (conversation.isMultiUser) {
    return await prisma.userConversationMembership.findMany({
      where: {
        conversationId,
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            preferredLanguage: true
          }
        }
      },
      orderBy: [
        { role: 'asc' },
        { joinedAt: 'asc' }
      ]
    });
  }

  // Legacy: return single owner as "member"
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          preferredLanguage: true
        }
      }
    }
  });

  return conv ? [{
    id: 'legacy',
    userId: conv.userId,
    conversationId: conv.id,
    role: 'OWNER' as const,
    canWrite: true,
    canInvite: true,
    canModerate: true,
    isActive: true,
    joinedAt: conversation.createdAt,
    invitedBy: null,
    user: conv.owner
  }] : [];
}

/**
 * Archive conversation (soft delete by marking in settings)
 */

/**
 * Delete conversation and cascade related data
 */
export async function deleteConversation(
  conversationId: string,
  userId: string
) {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      select: { id: true },
    });

    if (!conversation) {
      throw Object.assign(new Error('Conversation not found or access denied'), {
        statusCode: 404,
      });
    }

    await prisma.conversation.delete({
      where: { id: conversationId },
    });

    logger.info({ conversationId, userId }, 'Conversation deleted successfully');
    return { success: true };
  } catch (error) {
    logger.error({ error, conversationId, userId }, 'Error deleting conversation');
    throw error;
  }
}

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

/**
 * List public conversations (visible to everyone)
 */
export async function listPublicConversations(filters: {
  limit?: number;
  offset?: number;
  sortBy?: 'recent' | 'popular';
}) {
  try {
    const { limit = 20, offset = 0, sortBy = 'recent' } = filters;

    const conversations = await prisma.conversation.findMany({
      where: {},
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
        _count: {
          select: { messages: true },
        },
      },
      orderBy:
        sortBy === 'popular'
          ? { messages: { _count: 'desc' } }
          : { lastMessageAt: 'desc' },
      take: limit,
      skip: offset,
    });

    logger.info({ count: conversations.length, sortBy }, 'Public conversations listed');

    return conversations;
  } catch (error) {
    logger.error({ error, filters }, 'Error listing public conversations');
    throw error;
  }
}

/**
 * Resolve conversation background automatically
 */
export async function resolveConversationBackground(
  conversationId: string
): Promise<{ type: string; value:string | null }> {
  try {
    logger.info({ conversationId }, 'Resolving conversation background');

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        settings: true,
        participants: {
          where: {
            // Filter out user participants to count only bots/characters
            userId: null,
          },
          select: {
            actingCharacterId: true,
          },
        },
      },
    });

    if (!conversation) {
      throw Object.assign(new Error('Conversation not found'), {
        statusCode: 404,
      });
    }

    const settings = conversation.settings as any;

    // 1. Check for manual override
    if (settings?.view?.background_type && settings.view.background_type !== 'auto') {
      logger.info({ type: settings.view.background_type }, 'Using manual background override');
      return {
        type: settings.view.background_type,
        value: settings.view.background_value || null,
      };
    }

    // 2. Automatic logic for 1-on-1 character chats
    const characterParticipants = conversation.participants.filter(p => p.actingCharacterId);
    if (characterParticipants.length === 1) {
      const characterId = characterParticipants[0].actingCharacterId;
      if (characterId) {
        const character = await prisma.character.findUnique({
          where: { id: characterId },
          include: {
            images: {
              where: { type: 'COVER' },
              take: 1,
            },
          },
        });

        const coverImageUrl = character?.images?.[0]?.url;
        if (coverImageUrl) {
          logger.info({ conversationId, characterId }, 'Applying automatic character cover background');
          return {
            type: 'auto_character_cover',
            value: coverImageUrl,
          };
        }
      }
    }

    // 3. Default: no background
    logger.info({ conversationId }, 'Defaulting to no background');
    return {
      type: 'none',
      value: null,
    };
  } catch (error) {
    logger.error({ error, conversationId }, 'Error resolving conversation background');
    throw error;
  }
}
