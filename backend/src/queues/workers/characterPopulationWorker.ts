/**
 * Character Population Worker
 * Processes character population jobs
 */

import { Job } from 'bullmq';
import { logger } from '../../config/logger';
import { civitaiApiClient } from '../../services/civitai';
import { curationQueue } from '../../services/curation';
import { batchCharacterGenerator } from '../../services/batch';
import { prisma } from '../../config/database';
import type {
  TriggerCurationJobData,
  BatchGenerationJobData,
  FullPopulationJobData,
  HourlyGenerationJobData,
  DailyCurationJobData
} from '../jobs/characterPopulationJob';

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
      animeStyle: true, // Focus on anime-style character images
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
      userId: userId || process.env.OFFICIAL_BOT_USER_ID || '00000000-0000-0000-0000-000000000001',
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
      animeStyle: true, // Focus on anime-style character images
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
      userId: userId || process.env.OFFICIAL_BOT_USER_ID || '00000000-0000-0000-0000-000000000001',
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
 * Process hourly generation job
 * Generates at most 1 character per hour, respecting daily limit
 */
async function processHourlyGeneration(job: Job<HourlyGenerationJobData>): Promise<void> {
  const { dailyLimit, userId } = job.data;
  const dailyLimitOrDefault = dailyLimit || parseInt(process.env.BATCH_SIZE_PER_RUN || '24', 10);
  const botUserId = userId || process.env.OFFICIAL_BOT_USER_ID || '00000000-0000-0000-0000-000000000001';

  logger.info({ dailyLimit: dailyLimitOrDefault, userId: botUserId }, 'Processing hourly generation job');

  await job.updateProgress(10);

  try {
    // Get today's start and end (UTC)
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));

    // Count characters generated today by bot
    const generatedToday = await prisma.batchGenerationLog.count({
      where: {
        scheduledAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    logger.info({ generatedToday, dailyLimit: dailyLimitOrDefault }, 'Checking daily generation count');

    // Check if daily limit reached
    if (generatedToday >= dailyLimitOrDefault) {
      logger.info(
        { generatedToday, dailyLimit: dailyLimitOrDefault },
        'Daily generation limit reached, skipping this hour'
      );
      await job.updateProgress(100);
      return;
    }

    await job.updateProgress(30);

    // Generate exactly 1 character
    logger.info('Generating 1 character for this hour');
    const result = await batchCharacterGenerator.generateBatch({
      count: 1,
      userId: botUserId,
    });

    await job.updateProgress(100);

    logger.info(
      {
        successCount: result.successCount,
        failureCount: result.failureCount,
        generatedToday: generatedToday + result.successCount,
        dailyLimit: dailyLimitOrDefault,
      },
      'Hourly generation job completed'
    );
  } catch (error) {
    logger.error({ error, jobData: job.data }, 'Hourly generation job failed');
    throw error;
  }
}

/**
 * Process daily curation job
 * Fetches and curates images once per day
 */
async function processDailyCuration(job: Job<DailyCurationJobData>): Promise<void> {
  const { imageCount, keywords } = job.data;
  // Default to BATCH_SIZE_PER_RUN * 2 to get extra images for filtering
  const targetCount = imageCount || (parseInt(process.env.BATCH_SIZE_PER_RUN || '24', 10) * 2);

  logger.info(
    { imageCount: targetCount, keywords },
    'Processing daily curation job'
  );

  await job.updateProgress(10);

  try {
    // 1. Fetch images from Civitai with anime-style filtering
    logger.info('Fetching anime-style images from Civitai...');
    const images = await civitaiApiClient.getTrendingImages({
      limit: targetCount,
      nsfw: 'None',
      tags: keywords,
      animeStyle: true, // Focus on anime-style character images
    });

    await job.updateProgress(30);
    logger.info({ fetched: images.length }, 'Images fetched from Civitai');

    // 2. Add to curation queue
    await curationQueue.addBatch(images);
    await job.updateProgress(50);

    // 3. Process pending items (auto-approve based on quality)
    const curationResult = await curationQueue.processPendingItems(targetCount);

    await job.updateProgress(100);

    logger.info(
      {
        processed: curationResult.processed,
        approved: curationResult.approved,
        rejected: curationResult.rejected,
        errors: curationResult.errors,
      },
      'Daily curation job completed'
    );
  } catch (error) {
    logger.error({ error, jobData: job.data }, 'Daily curation job failed');
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
    case 'hourly-generation':
      await processHourlyGeneration(job as Job<HourlyGenerationJobData>);
      break;
    case 'daily-curation':
      await processDailyCuration(job as Job<DailyCurationJobData>);
      break;
    default:
      throw new Error(`Unknown job name: ${name}`);
  }

  logger.info({ jobId: job.id, jobName: name }, 'Character population job completed');
}
