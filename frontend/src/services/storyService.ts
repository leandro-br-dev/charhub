import api from '../lib/api';

const API_PREFIX = import.meta.env.VITE_API_VERSION || '/api/v1';
const BASE_PATH = `${API_PREFIX}/stories`;

export interface Story {
  id: string;
  title: string;
  synopsis?: string;
  coverImage?: string;
  ageRating?: 'L' | 'TEN' | 'TWELVE' | 'FOURTEEN' | 'SIXTEEN' | 'EIGHTEEN';
  contentTags?: string[];
  author?: {
    id: string;
    username: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface StoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  ageRating?: string;
}

export interface StoryListResponse {
  items: Story[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Story service for managing interactive stories
 * Currently returns mock data as the story module is not yet implemented
 * TODO: Implement actual backend endpoints when story module is ready
 */
export const storyService = {
  /**
   * Get list of stories
   * @param params - Filter and pagination parameters
   */
  async list(params?: StoryListParams): Promise<StoryListResponse> {
    try {
      // TODO: Uncomment when backend endpoint is ready
      // const response = await api.get<{ success: boolean; data: Story[]; count: number }>(
      //   BASE_PATH,
      //   { params }
      // );
      // return {
      //   items: response.data.data || [],
      //   total: response.data.count || 0,
      //   page: params?.page || 1,
      //   pageSize: params?.limit || 20
      // };

      // Mock data for now
      const mockStories: Story[] = [
        {
          id: '1',
          title: 'The Dragon\'s Quest',
          synopsis: 'Embark on an epic adventure to save the kingdom from an ancient dragon.',
          coverImage: '/placeholder-story-1.jpg',
          ageRating: 'TWELVE',
          contentTags: ['FANTASY', 'ADVENTURE'],
          author: {
            id: 'user1',
            username: 'StoryMaster',
          },
        },
        {
          id: '2',
          title: 'Mystery at Midnight Manor',
          synopsis: 'Solve the mysterious disappearance in a haunted Victorian mansion.',
          coverImage: '/placeholder-story-2.jpg',
          ageRating: 'FOURTEEN',
          contentTags: ['MYSTERY', 'HORROR'],
          author: {
            id: 'user2',
            username: 'MysteryWriter',
          },
        },
        {
          id: '3',
          title: 'Love in the Stars',
          synopsis: 'A romantic tale of two souls meeting across the galaxy.',
          coverImage: '/placeholder-story-3.jpg',
          ageRating: 'SIXTEEN',
          contentTags: ['ROMANCE', 'SCI_FI'],
          author: {
            id: 'user3',
            username: 'RomanceAuthor',
          },
        },
      ];

      const limit = params?.limit || 20;
      const page = params?.page || 1;
      const start = (page - 1) * limit;
      const end = start + limit;

      return {
        items: mockStories.slice(start, end),
        total: mockStories.length,
        page,
        pageSize: limit,
      };
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
   * Get popular stories
   * @param limit - Number of stories to fetch
   */
  async getPopular(limit = 10): Promise<Story[]> {
    try {
      // TODO: Uncomment when backend endpoint is ready
      // const response = await api.get<{ success: boolean; data: Story[] }>(
      //   `${BASE_PATH}/popular`,
      //   { params: { limit } }
      // );
      // return response.data.data;

      // Mock data for now
      const response = await this.list({ limit });
      return response.items;
    } catch (error) {
      console.error('[storyService] getPopular failed:', error);
      return [];
    }
  },

  /**
   * Get a single story by ID
   * @param storyId - Story ID
   */
  async getById(storyId: string): Promise<Story | null> {
    try {
      // TODO: Uncomment when backend endpoint is ready
      // const response = await api.get<{ success: boolean; data: Story }>(
      //   `${BASE_PATH}/${storyId}`
      // );
      // return response.data.data;

      // Mock data for now
      const response = await this.list();
      return response.items.find(story => story.id === storyId) || null;
    } catch (error) {
      console.error('[storyService] getById failed:', error);
      return null;
    }
  },

  /**
   * Play/start a story session
   * @param storyId - Story ID
   */
  async play(storyId: string): Promise<{ success: boolean; sessionId?: string }> {
    try {
      // TODO: Uncomment when backend endpoint is ready
      // const response = await api.post<{ success: boolean; data: { sessionId: string } }>(
      //   `${BASE_PATH}/${storyId}/play`
      // );
      // return { success: true, sessionId: response.data.data.sessionId };

      // Mock response for now
      console.log(`[storyService] play story: ${storyId}`);
      return { success: true, sessionId: `session-${storyId}-${Date.now()}` };
    } catch (error) {
      console.error('[storyService] play failed:', error);
      return { success: false };
    }
  },
};

export type StoryService = typeof storyService;
