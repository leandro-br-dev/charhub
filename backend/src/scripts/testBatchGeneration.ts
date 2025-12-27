/**
 * Test batch character generation
 */

import { queueManager } from '../queues/QueueManager';
import { QueueName } from '../queues/config';
import type { BatchGenerationJobData } from '../queues/jobs/characterPopulationJob';
import { logger } from '../config/logger';

async function main() {
  console.log('\n=== Batch Character Generation Test ===\n');

  try {
    // Trigger batch generation with 1 character
    console.log('1. Triggering batch generation (1 character)...');
    const jobData: BatchGenerationJobData = {
      count: 1,
      userId: process.env.OFFICIAL_BOT_USER_ID || '00000000-0000-0000-0000-000000000001',
    };

    const job = await queueManager.addJob(
      QueueName.CHARACTER_POPULATION,
      'batch-generation',
      jobData,
      { priority: 5 }
    );

    console.log(`   ✅ Batch generation job created with ID: ${job.id}`);
    console.log('   Job details:', {
      id: job.id,
      name: job.name,
      data: job.data,
    });

    // Wait a bit and check status
    console.log('\n2. Waiting for job to process...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const queue = queueManager.getQueue(QueueName.CHARACTER_POPULATION);
    const activeJobs = await queue.getActive(0, 10);
    const completedJobs = await queue.getCompleted(0, 5);
    const failedJobs = await queue.getFailed(0, 5);

    console.log(`   Active jobs: ${activeJobs.length}`);
    console.log(`   Recently completed: ${completedJobs.length}`);
    console.log(`   Recently failed: ${failedJobs.length}`);

    if (activeJobs.length > 0) {
      console.log('\n   Active job details:');
      activeJobs.forEach(j => {
        console.log(`   - Job ${j.id}: ${j.name}, Progress: ${j.progress || 0}%`);
      });
    }

    console.log('\n=== Test Complete ===');
    console.log('\nTo monitor the job execution:');
    console.log('  docker compose logs backend --follow | grep -i "batch\\|generation\\|character"');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }

  // Wait before closing
  console.log('\nWaiting 5 seconds before closing...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Clean up
  await queueManager.closeAll();
  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
