import api from '../lib/api';

const API_PREFIX = import.meta.env.VITE_API_VERSION || '/api/v1';
const BASE_PATH = `${API_PREFIX}/stories`;

export interface StoryStats {
  storyId: string;
  conversationCount: number;
  messageCount: number;
  favoriteCount: number;
  isFavoritedByUser: boolean;
}

export const storyStatsService = {
  /**
   * Get story statistics
   */
  async getStats(storyId: string): Promise<StoryStats> {
    const response = await api.get<{ success: boolean; data: StoryStats }>(`${BASE_PATH}/${storyId}/stats`);
    return response.data.data;
  },

  /**
   * Toggle favorite status
   */
  async toggleFavorite(storyId: string, isFavorite: boolean): Promise<void> {
    await api.post(`${BASE_PATH}/${storyId}/favorite`, {
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
