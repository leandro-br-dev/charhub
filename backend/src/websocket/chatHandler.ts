import type { Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { z } from 'zod';
import { logger } from '../config/logger';
import { verifyJWT } from '../services/googleAuth';
import { findUserById } from '../services/userService';
import * as conversationService from '../services/conversationService';
import * as messageService from '../services/messageService';
import { agentService } from '../services/agentService';
import { presenceService } from '../services/presenceService';
import { queueAIResponse, setupWebSocketBroadcast } from '../queues/responseQueue';
import { isQueuesEnabled } from '../config/features';
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

const joinCharacterGenerationSchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required'),
});

const joinStoryGenerationSchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required'),
});

// Removed assistantParticipantId - we'll determine which bots respond automatically

function getRoomName(conversationId: string): string {
  return 'conversation:' + conversationId;
}

function getCharacterGenerationRoomName(userId: string, sessionId: string): string {
  return `character-generation:${userId}:${sessionId}`;
}

function getStoryGenerationRoomName(userId: string, sessionId: string): string {
  return `story-generation:${userId}:${sessionId}`;
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

/**
 * Helper function to emit typing indicators for bot participants
 */
function emitTypingForBots(
  io: Server,
  conversationId: string,
  participantIds: string[],
  isTyping: boolean
) {
  const room = getRoomName(conversationId);
  const event = isTyping ? 'typing_start' : 'typing_stop';

  participantIds.forEach(participantId => {
    io.to(room).emit(event, {
      conversationId,
      participantId,
      source: 'bot',
    });
  });
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

  // Configure WebSocket broadcasting for the response worker
  // This allows the worker to emit messages when AI responses are completed
  setupWebSocketBroadcast(io);

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

      // Extract user's preferred language from headers (if provided by frontend)
      const userLanguage = socket.handshake.headers['x-user-language'] as string | undefined;
      socket.data.preferredLanguage = userLanguage;

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

    socket.on('join_character_generation', async (rawPayload, callback) => {
      try {
        const payload = joinCharacterGenerationSchema.parse(rawPayload);
        const room = getCharacterGenerationRoomName(user.id, payload.sessionId);
        await socket.join(room);

        logger.debug(
          { userId: user.id, sessionId: payload.sessionId, room },
          'socket_joined_character_generation'
        );

        socket.emit('character_generation_joined', {
          sessionId: payload.sessionId,
        });

        if (typeof callback === 'function') {
          callback({ success: true, sessionId: payload.sessionId });
        }
      } catch (error) {
        logger.warn(
          { error, userId: user.id },
          'join_character_generation_failed'
        );

        if (typeof callback === 'function') {
          callback({
            success: false,
            error: error instanceof Error ? error.message : 'Invalid payload',
          });
        }
      }
    });

    socket.on('join_story_generation', async (rawPayload, callback) => {
      try {
        const payload = joinStoryGenerationSchema.parse(rawPayload);
        const room = getStoryGenerationRoomName(user.id, payload.sessionId);
        await socket.join(room);

        logger.debug(
          { userId: user.id, sessionId: payload.sessionId, room },
          'socket_joined_story_generation'
        );

        socket.emit('story_generation_joined', {
          sessionId: payload.sessionId,
        });

        if (typeof callback === 'function') {
          callback({ success: true, sessionId: payload.sessionId });
        }
      } catch (error) {
        logger.warn(
          { error, userId: user.id },
          'join_story_generation_failed'
        );

        if (typeof callback === 'function') {
          callback({
            success: false,
            error: error instanceof Error ? error.message : 'Invalid payload',
          });
        }
      }
    });

    socket.on('join_conversation', async (rawPayload, callback) => {
      try {
        const payload = joinConversationSchema.parse(rawPayload);

        await ensureConversationAccess(payload.conversationId, user.id);

        const room = getRoomName(payload.conversationId);
        await socket.join(room);

        // Register user presence
        const onlineUsers = presenceService.userJoined(
          payload.conversationId,
          user.id,
          socket.id
        );

        logger.debug(
          { userId: user.id, conversationId: payload.conversationId, onlineUsers },
          'socket_joined_conversation'
        );

        socket.emit('conversation_joined', {
          conversationId: payload.conversationId,
          onlineUsers,
        });

        // Broadcast to other users that this user joined
        socket.to(room).emit('user_joined', {
          conversationId: payload.conversationId,
          userId: user.id,
          user: {
            id: user.id,
            displayName: user.displayName,
            photo: user.photo,
          },
        });

        // Broadcast updated presence to all members
        presenceService.broadcastPresence(io, payload.conversationId);

        if (typeof callback === 'function') {
          callback({ success: true, onlineUsers });
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

        // Remove user presence
        const onlineUsers = presenceService.userLeft(
          payload.conversationId,
          user.id,
          socket.id
        );

        // Leave the socket.io room
        await socket.leave(room);

        // Broadcast to other users that this user left
        socket.to(room).emit('user_left', {
          conversationId: payload.conversationId,
          userId: user.id,
        });

        // Broadcast updated presence to remaining members
        presenceService.broadcastPresence(io, payload.conversationId);

        logger.debug(
          { userId: user.id, conversationId: payload.conversationId, onlineUsers },
          'socket_left_conversation'
        );

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

        // Use presenceService to emit typing
        presenceService.emitTyping(
          io,
          payload.conversationId,
          user.id,
          true
        );

        logger.debug({
          conversationId: payload.conversationId,
          userId: user.id
        }, 'user_typing_start');
      } catch (error) {
        logger.debug({ error }, 'typing_start_ignored');
      }
    });

    socket.on('typing_stop', async (rawPayload) => {
      try {
        const payload = typingEventSchema.parse(rawPayload);
        await ensureConversationAccess(payload.conversationId, user.id);

        // Use presenceService to emit typing stop
        presenceService.emitTyping(
          io,
          payload.conversationId,
          user.id,
          false
        );

        logger.debug({
          conversationId: payload.conversationId,
          userId: user.id
        }, 'user_typing_stop');
      } catch (error) {
        logger.debug({ error }, 'typing_stop_ignored');
      }
    });

    socket.on('send_message', async (rawPayload, callback) => {
      try {
        const payload = sendMessageSchema.parse(rawPayload);

        await ensureConversationAccess(payload.conversationId, user.id);

        // Step 1: Save user message
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

        // Step 2: Broadcast user message to room
        io.to(room).emit('message_received', serialized);

        // Step 3: Fetch conversation with full context for ConversationManagerAgent
        const conversation = await conversationService.getConversationById(
          payload.conversationId,
          user.id
        );

        if (!conversation) {
          throw new Error('Conversation not found');
        }

        // Step 4: Use ConversationManagerAgent to determine which bots should respond
        const conversationManager = agentService.getConversationManagerAgent();
        const managerResult = await conversationManager.execute(
          conversation as any,
          message
        );

        const respondingParticipantIds = managerResult.participantIds;
        const isNSFW = managerResult.isNSFW;

        logger.info(
          {
            conversationId: payload.conversationId,
            respondingBots: respondingParticipantIds.length,
            isNSFW,
          },
          'Bots selected to respond and content classified'
        );

        // Step 5: Estimate credit cost and verify user has enough balance
        const { getCurrentBalance, hasEnoughCredits } = await import('../services/creditService');
        const { prisma } = await import('../config/database');

        const serviceType = isNSFW ? 'LLM_CHAT_NSFW' : 'LLM_CHAT_SAFE';

        // Estimate ~1000 tokens per AI response (500 input + 500 output)
        const estimatedTokensPerBot = 1000;
        const totalEstimatedTokens = estimatedTokensPerBot * respondingParticipantIds.length;

        // Get service cost configuration
        const serviceCost = await prisma.serviceCreditCost.findUnique({
          where: { serviceIdentifier: serviceType },
        });

        const creditsPerThousandTokens = serviceCost?.creditsPerUnit || (isNSFW ? 3 : 2);
        const estimatedCreditCost = Math.ceil((totalEstimatedTokens / 1000) * creditsPerThousandTokens);

        // Check if user (who sent the message) has enough credits
        // Rule: whoever triggers the AI response pays for it
        const balance = await getCurrentBalance(user.id);
        const hasCredits = await hasEnoughCredits(user.id, estimatedCreditCost);

        if (!hasCredits) {
          // Insufficient credits - return error to user
          if (typeof callback === 'function') {
            callback({
              success: false,
              error: 'insufficient_credits',
              message: `Créditos insuficientes. Necessário: ${estimatedCreditCost}, Atual: ${Math.floor(balance)}`,
              required: estimatedCreditCost,
              current: Math.floor(balance),
            });
          }

          logger.warn(
            {
              userId: user.id,
              conversationId: payload.conversationId,
              required: estimatedCreditCost,
              current: balance,
            },
            'Insufficient credits for chat message'
          );
          return; // Stop processing
        }

        logger.info(
          {
            userId: user.id,
            balance,
            estimatedCost: estimatedCreditCost,
            isNSFW,
            respondingBots: respondingParticipantIds.length,
          },
          'Credit check passed for chat message'
        );

        // Step 6: Immediately respond with list of bots that will respond
        if (typeof callback === 'function') {
          callback({
            success: true,
            data: serialized,
            respondingBots: respondingParticipantIds,
            estimatedCreditCost, // Send cost estimate to frontend
          });
        }

        // Step 6: Emit typing indicators for all responding bots
        emitTypingForBots(io, payload.conversationId, respondingParticipantIds, true);

        // Step 7: Check if memory compression is needed (async, non-blocking)
        if (isQueuesEnabled()) {
          const { memoryService } = await import('../services/memoryService');
          const { queueManager, QueueName } = await import('../queues');

          // Check if compression is needed (don't await, let it run in background)
          memoryService.shouldCompressMemory(payload.conversationId).then(async (shouldCompress) => {
            if (shouldCompress) {
              logger.info({ conversationId: payload.conversationId }, 'Context limit reached, queuing memory compression');

              await queueManager.addJob(
                QueueName.MEMORY_COMPRESSION,
                'compress-memory',
                { conversationId: payload.conversationId }
              );

              // Notify user that compression is happening
              io.to(room).emit('memory_compression_started', {
                conversationId: payload.conversationId
              });
            }
          }).catch((error) => {
            logger.error({ error, conversationId: payload.conversationId }, 'Failed to check/queue memory compression');
          });
        }

        // Step 8: Queue AI response generation for each bot
        if (isQueuesEnabled()) {
          // Use queue system if enabled
          const preferredLanguage = socket.data.preferredLanguage;
          const costPerBot = estimatedCreditCost / respondingParticipantIds.length;
          for (const participantId of respondingParticipantIds) {
            await queueAIResponse({
              conversationId: payload.conversationId,
              participantId,
              lastMessageId: message.id,
              preferredLanguage,
              estimatedCreditCost: costPerBot,
              isNSFW,
              requestingUserId: user.id, // Pass who sent the message (who pays)
            });
          }
        } else {
          // Fallback: generate responses directly without queues
          logger.debug(
            { conversationId: payload.conversationId, botCount: respondingParticipantIds.length },
            'Generating AI responses directly (queues disabled)'
          );

          const { sendAIMessage } = await import('../services/assistantService');
          const costPerBot = estimatedCreditCost / respondingParticipantIds.length;

          for (const participantId of respondingParticipantIds) {
            try {
              const preferredLanguage = socket.data.preferredLanguage;
              const aiMessage = await sendAIMessage(
                payload.conversationId,
                participantId,
                preferredLanguage,
                costPerBot,
                isNSFW
              );

              // Charge credits for this bot's response
              if (costPerBot > 0) {
                try {
                  const { createTransaction } = await import('../services/creditService');
                  await createTransaction(
                    user.id, // Whoever sends the message pays for the AI response
                    'CONSUMPTION',
                    -costPerBot,
                    `Chat message (${isNSFW ? 'NSFW' : 'SFW'})`,
                    undefined,
                    undefined
                  );

                  logger.info(
                    {
                      userId: user.id,
                      creditCost: costPerBot,
                      isNSFW,
                      messageId: aiMessage.id,
                    },
                    'Credits charged for AI response'
                  );
                } catch (creditError) {
                  logger.error(
                    { error: creditError, userId: user.id },
                    'Failed to charge credits (continuing anyway)'
                  );
                }
              }

              // Broadcast the AI response to the room
              io.to(room).emit('message_received', serializeMessage(aiMessage));

              // Stop typing indicator
              emitTypingForBots(io, payload.conversationId, [participantId], false);

              logger.info(
                { conversationId: payload.conversationId, messageId: aiMessage.id, participantId },
                'AI response generated and broadcasted'
              );
            } catch (aiError) {
              logger.error(
                { error: aiError, conversationId: payload.conversationId, participantId },
                'Failed to generate AI response'
              );

              // Stop typing indicator on error
              emitTypingForBots(io, payload.conversationId, [participantId], false);

              // Optionally notify the user of the error
              io.to(room).emit('error', {
                message: 'Failed to generate AI response',
                participantId,
              });
            }
          }
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

      // Clean up presence
      presenceService.cleanupSocket(socket.id);
    });
  });

  return io;
}
