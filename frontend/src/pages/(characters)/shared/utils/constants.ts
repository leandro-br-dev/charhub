import { type AgeRating, type ContentTag, type VisualStyle } from '../../../../types/characters';

export const AGE_RATING_OPTIONS: AgeRating[] = ['L', 'TEN', 'TWELVE', 'FOURTEEN', 'SIXTEEN', 'EIGHTEEN'];

export const CONTENT_TAG_OPTIONS: ContentTag[] = [
  'VIOLENCE',
  'GORE',
  'SEXUAL',
  'NUDITY',
  'LANGUAGE',
  'DRUGS',
  'ALCOHOL',
  'HORROR',
  'PSYCHOLOGICAL',
  'DISCRIMINATION',
  'CRIME',
  'GAMBLING'
];

export const VISUAL_STYLE_OPTIONS: VisualStyle[] = [
  'ANIME',
  'REALISTIC',
  'SEMI_REALISTIC',
  'CARTOON',
  'MANGA',
  'MANHWA',
  'COMIC',
  'CHIBI',
  'PIXEL_ART',
  'THREE_D'
];

// CharacterGender enum values from backend
export const GENDER_OPTIONS = ['MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'UNKNOWN'] as const;
export type GenderOption = (typeof GENDER_OPTIONS)[number];
