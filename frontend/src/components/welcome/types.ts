export interface WelcomeFormData {
  displayName?: string;
  username?: string;
  birthDate?: string;
  gender?: string;
  preferredLanguage?: string;
  maxAgeRating?: string;
  blockedTags?: string[];
}

export type WelcomeStep =
  | 'displayName'
  | 'username'
  | 'birthDate'
  | 'gender'
  | 'language'
  | 'ageRating'
  | 'contentFilters';
