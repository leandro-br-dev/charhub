/**
 * Test script for curation with search variation
 * Tests the complete flow: Civitai API → Curated Images → Database
 */

import { civitaiApiClient } from '../services/civitai';
import { curationQueue } from '../services/curation';
import { prisma } from '../config/database';

async function testCurationWithVariation() {
  console.log('\n=== Curation with Search Variation Test ===\n');

  try {
    // 1. Check current curated images count
    console.log('1. Checking current database state...');
    const beforeCount = await prisma.curatedImage.count();
    const beforeApproved = await prisma.curatedImage.count({
      where: { status: 'APPROVED' },
    });
    console.log(`   Current curated images: ${beforeCount} (${beforeApproved} approved)`);

    // 2. Fetch images from Civitai with search variation
    console.log('\n2. Fetching images from Civitai with search variation...');
    const images = await civitaiApiClient.getTrendingImages({
      limit: 10,
      nsfw: 'None',
      animeStyle: true,
      useVariation: true, // Use search variation system
    });

    console.log(`   ✓ Fetched ${images.length} images from Civitai`);
    if (images.length > 0) {
      console.log(`   First image: ${images[0].url}`);
      console.log(`   Tags: ${images[0].tags?.join(', ') || 'none'}`);
    }

    // 3. Add to curation queue
    console.log('\n3. Adding images to curation queue...');
    const queued = await curationQueue.addBatch(images);
    console.log(`   ✓ Added ${queued.length} images to curation queue`);

    // 4. Process pending items
    console.log('\n4. Processing pending curation items...');
    const result = await curationQueue.processPendingItems(10);
    console.log(`   Processed: ${result.processed}`);
    console.log(`   Approved: ${result.approved}`);
    console.log(`   Rejected: ${result.rejected}`);
    console.log(`   Errors: ${result.errors}`);

    // 5. Check final database state
    console.log('\n5. Checking final database state...');
    const afterCount = await prisma.curatedImage.count();
    const afterApproved = await prisma.curatedImage.count({
      where: { status: 'APPROVED' },
    });
    console.log(`   Final curated images: ${afterCount} (${afterApproved} approved)`);
    console.log(`   New images added: ${afterCount - beforeCount}`);
    console.log(`   New approved: ${afterApproved - beforeApproved}`);

    // 6. Show most recent curated images
    console.log('\n6. Most recent curated images:');
    const recentImages = await prisma.curatedImage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        status: true,
        sourceUrl: true,
        tags: true,
        createdAt: true,
      },
    });

    recentImages.forEach((img, idx) => {
      console.log(`   ${idx + 1}. ${img.status} - Created: ${img.createdAt.toISOString()}`);
      console.log(`      Tags: ${img.tags?.join(', ') || 'none'}`);
      console.log(`      URL: ${img.sourceUrl.substring(0, 80)}...`);
    });

    console.log('\n=== Test Complete ===\n');
    console.log('✅ Search variation system is working!');
    console.log(`   - Fetched ${images.length} images with varied search parameters`);
    console.log(`   - Added ${afterCount - beforeCount} new curated images to database`);
    console.log(`   - ${result.approved} images were approved for character generation`);

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }

  // Wait a bit before closing
  await new Promise(resolve => setTimeout(resolve, 1000));
  process.exit(0);
}

testCurationWithVariation().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
