/**
 * Prompt Agent Service
 * Specialized AI agent for generating Stable Diffusion prompts
 * Uses GROK (xAI) for both SFW and NSFW content generation
 */

import { callGrok } from '../llm/grok';

// ============================================================================
// TYPES
// ============================================================================

export interface PromptAgentInput {
  // Character information
  character: {
    name: string;
    gender?: string;
    age?: number;
    species?: string;
    physicalCharacteristics?: string;
    personality?: string;
    defaultAttire?: string;
    style?: string;
  };

  // Generation context
  generation: {
    type: 'AVATAR' | 'COVER' | 'STICKER' | 'REFERENCE_FRONT' | 'REFERENCE_SIDE' | 'REFERENCE_BACK' | 'REFERENCE_FACE';
    isNsfw?: boolean;
    emotion?: string; // For stickers
  };

  // User custom input
  userInput?: {
    prompt?: string; // User's custom prompt (scene, clothing, actions, etc.)
    isAdditive?: boolean; // true = adds details, false = replaces (e.g., clothing)
  };

  // Reference images info
  hasReferenceImages?: boolean;
  referenceImageCount?: number;

  // Optional overrides
  overrides?: {
    cameraAngle?: string;
    composition?: string;
    background?: string;
    lighting?: string;
  };
}

export interface PromptAgentOutput {
  positive: string;
  negative: string;
}

// ============================================================================
// PROMPT AGENT
// ============================================================================

export class PromptAgent {
  /**
   * Generate Stable Diffusion prompts (positive and negative)
   * using GROK AI with full context awareness
   */
  async generatePrompts(input: PromptAgentInput): Promise<PromptAgentOutput> {
    const { generation, hasReferenceImages } = input;

    // Build the system prompt with rules
    const systemPrompt = this.buildSystemPrompt(generation, hasReferenceImages);

    // Build the user prompt with all context
    const userPrompt = this.buildUserPrompt(input);

    try {
      const response = await callGrok({
        model: 'grok-4-1-fast-non-reasoning',
        systemPrompt,
        userPrompt,
        maxTokens: 800,
        temperature: 0.7,
      });

      // Parse the response to extract positive and negative prompts
      return this.parseResponse(response.content, generation);
    } catch (error) {
      console.error('Prompt generation failed:', error);
      // Fallback to basic prompt
      return this.getFallbackPrompt(input);
    }
  }

  /**
   * Build system prompt with rules for prompt generation
   */
  private buildSystemPrompt(
    generation: PromptAgentInput['generation'],
    hasReferenceImages?: boolean
  ): string {
    const isCover = generation.type === 'COVER';
    const isAvatar = generation.type === 'AVATAR';
    const isSticker = generation.type === 'STICKER';
    const isReference = generation.type.startsWith('REFERENCE');

    const refInfo = hasReferenceImages
      ? `\n\nREFERENCE IMAGES: The character has ${hasReferenceImages ? 'reference images' : 'NO reference images yet'}. If reference images exist, focus on scene/clothing from user input. If NO references, include detailed character appearance.`
      : '';

    return `You are an expert Stable Diffusion prompt engineer specializing in ${generation.isNsfw ? 'NSFW and SFW' : 'SFW'} anime-style character art generation.

# OUTPUT FORMAT
Return ONLY the prompts in this exact format:

POSITIVE: [your positive prompt here]
NEGATIVE: [your negative prompt here]

# POSITIVE PROMPT STRUCTURE

1. **First Section - Core Character** (if no reference images or if explicitly needed):
   - Subject tag: 1girl, 1boy, etc.
   - Key physical traits: hair, eyes, distinctive features
   - Expression and pose basics

2. **Second Section - Quality Boosters**:
   - Masterpiece, best quality, ultra-detailed, absurdres, highres, 8k
   - Aesthetic tags: very aesthetic, highly detailed, cinematic
   - Specific detail tags: detailed hair, detailed face, detailed eyes

3. **BREAK** separator

4. **Third Section - Scene & Context**:
   - Clothing (user input OR default attire)
   - Background/environment
   - Camera angle and composition
   - Lighting and atmosphere
   - Action/pose details

Example structure:
1woman, black hair, bob hair, hair over one eye, black eyes, villainess, smirk, closed mouth, masterpiece, high detailed skin, best quality, high res, very aesthetic, villainess, smirk, perfect eyes, (detailed face), evil smile, lush lips, (close-up portrait off-shoulder, highly detailed, masterpiece, best quality, hyper detailed, cinematic composition)
(masterpiece, best quality, ultra-detailed, absurdres, highres, 8k, very aesthetic, highly detailed, cinematic, full detailed, detailed hair, detailed face, detailed eyes) evil grin
BREAK
mini dress, fur trimmed, black patterned dress, black sheer embroidered short sleeves, white fur boa, cross-laced boots, perspective shot, dynamic angle, focus, smirk, warm atmosphere, in heat, cocktail bar, twinkle, sitting at bar, legs crossed, hand on knee, looking away, beautiful face, beautiful eyes, detailed eyes, sharp focus, highest quality, ultra HD, high resolution, 8K, official_anime_key_visual, sharp lines, vivid contrast, glossy texture, soft lighting, tonal balance, high aesthetic sense, shadow gradation, and visual harmony, BREAK, Hype4realistic

# NEGATIVE PROMPT RULES

The negative prompt must be the OPPOSITE of what you want in the positive prompt:

1. **Dynamic & Contextual**: Base it on the positive prompt content
2. **Subject Count**: If positive has "1girl" or "solo", negative includes "multiple girls, multiple characters"
   - If positive has "2girls", DON'T include multiple subjects in negative
3. **Quality**: Always include quality negatives but adjust based on positive
4. **Opposites**: If positive has "smile", negative can include "frown"
5. **Avoid Contradictions**: Don't negate what's actually wanted in the positive

Example:
- Positive: "1girl, smile, standing at beach"
- Negative: "low quality, multiple girls, frown, indoors, poorly drawn hands"

# EMPHASIS RULES

**IMPORTANT**: Use ONLY these emphasis methods:
- Single parentheses for emphasis: (detailed face)
- Double parentheses for strong emphasis: ((masterpiece))
- Periods for extra emphasis: very.. detailed.. face
- DO NOT use numerical weights like :1.3, :1.2, etc. - these cause color instability

${isAvatar || (isReference && generation.type === 'REFERENCE_FACE') ? `
# FACE-ONLY GENERATION RULES

CRITICAL: For ${isAvatar ? 'AVATAR' : 'REFERENCE FACE'} generation, focus EXCLUSIVELY on the face:

**ALLOWED** (face and neck only):
- Facial features: eyes, nose, mouth, lips, eyebrows, eyelashes
- Hair: hair, bangs, hair accessories
- Expression: smile, smirk, frown, etc.
- Neck and shoulders (upper chest/shoulders area only)
- Jewelry/accessories on head/neck

**FORBIDDEN** (body details):
- NO body descriptions: curvy body, voluptuous breasts, large breasts, thick thighs, wide hips, etc.
- NO full body references
- NO clothing below shoulders/upper chest
- NO arms, hands, legs, feet

The goal is to generate HEADSHOTS that focus on facial features. Any body details will cause the model to generate full body images instead of face portraits.

**Negative prompt MUST include**: full body, wide shot, body, breasts, thighs, hips, arms, hands, legs
` : ''}

# GENERATION TYPE SPECIFICS

${isCover ? `
## COVER GENERATION
- Aspect ratio: Portrait 3:4 (768x1152)
- Full body composition
- Focus on character + environment interaction
- Emphasize scene and clothing from user input
- Use ((double parentheses)) for user-provided tags to override references
` : ''}

${isAvatar ? `
## AVATAR GENERATION
- Aspect ratio: Square 1:1 (768x768)
- Close-up portrait, headshot focus
- Face and neck ONLY - no body details
- Simple background unless specified
- DO NOT include: breasts, body, curves, thighs, hips, arms, legs
` : ''}

${isSticker ? `
## STICKER GENERATION
- Transparent/chroma key background
- Character + emotion/action
- Simple, clean composition
` : ''}

${isReference ? `
## REFERENCE GENERATION
- Type: ${generation.type.replace('REFERENCE_', '')}
${generation.type === 'REFERENCE_FACE' ? '- Face portrait ONLY - no body details' : '- Full body'}
- Clean background for reference
- Neutral expression unless specified
` : ''}

# USER INTERPRETATION

User input can be:
- **Additive**: Adds details (keep existing, add more)
- **Substitutive**: Replaces elements (especially clothing, scene)

If user provides clothing/scene descriptions, they OVERRIDE defaults. Use ((double parentheses)) for emphasis.

# FINAL NOTES

- Use comma-separated tags in danbooru format
- Include BREAK between sections for better model understanding
- Quality tags first, character traits next, scene last
- Be specific but concise
- Use emphasis parentheses: (tag), ((tag)) for emphasis
- DO NOT use numerical weights: no :1.2, :1.3, :1.4, etc.
${generation.isNsfw ? '- NSFW content is ALLOWED when requested or implied by context' : '- Keep content SFW unless explicitly requested'}${refInfo}`;
  }

  /**
   * Build user prompt with all character context
   */
  private buildUserPrompt(input: PromptAgentInput): string {
    const { character, generation, userInput, overrides } = input;

    let prompt = `Generate Stable Diffusion prompts for the following:\n\n`;

    // Character details
    prompt += `## CHARACTER\n`;
    prompt += `Name: ${character.name}\n`;
    prompt += `Gender: ${character.gender || 'unknown'}\n`;
    if (character.age) prompt += `Age: ${character.age}\n`;
    if (character.species) prompt += `Species: ${character.species}\n`;
    if (character.physicalCharacteristics) {
      prompt += `Physical Characteristics: ${character.physicalCharacteristics}\n`;
    }
    if (character.personality) {
      prompt += `Personality: ${character.personality}\n`;
    }
    if (character.defaultAttire) {
      prompt += `Default Attire: ${character.defaultAttire}\n`;
    }
    if (character.style) {
      prompt += `Style: ${character.style}\n`;
    }

    // Generation type
    prompt += `\n## GENERATION TYPE\n`;
    prompt += `Type: ${generation.type}\n`;
    if (generation.emotion) {
      prompt += `Emotion: ${generation.emotion}\n`;
    }

    // User input
    if (userInput?.prompt) {
      prompt += `\n## USER INPUT\n`;
      prompt += `Prompt: "${userInput.prompt}"\n`;
      prompt += `Type: ${userInput.isAdditive ? 'Additive (adds details)' : 'Substitutive (replaces elements like clothing/scene)'}\n`;
    }

    // Overrides (optional manual settings)
    if (overrides) {
      prompt += `\n## OVERRIDES\n`;
      if (overrides.cameraAngle) prompt += `Camera Angle: ${overrides.cameraAngle}\n`;
      if (overrides.composition) prompt += `Composition: ${overrides.composition}\n`;
      if (overrides.background) prompt += `Background: ${overrides.background}\n`;
      if (overrides.lighting) prompt += `Lighting: ${overrides.lighting}\n`;
    }

    prompt += `\nGenerate the POSITIVE and NEGATIVE prompts following the specified format.`;

    return prompt;
  }

  /**
   * Parse LLM response to extract positive and negative prompts
   */
  private parseResponse(response: string, generation: PromptAgentInput['generation']): PromptAgentOutput {
    // Try to extract POSITIVE and NEGATIVE sections
    const positiveMatch = response.match(/POSITIVE:\s*(.+?)(?=NEGATIVE:|$)/is);
    const negativeMatch = response.match(/NEGATIVE:\s*(.+?)$/is);

    let positive = '';
    let negative = '';

    if (positiveMatch) {
      positive = positiveMatch[1].trim();
    }
    if (negativeMatch) {
      negative = negativeMatch[1].trim();
    }

    // If parsing failed, try to split differently
    if (!positive || !negative) {
      const lines = response.split('\n').filter(l => l.trim());
      if (lines.length >= 2) {
        if (!positive) positive = lines[0];
        if (!negative) negative = lines.slice(1).join('\n');
      }
    }

    // Clean up the prompts
    positive = this.cleanPrompt(positive);
    negative = this.cleanPrompt(negative);

    // Ensure negative has basic quality tags if empty
    if (!negative || negative.length < 50) {
      negative = this.getDefaultNegative(positive, generation);
    }

    return { positive, negative };
  }

  /**
   * Clean up prompt text
   */
  private cleanPrompt(prompt: string): string {
    return prompt
      .replace(/[""]/g, '"')  // Normalize quotes
      .replace(/\n{3,}/g, '\n\n')  // Max 2 consecutive newlines
      .trim();
  }

  /**
   * Get default negative prompt based on positive content
   */
  private getDefaultNegative(positive: string, generation: PromptAgentInput['generation']): string {
    const hasSingleSubject = /\b(1girl|1boy|solo)\b/i.test(positive);
    const hasSmile = /\bsmile|smirk|grin\b/i.test(positive);
    const isFaceGeneration = generation.type === 'AVATAR' || generation.type === 'REFERENCE_FACE';

    let negative = 'low quality, worst quality, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, jpeg artifacts, signature, watermark, username, blurry';

    if (hasSingleSubject) {
      negative += ', multiple girls, multiple characters, multiple views';
    }

    if (hasSmile) {
      negative += ', frown, sad, angry';
    }

    // Add body exclusions for face generation
    if (isFaceGeneration) {
      negative += ', full body, wide shot, body, breasts, thick thighs, wide hips, voluptuous, curvy, arms, hands, legs, feet, shoulders, upper body';
    }

    // Add type-specific negatives
    if (generation.type === 'AVATAR' || generation.type === 'COVER') {
      negative += ', full body, wide angle, grid layout, multiple panels';
    } else if (generation.type.startsWith('REFERENCE_')) {
      const viewType = generation.type.replace('REFERENCE_', '');
      if (viewType === 'FRONT') {
        negative += ', side view, back view, headshot only';
      } else if (viewType === 'SIDE') {
        negative += ', front view, back view, looking at camera';
      } else if (viewType === 'BACK') {
        negative += ', front view, face visible, looking at camera';
      } else if (viewType === 'FACE') {
        negative += ', full body, multiple views, wide angle';
      }
    }

    return negative;
  }

  /**
   * Fallback prompt when LLM fails
   */
  private getFallbackPrompt(input: PromptAgentInput): PromptAgentOutput {
    const { character, generation, userInput } = input;

    const genderTag = character.gender?.toLowerCase()?.includes('fem') ? '1girl' : '1boy';
    const nameTag = character.name || 'character';
    const isFaceGeneration = generation.type === 'AVATAR' || generation.type === 'REFERENCE_FACE';

    let positive = `${genderTag}, ${nameTag}`;

    // Add basic quality tags
    positive += ', masterpiece, best quality, ultra-detailed, highres, 8k, very aesthetic, highly detailed';

    // Add type-specific tags
    if (generation.type === 'COVER') {
      positive += ', full body, standing, looking at viewer, solo, cinematic lighting, detailed composition';
    } else if (isFaceGeneration) {
      positive += ', close-up portrait, detailed face, looking at viewer, headshot, face focus';
    }

    // Add user prompt if provided
    if (userInput?.prompt) {
      positive += `, ${userInput.prompt}`;
    }

    // Add style
    if (character.style) {
      positive += `, (${character.style})`;
    }

    let negative = 'low quality, worst quality, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, jpeg artifacts, signature, watermark, username, blurry';

    // Add multiple subject exclusions (not relevant for face generation)
    if (!isFaceGeneration) {
      negative += ', multiple girls, multiple characters';
    }

    // Add body exclusions for face generation
    if (isFaceGeneration) {
      negative += ', full body, wide shot, body, breasts, thick thighs, wide hips, voluptuous, curvy, arms, hands, legs, feet, shoulders, upper body';
    }

    return { positive, negative };
  }
}

// Singleton instance
export const promptAgent = new PromptAgent();
