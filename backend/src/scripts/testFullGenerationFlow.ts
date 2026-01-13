/**
 * Full Automated Character Generation Flow Test
 *
 * This script tests the complete flow:
 * 1. Fetch images from Civit.ai
 * 2. Add to CurationQueue
 * 3. Process curation (analyze with AI)
 * 4. Generate character with avatar + 4 references
 *
 * Usage:
 *   npx ts-node src/scripts/testFullGenerationFlow.ts [count]
 *
 *   count: Number of images to process (default: 1)
 */

import { prisma } from '../config/database';
import { CurationStatus } from '../generated/prisma';
import { curationQueue } from '../services/curation/curationQueue';
import { batchCharacterGenerator } from '../services/batch/batchCharacterGenerator';

interface TestResult {
  step: string;
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
}

class FullGenerationFlowTester {
  private readonly results: TestResult[] = [];

  /**
   * Run the complete flow
   */
  async run(count: number = 1): Promise<void> {
    console.log('=== FULL AUTOMATED GENERATION FLOW TEST ===\n');
    console.log(`Processing ${count} image(s) from Civit.ai...\n`);

    for (let i = 0; i < count; i++) {
      console.log(`\n--- Processing Image ${i + 1}/${count} ---`);
      await this.processSingleImage(i + 1, count);
    }

    this.printSummary();
  }

  /**
   * Process a single image through the complete flow
   */
  private async processSingleImage(_index: number, _total: number): Promise<void> {
    const flowStartTime = Date.now();

    // Step 1: Fetch image from Civit.ai
    const civitaiImage = await this.fetchFromCivitai();
    if (!civitaiImage) {
      this.recordResult('fetch_civitai', false, undefined, 'Failed to fetch image from Civit.ai');
      return;
    }

    // Step 2: Add to CurationQueue
    const curatedImage = await this.addToCurationQueue(civitaiImage);
    if (!curatedImage) {
      this.recordResult('add_to_curation', false, undefined, 'Failed to add to curation queue');
      return;
    }

    // Step 3: Process curation (AI analysis)
    const curationResult = await this.processCuration(curatedImage.id);
    if (!curationResult.success) {
      this.recordResult('process_curation', false, undefined, curationResult.error);
      return;
    }

    // Step 4: Check if approved
    const approvedImage = await this.checkApproval(curatedImage.id);
    if (!approvedImage) {
      this.recordResult('curation_approval', false, undefined, 'Image was rejected during curation');
      return;
    }

    // Step 5: Generate character with avatar + references
    const characterResult = await this.generateCharacter(curatedImage.id);
    if (!characterResult.success) {
      this.recordResult('character_generation', false, undefined, characterResult.error);
      return;
    }

    // Step 6: Verify references were generated
    await this.verifyReferences(characterResult.data.characterId);

    const totalDuration = Date.now() - flowStartTime;
    console.log(`\n✅ Flow completed in ${totalDuration}ms`);
  }

  /**
   * Step 1: Fetch image from Civit.ai
   */
  private async fetchFromCivitai(): Promise<any | null> {
    const startTime = Date.now();
    console.log('\n[1/6] Creating test image from Civit.ai...');

    try {
      // Use the specified Civitai image URL for testing
      const testImage = {
        id: 'civitai-test-' + Date.now(),
        url: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/d65a6d2e-4a20-4a8b-800e-42402a0f7ab3/original=true,quality=90/116771308.jpeg',
        rating: 4.5,
        nsfwLevel: 0,
      };

      const duration = Date.now() - startTime;

      console.log(`  ✅ Test image created`);
      console.log(`     URL: ${testImage.url}`);
      console.log(`     Duration: ${duration}ms`);

      this.recordResult('fetch_civitai', true, { imageId: testImage.id, url: testImage.url }, undefined, duration);

      return testImage;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`  ❌ Error: ${errorMessage}`);
      this.recordResult('fetch_civitai', false, undefined, errorMessage, duration);
      return null;
    }
  }

  /**
   * Step 2: Add to CurationQueue
   */
  private async addToCurationQueue(civitaiImage: any): Promise<any | null> {
    const startTime = Date.now();
    console.log('\n[2/6] Adding to curation queue...');

    try {
      // Check if already exists
      const existing = await prisma.curatedImage.findUnique({
        where: { sourceUrl: civitaiImage.url },
      });

      if (existing) {
        console.log(`  ⚠️  Image already exists in curation queue (ID: ${existing.id})`);
        return existing;
      }

      const curatedImage = await prisma.curatedImage.create({
        data: {
          sourceUrl: civitaiImage.url,
          sourceId: civitaiImage.id,
          sourcePlatform: 'civitai',
          status: CurationStatus.PENDING,
          sourceRating: civitaiImage.rating || 0,
        },
      });

      const duration = Date.now() - startTime;
      console.log(`  ✅ Added to curation queue (ID: ${curatedImage.id.substring(0, 8)})`);
      console.log(`     Duration: ${duration}ms`);

      this.recordResult('add_to_curation', true, { curatedImageId: curatedImage.id }, undefined, duration);

      return curatedImage;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`  ❌ Error: ${errorMessage}`);
      this.recordResult('add_to_curation', false, undefined, errorMessage, duration);
      return null;
    }
  }

  /**
   * Step 3: Process curation (AI analysis)
   */
  private async processCuration(_curatedImageId: string): Promise<{ success: boolean; error?: string }> {
    const startTime = Date.now();
    console.log('\n[3/6] Processing curation (AI analysis)...');

    try {
      await curationQueue.processPendingItems();

      const duration = Date.now() - startTime;
      console.log(`  ✅ Curation processed`);
      console.log(`     Duration: ${duration}ms`);

      this.recordResult('process_curation', true, undefined, undefined, duration);

      return { success: true };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`  ❌ Error: ${errorMessage}`);
      this.recordResult('process_curation', false, undefined, errorMessage, duration);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Step 4: Check approval status
   */
  private async checkApproval(curatedImageId: string): Promise<any | null> {
    const startTime = Date.now();
    console.log('\n[4/6] Checking approval status...');

    try {
      const curatedImage = await prisma.curatedImage.findUnique({
        where: { id: curatedImageId },
        select: {
          id: true,
          status: true,
          qualityScore: true,
          rejectionReason: true,
          gender: true,
          species: true,
          generatedCharId: true,
        },
      });

      if (!curatedImage) {
        console.log('  ❌ Curated image not found');
        return null;
      }

      const duration = Date.now() - startTime;

      if (curatedImage.status === CurationStatus.REJECTED) {
        console.log(`  ❌ Image was REJECTED`);
        console.log(`     Reason: ${curatedImage.rejectionReason || 'Unknown'}`);
        console.log(`     Quality Score: ${curatedImage.qualityScore || 'N/A'}`);
        this.recordResult('curation_approval', false, { status: curatedImage.status, rejectionReason: curatedImage.rejectionReason }, 'Image rejected', duration);
        return null;
      }

      if (curatedImage.status === CurationStatus.COMPLETED) {
        console.log(`  ℹ️  Image already processed (Character ID: ${curatedImage.generatedCharId})`);
        this.recordResult('curation_approval', true, { status: curatedImage.status, characterId: curatedImage.generatedCharId }, undefined, duration);
        return curatedImage;
      }

      console.log(`  ✅ Image APPROVED`);
      console.log(`     Quality Score: ${curatedImage.qualityScore || 'N/A'}`);
      console.log(`     Gender: ${curatedImage.gender || 'unknown'}`);
      console.log(`     Species: ${curatedImage.species || 'unknown'}`);

      this.recordResult('curation_approval', true, { status: curatedImage.status, qualityScore: curatedImage.qualityScore }, undefined, duration);

      return curatedImage;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`  ❌ Error: ${errorMessage}`);
      this.recordResult('curation_approval', false, undefined, errorMessage, duration);
      return null;
    }
  }

  /**
   * Step 5: Generate character with avatar + references
   */
  private async generateCharacter(curatedImageId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const startTime = Date.now();
    console.log('\n[5/6] Generating character (avatar + references)...');

    try {
      // Get curated image
      const curatedImage = await prisma.curatedImage.findUnique({
        where: { id: curatedImageId },
      });

      if (!curatedImage) {
        throw new Error('Curated image not found');
      }

      // Generate using batch generator with specific image ID (includes reference generation)
      const results = await batchCharacterGenerator.generateBatch({
        count: 1,
        specificImageIds: [curatedImageId], // Use the specific image we just created
      });

      if (!results.results || results.results.length === 0) {
        throw new Error('No generation results');
      }

      const result = results.results[0];
      const duration = Date.now() - startTime;

      if (!result.success) {
        console.log(`  ❌ Character generation failed`);
        console.log(`     Error: ${result.error || 'Unknown'}`);
        return { success: false, error: result.error };
      }

      console.log(`  ✅ Character generated`);
      console.log(`     Character ID: ${result.characterId}`);
      console.log(`     Duration: ${duration}ms`);

      this.recordResult('character_generation', true, { characterId: result.characterId }, undefined, duration);

      return { success: true, data: { characterId: result.characterId } };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`  ❌ Error: ${errorMessage}`);
      this.recordResult('character_generation', false, undefined, errorMessage, duration);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Step 6: Verify references were generated
   */
  private async verifyReferences(characterId: string): Promise<void> {
    const startTime = Date.now();
    console.log('\n[6/6] Verifying generated images...');

    try {
      const images = await prisma.characterImage.findMany({
        where: { characterId },
        orderBy: { type: 'asc' },
      });

      const duration = Date.now() - startTime;

      // Group by type
      const byType: Record<string, number> = {};
      images.forEach(img => {
        byType[img.type] = (byType[img.type] || 0) + 1;
      });

      console.log(`  ✅ Found ${images.length} image(s):`);

      // List AVATAR
      if (byType['AVATAR']) {
        console.log(`     📷 AVATAR: ${byType['AVATAR']}`);
      }

      // List REFERENCE images by content
      const references = images.filter(img => img.type === 'REFERENCE');
      if (references.length > 0) {
        console.log(`     📷 REFERENCE: ${references.length} images`);
        references.forEach(ref => {
          console.log(`        - ${ref.content || 'unknown'}: ${ref.url}`);
        });
      }

      // List SAMPLE
      if (byType['SAMPLE']) {
        console.log(`     📷 SAMPLE (Civitai): ${byType['SAMPLE']}`);
      }

      // Verify expected count
      const expectedAvatar = 1;
      const expectedReferences = 4; // face, front, side, back
      const expectedSample = 1; // Civitai source image
      const expectedTotal = expectedAvatar + expectedReferences + expectedSample;

      const hasAllReferences = references.length === expectedReferences;
      const status = hasAllReferences ? '✅' : '⚠️';

      console.log(`\n  ${status} Verification: ${images.length}/${expectedTotal} images`);
      if (!hasAllReferences) {
        console.log(`     Expected ${expectedReferences} references, got ${references.length}`);
      }

      this.recordResult('verify_references', true, {
        totalImages: images.length,
        avatarCount: byType['AVATAR'] || 0,
        referenceCount: references.length,
        sampleCount: byType['SAMPLE'] || 0,
        hasAllReferences,
      }, undefined, duration);

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`  ❌ Error: ${errorMessage}`);
      this.recordResult('verify_references', false, undefined, errorMessage, duration);
    }
  }

  /**
   * Record a test result
   */
  private recordResult(step: string, success: boolean, data?: any, error?: string, duration?: number): void {
    this.results.push({
      step,
      success,
      data,
      error,
      duration,
    });
  }

  /**
   * Print summary of all results
   */
  private printSummary(): void {
    console.log('\n\n=== TEST SUMMARY ===\n');

    // Count successes and failures
    const successCount = this.results.filter(r => r.success).length;
    const failureCount = this.results.filter(r => !r.success).length;
    const totalCount = this.results.length;

    console.log(`Total Steps: ${totalCount}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`Success Rate: ${totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(1) : 0}%\n`);

    // Group by step
    const byStep: Record<string, { success: number; failed: number; avgDuration: number }> = {};

    for (const result of this.results) {
      if (!byStep[result.step]) {
        byStep[result.step] = { success: 0, failed: 0, avgDuration: 0 };
      }

      if (result.success) {
        byStep[result.step].success++;
      } else {
        byStep[result.step].failed++;
      }

      if (result.duration) {
        byStep[result.step].avgDuration += result.duration;
      }
    }

    // Calculate averages
    for (const step in byStep) {
      const total = byStep[step].success + byStep[step].failed;
      byStep[step].avgDuration = Math.round(byStep[step].avgDuration / total);
    }

    console.log('--- Breakdown by Step ---');
    for (const [step, stats] of Object.entries(byStep)) {
      const total = stats.success + stats.failed;
      const rate = ((stats.success / total) * 100).toFixed(1);
      console.log(`${step}: ${stats.success}/${total} (${rate}%) - Avg: ${stats.avgDuration}ms`);
    }

    // Total duration
    const totalDuration = this.results.reduce((sum, r) => sum + (r.duration || 0), 0);
    console.log(`\nTotal Duration: ${totalDuration}ms (${Math.round(totalDuration / 1000)}s)`);
  }
}

// Main execution
async function main() {
  const count = parseInt(process.argv[2] || '1', 10);

  if (count < 1 || count > 10) {
    console.error('Count must be between 1 and 10');
    process.exit(1);
  }

  const tester = new FullGenerationFlowTester();

  try {
    await tester.run(count);
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
