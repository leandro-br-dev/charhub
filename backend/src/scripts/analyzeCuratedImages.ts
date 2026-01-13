/**
 * Script to analyze CuratedImage data
 * Run with: npx ts-node src/scripts/analyzeCuratedImages.ts
 */

import { prisma } from '../config/database';

async function analyzeCuratedImages() {
  console.log('=== CURATED IMAGE ANALYSIS ===\n');

  // Get today's date range (UTC)
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));

  console.log(`Analysis period: ${todayStart.toISOString()} to ${todayEnd.toISOString()}\n`);

  // 1. Total images today
  const totalToday = await prisma.curatedImage.count({
    where: {
      createdAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  });

  // 2. Status breakdown
  const statusBreakdown = await prisma.curatedImage.groupBy({
    by: ['status'],
    where: {
      createdAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
    _count: true,
  });

  console.log('--- STATUS BREAKDOWN (TODAY) ---');
  statusBreakdown.forEach(item => {
    const percentage = ((item._count / totalToday) * 100).toFixed(1);
    console.log(`  ${item.status}: ${item._count} (${percentage}%)`);
  });
  console.log(`  TOTAL: ${totalToday}\n`);

  // 3. Gender breakdown (unknown count)
  const genderBreakdown = await prisma.curatedImage.groupBy({
    by: ['gender'],
    where: {
      createdAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
    _count: true,
  });

  console.log('--- GENDER BREAKDOWN (TODAY) ---');
  genderBreakdown.forEach(item => {
    const percentage = ((item._count / totalToday) * 100).toFixed(1);
    console.log(`  ${item.gender || 'NULL'}: ${item._count} (${percentage}%)`);
  });

  const unknownGender = genderBreakdown.find(g => g.gender === 'unknown')?._count || 0;
  const unknownGenderPercent = ((unknownGender / totalToday) * 100).toFixed(1);
  console.log(`  ⚠️  UNKNOWN GENDER: ${unknownGender} (${unknownGenderPercent}%)\n`);

  // 4. Rejection reasons
  const rejectedImages = await prisma.curatedImage.findMany({
    where: {
      status: 'REJECTED',
      createdAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
    select: {
      rejectionReason: true,
    },
  });

  console.log('--- REJECTION REASONS (TODAY) ---');
  const reasonCounts: Record<string, number> = {};
  rejectedImages.forEach(img => {
    const reason = img.rejectionReason || 'No reason provided';
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
  });

  Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([reason, count]) => {
      const percentage = ((count / rejectedImages.length) * 100).toFixed(1);
      console.log(`  ${reason}: ${count} (${percentage}%)`);
    });
  console.log(`  TOTAL REJECTED: ${rejectedImages.length}\n`);

  // 5. Quality score distribution
  const qualityScores = await prisma.curatedImage.findMany({
    where: {
      createdAt: {
        gte: todayStart,
        lte: todayEnd,
      },
      qualityScore: { not: null },
    },
    select: {
      qualityScore: true,
    },
  });

  if (qualityScores.length > 0) {
    const avgQuality = qualityScores.reduce((sum, img) => sum + (img.qualityScore || 0), 0) / qualityScores.length;
    console.log(`--- QUALITY SCORES (TODAY) ---`);
    console.log(`  Average: ${avgQuality.toFixed(2)}`);
    console.log(`  Min: ${Math.min(...qualityScores.map(s => s.qualityScore || 0)).toFixed(2)}`);
    console.log(`  Max: ${Math.max(...qualityScores.map(s => s.qualityScore || 0)).toFixed(2)}`);
    console.log(`  Total scored: ${qualityScores.length}\n`);
  }

  // 6. Approved but not generated (available for generation)
  const availableForGeneration = await prisma.curatedImage.count({
    where: {
      status: 'APPROVED',
      generatedCharId: null,
    },
  });

  console.log('--- AVAILABLE FOR GENERATION ---');
  console.log(`  Approved but not generated: ${availableForGeneration}\n`);

  // 7. Overall statistics (all time)
  const totalAllTime = await prisma.curatedImage.count();
  const approvedAllTime = await prisma.curatedImage.count({ where: { status: 'APPROVED' } });
  const rejectedAllTime = await prisma.curatedImage.count({ where: { status: 'REJECTED' } });
  const completedAllTime = await prisma.curatedImage.count({ where: { status: 'COMPLETED' } });

  console.log('--- ALL TIME STATISTICS ---');
  console.log(`  Total curated: ${totalAllTime}`);
  console.log(`  Approved: ${approvedAllTime} (${((approvedAllTime / totalAllTime) * 100).toFixed(1)}%)`);
  console.log(`  Rejected: ${rejectedAllTime} (${((rejectedAllTime / totalAllTime) * 100).toFixed(1)}%)`);
  console.log(`  Completed (generated): ${completedAllTime} (${((completedAllTime / totalAllTime) * 100).toFixed(1)}%)`);

  const approvalRate = ((approvedAllTime / totalAllTime) * 100).toFixed(1);
  const rejectionRate = ((rejectedAllTime / totalAllTime) * 100).toFixed(1);
  console.log(`\n  Approval rate: ${approvalRate}%`);
  console.log(`  Rejection rate: ${rejectionRate}%`);

  // 8. Recent batch generation logs
  const recentBatches = await prisma.batchGenerationLog.findMany({
    orderBy: { scheduledAt: 'desc' },
    take: 5,
    select: {
      scheduledAt: true,
      targetCount: true,
      successCount: true,
      failureCount: true,
      duration: true,
    },
  });

  console.log('\n--- RECENT BATCH GENERATIONS ---');
  recentBatches.forEach(batch => {
    console.log(`  ${batch.scheduledAt.toISOString()}:`);
    console.log(`    Target: ${batch.targetCount}, Success: ${batch.successCount}, Failure: ${batch.failureCount}`);
    console.log(`    Duration: ${batch.duration}s`);
  });

  // 9. Sample some recent approved images for inspection
  console.log('\n--- SAMPLE APPROVED IMAGES (last 5) ---');
  const sampleApproved = await prisma.curatedImage.findMany({
    where: { status: 'APPROVED' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      sourceUrl: true,
      gender: true,
      species: true,
      qualityScore: true,
      createdAt: true,
    },
  });

  sampleApproved.forEach(img => {
    console.log(`  [${img.id.substring(0, 8)}] ${img.gender || 'unknown'} | ${img.species || 'unknown'} | Q:${img.qualityScore?.toFixed(1) || 'N/A'} | ${img.createdAt.toISOString()}`);
  });

  await prisma.$disconnect();
}

analyzeCuratedImages()
  .then(() => {
    console.log('\n=== ANALYSIS COMPLETE ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
