/**
 * Check automated job status and history
 * Verifies that scheduled jobs are running correctly
 */

import { queueManager } from '../queues/QueueManager';
import { QueueName } from '../queues/config';
import { prisma } from '../config/database';

async function checkAutomatedJobs() {
  console.log('\n=== Automated Jobs Status Check ===\n');

  try {
    // 1. Check configuration
    console.log('1. Configuration:');
    const batchEnabled = process.env.BATCH_GENERATION_ENABLED === 'true';
    const batchSize = parseInt(process.env.BATCH_SIZE_PER_RUN || '24', 10);
    const curationHour = parseInt(process.env.DAILY_CURATION_HOUR || '3', 10);

    console.log(`   BATCH_GENERATION_ENABLED: ${batchEnabled}`);
    console.log(`   BATCH_SIZE_PER_RUN: ${batchSize}`);
    console.log(`   DAILY_CURATION_HOUR: ${curationHour} UTC`);

    if (!batchEnabled) {
      console.log('\n   ⚠️  Automated character population is DISABLED');
      console.log('   Set BATCH_GENERATION_ENABLED=true to enable\n');
      process.exit(0);
    }

    // 2. Get queue
    const queue = queueManager.getQueue(QueueName.CHARACTER_POPULATION);

    // 3. Get repeatable jobs (scheduled jobs)
    console.log('\n2. Scheduled Jobs (Repeatable):');
    const repeatableJobs = await queue.getRepeatableJobs();

    if (repeatableJobs.length === 0) {
      console.log('   ⚠️  No repeatable jobs found!');
    } else {
      repeatableJobs.forEach((job, idx) => {
        console.log(`\n   ${idx + 1}. ${job.name}`);
        console.log(`      Pattern: ${job.pattern || 'N/A'} (cron)`);
        const nextRun = job.next ? new Date(job.next).toISOString() : 'Not scheduled';
        console.log(`      Next run: ${nextRun}`);
        console.log(`      Key: ${job.key}`);
      });
    }

    // 4. Get recent completed jobs
    console.log('\n3. Recent Completed Jobs (Last 10):');
    const completedJobs = await queue.getCompleted(0, 10);

    if (completedJobs.length === 0) {
      console.log('   No completed jobs found');
    } else {
      for (const job of completedJobs) {
        const finishedAt = job.finishedOn ? new Date(job.finishedOn).toISOString() : 'unknown';
        console.log(`\n   - ${job.name} (ID: ${job.id})`);
        console.log(`     Finished: ${finishedAt}`);
        console.log(`     Data: ${JSON.stringify(job.data).substring(0, 100)}`);
      }
    }

    // 5. Get active jobs
    console.log('\n4. Currently Active Jobs:');
    const activeJobs = await queue.getActive(0, 10);

    if (activeJobs.length === 0) {
      console.log('   No active jobs currently running');
    } else {
      activeJobs.forEach(job => {
        console.log(`   - ${job.name} (ID: ${job.id})`);
        console.log(`     Progress: ${job.progress || 0}%`);
      });
    }

    // 6. Get failed jobs
    console.log('\n5. Recent Failed Jobs (Last 5):');
    const failedJobs = await queue.getFailed(0, 5);

    if (failedJobs.length === 0) {
      console.log('   ✅ No failed jobs - everything is working!');
    } else {
      failedJobs.forEach(job => {
        console.log(`\n   ❌ ${job.name} (ID: ${job.id})`);
        console.log(`      Reason: ${job.failedReason}`);
        console.log(`      Failed at: ${job.finishedOn ? new Date(job.finishedOn).toISOString() : 'unknown'}`);
      });
    }

    // 7. Check batch generation logs from database
    console.log('\n6. Recent Batch Generations (Last 10 from DB):');
    const recentBatches = await prisma.batchGenerationLog.findMany({
      orderBy: { scheduledAt: 'desc' },
      take: 10,
      select: {
        id: true,
        scheduledAt: true,
        executedAt: true,
        completedAt: true,
        targetCount: true,
        successCount: true,
        failureCount: true,
        duration: true,
      },
    });

    if (recentBatches.length === 0) {
      console.log('   No batch generation logs found');
    } else {
      recentBatches.forEach((batch, idx) => {
        const scheduledTime = batch.scheduledAt.toISOString();
        const success = batch.successCount || 0;
        const failed = batch.failureCount || 0;
        const duration = batch.duration || 0;

        console.log(`\n   ${idx + 1}. Batch ${batch.id.substring(0, 8)}...`);
        console.log(`      Scheduled: ${scheduledTime}`);
        console.log(`      Target: ${batch.targetCount}, Success: ${success}, Failed: ${failed}`);
        console.log(`      Duration: ${duration}ms`);
      });
    }

    // 8. Today's character generation count
    console.log('\n7. Today\'s Character Generation:');
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));

    const generatedToday = await prisma.batchGenerationLog.count({
      where: {
        scheduledAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    const totalSuccessToday = await prisma.batchGenerationLog.aggregate({
      where: {
        scheduledAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      _sum: {
        successCount: true,
      },
    });

    console.log(`   Batches executed today: ${generatedToday}`);
    console.log(`   Characters generated today: ${totalSuccessToday._sum.successCount || 0}`);
    console.log(`   Daily limit: ${batchSize}`);
    console.log(`   Remaining: ${Math.max(0, batchSize - (totalSuccessToday._sum.successCount || 0))}`);

    console.log('\n=== Check Complete ===\n');

    // Summary
    if (repeatableJobs.length > 0 && failedJobs.length === 0) {
      console.log('✅ All automated jobs are configured and running successfully!');
      console.log(`   - ${repeatableJobs.length} scheduled jobs active`);
      console.log(`   - ${completedJobs.length} recent completions`);
      console.log(`   - 0 failures\n`);
    } else if (repeatableJobs.length === 0) {
      console.log('⚠️  No scheduled jobs found - they may need to be re-registered');
    } else {
      console.log(`⚠️  Some issues detected - ${failedJobs.length} failed jobs`);
    }

  } catch (error: any) {
    console.error('\n❌ Check failed:', error.message);
    console.error(error);
    process.exit(1);
  }

  // Wait before closing
  await new Promise(resolve => setTimeout(resolve, 1000));
  process.exit(0);
}

checkAutomatedJobs().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
