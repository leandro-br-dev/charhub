/**
 * Image Generation Worker Registration
 * Registers the image generation worker with BullMQ
 */

import { queueManager } from '../QueueManager';
import { QueueName } from '../config';
import { processImageGeneration } from './imageGenerationWorker';
import { logger } from '../../config/logger';

export function registerImageGenerationWorker(): void {
  try {
    queueManager.registerWorker(QueueName.IMAGE_GENERATION, processImageGeneration, {
      concurrency: 1, // Process one image at a time (GPU limitation)
      limiter: {
        max: 10,
        duration: 60000, // Max 10 images per minute
      },
    });

    logger.info('Image generation worker registered');
  } catch (error) {
    logger.error({ err: error }, 'Failed to register image generation worker');
    throw error;
  }
}
