/**
 * Test Reference Generation on Existing Character
 *
 * This script tests the reference generation feature (avatar + 4 references)
 * on an existing character that already has an avatar.
 *
 * Usage:
 *   npx ts-node src/scripts/testReferenceGeneration.ts <characterId>
 */

import { prisma } from '../config/database';
import { multiStageCharacterGenerator } from '../services/image-generation/multiStageCharacterGenerator';

async function testReferenceGeneration(characterId: string) {
  console.log('=== REFERENCE GENERATION TEST ===\n');

  // 1. Check character exists
  console.log('[1/4] Checking character...');
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: {
      species: true,
    },
  });

  if (!character) {
    console.log(`  ❌ Character not found: ${characterId}`);
    return;
  }

  console.log(`  ✅ Character found`);
  console.log(`     Name: ${character.firstName} ${character.lastName || ''}`);
  console.log(`     Species: ${character.species?.name || 'N/A'}`);
  console.log(`     Gender: ${character.gender || 'N/A'}`);

  // 2. Check existing images
  console.log('\n[2/4] Checking existing images...');
  const existingImages = await prisma.characterImage.findMany({
    where: { characterId },
    orderBy: { type: 'asc' },
  });

  console.log(`  Found ${existingImages.length} image(s):`);
  existingImages.forEach(img => {
    console.log(`    - ${img.type}: ${img.content || 'no content'}`);
  });

  // 3. Build prompt
  console.log('\n[3/4] Building prompt...');
  const { buildImagePrompt } = await import('../services/image-generation/promptBuilder');

  const prompt = buildImagePrompt(
    character,
    character.species,
    undefined, // No custom positive prompt
    undefined  // No custom negative prompt
  );

  console.log(`  ✅ Prompt built (length: ${prompt.positive?.length || 0} chars)`);

  // 4. Generate references
  console.log('\n[4/4] Generating references...');
  console.log('  This will generate 4 reference views: face, front, side, back');
  console.log('  Please wait...');

  try {
    const startTime = Date.now();

    await multiStageCharacterGenerator.generateCharacterDataset({
      characterId,
      prompt,
      loras: [],
      userSamples: [],
      userId: process.env.OFFICIAL_BOT_USER_ID || '00000000-0000-0000-0000-000000000001',
      userRole: 'ADMIN',
      onProgress: (stage, total, message) => {
        console.log(`  [${stage}/${total}] ${message}`);
      },
    });

    const duration = Date.now() - startTime;
    console.log(`\n  ✅ Reference generation completed in ${duration}ms`);

    // 5. Verify results
    console.log('\n[5/5] Verifying results...');
    const finalImages = await prisma.characterImage.findMany({
      where: { characterId },
      orderBy: { type: 'asc' },
    });

    console.log(`  Total images: ${finalImages.length}`);

    const byType: Record<string, number> = {};
    finalImages.forEach(img => {
      byType[img.type] = (byType[img.type] || 0) + 1;
    });

    console.log('\n  Breakdown by type:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`    ${type}: ${count}`);
    });

    const references = finalImages.filter(img => img.type === 'REFERENCE');
    console.log(`\n  Reference images: ${references.length}`);

    if (references.length > 0) {
      console.log('\n  Reference details:');
      references.forEach(ref => {
        console.log(`    - ${ref.content || 'unknown'}: ${ref.url}`);
      });
    }

    console.log('\n=== TEST COMPLETE ===');
    console.log(`\nSummary:`);
    console.log(`  - Before: ${existingImages.length} images`);
    console.log(`  - After: ${finalImages.length} images`);
    console.log(`  - New references: ${finalImages.length - existingImages.length}`);
    console.log(`  - Total references: ${references.length}/4`);

  } catch (error) {
    console.log(`\n  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  await prisma.$disconnect();
}

// Main execution
async function main() {
  const characterId = process.argv[2];

  if (!characterId) {
    // Try to get a recent character
    const recentChar = await prisma.character.findFirst({
      where: {
        visibility: 'PUBLIC',
      },
      include: {
        species: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentChar) {
      console.log(`No character ID provided. Using most recent: ${recentChar.id}\n`);
      await testReferenceGeneration(recentChar.id);
    } else {
      console.error('No characters found. Please provide a character ID:');
      console.error('  npx ts-node src/scripts/testReferenceGeneration.ts <characterId>');
    }
  } else {
    await testReferenceGeneration(characterId);
  }

  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
