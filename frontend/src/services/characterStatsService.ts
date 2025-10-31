import api from '../lib/api';

const API_PREFIX = import.meta.env.VITE_API_VERSION || '/api/v1';
const BASE_PATH = `${API_PREFIX}/characters`;

export interface CharacterStats {
  characterId: string;
  conversationCount: number;
  messageCount: number;
  favoriteCount: number;
  isFavoritedByUser: boolean;
}

export const characterStatsService = {
  /**
   * Get character statistics
   */
  async getStats(characterId: string): Promise<CharacterStats> {
    const response = await api.get<{ success: boolean; data: CharacterStats }>(`${BASE_PATH}/${characterId}/stats`);
    return response.data.data;
  },

  /**
   * Toggle favorite status
   */
  async toggleFavorite(characterId: string, isFavorite: boolean): Promise<void> {
    await api.post(`${BASE_PATH}/${characterId}/favorite`, {
      isFavorite
    });
  },

  /**
   * Format large numbers for display (12500 -> 12.5K)
   */
  formatCount(count: number): string {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  }
};
