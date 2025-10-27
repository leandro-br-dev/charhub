import api from '../lib/api';
import type { Tag, TagType } from '../types/characters';

const API_PREFIX = import.meta.env.VITE_API_VERSION || '/api/v1';
const BASE_PATH = `${API_PREFIX}/tags`;

export interface ListTagsQuery {
  search?: string;
  type?: TagType;
  limit?: number;
  skip?: number;
}

export const tagService = {
  async list(query?: ListTagsQuery & { includeTranslations?: boolean; lang?: string }): Promise<{ items: (Tag & { label?: string; description?: string | null })[]; total: number }> {
    try {
      const { data } = await api.get<{ success: boolean; data: any[]; count?: number }>(BASE_PATH, { params: query });
      if (data && data.success) {
        return { items: (data.data as any[]) || [], total: data.count ?? (data.data?.length ?? 0) };
      }
      return { items: [], total: 0 };
    } catch (error) {
      // Graceful fallback if endpoint isn't available yet
      console.warn('[tagService] list failed or not available yet', error);
      return { items: [], total: 0 };
    }
  },
};

export type TagService = typeof tagService;
