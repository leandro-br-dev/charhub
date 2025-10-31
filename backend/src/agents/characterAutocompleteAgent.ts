import { callLLM } from '../services/llm';
import { parseJsonSafe } from '../utils/json';
type ContentTag =
  | 'VIOLENCE'
  | 'GORE'
  | 'SEXUAL'
  | 'NUDITY'
  | 'LANGUAGE'
  | 'DRUGS'
  | 'ALCOHOL'
  | 'HORROR'
  | 'PSYCHOLOGICAL'
  | 'DISCRIMINATION'
  | 'CRIME'
  | 'GAMBLING';
type AgeRating = 'L' | 'TEN' | 'TWELVE' | 'FOURTEEN' | 'SIXTEEN' | 'EIGHTEEN';
import { logger } from '../config/logger';

// Local copy of the character form shape to avoid importing frontend code directly.
// If a shared types package exists, replace this with it. For now, we define the minimal subset we need.
export type CharacterAutocompleteInput = Partial<{
  firstName: string;
  lastName: string | null;
  age: number | null;
  gender: string | null;
  species: string | null;
  style: string | null;
  avatar: string | null;
  physicalCharacteristics: string | null;
  personality: string | null;
  history: string | null;
  isPublic: boolean;
  originalLanguageCode: string | null;
  ageRating: AgeRating;
  contentTags: ContentTag[];
  loraId: string | null;
  mainAttireId: string | null;
  tagIds: string[];
  attireIds: string[];
  cover: string | null;
}>;

export type CharacterAutocompleteMode = 'ai' | 'web';

export interface CharacterAutocompleteResult extends Partial<CharacterAutocompleteInput> {}

function buildSystemPrompt(mode: CharacterAutocompleteMode) {
  const webNote = mode === 'web'
    ? '\n- Prefer grounded, verifiable data if relevant. Cite well-known facts; avoid fabrications. If web tools are not available, proceed with reasonable, creative completion.'
    : '';
  return [
    'You are a character design assistant.',
    'Given partially filled character fields, you will propose values ONLY for the missing or empty fields.',
    'Follow these rules:',
    '- Respect the target age rating and content tags; avoid explicit content outside allowed ratings.',
    '- Keep tone consistent with any provided style/species/gender.',
    '- Keep outputs concise and helpful for UI forms.',
    '- Return STRICT JSON only, no markdown, no commentary.',
    '- Include only keys you are filling (omit any provided ones).',
    webNote,
  ].join('\n');
}

function buildUserPrompt(input: CharacterAutocompleteInput) {
  // Identify empty fields (null, empty string, undefined)
  const emptyKeys = Object.entries(input)
    .filter(([_, v]) => v === undefined || v === null || (typeof v === 'string' && v.trim() === ''))
    .map(([k]) => k);

  const provided = Object.fromEntries(
    Object.entries(input).filter(([_, v]) => !(v === undefined || v === null || (typeof v === 'string' && v.trim() === '')))
  );

  const wanted = emptyKeys.length > 0 ? emptyKeys : [
    // If nothing is empty, suggest small refinements for these fields (but still output only fields you propose)
    'physicalCharacteristics', 'personality', 'history'
  ];

  return [
    'Existing character data (only pre-filled fields):',
    JSON.stringify(provided, null, 2),
    '',
    'Return JSON object with only these missing fields if applicable:',
    JSON.stringify(wanted),
    '',
    'Allowed keys ONLY (omit avatar/cover/media/urls): ["lastName","age","gender","species","style","physicalCharacteristics","personality","history","contentTags"]',
    'Types:',
    '- lastName: string',
    '- age: number',
    '- gender: string',
    '- species: string',
    '- style: string',
    '- physicalCharacteristics: string (not object). If you have multiple attributes like height/weight, merge into one short paragraph.',
    '- personality: string (1-3 sentences)',
    '- history: string (1-4 sentences)',
    '- contentTags: array of strings from this set only: ["VIOLENCE","GORE","SEXUAL","NUDITY","LANGUAGE","DRUGS","ALCOHOL","HORROR","PSYCHOLOGICAL","DISCRIMINATION","CRIME","GAMBLING"]',
    'Do NOT invent or include image URLs or media fields (avatar, cover).',
    'For numbers like age, provide a number (not string). For arrays, provide valid JSON arrays. For text fields, keep them concise.',
  ].join('\n');
}

export async function runCharacterAutocomplete(
  input: CharacterAutocompleteInput,
  mode: CharacterAutocompleteMode = 'ai',
  preferredLanguage?: string
): Promise<CharacterAutocompleteResult> {
  const langHint = preferredLanguage ? `\nCRITICAL: Respond in ${preferredLanguage}.` : '';
  const systemPrompt = buildSystemPrompt(mode) + langHint;
  const userPrompt = buildUserPrompt(input);

  const llmResponse = await callLLM({
    provider: 'gemini',
    model: 'gemini-2.5-flash-lite',
    systemPrompt,
    userPrompt,
    temperature: 0.7,
    // TODO(tools): allow tools + web browsing; wire when implemented in LLM service
    allowBrowsing: mode === 'web',
  } as any);

  // Parse JSON safely
  const text = llmResponse.content?.trim() || '{}';
  try {
    const parsed = parseJsonSafe<Record<string, unknown>>(text) || {};
    const sanitized = sanitizeAutocomplete(parsed);
    return sanitized;
  } catch (_e) {
    logger.warn({ text }, 'Failed to parse LLM JSON for character autocomplete');
    return {};
  }
}

function sanitizeAutocomplete(obj: Record<string, unknown>): CharacterAutocompleteResult {
  const out: Record<string, unknown> = {};
  const allowed = new Set([
    'lastName','age','gender','species','style','physicalCharacteristics','personality','history','contentTags'
  ]);

  for (const [key, value] of Object.entries(obj)) {
    if (!allowed.has(key)) continue;
    switch (key) {
      case 'age':
        if (typeof value === 'number' && Number.isFinite(value)) out.age = value as number;
        else if (typeof value === 'string') {
          const n = Number(value);
          if (Number.isFinite(n)) out.age = n;
        }
        break;
      case 'contentTags': {
        const allowedTags = new Set([
          'VIOLENCE','GORE','SEXUAL','NUDITY','LANGUAGE','DRUGS','ALCOHOL','HORROR','PSYCHOLOGICAL','DISCRIMINATION','CRIME','GAMBLING'
        ]);
        if (Array.isArray(value)) {
          const filtered = value
            .map(v => (typeof v === 'string' ? v.toUpperCase().trim() : ''))
            .filter(v => allowedTags.has(v));
          if (filtered.length > 0) out.contentTags = filtered as any;
        }
        break;
      }
      case 'physicalCharacteristics':
        if (typeof value === 'string') out.physicalCharacteristics = value;
        else if (value && typeof value === 'object') {
          // Convert object into a succinct string
          const entries = Object.entries(value as Record<string, unknown>)
            .filter(([, v]) => v != null && v !== '')
            .map(([k, v]) => `${capitalize(k)}: ${String(v)}`);
          if (entries.length > 0) out.physicalCharacteristics = entries.join('; ');
        }
        break;
      default:
        if (typeof value === 'string') (out as any)[key] = value;
        break;
    }
  }
  return out as CharacterAutocompleteResult;
}

function capitalize(s: string): string {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
