import { prisma } from '../config/database';
import { batchCharacterGenerator } from '../services/batch/batchCharacterGenerator';
import { AgeRating } from '../generated/prisma';

async function testReferenceGeneration() {
  console.log('=== TESTING REFERENCE GENERATION WITH DEBUG LOGS ===\n');

  const timestamp = Date.now();
  const realImageUrl = 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/633fcfb4-11fb-44e7-8529-e278bdf6a662/width=450/height=813/633fcfb4-11fb-44e7-8529-e278bdf6a662.jpeg';
  const uniqueUrl = realImageUrl.replace('/width=450/', `/width=450/${timestamp}/`);

  console.log('[1] Creating test curated image...');
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

  console.log('\n[2] Triggering batch generation...');
  console.log('  Watch for "Step 8:" messages in backend logs\n');

  const results = await batchCharacterGenerator.generateBatch({ count: 1 });

  console.log('\n[3] Results:');
  console.log('  Success count:', results.successCount);
  console.log('  Failure count:', results.failureCount);
  console.log('  Total duration:', results.totalDuration, 'ms');

  if (results.results && results.results.length > 0) {
    const result = results.results[0];
    console.log('  First result success:', result.success);
    console.log('  Character ID:', result.characterId?.substring(0, 8) || 'N/A');
    console.log('  Error:', result.error || 'N/A');

    // Check images
    if (result.characterId) {
      const images = await prisma.characterImage.findMany({
        where: { characterId: result.characterId },
        select: { type: true, isActive: true },
      });
      console.log('\n[4] Character images:');
      images.forEach(img => {
        console.log(`    ${img.type}: active=${img.isActive}`);
      });
      const refs = images.filter(i => i.type === 'REFERENCE');
      console.log(`  References: ${refs.length}/4`);
    }
  }

  console.log('\n[5] Check backend logs for:');
  console.log('  - "Step 8: Checking if reference generation should run"');
  console.log('  - "Step 8: Waiting for avatar generation to complete..."');
  console.log('  - "Avatar generation completed"');
  console.log('  - "Starting automated reference generation..."');

  await prisma.$disconnect();
}

testReferenceGeneration().catch(console.error);
