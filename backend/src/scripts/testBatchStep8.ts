/**
 * Test Step 8 - Reference Generation
 * Verifies if Step 8 is being executed correctly
 */

import { prisma } from '../config/database';
import { batchCharacterGenerator } from '../services/batch/batchCharacterGenerator';
import { CurationStatus } from '../generated/prisma';

async function testStep8() {
  console.log('=== TESTING STEP 8 - REFERENCE GENERATION ===\n');

  // Find an approved curated image that hasn't been generated yet
  const pendingImage = await prisma.curatedImage.findFirst({
    where: {
      status: CurationStatus.APPROVED,
      generatedCharId: null,
    },
  });

  let imageToUse = pendingImage;

  if (!pendingImage) {
    console.log('⚠️  No available curated images found');
    console.log('Looking for any approved image...');

    const anyApproved = await prisma.curatedImage.findFirst({
      where: {
        status: CurationStatus.APPROVED,
      },
    });

    if (!anyApproved) {
      console.log('❌ No approved images found. Please curate an image first.');
      await prisma.$disconnect();
      return;
    }

    console.log(`Found approved image: ${anyApproved.id}`);
    console.log('Resetting for test...');

    // Reset for test
    await prisma.curatedImage.update({
      where: { id: anyApproved.id },
      data: { generatedCharId: null },
    });

    imageToUse = anyApproved;
  }

  if (!imageToUse) {
    console.log('❌ No image available for test.');
    await prisma.$disconnect();
    return;
  }

  console.log(`Using image: ${imageToUse.id}`);
  console.log('\n[Step 1] Running batch generation...');

  const startTime = Date.now();

  try {
    const results = await batchCharacterGenerator.generateBatch({
      count: 1,
    });

    const duration = Date.now() - startTime;

    console.log(`\n✅ Batch generation completed in ${duration}ms`);
    console.log(`   Success: ${results.successCount}`);
    console.log(`   Failed: ${results.failureCount}`);

    if (results.results && results.results.length > 0) {
      const result = results.results[0];
      console.log(`\n   Character ID: ${result.characterId}`);
      console.log(`   Success: ${result.success}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }

    // Check if references were generated
    if (results.results && results.results[0] && results.results[0].characterId) {
      const characterId = results.results[0].characterId;

      console.log('\n[Step 2] Waiting for avatar generation...');
      // Wait for avatar to complete (max 10 minutes)
      for (let i = 0; i < 120; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

        const avatar = await prisma.characterImage.findFirst({
          where: {
            characterId,
            type: 'AVATAR',
            isActive: true,
          },
        });

        if (avatar) {
          console.log(`   ✅ Avatar found!`);
          break;
        }

        if (i % 6 === 0) {
          console.log(`   Waiting... (${i * 5}s elapsed)`);
        }
      }

      console.log('\n[Step 3] Checking generated images...');

      const images = await prisma.characterImage.findMany({
        where: { characterId },
        select: { type: true, isActive: true },
      });

      const refs = images.filter(i => i.type === 'REFERENCE');
      const avatar = images.find(i => i.type === 'AVATAR');

      console.log(`   Avatar: ${avatar ? '✅' : '❌'}`);
      console.log(`   References: ${refs.length}/4`);

      if (refs.length === 4) {
        console.log('\n✅ SUCCESS: All 4 references generated!');
        refs.forEach((ref, i) => {
          console.log(`   [${i + 1}] REFERENCE (active: ${ref.isActive})`);
        });
      } else {
        console.log('\n❌ FAIL: References not generated');
        console.log('   Expected 4 references, got ' + refs.length);
      }
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : error}`);
  }

  await prisma.$disconnect();
}

testStep8().catch(console.error);
