import { Prisma, Visibility } from '../generated/prisma';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { SenderType } from '../generated/prisma';
import * as messageService from './messageService';
import { agentService } from './agentService';

/**
 * Assistant Service
 *
 * Handles assistant CRUD operations and business logic.
 */

// Include options for assistant queries
const assistantInclude = {
  creator: {
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
    },
  },
  defaultCharacter: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatar: true,
    },
  },
} as const;

/**
 * Create a new assistant
 */
export async function createAssistant(data: {
  name: string;
  description?: string;
  instructions: string;
  defaultCharacterId?: string;
  visibility?: Visibility;
  userId: string;
}) {
  try {
    const assistant = await prisma.assistant.create({
      data: {
        name: data.name,
        description: data.description || null,
        instructions: data.instructions,
        defaultCharacterId: data.defaultCharacterId || null,
        visibility: data.visibility ?? Visibility.PRIVATE,
        userId: data.userId,
      },
      include: assistantInclude,
    });

    logger.info(
      { assistantId: assistant.id, userId: data.userId },
      'Assistant created successfully'
    );

    return assistant;
  } catch (error) {
    logger.error({ error, data }, 'Error creating assistant');
    throw error;
  }
}

/**
 * Get assistant by ID
 */
export async function getAssistantById(assistantId: string) {
  try {
    const assistant = await prisma.assistant.findUnique({
      where: { id: assistantId },
      include: assistantInclude,
    });

    if (!assistant) {
      return null;
    }

    return assistant;
  } catch (error) {
    logger.error({ error, assistantId }, 'Error getting assistant by ID');
    throw error;
  }
}

/**
 * Get assistants by user ID
 */
export async function getAssistantsByUserId(
  userId: string,
  options?: {
    search?: string;
    skip?: number;
    limit?: number;
  }
) {
  try {
    const { search, skip = 0, limit = 20 } = options || {};

    const where: Prisma.AssistantWhereInput = {
      userId,
    };

    if (search && search.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { instructions: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const assistants = await prisma.assistant.findMany({
      where,
      include: assistantInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    logger.debug(
      { userId, filters: options, count: assistants.length },
      'Assistants fetched for user'
    );

    return assistants;
  } catch (error) {
    logger.error({ error, userId, options }, 'Error getting assistants by user');
    throw error;
  }
}

/**
 * Get public assistants
 */
export async function getPublicAssistants(options?: {
  search?: string;
  skip?: number;
  limit?: number;
}) {
  try {
    const { search, skip = 0, limit = 20 } = options || {};

    const where: Prisma.AssistantWhereInput = {
      visibility: Visibility.PUBLIC,
    };

    if (search && search.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const assistants = await prisma.assistant.findMany({
      where,
      include: assistantInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    logger.debug(
      { filters: options, count: assistants.length },
      'Public assistants fetched'
    );

    return assistants;
  } catch (error) {
    logger.error({ error, options }, 'Error getting public assistants');
    throw error;
  }
}

/**
 * Get assistants for adding to conversations (simplified data)
 */
export async function getMyAssistantsForConversation(
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

    const where: Prisma.AssistantWhereInput = {
      userId,
      id: excludeIds.length > 0 ? { notIn: excludeIds } : undefined,
    };

    if (search && search.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const assistants = await prisma.assistant.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        instructions: true,
        defaultCharacterId: true,
        defaultCharacter: {
          select: {
            id: true,
            avatar: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    logger.debug(
      { userId, filters: options, count: assistants.length },
      'Assistants fetched for conversation'
    );

    return assistants;
  } catch (error) {
    logger.error({ error, userId, options }, 'Error getting assistants for conversation');
    throw error;
  }
}

/**
 * Get public assistants for adding to conversations (simplified data)
 */
export async function getPublicAssistantsForConversation(options?: {
  search?: string;
  excludeIds?: string[];
  skip?: number;
  limit?: number;
}) {
  try {
    const { search, excludeIds = [], skip = 0, limit = 20 } = options || {};

    const where: Prisma.AssistantWhereInput = {
      visibility: Visibility.PUBLIC,
      id: excludeIds.length > 0 ? { notIn: excludeIds } : undefined,
    };

    if (search && search.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const assistants = await prisma.assistant.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        instructions: true,
        defaultCharacterId: true,
        defaultCharacter: {
          select: {
            id: true,
            avatar: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    logger.debug(
      { filters: options, count: assistants.length },
      'Public assistants fetched for conversation'
    );

    return assistants;
  } catch (error) {
    logger.error({ error, options }, 'Error getting public assistants for conversation');
    throw error;
  }
}

/**
 * Update assistant
 */
export async function updateAssistant(
  assistantId: string,
  data: {
    name?: string;
    description?: string | null;
    instructions?: string;
    defaultCharacterId?: string | null;
    visibility?: Visibility;
  }
) {
  try {
    const assistant = await prisma.assistant.update({
      where: { id: assistantId },
      data,
      include: assistantInclude,
    });

    logger.info({ assistantId }, 'Assistant updated successfully');

    return assistant;
  } catch (error) {
    logger.error({ error, assistantId, data }, 'Error updating assistant');
    throw error;
  }
}

/**
 * Delete assistant
 */
export async function deleteAssistant(assistantId: string) {
  try {
    const assistant = await prisma.assistant.delete({
      where: { id: assistantId },
    });

    logger.info({ assistantId }, 'Assistant deleted successfully');

    return assistant;
  } catch (error) {
    logger.error({ error, assistantId }, 'Error deleting assistant');
    throw error;
  }
}

/**
 * Check if user owns assistant
 */
export async function isAssistantOwner(
  assistantId: string,
  userId: string
): Promise<boolean> {
  try {
    const assistant = await prisma.assistant.findUnique({
      where: { id: assistantId },
      select: { userId: true },
    });

    return assistant?.userId === userId;
  } catch (error) {
    logger.error({ error, assistantId, userId }, 'Error checking assistant ownership');
    return false;
  }
}

/**
 * Send AI message (supports both characters and assistants)
 */
export async function sendAIMessage(
  conversationId: string,
  participantId: string,
  preferredLanguage?: string,
  estimatedCreditCost?: number,
  isNSFW?: boolean
): Promise<any> {
  try {
    const agent = agentService.getResponseGenerationAgent();

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: true,
            actingCharacter: true,
            actingAssistant: {
              include: {
                defaultCharacter: true,
              },
            },
            representingCharacter: true,
          },
        },
        messages: {
          orderBy: {
            timestamp: 'asc',
          },
        },
        owner: true,
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const lastMessage = conversation.messages[conversation.messages.length - 1];

    // Build map of all users in the conversation
    const allUsers = new Map();

    // 1. Add owner and any user from participants
    for (const p of conversation.participants) {
      if (p.user) {
        allUsers.set(p.user.id, p.user);
      }
    }

    // 2. In multi-user conversations, add all invited members
    if (conversation.isMultiUser) {
      const members = await prisma.userConversationMembership.findMany({
        where: {
          conversationId: conversation.id,
          isActive: true
        },
        include: {
          user: true
        }
      });

      for (const member of members) {
        if (member.user) {
          allUsers.set(member.user.id, member.user);
        }
      }
    }

    logger.info({
      conversationId: conversation.id,
      isMultiUser: conversation.isMultiUser,
      allUsersSize: allUsers.size,
      allUsersIds: Array.from(allUsers.keys()),
      allUsersNames: Array.from(allUsers.values()).map(u => u.displayName || u.username),
      lastMessageSenderId: lastMessage.senderId
    }, 'All users before calling agent.execute');

    // Generate response for the specific participant
    const content = await agent.execute(
      conversation,
      conversation.owner,
      lastMessage,
      participantId,  // Pass the participant ID to use the correct character
      preferredLanguage,  // Pass the preferred language from x-user-language header
      allUsers  // Pass all users for multi-user context
    );

    // Find the participant and determine its type
    const participant = await prisma.conversationParticipant.findUnique({
      where: { id: participantId },
      select: {
        actingAssistantId: true,
        actingCharacterId: true,
      },
    });

    if (!participant) {
      throw Object.assign(new Error('Participant not found'), {
        statusCode: 404,
      });
    }

    // Determine sender ID and type based on participant type
    let senderId: string;
    let senderType: SenderType;

    if (participant.actingAssistantId) {
      senderId = participant.actingAssistantId;
      senderType = SenderType.ASSISTANT;
    } else if (participant.actingCharacterId) {
      senderId = participant.actingCharacterId;
      senderType = SenderType.CHARACTER;
    } else {
      throw Object.assign(new Error('Participant must be a character or assistant'), {
        statusCode: 400,
      });
    }

    // Add credit cost to metadata if provided
    const metadata = estimatedCreditCost
      ? { creditCost: estimatedCreditCost, isNSFW: isNSFW || false }
      : undefined;

    const message = await messageService.createMessage({
      conversationId,
      senderId,
      senderType,
      content,
      metadata,
    });

    logger.info(
      { conversationId, messageId: message.id, senderType, participantId },
      'AI message sent successfully'
    );

    return message;
  } catch (error) {
    logger.error(
      { error, conversationId, participantId },
      'Error sending AI message'
    );
    throw error;
  }
}
