// backend/src/queues/workers/memoryCompressionWorker.ts
import { queueManager } from '../index';
import { QueueName } from '../config';
import { processMemoryCompression, MemoryCompressionJobData } from '../jobs/memoryCompressionJob';
import { logger } from '../../config/logger';

export function registerMemoryCompressionWorker(): void {
  try {
    queueManager.registerWorker<MemoryCompressionJobData>(
      QueueName.MEMORY_COMPRESSION,
      processMemoryCompression,
      {
        concurrency: 2, // Process 2 compression jobs concurrently
      }
    );

    logger.info('Memory compression worker registered');
  } catch (error) {
    logger.error({ error }, 'Failed to register memory compression worker');
    throw error;
  }
}
