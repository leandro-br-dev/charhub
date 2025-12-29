import type { AgeRating, ContentTag } from './characters';
import { Visibility } from './common';

export type StoryCharacterRole = 'MAIN' | 'SECONDARY';

export interface StoryCharacter {
  id: string;
  storyId: string;
  characterId: string;
  role: StoryCharacterRole;
  order: number;
  character: {
    id: string;
    firstName: string;
    lastName?: string | null;
    images?: Array<{ url: string }>;
  };
}

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
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;

  // Relations
  author?: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  // New structure with roles
  storyCharacters?: StoryCharacter[];
  // Legacy compatibility - computed from storyCharacters
  characters?: Array<{
    id: string;
    firstName: string;
    lastName?: string | null;
    avatar?: string | null;
    role?: StoryCharacterRole; // Added role for display
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
  mainCharacterId?: string; // ID of the MAIN character (played by user)
  tagIds?: string[];
  ageRating?: AgeRating;
  contentTags?: ContentTag[];
  visibility?: Visibility;
}

export interface CreateStoryPayload {
  title: string;
  synopsis?: string;
  initialText?: string;
  coverImage?: string;
  objectives?: StoryObjective[];
  characterIds?: string[];
  mainCharacterId?: string; // ID of the MAIN character (played by user)
  tagIds?: string[];
  ageRating?: AgeRating;
  contentTags?: ContentTag[];
  visibility?: Visibility;
}

export interface StoryListParams {
  search?: string;
  tags?: string[];
  ageRatings?: AgeRating[];
  contentTags?: ContentTag[];
  authorId?: string;
  visibility?: Visibility;
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
