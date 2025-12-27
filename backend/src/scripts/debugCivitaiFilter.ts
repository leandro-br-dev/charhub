/**
 * Debug script to test Civitai API filtering
 */

import axios from 'axios';

interface CivitaiImage {
  id: string;
  url: string;
  hash: string;
  width: number;
  height: number;
  nsfw: string;
  nsfwLevel: number;
  stats?: {
    cryCount: number;
    rating: number;
    ratingCount: number;
  };
  meta?: {
    [key: string]: any;
  };
  post?: {
    id: string;
    title?: string;
    user?: string;
    publishedAt?: string;
  };
  tags?: string[];
  baseModel?: string;
}

async function testCivitaiApi() {
  console.log('\n=== Civitai API Filter Debug ===\n');

  try {
    // Test 1: Basic call without filters
    console.log('1. Testing basic API call (no filters)...');
    const basicResponse = await axios.get<{ items: CivitaiImage[] }>(
      'https://civitai.com/api/v1/images',
      {
        params: {
          limit: 10,
          nsfw: 'None',
          period: 'Week',
          sort: 'Most Reactions',
        },
      }
    );
    console.log(`   ✓ Fetched ${basicResponse.data.items.length} images`);

    // Test 2: Call with types parameter
    console.log('\n2. Testing with types=image parameter...');
    const typesResponse = await axios.get<{ items: CivitaiImage[] }>(
      'https://civitai.com/api/v1/images',
      {
        params: {
          limit: 10,
          nsfw: 'None',
          period: 'Week',
          sort: 'Most Reactions',
          types: 'image',
        },
      }
    );
    console.log(`   ✓ Fetched ${typesResponse.data.items.length} images with types filter`);

    // Test 3: Apply anime filter
    console.log('\n3. Analyzing images for anime character criteria...');
    const images = typesResponse.data.items;

    let passedFilter = 0;
    let failedFilter = 0;

    const animeModelKeywords = [
      'anime',
      'anything',
      'counterfeit',
      'dreamlike',
      'pastel',
      'meinamix',
      'niji',
      'cetus',
      'fantasy',
      'ghost',
      'moxie',
      '7th',
      'f222',
      'orangemix',
      'someya',
      'acertain',
    ];

    const samplers = [
      'euler',
      'euler a',
      'ddim',
      'plms',
      'dpm++',
      'dpmsolver',
    ];

    for (const img of images) {
      const meta = img.meta;

      if (!meta) {
        console.log(`   ✗ Image ${img.id}: No metadata`);
        failedFilter++;
        continue;
      }

      // Check model name
      const modelName = (meta.Model || meta.sd_model_name || '').toLowerCase();
      const hasAnimeModel = animeModelKeywords.some(keyword => modelName.includes(keyword));

      // Check sampler
      const samplerName = (meta.Sampler || meta.sampler_name || '').toLowerCase();
      const hasCharacterSampler = samplers.some(s => samplerName.includes(s));

      // Check aspect ratio
      const aspectRatio = img.width / img.height;
      const isPortraitOrSquare = aspectRatio >= 0.5 && aspectRatio <= 2.0;
      const reasonableResolution = img.width >= 512 && img.height >= 512;

      const passed = hasAnimeModel && hasCharacterSampler && isPortraitOrSquare && reasonableResolution;

      if (passed) {
        console.log(`   ✓ Image ${img.id}: PASSED`);
        console.log(`     - Model: ${modelName}`);
        console.log(`     - Sampler: ${samplerName}`);
        console.log(`     - Size: ${img.width}x${img.height}`);
        console.log(`     - Base Model: ${img.baseModel || 'N/A'}`);
        passedFilter++;
      } else {
        console.log(`   ✗ Image ${img.id}: FAILED`);
        console.log(`     - Model: ${modelName} (anime: ${hasAnimeModel})`);
        console.log(`     - Sampler: ${samplerName} (valid: ${hasCharacterSampler})`);
        console.log(`     - Size: ${img.width}x${img.height} (valid: ${isPortraitOrSquare && reasonableResolution})`);
        console.log(`     - Base Model: ${img.baseModel || 'N/A'}`);
        failedFilter++;
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Total images fetched: ${images.length}`);
    console.log(`Passed anime filter: ${passedFilter}`);
    console.log(`Failed anime filter: ${failedFilter}`);
    console.log(`Filter success rate: ${((passedFilter / images.length) * 100).toFixed(1)}%`);

    // Test 4: Try without the anime filter
    console.log('\n4. Recommendation:');
    if (passedFilter === 0) {
      console.log('   ⚠️  The anime character filter is TOO RESTRICTIVE');
      console.log('   ⚠️  0% of images pass the filter criteria');
      console.log('   ⚠️  This explains why no characters are being generated');
      console.log('\n   Suggested fixes:');
      console.log('   1. Remove or disable the anime filter (animeStyle=false)');
      console.log('   2. Use modelId parameter to filter by specific anime models');
      console.log('   3. Relax the filtering criteria to accept more images');
      console.log('   4. Use different search parameters (sort by Newest instead of Most Reactions)');
    } else {
      console.log(`   ✓ Filter is working, ${passedFilter} images matched`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testCivitaiApi().catch(console.error);
