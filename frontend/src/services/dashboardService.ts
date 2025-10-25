import api from '../lib/api';

const API_PREFIX = import.meta.env.VITE_API_VERSION || '/api/v1';
const BASE_PATH = `${API_PREFIX}/dashboard`;

export interface CarouselHighlight {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  buttons: Array<{
    to: string;
    label: string;
    variant?: 'primary' | 'light' | 'secondary' | 'danger' | 'dark';
    icon?: string;
  }>;
  isPlus?: boolean;
  priority: number;
}

export interface DashboardStats {
  totalCharacters: number;
  totalConversations: number;
  totalMessages: number;
  favoriteCharacters: number;
}

/**
 * Dashboard service for fetching dashboard-specific data
 */
export const dashboardService = {
  /**
   * Get carousel highlights for the dashboard hero section
   * Returns mock data until backend endpoint is implemented
   */
  async getCarouselHighlights(): Promise<CarouselHighlight[]> {
    try {
      // TODO: Uncomment when backend endpoint is ready
      // const response = await api.get<{ success: boolean; data: CarouselHighlight[] }>(
      //   `${BASE_PATH}/carousel-highlights`
      // );
      // return response.data.data;

      // Mock data for now
      return [
        {
          id: '1',
          title: 'Welcome to CharHub',
          description: 'Create and chat with AI characters',
          imageUrl: '/placeholder-carousel-1.jpg',
          buttons: [
            {
              to: '/characters/create',
              label: 'Create Character',
              variant: 'primary',
              icon: 'add',
            },
            {
              to: '/characters',
              label: 'Browse Characters',
              variant: 'secondary',
            },
          ],
          priority: 1,
        },
        {
          id: '2',
          title: 'Discover Stories',
          description: 'Explore interactive storytelling',
          imageUrl: '/placeholder-carousel-2.jpg',
          buttons: [
            {
              to: '/stories',
              label: 'Browse Stories',
              variant: 'primary',
              icon: 'menu_book',
            },
          ],
          isPlus: true,
          priority: 2,
        },
        {
          id: '3',
          title: 'Join the Community',
          description: 'Connect with other creators',
          imageUrl: '/placeholder-carousel-3.jpg',
          buttons: [
            {
              to: '/community',
              label: 'Explore Community',
              variant: 'primary',
              icon: 'groups',
            },
          ],
          priority: 3,
        },
      ];
    } catch (error) {
      console.error('[dashboardService] getCarouselHighlights failed:', error);
      return [];
    }
  },

  /**
   * Get dashboard statistics for the user
   * Returns mock data until backend endpoint is implemented
   */
  async getStats(): Promise<DashboardStats> {
    try {
      // TODO: Uncomment when backend endpoint is ready
      // const response = await api.get<{ success: boolean; data: DashboardStats }>(
      //   `${BASE_PATH}/stats`
      // );
      // return response.data.data;

      // Mock data for now
      return {
        totalCharacters: 0,
        totalConversations: 0,
        totalMessages: 0,
        favoriteCharacters: 0,
      };
    } catch (error) {
      console.error('[dashboardService] getStats failed:', error);
      return {
        totalCharacters: 0,
        totalConversations: 0,
        totalMessages: 0,
        favoriteCharacters: 0,
      };
    }
  },
};

export type DashboardService = typeof dashboardService;
