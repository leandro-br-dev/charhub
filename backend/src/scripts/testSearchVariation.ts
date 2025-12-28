/**
 * Test script for search variation system
 */

import { getVariedSearchParams, getAvailableTags } from '../services/civitai/searchVariation';
import { civitaiApiClient } from '../services/civitai';

async function testVariation() {
  console.log('\n=== Search Variation System Test ===\n');

  // 1. Test variation generation
  console.log('1. Testing variation generation (5 samples):');
  for (let i = 0; i < 5; i++) {
    const params = getVariedSearchParams();
    console.log(`   Sample ${i + 1}:`, params);
  }

  // 2. Show available tags
  console.log('\n2. Available character tags:');
  const tags = getAvailableTags();
  console.log(`   Total tags: ${tags.length}`);
  console.log(`   Tags: ${tags.join(', ')}`);

  // 3. Test actual API call with tag
  console.log('\n3. Testing Civitai API with tag "woman":');
  try {
    const images = await civitaiApiClient.getTrendingImages({
      limit: 3,
      nsfw: 'None',
      tag: 'woman',
      useVariation: false, // Don't use random variation for this test
      animeStyle: true,
    });

    console.log(`   ✓ Fetched ${images.length} images with tag "woman"`);
    if (images.length > 0) {
      console.log(`   First image URL: ${images[0].url}`);
    }
  } catch (error: any) {
    console.error(`   ✗ Error: ${error.message}`);
  }

  // 4. Test API call with automatic variation
  console.log('\n4. Testing Civitai API with automatic variation:');
  try {
    const images = await civitaiApiClient.getTrendingImages({
      limit: 3,
      nsfw: 'None',
      useVariation: true, // Use random variation
      animeStyle: true,
    });

    console.log(`   ✓ Fetched ${images.length} images with automatic variation`);
    if (images.length > 0) {
      console.log(`   First image URL: ${images[0].url}`);
    }
  } catch (error: any) {
    console.error(`   ✗ Error: ${error.message}`);
  }

  console.log('\n=== Test Complete ===\n');
}

testVariation()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
