/**
 * Automated Character Generation Controller
 *
 * Handles automated character creation from text description and/or image upload.
 * Uses AI to analyze inputs and generate character details automatically.
 */

import type { Request, Response } from 'express';
import { logger } from '../config/logger';
import { analyzeCharacterImage, type CharacterImageAnalysisResult } from '../agents/characterImageAnalysisAgent';
import { callLLM } from '../services/llm';
import { createCharacter } from '../services/characterService';
import { queueManager } from '../queues/QueueManager';
import { QueueName } from '../queues/config';
import { ImageGenerationType } from '../services/comfyui';
import type { AvatarGenerationJobData } from '../queues/jobs/imageGenerationJob';
import { r2Service } from '../services/r2Service';
import { AgeRating, VisualStyle, Visibility } from '../generated/prisma';
import { classifyImageViaLLM } from '../agents/imageClassificationAgent';
import { parseJsonSafe } from '../utils/json';

interface GeneratedCharacterData {
  firstName: string;
  lastName?: string;
  age?: number;
  gender?: string;
  species?: string;
  style?: VisualStyle;
  physicalCharacteristics?: string;
  personality?: string;
  history?: string;
  suggestedAgeRating?: AgeRating;
}

/**
 * Analyze text description to extract character details
 */
async function analyzeTextDescription(description: string): Promise<GeneratedCharacterData> {
  const systemPrompt = [
    'You are a character data extraction assistant.',
    'Given a text description of a character, extract structured character information.',
    'Return ONLY a JSON object with the following optional fields:',
    '{',
    '  "firstName": "string (required)",',
    '  "lastName": "string (optional)",',
    '  "age": number (optional, numeric age),',
    '  "gender": "string (optional)",',
    '  "species": "string (optional, e.g., human, elf, vampire)",',
    '  "style": "ANIME|REALISTIC|SEMI_REALISTIC|CARTOON|CHIBI|PIXEL_ART (optional)",',
    '  "physicalCharacteristics": "string (detailed physical description)",',
    '  "personality": "string (personality traits and characteristics)",',
    '  "history": "string (background story and history)",',
    '  "suggestedAgeRating": "L|TEN|TWELVE|FOURTEEN|SIXTEEN|EIGHTEEN (optional)"',
    '}',
    '',
    'Guidelines:',
    '- Extract firstName from the description, or use "Character" if no name provided',
    '- Be creative but stay true to the description',
    '- Fill in reasonable defaults for missing information',
    '- All text fields should be in English (en-US)',
    '- Return ONLY valid JSON, no markdown or commentary',
  ].join('\n');

  const userPrompt = [
    'Character description:',
    description,
    '',
    'Extract character information as JSON.',
  ].join('\n');

  try {
    const response = await callLLM({
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      systemPrompt,
      userPrompt,
      temperature: 0.7,
      maxTokens: 1024,
    } as any);

    const raw = (response.content || '').trim();
    const parsed = parseJsonSafe<GeneratedCharacterData>(raw);

    // Ensure firstName is present
    if (!parsed.firstName) {
      parsed.firstName = 'Character';
    }

    logger.info({ description: description.substring(0, 100), result: parsed }, 'text_description_analysis_success');
    return parsed;

  } catch (error) {
    logger.error({ error, description: description.substring(0, 100) }, 'text_description_analysis_failed');

    // Return minimal valid data
    return {
      firstName: 'Character',
      physicalCharacteristics: description,
    };
  }
}

/**
 * Merge image analysis and text analysis results
 */
function mergeAnalysisResults(
  imageAnalysis: CharacterImageAnalysisResult | null,
  textData: GeneratedCharacterData | null
): GeneratedCharacterData {
  // Start with text data as base
  const merged: GeneratedCharacterData = textData || { firstName: 'Character' };

  if (!imageAnalysis) {
    return merged;
  }

  const { physicalCharacteristics: imgPhys, visualStyle, clothing, suggestedTraits } = imageAnalysis;

  // Build enhanced physical characteristics description
  const physicalParts: string[] = [];

  if (imgPhys.hairColor || imgPhys.hairStyle) {
    const hair = [imgPhys.hairStyle, imgPhys.hairColor].filter(Boolean).join(' ');
    physicalParts.push(`Hair: ${hair}`);
  }

  if (imgPhys.eyeColor) {
    physicalParts.push(`Eyes: ${imgPhys.eyeColor}`);
  }

  if (imgPhys.skinTone) {
    physicalParts.push(`Skin: ${imgPhys.skinTone}`);
  }

  if (imgPhys.height) {
    physicalParts.push(`Height: ${imgPhys.height}`);
  }

  if (imgPhys.build) {
    physicalParts.push(`Build: ${imgPhys.build}`);
  }

  if (imgPhys.distinctiveFeatures && imgPhys.distinctiveFeatures.length > 0) {
    physicalParts.push(`Distinctive features: ${imgPhys.distinctiveFeatures.join(', ')}`);
  }

  if (clothing.outfit) {
    physicalParts.push(`Outfit: ${clothing.outfit}`);
  }

  if (clothing.accessories && clothing.accessories.length > 0) {
    physicalParts.push(`Accessories: ${clothing.accessories.join(', ')}`);
  }

  const imagePhysicalDesc = physicalParts.join('. ');

  // Merge physical characteristics
  if (imagePhysicalDesc) {
    merged.physicalCharacteristics = merged.physicalCharacteristics
      ? `${merged.physicalCharacteristics}\n\n${imagePhysicalDesc}`
      : imagePhysicalDesc;
  }

  // Add personality from image analysis if not present
  if (!merged.personality && suggestedTraits.personality && suggestedTraits.personality.length > 0) {
    merged.personality = `Personality traits: ${suggestedTraits.personality.join(', ')}`;

    if (suggestedTraits.archetype) {
      merged.personality += `\nArchetype: ${suggestedTraits.archetype}`;
    }
  }

  // Merge other fields from image if not present in text
  merged.gender = merged.gender || imgPhys.gender || undefined;
  merged.species = merged.species || imgPhys.species || undefined;

  // Map age from image analysis
  if (!merged.age && imgPhys.age) {
    const ageMap: Record<string, number> = {
      'child': 8,
      'teenager': 16,
      'young adult': 22,
      'adult': 30,
      'middle-aged': 45,
      'elderly': 65,
    };
    merged.age = ageMap[imgPhys.age] || undefined;
  }

  // Map visual style
  if (!merged.style && visualStyle.artStyle) {
    const styleMap: Record<string, VisualStyle> = {
      'anime': VisualStyle.ANIME,
      'realistic': VisualStyle.REALISTIC,
      'semi-realistic': VisualStyle.SEMI_REALISTIC,
      'cartoon': VisualStyle.CARTOON,
      'chibi': VisualStyle.CHIBI,
      'pixel art': VisualStyle.PIXEL_ART,
    };
    merged.style = styleMap[visualStyle.artStyle] || VisualStyle.ANIME;
  }

  return merged;
}

/**
 * POST /api/v1/characters/generate-automated
 * Automatically generate a character from text description and/or image
 */
export async function generateAutomatedCharacter(req: Request, res: Response): Promise<void> {
  try {
    const user = req.auth?.user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { description } = req.body;
    const imageFile = (req as any).file; // From multer middleware

    // Validate input - at least description or image required
    if (!description && !imageFile) {
      res.status(400).json({
        error: 'At least description or image is required for automated character generation'
      });
      return;
    }

    logger.info({
      userId: user.id,
      hasDescription: !!description,
      hasImage: !!imageFile
    }, 'automated_character_generation_started');

    let imageAnalysis: CharacterImageAnalysisResult | null = null;
    let uploadedImageUrl: string | null = null;
    let imageAgeRating: AgeRating = AgeRating.L;

    // Process image if provided
    if (imageFile) {
      try {
        // Upload image to R2 storage
        const timestamp = Date.now();
        const filename = `temp/character-gen-${user.id}-${timestamp}.${imageFile.mimetype.split('/')[1]}`;

        const uploadResult = await r2Service.uploadObject({
          key: filename,
          body: imageFile.buffer,
          contentType: imageFile.mimetype,
        });

        uploadedImageUrl = uploadResult.publicUrl;
        logger.info({ url: uploadedImageUrl }, 'image_uploaded_for_analysis');

        // Analyze image for character details
        imageAnalysis = await analyzeCharacterImage(uploadedImageUrl);

        // Classify image for age rating
        const classification = await classifyImageViaLLM(uploadedImageUrl);
        imageAgeRating = classification.ageRating;

        logger.info({ imageAnalysis, ageRating: imageAgeRating }, 'image_analysis_completed');

      } catch (error) {
        logger.error({ error }, 'image_processing_failed');
        // Continue without image analysis
      }
    }

    // Process text description if provided
    let textData: GeneratedCharacterData | null = null;
    if (description && typeof description === 'string' && description.trim().length > 0) {
      textData = await analyzeTextDescription(description.trim());
    }

    // Merge results
    const characterData = mergeAnalysisResults(imageAnalysis, textData);

    // Determine age rating (prioritize image classification if available)
    const ageRating = imageAgeRating !== AgeRating.L
      ? imageAgeRating
      : (characterData.suggestedAgeRating || AgeRating.L);

    // Create character
    const character = await createCharacter({
      userId: user.id,
      firstName: characterData.firstName,
      lastName: characterData.lastName || null,
      age: characterData.age || null,
      gender: characterData.gender || null,
      species: characterData.species || null,
      style: characterData.style || VisualStyle.ANIME,
      physicalCharacteristics: characterData.physicalCharacteristics || null,
      personality: characterData.personality || null,
      history: characterData.history || null,
      visibility: Visibility.PRIVATE, // Default to private for automated generation
      ageRating,
      contentTags: [],
      attireIds: [],
      tagIds: [],
    });

    logger.info({ characterId: character.id, userId: user.id }, 'automated_character_created');

    // Queue avatar generation job
    let avatarJobId: string | undefined;
    try {
      const jobData: AvatarGenerationJobData = {
        type: ImageGenerationType.AVATAR,
        userId: user.id,
        characterId: character.id,
      };

      const job = await queueManager.addJob(
        QueueName.IMAGE_GENERATION,
        'generate-avatar',
        jobData,
        { priority: 5 }
      );

      avatarJobId = job.id;
      logger.info({ jobId: job.id, characterId: character.id }, 'avatar_generation_queued');
    } catch (error) {
      logger.warn({ error, characterId: character.id }, 'avatar_generation_queue_failed');
      // Continue even if avatar generation fails
    }

    // Return success with character data
    res.status(201).json({
      success: true,
      character,
      avatarJobId,
      message: 'Character generated successfully',
      metadata: {
        usedImage: !!imageFile,
        usedDescription: !!description,
        uploadedImageUrl,
      },
    });

  } catch (error) {
    logger.error({ error }, 'automated_character_generation_failed');
    res.status(500).json({
      error: 'Failed to generate character automatically',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
