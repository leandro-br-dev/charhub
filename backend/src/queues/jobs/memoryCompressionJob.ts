// backend/src/queues/jobs/memoryCompressionJob.ts
import { Job } from 'bullmq';
import { logger } from '../../config/logger';
import { memoryService } from '../../services/memoryService';

export interface MemoryCompressionJobData {
  conversationId: string;
}

export async function processMemoryCompression(job: Job<MemoryCompressionJobData>) {
  const { conversationId } = job.data;

  logger.info({ conversationId, jobId: job.id }, 'Starting memory compression job');

  try {
    // Verificar se realmente precisa compactar
    const shouldCompress = await memoryService.shouldCompressMemory(conversationId);

    if (!shouldCompress) {
      logger.info({ conversationId }, 'Memory compression not needed yet');
      return { success: true, skipped: true };
    }

    // Executar compactação
    const success = await memoryService.compressConversationMemory(conversationId);

    if (success) {
      logger.info({ conversationId, jobId: job.id }, 'Memory compression job completed successfully');
      return { success: true, conversationId };
    } else {
      throw new Error('Memory compression failed');
    }
  } catch (error) {
    logger.error({ error, conversationId, jobId: job.id }, 'Memory compression job failed');
    throw error;
  }
}
