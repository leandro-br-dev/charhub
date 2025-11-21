import { VisualStyle } from '../types/characters';

/**
 * Visual Style Labels and Helpers
 * Provides human-readable labels and descriptions for VisualStyle enum
 */

export interface VisualStyleOption {
  value: VisualStyle;
  label: string;
  description: string;
}

export const VISUAL_STYLE_OPTIONS: VisualStyleOption[] = [
  {
    value: 'ANIME',
    label: 'Anime',
    description: 'Japanese anime style (default)',
  },
  {
    value: 'REALISTIC',
    label: 'Realistic',
    description: 'Photorealistic or realistic art',
  },
  {
    value: 'SEMI_REALISTIC',
    label: 'Semi-Realistic',
    description: 'Semi-realistic art style',
  },
  {
    value: 'CARTOON',
    label: 'Cartoon',
    description: 'Western cartoon style',
  },
  {
    value: 'MANGA',
    label: 'Manga',
    description: 'Japanese manga/comic style',
  },
  {
    value: 'MANHWA',
    label: 'Manhwa',
    description: 'Korean manhwa/webtoon style',
  },
  {
    value: 'COMIC',
    label: 'Comic',
    description: 'Western comic book style',
  },
  {
    value: 'CHIBI',
    label: 'Chibi',
    description: 'Super deformed/cute style',
  },
  {
    value: 'PIXEL_ART',
    label: 'Pixel Art',
    description: 'Pixel art/retro game style',
  },
  {
    value: 'THREE_D',
    label: '3D',
    description: '3D rendered style',
  },
];

export const VISUAL_STYLE_LABELS: Record<VisualStyle, string> = {
  ANIME: 'Anime',
  REALISTIC: 'Realistic',
  SEMI_REALISTIC: 'Semi-Realistic',
  CARTOON: 'Cartoon',
  MANGA: 'Manga',
  MANHWA: 'Manhwa',
  COMIC: 'Comic',
  CHIBI: 'Chibi',
  PIXEL_ART: 'Pixel Art',
  THREE_D: '3D',
};

/**
 * Get human-readable label for a VisualStyle
 */
export function getVisualStyleLabel(style: VisualStyle | null | undefined): string {
  if (!style) return 'Anime'; // Default
  return VISUAL_STYLE_LABELS[style] || style;
}

/**
 * Get VisualStyleOption by value
 */
export function getVisualStyleOption(style: VisualStyle | null | undefined): VisualStyleOption | undefined {
  if (!style) return VISUAL_STYLE_OPTIONS[0]; // Default to Anime
  return VISUAL_STYLE_OPTIONS.find(option => option.value === style);
}
