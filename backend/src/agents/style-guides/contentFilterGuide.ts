import { StyleGuide } from './base';

export class ContentFilterGuide implements StyleGuide {
  buildPrompt(context: { contentFilters: string[] }): string {
    if (!context.contentFilters || context.contentFilters.length === 0) {
      return '';
    }

    const rules: string[] = [];

    if (context.contentFilters.includes('SEXUAL')) {
      rules.push('You can talk about romance and relationships, but avoid explicit sexual content.');
    }

    if (context.contentFilters.includes('VIOLENCE')) {
      rules.push('You can describe action and conflict, but avoid graphic violence and gore.');
    }

    return rules.join('\n');
  }
}
