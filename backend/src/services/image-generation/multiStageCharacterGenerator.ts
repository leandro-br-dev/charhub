/**
 * Multi-Stage Character Generator Service (Refactored)
 *
 * Simplified flow:
 * 1. Generate AVATAR first (with or without user SAMPLEs)
 * 2. Create temp folder with character UUID
 * 3. Add AVATAR + SAMPLES to folder
 * 4. Generate REFERENCE front (using AVATAR + SAMPLEs)
 * 5. Add REFERENCE front to folder
 * 6. Generate REFERENCE side (using AVATAR + SAMPLEs + REFERENCE front)
 * 7. Add REFERENCE side to folder
 * 8. Generate REFERENCE back (using all previous images)
 * 9. SAMPLEs can be discarded after reference pack is complete
 *
 * All REFERENCE images use the same ImageType.REFERENCE with `content` field
 * describing the view: "face", "front", "side", "back"
 */

import { comfyuiService } from '../comfyui/comfyuiService';
import { r2Service } from '../r2Service';
import { canEditCharacter } from '../../middleware/authorization';
import { prisma } from '../../config/database';
import type { ReferenceImage } from '../comfyui/types';
import type { UserRole } from '../../types';
import { logger } from '../../config/logger';
import { ImageType } from '../../generated/prisma';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load workflow JSON files using fs.readFileSync
const multiRefFaceWorkflow = JSON.parse(
  readFileSync(join(__dirname, '../comfyui/workflows/multi-ref-face.workflow.json'), 'utf-8')
);
const multiRefFrontWorkflow = JSON.parse(
  readFileSync(join(__dirname, '../comfyui/workflows/multi-ref-front.workflow.json'), 'utf-8')
);

export interface MultiStageGenerationOptions {
  characterId: string;
  prompt: {
    positive: string;
    negative: string;
  };
  loras?: Array<{
    name: string;
    filepathRelative: string;
    strength: number;
  }>;
  userSamples?: ReferenceImage[]; // User-provided SAMPLE images (1-4)
  userId: string;
  userRole?: UserRole;
  onProgress?: (stage: number, total: number, message: string, completedImages?: Array<{ content: string; url: string }>) => void;
  viewsToGenerate?: ('face' | 'front' | 'side' | 'back')[]; // Optional: specific views to generate
}

export interface ReferenceView {
  content: 'face' | 'front' | 'side' | 'back';
  width: number;
  height: number;
  promptPrefix: string;
  promptNegative: string;
}

const REFERENCE_VIEWS: ReferenceView[] = [
  {
    content: 'face',
    width: 768,
    height: 768,
    promptPrefix: 'portrait, headshot, face focus, detailed facial features,',
    promptNegative: 'full body, multiple views, wide angle,',
  },
  {
    content: 'front',
    width: 768,
    height: 1152,
    promptPrefix: 'full body, standing, front view, looking at camera,',
    promptNegative: 'cropped, headshot only, side view, back view,',
  },
  {
    content: 'side',
    width: 768,
    height: 1152,
    promptPrefix: 'full body, standing, side view, profile,',
    promptNegative: 'front view, back view, looking at camera,',
  },
  {
    content: 'back',
    width: 768,
    height: 1152,
    promptPrefix: 'full body, standing, back view, rear view,',
    promptNegative: 'front view, face visible, looking at camera,',
  },
];

export class MultiStageCharacterGenerator {
  /**
   * Generate complete 4-stage reference dataset for a character
   * New simplified flow with cumulative references in a single folder
   */
  async generateCharacterDataset(options: MultiStageGenerationOptions): Promise<void> {
    const { characterId, prompt, userSamples = [], userId, userRole, onProgress, viewsToGenerate } = options;

    // Filter views to generate if specified
    const viewsToProcess = viewsToGenerate && viewsToGenerate.length > 0
      ? REFERENCE_VIEWS.filter(v => viewsToGenerate.includes(v.content))
      : REFERENCE_VIEWS;

    logger.info({ characterId, userSamples: userSamples.length, viewsToGenerate: viewsToProcess.map(v => v.content) }, 'Starting multi-stage character generation (simplified)');

    // Import promptAgent dynamically to avoid circular dependencies
    const { promptAgent } = await import('../comfyui/promptAgent');

    try {
      // Verify character ownership
      const character = await prisma.character.findUnique({
        where: { id: characterId },
      });

      if (!character) {
        throw new Error('Character not found');
      }

      // Check if user can edit the character (owner OR admin for official characters)
      if (!canEditCharacter(userId, userRole, character.userId)) {
        throw new Error('Character not found or unauthorized');
      }

      // Check if avatar already exists
      const existingAvatar = await prisma.characterImage.findFirst({
        where: {
          characterId,
          type: ImageType.AVATAR,
          isActive: true,
        },
      });

      if (!existingAvatar) {
        throw new Error('Avatar must be generated first. Please generate an avatar before creating reference images.');
      }

      // Fetch full character data for prompt generation
      const fullCharacter = await prisma.character.findUnique({
        where: { id: characterId },
        include: {
          species: true,
          mainAttire: true,
          lora: true,
        },
      });

      if (!fullCharacter) {
        throw new Error('Character not found');
      }

      // Generate prompts using promptAgent
      // The prompt.positive from API is treated as user input (additive)
      const userPrompt = prompt?.positive || '';
      const generatedPrompts = await promptAgent.generatePrompts({
        character: {
          name: `${fullCharacter.firstName} ${fullCharacter.lastName || ''}`.trim(),
          gender: fullCharacter.gender || undefined,
          age: fullCharacter.age || undefined,
          species: fullCharacter.species?.name || undefined,
          physicalCharacteristics: fullCharacter.physicalCharacteristics || undefined,
          personality: fullCharacter.personality || undefined,
          defaultAttire: fullCharacter.mainAttire?.description || undefined,
          style: fullCharacter.style || undefined,
        },
        generation: {
          type: 'REFERENCE_FRONT', // Will be adjusted per view, but use front as default
          isNsfw: false,
        },
        userInput: userPrompt ? {
          prompt: userPrompt,
          isAdditive: true, // Reference generation is additive
        } : undefined,
        hasReferenceImages: userSamples.length > 0,
        referenceImageCount: userSamples.length,
      });

      // Use generated prompts
      const finalPrompt = {
        positive: generatedPrompts.positive,
        negative: generatedPrompts.negative,
      };

      logger.info({ characterId, originalPrompt: userPrompt, generatedPositive: finalPrompt.positive?.substring(0, 100) + '...' }, 'Prompts generated via promptAgent');

      // Update loras from character data
      const characterLoras = fullCharacter.lora ? [{
        name: fullCharacter.lora.name,
        filepathRelative: fullCharacter.lora.filepathRelative || '',
        strength: 1.0,
      }] : [];

      // Delete existing reference images for the views being regenerated
      logger.info({ characterId, regeneratingViews: viewsToProcess.map(v => v.content) }, 'Checking for existing reference images to delete...');

      const existingReferences = await prisma.characterImage.findMany({
        where: {
          characterId,
          type: ImageType.REFERENCE,
          content: {
            in: viewsToProcess.map(v => v.content),
          },
        },
      });

      logger.info({ characterId, count: existingReferences.length }, `Found ${existingReferences.length} existing reference images for selected views`);

      if (existingReferences.length > 0) {
        logger.info({ characterId, count: existingReferences.length }, 'Deleting existing reference images for selected views before generating new ones');

        for (const ref of existingReferences) {
          logger.info({ imageId: ref.id, key: ref.key, url: ref.url, content: ref.content }, 'Processing reference image for deletion');

          // Delete from R2 if key exists
          if (ref.key) {
            try {
              await r2Service.deleteObject(ref.key);
              logger.info({ key: ref.key }, 'Successfully deleted reference image from R2');
            } catch (err) {
              logger.error({ key: ref.key, err }, 'Failed to delete reference image from R2, continuing...');
            }
          } else {
            logger.warn({ imageId: ref.id }, 'Reference image has no key, skipping R2 deletion');
          }
        }

        // Delete from database
        await prisma.characterImage.deleteMany({
          where: {
            characterId,
            type: ImageType.REFERENCE,
            content: {
              in: viewsToProcess.map(v => v.content),
            },
          },
        });

        logger.info({ characterId, count: existingReferences.length }, 'Successfully deleted existing reference images from database');
      }

      // Step 1: Prepare temp folder with AVATAR + USER SAMPLES
      onProgress?.(0, viewsToProcess.length, 'Preparing reference folder...');

      const referenceImages: ReferenceImage[] = [
        { type: 'AVATAR', url: existingAvatar.url },
        ...userSamples.map(s => ({ type: 'SAMPLE', url: s.url })),
      ];

      const prepareResponse = await comfyuiService.prepareReferences(characterId, referenceImages);
      logger.info({ referencePath: prepareResponse.referencePath, imageCount: referenceImages.length }, 'Reference folder prepared');

      // Step 2-4: Generate each reference view, adding each to the folder
      // Generate timestamp for this batch to ensure unique keys
      const batchTimestamp = Date.now();

      // Get all existing references for views NOT being regenerated (to use as context)
      const existingOtherReferences = await prisma.characterImage.findMany({
        where: {
          characterId,
          type: ImageType.REFERENCE,
          content: {
            notIn: viewsToProcess.map(v => v.content),
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      logger.info({ characterId, otherReferencesCount: existingOtherReferences.length }, 'Found existing reference images for other views');

      // Track completed images for progress callback
      const completedImages: Array<{ content: string; url: string }> = [];

      for (let i = 0; i < viewsToProcess.length; i++) {
        const view = viewsToProcess[i];
        const stageNumber = i + 1;

        // For stages after the first, re-prepare with ALL previously generated images
        // + existing references from views NOT being regenerated
        if (i > 0) {
          // Build fresh reference list: AVATAR + SAMPLES + existing other refs + newly generated refs
          const freshReferences: ReferenceImage[] = [
            { type: 'AVATAR', url: existingAvatar.url },
            ...userSamples.map(s => ({ type: 'SAMPLE', url: s.url })),
          ];

          // Add existing references from other views (not being regenerated)
          for (const existingRef of existingOtherReferences) {
            freshReferences.push({ type: 'REFERENCE', url: existingRef.url });
          }

          // Add all previously generated reference images in this batch
          for (let j = 0; j < i; j++) {
            const previousView = viewsToProcess[j];
            const previousImage = await prisma.characterImage.findFirst({
              where: {
                characterId,
                type: ImageType.REFERENCE,
                content: previousView.content,
              },
              orderBy: { createdAt: 'desc' },
            });

            if (previousImage) {
              freshReferences.push({ type: 'REFERENCE', url: previousImage.url });
            }
          }

          // Cleanup and re-prepare with fresh list (no duplicates)
          await comfyuiService.cleanupReferences(characterId);
          await comfyuiService.prepareReferences(characterId, freshReferences);
          logger.info({ stage: stageNumber, imageCount: freshReferences.length }, `Re-prepared references with all previous images`);
        }

        logger.info({ stage: stageNumber, view: view.content }, `Starting reference generation`);

        // Generate this view
        const result = await this.generateReferenceView({
          characterId,
          view,
          prompt: finalPrompt,
          loras: characterLoras,
          referencePath: prepareResponse.referencePath,
        });

        // Upload the new reference to R2
        // Use timestamp in key to ensure unique files (avoid cache issues)
        const r2Key = `characters/${characterId}/references/${view.content}_${batchTimestamp}.webp`;
        const { publicUrl } = await r2Service.uploadObject({
          key: r2Key,
          body: result.imageBytes,
          contentType: 'image/webp',
          cacheControl: 'public, max-age=3600', // 1 hour cache instead of 1 year
        });

        logger.info({ stage: stageNumber, view: view.content, r2Key, publicUrl }, 'Uploading reference image to R2');

        // Save to database with content field
        await prisma.characterImage.create({
          data: {
            characterId,
            type: ImageType.REFERENCE,
            url: publicUrl,
            key: r2Key,
            width: view.width,
            height: view.height,
            sizeBytes: result.imageBytes.length,
            contentType: 'image/webp',
            isActive: true,
            content: view.content, // Store the view in content field
          },
        });

        logger.info({ stage: stageNumber, view: view.content, imageUrl: publicUrl }, `Reference generation completed`);

        // Add to completed images for progress callback
        completedImages.push({ content: view.content, url: publicUrl });

        onProgress?.(stageNumber, viewsToProcess.length, `Completed reference ${view.content}`, completedImages);
      }

      // Cleanup ComfyUI temp folder
      await comfyuiService.cleanupReferences(characterId);

      logger.info({ characterId }, 'Multi-stage generation completed successfully');
    } catch (error) {
      // Cleanup on error
      await comfyuiService.cleanupReferences(characterId).catch(() => {});
      logger.error({ err: error, characterId }, 'Multi-stage generation failed');
      throw error;
    }
  }

  /**
   * Generate a single reference view
   */
  private async generateReferenceView(options: {
    characterId: string;
    view: ReferenceView;
    prompt: { positive: string; negative: string };
    loras: Array<{ name: string; filepathRelative: string; strength: number }>;
    referencePath: string;
  }): Promise<{ imageBytes: Buffer; filename: string }> {
    const { view, prompt, loras, referencePath } = options;

    // Adjust prompt for this view
    const adjustedPrompt = {
      positive: `${view.promptPrefix} ${prompt.positive}`,
      negative: `${prompt.negative}, ${view.promptNegative}`,
      loras,
    };

    // Select workflow based on view type
    let workflowTemplate: any;
    if (view.content === 'face') {
      workflowTemplate = JSON.parse(JSON.stringify(multiRefFaceWorkflow));
    } else {
      // front, side, back all use FaceDetailer workflow
      workflowTemplate = JSON.parse(JSON.stringify(multiRefFrontWorkflow));
    }

    // Set random seed
    const seed = Math.floor(Date.now() * 1000) % (2 ** 32);
    if (workflowTemplate['3']) workflowTemplate['3'].inputs.seed = seed;
    if (view.content !== 'face' && workflowTemplate['14']) {
      workflowTemplate['14'].inputs.seed = seed;
    }

    // Set prompts
    if (workflowTemplate['6']) workflowTemplate['6'].inputs.text = adjustedPrompt.positive;
    if (workflowTemplate['7']) workflowTemplate['7'].inputs.text = adjustedPrompt.negative;

    // Set LoRAs
    if (loras.length > 0 && workflowTemplate['11']) {
      const loraNode = workflowTemplate['11'];
      loras.slice(0, 4).forEach((lora, index) => {
        const loraNum = (index + 1).toString().padStart(2, '0');
        loraNode.inputs[`lora_${loraNum}`] = lora.filepathRelative.replace(/\//g, '\\');
        loraNode.inputs[`strength_${loraNum}`] = lora.strength;
      });
    }

    // Set reference directory
    if (workflowTemplate['43']) {
      workflowTemplate['43'].inputs.directory = referencePath;
      logger.debug({ view: view.content, referencePath }, 'Set reference directory in workflow');
    }

    // Execute workflow
    return comfyuiService.executeWorkflow(workflowTemplate);
  }
}

// Singleton instance
export const multiStageCharacterGenerator = new MultiStageCharacterGenerator();
