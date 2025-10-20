import { type AgeRating, type ContentTag } from '../../../../types/characters';

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

export const GENDER_OPTIONS = ['male', 'female', 'non-binary'] as const;
export type GenderOption = (typeof GENDER_OPTIONS)[number];
