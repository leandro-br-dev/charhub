import api from '../lib/api';

const API_PREFIX = '/api/v1/character-population';
const ADMIN_SCRIPTS_PREFIX = '/api/v1/admin/scripts';

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

export interface ImageCompressionStats {
  totalImages: number;
  oversizedCount: Record<string, number>;
  totalBytesOversized: number;
}

export interface ImageCompressionResponse {
  success: boolean;
  message: string;
  processed: number;
  failed: number;
  bytesReclaimed: number;
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

  /**
   * Trigger character generation script
   */
  async triggerCharacterGeneration(count: number): Promise<{ data: TriggerScriptResponse }> {
    const response = await api.post(`${API_PREFIX}/trigger-batch`, { count });
    return { data: response.data };
  },

  /**
   * Get image compression statistics
   */
  async getImageCompressionStats(): Promise<{ data: ImageCompressionStats }> {
    const response = await api.get(`${ADMIN_SCRIPTS_PREFIX}/image-compression/stats`);
    return { data: response.data };
  },

  /**
   * Trigger image compression script
   */
  async triggerImageCompression(
    limit: number,
    maxSizeKB: number,
    targetSizeKB?: number
  ): Promise<{ data: ImageCompressionResponse }> {
    const response = await api.post(`${ADMIN_SCRIPTS_PREFIX}/image-compression`, {
      limit,
      maxSizeKB,
      targetSizeKB,
    });
    return { data: response.data };
  },
};
