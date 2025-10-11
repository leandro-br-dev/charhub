import { Prisma, SenderType } from '../generated/prisma';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import type {
  CreateMessageInput,
  ListMessagesQuery,
} from '../validators/message.validator';

/**
 * Message Service
 *
 * Handles message CRUD operations and conversation history.
 * Based on Phase 2 (Chat System) requirements.
 */

/**
 * Create a new message in a conversation
 */
export async function createMessage(data: CreateMessageInput) {
  try {
    const { attachments, metadata, ...messageData } = data;

    // Create message
    const message = await prisma.message.create({
      data: {
        ...messageData,
        attachments: attachments ? JSON.stringify(attachments) : null,
        metadata: metadata || null,
      },
    });

    // Update conversation's lastMessageAt timestamp
    await prisma.conversation.update({
      where: { id: data.conversationId },
      data: { lastMessageAt: message.timestamp },
    });

    logger.info(
      { messageId: message.id, conversationId: data.conversationId },
      'Message created successfully'
    );

    return message;
  } catch (error) {
    logger.error({ error, data }, 'Error creating message');
    throw error;
  }
}

/**
 * List messages in a conversation with pagination
 */
export async function listMessages(
  conversationId: string,
  userId: string,
  query: ListMessagesQuery
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

    const { skip, limit, before, after } = query;

    // Build where clause for time-based pagination
    const where: Prisma.MessageWhereInput = {
      conversationId,
    };

    if (before) {
      where.timestamp = { lt: new Date(before) };
    }

    if (after) {
      where.timestamp = { gt: new Date(after) };
    }

    const messages = await prisma.message.findMany({
      where,
      orderBy: {
        timestamp: 'asc',
      },
      skip,
      take: limit,
    });

    logger.debug(
      { conversationId, count: messages.length },
      'Messages fetched for conversation'
    );

    return messages;
  } catch (error) {
    logger.error(
      { error, conversationId, query },
      'Error listing messages'
    );
    throw error;
  }
}

/**
 * Get message by ID
 */
export async function getMessageById(
  messageId: string,
  userId: string
) {
  try {
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        conversation: {
          userId, // Ensure user owns the conversation
        },
      },
      include: {
        conversation: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!message) {
      return null;
    }

    return message;
  } catch (error) {
    logger.error(
      { error, messageId, userId },
      'Error getting message by ID'
    );
    throw error;
  }
}

/**
 * Delete message (soft delete - could be implemented as status field in future)
 * For now, we'll hard delete
 */
export async function deleteMessage(
  messageId: string,
  userId: string
) {
  try {
    // Verify user owns the conversation containing this message
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        conversation: {
          userId,
        },
      },
    });

    if (!message) {
      throw Object.assign(new Error('Message not found'), { statusCode: 404 });
    }

    // Delete message
    await prisma.message.delete({
      where: { id: messageId },
    });

    logger.info({ messageId }, 'Message deleted successfully');

    return { success: true };
  } catch (error) {
    logger.error({ error, messageId }, 'Error deleting message');
    throw error;
  }
}

/**
 * Get message count for a conversation
 */
export async function getMessageCount(conversationId: string): Promise<number> {
  try {
    return await prisma.message.count({
      where: { conversationId },
    });
  } catch (error) {
    logger.error({ error, conversationId }, 'Error getting message count');
    throw error;
  }
}

/**
 * Get last N messages from a conversation
 */
export async function getLastMessages(
  conversationId: string,
  limit: number = 50
) {
  try {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    });

    // Return in chronological order (oldest first)
    return messages.reverse();
  } catch (error) {
    logger.error(
      { error, conversationId, limit },
      'Error getting last messages'
    );
    throw error;
  }
}
