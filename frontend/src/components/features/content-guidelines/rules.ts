import { CONTENT_TAG_OPTIONS } from '../../../pages/(characters)/shared/utils/constants';
import { type AgeRating, type ContentTag } from '../../../types/characters';

export const AGE_RATING_SEQUENCE: AgeRating[] = ['L', 'TEN', 'TWELVE', 'FOURTEEN', 'SIXTEEN', 'EIGHTEEN'];

const TAG_UNLOCK_ORDER: ContentTag[] = [
  'LANGUAGE',
  'CRIME',
  'PSYCHOLOGICAL',
  'ALCOHOL',
  'HORROR',
  'VIOLENCE',
  'GAMBLING',
  'DRUGS',
  'SEXUAL',
  'NUDITY',
  'GORE',
  'DISCRIMINATION',
];

const AGE_RATING_UNLOCK_STEPS: Record<AgeRating, number> = {
  L: 0,
  TEN: 1,
  TWELVE: 3,
  FOURTEEN: 6,
  SIXTEEN: 8,
  EIGHTEEN: TAG_UNLOCK_ORDER.length,
};

export function getUnlockedContentTags(ageRating: AgeRating): ContentTag[] {
  const sliceIndex = AGE_RATING_UNLOCK_STEPS[ageRating] ?? 0;
  const unlocked = new Set(TAG_UNLOCK_ORDER.slice(0, sliceIndex));
  return CONTENT_TAG_OPTIONS.filter(tag => unlocked.has(tag));
}

export function normalizeAllowedContentTags(
  ageRating: AgeRating,
  allowedTags: ContentTag[]
): ContentTag[] {
  const unlockedSet = new Set(getUnlockedContentTags(ageRating));
  return allowedTags.filter(tag => unlockedSet.has(tag));
}

export function deriveBlockedTagsFromAllowed(
  ageRating: AgeRating,
  allowedTags: ContentTag[]
): ContentTag[] {
  const unlockedSet = new Set(getUnlockedContentTags(ageRating));
  const allowedSet = new Set(allowedTags.filter(tag => unlockedSet.has(tag)));

  const blocked = new Set<ContentTag>();

  // Tags beyond the unlocked set are always blocked for this rating
  for (const tag of CONTENT_TAG_OPTIONS) {
    if (!unlockedSet.has(tag)) {
      blocked.add(tag);
    }
  }

  // Within the unlocked set, anything not explicitly allowed becomes blocked
  for (const tag of unlockedSet) {
    if (!allowedSet.has(tag)) {
      blocked.add(tag);
    }
  }

  return Array.from(blocked);
}

export function deriveAllowedTagsFromBlocked(
  ageRating: AgeRating,
  blockedTags: ContentTag[]
): ContentTag[] {
  const unlocked = getUnlockedContentTags(ageRating);
  const blockedSet = new Set(blockedTags);
  return unlocked.filter(tag => !blockedSet.has(tag));
}

export function haveSameContentTags(a: ContentTag[], b: ContentTag[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every(tag => setA.has(tag));
}
