import { StyleGuide } from './base';

export class AgeRatingGuide implements StyleGuide {
  buildPrompt(context: { ageRating: string }): string {
    // Logic to build the prompt based on the age rating
    if (context.ageRating === 'TEN') {
      return 'You can talk about friendship and adventure, but not about violence or romantic relationships.';
    }
    if (context.ageRating === 'EIGHTEEN') {
      return 'You can talk about mature themes, including violence and romantic relationships.';
    }
    return 'You should keep the conversation light and friendly.';
  }
}
