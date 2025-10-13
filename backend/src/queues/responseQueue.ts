import { Queue, Worker, Job } from 'bullmq';
import { createRedisClient } from '../config/redis';
import { logger } from '../config/logger';
import { agentService } from '../services/agentService';
import { prisma } from '../config/database';
import { SenderType } from '../generated/prisma';
import * as messageService from '../services/messageService';

// Job data structure
export interface ResponseJobData {
  conversationId: string;
  participantId: string;
  lastMessageId: string;
}

// Queue name
const QUEUE_NAME = 'ai-response-generation';

// Create connection for queue
const queueConnection = createRedisClient();

// Create the queue
export const responseQueue = new Queue<ResponseJobData>(QUEUE_NAME, {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 24 * 3600, // Keep for 24 hours
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs for debugging
    },
  },
});

// Worker connection (separate from queue)
const workerConnection = createRedisClient();

// Create the worker
export const responseWorker = new Worker<ResponseJobData>(
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
      const content = await agent.execute(conversation, conversation.owner, lastMessage);

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
  {
    connection: workerConnection,
    concurrency: 5, // Process up to 5 jobs concurrently
  }
);

// Worker event handlers
responseWorker.on('completed', (job) => {
  logger.debug(
    { jobId: job.id, conversationId: job.data.conversationId },
    'Job completed successfully'
  );
});

responseWorker.on('failed', (job, error) => {
  logger.error(
    { jobId: job?.id, conversationId: job?.data.conversationId, error },
    'Job failed'
  );
});

responseWorker.on('error', (error) => {
  logger.error({ error }, 'Worker error');
});

// Helper function to add a job to the queue
export async function queueAIResponse(data: ResponseJobData): Promise<string> {
  const job = await responseQueue.add('generate-response', data, {
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
  logger.info('SIGTERM received, closing response worker and queue');
  await responseWorker.close();
  await responseQueue.close();
  await queueConnection.quit();
  await workerConnection.quit();
});
