import api from '../lib/api';

const API_PREFIX = import.meta.env.VITE_API_VERSION || '/api/v1';
const BASE_PATH = `${API_PREFIX}/scenes`;

export interface SceneStats {
  id: string;
  isFavoritedByUser: boolean;
  areaCount: number;
  imageCount: number;
}

export const sceneStatsService = {
  /**
   * Get scene statistics
   */
  async getStats(sceneId: string): Promise<SceneStats> {
    const response = await api.get<{ success: boolean; data: SceneStats }>(`${BASE_PATH}/${sceneId}/stats`);
    return response.data.data;
  },

  /**
   * Toggle favorite status
   */
  async toggleFavorite(sceneId: string, isFavorite: boolean): Promise<void> {
    await api.post(`${BASE_PATH}/${sceneId}/favorite`, {
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
