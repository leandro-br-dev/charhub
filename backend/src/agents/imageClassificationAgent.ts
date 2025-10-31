import { callLLM } from '../services/llm';
import { logger } from '../config/logger';
import { parseJsonSafe } from '../utils/json';

export type ImageClassificationResult = {
  ageRating: 'L' | 'TEN' | 'TWELVE' | 'FOURTEEN' | 'SIXTEEN' | 'EIGHTEEN';
  contentTags: (
    | 'VIOLENCE' | 'GORE' | 'SEXUAL' | 'NUDITY' | 'LANGUAGE'
    | 'DRUGS' | 'ALCOHOL' | 'HORROR' | 'PSYCHOLOGICAL'
    | 'DISCRIMINATION' | 'CRIME' | 'GAMBLING'
  )[];
  description: string; // Short en-US description (1-2 sentences)
};

function buildSystemPrompt() {
  return [
    'You are a precise image content classifier.',
    'Given an input image (described by the user), return strictly a JSON object with:',
    '- ageRating: one of ["L","TEN","TWELVE","FOURTEEN","SIXTEEN","EIGHTEEN"]',
    '- contentTags: array of strings from ["VIOLENCE","GORE","SEXUAL","NUDITY","LANGUAGE","DRUGS","ALCOHOL","HORROR","PSYCHOLOGICAL","DISCRIMINATION","CRIME","GAMBLING"]',
    '- description: short content description in en-US (1-2 sentences).',
    'Do not include any other keys or commentary. JSON only.',
  ].join('\n');
}

function buildUserPrompt(imageUrl: string) {
  return [
    `Image URL: ${imageUrl}`,
    'Analyze this image and respond with the JSON object described.',
  ].join('\n');
}

export async function classifyImageViaLLM(imageUrl: string): Promise<ImageClassificationResult> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(imageUrl);

  const response = await callLLM({
    provider: 'grok',
    model: 'grok-4-fast-non-reasoning',
    systemPrompt,
    userPrompt,
    temperature: 0,
    maxTokens: 512,
  } as any);

  const raw = (response.content || '').trim();
  try {
    const parsed = parseJsonSafe<ImageClassificationResult>(raw);
    // Basic sanity checks
    const allowedAges = new Set(['L','TEN','TWELVE','FOURTEEN','SIXTEEN','EIGHTEEN']);
    const allowedTags = new Set(['VIOLENCE','GORE','SEXUAL','NUDITY','LANGUAGE','DRUGS','ALCOHOL','HORROR','PSYCHOLOGICAL','DISCRIMINATION','CRIME','GAMBLING']);
    const age = allowedAges.has((parsed as any).ageRating) ? (parsed as any).ageRating : 'L';
    const tags = Array.isArray(parsed.contentTags)
      ? parsed.contentTags.filter(t => typeof t === 'string' && allowedTags.has(t.toUpperCase())).map(t => t.toUpperCase()) as ImageClassificationResult['contentTags']
      : [];
    const description = typeof parsed.description === 'string' ? parsed.description : '';
    return { ageRating: age as any, contentTags: tags, description };
  } catch (e) {
    logger.warn({ raw }, 'image_classification_parse_failed');
    return { ageRating: 'L', contentTags: [], description: '' };
  }
}

