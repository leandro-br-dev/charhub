import { prisma } from '../config/database';
import { batchCharacterGenerator } from '../services/batch/batchCharacterGenerator';
import { AgeRating } from '../generated/prisma';

async function testCreditBypass() {
  console.log('=== TESTING CREDIT BYPASS WITH REAL IMAGE ===\n');

  // Use a real Civitai image URL
  const realImageUrl = 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/156d96cb-3e6a-4c13-a578-c14e85b11240/width=450/height=813/156d96cb-3e6a-4c13-a578-c14e85b11240.jpeg';
  const timestamp = Date.now();
  const uniqueUrl = realImageUrl.replace('/width=450/', `/width=450/${timestamp}/`);

  console.log('[1] Creating test curated image with real URL...');
  console.log('  URL:', uniqueUrl);

  const curated = await prisma.curatedImage.create({
    data: {
      sourceUrl: uniqueUrl,
      sourceId: `test-${timestamp}`,
      sourcePlatform: 'civitai',
      status: 'APPROVED',
      qualityScore: 4.5,
      gender: 'FEMALE',
      ageRating: AgeRating.TEN,
    },
  });
  console.log('  Created:', curated.id.substring(0, 8));

  // Now trigger batch generation which should use credit bypass
  console.log('\n[2] Triggering batch generation with credit bypass...');
  console.log('  Check backend logs for: "Credit bypass: BOT/ADMIN user exempt from credit check"');

  const results = await batchCharacterGenerator.generateBatch({ count: 1 });

  console.log('\n[3] Results:');
  console.log('  Success count:', results.successCount);
  console.log('  Failure count:', results.failureCount);

  if (results.results && results.results.length > 0) {
    const result = results.results[0];
    console.log('  First result success:', result.success);
    console.log('  Character ID:', result.characterId?.substring(0, 8) || 'N/A');
  }

  await prisma.$disconnect();
}

testCreditBypass().catch(console.error);
