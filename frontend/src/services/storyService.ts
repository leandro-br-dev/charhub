import api from '../lib/api';
import type {
  Story,
  StoryFormData,
  CreateStoryPayload,
  StoryListParams,
  StoryListResponse,
  StoryCharacter,
  StoryCharacterRole,
} from '../types/story';

export interface StoryCoverUploadResult {
  url: string;
  key: string;
}

const API_PREFIX = import.meta.env.VITE_API_VERSION || '/api/v1';
const BASE_PATH = `${API_PREFIX}/stories`;

/**
 * Transform storyCharacters to characters format for backward compatibility
 * Also adds role information to each character
 */
function transformStoryCharacters(story: any): Story {
  if (!story.storyCharacters || story.storyCharacters.length === 0) {
    // If no storyCharacters, ensure characters is empty array
    return { ...story, characters: [] };
  }

  // Map storyCharacters to characters format with role info
  const characters = story.storyCharacters
    .sort((a: StoryCharacter, b: StoryCharacter) => a.order - b.order)
    .map((sc: StoryCharacter) => ({
      id: sc.character.id,
      firstName: sc.character.firstName,
      lastName: sc.character.lastName,
      avatar: sc.character.images?.[0]?.url || null, // Get active avatar URL if available
      role: sc.role,
    }));

  return { ...story, characters };
}

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
        mainCharacterId: payload.mainCharacterId,
        tagIds: payload.tagIds,
        ageRating: payload.ageRating,
        contentTags: payload.contentTags,
        visibility: payload.visibility,
      };

      const response = await api.post<Story>(BASE_PATH, createPayload);
      // Transform storyCharacters to characters
      return { success: true, story: transformStoryCharacters(response.data) };
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
        mainCharacterId: payload.mainCharacterId,
        tagIds: payload.tagIds,
        ageRating: payload.ageRating,
        contentTags: payload.contentTags,
        visibility: payload.visibility,
      };

      const response = await api.put<Story>(`${BASE_PATH}/${storyId}`, updatePayload);
      // Transform storyCharacters to characters
      return { success: true, story: transformStoryCharacters(response.data) };
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
      // Transform storyCharacters to characters for each item
      const items = response.data.items.map(transformStoryCharacters);
      return { ...response.data, items };
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
      // Transform storyCharacters to characters for each item
      const items = response.data.items.map(transformStoryCharacters);
      return { ...response.data, items };
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
      // Transform storyCharacters to characters
      return transformStoryCharacters(response.data);
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
      // For now, fetch stories
      const response = await this.list({ limit });
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

  /**
   * Upload a story cover image to R2
   * @param file - Image file to upload
   */
  async uploadCoverImage(file: Blob): Promise<StoryCoverUploadResult> {
    try {
      const formData = new FormData();
      formData.append('cover', file);

      const response = await api.post<{ success: boolean; data: StoryCoverUploadResult }>(
        `${BASE_PATH}/cover`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('[storyService] uploadCoverImage failed:', error);
      throw error;
    }
  },
};

export type StoryService = typeof storyService;
