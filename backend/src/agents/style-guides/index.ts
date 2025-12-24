import { AgeRatingGuide } from './ageRatingGuide';
import { ContentFilterGuide } from './contentFilterGuide';
import { RoleplayFormattingGuide } from './roleplayFormattingGuide';

// Re-export types for convenience
export { AgeRating, ContentFilter } from './types';
export { AgeRatingGuide, ContentFilterGuide, RoleplayFormattingGuide };

export class StyleGuideService {
  private guides = [new AgeRatingGuide(), new ContentFilterGuide(), new RoleplayFormattingGuide()];

  buildPrompt(context: any): string {
    return this.guides.map(guide => guide.buildPrompt(context)).join('\n');
  }
}