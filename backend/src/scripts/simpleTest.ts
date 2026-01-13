/**
 * Simple test for automated character generation with references
 */

import { prisma } from '../config/database';
import { CurationStatus } from '../generated/prisma';
import { curationQueue } from '../services/curation/curationQueue';
import { batchCharacterGenerator } from '../services/batch/batchCharacterGenerator';

async function runTest() {
  console.log('=== SIMPLE GENERATION TEST ===\n');

  const testImageUrl = 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/156d96cb-3e6a-4c13-a578-c14e85b11240/width=450/height=813/156d96cb-3e6a-4c13-a578-c14e85b11240.jpeg';

  // 1. Add to curation queue
  console.log('[1] Adding to curation queue...');
  const curatedImage = await prisma.curatedImage.create({
    data: {
      sourceUrl: testImageUrl,
      sourceId: 'test-' + Date.now(),
      sourcePlatform: 'civitai',
      sourceRating: 4.5,
      status: CurationStatus.PENDING,
    },
  });
  console.log('  Created:', curatedImage.id.substring(0, 8));

  // 2. Process curation
  console.log('\n[2] Processing curation...');
  await curationQueue.processPendingItems();

  // 3. Check approval
  console.log('\n[3] Checking approval...');
  const updated = await prisma.curatedImage.findUnique({
    where: { id: curatedImage.id },
    select: { status: true, qualityScore: true, gender: true, species: true },
  });

  console.log('  Status:', updated?.status);
  console.log('  Quality:', updated?.qualityScore);
  console.log('  Gender:', updated?.gender);
  console.log('  Species:', updated?.species);

  if (updated?.status !== 'APPROVED') {
    console.log('\n❌ Image was not approved. Exiting.');
    await prisma.$disconnect();
    return;
  }

  // 4. Generate character
  console.log('\n[4] Generating character with avatar + references...');
  const results = await batchCharacterGenerator.generateBatch({
    count: 1,
  });

  console.log('  Results:', results.results?.length || 0);

  if (results.results && results.results.length > 0) {
    const result = results.results[0];
    console.log('  Success:', result.success);
    console.log('  Character ID:', result.characterId);

    if (result.characterId) {
      // 5. Verify images
      console.log('\n[5] Verifying generated images...');
      const images = await prisma.characterImage.findMany({
        where: { characterId: result.characterId },
        select: { type: true, content: true },
        orderBy: { type: 'asc' },
      });

      console.log('  Total images:', images.length);
      images.forEach(img => {
        console.log(`    ${img.type}: ${img.content || 'no content'}`);
      });

      const refs = images.filter(i => i.type === 'REFERENCE');
      console.log(`\n  References: ${refs.length}/4`);

      if (refs.length === 4) {
        console.log('\n✅ SUCCESS! All 4 references generated!');
      } else {
        console.log('\n⚠️  PARTIAL: Only', refs.length, 'references generated');
      }
    }
  } else {
    console.log('  No results');
  }

  console.log('\n=== TEST COMPLETE ===');
  await prisma.$disconnect();
}

runTest().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
