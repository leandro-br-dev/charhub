/**
 * Automated Story Generation Controller
 *
 * Handles automated story creation from text description and/or image upload.
 * Uses AI to analyze inputs and generate story details automatically.
 */

import type { Request, Response } from 'express';
import type { Server } from 'socket.io';
import { logger } from '../config/logger';
import { analyzeStoryImage, type StoryImageAnalysisResult } from '../agents/storyImageAnalysisAgent';
import { generateStoryCoverPrompt } from '../agents/storyCoverPromptAgent';
import { callLLM } from '../services/llm';
import { trackFromLLMResponse } from '../services/llm/llmUsageTracker';
import { createStory } from '../services/storyService';
import { queueManager } from '../queues/QueueManager';
import { QueueName } from '../queues/config';
import { ImageGenerationType } from '../services/comfyui/types';
import type { CoverGenerationJobData } from '../queues/jobs/imageGenerationJob';
import { r2Service } from '../services/r2Service';
import { AgeRating, Visibility, CreditTransactionType } from '../generated/prisma';
import { parseJsonSafe } from '../utils/json';
import { convertToWebP } from '../utils/imageUtils';
import { emitStoryGenerationProgress, createProgressEvent } from '../websocket/storyGenerationHandler';
import { StoryGenerationStep } from '../types/story-generation';
import { randomUUID } from 'crypto';
import { createTransaction } from '../services/creditService';
import { prisma } from '../config/database';

// AI Generation Credit Costs
const AI_GENERATION_COSTS = {
  imageAnalysis: 25,        // Only charged when image is uploaded
  textAnalysis: 20,         // Always charged
  storyConcept: 15,         // Always charged
  sceneWriting: 10,         // Always charged
  coverGeneration: 30,      // Always charged
};

const TOTAL_AI_COST_WITH_IMAGE = Object.values(AI_GENERATION_COSTS).reduce((sum, cost) => sum + cost, 0); // 100 credits
const TOTAL_AI_COST_WITHOUT_IMAGE = TOTAL_AI_COST_WITH_IMAGE - AI_GENERATION_COSTS.imageAnalysis; // 75 credits

interface StoryObjective {
  id: string;
  description: string;
  completed: boolean;
}

interface StoryCharacter {
  id: string;
  firstName: string;
  lastName?: string | null;
  age?: string | null;
  gender?: string | null;
  personality?: string | null;
  appearance?: {
    age?: string | null;
    physicalCharacteristics?: string | null;
    mainAttire?: {
      description?: string | null;
    } | null;
  } | null;
  role?: 'MAIN' | 'SECONDARY';
}

interface GeneratedStoryData {
  title: string;
  synopsis: string;
  initialText: string;
  objectives: StoryObjective[];
  suggestedAgeRating?: AgeRating;
  suggestedGenre?: string;
  mood?: string;
  characters?: StoryCharacter[];
  setting?: string;
}

async function generateStoryTags(
  title: string,
  synopsis: string,
  genre: string,
  preferredLanguage: string = 'en'
): Promise<{ tagNames: string[]; contentTagNames: string[] }> {
  try {
    const systemPrompt = [
      'You are a story tagging assistant.',
      'Analyze the story information and suggest appropriate tags.',
      '',
      'Return JSON with:',
      '{',
      '  "tagNames": ["array of 3-5 genre/topic tags like: fantasy, adventure, magic, dragons"]',
      '  "contentTagNames": ["array of 0-3 content warning tags if applicable (choose from: VIOLENCE, GORE, SEXUAL, NUDITY, LANGUAGE, DRUGS, ALCOHOL, HORROR, PSYCHOLOGICAL, CRIME, GAMBLING)"]',
      '}',
      '',
      `Tags should be in ${preferredLanguage === 'pt-BR' ? 'Portuguese' : 'English'}.`,
      'Be conservative with content warnings - only include if explicitly present.',
      'Return ONLY JSON, no markdown.',
    ].join('\n');

    const userPrompt = [
      `Title: ${title}`,
      `Synopsis: ${synopsis}`,
      `Genre: ${genre}`,
      '',
      'Generate tags for this story.',
    ].join('\n');

    const response = await callLLM({
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      systemPrompt,
      userPrompt,
      temperature: 0.3,
      maxTokens: 512,
    } as any);

    // Track LLM usage for cost analysis
    trackFromLLMResponse(response, {
      userId: undefined,
      feature: 'AUTOMATED_GENERATION',
      featureId: undefined,
      operation: 'story_tag_generation',
    });

    const raw = (response.content || '').trim();
    const parsed = parseJsonSafe<{ tagNames?: string[]; contentTagNames?: string[] }>(raw);

    return {
      tagNames: parsed.tagNames || [],
      contentTagNames: parsed.contentTagNames || [],
    };
  } catch (error) {
    logger.warn({ error }, 'tag_generation_failed');
    return { tagNames: [], contentTagNames: [] };
  }
}

/**
 * Generate story objectives as story phases/milestones
 * Returns structured objectives with id, description, and completed status
 */
async function generateStoryObjectives(
  title: string,
  synopsis: string,
  genre: string,
  preferredLanguage: string = 'en'
): Promise<Array<{ id: string; description: string; completed: boolean }>> {
  try {
    const systemPrompt = [
      'You are a story structure specialist.',
      'Given a story concept, create 3-5 key objectives that represent major phases or milestones of the story.',
      '',
      'These objectives should:',
      '- Represent progressive stages of the story (like chapters or arcs)',
      '- Be things the main character will work toward achieving',
      '- Guide the narrative flow from beginning to climax',
      '- Be concise but descriptive (10-15 words each)',
      '',
      'Return JSON with:',
      '{',
      '  "objectives": [',
      '    "First objective - beginning phase",',
      '    "Second objective - development phase",',
      '    "Third objective - midpoint/conflict",',
      '    "Fourth objective - climax preparation",',
      '    "Fifth objective - resolution"',
      '  ]',
      '}',
      '',
      `Objectives should be in ${preferredLanguage === 'pt-BR' ? 'Portuguese' : 'English'}.`,
      'Return ONLY JSON, no markdown.',
    ].join('\n');

    const userPrompt = [
      `Title: ${title}`,
      `Synopsis: ${synopsis}`,
      `Genre: ${genre}`,
      '',
      'Create 3-5 story objectives representing key phases/milestones.',
    ].join('\n');

    const response = await callLLM({
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      systemPrompt,
      userPrompt,
      temperature: 0.4,
      maxTokens: 512,
    } as any);

    // Track LLM usage for cost analysis
    trackFromLLMResponse(response, {
      userId: undefined,
      feature: 'AUTOMATED_GENERATION',
      featureId: undefined,
      operation: 'story_objectives_generation',
    });

    const raw = (response.content || '').trim();
    const parsed = parseJsonSafe<{ objectives?: string[] }>(raw);

    const rawObjectives = parsed.objectives || [];

    // Ensure we have between 1 and 5 objectives
    const validObjectives = rawObjectives.slice(0, 5);

    // Fallback to generic objectives if none generated
    if (validObjectives.length === 0) {
      const fallbackObjectives = preferredLanguage === 'pt-BR'
        ? ['Iniciar a jornada', 'Explorar o mundo', 'Descobrir a verdade', 'Enfrentar o desafio final']
        : ['Begin the journey', 'Explore the world', 'Discover the truth', 'Face the final challenge'];

      return fallbackObjectives.slice(0, 5).map((desc, i) => ({
        id: `obj_${Date.now()}_${i}`,
        description: desc,
        completed: false,
      }));
    }

    // Transform strings into structured objectives
    return validObjectives.map((desc, i) => ({
      id: `obj_${Date.now()}_${i}`,
      description: desc,
      completed: false,
    }));
  } catch (error) {
    logger.warn({ error }, 'objective_generation_failed');
    // Fallback objectives
    return [
      { id: `obj_${Date.now()}_0`, description: 'Begin the journey', completed: false },
      { id: `obj_${Date.now()}_1`, description: 'Explore the world', completed: false },
      { id: `obj_${Date.now()}_2`, description: 'Discover the truth', completed: false },
    ];
  }
}

/**
 * Find tag IDs by name (looks up existing tags from the predefined set)
 */
async function findTagIdsByNames(tagNames: string[]): Promise<string[]> {
  if (!tagNames || tagNames.length === 0) {
    return [];
  }

  try {
    // Find tags that match the provided names (case-insensitive)
    const tags = await prisma.tag.findMany({
      where: {
        type: 'STORY',
        OR: tagNames.map(name => ({
          name: { contains: name, mode: 'insensitive' },
        })),
      },
      select: { id: true },
    });

    return tags.map(t => t.id);
  } catch (error) {
    logger.warn({ error, tagNames }, 'tag_lookup_failed');
    return [];
  }
}

/**
 * Find compatible public characters based on story genre and tags
 */
async function findCompatiblePublicCharacters(
  genre: string,
  tagNames: string[],
  limit: number = 5
): Promise<string[]> {
  try {
    // If no genre provided, return empty
    if (!genre) {
      return [];
    }

    // Search for public characters with matching tags or genre
    const characters = await prisma.character.findMany({
      where: {
        visibility: 'PUBLIC',
        // Match characters that have at least one of the story tags
        tags: {
          some: {
            OR: tagNames.slice(0, 3).map(tag => ({ name: { contains: tag, mode: 'insensitive' } })),
          },
        },
      },
      include: {
        tags: true,
      },
      take: limit,
    });

    // If no exact matches, try to find characters by genre similarity
    if (characters.length === 0) {
      // For simplicity, just return random public characters as fallback
      const randomPublic = await prisma.character.findMany({
        where: { visibility: 'PUBLIC' },
        take: Math.min(3, limit),
        select: { id: true },
      });
      return randomPublic.map(c => c.id);
    }

    return characters.map(c => c.id);
  } catch (error) {
    logger.warn({ error }, 'character_search_failed');
    return [];
  }
}

/**
 * Analyze text description to extract story details
 */
async function analyzeTextDescription(description: string, preferredLanguage: string = 'en'): Promise<GeneratedStoryData> {
  const systemPrompt = [
    'You are a creative story data extraction assistant.',
    'Given a text description of a story idea, extract structured story information.',
    'Return ONLY a JSON object with the following fields:',
    '{',
    '  "title": "string (required) - engaging title for the story",',
    '  "synopsis": "string (required) - 2-3 sentence summary of the story",',
    '  "initialText": "string (required) - opening scene description (200-500 words)",',
    '  "suggestedGenre": "string (optional) - e.g., fantasy, sci-fi, romance, mystery, horror",',
    '  "mood": "string (optional) - e.g., adventurous, mysterious, romantic, tense",',
    '  "suggestedAgeRating": "L|TEN|TWELVE|FOURTEEN|SIXTEEN|EIGHTEEN (optional)"',
    '}',
    '',
    'Guidelines:',
    '- Generate an engaging, creative title based on the description',
    '- Create a compelling synopsis that captures the essence of the story',
    '- Write an immersive opening scene that sets the tone and introduces the setting',
    `- All text fields should be in language code: ${preferredLanguage}`,
    '- Be creative and imaginative while staying true to the description',
    '- Return ONLY valid JSON, no markdown or commentary',
  ].join('\n');

  const userPrompt = [
    'Story idea:',
    description,
    '',
    'Extract and generate story information as JSON.',
  ].join('\n');

  try {
    const response = await callLLM({
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      systemPrompt,
      userPrompt,
      temperature: 0.8,
      maxTokens: 4096,
    } as any);

    // Track LLM usage for cost analysis
    trackFromLLMResponse(response, {
      userId: undefined,
      feature: 'AUTOMATED_GENERATION',
      featureId: undefined,
      operation: 'story_compilation',
    });

    const raw = (response.content || '').trim();
    const parsed = parseJsonSafe<any>(raw);

    // Validate required fields
    if (!parsed.title || !parsed.synopsis || !parsed.initialText) {
      throw new Error('Missing required fields in generated story data');
    }

    // Initialize empty objectives (will be generated later)
    parsed.objectives = [];

    logger.info({ description: description.substring(0, 100), result: parsed }, 'text_description_analysis_success');
    return parsed;

  } catch (error) {
    logger.error({ error, description: description.substring(0, 100) }, 'text_description_analysis_failed');
    throw error;
  }
}

/**
 * Compile story data from image analysis and text description using LLM
 */
async function compileStoryDataWithLLM(
  userDescription: string | null,
  imageAnalysis: StoryImageAnalysisResult | null,
  preferredLanguage: string = 'en'
): Promise<GeneratedStoryData> {
  const systemPrompt = [
    `You are a creative story compiler assistant.`,
    `Your task is to compile a complete story concept from available inputs.`,
    `Output must be a JSON object with this exact structure:`,
    `{`,
    `  "title": "string (required)",`,
    `  "synopsis": "string (required, 100-200 words)",`,
    `  "initialText": "string (required, 300-500 words opening scene)",`,
    `  "suggestedGenre": "string (fantasy, sci-fi, romance, horror, adventure, comedy, drama, etc.)",`,
    `  "mood": "string (adventurous, romantic, dark, mysterious, light, epic, etc.)",`,
    `  "suggestedAgeRating": "L|TEN|TWELVE|FOURTEEN|SIXTEEN|EIGHTEEN",`,
    `  "setting": "string (where the story takes place - castle, city, forest, space, etc.)",`,
    `  "characters": [`,
    `    {`,
    `      "id": "unique_id_1",`,
    `      "firstName": "string",`,
    `      "lastName": "string or null",`,
    `      "age": "string or null (e.g., '25 years old', 'teenager')",`,
    `      "gender": "string or null (male, female, non-binary, etc.)",`,
    `      "personality": "string or null (brief personality description)",`,
    `      "appearance": {`,
    `        "age": "string or null",`,
    `        "physicalCharacteristics": "string or null (hair, eyes, height, build, etc.)",`,
    `        "mainAttire": {`,
    `          "description": "string or null (what they typically wear)"`,
    `        }`,
    `      },`,
    `      "role": "MAIN or SECONDARY"`,
    `    }`,
    `  ]`,
    `}`,
    '',
    'IMPORTANT CHARACTER GUIDELINES:',
    '- Create 1-3 characters total (1 MAIN, 0-2 SECONDARY)',
    '- MAIN character is the protagonist (played by the user)',
    '- SECONDARY characters are supporting characters',
    '- Describe appearances in detail (hair color, eye color, build, distinctive features)',
    '- Include clothing/attire that reflects their personality and role',
    '- Characters should be visually interesting and appealing for cover art',
    '',
    'Compilation rules:',
    '- User\'s text description (if provided) is PRIMARY - it represents their vision',
    '- Image analysis (if available) should inform the visual setting and mood',
    '- If no text description, create story based on image analysis',
    '- If no image, use text description directly',
    '- Generate creative, engaging content that matches user preferences',
    `- Language code: ${preferredLanguage}`,
    `- Return ONLY JSON, no markdown`,
  ].join('\n');

  // Build context from available data
  const contextParts: string[] = [];

  if (userDescription) {
    contextParts.push(`USER'S DESCRIPTION:\n${userDescription}`);
  }

  if (imageAnalysis && imageAnalysis.overallDescription !== 'Unable to analyze scene from image') {
    contextParts.push(
      `IMAGE ANALYSIS:\n` +
      `Setting: ${imageAnalysis.setting || 'unknown'}\n` +
      `Mood: ${imageAnalysis.mood || 'unknown'}\n` +
      `Genre: ${imageAnalysis.suggestedGenre || 'unknown'}\n` +
      `Themes: ${imageAnalysis.suggestedThemes?.join(', ') || 'none'}\n` +
      `Key Elements: ${imageAnalysis.keyElements?.join(', ') || 'none'}`
    );
  }

  const contextText = contextParts.length > 0
    ? contextParts.join('\n\n---\n\n')
    : 'Create an engaging story from scratch.';

  const userPrompt = [
    'Compile the story concept from the following inputs:',
    '',
    contextText,
    '',
    'Create compelling characters with detailed appearances that would look great on a book cover.',
    'Generate the complete story data as JSON.',
  ].join('\n');

  try {
    const response = await callLLM({
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      systemPrompt,
      userPrompt,
      temperature: 0.8,
      maxTokens: 6144, // Increased for character data
    } as any);

    // Track LLM usage for cost analysis
    trackFromLLMResponse(response, {
      userId: undefined,
      feature: 'AUTOMATED_GENERATION',
      featureId: undefined,
      operation: 'story_compilation_from_image',
    });

    const raw = (response.content || '').trim();
    const parsed = parseJsonSafe<any>(raw);

    // Validate and ensure required fields
    if (!parsed.title) {
      parsed.title = imageAnalysis?.suggestedGenre
        ? `A ${imageAnalysis.suggestedGenre} Adventure`
        : 'Untitled Story';
    }

    if (!parsed.synopsis) {
      parsed.synopsis = imageAnalysis?.overallDescription || 'An exciting adventure awaits.';
    }

    if (!parsed.initialText) {
      parsed.initialText = `The story begins...\n\n${imageAnalysis?.overallDescription || 'A new adventure unfolds.'}`;
    }

    // Initialize empty objectives (will be generated later)
    parsed.objectives = [];

    // Ensure characters array exists
    if (!parsed.characters || !Array.isArray(parsed.characters)) {
      // Create a default main character if none provided
      parsed.characters = [{
        id: `char_${Date.now()}_main`,
        firstName: 'Hero',
        lastName: null,
        age: 'young adult',
        gender: null,
        personality: 'brave and adventurous',
        appearance: {
          age: 'young adult',
          physicalCharacteristics: 'attractive, determined expression',
          mainAttire: {
            description: 'adventurer outfit suitable for the genre'
          }
        },
        role: 'MAIN'
      }];
    }

    // Ensure all characters have required fields
    parsed.characters = parsed.characters.map((char: any, index: number) => ({
      id: char.id || `char_${Date.now()}_${index}`,
      firstName: char.firstName || 'Character',
      lastName: char.lastName || null,
      age: char.age || null,
      gender: char.gender || null,
      personality: char.personality || null,
      appearance: {
        age: char.appearance?.age || char.age || null,
        physicalCharacteristics: char.appearance?.physicalCharacteristics || null,
        mainAttire: {
          description: char.appearance?.mainAttire?.description || null
        }
      },
      role: char.role || (index === 0 ? 'MAIN' : 'SECONDARY')
    }));

    logger.info({ compiledData: parsed }, 'story_data_compiled_success');
    return parsed;

  } catch (error) {
    logger.error({ error }, 'story_data_compilation_failed');
    throw error;
  }
}

/**
 * Generate Stable Diffusion prompt for story cover image
 * Uses LLM agent to create detailed, attractive, story-specific prompts
 */
async function generateCoverPrompt(
  storyData: GeneratedStoryData,
  imageAnalysis: StoryImageAnalysisResult | null
): Promise<string> {
  // Get character information from story if available
  let mainCharacter: { name?: string; description?: string; age?: string; gender?: string; appearance?: string; attire?: string } | undefined;
  let secondaryCharacters: Array<{ name?: string; description?: string; appearance?: string; attire?: string }> = [];

  if (storyData.characters && storyData.characters.length > 0) {
    // Find main character (first in list or marked as main)
    const mainChar = storyData.characters.find(c => c.role === 'MAIN') || storyData.characters[0];
    const others = storyData.characters.filter(c => c !== mainChar).slice(0, 2);

    if (mainChar) {
      mainCharacter = {
        name: `${mainChar.firstName}${mainChar.lastName ? ' ' + mainChar.lastName : ''}`,
        age: mainChar.age || mainChar.appearance?.age || undefined,
        gender: mainChar.gender || undefined,
        appearance: mainChar.appearance?.physicalCharacteristics || mainChar.personality || undefined,
        attire: mainChar.appearance?.mainAttire?.description || undefined,
      };
    }

    secondaryCharacters = others.map(char => ({
      name: `${char.firstName}${char.lastName ? ' ' + char.lastName : ''}`,
      description: char.personality || undefined,
      appearance: char.appearance?.physicalCharacteristics || undefined,
      attire: char.appearance?.mainAttire?.description || undefined,
    }));
  }

  // Determine setting from story data or image analysis
  const setting = storyData.setting || imageAnalysis?.setting;

  // Use LLM agent to generate detailed, attractive prompt
  const prompt = await generateStoryCoverPrompt({
    title: storyData.title,
    synopsis: storyData.synopsis,
    genre: storyData.suggestedGenre || imageAnalysis?.suggestedGenre || 'fantasy',
    mood: storyData.mood || imageAnalysis?.mood,
    mainCharacter,
    secondaryCharacters,
    setting,
  });

  return prompt;
}

/**
 * Main handler for automated story generation
 */
export async function generateAutomatedStory(
  req: Request,
  res: Response
): Promise<void> {
  // Generate session ID for WebSocket progress tracking
  const sessionId = randomUUID();

  // Get Socket.io instance from app
  const io: Server = (req.app as any).io;

  try {
    const user = req.auth?.user;
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { description, image } = req.body || {};
    const uploadedFile = (req as any).file;

    // Validate input - at least description OR image is required
    const hasDescription = description && typeof description === 'string' && description.trim().length > 0;
    const hasImage = (image && typeof image === 'string' && image.trim().length > 0) || uploadedFile;

    if (!hasDescription && !hasImage) {
      res.status(400).json({
        error: 'Validation failed',
        details: 'At least description or image must be provided',
      });
      return;
    }

    // Calculate total credit cost
    const totalCost = hasImage ? TOTAL_AI_COST_WITH_IMAGE : TOTAL_AI_COST_WITHOUT_IMAGE;

    // Check user credits by attempting the transaction
    try {
      await createTransaction(
        user.id,
        CreditTransactionType.CONSUMPTION,
        -totalCost, // Negative amount for spending
        `Automated story generation${hasImage ? ' with image' : ''}`
      );
    } catch (creditError) {
      res.status(402).json({
        error: 'Insufficient credits',
        details: `This operation requires ${totalCost} credits.`,
        required: totalCost,
      });
      return;
    }

    logger.info({
      userId: user.id,
      sessionId,
      hasDescription,
      hasImage,
      totalCost,
    }, 'automated_story_generation_started');

    // Process in background (non-blocking response)
    res.json({
      success: true,
      sessionId,
      message: 'Story generation started',
    });

    // Background processing
    setImmediate(async () => {
      try {
        // Send initial progress event immediately
        emitStoryGenerationProgress(
          io,
          user.id,
          sessionId,
          createProgressEvent(
            StoryGenerationStep.GENERATING_CONCEPT,
            0,
            'Preparing your story...'
          )
        );

        let uploadedImageBuffer: Buffer | null = null;
        let uploadedImageUrl: string | null = null;
        let uploadedImageSizeBytes: number | undefined;
        let imageAnalysis: StoryImageAnalysisResult | null = null;

        // Step 1: Upload and analyze image if provided
        if (hasImage) {
          emitStoryGenerationProgress(
            io,
            user.id,
            sessionId,
            createProgressEvent(
              StoryGenerationStep.UPLOADING_IMAGE,
              5,
              'Uploading image...'
            )
          );

          try {
            // Handle uploaded file (from FormData) or image URL
            if (uploadedFile && uploadedFile.buffer) {
              // File was uploaded via FormData
              logger.info({
                sessionId,
                fileSize: uploadedFile.size,
                mimeType: uploadedFile.mimetype,
              }, 'Processing uploaded file');

              uploadedImageBuffer = uploadedFile.buffer;
              uploadedImageSizeBytes = uploadedFile.buffer.length;
            } else if (image && typeof image === 'string') {
              // Image URL was provided
              logger.info({ sessionId, image: image?.substring(0, 100) }, 'Starting image download');

              // Download image from URL
              const imageResponse = await fetch(image);
              if (!imageResponse.ok) {
                throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
              }

              uploadedImageBuffer = Buffer.from(await imageResponse.arrayBuffer());
              uploadedImageSizeBytes = uploadedImageBuffer.length;

              logger.info({
                sessionId,
                imageSize: uploadedImageSizeBytes,
              }, 'image_downloaded');
            } else {
              throw new Error('No image data provided');
            }

            // Convert to WebP
            if (!uploadedImageBuffer) {
              throw new Error('Failed to obtain image buffer');
            }
            uploadedImageBuffer = await convertToWebP(uploadedImageBuffer);
            uploadedImageSizeBytes = uploadedImageBuffer.length;

            // Upload to R2 for processing
            const timestamp = Date.now();
            const imageKey = `temp/story-generation/${user.id}/${sessionId}_${timestamp}.webp`;

            logger.info({ sessionId, imageKey }, 'Starting R2 upload');

            const uploadResult = await r2Service.uploadObject({
              key: imageKey,
              body: uploadedImageBuffer!,
              contentType: 'image/webp',
            });

            uploadedImageUrl = uploadResult.publicUrl;

            logger.info({
              sessionId,
              url: uploadedImageUrl,
              key: imageKey,
            }, 'image_uploaded_for_analysis');

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            logger.error({
              error: errorMessage,
              stack: errorStack,
            }, 'image_upload_failed');
            emitStoryGenerationProgress(
              io,
              user.id,
              sessionId,
              createProgressEvent(
                StoryGenerationStep.ERROR,
                0,
                'Image upload failed',
                { error: errorMessage }
              )
            );
            return;
          }

          // Step 2: Analyze image
          emitStoryGenerationProgress(
            io,
            user.id,
            sessionId,
            createProgressEvent(
              StoryGenerationStep.ANALYZING_IMAGE,
              15,
              'Analyzing your image...'
            )
          );

          try {
            imageAnalysis = await analyzeStoryImage(uploadedImageUrl!);
            logger.info({ imageAnalysis }, 'image_analysis_completed');
          } catch (error) {
            logger.warn({ error }, 'image_analysis_failed');
            // Continue without image analysis
          }
        }

        // Step 3: Process text description if provided
        let textData: GeneratedStoryData | null = null;
        const preferredLanguage = user.preferredLanguage || 'en';
        if (hasDescription) {
          emitStoryGenerationProgress(
            io,
            user.id,
            sessionId,
            createProgressEvent(
              StoryGenerationStep.EXTRACTING_DESCRIPTION,
              30,
              'Analyzing your description...'
            )
          );

          try {
            textData = await analyzeTextDescription(description!.trim(), preferredLanguage);
            logger.info({ textData }, 'text_description_analyzed');
          } catch (error) {
            logger.warn({ error }, 'text_description_analysis_failed');
            // Continue, will compile from available data
          }
        }

        // Step 4: Compile story data using LLM
        emitStoryGenerationProgress(
          io,
          user.id,
          sessionId,
          createProgressEvent(
            StoryGenerationStep.GENERATING_CONCEPT,
            45,
            'Generating story concept...'
          )
        );

        const userDescriptionText = hasDescription ? description!.trim() : null;
        const storyData = await compileStoryDataWithLLM(
          userDescriptionText,
          imageAnalysis,
          preferredLanguage
        );

        logger.info({
          hasImageAnalysis: !!imageAnalysis,
          hasTextData: !!textData,
          compiledData: storyData
        }, 'story_data_compiled');

        // Step 5: Story concept generated
        emitStoryGenerationProgress(
          io,
          user.id,
          sessionId,
          createProgressEvent(
            StoryGenerationStep.GENERATING_CONCEPT,
            55,
            'Story concept created',
            {
              title: storyData.title,
              synopsis: storyData.synopsis,
              genre: storyData.suggestedGenre,
            }
          )
        );

        // Step 6: Plot written
        emitStoryGenerationProgress(
          io,
          user.id,
          sessionId,
          createProgressEvent(
            StoryGenerationStep.GENERATING_PLOT,
            65,
            'Story plot written',
            {
              objectives: storyData.objectives,
            }
          )
        );

        // Step 7: Scene written
        emitStoryGenerationProgress(
          io,
          user.id,
          sessionId,
          createProgressEvent(
            StoryGenerationStep.WRITING_SCENE,
            75,
            'Opening scene written',
            {
              initialText: storyData.initialText.substring(0, 200) + '...',
            }
          )
        );

        // Step 8: Generate cover prompt
        emitStoryGenerationProgress(
          io,
          user.id,
          sessionId,
          createProgressEvent(
            StoryGenerationStep.GENERATING_COVER,
            80,
            'Preparing cover image...'
          )
        );

        const coverPrompt = await generateCoverPrompt(storyData, imageAnalysis);
        logger.info({ prompt: coverPrompt }, 'cover_prompt_ready');

        // Step 9: Generate tags and find compatible characters
        emitStoryGenerationProgress(
          io,
          user.id,
          sessionId,
          createProgressEvent(
            StoryGenerationStep.GENERATING_PLOT,
            82,
            'Finding characters and tags...'
          )
        );

        // Generate tags for the story
        const { tagNames, contentTagNames } = await generateStoryTags(
          storyData.title,
          storyData.synopsis,
          storyData.suggestedGenre || '',
          preferredLanguage
        );

        logger.info({ tagNames, contentTagNames }, 'story_tags_generated');

        // Find tag IDs from the generated tag names
        const tagIds = await findTagIdsByNames(tagNames);
        logger.info({ tagIds, count: tagIds.length }, 'story_tag_ids_resolved');

        // Find compatible public characters
        const compatibleCharacterIds = await findCompatiblePublicCharacters(
          storyData.suggestedGenre || '',
          tagNames,
          5 // Max 5 characters
        );

        if (compatibleCharacterIds.length > 0) {
          logger.info({ characterIds: compatibleCharacterIds }, 'compatible_characters_found');
        }

        // Step 9.5: Generate story objectives (phases/milestones)
        emitStoryGenerationProgress(
          io,
          user.id,
          sessionId,
          createProgressEvent(
            StoryGenerationStep.GENERATING_PLOT,
            85,
            'Creating story phases...'
          )
        );

        const storyObjectives = await generateStoryObjectives(
          storyData.title,
          storyData.synopsis,
          storyData.suggestedGenre || '',
          preferredLanguage
        );

        logger.info({
          count: storyObjectives.length,
          objectives: storyObjectives.map(o => o.description)
        }, 'story_objectives_generated');

        // Step 10: Create story
        emitStoryGenerationProgress(
          io,
          user.id,
          sessionId,
          createProgressEvent(
            StoryGenerationStep.CREATING_STORY,
            90,
            'Creating your story...'
          )
        );

        // Create story with tags, characters and objectives
        // First character (if any) is designated as the MAIN character (played by user)
        // Remaining characters are SECONDARY (played by AI)
        const mainCharacterId = compatibleCharacterIds.length > 0 ? compatibleCharacterIds[0] : undefined;

        const story = await createStory({
          title: storyData.title,
          synopsis: storyData.synopsis,
          initialText: storyData.initialText,
          objectives: storyObjectives, // Generated story phases/milestones
          characterIds: compatibleCharacterIds,
          mainCharacterId, // First character is the protagonist (user plays as them)
          tagIds: tagIds, // IDs of the story tags found in database
          ageRating: storyData.suggestedAgeRating || AgeRating.L,
          contentTags: contentTagNames,
          visibility: Visibility.PUBLIC, // Default to public for automated generation
          coverImage: undefined, // Will be generated asynchronously
        }, user.id);

        logger.info({ storyId: story.id, userId: user.id }, 'automated_story_created');

        // Step 12: Queue cover generation
        emitStoryGenerationProgress(
          io,
          user.id,
          sessionId,
          createProgressEvent(
            StoryGenerationStep.GENERATING_COVER,
            95,
            'Generating cover image...'
          )
        );

        let coverJobId: string | undefined;
        try {
          const jobData: CoverGenerationJobData = {
            type: ImageGenerationType.COVER,
            userId: user.id,
            storyId: story.id,
            referenceImageUrl: uploadedImageUrl || undefined,
            prompt: coverPrompt,
          };

          const job = await queueManager.addJob(
            QueueName.IMAGE_GENERATION,
            'generate-story-cover',
            jobData,
            { priority: 5 }
          );

          coverJobId = job.id;
          logger.info({
            jobId: job.id,
            storyId: story.id,
            hasReferenceImage: !!uploadedImageUrl,
          }, 'cover_generation_queued');
        } catch (error) {
          logger.warn({ error, storyId: story.id }, 'cover_generation_queue_failed');
          // Continue even if cover generation fails
        }

        // Step 13: Completed
        emitStoryGenerationProgress(
          io,
          user.id,
          sessionId,
          createProgressEvent(
            StoryGenerationStep.COMPLETED,
            100,
            'Story generation completed!',
            {
              storyId: story.id,
              story,
              coverJobId,
            }
          )
        );

        logger.info({
          storyId: story.id,
          sessionId,
          userId: user.id,
        }, 'automated_story_generation_completed');

      } catch (error) {
        logger.error({ error, sessionId }, 'automated_story_generation_failed');
        emitStoryGenerationProgress(
          io,
          user.id,
          sessionId,
          createProgressEvent(
            StoryGenerationStep.ERROR,
            0,
            'Story generation failed',
            {
              error: error instanceof Error ? error.message : 'Unknown error',
              details: error instanceof Error ? error.stack : undefined,
            }
          )
        );
      }
    });

  } catch (error) {
    logger.error({ error }, 'automated_story_generation_init_failed');
    res.status(500).json({
      error: 'Failed to start story generation',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
