import type { Server } from 'socket.io';
import { Queue, Worker, Job } from 'bullmq';
import { createRedisClient } from '../config/redis';
import { logger } from '../config/logger';
import { agentService } from '../services/agentService';
import { prisma } from '../config/database';
import { SenderType } from '../generated/prisma';
import * as messageService from '../services/messageService';
import { isQueuesEnabled } from '../config/features';

// Job data structure
export interface ResponseJobData {
  conversationId: string;
  participantId: string;
  lastMessageId: string;
  preferredLanguage?: string;
  estimatedCreditCost?: number;
  isNSFW?: boolean;
  requestingUserId?: string; // ID of the user who triggered this AI response (who pays)
}

// Queue name
const QUEUE_NAME = 'ai-response-generation';

let responseQueue: Queue<ResponseJobData> | null = null;
let responseWorker: Worker<ResponseJobData> | null = null;
let queueConnection: ReturnType<typeof createRedisClient> | null = null;
let workerConnection: ReturnType<typeof createRedisClient> | null = null;

function ensureInitialized() {
  if (!isQueuesEnabled()) return false;
  if (responseQueue && responseWorker) return true;
  queueConnection = createRedisClient();
  responseQueue = new Queue<ResponseJobData>(QUEUE_NAME, {
    connection: queueConnection as any, // Type assertion for ioredis/bullmq compatibility
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 100, age: 24 * 3600 },
      removeOnFail: { count: 500 },
    },
  });
  workerConnection = createRedisClient();
  responseWorker = new Worker<ResponseJobData>(
    QUEUE_NAME,
    async (job: Job<ResponseJobData>) => {
      const { conversationId, participantId, lastMessageId } = job.data;

    logger.info(
      { jobId: job.id, conversationId, participantId },
      'Processing AI response job'
    );

    try {
      // Fetch conversation with full context
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
        throw new Error(`Conversation ${conversationId} not found`);
      }

      const lastMessage = conversation.messages.find(m => m.id === lastMessageId);
      if (!lastMessage) {
        logger.error({
          conversationId,
          lastMessageId,
          allMessageIds: conversation.messages.map(m => m.id),
          totalMessages: conversation.messages.length,
        }, 'Last message not found in conversation');
        throw new Error(`Message ${lastMessageId} not found`);
      }

      logger.info({
        conversationId,
        lastMessageId,
        lastMessageContent: lastMessage.content?.substring(0, 100),
        totalMessagesInConversation: conversation.messages.length,
      }, 'Last message found in conversation');

      // Find the participant that should respond
      const participant = conversation.participants.find(p => p.id === participantId);
      if (!participant) {
        throw new Error(`Participant ${participantId} not found`);
      }

      // Generate response using ResponseGenerationAgent
      const agent = agentService.getResponseGenerationAgent();

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
      }, 'All users before calling agent.execute (queue worker)');

      logger.info({
        conversationId: conversation.id,
        participantId,
        lastMessageContent: lastMessage.content?.substring(0, 100),
        lastMessageId: lastMessage.id,
      }, 'About to call agent.execute');

      const startTime = Date.now();
      const content = await agent.execute(
        conversation,
        conversation.owner,
        lastMessage,
        participantId,  // Pass the participant ID to use the correct character
        job.data.preferredLanguage,  // Pass the preferred language from job data
        allUsers  // Pass all users for multi-user context
      );

      const executionTime = Date.now() - startTime;

      logger.info({
        conversationId: conversation.id,
        participantId,
        executionTime,
        contentLength: content?.length || 0,
        contentPreview: content?.substring(0, 100),
      }, 'agent.execute completed');

      // Determine sender ID based on participant type
      let senderId: string;
      let senderType: SenderType;

      if (participant.actingAssistantId) {
        senderId = participant.actingAssistantId;
        senderType = SenderType.ASSISTANT;
      } else if (participant.actingCharacterId) {
        senderId = participant.actingCharacterId;
        senderType = SenderType.CHARACTER;
      } else {
        throw new Error(`Participant ${participantId} has no acting bot`);
      }

      // Add credit cost to metadata if provided
      const metadata = job.data.estimatedCreditCost
        ? { creditCost: job.data.estimatedCreditCost, isNSFW: job.data.isNSFW || false }
        : undefined;

      // Save the AI message
      const message = await messageService.createMessage({
        conversationId,
        senderId,
        senderType,
        content,
        metadata,
      });

      // Charge credits if cost was estimated
      if (job.data.estimatedCreditCost && job.data.estimatedCreditCost > 0) {
        try {
          const { createTransaction } = await import('../services/creditService');
          // Charge the user who triggered the AI response (requestingUserId)
          // If not provided (old jobs), fall back to conversation owner
          const payingUserId = job.data.requestingUserId || conversation.userId;

          await createTransaction(
            payingUserId,
            'CONSUMPTION',
            -job.data.estimatedCreditCost,
            `Chat message (${job.data.isNSFW ? 'NSFW' : 'SFW'})`,
            undefined, // relatedUsageLogId
            undefined  // relatedPlanId
          );

          logger.info(
            {
              jobId: job.id,
              payingUserId,
              requestingUserId: job.data.requestingUserId,
              conversationOwnerId: conversation.userId,
              creditCost: job.data.estimatedCreditCost,
              isNSFW: job.data.isNSFW,
            },
            'Credits charged for AI response'
          );
        } catch (creditError) {
          logger.error(
            { error: creditError, jobId: job.id, payingUserId: job.data.requestingUserId || conversation.userId },
            'Failed to charge credits (continuing anyway)'
          );
          // Don't fail the job if credit charging fails
        }
      }

      logger.info(
        { jobId: job.id, conversationId, messageId: message.id },
        'AI response generated successfully'
      );

      return {
        success: true,
        messageId: message.id,
        participantId,
        content,
      };
    } catch (error: any) {
      // Check if this is a content restriction error (age validation)
      if (error instanceof Error && error.message.includes('Content is rated')) {
        logger.warn(
          { jobId: job.id, conversationId, participantId },
          'Message blocked - content not allowed for user age'
        );

        // Send a system message to inform the user
        if (ioInstance) {
          const room = getRoomName(conversationId);
          ioInstance.to(room).emit('typing_stop', {
            conversationId,
            participantId,
            source: 'bot',
          });

          // Send system message about content restriction
          ioInstance.to(room).emit('message_received', {
            id: `system-${Date.now()}`,
            conversationId,
            senderId: 'system',
            senderType: 'SYSTEM',
            content: `⚠️ ${error.message}`,
            attachments: null,
            metadata: null,
            timestamp: new Date().toISOString(),
          });
        }

        // Return success to not fail the job, but indicate message was blocked
        return {
          success: true,
          messageId: null, // No message was created
          participantId,
          content: error.message,
          blocked: true,
        };
      }

      logger.error(
        { error, jobId: job.id, conversationId, participantId },
        'Error processing AI response job'
      );
      throw error;
    }
    },
    { connection: workerConnection as any, concurrency: 5 } // Type assertion for ioredis/bullmq compatibility
  );

  // Attach events
  responseWorker.on('completed', (job, result) => {
    logger.debug(
      { jobId: job.id, conversationId: job.data.conversationId },
      'Job completed successfully'
    );
    if (ioInstance && result) {
      const room = getRoomName(job.data.conversationId);
      ioInstance.to(room).emit('typing_stop', {
        conversationId: job.data.conversationId,
        participantId: result.participantId,
        source: 'bot',
      });
      ioInstance.to(room).emit('message_received', {
        id: result.messageId,
        conversationId: job.data.conversationId,
        senderId: result.participantId,
        senderType: 'ASSISTANT',
        content: result.content,
        attachments: null,
        metadata: null,
        timestamp: new Date().toISOString(),
      });
    }
  });
  responseWorker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, conversationId: job?.data.conversationId, error }, 'Job failed');
  });
  responseWorker.on('error', (error) => {
    logger.error({ error }, 'Worker error');
  });

  return true;
}

// Socket.IO instance (set by setupWebSocketBroadcast)
let ioInstance: Server | null = null;

/**
 * Configure Socket.IO broadcasting for completed jobs
 * Must be called after Socket.IO server is initialized
 */
export function setupWebSocketBroadcast(io: Server): void {
  ioInstance = io;
  logger.info('WebSocket broadcast configured for response worker');
}

/**
 * Helper to get room name for a conversation
 */
function getRoomName(conversationId: string): string {
  return 'conversation:' + conversationId;
}

// Worker event handlers
// Helper function to add a job to the queue
export async function queueAIResponse(data: ResponseJobData): Promise<string> {
  if (!ensureInitialized()) {
    logger.warn({ conversationId: data.conversationId }, 'Queues are disabled; skipping AI response job');
    return 'queues-disabled';
  }
  const job = await (responseQueue as Queue<ResponseJobData>).add('generate-response', data, {
    jobId: `${data.conversationId}-${data.participantId}-${Date.now()}`,
  });
  logger.debug(
    { jobId: job.id, conversationId: data.conversationId, participantId: data.participantId },
    'AI response job queued'
  );
  return job.id!;
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (!responseWorker || !responseQueue) return;
  logger.info('SIGTERM received, closing response worker and queue');
  try { await responseWorker.close(); } catch { /* Ignore close errors during shutdown */ }
  try { await responseQueue.close(); } catch { /* Ignore close errors during shutdown */ }
  try { await queueConnection?.quit(); } catch { /* Ignore quit errors during shutdown */ }
  try { await workerConnection?.quit(); } catch { /* Ignore quit errors during shutdown */ }
});
