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
          title: 'dashboard:carousel.slides.welcome.title',
          description: 'dashboard:carousel.slides.welcome.description',
          imageUrl: '/covers/cover_landscape_1.webp',
          buttons: [
            {
              to: '/characters/create',
              label: 'dashboard:carousel.slides.welcome.action1',
              variant: 'primary',
              icon: 'add',
            },
            {
              to: '/characters',
              label: 'dashboard:carousel.slides.welcome.action2',
              variant: 'secondary',
              icon: 'search',
            },
          ],
          priority: 1,
        },
        {
          id: '2',
          title: 'dashboard:carousel.slides.stories.title',
          description: 'dashboard:carousel.slides.stories.description',
          imageUrl: '/covers/cover_landscape_2.webp',
          buttons: [
            {
              to: '/stories',
              label: 'dashboard:carousel.slides.stories.action',
              variant: 'primary',
              icon: 'menu_book',
            },
          ],
          isPlus: true,
          priority: 2,
        },
        {
          id: '3',
          title: 'dashboard:carousel.slides.community.title',
          description: 'dashboard:carousel.slides.community.description',
          imageUrl: '/covers/cover_landscape_3.webp',
          buttons: [
            {
              to: '/community',
              label: 'dashboard:carousel.slides.community.action',
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
