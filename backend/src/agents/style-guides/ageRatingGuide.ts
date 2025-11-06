import { StyleGuide } from './base';
import { AgeRating } from './types';

// Re-export for backward compatibility
export { AgeRating };

// 2. Create a prompt map outside the class.
// This separates the data (the prompt strings) from the logic.
const PROMPTS_BY_RATING: Record<AgeRating, string> = {
  [AgeRating.L]: 'Keep the conversation extremely simple, positive, and suitable for all audiences, including young children. Focus on universal and safe topics.',
  [AgeRating.TEN]: 'You can talk about friendship and adventure, but avoid violence and complex romantic relationships.',
  [AgeRating.TWELVE]: 'It is acceptable to address themes of challenges, overcoming adversity, and teamwork. Mild, fantasy-style violence is acceptable, but without graphic details. Topics of early romantic interests are allowed.',
  [AgeRating.FOURTEEN]: 'You can address more complex social themes, personal challenges, and deep friendships. Romantic relationships can be discussed. Violence can be mentioned, but it should not be glorified or described in detail.',
  [AgeRating.SIXTEEN]: 'It is possible to explore mature and complex themes, including intense conflicts, dramatic situations, and meaningful romantic relationships. Violence can be part of the narrative, but gratuitous cruelty should be avoided.',
  [AgeRating.EIGHTEEN]: 'You have full freedom to discuss all mature themes, including complex moral issues, intense violence, and explicit romantic relationships, as appropriate for an adult audience.',
};

const DEFAULT_PROMPT = 'You should keep the conversation light and friendly, suitable for a general audience.';

export class AgeRatingGuide implements StyleGuide {
  // 3. Update the method signature to use the Enum for better type-checking.
  buildPrompt(context: { ageRating: AgeRating | string }): string {
    // Access the prompt directly from the map.
    // If the key doesn't exist, it returns the default prompt.
    return PROMPTS_BY_RATING[context.ageRating as AgeRating] || DEFAULT_PROMPT;
  }
}