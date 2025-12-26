/**
 * Character Population Worker
 * Processes character population jobs
 */

import { Job } from 'bullmq';
import { logger } from '../../config/logger';
import { civitaiApiClient } from '../../services/civitai';
import { curationQueue } from '../../services/curation';
import { batchCharacterGenerator } from '../../services/batch';
import type { TriggerCurationJobData, BatchGenerationJobData, FullPopulationJobData } from '../jobs/characterPopulationJob';

/**
 * Process trigger curation job
 */
async function processTriggerCuration(job: Job<TriggerCurationJobData>): Promise<void> {
  const { imageCount, keywords } = job.data;

  logger.info({ imageCount, keywords }, 'Processing curation trigger job');

  try {
    // 1. Fetch images from Civitai
    const images = await civitaiApiClient.getTrendingImages({
      limit: imageCount,
      nsfw: 'None',
      tags: keywords,
    });

    logger.info({ fetched: images.length }, 'Images fetched from Civitai');

    // 2. Add to curation queue
    const queued = await curationQueue.addBatch(images);

    logger.info({ queued: queued.length }, 'Images added to curation queue');

    // 3. Process pending items
    const processed = await curationQueue.processPendingItems(imageCount);

    logger.info(
      {
        processed: processed.processed,
        approved: processed.approved,
        rejected: processed.rejected,
        errors: processed.errors,
      },
      'Curation processing completed'
    );

    // Update job progress
    await job.updateProgress(100);
  } catch (error) {
    logger.error({ error, jobData: job.data }, 'Curation trigger job failed');
    throw error;
  }
}

/**
 * Process batch generation job
 */
async function processBatchGeneration(job: Job<BatchGenerationJobData>): Promise<void> {
  const { count, userId } = job.data;

  logger.info({ count, userId }, 'Processing batch generation job');

  try {
    // Generate characters
    const result = await batchCharacterGenerator.generateBatch({
      count,
      userId: userId || process.env.OFFICIAL_BOT_USER_ID || 'bot_charhub_official',
    });

    logger.info(
      {
        successCount: result.successCount,
        failureCount: result.failureCount,
        duration: result.totalDuration,
      },
      'Batch generation job completed'
    );

    await job.updateProgress(100);
  } catch (error) {
    logger.error({ error, jobData: job.data }, 'Batch generation job failed');
    throw error;
  }
}

/**
 * Process full population pipeline job
 */
async function processFullPopulation(job: Job<FullPopulationJobData>): Promise<void> {
  const { targetCount, keywords, userId } = job.data;

  logger.info({ targetCount, keywords, userId }, 'Processing full population pipeline');

  try {
    // Phase 1: Fetch and curate images (30% progress)
    await job.updateProgress(10);
    const images = await civitaiApiClient.getTrendingImages({
      limit: targetCount * 2, // Fetch extra to account for rejects
      nsfw: 'None',
      tags: keywords,
    });

    await job.updateProgress(20);
    await curationQueue.addBatch(images);

    await job.updateProgress(30);
    const curationResult = await curationQueue.processPendingItems(targetCount * 2);

    logger.info(
      { approved: curationResult.approved, rejected: curationResult.rejected },
      'Curation phase completed'
    );

    // Phase 2: Generate characters (70% progress)
    await job.updateProgress(50);
    const batchResult = await batchCharacterGenerator.generateBatch({
      count: Math.min(targetCount, curationResult.approved),
      userId: userId || process.env.OFFICIAL_BOT_USER_ID || 'bot_charhub_official',
    });

    await job.updateProgress(100);

    logger.info(
      {
        successCount: batchResult.successCount,
        failureCount: batchResult.failureCount,
        totalDuration: batchResult.totalDuration,
      },
      'Full population pipeline completed'
    );
  } catch (error) {
    logger.error({ error, jobData: job.data }, 'Full population pipeline failed');
    throw error;
  }
}

/**
 * Character Population Worker Processor
 */
export async function characterPopulationProcessor(job: Job<any>): Promise<void> {
  const { name } = job;

  logger.info({ jobId: job.id, jobName: name }, 'Character population job started');

  switch (name) {
    case 'trigger-curation':
      await processTriggerCuration(job as Job<TriggerCurationJobData>);
      break;
    case 'batch-generation':
      await processBatchGeneration(job as Job<BatchGenerationJobData>);
      break;
    case 'full-population':
      await processFullPopulation(job as Job<FullPopulationJobData>);
      break;
    default:
      throw new Error(`Unknown job name: ${name}`);
  }

  logger.info({ jobId: job.id, jobName: name }, 'Character population job completed');
}
