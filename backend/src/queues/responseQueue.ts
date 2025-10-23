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
    connection: queueConnection,
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
        throw new Error(`Message ${lastMessageId} not found`);
      }

      // Find the participant that should respond
      const participant = conversation.participants.find(p => p.id === participantId);
      if (!participant) {
        throw new Error(`Participant ${participantId} not found`);
      }

      // Generate response using ResponseGenerationAgent
      const agent = agentService.getResponseGenerationAgent();
      const content = await agent.execute(
        conversation,
        conversation.owner,
        lastMessage,
        participantId  // Pass the participant ID to use the correct character
      );

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

      // Save the AI message
      const message = await messageService.createMessage({
        conversationId,
        senderId,
        senderType,
        content,
      });

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
    } catch (error) {
      logger.error(
        { error, jobId: job.id, conversationId, participantId },
        'Error processing AI response job'
      );
      throw error;
    }
    },
    { connection: workerConnection, concurrency: 5 }
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
  try { await responseWorker.close(); } catch {}
  try { await responseQueue.close(); } catch {}
  try { await queueConnection?.quit(); } catch {}
  try { await workerConnection?.quit(); } catch {}
});
