import { AgeRating } from '../types/characters';
import api from '../lib/api';
import {
  type Character,
  type CharacterFormValues,
  type CharacterListParams,
  type CharacterListResponse,
  type CharacterMutationResult,
  type CharacterAvatarUploadResult,
  EMPTY_CHARACTER_FORM
} from '../types/characters';

const API_PREFIX = import.meta.env.VITE_API_VERSION || '/api/v1';
const BASE_PATH = `${API_PREFIX}/characters`;

export interface CharacterListResult {
  characters: Character[];
  total: number;
  hasMore: boolean;
}

export const characterService = {
  async list(params?: CharacterListParams): Promise<CharacterListResponse> {
    const query: Record<string, unknown> = { ...(params || {}) };
    if (params && Object.prototype.hasOwnProperty.call(params, 'visibility')) {
      query.visibility = params.visibility;
    }

    const response = await api.get<{ success: boolean; data: Character[]; total: number; hasMore: boolean }>(BASE_PATH, { params: query });

    return {
      items: response.data.data || [],
      total: response.data.total || 0,
      page: 1,
      pageSize: response.data.data?.length || 20
    };
  },

  /**
   * Get characters with pagination (for infinite scroll)
   */
  async listWithPagination(params?: { skip?: number; limit?: number; ageRatings?: AgeRating[] }): Promise<CharacterListResult> {
    const query: Record<string, unknown> = { ...(params || {}) };

    const response = await api.get<{ success: boolean; data: Character[]; total: number; hasMore: boolean }>(BASE_PATH, { params: query });

    return {
      characters: response.data.data || [],
      total: response.data.total || 0,
      hasMore: response.data.hasMore || false,
    };
  },

  /**
   * Get total non-avatar images for a character
   */
  async getImageCount(characterId: string): Promise<number> {
    try {
      const character = await this.getById(characterId);
      const images = (character as any).images as Array<{ type: string }> | undefined;
      if (!images || images.length === 0) return 0;
      return images.filter(img => img && img.type !== 'AVATAR').length;
    } catch (_e) {
      return 0;
    }
  },

  async getById(characterId: string): Promise<Character> {
    const response = await api.get<{ success: boolean; data: Character }>(`${BASE_PATH}/${characterId}`);
    return response.data.data;
  },

  async create(payload: CharacterFormValues = EMPTY_CHARACTER_FORM): Promise<CharacterMutationResult> {
    try {
      const response = await api.post<{ success: boolean; data: Character }>(BASE_PATH, payload);
      return { success: true, character: response.data.data };
    } catch (error) {
      console.error('[characterService] create failed:', error);
      return { success: false, message: 'characters:errors.createFailed' };
    }
  },

  async update(characterId: string, payload: CharacterFormValues): Promise<CharacterMutationResult> {
    try {
      const response = await api.put<{ success: boolean; data: Character }>(`${BASE_PATH}/${characterId}`, payload);
      return { success: true, character: response.data.data };
    } catch (error) {
      console.error('[characterService] update failed:', error);
      return { success: false, message: 'characters:errors.updateFailed' };
    }
  },

  async remove(characterId: string): Promise<CharacterMutationResult> {
    try {
      const response = await api.delete<{ success: boolean; message: string }>(`${BASE_PATH}/${characterId}`);
      return { success: response.data.success, message: response.data.message };
    } catch (error) {
      console.error('[characterService] remove failed:', error);
      return { success: false, message: 'characters:errors.deleteFailed' };
    }
  },

  async uploadAvatar(params: { file: Blob; characterId?: string; draftId?: string }): Promise<CharacterAvatarUploadResult> {
    const formData = new FormData();
    formData.append('avatar', params.file);

    if (params.characterId) {
      formData.append('characterId', params.characterId);
    }

    if (params.draftId) {
      formData.append('draftId', params.draftId);
    }

    const response = await api.post<{ success: boolean; data: CharacterAvatarUploadResult }>(
      `${BASE_PATH}/avatar`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    return response.data.data;
  },

  async getMyCharactersForConversation(params?: { search?: string }): Promise<{ success: boolean; data: Array<{ id: string; firstName: string; lastName: string | null; avatar: string | null; personality: string | null }> }> {
    try {
      const response = await api.get<{ success: boolean; data: Array<{ id: string; firstName: string; lastName: string | null; avatar: string | null; personality: string | null }> }>(BASE_PATH, {
        params: {
          ...params,
          public: 'false' // Explicitly request user's own characters
        }
      });
      return response.data;
    } catch (error) {
      console.error('[characterService] getMyCharactersForConversation failed:', error);
      return { success: false, data: [] };
    }
  },

  /**
   * Get popular characters for dashboard
   * TODO: Implement backend endpoint for actual popularity metrics
   */
  async getPopular(params: { limit?: number; ageRatings?: AgeRating[] } = {}): Promise<Character[]> {
    try {
      const { limit = 10, ageRatings } = params;
      const response = await this.list({ ageRatings, limit });
      return response.items;
    } catch (error) {
      console.error('[characterService] getPopular failed:', error);
      return [];
    }
  },

  /**
   * Get popular characters with pagination (for infinite scroll)
   */
  async getPopularWithPagination(params: { skip?: number; limit?: number; ageRatings?: AgeRating[] } = {}): Promise<CharacterListResult> {
    try {
      const { skip = 0, limit = 20, ageRatings } = params;
      return await this.listWithPagination({ skip, limit, ageRatings });
    } catch (error) {
      console.error('[characterService] getPopularWithPagination failed:', error);
      return { characters: [], total: 0, hasMore: false };
    }
  },

  /**
   * Get user's favorite characters
   */
  async getFavorites(limit = 10): Promise<Character[]> {
    try {
      const response = await api.get<{ success: boolean; data: Character[]; count: number }>(
        `${BASE_PATH}/favorites`,
        { params: { limit } }
      );
      return response.data.data || [];
    } catch (error) {
      console.error('[characterService] getFavorites failed:', error);
      return [];
    }
  },

  /**
   * Toggle favorite status for a character
   */
  async toggleFavorite(characterId: string, isFavorite: boolean): Promise<{ success: boolean }> {
    try {
      const response = await api.post<{ success: boolean; data: { success: boolean; isFavorite: boolean } }>(
        `${BASE_PATH}/${characterId}/favorite`,
        { isFavorite }
      );
      return response.data;
    } catch (error) {
      console.error('[characterService] toggleFavorite failed:', error);
      return { success: false };
    }
  }
  ,

  /**
   * Ask backend agent to autocomplete missing fields
   */
  async autocomplete(payload: Partial<CharacterFormValues>, mode: 'ai' | 'web' = 'ai'): Promise<Partial<CharacterFormValues>> {
    try {
      const response = await api.post<{ success: boolean; data: Partial<CharacterFormValues> }>(
        `${BASE_PATH}/autocomplete`,
        { mode, payload }
      );
      return response.data.data || {};
    } catch (error) {
      console.error('[characterService] autocomplete failed:', error);
      return {};
    }
  }
  ,

  async uploadCharacterImage(params: { characterId: string; file: Blob; type: 'AVATAR' | 'COVER' | 'SAMPLE' | 'STICKER' | 'OTHER' }) {
    const formData = new FormData();
    formData.append('image', params.file);
    formData.append('type', params.type);
    const response = await api.post<{ success: boolean; data: any }>(`${BASE_PATH}/${params.characterId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.data;
  },

  async addCharacterImageByUrl(params: { characterId: string; url: string; type: 'AVATAR' | 'COVER' | 'SAMPLE' | 'STICKER' | 'OTHER' }) {
    const response = await api.post<{ success: boolean; data: any }>(`${BASE_PATH}/${params.characterId}/images/url`, {
      url: params.url,
      type: params.type
    });
    return response.data.data;
  },

  async getCharacterImages(characterId: string, type?: string): Promise<Array<{ id: string; url: string; type: string; description?: string }>> {
    const response = await api.get<{ success: boolean; data: Array<{ id: string; url: string; type: string; description?: string }> }>(
      `${BASE_PATH}/${characterId}/images`,
      { params: type ? { type } : {} }
    );
    return response.data.data || [];
  }
};

export type CharacterService = typeof characterService;
