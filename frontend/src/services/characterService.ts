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
    // Convert public boolean to string for backend
    if (params && Object.prototype.hasOwnProperty.call(params, 'public')) {
      query.public = params.public ? 'true' : 'false';
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
  async listWithPagination(params?: {
    skip?: number;
    limit?: number;
    ageRatings?: AgeRating[];
    genders?: string[];
    species?: string[];
  }): Promise<CharacterListResult> {
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
  async getPopular(params: {
    limit?: number;
    ageRatings?: AgeRating[];
    genders?: string[];
    species?: string[];
  } = {}): Promise<Character[]> {
    try {
      const { limit = 10, ageRatings, genders, species } = params;
      const response = await this.list({
        ageRatings,
        gender: genders,
        species,
        limit,
      });
      return response.items;
    } catch (error) {
      console.error('[characterService] getPopular failed:', error);
      return [];
    }
  },

  /**
   * Get popular characters with pagination (for infinite scroll)
   */
  async getPopularWithPagination(params: {
    skip?: number;
    limit?: number;
    ageRatings?: AgeRating[];
    genders?: string[];
    species?: string[];
  } = {}): Promise<CharacterListResult> {
    try {
      const { skip = 0, limit = 20, ageRatings, genders, species } = params;
      const query: Record<string, unknown> = { skip, limit, sortBy: 'popular' };

      if (ageRatings) {
        query.ageRatings = ageRatings;
      }
      if (genders) {
        query.gender = genders;
      }
      if (species) {
        query.species = species;
      }

      const response = await api.get<{ success: boolean; data: Character[]; total: number; hasMore: boolean }>(BASE_PATH, { params: query });

      return {
        characters: response.data.data || [],
        total: response.data.total || 0,
        hasMore: response.data.hasMore || false,
      };
    } catch (error) {
      console.error('[characterService] getPopularWithPagination failed:', error);
      return { characters: [], total: 0, hasMore: false };
    }
  },

  /**
   * Get newest characters with pagination (sorted by creation date)
   */
  async getNewestWithPagination(params: {
    skip?: number;
    limit?: number;
    ageRatings?: AgeRating[];
    genders?: string[];
    species?: string[];
  } = {}): Promise<CharacterListResult> {
    try {
      const { skip = 0, limit = 20, ageRatings, genders, species } = params;
      const query: Record<string, unknown> = { skip, limit, sortBy: 'newest' };

      if (ageRatings) {
        query.ageRatings = ageRatings;
      }
      if (genders) {
        query.gender = genders;
      }
      if (species) {
        query.species = species;
      }

      const response = await api.get<{ success: boolean; data: Character[]; total: number; hasMore: boolean }>(BASE_PATH, { params: query });

      return {
        characters: response.data.data || [],
        total: response.data.total || 0,
        hasMore: response.data.hasMore || false,
      };
    } catch (error) {
      console.error('[characterService] getNewestWithPagination failed:', error);
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
  },

  /**
   * Get available filter options with counts
   * Returns gender and species distributions for the current age rating filter
   */
  async getFilterOptions(params?: { ageRatings?: AgeRating[] }): Promise<{
    genders: Array<{ value: string; label: string; count: number }>;
    species: Array<{ value: string; label: string; count: number }>;
  }> {
    try {
      const queryParams: Record<string, string> = {};
      if (params?.ageRatings && params.ageRatings.length > 0) {
        queryParams.ageRatings = params.ageRatings.join(',');
      }

      const response = await api.get<{
        success: boolean;
        data: {
          genders: Array<{ value: string; count: number }>;
          species: Array<{ value: string; name: string; count: number }>;
        };
      }>(`${API_PREFIX}/character-filters`, { params: queryParams });

      const data = response.data.data || { genders: [], species: [] };
      return {
        genders: data.genders.map(g => ({ ...g, label: g.value })),
        species: data.species.map(s => ({ value: s.value, label: s.name, count: s.count }))
      };
    } catch (error) {
      console.error('[characterService] getFilterOptions failed:', error);
      return { genders: [], species: [] };
    }
  },

  /**
   * Returns gender filter options only
   */
  async getGenderFilterOptions(params?: { ageRatings?: AgeRating[] }): Promise<Array<{ value: string; count: number }>> {
    try {
      const queryParams: Record<string, string> = { include: 'genders' };
      if (params?.ageRatings && params.ageRatings.length > 0) {
        queryParams.ageRatings = params.ageRatings.join(',');
      }

      const response = await api.get<{
        success: boolean;
        data: { genders: Array<{ value: string; count: number }> };
      }>(`${API_PREFIX}/character-filters`, { params: queryParams });

      return response.data.data?.genders || [];
    } catch (error) {
      console.error('[characterService] getGenderFilterOptions failed:', error);
      return [];
    }
  },

  /**
   * Returns species filter options only
   */
  async getSpeciesFilterOptions(params?: { ageRatings?: AgeRating[] }): Promise<Array<{ value: string; name: string; count: number }>> {
    try {
      const queryParams: Record<string, string> = { include: 'species' };
      if (params?.ageRatings && params.ageRatings.length > 0) {
        queryParams.ageRatings = params.ageRatings.join(',');
      }

      const response = await api.get<{
        success: boolean;
        data: { species: Array<{ value: string; name: string; count: number }> };
      }>(`${API_PREFIX}/character-filters`, { params: queryParams });

      return response.data.data?.species || [];
    } catch (error) {
      console.error('[characterService] getSpeciesFilterOptions failed:', error);
      return [];
    }
  },

  /**
   * Get characters available for user to assume as persona
   * Returns: User's own characters + Public characters
   */
  async getAvailablePersonas(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{
    success: boolean;
    data: Array<{
      id: string;
      firstName: string;
      lastName: string | null;
      avatar: string | null;
      gender?: string;
    }>;
  }> {
    try {
      const { page = 1, limit = 20, search } = params || {};
      const queryParams: Record<string, string | number> = { page, limit };
      if (search) {
        queryParams.search = search;
      }

      const response = await api.get<{
        success: boolean;
        data: Array<{
          id: string;
          firstName: string;
          lastName: string | null;
          images: Array<{ url: string; type: string }>;
          gender?: string;
        }>;
      }>(`${BASE_PATH}/personas`, { params: queryParams });

      const characters = response.data.data || [];
      const formatted = characters.map((char) => ({
        id: char.id,
        firstName: char.firstName,
        lastName: char.lastName,
        avatar: char.images?.find((img) => img.type === 'AVATAR')?.url || null,
        gender: char.gender,
      }));

      return { success: true, data: formatted };
    } catch (error) {
      console.error('[characterService] getAvailablePersonas failed:', error);
      return { success: false, data: [] };
    }
  }
};

export type CharacterService = typeof characterService;
