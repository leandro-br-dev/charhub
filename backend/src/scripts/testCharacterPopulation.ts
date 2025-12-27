/**
 * Test script for character population system
 * Tests both automatic scheduling and manual triggers
 */

import { queueManager } from '../queues/QueueManager';
import { QueueName } from '../queues/config';
import type { TriggerCurationJobData } from '../queues/jobs/characterPopulationJob';

async function main() {
  console.log('\n=== Character Population System Test ===\n');

  try {
    // 1. Check queue status
    console.log('1. Checking queue status...');
    const stats = await queueManager.getQueueStats(QueueName.CHARACTER_POPULATION);
    console.log('   Queue stats:', JSON.stringify(stats, null, 2));

    // 2. Get queue and check repeating jobs
    console.log('\n2. Checking repeating jobs...');
    const queue = queueManager.getQueue(QueueName.CHARACTER_POPULATION);
    const repeatableJobs = await queue.getRepeatableJobs();
    console.log(`   Found ${repeatableJobs.length} repeating job(s):`);
    repeatableJobs.forEach((job, index) => {
      console.log(`   ${index + 1}. ${job.name} - Pattern: ${job.pattern}`);
    });

    // 3. Trigger a manual curation job (small batch for testing)
    console.log('\n3. Triggering manual curation job (test with 3 images)...');
    const jobData: TriggerCurationJobData = {
      imageCount: 3,
      keywords: ['anime', 'fantasy'],
    };

    const job = await queueManager.addJob(
      QueueName.CHARACTER_POPULATION,
      'trigger-curation',
      jobData,
      { priority: 5 }
    );

    console.log(`   ✅ Job created with ID: ${job.id}`);
    console.log('   Job details:', {
      id: job.id,
      name: job.name,
      data: job.data,
    });

    // 4. Wait a bit and check job status
    console.log('\n4. Waiting for job to start...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const activeJobs = await queue.getActive(0, 10);
    const waitingJobs = await queue.getWaiting(0, 10);
    const completedJobs = await queue.getCompleted(0, 5);
    const failedJobs = await queue.getFailed(0, 5);

    console.log(`   Active jobs: ${activeJobs.length}`);
    console.log(`   Waiting jobs: ${waitingJobs.length}`);
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
    console.log('  docker compose logs backend --follow | grep -i "population\\|curation"');
    console.log('\nManual endpoints (require admin auth):');
    console.log('  POST /api/v1/character-population/trigger-curation');
    console.log('  POST /api/v1/character-population/trigger-batch');
    console.log('  POST /api/v1/character-population/trigger-full');
    console.log('  GET  /api/v1/character-population/stats');
    console.log('  GET  /api/v1/character-population/jobs');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }

  // Don't close connections immediately to allow the job to be picked up
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
