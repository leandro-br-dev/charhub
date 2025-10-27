import api from '../lib/api';
import type {
  Story,
  StoryFormData,
  CreateStoryPayload,
  StoryListParams,
  StoryListResponse,
} from '../types/story';

const API_PREFIX = import.meta.env.VITE_API_VERSION || '/api/v1';
const BASE_PATH = `${API_PREFIX}/stories`;

export interface StoryMutationResult {
  success: boolean;
  story?: Story;
  message?: string;
}

/**
 * Story service for managing interactive stories
 */
export const storyService = {
  /**
   * Create a new story
   * @param payload - Story data
   */
  async create(payload: StoryFormData): Promise<StoryMutationResult> {
    try {
      const createPayload: CreateStoryPayload = {
        title: payload.title,
        synopsis: payload.synopsis,
        initialText: payload.initialText,
        coverImage: payload.coverImage,
        objectives: payload.objectives,
        characterIds: payload.characterIds,
        tagIds: payload.tagIds,
        ageRating: payload.ageRating,
        contentTags: payload.contentTags,
        isPublic: payload.isPublic,
      };

      const response = await api.post<Story>(BASE_PATH, createPayload);
      return { success: true, story: response.data };
    } catch (error) {
      console.error('[storyService] create failed:', error);
      return { success: false, message: 'story:errors.createFailed' };
    }
  },

  /**
   * Update an existing story
   * @param storyId - Story ID
   * @param payload - Updated story data
   */
  async update(storyId: string, payload: StoryFormData): Promise<StoryMutationResult> {
    try {
      const updatePayload: CreateStoryPayload = {
        title: payload.title,
        synopsis: payload.synopsis,
        initialText: payload.initialText,
        coverImage: payload.coverImage,
        objectives: payload.objectives,
        characterIds: payload.characterIds,
        tagIds: payload.tagIds,
        ageRating: payload.ageRating,
        contentTags: payload.contentTags,
        isPublic: payload.isPublic,
      };

      const response = await api.put<Story>(`${BASE_PATH}/${storyId}`, updatePayload);
      return { success: true, story: response.data };
    } catch (error) {
      console.error('[storyService] update failed:', error);
      return { success: false, message: 'story:errors.updateFailed' };
    }
  },

  /**
   * Delete a story
   * @param storyId - Story ID
   */
  async remove(storyId: string): Promise<{ success: boolean; message?: string }> {
    try {
      await api.delete(`${BASE_PATH}/${storyId}`);
      return { success: true };
    } catch (error) {
      console.error('[storyService] remove failed:', error);
      return { success: false, message: 'story:errors.deleteFailed' };
    }
  },

  /**
   * Get list of stories
   * @param params - Filter and pagination parameters
   */
  async list(params?: StoryListParams): Promise<StoryListResponse> {
    try {
      const response = await api.get<StoryListResponse>(BASE_PATH, { params });
      return response.data;
    } catch (error) {
      console.error('[storyService] list failed:', error);
      return {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      };
    }
  },

  /**
   * Get user's stories
   */
  async getMyStories(params?: { page?: number; limit?: number; sortBy?: string; sortOrder?: string }): Promise<StoryListResponse> {
    try {
      const response = await api.get<StoryListResponse>(`${BASE_PATH}/my`, { params });
      return response.data;
    } catch (error) {
      console.error('[storyService] getMyStories failed:', error);
      return {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      };
    }
  },

  /**
   * Get a single story by ID
   * @param storyId - Story ID
   */
  async getById(storyId: string): Promise<Story | null> {
    try {
      const response = await api.get<Story>(`${BASE_PATH}/${storyId}`);
      return response.data;
    } catch (error) {
      console.error('[storyService] getById failed:', error);
      return null;
    }
  },

  /**
   * Get popular stories
   * @param limit - Number of stories to fetch
   */
  async getPopular(limit = 10): Promise<Story[]> {
    try {
      // TODO: Implement backend endpoint for actual popularity metrics
      // For now, fetch public stories
      const response = await this.list({ isPublic: true, limit });
      return response.items;
    } catch (error) {
      console.error('[storyService] getPopular failed:', error);
      return [];
    }
  },

  /**
   * Play/start a story session
   * @param storyId - Story ID
   */
  async play(storyId: string): Promise<{ success: boolean; sessionId?: string }> {
    try {
      // TODO: Implement when story session system is ready
      const response = await api.post<{ sessionId: string }>(`${BASE_PATH}/${storyId}/play`);
      return { success: true, sessionId: response.data.sessionId };
    } catch (error) {
      console.error('[storyService] play failed:', error);
      return { success: false };
    }
  },
};

export type StoryService = typeof storyService;
