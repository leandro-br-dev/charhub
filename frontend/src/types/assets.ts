import { Visibility } from './common';

/**
 * Asset Types - represent different kinds of assets in the system
 */
export type AssetType =
  | 'CLOTHING'
  | 'ACCESSORY'
  | 'SCAR'
  | 'HAIRSTYLE'
  | 'OBJECT'
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
 * Core asset fields
 */
export interface AssetCore {
  id: string;
  name: string;
  description: string | null;
  type: AssetType;
  category: AssetCategory;
  sourceUrl: string | null;
  previewUrl: string | null;
  thumbnailUrl: string | null;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  duration: number | null; // For audio/video in seconds
  format: string | null; // e.g., 'png', 'jpg', 'mp3', 'wav'
  tags: string[];
  visibility: Visibility;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Full asset with relations
 */
export interface Asset extends AssetCore {
  images: AssetImage[];
  characterAssets?: CharacterAsset[];
  creator?: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
}

/**
 * Asset summary for list views
 */
export interface AssetSummary extends AssetCore {
  imageCount?: number;
  linkedCharacterCount?: number;
}

/**
 * Asset image representation
 */
export interface AssetImage {
  id: string;
  assetId: string;
  type: AssetImageType;
  url: string;
  key: string | null;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  contentType: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
export interface AssetFormValues extends AssetPayload {
  previewUrl: string | null;
  thumbnailUrl: string | null;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  format: string | null;
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
  sourceUrl: null,
  tags: [],
  visibility: Visibility.PRIVATE,
  previewUrl: null,
  thumbnailUrl: null,
  fileSize: null,
  width: null,
  height: null,
  duration: null,
  format: null,
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
