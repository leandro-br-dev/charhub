import api from '../lib/api';
import {
  type Character,
  type CharacterFormValues,
  type CharacterListParams,
  type CharacterListResponse,
  type CharacterMutationResult,
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
  }
};

export type CharacterService = typeof characterService;
