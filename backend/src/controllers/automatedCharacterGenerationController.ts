/**
 * Automated Character Generation Controller
 *
 * Handles automated character creation from text description and/or image upload.
 * Uses AI to analyze inputs and generate character details automatically.
 */

import type { Request, Response } from 'express';
import type { Server } from 'socket.io';
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
import type { ImageType } from '../generated/prisma';
import { classifyImageViaLLM } from '../agents/imageClassificationAgent';
import { parseJsonSafe } from '../utils/json';
import { convertToWebP } from '../utils/imageUtils';
import { emitCharacterGenerationProgress, createProgressEvent } from '../websocket/characterGenerationHandler';
import { CharacterGenerationStep } from '../types/character-generation';
import { randomUUID } from 'crypto';
import { createTransaction } from '../services/creditService';
import { CreditTransactionType } from '../generated/prisma';

// AI Generation Credit Costs
const AI_GENERATION_COSTS = {
  imageAnalysis: 25,        // Only charged when image is uploaded
  textAnalysis: 15,         // Always charged
  characterEnrichment: 20,  // Always charged
  avatarGeneration: 40,     // Always charged
};

const TOTAL_AI_COST_WITH_IMAGE = Object.values(AI_GENERATION_COSTS).reduce((sum, cost) => sum + cost, 0); // 100 credits
const TOTAL_AI_COST_WITHOUT_IMAGE = TOTAL_AI_COST_WITH_IMAGE - AI_GENERATION_COSTS.imageAnalysis; // 75 credits

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
async function analyzeTextDescription(description: string, preferredLanguage: string = 'en'): Promise<GeneratedCharacterData> {
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
    `- All text fields (physicalCharacteristics, personality, history) should be in language code: ${preferredLanguage}`,
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
 * Generate missing character fields creatively using AI
 */
/**
 * @deprecated This function is no longer used in the new compilation flow
 * All character data is now generated in one step by compileCharacterDataWithLLM
 * Keeping for reference/fallback purposes
 */
export async function enrichCharacterData(data: GeneratedCharacterData, preferredLanguage: string = 'en'): Promise<GeneratedCharacterData> {
  // Check if name needs to be generated (if it's still the default "Character")
  if (data.firstName === 'Character' && !data.lastName) {
    try {
      const namePrompt = [
        'Generate a fitting name for a character with these attributes:',
        data.gender ? `- Gender: ${data.gender}` : '',
        data.species ? `- Species: ${data.species}` : '',
        data.age ? `- Age: ${data.age}` : '',
        data.personality ? `- Personality: ${data.personality.substring(0, 100)}` : '',
        '',
        'Return ONLY a JSON object: {"firstName": "string", "lastName": "string" (optional)}',
        'Make it creative and fitting for the character. No markdown, no commentary.',
      ].filter(line => line.length > 0).join('\n');

      const response = await callLLM({
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        systemPrompt: 'You are a creative character naming assistant.',
        userPrompt: namePrompt,
        temperature: 0.8,
        maxTokens: 128,
      } as any);

      const nameData = parseJsonSafe<{ firstName: string; lastName?: string }>(response.content.trim());
      if (nameData.firstName) {
        data.firstName = nameData.firstName;
        if (nameData.lastName) {
          data.lastName = nameData.lastName;
        }
        logger.info({ generatedName: nameData }, 'Generated creative name for character');
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to generate creative name, using default');
    }
  }

  // Check if personality is missing
  if (!data.personality || data.personality.trim().length === 0) {
    try {
      const personalityPrompt = [
        'Generate personality traits for a character with these attributes:',
        `- Name: ${data.firstName} ${data.lastName || ''}`,
        data.age ? `- Age: ${data.age}` : '',
        data.gender ? `- Gender: ${data.gender}` : '',
        data.species ? `- Species: ${data.species}` : '',
        data.physicalCharacteristics ? `- Appearance: ${data.physicalCharacteristics.substring(0, 150)}` : '',
        '',
        'Generate 3-5 personality traits that fit this character.',
        `Return ONLY the personality description in language code ${preferredLanguage} (2-3 sentences), no JSON.`,
      ].filter(line => line.length > 0).join('\n');

      const response = await callLLM({
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        systemPrompt: 'You are a creative character personality writer.',
        userPrompt: personalityPrompt,
        temperature: 0.8,
        maxTokens: 256,
      } as any);

      data.personality = response.content.trim();
      logger.info('Generated creative personality for character');
    } catch (error) {
      logger.warn({ error }, 'Failed to generate creative personality');
      data.personality = 'A unique individual with their own distinct personality.';
    }
  }

  // Check if history is missing
  if (!data.history || data.history.trim().length === 0) {
    try {
      const enrichmentPrompt = [
        'Given a character with the following attributes:',
        `- Name: ${data.firstName} ${data.lastName || ''}`,
        data.age ? `- Age: ${data.age}` : '',
        data.gender ? `- Gender: ${data.gender}` : '',
        data.species ? `- Species: ${data.species}` : '',
        data.physicalCharacteristics ? `- Physical: ${data.physicalCharacteristics.substring(0, 200)}` : '',
        data.personality ? `- Personality: ${data.personality.substring(0, 200)}` : '',
        '',
        'Generate a creative background story and history for this character (2-3 paragraphs).',
        'Make it interesting and fitting for the character attributes.',
        `Return ONLY the history text in language code ${preferredLanguage}, no JSON.`,
      ].filter(line => line.length > 0).join('\n');

      const response = await callLLM({
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        systemPrompt: 'You are a creative character backstory writer.',
        userPrompt: enrichmentPrompt,
        temperature: 0.8,
        maxTokens: 512,
      } as any);

      data.history = response.content.trim();
      logger.info('Generated creative history for character');
    } catch (error) {
      logger.warn({ error }, 'Failed to generate creative history');
      data.history = 'A character with an interesting past waiting to be discovered.';
    }
  }

  return data;
}

/**
 * Generate Stable Diffusion prompt from character data
 * Compiles all character information into an optimized prompt for image generation
 */
async function generateStableDiffusionPrompt(
  characterData: GeneratedCharacterData,
  imageAnalysis: CharacterImageAnalysisResult | null
): Promise<string> {
  try {
    const promptGenerationTask = [
      'You are a Stable Diffusion prompt specialist. Generate an optimized prompt for avatar generation.',
      '',
      '=== CHARACTER DATA ===',
      `Name: ${characterData.firstName} ${characterData.lastName || ''}`,
      `Age: ${characterData.age || 'young adult'}`,
      `Gender: ${characterData.gender || 'ambiguous'}`,
      `Species: ${characterData.species || 'human'}`,
      '',
      '=== PHYSICAL DESCRIPTION ===',
      characterData.physicalCharacteristics || 'No physical description available',
      '',
      '=== PERSONALITY ===',
      characterData.personality || 'No personality description available',
      '',
      '=== IMAGE ANALYSIS ===',
      imageAnalysis ? JSON.stringify({
        hair: `${imageAnalysis.physicalCharacteristics.hairStyle || ''} ${imageAnalysis.physicalCharacteristics.hairColor || ''}`.trim(),
        eyes: imageAnalysis.physicalCharacteristics.eyeColor,
        skin: imageAnalysis.physicalCharacteristics.skinTone,
        build: imageAnalysis.physicalCharacteristics.build,
        outfit: imageAnalysis.clothing.outfit,
        style: imageAnalysis.visualStyle.artStyle,
      }, null, 2) : 'No image provided',
      '',
      '=== TASK ===',
      'Generate a Stable Diffusion prompt that captures this character for avatar generation.',
      '',
      'Requirements:',
      '1. Output in English (Stable Diffusion works best with English)',
      '2. CRITICAL: Start with camera angle for AVATAR/PORTRAIT (close-up, portrait shot, headshot, upper body)',
      '3. Focus on FACE and HEAD details (facial features, expression, hair)',
      '4. Use descriptive adjectives and clear nouns',
      '5. Include art style (anime/realistic/etc)',
      '6. Keep it concise but detailed (50-100 words)',
      '7. Use comma-separated tags format',
      '',
      'Example format for AVATAR:',
      'close-up portrait, 1girl, beautiful face, long purple hair, blue eyes, tanned skin, smiling expression, anime style, high quality, detailed',
      '',
      'Return ONLY the prompt text, no JSON, no commentary.',
    ].join('\n');

    const response = await callLLM({
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      systemPrompt: 'You are a Stable Diffusion prompt expert. Generate optimized prompts for character avatars.',
      userPrompt: promptGenerationTask,
      temperature: 0.6,
      maxTokens: 256,
    } as any);

    const prompt = response.content.trim();
    logger.info({ prompt }, 'stable_diffusion_prompt_generated');
    return prompt;

  } catch (error) {
    logger.error({ error }, 'failed_to_generate_stable_diffusion_prompt');

    // Fallback: simple manual prompt
    const fallback = [
      characterData.gender === 'female' ? '1girl' : characterData.gender === 'male' ? '1boy' : '1person',
      characterData.age && characterData.age < 18 ? 'young' : 'adult',
      imageAnalysis?.physicalCharacteristics.hairColor ? `${imageAnalysis.physicalCharacteristics.hairColor} hair` : '',
      imageAnalysis?.physicalCharacteristics.eyeColor ? `${imageAnalysis.physicalCharacteristics.eyeColor} eyes` : '',
      imageAnalysis?.visualStyle.artStyle || 'anime style',
      'high quality',
      'detailed',
    ].filter(Boolean).join(', ');

    return fallback;
  }
}

/**
 * Compile character data from user description and image analysis using LLM
 * This ensures all fields are coherent and in the user's preferred language
 */
async function compileCharacterDataWithLLM(
  userDescription: string | null,
  imageAnalysis: CharacterImageAnalysisResult | null,
  textData: GeneratedCharacterData | null,
  preferredLanguage: string = 'en'
): Promise<GeneratedCharacterData> {
  // If no image analysis, return text data as-is
  if (!imageAnalysis) {
    return textData || { firstName: 'Character' };
  }

  const { physicalCharacteristics: imgPhys, visualStyle, clothing } = imageAnalysis;

  // Build structured image analysis summary
  const imageAnalysisSummary: string[] = [];

  if (imgPhys.hairColor || imgPhys.hairStyle) {
    imageAnalysisSummary.push(`Hair: ${[imgPhys.hairStyle, imgPhys.hairColor].filter(Boolean).join(' ')}`);
  }
  if (imgPhys.eyeColor) imageAnalysisSummary.push(`Eyes: ${imgPhys.eyeColor}`);
  if (imgPhys.skinTone) imageAnalysisSummary.push(`Skin: ${imgPhys.skinTone}`);
  if (imgPhys.height) imageAnalysisSummary.push(`Height: ${imgPhys.height}`);
  if (imgPhys.build) imageAnalysisSummary.push(`Build: ${imgPhys.build}`);
  if (imgPhys.distinctiveFeatures && imgPhys.distinctiveFeatures.length > 0) {
    imageAnalysisSummary.push(`Distinctive features: ${imgPhys.distinctiveFeatures.join(', ')}`);
  }
  if (clothing.outfit) imageAnalysisSummary.push(`Outfit: ${clothing.outfit}`);
  if (clothing.accessories && clothing.accessories.length > 0) {
    imageAnalysisSummary.push(`Accessories: ${clothing.accessories.join(', ')}`);
  }

  // Use LLM to compile everything into coherent character data
  try {
    const compilationPrompt = [
      'You are a creative character profile generator. Create a complete, engaging character profile.',
      '',
      '=== USER PROVIDED DESCRIPTION ===',
      userDescription || '(No user description provided)',
      '',
      '=== IMAGE ANALYSIS RESULTS ===',
      imageAnalysisSummary.join('\n') || '(No image provided)',
      '',
      '=== EXTRACTED DATA FROM TEXT ===',
      textData ? JSON.stringify({
        firstName: textData.firstName,
        lastName: textData.lastName,
        age: textData.age,
        gender: textData.gender,
        species: textData.species,
        personality: textData.personality,
        history: textData.history,
      }, null, 2) : '(No text analysis data)',
      '',
      `=== TASK ===`,
      `Create a COMPLETE character profile with ALL fields filled.`,
      `ALL text fields MUST be written in language code: ${preferredLanguage}`,
      ``,
      `Return a JSON object with these fields (ALL REQUIRED):`,
      `{`,
      `  "firstName": "string - Generate an attractive, culturally appropriate name",`,
      `  "lastName": "string - Generate a surname that matches the firstName's cultural origin",`,
      `  "age": number - Infer from image/description (required),`,
      `  "gender": "string - male/female/non-binary (required)",`,
      `  "species": "string - human/elf/etc (default: human)",`,
      `  "physicalCharacteristics": "string - ONE flowing paragraph in ${preferredLanguage} merging user description + image analysis naturally",`,
      `  "personality": "string - Engaging 2-3 sentence personality description in ${preferredLanguage}",`,
      `  "history": "string - SHORT backstory (MAX 2 paragraphs) in ${preferredLanguage} that brings the character to life"`,
      `}`,
      ``,
      `CRITICAL REQUIREMENTS:`,
      `1. ALL fields must be filled (no empty/null values)`,
      `2. ALL text in ${preferredLanguage} (not English!)`,
      `3. physicalCharacteristics: Write ONE natural paragraph, not a list`,
      `4. personality: Make it interesting and unique`,
      `5. history: Keep it SHORT (max 2 paragraphs), engaging, and consistent with the character`,
      `6. Infer gender and age from image/description`,
      ``,
      `NAME GENERATION RULES (EXTREMELY IMPORTANT):`,
      `- Analyze the visual style, clothing, and physical characteristics to determine cultural origin`,
      `- For anime/manga style: Use Japanese names (e.g., Sakura Yamamoto, Kenji Takahashi, Yuki Nakamura)`,
      `- For fantasy/medieval: Use fantasy-appropriate names (e.g., Elara Moonwhisper, Theron Blackwood)`,
      `- For modern Western: Use common Western names (e.g., Emma Wilson, Jack Thompson)`,
      `- For sci-fi: Use futuristic or unique names (e.g., Zara Nova, Kael Orion)`,
      `- NEVER use physical characteristics as surnames (e.g., don't use "Coelho" for bunny costume, "Verde" for green eyes)`,
      `- NEVER use clothing items as surnames (e.g., don't use "Hat", "Dress", "Suit")`,
      `- firstName and lastName MUST match the same cultural origin (don't mix Japanese with Brazilian, etc.)`,
      `- Names should sound natural, attractive, and fitting for the character's apparent background`,
      `- If user provided a name, use it; otherwise generate culturally coherent names`,
      ``,
      `Return ONLY valid JSON, no markdown, no commentary.`,
    ].join('\n');

    const response = await callLLM({
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      systemPrompt: 'You are a character data compilation assistant. Always output valid JSON.',
      userPrompt: compilationPrompt,
      temperature: 0.7,
      maxTokens: 1024,
    } as any);

    const compiledData = parseJsonSafe<GeneratedCharacterData>(response.content.trim());

    if (compiledData && compiledData.firstName) {
      logger.info({ compiledData }, 'Successfully compiled character data with LLM');

      // Preserve visual style from image analysis (map artStyle to VisualStyle enum)
      if (visualStyle.artStyle) {
        const styleMap: Record<string, string> = {
          'anime': 'ANIME',
          'realistic': 'REALISTIC',
          'semi-realistic': 'SEMI_REALISTIC',
          'cartoon': 'CARTOON',
          'chibi': 'CHIBI',
          'pixel art': 'PIXEL_ART',
        };
        compiledData.style = (styleMap[visualStyle.artStyle] || 'ANIME') as any;
      }

      return compiledData;
    }

    logger.warn('LLM compilation returned invalid data, falling back to merge');
    throw new Error('Invalid LLM compilation result');

  } catch (error) {
    logger.error({ error }, 'Failed to compile with LLM, falling back to simple merge');
    // Fallback to simple merge if LLM compilation fails
    return simpleMergeAnalysisResults(imageAnalysis, textData);
  }
}

/**
 * Simple merge fallback (original logic)
 */
function simpleMergeAnalysisResults(
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
  merged.species = merged.species || imgPhys.species || 'human'; // Default to human if not specified

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
  // Generate session ID for WebSocket progress tracking
  const sessionId = randomUUID();

  // Get Socket.io instance from app
  const io: Server = (req.app as any).io;

  try {
    const user = (req as any).auth?.user;
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

    // Calculate and deduct credits
    const hasImage = !!imageFile;
    const creditCost = hasImage ? TOTAL_AI_COST_WITH_IMAGE : TOTAL_AI_COST_WITHOUT_IMAGE;

    try {
      await createTransaction(
        user.id,
        CreditTransactionType.CONSUMPTION,
        -creditCost,
        `AI Character Generation (${hasImage ? 'with' : 'without'} image)`,
        undefined,
        undefined
      );
    } catch (error: any) {
      logger.error({ userId: user.id, error: error.message }, 'credit_deduction_failed');
      res.status(402).json({
        error: 'Insufficient credits',
        required: creditCost,
        message: error.message
      });
      return;
    }

    logger.info({
      userId: user.id,
      sessionId,
      hasDescription: !!description,
      hasImage: !!imageFile,
      creditsCharged: creditCost
    }, 'automated_character_generation_started');

    // Send session ID immediately so frontend can join room
    res.status(200).json({
      sessionId,
      message: 'Character generation started',
    });

    // Continue processing asynchronously after response
    setImmediate(async () => {
      try {
        let imageAnalysis: CharacterImageAnalysisResult | null = null;
        let uploadedImageBuffer: Buffer | null = null;
        let uploadedImageUrl: string | null = null;
        let uploadedImageSizeBytes: number = 0;
        let imageAgeRating: AgeRating = AgeRating.L;

        // Process image if provided
        if (imageFile) {
          try {
            // Step 1: Converting image
            emitCharacterGenerationProgress(
              io,
              user.id,
              sessionId,
              createProgressEvent(
                CharacterGenerationStep.UPLOADING_IMAGE,
                5,
                'Converting image...'
              )
            );

            // Convert image to WebP format
            const webpBuffer = await convertToWebP(imageFile.buffer, {
              character: 'automated-generation',
              type: 'reference',
            });

            // Store buffer for later upload to character folder
            uploadedImageBuffer = webpBuffer;
            uploadedImageSizeBytes = webpBuffer.length;

            // Upload to temp location for AI analysis only
            const timestamp = Date.now();
            const tempFilename = `temp/character-gen-${sessionId}-${timestamp}.webp`;

            const tempUploadResult = await r2Service.uploadObject({
              key: tempFilename,
              body: webpBuffer,
              contentType: 'image/webp',
            });

            uploadedImageUrl = tempUploadResult.publicUrl;

            logger.info({
              url: uploadedImageUrl,
              originalSize: imageFile.size,
              webpSize: webpBuffer.length
            }, 'image_converted_and_uploaded_for_analysis');

            // Step 2: Analyzing image
            emitCharacterGenerationProgress(
              io,
              user.id,
              sessionId,
              createProgressEvent(
                CharacterGenerationStep.ANALYZING_IMAGE,
                15,
                'Analyzing image with AI...'
              )
            );

            // Analyze image for character details
            imageAnalysis = await analyzeCharacterImage(uploadedImageUrl);

            // Classify image for age rating
            const classification = await classifyImageViaLLM(uploadedImageUrl);
            imageAgeRating = classification.ageRating;

            logger.info({ imageAnalysis, ageRating: imageAgeRating }, 'image_analysis_completed');

            // Step 3: Description extracted
            emitCharacterGenerationProgress(
              io,
              user.id,
              sessionId,
              createProgressEvent(
                CharacterGenerationStep.EXTRACTING_DESCRIPTION,
                30,
                'Image analysis completed',
                {
                  physicalDescription: imageAnalysis.physicalCharacteristics,
                  visualStyle: imageAnalysis.visualStyle,
                }
              )
            );

          } catch (error) {
            logger.error({ error }, 'image_processing_failed');
            emitCharacterGenerationProgress(
              io,
              user.id,
              sessionId,
              createProgressEvent(
                CharacterGenerationStep.ERROR,
                0,
                'Image processing failed',
                { error: error instanceof Error ? error.message : 'Unknown error' }
              )
            );
            return;
          }
        }

        // Process text description if provided
        let textData: GeneratedCharacterData | null = null;
        const preferredLanguage = user.preferredLanguage || 'en';
        if (description && typeof description === 'string' && description.trim().length > 0) {
          textData = await analyzeTextDescription(description.trim(), preferredLanguage);
          logger.info({ textData }, 'text_description_analyzed');
        } else {
          logger.info('no_text_description_provided');
        }

        // Compile results using LLM to ensure coherence and proper language
        const userDescriptionText = description && typeof description === 'string' ? description.trim() : null;
        const characterData = await compileCharacterDataWithLLM(
          userDescriptionText,
          imageAnalysis,
          textData,
          preferredLanguage
        );

        logger.info({
          hasImageAnalysis: !!imageAnalysis,
          hasTextData: !!textData,
          userDescription: userDescriptionText,
          compiledData: characterData
        }, 'character_data_compiled_with_llm');

        // Validate that all required fields are present
        if (!characterData.firstName || characterData.firstName === 'Character') {
          logger.warn('LLM failed to generate proper firstName, using fallback');
          characterData.firstName = 'Character';
        }
        if (!characterData.gender) {
          logger.warn('LLM failed to generate gender, inferring from image');
          characterData.gender = imageAnalysis?.physicalCharacteristics.gender || 'non-binary';
        }
        if (!characterData.age) {
          logger.warn('LLM failed to generate age, using default');
          characterData.age = 25;
        }

        // Step 4: Character profile complete
        emitCharacterGenerationProgress(
          io,
          user.id,
          sessionId,
          createProgressEvent(
            CharacterGenerationStep.GENERATING_DETAILS,
            40,
            'Character profile generated'
          )
        );

        // Step 5: Generate Stable Diffusion prompt for avatar
        emitCharacterGenerationProgress(
          io,
          user.id,
          sessionId,
          createProgressEvent(
            CharacterGenerationStep.GENERATING_DETAILS,
            50,
            'Preparing avatar generation prompt...'
          )
        );

        const stableDiffusionPrompt = await generateStableDiffusionPrompt(characterData, imageAnalysis);
        logger.info({ prompt: stableDiffusionPrompt }, 'stable_diffusion_prompt_ready');

        // Emit progress with generated details
        emitCharacterGenerationProgress(
          io,
          user.id,
          sessionId,
          createProgressEvent(
            CharacterGenerationStep.GENERATING_DETAILS,
            55,
            'Character details generated',
            {
              firstName: characterData.firstName,
              lastName: characterData.lastName,
              age: characterData.age,
              gender: characterData.gender,
              species: characterData.species,
              personality: characterData.personality,
            }
          )
        );

        // Step 5: Generating history
        emitCharacterGenerationProgress(
          io,
          user.id,
          sessionId,
          createProgressEvent(
            CharacterGenerationStep.GENERATING_HISTORY,
            70,
            'Generating character history...',
            {
              history: characterData.history,
            }
          )
        );

        // Determine age rating (prioritize image classification if available)
        const ageRating = imageAgeRating !== AgeRating.L
          ? imageAgeRating
          : (characterData.suggestedAgeRating || AgeRating.L);

        // Prepare content tags from image classification
        let contentTags: any[] = [];
        if (imageFile) {
          try {
            const classification = await classifyImageViaLLM(uploadedImageUrl!);
            contentTags = classification.contentTags || [];
            logger.info({ contentTags }, 'content_tags_extracted_from_image');
          } catch (error) {
            logger.warn({ error }, 'failed_to_extract_content_tags');
          }
        }

        // Step 6: Creating character
        emitCharacterGenerationProgress(
          io,
          user.id,
          sessionId,
          createProgressEvent(
            CharacterGenerationStep.CREATING_CHARACTER,
            80,
            'Creating character...'
          )
        );

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
          visibility: Visibility.PUBLIC, // Default to public for automated generation
          ageRating,
          contentTags,
          attireIds: [],
          tagIds: [],
        });

        logger.info({ characterId: character.id, userId: user.id }, 'automated_character_created');

        // Save uploaded image to character folder structure if provided
        if (uploadedImageBuffer) {
          try {
            const { addCharacterImage } = await import('../services/imageService');

            // Upload to proper character folder structure
            const timestamp = Date.now();
            const characterImageKey = `characters/${character.id}/reference/uploaded_${timestamp}.webp`;

            const characterImageUpload = await r2Service.uploadObject({
              key: characterImageKey,
              body: uploadedImageBuffer,
              contentType: 'image/webp',
            });

            // Save to database with proper URL
            await addCharacterImage({
              characterId: character.id,
              url: characterImageUpload.publicUrl,
              key: characterImageKey,
              type: 'SAMPLE' as ImageType,
              contentType: 'image/webp',
              sizeBytes: uploadedImageSizeBytes,
              runClassification: false, // Already classified
            });

            logger.info({
              characterId: character.id,
              url: characterImageUpload.publicUrl,
              key: characterImageKey,
              sizeBytes: uploadedImageSizeBytes
            }, 'uploaded_image_saved_to_character_folder');
          } catch (error) {
            logger.warn({ error, characterId: character.id }, 'failed_to_save_uploaded_image');
            // Continue even if saving uploaded image fails
          }
        }

        // Step 7: Queuing avatar generation
        emitCharacterGenerationProgress(
          io,
          user.id,
          sessionId,
          createProgressEvent(
            CharacterGenerationStep.QUEUING_AVATAR,
            90,
            'Queuing avatar generation...'
          )
        );

        // Queue avatar generation job with Stable Diffusion prompt
        let avatarJobId: string | undefined;
        try {
          const jobData: AvatarGenerationJobData = {
            type: ImageGenerationType.AVATAR,
            userId: user.id,
            characterId: character.id,
            referenceImageUrl: uploadedImageUrl || undefined, // Pass reference image if available
            prompt: stableDiffusionPrompt, // Pass compiled Stable Diffusion prompt
          };

          const job = await queueManager.addJob(
            QueueName.IMAGE_GENERATION,
            'generate-avatar',
            jobData,
            { priority: 5 }
          );

          avatarJobId = job.id;
          logger.info({
            jobId: job.id,
            characterId: character.id,
            hasReferenceImage: !!uploadedImageUrl,
            hasPrompt: !!stableDiffusionPrompt
          }, 'avatar_generation_queued');
        } catch (error) {
          logger.warn({ error, characterId: character.id }, 'avatar_generation_queue_failed');
          // Continue even if avatar generation fails
        }

        // Step 8: Completed
        emitCharacterGenerationProgress(
          io,
          user.id,
          sessionId,
          createProgressEvent(
            CharacterGenerationStep.COMPLETED,
            100,
            'Character generation completed!',
            {
              characterId: character.id,
              character,
              avatarJobId,
            }
          )
        );

        logger.info({
          characterId: character.id,
          sessionId,
          userId: user.id,
        }, 'automated_character_generation_completed');

      } catch (error) {
        logger.error({ error, sessionId }, 'automated_character_generation_failed');
        emitCharacterGenerationProgress(
          io,
          user.id,
          sessionId,
          createProgressEvent(
            CharacterGenerationStep.ERROR,
            0,
            'Character generation failed',
            {
              error: error instanceof Error ? error.message : 'Unknown error',
              details: error instanceof Error ? error.stack : undefined,
            }
          )
        );
      }
    });

  } catch (error) {
    logger.error({ error }, 'automated_character_generation_init_failed');
    res.status(500).json({
      error: 'Failed to start character generation',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
