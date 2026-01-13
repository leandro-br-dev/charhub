import { prisma } from '../config/database';
import { batchCharacterGenerator } from '../services/batch/batchCharacterGenerator';

async function testCreditBypass() {
  console.log('=== TESTING CREDIT BYPASS ===\n');

  // 1. Add a new test image with PENDING status
  const timestamp = Date.now();
  const testImageUrl = `https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/test-${timestamp}/width=450/test-${timestamp}.jpeg`;

  console.log('[1] Creating test curated image...');
  const curated = await prisma.curatedImage.create({
    data: {
      sourceUrl: testImageUrl,
      sourceId: `test-${timestamp}`,
      sourcePlatform: 'civitai',
      status: 'APPROVED', // Skip curation for testing
      qualityScore: 4.5,
      gender: 'FEMALE',
    },
  });
  console.log('  Created:', curated.id.substring(0, 8));

  // 2. Now trigger batch generation which should use credit bypass
  console.log('\n[2] Triggering batch generation with credit bypass...');
  const results = await batchCharacterGenerator.generateBatch({ count: 1 });

  console.log('\n[3] Results:');
  console.log('  Success count:', results.successCount);
  console.log('  Failure count:', results.failureCount);
  console.log('  Total duration:', results.totalDuration, 'ms');

  if (results.results && results.results.length > 0) {
    const result = results.results[0];
    console.log('\n[4] First result:');
    console.log('  Success:', result.success);
    console.log('  Character ID:', result.characterId?.substring(0, 8) || 'N/A');
    console.log('  Error:', result.error || 'N/A');
  }

  // 5. Check backend logs for credit bypass message
  console.log('\n[5] Check backend logs for:');
  console.log('  "Credit bypass: BOT/ADMIN user exempt from credit check"');

  await prisma.$disconnect();
}

testCreditBypass().catch(console.error);
