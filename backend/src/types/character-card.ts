/**
 * CharacterCardDTO - Optimized type for dashboard character cards
 * Contains only essential fields needed for character list display
 * Reduces payload size by excluding heavy fields like history, personality, translations
 */

import type { AgeRating, VisualStyle, Theme } from '../generated/prisma/index';

export interface CharacterCardDTO {
  id: string;
  firstName: string;
  lastName: string | null;
  avatar: string | null;
  ageRating: AgeRating;
  style: VisualStyle;
  theme: Theme | null;
  creator: {
    id: string;
    username: string;
  };
  stats?: {
    conversationCount: number;
    favoriteCount: number;
    isFavoritedByUser: boolean;
  };
}

/**
 * Partial character response for field filtering
 * Used when `fields` query parameter is provided
 */
export type PartialCharacterCard = Partial<CharacterCardDTO> & {
  id: string; // Always include id
};
