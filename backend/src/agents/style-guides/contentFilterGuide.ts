import { StyleGuide } from './base';
import { AgeRating, ContentFilter } from './types';

// Re-export for backward compatibility
export { AgeRating, ContentFilter };

// Numeric mapping to allow age comparisons (essential for the gradation logic).
const AGE_RATING_ORDER: Record<AgeRating, number> = {
  [AgeRating.L]: 0,
  [AgeRating.TEN]: 1,
  [AgeRating.TWELVE]: 2,
  [AgeRating.FOURTEEN]: 3,
  [AgeRating.SIXTEEN]: 4,
  [AgeRating.EIGHTEEN]: 5,
};

// 2. The Content Rules Matrix.
// This is the "single source of truth" that defines how each filter behaves at each age level.
// We use `Partial<Record<...>>` because not every filter has a specific rule for every age.
const CONTENT_RULES_MATRIX: Record<ContentFilter, Partial<Record<AgeRating, string>>> = {
  [ContentFilter.VIOLENCE]: {
    [AgeRating.TEN]: 'Avoid descriptions of violence. Mentioning conflict is acceptable, but not the physical act.',
    [AgeRating.TWELVE]: 'You can describe action and fantasy-style conflict, but avoid realistic or graphic violence.',
    [AgeRating.SIXTEEN]: 'Intense conflict and realistic violence are permitted, but should not be gratuitous or overly detailed.',
    [AgeRating.EIGHTEEN]: 'You can describe violence in a realistic and graphic manner if it is integral to the context.',
  },
  [ContentFilter.GORE]: {
    // Gore is strictly forbidden for most age ratings.
    [AgeRating.SIXTEEN]: 'Avoid graphic descriptions of blood, injury, and gore.',
    [AgeRating.EIGHTEEN]: 'Graphic descriptions of gore are permitted but should be used purposefully and not for shock value alone.',
  },
  [ContentFilter.SEXUAL]: {
    [AgeRating.FOURTEEN]: 'You can discuss romance and crushes, but avoid any sexual themes or innuendo.',
    [AgeRating.SIXTEEN]: 'You can explore mature romantic relationships and themes, but avoid explicit sexual content or descriptions.',
    [AgeRating.EIGHTEEN]: 'Mature sexual themes and discussions are fully permitted, but explicit descriptions should be relevant to the context.',
  },
  [ContentFilter.NUDITY]: {
    [AgeRating.SIXTEEN]: 'Avoid descriptions of nudity.',
    [AgeRating.EIGHTEEN]: 'Nudity can be described when it is non-sexual and contextually appropriate.',
  },
  [ContentFilter.HORROR]: {
    [AgeRating.TWELVE]: 'You can create suspense and a mysterious atmosphere, but avoid genuine terror or jump scares.',
    [AgeRating.SIXTEEN]: 'Psychological horror, suspense, and frightening themes are allowed, but avoid extreme terror and gore.',
    [AgeRating.EIGHTEEN]: 'All horror subgenres, including psychological, supernatural, and body horror, are permitted.',
  },
  [ContentFilter.PSYCHOLOGICAL]: {
    [AgeRating.FOURTEEN]: 'Address psychological topics like stress or anxiety in a supportive and non-disturbing way.',
    [AgeRating.SIXTEEN]: 'You can explore complex psychological themes, including trauma and mental health struggles, with sensitivity.',
    [AgeRating.EIGHTEEN]: 'Deep and potentially disturbing psychological themes are permitted.',
  },
  [ContentFilter.DISCRIMINATION]: {
    // This is an "always-on" filter. The rule is to never generate discriminatory content.
    [AgeRating.L]: 'Do not generate discriminatory, hateful, or biased content under any circumstances. Promote fairness and respect.',
  },
};

// 3. The main class that uses the matrix to build the prompt.
export class ContentFilterGuide implements StyleGuide {
  
  // The context type now expects both parameters.
  buildPrompt(context: { ageRating: AgeRating; contentFilters: ContentFilter[] }): string {
    if (!context.contentFilters || context.contentFilters.length === 0) {
      return ''; // No filters, no rules.
    }

    const applicableRules = context.contentFilters
      .map(filter => this.getApplicableRule(filter, context.ageRating))
      .filter((rule): rule is string => !!rule); // Filter out any null results.

    // Remove duplicate rules in case multiple filters map to the same instruction.
    const uniqueRules = [...new Set(applicableRules)];

    return uniqueRules.join('\n');
  }

  /**
   * Finds the most specific rule for a filter based on the user's age.
   * It "cascades down" by finding the rule for the highest age rating that is
   * less than or equal to the user's age.
   * 
   * @example If the user's age is FOURTEEN and a filter has rules for TEN and SIXTEEN,
   * this method will return the rule for TEN.
   * 
   * @param filter The content filter to check.
   * @param userAge The age rating of the user.
   * @returns The applicable rule string, or null if no rule applies.
   */
  private getApplicableRule(filter: ContentFilter, userAge: AgeRating): string | null {
    const rulesForFilter = CONTENT_RULES_MATRIX[filter];
    if (!rulesForFilter) {
      return null;
    }

    const userAgeLevel = AGE_RATING_ORDER[userAge];
    
    let bestMatchRule: string | null = null;
    
    // Iterate through all defined age rules for this filter to find the best match.
    // This relies on the age keys being defined in ascending order in the matrix.
    for (const ageKey in rulesForFilter) {
      const ruleAge = ageKey as AgeRating;
      const ruleAgeLevel = AGE_RATING_ORDER[ruleAge];

      if (userAgeLevel >= ruleAgeLevel) {
        // We found an applicable rule. It becomes our current best match.
        bestMatchRule = rulesForFilter[ruleAge]!;
      } else {
        // If the rule's age is higher than the user's age, we can stop.
        // Higher-level rules do not apply.
        break;
      }
    }
    
    return bestMatchRule;
  }
}

// Alias for backward compatibility
export { ContentFilterGuide as CombinedContentGuide };