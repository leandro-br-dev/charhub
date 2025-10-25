import { AgeRatingGuide } from './ageRatingGuide';
import { ContentFilterGuide } from './contentFilterGuide';

export class StyleGuideService {
  private guides = [new AgeRatingGuide(), new ContentFilterGuide()];

  buildPrompt(context: any): string {
    return this.guides.map(guide => guide.buildPrompt(context)).join('\n');
  }
}