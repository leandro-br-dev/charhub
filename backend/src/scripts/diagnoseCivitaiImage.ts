/**
 * Diagnostic script for Civit.ai image analysis
 * Run with: npx ts-node src/scripts/diagnoseCivitaiImage.ts <image_url>
 */

import { analyzeCharacterImage } from '../agents/characterImageAnalysisAgent';
import { classifyImageViaLLM } from '../agents/imageClassificationAgent';
import { contentAnalyzer } from '../services/curation/contentAnalyzer';
import { qualityScorer } from '../services/curation/qualityScorer';

async function diagnoseImage(imageUrl: string) {
  console.log('=== CIVITAI IMAGE DIAGNOSTIC ===\n');
  console.log(`Image URL: ${imageUrl}\n`);

  // 1. Test character image analysis
  console.log('--- 1. CHARACTER IMAGE ANALYSIS ---');
  try {
    const characterAnalysis = await analyzeCharacterImage(imageUrl);
    console.log('Success!');
    console.log(JSON.stringify(characterAnalysis, null, 2));
  } catch (error) {
    console.error('FAILED:', error);
  }

  // 2. Test image classification
  console.log('\n--- 2. IMAGE CLASSIFICATION ---');
  try {
    const classification = await classifyImageViaLLM(imageUrl);
    console.log('Success!');
    console.log(JSON.stringify(classification, null, 2));
  } catch (error) {
    console.error('FAILED:', error);
  }

  // 3. Test content analyzer
  console.log('\n--- 3. CONTENT ANALYZER ---');
  try {
    const contentAnalysis = await contentAnalyzer.analyzeImage(imageUrl, {
      checkDuplicates: false,
    });
    console.log('Success!');
    console.log(JSON.stringify(contentAnalysis, null, 2));

    // Check quality score
    console.log('\n--- 4. QUALITY SCORE ---');
    const qualityResult = qualityScorer.scoreQuality(contentAnalysis);
    console.log(JSON.stringify(qualityResult, null, 2));

    // Check approval decision
    console.log('\n--- 5. APPROVAL DECISION ---');
    const shouldReject = contentAnalyzer.shouldReject(contentAnalysis);
    const shouldApprove = contentAnalyzer.shouldAutoApproved(contentAnalysis);

    console.log(`Should reject: ${shouldReject}`);
    console.log(`Should auto-approve: ${shouldApprove}`);
    console.log(`Quality score: ${contentAnalysis.qualityScore}/5.0`);
    console.log(`Recommendation: ${qualityResult.recommendation}`);

  } catch (error) {
    console.error('FAILED:', error);
  }

  console.log('\n=== DIAGNOSTIC COMPLETE ===');
}

// Get image URL from command line or use a sample
const imageUrl = process.argv[2] || 'https://image.civitai.com/x/y/123456';

diagnoseImage(imageUrl)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
