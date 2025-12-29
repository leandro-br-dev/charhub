/**
 * Test script for batch character generation with new AI pipeline
 */

import { batchCharacterGenerator } from '../services/batch/batchCharacterGenerator';
import { logger } from '../config/logger';

async function testBatch() {
  try {
    logger.info('Starting batch generation test with new AI pipeline...');

    const result = await batchCharacterGenerator.generateBatch({
      count: 2, // Small batch for testing
      maxRetries: 3,
      delayBetweenMs: 3000,
    });

    logger.info(
      {
        successCount: result.successCount,
        failureCount: result.failureCount,
        totalDuration: result.totalDuration,
        results: result.results
      },
      'Batch generation completed'
    );

    console.log('\n========================================');
    console.log('BATCH GENERATION RESULTS');
    console.log('========================================');
    console.log(`Success: ${result.successCount}`);
    console.log(`Failures: ${result.failureCount}`);
    console.log(`Duration: ${result.totalDuration} seconds`);
    console.log('\n--- Individual Results ---');
    result.results.forEach((r, i) => {
      console.log(`${i + 1}. ${r.curatedImageId}: ${r.success ? 'SUCCESS' : 'FAILED'}`);
      if (r.success) {
        console.log(`   Character ID: ${r.characterId}`);
        console.log(`   Duration: ${r.duration}ms`);
      }
      if (r.error) {
        console.log(`   Error: ${r.error}`);
      }
    });
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Batch generation failed');
    console.error('Error:', error);
    process.exit(1);
  }
}

testBatch();
