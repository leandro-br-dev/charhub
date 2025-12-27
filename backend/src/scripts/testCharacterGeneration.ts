/**
 * Test character generation from curated images
 * Tests the complete flow: Curated Images → Character Generation
 */

import { batchCharacterGenerator } from '../services/batch';
import { prisma } from '../config/database';

async function testCharacterGeneration() {
  console.log('\n=== Character Generation from Curated Images Test ===\n');

  try {
    // 1. Check approved curated images
    console.log('1. Checking approved curated images...');
    const approvedImages = await prisma.curatedImage.findMany({
      where: { status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
    });
    console.log(`   Total approved images: ${approvedImages.length}`);
    if (approvedImages.length === 0) {
      console.log('   ❌ No approved images available for character generation!');
      process.exit(1);
    }

    // 2. Check existing characters count
    console.log('\n2. Checking current characters count...');
    const beforeCount = await prisma.character.count();
    console.log(`   Current characters in database: ${beforeCount}`);

    // 3. Trigger batch character generation
    console.log('\n3. Generating characters from curated images...');
    console.log(`   Requesting generation of 3 characters...`);

    const botUserId = process.env.OFFICIAL_BOT_USER_ID || '00000000-0000-0000-0000-000000000001';

    const result = await batchCharacterGenerator.generateBatch({
      count: 3,
      userId: botUserId,
    });

    console.log('\n4. Generation Results:');
    console.log(`   ✓ Success: ${result.successCount} characters`);
    console.log(`   ✗ Failures: ${result.failureCount}`);
    console.log(`   ⏱ Total duration: ${result.totalDuration}ms`);
    if (result.successCount > 0) {
      console.log(`   ⏱ Average per character: ${Math.round(result.totalDuration / result.successCount)}ms`);
    }

    // 4. Show generated characters
    if (result.successCount > 0) {
      console.log('\n5. Generated Characters:');
      const newCharacters = await prisma.character.findMany({
        orderBy: { createdAt: 'desc' },
        take: result.successCount,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          age: true,
          species: true,
          visibility: true,
          createdAt: true,
        },
      });

      newCharacters.forEach((char, idx) => {
        const fullName = `${char.firstName}${char.lastName ? ' ' + char.lastName : ''}`;
        console.log(`\n   ${idx + 1}. ${fullName}`);
        console.log(`      ID: ${char.id}`);
        console.log(`      Age: ${char.age || 'unknown'}`);
        console.log(`      Species: ${char.species || 'unknown'}`);
        console.log(`      Visibility: ${char.visibility}`);
        console.log(`      Created at: ${char.createdAt.toISOString()}`);
      });
    }

    // 5. Show failures if any
    if (result.failureCount > 0) {
      console.log('\n6. Failures:');
      const failedResults = result.results.filter(r => !r.success);
      failedResults.forEach((failure, idx) => {
        console.log(`   ${idx + 1}. Error: ${failure.error || 'Unknown error'}`);
        console.log(`      Image ID: ${failure.curatedImageId}`);
        if (failure.duration) {
          console.log(`      Duration: ${failure.duration}ms`);
        }
      });
    }

    // 6. Check final database state
    console.log('\n7. Final Database State:');
    const afterCount = await prisma.character.count();
    console.log(`   Total characters: ${afterCount}`);
    console.log(`   New characters added: ${afterCount - beforeCount}`);

    // Check curated images status
    const approvedAfter = await prisma.curatedImage.count({
      where: { status: 'APPROVED' },
    });
    const completedAfter = await prisma.curatedImage.count({
      where: { status: 'COMPLETED' },
    });
    console.log(`\n   Curated images status:`);
    console.log(`   - APPROVED: ${approvedAfter} (available for generation)`);
    console.log(`   - COMPLETED: ${completedAfter} (already used)`);

    console.log('\n=== Test Complete ===\n');
    if (result.successCount > 0) {
      console.log(`✅ Successfully generated ${result.successCount} characters!`);
      console.log(`   Characters are ready for review and can be published.`);
    } else {
      console.log('❌ No characters were generated. Check the errors above.');
    }

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }

  // Wait before closing
  await new Promise(resolve => setTimeout(resolve, 1000));
  process.exit(0);
}

testCharacterGeneration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
