import type { AgeRating, ContentTag } from './characters';

export interface Story {
  id: string;
  title: string;
  synopsis?: string | null;
  initialText?: string | null;
  coverImage?: string | null;
  objectives?: StoryObjective[] | null;
  authorId: string;
  ageRating: AgeRating;
  contentTags: ContentTag[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;

  // Relations
  author?: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  characters?: Array<{
    id: string;
    firstName: string;
    lastName?: string | null;
    avatar?: string | null;
  }>;
  tags?: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

export interface StoryObjective {
  id?: string;
  description: string;
  completed?: boolean;
}

export interface StoryFormData {
  title: string;
  synopsis?: string;
  initialText?: string;
  coverImage?: string;
  objectives?: StoryObjective[];
  characterIds?: string[];
  tagIds?: string[];
  ageRating?: AgeRating;
  contentTags?: ContentTag[];
  isPublic?: boolean;
}

export interface CreateStoryPayload {
  title: string;
  synopsis?: string;
  initialText?: string;
  coverImage?: string;
  objectives?: StoryObjective[];
  characterIds?: string[];
  tagIds?: string[];
  ageRating?: AgeRating;
  contentTags?: ContentTag[];
  isPublic?: boolean;
}

export interface StoryListParams {
  search?: string;
  tags?: string[];
  ageRatings?: AgeRating[];
  contentTags?: ContentTag[];
  authorId?: string;
  isPublic?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface StoryListResponse {
  items: Story[];
  total: number;
  page: number;
  pageSize: number;
}
