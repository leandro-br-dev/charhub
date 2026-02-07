import api from '../lib/api';

const API_PREFIX = import.meta.env.VITE_API_VERSION || '/api/v1';
const BASE_PATH = `${API_PREFIX}/assets`;

export interface AssetStats {
  id: string;
  isFavoritedByUser: boolean;
  characterCount: number;
  imageCount: number;
}

export const assetStatsService = {
  /**
   * Get asset statistics
   */
  async getStats(assetId: string): Promise<AssetStats> {
    const response = await api.get<{ success: boolean; data: AssetStats }>(`${BASE_PATH}/${assetId}/stats`);
    return response.data.data;
  },

  /**
   * Toggle favorite status
   */
  async toggleFavorite(assetId: string, isFavorite: boolean): Promise<void> {
    await api.post(`${BASE_PATH}/${assetId}/favorite`, {
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
