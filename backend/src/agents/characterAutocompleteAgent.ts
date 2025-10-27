import { callLLM } from '../services/llm';
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
    'Allowed keys: ["lastName","age","gender","species","style","physicalCharacteristics","personality","history","contentTags","cover"]',
    'If unsure about contentTags, propose a small, relevant subset from: ["VIOLENCE","GORE","SEXUAL","NUDITY","LANGUAGE","DRUGS","ALCOHOL","HORROR","PSYCHOLOGICAL","DISCRIMINATION","CRIME","GAMBLING"]; omit if not needed.',
    'For numbers like age, provide a number. For lists like contentTags, provide an array of strings. For text fields, keep a few sentences max.',
  ].join('\n');
}

export async function runCharacterAutocomplete(
  input: CharacterAutocompleteInput,
  mode: CharacterAutocompleteMode = 'ai'
): Promise<CharacterAutocompleteResult> {
  const systemPrompt = buildSystemPrompt(mode);
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
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object') {
      return parsed as CharacterAutocompleteResult;
    }
  } catch (e) {
    logger.warn({ text }, 'Failed to parse LLM JSON for character autocomplete');
  }
  return {};
}
