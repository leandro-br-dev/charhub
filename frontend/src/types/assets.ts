import { Visibility } from './common';
import type { AgeRating, ContentTag, VisualStyle } from './characters';

/**
 * Asset Types - represent different kinds of assets in the system
 */
export type AssetType =
  | 'CLOTHING'
  | 'ACCESSORY'
  | 'SCAR'
  | 'HAIRSTYLE'
  | 'OBJECT'
  | 'WEAPON'
  | 'VEHICLE'
  | 'FURNITURE'
  | 'PROP';

/**
 * Asset Categories - help organize assets by usage/purpose
 */
export type AssetCategory =
  | 'WEARABLE'
  | 'HOLDABLE'
  | 'ENVIRONMENTAL';

/**
 * Image types for asset images
 */
export type AssetImageType = 'PREVIEW' | 'SOURCE' | 'THUMBNAIL' | 'OTHER';

/**
 * Asset image types from backend
 */
export type AssetImageTypeDb = 'preview' | 'reference' | 'transparent' | 'in_context';

/**
 * Core asset fields
 */
export interface AssetCore {
  id: string;
  name: string;
  description: string;
  type: AssetType;
  category: AssetCategory;
  previewImageUrl: string | null;
  style: VisualStyle | null;
  ageRating: AgeRating;
  contentTags: ContentTag[];
  visibility: Visibility;
  authorId: string;
  contentVersion: number;
  originalLanguageCode: string | null;
  createdAt: string;
  updatedAt: string;
  // Legacy/compatibility fields
  tags: string[]; // Computed from tag names
}

/**
 * Full asset with relations
 */
export interface Asset extends AssetCore {
  images?: AssetImage[];
  characterAssets?: CharacterAsset[];
  tagObjects?: Tag[]; // Related Tag objects (renamed from 'tags' to avoid conflict)
  author?: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
  // Computed/legacy fields for UI compatibility
  previewUrl: string | null; // Same as previewImageUrl
  thumbnailUrl: string | null; // Computed from images
  format: string | null; // Computed from image metadata
}

/**
 * Tag for asset categorization
 */
export interface Tag {
  id: string;
  name: string;
}

/**
 * Asset summary for list views
 */
export interface AssetSummary extends AssetCore {
  imageCount?: number;
  linkedCharacterCount?: number;
  // Computed/legacy fields for UI compatibility
  previewUrl: string | null; // Same as previewImageUrl
  thumbnailUrl: string | null; // Computed from images
  format: string | null; // Computed from image metadata
}

/**
 * Asset image representation
 */
export interface AssetImage {
  id: string;
  assetId: string;
  imageUrl: string;
  imageType: AssetImageTypeDb;
  width: number | null;
  height: number | null;
  createdAt: string;
}

/**
 * Character-Asset linkage
 */
export interface CharacterAsset {
  id: string;
  characterId: string;
  assetId: string;
  placementZone: string | null;
  placementDetail: string | null;
  displayOrder: number;
  isVisible: boolean;
  isPrimary: boolean;
  contextNote: string | null;
  createdAt: string;
  asset?: Asset;
}

/**
 * List parameters for asset queries
 */
export interface AssetListParams {
  search?: string;
  types?: AssetType[];
  categories?: AssetCategory[];
  tags?: string[];
  visibility?: Visibility;
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'type' | 'category';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  page?: number;
  public?: boolean; // When false, returns only user's own assets
}

/**
 * List response for assets
 */
export interface AssetListResponse {
  items: AssetSummary[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Payload for creating/updating assets
 */
export interface AssetPayload {
  name: string;
  description: string | null;
  type: AssetType;
  category: AssetCategory;
  sourceUrl: string | null;
  tags: string[];
  visibility?: Visibility;
}

/**
 * Full form values for asset creation/editing
 */
export interface AssetFormValues {
  // Basic fields
  name: string;
  description: string | null;
  type: AssetType;
  category: AssetCategory;

  // Visual
  previewImageUrl: string | null;

  // Classification
  style: VisualStyle | null;
  ageRating: AgeRating;
  contentTags: ContentTag[];
  visibility: Visibility;

  // Tags
  tagIds: string[];
}

/**
 * Result of asset mutations
 */
export interface AssetMutationResult {
  success: boolean;
  asset?: Asset;
  message?: string;
}

/**
 * Parameters for linking asset to character
 */
export interface LinkAssetToCharacterParams {
  characterId: string;
  assetId: string;
  placementZone?: string | null;
  placementDetail?: string | null;
  isVisible?: boolean;
  isPrimary?: boolean;
  contextNote?: string | null;
  displayOrder?: number;
}

/**
 * Parameters for updating character asset linkage
 */
export interface UpdateCharacterAssetParams {
  placementZone?: string | null;
  placementDetail?: string | null;
  isVisible?: boolean;
  isPrimary?: boolean;
  contextNote?: string | null;
  displayOrder?: number;
}

/**
 * Upload result for asset images
 */
export interface AssetImageUploadResult {
  url: string;
  key: string;
  assetId?: string | null;
  type: AssetImageType;
}

/**
 * Empty asset form for initialization
 */
export const EMPTY_ASSET_FORM: AssetFormValues = {
  name: '',
  description: null,
  type: 'PROP',
  category: 'ENVIRONMENTAL',
  previewImageUrl: null,
  style: null,
  ageRating: 'L',
  contentTags: [],
  visibility: Visibility.PUBLIC,
  tagIds: [],
};

/**
 * Asset type labels for display
 */
export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  CLOTHING: 'Clothing',
  ACCESSORY: 'Accessory',
  SCAR: 'Scar',
  HAIRSTYLE: 'Hairstyle',
  OBJECT: 'Object',
  WEAPON: 'Weapon',
  VEHICLE: 'Vehicle',
  FURNITURE: 'Furniture',
  PROP: 'Prop',
};

/**
 * Asset category labels for display
 */
export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  WEARABLE: 'Wearable',
  HOLDABLE: 'Holdable',
  ENVIRONMENTAL: 'Environmental',
};

/**
 * Asset placement zone labels for display
 */
export const ASSET_PLACEMENT_ZONE_LABELS: Record<string, string> = {
  face: 'Face',
  torso: 'Torso',
  left_hand: 'Left Hand',
  right_hand: 'Right Hand',
  head: 'Head',
  feet: 'Feet',
};
