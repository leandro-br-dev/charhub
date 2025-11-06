import { AgeRatingGuide } from './ageRatingGuide';
import { ContentFilterGuide } from './contentFilterGuide';

// Re-export types for convenience
export { AgeRating, ContentFilter } from './types';
export { AgeRatingGuide, ContentFilterGuide };

export class StyleGuideService {
  private guides = [new AgeRatingGuide(), new ContentFilterGuide()];

  buildPrompt(context: any): string {
    return this.guides.map(guide => guide.buildPrompt(context)).join('\n');
  }
}