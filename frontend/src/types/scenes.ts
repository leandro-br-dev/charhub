import { AgeRating, ContentTag, VisualStyle } from './characters';
import { Visibility } from './common';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Scene image type classification
 */
export type SceneImageType =
  | 'COVER'       // Main scene cover image
  | 'MAP'         // Floor plan of entire scene
  | 'EXTERIOR'    // External view of the scene
  | 'INTERIOR'    // Internal view of the scene
  | 'DETAIL'      // Detail shots
  | 'PANORAMA'    // Wide panoramic view
  | 'MISC';       // Miscellaneous (requires caption)

/**
 * Scene area image type classification
 */
export type SceneAreaImageType =
  | 'ENVIRONMENT' // Main view of the area
  | 'MAP'         // Floor plan of this area
  | 'DETAIL'      // Detail shots within area
  | 'PANORAMA'    // Wide view of area
  | 'MISC';       // Miscellaneous (requires caption)

/**
 * Scene - Represents a location/environment that can contain multiple areas
 */
export interface Scene {
  id: string;
  name: string;
  description: string;
  shortDescription?: string | null;
  genre?: string | null;
  era?: string | null;
  mood?: string | null;
  style?: VisualStyle | null;
  imagePrompt?: string | null;
  mapPrompt?: string | null;
  coverImageUrl?: string | null;
  mapImageUrl?: string | null;
  ageRating: AgeRating;
  contentTags: ContentTag[];
  visibility: Visibility;
  authorId: string;
  author?: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
  contentVersion: number;
  originalLanguageCode?: string | null;
  metadata?: unknown;
  areas?: SceneArea[];
  images?: SceneImage[];
  tags?: Tag[];
  createdAt: string;
  updatedAt: string;
}

/**
 * SceneSummary - Lightweight version for lists
 */
export interface SceneSummary {
  id: string;
  name: string;
  description: string;
  shortDescription?: string | null;
  genre?: string | null;
  era?: string | null;
  mood?: string | null;
  style?: VisualStyle | null;
  coverImageUrl?: string | null;
  ageRating: AgeRating;
  contentTags: ContentTag[];
  visibility: Visibility;
  authorId: string;
  author?: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
  areaCount?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * SceneArea - Sub-location within a Scene
 */
export interface SceneArea {
  id: string;
  sceneId: string;
  scene?: Scene;
  name: string;
  description: string;
  shortDescription?: string | null;
  imagePrompt?: string | null;
  mapPrompt?: string | null;
  environmentImageUrl?: string | null;
  mapImageUrl?: string | null;
  displayOrder: number;
  isAccessible: boolean;
  contentVersion: number;
  originalLanguageCode?: string | null;
  metadata?: unknown;
  assets?: SceneAreaAsset[];
  connections?: SceneAreaConnection[];
  images?: SceneAreaImage[];
  createdAt: string;
  updatedAt: string;
}

/**
 * SceneAreaConnection - Navigation between areas
 */
export interface SceneAreaConnection {
  id: string;
  fromAreaId: string;
  fromArea?: SceneArea;
  toAreaId: string;
  toArea?: SceneArea;
  direction?: string | null;
  description?: string | null;
  isLocked: boolean;
  lockHint?: string | null;
}

/**
 * SceneAreaAsset - Asset placed in an area
 */
export interface SceneAreaAsset {
  id: string;
  areaId: string;
  assetId: string;
  asset?: {
    id: string;
    name: string;
    description: string | null;
    type: string;
    category: string;
    previewImageUrl: string | null;
    thumbnailUrl: string | null;
  };
  position?: string | null;
  isHidden: boolean;
  isInteractable: boolean;
  discoveryHint?: string | null;
  metadata?: unknown;
  displayOrder: number;
}

/**
 * SceneImage - Images associated with a scene
 */
export interface SceneImage {
  id: string;
  sceneId: string;
  imageUrl: string;
  imageType: SceneImageType;
  caption?: string | null;
  createdAt: string;
}

/**
 * SceneAreaImage - Images associated with an area
 */
export interface SceneAreaImage {
  id: string;
  areaId: string;
  imageUrl: string;
  imageType: SceneAreaImageType;
  caption?: string | null;
  createdAt: string;
}

/**
 * Tag - Generic tag for scenes
 */
export interface Tag {
  id: string;
  name: string;
  type: string;
  weight: number;
  ageRating: AgeRating;
  originalLanguageCode?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Scene form values for create/update
 */
export interface SceneFormValues {
  name: string;
  description: string;
  shortDescription?: string | null;
  genre?: string | null;
  era?: string | null;
  mood?: string | null;
  style?: VisualStyle | null;
  imagePrompt?: string | null;
  mapPrompt?: string | null;
  coverImageUrl?: string | null;
  mapImageUrl?: string | null;
  ageRating: AgeRating;
  contentTags: ContentTag[];
  visibility: Visibility;
  tagIds?: string[];
}

/**
 * SceneArea form values for create/update
 */
export interface SceneAreaFormValues {
  name: string;
  description: string;
  shortDescription?: string | null;
  imagePrompt?: string | null;
  mapPrompt?: string | null;
  environmentImageUrl?: string | null;
  mapImageUrl?: string | null;
  displayOrder?: number;
  isAccessible?: boolean;
  metadata?: unknown;
}

/**
 * Scene list parameters
 */
export interface SceneListParams {
  genre?: string;
  mood?: string;
  era?: string;
  search?: string;
  visibility?: Visibility;
  style?: VisualStyle;
  authorId?: string;
  skip?: number;
  limit?: number;
  public?: boolean;
}

/**
 * Scene list response
 */
export interface SceneListResponse {
  items: SceneSummary[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Scene mutation result
 */
export interface SceneMutationResult {
  success: boolean;
  scene?: Scene;
  message?: string;
}

/**
 * Empty scene form
 */
export const EMPTY_SCENE_FORM: SceneFormValues = {
  name: '',
  description: '',
  shortDescription: null,
  genre: null,
  era: null,
  mood: null,
  style: 'ANIME',
  imagePrompt: null,
  mapPrompt: null,
  coverImageUrl: null,
  mapImageUrl: null,
  ageRating: 'L',
  contentTags: [],
  visibility: Visibility.PUBLIC,  // Changed from PRIVATE - scenes default to public
  tagIds: [],
};

/**
 * Empty area form
 */
export const EMPTY_AREA_FORM: SceneAreaFormValues = {
  name: '',
  description: '',
  shortDescription: null,
  imagePrompt: null,
  mapPrompt: null,
  environmentImageUrl: null,
  mapImageUrl: null,
  displayOrder: 0,
  isAccessible: true,
  metadata: null,
};
