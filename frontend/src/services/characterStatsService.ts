import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

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
    const response = await axios.get(`${API_BASE_URL}/characters/${characterId}/stats`);
    return response.data.data;
  },

  /**
   * Toggle favorite status
   */
  async toggleFavorite(characterId: string, isFavorite: boolean): Promise<void> {
    await axios.post(`${API_BASE_URL}/characters/${characterId}/favorite`, {
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
