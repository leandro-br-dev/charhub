import api from '../lib/api';
import {
  type Asset,
  type AssetFormValues,
  type AssetListParams,
  type AssetListResponse,
  type AssetMutationResult,
  type CharacterAsset,
  type LinkAssetToCharacterParams,
  type UpdateCharacterAssetParams,
  type AssetImageUploadResult,
  EMPTY_ASSET_FORM
} from '../types/assets';

const API_PREFIX = import.meta.env.VITE_API_VERSION || '/api/v1';
const BASE_PATH = `${API_PREFIX}/assets`;
const CHARACTER_ASSETS_PATH = `${API_PREFIX}/character-assets`;

/**
 * Asset Service - handles all asset-related API operations
 */
export const assetService = {
  /**
   * Get list of assets with optional filtering
   */
  async list(params?: AssetListParams): Promise<AssetListResponse> {
    const query: Record<string, unknown> = { ...(params || {}) };

    // Convert array parameters to comma-separated strings
    if (params?.types) {
      query.types = params.types.join(',');
    }
    if (params?.categories) {
      query.categories = params.categories.join(',');
    }
    if (params?.tags) {
      query.tags = params.tags.join(',');
    }

    // Convert visibility enum to string
    if (params && Object.prototype.hasOwnProperty.call(params, 'visibility')) {
      query.visibility = params.visibility;
    }

    // Convert public boolean to string for backend
    if (params && Object.prototype.hasOwnProperty.call(params, 'public')) {
      query.public = params.public ? 'true' : 'false';
    }

    const response = await api.get<{ success: boolean; data: Asset[]; total: number }>(BASE_PATH, { params: query });

    return {
      items: response.data.data || [],
      total: response.data.total || 0,
      page: 1,
      pageSize: response.data.data?.length || 20
    };
  },

  /**
   * Get asset by ID
   */
  async getById(assetId: string): Promise<Asset> {
    const response = await api.get<{ success: boolean; data: Asset }>(`${BASE_PATH}/${assetId}`);
    return response.data.data;
  },

  /**
   * Create a new asset
   */
  async create(payload: AssetFormValues = EMPTY_ASSET_FORM): Promise<AssetMutationResult> {
    try {
      const response = await api.post<{ success: boolean; data: Asset }>(BASE_PATH, payload);
      return { success: true, asset: response.data.data };
    } catch (error) {
      console.error('[assetService] create failed:', error);
      return { success: false, message: 'assets:errors.createFailed' };
    }
  },

  /**
   * Update an existing asset
   */
  async update(assetId: string, payload: AssetFormValues): Promise<AssetMutationResult> {
    try {
      const response = await api.put<{ success: boolean; data: Asset }>(`${BASE_PATH}/${assetId}`, payload);
      return { success: true, asset: response.data.data };
    } catch (error) {
      console.error('[assetService] update failed:', error);
      return { success: false, message: 'assets:errors.updateFailed' };
    }
  },

  /**
   * Delete an asset
   */
  async remove(assetId: string): Promise<AssetMutationResult> {
    try {
      const response = await api.delete<{ success: boolean; message: string }>(`${BASE_PATH}/${assetId}`);
      return { success: response.data.success, message: response.data.message };
    } catch (error) {
      console.error('[assetService] remove failed:', error);
      return { success: false, message: 'assets:errors.deleteFailed' };
    }
  },

  /**
   * Upload an asset image
   */
  async uploadImage(params: {
    file: Blob;
    assetId?: string;
    type: 'PREVIEW' | 'SOURCE' | 'THUMBNAIL' | 'OTHER';
  }): Promise<AssetImageUploadResult> {
    const formData = new FormData();
    formData.append('image', params.file);
    formData.append('type', params.type);

    if (params.assetId) {
      formData.append('assetId', params.assetId);
    }

    const response = await api.post<{ success: boolean; data: AssetImageUploadResult }>(
      `${BASE_PATH}/images`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    return response.data.data;
  },

  /**
   * Add image URL to asset
   */
  async addImageUrl(params: {
    assetId: string;
    url: string;
    type: 'PREVIEW' | 'SOURCE' | 'THUMBNAIL' | 'OTHER';
  }): Promise<AssetImageUploadResult> {
    const response = await api.post<{ success: boolean; data: AssetImageUploadResult }>(
      `${BASE_PATH}/${params.assetId}/images/url`,
      {
        url: params.url,
        type: params.type
      }
    );
    return response.data.data;
  },

  /**
   * Get images for an asset
   */
  async getImages(assetId: string, type?: string): Promise<Array<{ id: string; url: string; type: string }>> {
    const response = await api.get<{ success: boolean; data: Array<{ id: string; url: string; type: string }> }>(
      `${BASE_PATH}/${assetId}/images`,
      { params: type ? { type } : {} }
    );
    return response.data.data || [];
  },

  /**
   * Link asset to character
   */
  async linkToCharacter(params: LinkAssetToCharacterParams): Promise<{ success: boolean; data?: CharacterAsset }> {
    try {
      const response = await api.post<{ success: boolean; data: CharacterAsset }>(CHARACTER_ASSETS_PATH, params);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('[assetService] linkToCharacter failed:', error);
      return { success: false };
    }
  },

  /**
   * Unlink asset from character
   */
  async unlinkFromCharacter(characterAssetId: string): Promise<{ success: boolean }> {
    try {
      await api.delete(`${CHARACTER_ASSETS_PATH}/${characterAssetId}`);
      return { success: true };
    } catch (error) {
      console.error('[assetService] unlinkFromCharacter failed:', error);
      return { success: false };
    }
  },

  /**
   * Update character asset linkage
   */
  async updateCharacterAsset(
    characterAssetId: string,
    params: UpdateCharacterAssetParams
  ): Promise<{ success: boolean; data?: CharacterAsset }> {
    try {
      const response = await api.put<{ success: boolean; data: CharacterAsset }>(
        `${CHARACTER_ASSETS_PATH}/${characterAssetId}`,
        params
      );
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('[assetService] updateCharacterAsset failed:', error);
      return { success: false };
    }
  },

  /**
   * Get assets for a character
   */
  async getCharacterAssets(characterId: string): Promise<CharacterAsset[]> {
    try {
      const response = await api.get<{ success: boolean; data: CharacterAsset[] }>(
        `${CHARACTER_ASSETS_PATH}/character/${characterId}`
      );
      return response.data.data || [];
    } catch (error) {
      console.error('[assetService] getCharacterAssets failed:', error);
      return [];
    }
  },

  /**
   * Get characters that use an asset
   */
  async getAssetCharacters(assetId: string): Promise<CharacterAsset[]> {
    try {
      const response = await api.get<{ success: boolean; data: CharacterAsset[] }>(
        `${CHARACTER_ASSETS_PATH}/asset/${assetId}`
      );
      return response.data.data || [];
    } catch (error) {
      console.error('[assetService] getAssetCharacters failed:', error);
      return [];
    }
  },

  /**
   * Get available assets for selection (picker)
   */
  async getAvailableAssets(params?: {
    search?: string;
    types?: string[];
    categories?: string[];
    limit?: number;
  }): Promise<Asset[]> {
    try {
      const queryParams: Record<string, string | number> = { limit: params?.limit || 50 };

      if (params?.search) {
        queryParams.search = params.search;
      }
      if (params?.types) {
        queryParams.types = params.types.join(',');
      }
      if (params?.categories) {
        queryParams.categories = params.categories.join(',');
      }

      const response = await api.get<{ success: boolean; data: Asset[] }>(BASE_PATH, { params: queryParams });
      return response.data.data || [];
    } catch (error) {
      console.error('[assetService] getAvailableAssets failed:', error);
      return [];
    }
  },

  /**
   * Upload a file as an asset
   */
  async uploadFile(params: {
    file: Blob;
    name: string;
    type: string;
    category: string;
    description?: string;
  }): Promise<AssetMutationResult> {
    try {
      const formData = new FormData();
      formData.append('file', params.file);
      formData.append('name', params.name);
      formData.append('type', params.type);
      formData.append('category', params.category);
      if (params.description) {
        formData.append('description', params.description);
      }

      const response = await api.post<{ success: boolean; data: Asset }>(
        `${BASE_PATH}/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return { success: true, asset: response.data.data };
    } catch (error) {
      console.error('[assetService] uploadFile failed:', error);
      return { success: false, message: 'assets:errors.uploadFailed' };
    }
  }
};

export type AssetService = typeof assetService;
