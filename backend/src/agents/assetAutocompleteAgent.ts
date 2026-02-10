import { callLLM } from '../services/llm';
import { trackFromLLMResponse } from '../services/llm/llmUsageTracker';
import { parseJsonSafe } from '../utils/json';
import { logger } from '../config/logger';

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

type AssetType = 'CLOTHING' | 'ACCESSORY' | 'SCAR' | 'HAIRSTYLE' | 'OBJECT' | 'WEAPON' | 'VEHICLE' | 'FURNITURE' | 'PROP';

type AssetCategory = 'WEARABLE' | 'HOLDABLE' | 'ENVIRONMENTAL';

type VisualStyle = 'ANIME' | 'REALISTIC' | 'SEMI_REALISTIC' | 'CARTOON' | 'MANGA' | 'MANHWA' | 'COMIC' | 'CHIBI' | 'PIXEL_ART' | 'THREE_D';

type Visibility = 'PRIVATE' | 'UNLISTED' | 'PUBLIC';

// Local copy of the asset form shape to avoid importing frontend code directly.
// If a shared types package exists, replace this with it. For now, we define the minimal subset we need.
export type AssetAutocompleteInput = Partial<{
  name: string;
  description: string;
  type: AssetType;
  category: AssetCategory;
  style: VisualStyle;
  ageRating: AgeRating;
  contentTags: ContentTag[];
  visibility: Visibility;
  originalLanguageCode: string;
}>;

export type AssetAutocompleteMode = 'ai' | 'web';

export type AssetAutocompleteResult = Partial<AssetAutocompleteInput>;

function buildSystemPrompt(mode: AssetAutocompleteMode) {
  const webNote = mode === 'web'
    ? '\n- You have access to web_search tool. Use it to find accurate information about real clothing, accessories, objects, or historical items.'
    + '\n- When filling in details about known items or styles, search for factual information first.'
    + '\n- For original assets, use web search to find inspiration from similar items, fashion styles, or object designs.'
    + '\n- Cite sources when using web-searched information (e.g., "Based on [source]: ...").'
    + '\n- If no relevant web results, proceed with creative, original suggestions.'
    : '';
  return [
    'You are an asset design assistant for clothing, accessories, hairstyles, objects, weapons, vehicles, furniture, and props.',
    'Given partially filled asset fields, you will propose values ONLY for the missing or empty fields.',
    'Focus on: visual appearance, style (anime, realistic, etc.), category (wearable, holdable, environmental), placement zones, and AI generation prompts.',
    'Asset types: CLOTHING, ACCESSORY, SCAR, HAIRSTYLE, OBJECT, WEAPON, VEHICLE, FURNITURE, PROP',
    'Asset categories: WEARABLE (items worn on body), HOLDABLE (items held in hands), ENVIRONMENTAL (furniture, vehicles, scenery)',
    '',
    'Follow these rules:',
    '- Respect the target age rating and content tags; avoid explicit content outside allowed ratings.',
    '- Keep tone consistent with any provided style/category.',
    '- Keep outputs concise and helpful for UI forms.',
    '- For visual descriptions, focus on appearance details (color, material, style, shape).',
    '- For AI prompts, provide detailed descriptions suitable for image generation.',
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

const STYLE_OPTIONS = ['ANIME', 'REALISTIC', 'SEMI_REALISTIC', 'CARTOON', 'MANGA', 'MANHWA', 'COMIC', 'CHIBI', 'PIXEL_ART', 'THREE_D'];

function buildUserPrompt(input: AssetAutocompleteInput) {
  // Identify empty fields (null, empty string, undefined)
  const emptyKeys = Object.entries(input)
    .filter(([_, v]) => v === undefined || v === null || (typeof v === 'string' && v.trim() === ''))
    .map(([k]) => k);

  const provided = Object.fromEntries(
    Object.entries(input).filter(([_, v]) => !(v === undefined || v === null || (typeof v === 'string' && v.trim() === '')))
  );

  const wanted = emptyKeys.length > 0 ? emptyKeys : [
    // If nothing is empty, suggest small refinements for these fields (but still output only fields you propose)
    'description', 'style', 'ageRating', 'contentTags'
  ];

  return [
    'Existing asset data (only pre-filled fields):',
    JSON.stringify(provided, null, 2),
    '',
    'Return JSON object with only these missing fields if applicable:',
    JSON.stringify(wanted),
    '',
    'Allowed keys ONLY: ["description","style","ageRating","contentTags"]',
    '',
    'Types:',
    '- description: string (2-4 sentences describing the visual appearance of the asset - color, material, style, shape)',
    `- style: Visual style (must be one of: ${STYLE_OPTIONS.join(', ')})`,
    '- ageRating: Age rating from these EXACT values: L, TEN, TWELVE, FOURTEEN, SIXTEEN, EIGHTEEN',
    '  - L: General audience, all ages (no violence, no sexual content, no strong language)',
    '  - TEN: 10+ years (mild fantasy violence, mild language)',
    '  - TWELVE: 12+ years (moderate violence, some suggestive themes, mild language)',
    '  - FOURTEEN: 14+ years (intense action, some sexual references, stronger language)',
    '  - SIXTEEN: 16+ years (strong violence, sexual themes, nudity, strong language)',
    '  - EIGHTEEN: 18+ years (explicit sexual content, extreme violence, explicit language)',
    '- contentTags: array from this exact set: VIOLENCE, GORE, SEXUAL, NUDITY, LANGUAGE, DRUGS, ALCOHOL, HORROR, PSYCHOLOGICAL, DISCRIMINATION, CRIME, GAMBLING',
    '  - IMPORTANT: Match content tags with appropriate age rating!',
    '  - If suggesting SEXUAL or NUDITY, ageRating must be SIXTEEN or higher',
    '  - If suggesting GORE or HORROR, ageRating must be FOURTEEN or higher',
    '  - If suggesting DRUGS or ALCOHOL, ageRating must be TWELVE or higher',
    '  - Default to L if no sensitive content',
    '',
    'IMPORTANT: style and ageRating MUST match the exact values listed above.',
    'Do NOT invent or include image URLs or media fields.',
    'For arrays, provide valid JSON arrays. For text fields, keep them concise.',
    '',
    'Asset-specific guidance:',
    '- CLOTHING: Describe fabric, cut, fit, color, patterns, style (casual, formal, fantasy armor, etc.)',
    '- ACCESSORY: Describe material, size, attachment method, decorative elements',
    '- HAIRSTYLE: Describe length, texture, color, style (ponytail, braided, spiky, etc.)',
    '- SCAR: Describe shape, placement, texture, color, size',
    '- OBJECT: Describe size, material, purpose, appearance details',
    '- WEAPON: Describe type (melee, ranged), size, material, style (fantasy sword, modern firearm, etc.), lethality',
    '- VEHICLE: Describe type, size, style, key features',
    '- FURNITURE: Describe size, material, style, function',
    '- PROP: Describe purpose, appearance, how it\'s used',
  ].join('\n');
}

export async function runAssetAutocomplete(
  input: AssetAutocompleteInput,
  mode: AssetAutocompleteMode = 'ai',
  preferredLanguage?: string
): Promise<AssetAutocompleteResult> {
  // Build strong language instruction
  const langHint = preferredLanguage
    ? `\n\nLANGUAGE REQUIREMENT (CRITICAL):
- You MUST write ALL text fields (description) in the language: ${preferredLanguage}
- The user's preferred language/locale is: ${preferredLanguage}
- Respect regional variants (e.g., pt-BR is Brazilian Portuguese, pt-PT is European Portuguese, en-US vs en-GB)
- Do NOT use English unless the specified language IS English (en, en-US, en-GB, etc.)
- Translate asset information to ${preferredLanguage} if needed
- Keep proper names (asset name) in their original language, but ALL descriptions in ${preferredLanguage}
- Example: If asset is "Red Sword" and language is "pt-BR", write description in Brazilian Portuguese`
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

  // Track LLM usage for cost analysis
  trackFromLLMResponse(llmResponse, {
    userId: undefined,
    feature: 'AUTOMATED_GENERATION',
    featureId: undefined,
    operation: 'asset_autocomplete',
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
    logger.warn({ text: text.substring(0, 200) }, 'Failed to parse LLM JSON for asset autocomplete');
    return {};
  }
}

function sanitizeAutocomplete(obj: Record<string, unknown>): AssetAutocompleteResult {
  const out: Record<string, unknown> = {};
  const allowed = new Set([
    'description', 'style', 'ageRating', 'contentTags'
  ]);

  // Minimum age rating for each content tag
  const TAG_MIN_AGE: Record<string, AgeRating> = {
    VIOLENCE: 'L',
    GORE: 'FOURTEEN',
    SEXUAL: 'SIXTEEN',
    NUDITY: 'SIXTEEN',
    LANGUAGE: 'TEN',
    DRUGS: 'TWELVE',
    ALCOHOL: 'TWELVE',
    HORROR: 'FOURTEEN',
    PSYCHOLOGICAL: 'FOURTEEN',
    DISCRIMINATION: 'TEN',
    CRIME: 'TWELVE',
    GAMBLING: 'EIGHTEEN',
  };

  const AGE_RANK: Record<AgeRating, number> = {
    L: 0,
    TEN: 1,
    TWELVE: 2,
    FOURTEEN: 3,
    SIXTEEN: 4,
    EIGHTEEN: 5,
  };

  const AGE_RATINGS: AgeRating[] = ['L', 'TEN', 'TWELVE', 'FOURTEEN', 'SIXTEEN', 'EIGHTEEN'];

  for (const [key, value] of Object.entries(obj)) {
    if (!allowed.has(key)) continue;
    switch (key) {
      case 'ageRating': {
        if (typeof value === 'string') {
          const normalized = value.trim().toUpperCase() as AgeRating;
          if (AGE_RATINGS.includes(normalized)) {
            out.ageRating = normalized;
          }
        }
        break;
      }
      case 'contentTags': {
        const allowedTags = new Set([
          'VIOLENCE','GORE','SEXUAL','NUDITY','LANGUAGE','DRUGS','ALCOHOL','HORROR','PSYCHOLOGICAL','DISCRIMINATION','CRIME','GAMBLING'
        ]);
        if (Array.isArray(value)) {
          const filtered = value
            .map(v => (typeof v === 'string' ? v.toUpperCase().trim() : ''))
            .filter(v => allowedTags.has(v));
          if (filtered.length > 0) out.contentTags = filtered as ContentTag[];
        }
        break;
      }
      case 'style': {
        if (typeof value === 'string') {
          const normalized = value.trim().toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_');
          if (STYLE_OPTIONS.includes(normalized as any)) {
            out.style = normalized as any;
          }
        }
        break;
      }
      default:
        if (typeof value === 'string') (out as any)[key] = value;
        break;
    }
  }

  // Auto-adjust age rating based on content tags (backend validation)
  if (out.contentTags && Array.isArray(out.contentTags)) {
    const currentAgeRating = (out.ageRating as AgeRating) || 'L';
    const currentRank = AGE_RANK[currentAgeRating] ?? 0;

    for (const tag of out.contentTags as ContentTag[]) {
      const minAge = TAG_MIN_AGE[tag];
      if (minAge && AGE_RANK[minAge] > currentRank) {
        out.ageRating = minAge; // Upgrade to minimum required
      }
    }
  }

  return out as AssetAutocompleteResult;
}
