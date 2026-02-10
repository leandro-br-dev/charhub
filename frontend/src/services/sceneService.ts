import api from '../lib/api';
import {
  type Scene,
  type SceneSummary,
  type SceneArea,
  type SceneAreaAsset,
  type SceneAreaConnection,
  type SceneFormValues,
  type SceneAreaFormValues,
  type SceneListParams,
  type SceneListResponse,
  type SceneMutationResult,
  type SceneImage,
  type SceneImageType,
  type SceneAreaImage,
  type SceneAreaImageType,
  EMPTY_SCENE_FORM,
} from '../types/scenes';

const API_PREFIX = import.meta.env.VITE_API_VERSION || '/api/v1';
const BASE_PATH = `${API_PREFIX}/scenes`;

export const sceneService = {
  /**
   * List scenes with filters
   */
  async list(params?: SceneListParams): Promise<SceneListResponse> {
    const query: Record<string, unknown> = { ...(params || {}) };

    // Convert public boolean to string for backend
    if (params && Object.prototype.hasOwnProperty.call(params, 'public')) {
      query.public = params.public ? 'true' : 'false';
    }

    const response = await api.get<{ success: boolean; data: Scene[]; count: number }>(BASE_PATH, {
      params: query,
    });

    return {
      items: response.data.data || [],
      total: response.data.count || 0,
      page: 1,
      pageSize: response.data.data?.length || 20,
    };
  },

  /**
   * Get scene by ID
   */
  async getById(sceneId: string): Promise<Scene> {
    const response = await api.get<{ success: boolean; data: Scene }>(`${BASE_PATH}/${sceneId}`);
    return response.data.data;
  },

  /**
   * Create a new scene
   */
  async create(payload: SceneFormValues = EMPTY_SCENE_FORM): Promise<SceneMutationResult> {
    try {
      const response = await api.post<{ success: boolean; data: Scene }>(BASE_PATH, payload);
      return { success: true, scene: response.data.data };
    } catch (error) {
      console.error('[sceneService] create failed:', error);
      return { success: false, message: 'scenes:errors.createFailed' };
    }
  },

  /**
   * Update scene
   */
  async update(sceneId: string, payload: SceneFormValues): Promise<SceneMutationResult> {
    try {
      const response = await api.put<{ success: boolean; data: Scene }>(
        `${BASE_PATH}/${sceneId}`,
        payload
      );
      return { success: true, scene: response.data.data };
    } catch (error) {
      console.error('[sceneService] update failed:', error);
      return { success: false, message: 'scenes:errors.updateFailed' };
    }
  },

  /**
   * Delete scene
   */
  async remove(sceneId: string): Promise<SceneMutationResult> {
    try {
      const response = await api.delete<{ success: boolean; message: string }>(
        `${BASE_PATH}/${sceneId}`
      );
      return { success: response.data.success, message: response.data.message };
    } catch (error) {
      console.error('[sceneService] remove failed:', error);
      return { success: false, message: 'scenes:errors.deleteFailed' };
    }
  },

  /**
   * Get user's favorite scenes
   */
  async getFavorites(limit = 10): Promise<Scene[]> {
    try {
      const response = await api.get<{ success: boolean; data: Scene[] }>(
        `${BASE_PATH}/favorites`,
        { params: { limit } }
      );
      return response.data.data || [];
    } catch (error) {
      console.error('[sceneService] getFavorites failed:', error);
      return [];
    }
  },

  /**
   * Get scene map data (full structure with areas, assets, connections)
   */
  async getSceneMap(sceneId: string): Promise<{
    scene: {
      id: string;
      name: string;
      description: string;
      shortDescription?: string | null;
      genre?: string | null;
      era?: string | null;
      mood?: string | null;
      style?: string | null;
      mapImageUrl?: string | null;
    };
    areas: Array<{
      id: string;
      name: string;
      description: string;
      shortDescription?: string | null;
      displayOrder: number;
      isAccessible: boolean;
      environmentImageUrl?: string | null;
      mapImageUrl?: string | null;
      assets: SceneAreaAsset[];
      connections: SceneAreaConnection[];
    }>;
  }> {
    const response = await api.get<{
      success: boolean;
      data: {
        scene: {
          id: string;
          name: string;
          description: string;
          shortDescription?: string | null;
          genre?: string | null;
          era?: string | null;
          mood?: string | null;
          style?: string | null;
          mapImageUrl?: string | null;
        };
        areas: Array<{
          id: string;
          name: string;
          description: string;
          shortDescription?: string | null;
          displayOrder: number;
          isAccessible: boolean;
          environmentImageUrl?: string | null;
          mapImageUrl?: string | null;
          assets: SceneAreaAsset[];
          connections: SceneAreaConnection[];
        }>;
      };
    }>(`${BASE_PATH}/${sceneId}/map`);
    return response.data.data;
  },

  // ==========================================================================
  // AREA MANAGEMENT
  // ==========================================================================

  /**
   * Add area to scene
   */
  async addArea(sceneId: string, payload: SceneAreaFormValues): Promise<SceneArea> {
    const response = await api.post<{ success: boolean; data: SceneArea }>(
      `${BASE_PATH}/${sceneId}/areas`,
      payload
    );
    return response.data.data;
  },

  /**
   * Get area details
   */
  async getAreaById(areaId: string): Promise<SceneArea> {
    const response = await api.get<{ success: boolean; data: SceneArea }>(
      `${BASE_PATH}/areas/${areaId}`
    );
    return response.data.data;
  },

  /**
   * Update area
   */
  async updateArea(areaId: string, payload: SceneAreaFormValues): Promise<SceneArea> {
    const response = await api.put<{ success: boolean; data: SceneArea }>(
      `${BASE_PATH}/areas/${areaId}`,
      payload
    );
    return response.data.data;
  },

  /**
   * Remove area
   */
  async removeArea(areaId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete<{ success: boolean; message: string }>(
      `${BASE_PATH}/areas/${areaId}`
    );
    return response.data;
  },

  /**
   * Get scene areas
   */
  async getSceneAreas(sceneId: string): Promise<SceneArea[]> {
    const scene = await this.getById(sceneId);
    return scene.areas || [];
  },

  // ==========================================================================
  // ASSET-AREA LINKING
  // ==========================================================================

  /**
   * Link asset to area
   */
  async linkAssetToArea(
    areaId: string,
    assetId: string,
    options?: {
      position?: string;
      isHidden?: boolean;
      isInteractable?: boolean;
      discoveryHint?: string;
      metadata?: unknown;
      displayOrder?: number;
    }
  ): Promise<SceneAreaAsset> {
    const response = await api.post<{ success: boolean; data: SceneAreaAsset }>(
      `${BASE_PATH}/areas/${areaId}/assets`,
      { assetId, ...options }
    );
    return response.data.data;
  },

  /**
   * Get area assets
   */
  async getAreaAssets(areaId: string): Promise<SceneAreaAsset[]> {
    const response = await api.get<{ success: boolean; data: SceneAreaAsset[]; count: number }>(
      `${BASE_PATH}/areas/${areaId}/assets`
    );
    return response.data.data || [];
  },

  /**
   * Update area asset
   */
  async updateAreaAsset(
    areaId: string,
    assetId: string,
    options?: {
      position?: string;
      isHidden?: boolean;
      isInteractable?: boolean;
      discoveryHint?: string;
      metadata?: unknown;
      displayOrder?: number;
    }
  ): Promise<SceneAreaAsset> {
    const response = await api.put<{ success: boolean; data: SceneAreaAsset }>(
      `${BASE_PATH}/areas/${areaId}/assets/${assetId}`,
      options
    );
    return response.data.data;
  },

  /**
   * Unlink asset from area
   */
  async unlinkAssetFromArea(areaId: string, assetId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete<{ success: boolean; message: string }>(
      `${BASE_PATH}/areas/${areaId}/assets/${assetId}`
    );
    return response.data;
  },

  // ==========================================================================
  // AREA CONNECTIONS
  // ==========================================================================

  /**
   * Connect areas
   */
  async connectAreas(
    fromAreaId: string,
    toAreaId: string,
    options?: {
      direction?: string;
      description?: string;
      isLocked?: boolean;
      lockHint?: string;
    }
  ): Promise<SceneAreaConnection> {
    const response = await api.post<{ success: boolean; data: SceneAreaConnection }>(
      `${BASE_PATH}/areas/${fromAreaId}/connections`,
      { toAreaId, ...options }
    );
    return response.data.data;
  },

  /**
   * Get area connections
   */
  async getAreaConnections(areaId: string): Promise<SceneAreaConnection[]> {
    const response = await api.get<{ success: boolean; data: SceneAreaConnection[] }>(
      `${BASE_PATH}/areas/${areaId}/connections`
    );
    return response.data.data || [];
  },

  /**
   * Update connection
   */
  async updateConnection(
    fromAreaId: string,
    toAreaId: string,
    options?: {
      direction?: string;
      description?: string;
      isLocked?: boolean;
      lockHint?: string;
    }
  ): Promise<SceneAreaConnection> {
    const response = await api.put<{ success: boolean; data: SceneAreaConnection }>(
      `${BASE_PATH}/areas/${fromAreaId}/connections/${toAreaId}`,
      options
    );
    return response.data.data;
  },

  /**
   * Disconnect areas
   */
  async disconnectAreas(fromAreaId: string, toAreaId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete<{ success: boolean; message: string }>(
      `${BASE_PATH}/areas/${fromAreaId}/connections/${toAreaId}`
    );
    return response.data;
  },

  /**
   * Autocomplete scene fields using AI or web search
   */
  async autocomplete(
    payload: Partial<SceneFormValues>,
    mode: 'ai' | 'web' = 'ai'
  ): Promise<Partial<SceneFormValues>> {
    try {
      const response = await api.post<{ success: boolean; data: Partial<SceneFormValues> }>(
        `${BASE_PATH}/autocomplete`,
        { mode, payload }
      );
      return response.data.data || {};
    } catch (error) {
      console.error('[sceneService] autocomplete failed:', error);
      throw error;
    }
  },

  /**
   * Upload scene cover image
   */
  async uploadCover({
    file,
    sceneId,
  }: {
    file: File;
    sceneId: string;
  }): Promise<{ url: string; key: string }> {
    const formData = new FormData();
    formData.append('cover', file);
    formData.append('sceneId', sceneId);

    const response = await api.post<{ success: boolean; data: { url: string; key: string } }>(
      `${BASE_PATH}/cover`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data.data;
  },

  // ==========================================================================
  // SCENE IMAGES
  // ==========================================================================

  /**
   * List all scene images
   */
  async listSceneImages(sceneId: string): Promise<SceneImage[]> {
    const response = await api.get<{ success: boolean; data: SceneImage[]; count: number }>(
      `${BASE_PATH}/${sceneId}/images`
    );
    return response.data.data || [];
  },

  /**
   * Upload scene image
   */
  async uploadSceneImage(sceneId: string, file: File, options: {
    imageType: SceneImageType;
    caption?: string;
  }): Promise<SceneImage> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('imageType', options.imageType);
    if (options.caption) {
      formData.append('caption', options.caption);
    }

    const response = await api.post<{ success: boolean; data: SceneImage }>(
      `${BASE_PATH}/${sceneId}/images`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data;
  },

  /**
   * Update scene image
   */
  async updateSceneImage(imageId: string, options: {
    imageType?: SceneImageType;
    caption?: string;
  }): Promise<SceneImage> {
    const response = await api.patch<{ success: boolean; data: SceneImage }>(
      `${BASE_PATH}/images/${imageId}`,
      options
    );
    return response.data.data;
  },

  /**
   * Delete scene image
   */
  async deleteSceneImage(imageId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete<{ success: boolean; message: string }>(
      `${BASE_PATH}/images/${imageId}`
    );
    return response.data;
  },

  // ==========================================================================
  // SCENE AREAS (Full CRUD)
  // ==========================================================================

  /**
   * List all areas for a scene
   */
  async listSceneAreas(sceneId: string): Promise<SceneArea[]> {
    const response = await api.get<{ success: boolean; data: SceneArea[]; count: number }>(
      `${BASE_PATH}/${sceneId}/areas`
    );
    return response.data.data || [];
  },

  /**
   * Get area by ID
   */
  async getSceneAreaById(sceneId: string, areaId: string): Promise<SceneArea> {
    const response = await api.get<{ success: boolean; data: SceneArea }>(
      `${BASE_PATH}/${sceneId}/areas/${areaId}`
    );
    return response.data.data;
  },

  /**
   * Update area
   */
  async updateSceneArea(areaId: string, payload: SceneAreaFormValues): Promise<SceneArea> {
    const response = await api.put<{ success: boolean; data: SceneArea }>(
      `${BASE_PATH}/areas/${areaId}`,
      payload
    );
    return response.data.data;
  },

  /**
   * Delete area
   */
  async deleteSceneArea(areaId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete<{ success: boolean; message: string }>(
      `${BASE_PATH}/areas/${areaId}`
    );
    return response.data;
  },

  // ==========================================================================
  // AREA IMAGES
  // ==========================================================================

  /**
   * List all area images
   */
  async listAreaImages(sceneId: string, areaId: string): Promise<SceneAreaImage[]> {
    const response = await api.get<{ success: boolean; data: SceneAreaImage[]; count: number }>(
      `${BASE_PATH}/${sceneId}/areas/${areaId}/images`
    );
    return response.data.data || [];
  },

  /**
   * Upload area image
   */
  async uploadAreaImage(sceneId: string, areaId: string, file: File, options: {
    imageType: SceneAreaImageType;
    caption?: string;
  }): Promise<SceneAreaImage> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('imageType', options.imageType);
    if (options.caption) {
      formData.append('caption', options.caption);
    }

    const response = await api.post<{ success: boolean; data: SceneAreaImage }>(
      `${BASE_PATH}/${sceneId}/areas/${areaId}/images`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data;
  },

  /**
   * Update area image
   */
  async updateAreaImage(imageId: string, options: {
    imageType?: SceneAreaImageType;
    caption?: string;
  }): Promise<SceneAreaImage> {
    const response = await api.patch<{ success: boolean; data: SceneAreaImage }>(
      `${BASE_PATH}/areas/images/${imageId}`,
      options
    );
    return response.data.data;
  },

  /**
   * Delete area image
   */
  async deleteAreaImage(imageId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete<{ success: boolean; message: string }>(
      `${BASE_PATH}/areas/images/${imageId}`
    );
    return response.data;
  },
};

export type SceneService = typeof sceneService;
