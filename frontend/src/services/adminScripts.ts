import api from '../lib/api';

const API_PREFIX = '/api/v1/character-population';

/**
 * Types for Correction Scripts
 */

export interface CorrectionStats {
  totalCharacters: number;
  charactersWithAvatars: number;
  charactersWithoutAvatars: number;
  charactersWithCompleteData: number;
  charactersWithIncompleteData: number;
  lastAvatarCorrection: string | null;
  lastDataCorrection: string | null;
}

export interface TriggerScriptResponse {
  message: string;
  stats?: {
    processed: number;
    corrected: number;
    failed: number;
  };
}

/**
 * Admin Scripts Service
 * Provides methods for triggering correction scripts and fetching statistics.
 */
export const adminScriptsService = {
  /**
   * Trigger avatar correction script
   */
  async triggerAvatarCorrection(limit: number): Promise<{ data: TriggerScriptResponse }> {
    const response = await api.post(`${API_PREFIX}/trigger-avatar-correction`, { limit });
    return { data: response.data };
  },

  /**
   * Trigger data completeness correction script
   */
  async triggerDataCorrection(limit: number): Promise<{ data: TriggerScriptResponse }> {
    const response = await api.post(`${API_PREFIX}/trigger-data-correction`, { limit });
    return { data: response.data };
  },

  /**
   * Get correction statistics
   */
  async getCorrectionStats(): Promise<{ data: CorrectionStats }> {
    const response = await api.get(`${API_PREFIX}/correction-stats`);
    return { data: response.data };
  },
};
