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

type Visibility = 'PRIVATE' | 'UNLISTED' | 'PUBLIC';

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
  visibility: Visibility;
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
    ? '\n- You have access to web_search tool. Use it to find accurate information about real characters, celebrities, or fictional characters from media.'
    + '\n- When filling in details about known characters, search for factual information first.'
    + '\n- For original characters, use web search to find inspiration from similar character archetypes or tropes.'
    + '\n- Cite sources when using web-searched information (e.g., "Based on [source]: ...").'
    + '\n- If no relevant web results, proceed with creative, original suggestions.'
    : '';
  return [
    'You are a character design assistant.',
    'Given partially filled character fields, you will propose values ONLY for the missing or empty fields.',
    'Follow these rules:',
    '- Respect the target age rating and content tags; avoid explicit content outside allowed ratings.',
    '- Keep tone consistent with any provided style/species/gender.',
    '- Keep outputs concise and helpful for UI forms.',
    '',
    'CRITICAL OUTPUT FORMAT:',
    '- You MUST return ONLY valid JSON',
    '- NO markdown code blocks (no ```json or ```)',
    '- NO explanations, commentary, or additional text',
    '- NO prefix or suffix text',
    '- ONLY the raw JSON object',
    '- Include only keys you are filling (omit any provided ones)',
    '',
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
  // Build strong language instruction
  const langHint = preferredLanguage
    ? `\n\nLANGUAGE REQUIREMENT (CRITICAL):
- You MUST write ALL text fields (personality, history, physicalCharacteristics, etc.) in the language: ${preferredLanguage}
- The user's preferred language/locale is: ${preferredLanguage}
- Respect regional variants (e.g., pt-BR is Brazilian Portuguese, pt-PT is European Portuguese, en-US vs en-GB)
- Do NOT use English unless the specified language IS English (en, en-US, en-GB, etc.)
- Translate character information to ${preferredLanguage} if needed
- Keep proper names (firstName, lastName) in their original language, but ALL descriptions in ${preferredLanguage}
- Example: If character is "Naruto" and language is "pt-BR", write personality/history in Brazilian Portuguese`
    : '';

  const systemPrompt = buildSystemPrompt(mode) + langHint;
  const userPrompt = buildUserPrompt(input);

  const llmResponse = await callLLM({
    provider: 'gemini',
    model: 'gemini-2.5-flash-lite',
    systemPrompt,
    userPrompt,
    temperature: 0.7,
    allowBrowsing: mode === 'web',
    autoExecuteTools: mode === 'web', // Auto-execute web search if in web mode
  });

  // Parse JSON safely - clean markdown if present
  let text = llmResponse.content?.trim() || '{}';

  // Remove markdown code blocks if present
  if (text.startsWith('```')) {
    // Extract content between ```json and ``` or between ``` and ```
    const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (match) {
      text = match[1].trim();
    }
  }

  // Remove any leading/trailing text that's not JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    text = jsonMatch[0];
  }

  try {
    const parsed = parseJsonSafe<Record<string, unknown>>(text) || {};
    const sanitized = sanitizeAutocomplete(parsed);
    return sanitized;
  } catch (_e) {
    logger.warn({ text: text.substring(0, 200) }, 'Failed to parse LLM JSON for character autocomplete');
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
