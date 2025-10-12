import type { Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { z } from 'zod';
import { logger } from '../config/logger';
import { verifyJWT } from '../services/googleAuth';
import { findUserById } from '../services/userService';
import * as conversationService from '../services/conversationService';
import * as messageService from '../services/messageService';
import * as assistantService from '../services/assistantService';
import type { AuthenticatedUser } from '../types';
import type { Message } from '../generated/prisma';
import { SenderType } from '../generated/prisma';
import { sendMessageSchema } from '../validators/message.validator';

interface ChatServerOptions {
  corsOrigin: string[] | true;
}

const joinConversationSchema = z.object({
  conversationId: z.string().uuid('conversationId must be a valid UUID'),
});

const typingEventSchema = z.object({
  conversationId: z.string().uuid('conversationId must be a valid UUID'),
  participantId: z.string().uuid().optional(),
});

const realtimeSendMessageSchema = sendMessageSchema.extend({
  assistantParticipantId: z.string().uuid().optional(),
});

function getRoomName(conversationId: string): string {
  return 'conversation:' + conversationId;
}


function serializeMessage(message: Message) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    senderType: message.senderType,
    content: message.content,
    attachments: message.attachments ?? null,
    metadata: message.metadata ?? null,
    timestamp: message.timestamp instanceof Date
      ? message.timestamp.toISOString()
      : new Date(message.timestamp).toISOString(),
  };
}


async function ensureConversationAccess(conversationId: string, userId: string) {
  const hasAccess = await conversationService.userHasAccessToConversation(
    conversationId,
    userId
  );

  if (!hasAccess) {
    const error = new Error('Access to conversation denied');
    Object.assign(error, { statusCode: 403 });
    throw error;
  }
}

async function handleAssistantResponse(
  io: Server,
  conversationId: string,
  participantId: string
) {
  const room = getRoomName(conversationId);

  io.to(room).emit('ai_response_start', {
    conversationId,
    participantId,
  });

  io.to(room).emit('typing_start', {
    conversationId,
    participantId,
    source: 'assistant',
  });

  try {
    const aiMessage = await assistantService.sendAIMessage(
      conversationId,
      participantId
    );

    const serialized = serializeMessage(aiMessage);

    io.to(room).emit('ai_response_chunk', {
      conversationId,
      participantId,
      content: serialized.content,
    });

    io.to(room).emit('message_received', serialized);
  } catch (error) {
    logger.error(
      { error, conversationId, participantId },
      'assistant_response_failed'
    );

    io.to(room).emit('ai_response_error', {
      conversationId,
      participantId,
      error: 'Failed to generate assistant response',
    });
  } finally {
    io.to(room).emit('typing_stop', {
      conversationId,
      participantId,
      source: 'assistant',
    });

    io.to(room).emit('ai_response_complete', {
      conversationId,
      participantId,
    });
  }
}

function resolveCorsOrigins(): string[] | true {
  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
    : [];

  const defaultOrigins = [process.env.FRONTEND_URL || 'http://localhost'];
  const origins = Array.from(new Set([...envOrigins, ...defaultOrigins]))
    .filter(Boolean);

  if (origins.includes('*')) {
    return true;
  }

  return origins;
}

export function setupChatSocket(server: HttpServer, options?: Partial<ChatServerOptions>): Server {
  const corsOrigin = options?.corsOrigin ?? resolveCorsOrigins();

  const io = new Server(server, {
    path: '/api/v1/ws',
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ||
      (socket.handshake.query?.token as string | undefined);

    if (!token) {
      return next(new Error('Authentication token is required'));
    }

    try {
      const payload = verifyJWT(token);
      const user = await findUserById(payload.sub);

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.data.user = user;
      return next();
    } catch (error) {
      logger.warn({ error }, 'socket_authentication_failed');
      return next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as AuthenticatedUser | undefined;

    if (!user) {
      socket.disconnect(true);
      return;
    }

    logger.info({ userId: user.id, socketId: socket.id }, 'socket_connected');

    socket.emit('connection_established', {
      socketId: socket.id,
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        photo: user.photo,
      },
    });

    socket.on('join_conversation', async (rawPayload, callback) => {
      try {
        const payload = joinConversationSchema.parse(rawPayload);

        await ensureConversationAccess(payload.conversationId, user.id);

        const room = getRoomName(payload.conversationId);
        await socket.join(room);

        logger.debug(
          { userId: user.id, conversationId: payload.conversationId },
          'socket_joined_conversation'
        );

        socket.emit('conversation_joined', {
          conversationId: payload.conversationId,
        });

        if (typeof callback === 'function') {
          callback({ success: true });
        }
      } catch (error) {
        logger.warn(
          { error, userId: user.id },
          'join_conversation_failed'
        );

        if (typeof callback === 'function') {
          callback({
            success: false,
            error: error instanceof Error ? error.message : 'Invalid payload',
          });
        }
      }
    });

    socket.on('leave_conversation', async (rawPayload, callback) => {
      try {
        const payload = joinConversationSchema.parse(rawPayload);
        const room = getRoomName(payload.conversationId);
        await socket.leave(room);

        if (typeof callback === 'function') {
          callback({ success: true });
        }
      } catch (error) {
        if (typeof callback === 'function') {
          callback({
            success: false,
            error: error instanceof Error ? error.message : 'Invalid payload',
          });
        }
      }
    });

    socket.on('typing_start', async (rawPayload) => {
      try {
        const payload = typingEventSchema.parse(rawPayload);
        await ensureConversationAccess(payload.conversationId, user.id);

        const room = getRoomName(payload.conversationId);
        socket.to(room).emit('typing_start', {
          conversationId: payload.conversationId,
          userId: user.id,
          participantId: payload.participantId,
          source: 'user',
        });
      } catch (error) {
        logger.debug({ error }, 'typing_start_ignored');
      }
    });

    socket.on('typing_stop', async (rawPayload) => {
      try {
        const payload = typingEventSchema.parse(rawPayload);
        await ensureConversationAccess(payload.conversationId, user.id);

        const room = getRoomName(payload.conversationId);
        socket.to(room).emit('typing_stop', {
          conversationId: payload.conversationId,
          userId: user.id,
          participantId: payload.participantId,
          source: 'user',
        });
      } catch (error) {
        logger.debug({ error }, 'typing_stop_ignored');
      }
    });

    socket.on('send_message', async (rawPayload, callback) => {
      try {
        const payload = realtimeSendMessageSchema.parse(rawPayload);

        await ensureConversationAccess(payload.conversationId, user.id);

        const message = await messageService.createMessage({
          conversationId: payload.conversationId,
          senderId: user.id,
          senderType: SenderType.USER,
          content: payload.content,
          attachments: payload.attachments || undefined,
          metadata: payload.metadata || undefined,
        });

        const serialized = serializeMessage(message);
        const room = getRoomName(payload.conversationId);

        io.to(room).emit('message_received', serialized);

        if (typeof callback === 'function') {
          callback({ success: true, data: serialized });
        }

        if (payload.assistantParticipantId) {
          void handleAssistantResponse(
            io,
            payload.conversationId,
            payload.assistantParticipantId
          );
        }
      } catch (error) {
        logger.error({ error }, 'send_message_failed');

        if (typeof callback === 'function') {
          callback({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to send message',
          });
        }
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info(
        { userId: user.id, socketId: socket.id, reason },
        'socket_disconnected'
      );
    });
  });

  return io;
}
