import { callLLM } from '../llm';
import { logger } from '../../config/logger';

export type AgeRating = 'L' | 'TEN' | 'TWELVE' | 'FOURTEEN' | 'SIXTEEN' | 'EIGHTEEN';

export interface ClassificationResult {
  ageRating: AgeRating;
  classification: 'SFW' | 'NSFW';
  reasoning?: string;
}

/**
 * Content Classification Service
 *
 * Uses Gemini 2.5 Flash-Lite to classify content and determine age rating.
 * This enables content filtering based on user age restrictions.
 */
class ContentClassificationService {
  /**
   * Classify text content and determine age rating
   *
   * Uses Gemini 2.5 Flash-Lite for fast, multilingual classification.
   *
   * Age Rating Guide:
   * - L: General audience, all ages
   * - TEN: 10+ years, mild content
   * - TWELVE: 12+ years, some mature themes
   * - FOURTEEN: 14+ years, moderate content
   * - SIXTEEN: 16+ years, strong themes, mild NSFW
   * - EIGHTEEN: 18+ years, explicit content
   *
   * @param text - Text content to classify
   * @param context - Additional context for classification
   * @returns Classification result with age rating
   */
  async classifyText(
    text: string,
    context?: {
      characterTags?: string[];
      storyTags?: string[];
      existingAgeRating?: AgeRating;
    }
  ): Promise<ClassificationResult> {
    try {
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(text, context);

      const response = await callLLM({
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
        systemPrompt,
        userPrompt,
        temperature: 0, // Consistent classification
        maxTokens: 256,
      });

      // Parse response
      const content = response.content.trim().toUpperCase();

      // Validate age rating
      const validRatings: AgeRating[] = ['L', 'TEN', 'TWELVE', 'FOURTEEN', 'SIXTEEN', 'EIGHTEEN'];
      const ageRating = validRatings.includes(content as AgeRating)
        ? (content as AgeRating)
        : 'L'; // Default to L if invalid

      const classification: 'SFW' | 'NSFW' = ageRating === 'L' || ageRating === 'TEN' || ageRating === 'TWELVE'
        ? 'SFW'
        : 'NSFW';

      logger.info({
        textLength: text.length,
        ageRating,
        classification,
      }, 'content_classified');

      return {
        ageRating,
        classification,
        reasoning: `Content classified as ${ageRating} (${classification})`,
      };
    } catch (error) {
      logger.error({ error }, 'content_classification_failed');
      // Default to safest rating on error
      return {
        ageRating: 'L',
        classification: 'SFW',
        reasoning: 'Classification failed - defaulting to L (SFW)',
      };
    }
  }

  /**
   * Check if user can access content based on their age
   *
   * @param contentAgeRating - Age rating of the content
   * @param userAge - User's age in years (optional)
   * @param userBirthDate - User's birth date (optional, calculated if provided)
   * @returns true if user can access, false otherwise
   */
  canUserAccessContent(
    contentAgeRating: AgeRating,
    userAge?: number,
    userBirthDate?: Date | string
  ): { canAccess: boolean; requiredAge: number; userAge?: number } {
    // Calculate user age from birth date if provided
    if (userBirthDate && !userAge) {
      const birth = typeof userBirthDate === 'string' ? new Date(userBirthDate) : userBirthDate;
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      userAge = age;
    }

    // Map age ratings to minimum ages
    const ageRequirements: Record<AgeRating, number> = {
      'L': 0,
      'TEN': 10,
      'TWELVE': 12,
      'FOURTEEN': 14,
      'SIXTEEN': 16,
      'EIGHTEEN': 18,
    };

    const requiredAge = ageRequirements[contentAgeRating];

    // If no user age available, require adult verification for 14+ content
    if (userAge === undefined) {
      return {
        canAccess: requiredAge < 14,
        requiredAge,
      };
    }

    return {
      canAccess: userAge >= requiredAge,
      requiredAge,
      userAge,
    };
  }

  /**
   * Validate user access and throw error if not allowed
   *
   * @param contentAgeRating - Age rating of the content
   * @param userAge - User's age
   * @param userBirthDate - User's birth date
   * @throws Error if user cannot access content
   */
  validateUserAccess(
    contentAgeRating: AgeRating,
    userAge?: number,
    userBirthDate?: Date | string
  ): void {
    const accessCheck = this.canUserAccessContent(contentAgeRating, userAge, userBirthDate);

    if (!accessCheck.canAccess) {
      const ageDisplay = accessCheck.userAge !== undefined
        ? `You are ${accessCheck.userAge} years old`
        : 'Your age is not verified';

      throw new Error(
        `Content is rated ${contentAgeRating} (${contentAgeRating === 'EIGHTEEN' ? '18+' : contentAgeRating === 'SIXTEEN' ? '16+' : contentAgeRating}). ` +
        `This content requires you to be at least ${accessCheck.requiredAge} years old. ` +
        `${ageDisplay}.`
      );
    }
  }

  /**
   * Build system prompt for content classification
   */
  private buildSystemPrompt(): string {
    return [
      'You are a content classification assistant. Your task is to analyze text and determine its age rating.',
      '',
      'Age Rating System:',
      '- L: General audience, suitable for all ages (no violence, no sexual content, no strong language)',
      '- TEN: 10+ years (mild fantasy violence, mild language)',
      '- TWELVE: 12+ years (moderate violence, some suggestive themes, mild language)',
      '- FOURTEEN: 14+ years (intense action, some sexual references, stronger language)',
      '- SIXTEEN: 16+ years (strong violence, sexual themes, nudity, strong language)',
      '- EIGHTEEN: 18+ years (explicit sexual content, extreme violence, explicit language)',
      '',
      'Classification Guidelines:',
      '- Analyze the ENTIRE text content',
      '- Consider implied meanings and themes, not just explicit keywords',
      '- When in doubt, choose the HIGHER (more restrictive) rating',
      '- For NSFW content: use SIXTEEN for mild/moderate, EIGHTEEN for explicit',
      '',
      'IMPORTANT: Return ONLY the age rating code (L, TEN, TWELVE, FOURTEEN, SIXTEEN, or EIGHTEEN).',
      'No explanation, no additional text. Just the code.',
    ].join('\n');
  }

  /**
   * Build user prompt for classification
   */
  private buildUserPrompt(text: string, context?: {
    characterTags?: string[];
    storyTags?: string[];
    existingAgeRating?: AgeRating;
  }): string {
    const parts = [
      'Analyze the following content and assign the appropriate age rating:',
      '',
      '=== CONTENT TO CLASSIFY ===',
      text,
    ];

    if (context?.characterTags && context.characterTags.length > 0) {
      parts.push('');
      parts.push('=== CHARACTER TAGS ===');
      parts.push(context.characterTags.join(', '));
    }

    if (context?.storyTags && context.storyTags.length > 0) {
      parts.push('');
      parts.push('=== STORY TAGS ===');
      parts.push(context.storyTags.join(', '));
    }

    if (context?.existingAgeRating) {
      parts.push('');
      parts.push(`=== EXISTING RATING ===`);
      parts.push(`This content is currently rated: ${context.existingAgeRating}`);
    }

    parts.push('');
    parts.push('=== TASK ===');
    parts.push('Return ONLY the age rating code: L, TEN, TWELVE, FOURTEEN, SIXTEEN, or EIGHTEEN');

    return parts.join('\n');
  }
}

// Export singleton instance
export const contentClassificationService = new ContentClassificationService();
