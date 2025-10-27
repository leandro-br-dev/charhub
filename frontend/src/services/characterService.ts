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

export const characterService = {
  async list(params?: CharacterListParams): Promise<CharacterListResponse> {
    const response = await api.get<{ success: boolean; data: Character[]; count: number }>(BASE_PATH, { params });

    return {
      items: response.data.data || [],
      total: response.data.count || 0,
      page: 1,
      pageSize: response.data.data?.length || 20
    };
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
          public: 'false'
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
  async getPopular(limit = 10): Promise<Character[]> {
    try {
      // TODO: Replace with actual popular endpoint when available
      // const response = await api.get<{ success: boolean; data: Character[] }>(
      //   `${BASE_PATH}/popular`,
      //   { params: { limit } }
      // );
      // return response.data.data;

      // For now, fetch public characters
      const response = await this.list({ isPublic: true });
      return response.items.slice(0, limit);
    } catch (error) {
      console.error('[characterService] getPopular failed:', error);
      return [];
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
};

export type CharacterService = typeof characterService;
