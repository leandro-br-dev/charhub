/**
 * Visual Style Service
 *
 * Handles API calls for visual styles and themes
 */

import api from '../lib/api';
import type { VisualStyle, Theme } from '../types/characters';

export interface StyleThemeCombination {
  style: VisualStyle;
  theme: Theme;
  checkpoint: {
    id: string;
    name: string;
    filename: string;
    path: string;
  };
  lora?: {
    id: string;
    name: string;
    filename: string;
    filepathRelative: string;
    strength: number;
  };
}

export interface AvailableThemesResponse {
  success: boolean;
  data: {
    style: VisualStyle;
    themes: Theme[];
  };
}

export interface StyleThemeCombinationResponse {
  success: boolean;
  data: StyleThemeCombination;
}

/**
 * Get all available themes for a visual style
 */
export async function getAvailableThemes(style: VisualStyle): Promise<Theme[]> {
  try {
    const response = await api.get<AvailableThemesResponse>(`/api/v1/visual-styles/${style}/themes`);
    return response.data.data.themes;
  } catch (error) {
    console.error('Failed to get available themes:', error);
    return [];
  }
}

/**
 * Get checkpoint + LoRA configuration for a Style + Theme combination
 */
export async function getStyleThemeCombination(
  style: VisualStyle,
  theme: Theme
): Promise<StyleThemeCombination | null> {
  try {
    const response = await api.get<StyleThemeCombinationResponse>(
      `/api/v1/visual-styles/${style}/themes/${theme}`
    );
    return response.data.data;
  } catch (error) {
    console.error('Failed to get style + theme combination:', error);
    return null;
  }
}

export const visualStyleService = {
  getAvailableThemes,
  getStyleThemeCombination,
};
