import { QueueOptions, WorkerOptions } from 'bullmq';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

/**
 * Shared connection configuration for BullMQ
 * Uses a factory function to create new connections as needed
 */
export const queueConnection = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

/**
 * Default options for all queues
 */
export const defaultQueueOptions: QueueOptions = {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs for debugging
  },
};

/**
 * Default options for all workers
 */
export const defaultWorkerOptions: WorkerOptions = {
  connection: queueConnection,
  concurrency: 5, // Process 5 jobs concurrently per worker
};

/**
 * Queue names enum for type safety
 */
export enum QueueName {
  TEST = 'test',
  USAGE_PROCESSING = 'usage-processing',
  CREDITS_MONTHLY = 'credits-monthly',
  MEMORY_COMPRESSION = 'memory-compression',
  // Future queues will be added here:
  // CHARACTER_GENERATION = 'character-generation',
  // IMAGE_GENERATION = 'image-generation',
  // STORY_GENERATION = 'story-generation',
}
