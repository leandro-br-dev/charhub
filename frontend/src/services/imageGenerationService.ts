import api from '../lib/api';

export interface GeneratedImage {
  id: string;
  type: 'AVATAR' | 'COVER' | 'STICKER' | 'SAMPLE' | 'OTHER' | 'REFERENCE';
  url: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  isActive: boolean;
  createdAt: string;
  content?: string; // For REFERENCE type: 'avatar' | 'front' | 'side' | 'back'
}

export interface ImagesByType {
  AVATAR?: GeneratedImage[];
  COVER?: GeneratedImage[];
  STICKER?: GeneratedImage[];
  SAMPLE?: GeneratedImage[];
  OTHER?: GeneratedImage[];
  REFERENCE?: GeneratedImage[];
}

export interface GenerateAvatarRequest {
  characterId: string;
}

export interface GenerateImageRequest {
  characterId: string;
  type: 'AVATAR' | 'COVER';
  description?: string;
}

export interface JobStatus {
  jobId: string;
  state: 'waiting' | 'active' | 'completed' | 'failed';
  progress: number;
  data?: any;
  result?: {
    success: boolean;
    imageUrl?: string;
    imageUrls?: string[];
    characterId?: string;
  };
  failedReason?: string;
}

export interface MultiStageDatasetRequest {
  characterId: string;
  prompt: {
    positive: string;
    negative: string;
  };
  loras?: Array<{
    name: string;
    filepathRelative: string;
    strength: number;
  }>;
  referenceImages?: Array<{
    type: string;
    url: string;
  }>;
}

export interface MultiStageDatasetResponse {
  success: boolean;
  jobId: string;
  message: string;
  estimatedTime: string;
  pollUrl: string;
  stages: string[];
}

export interface MultiStageJobStatus {
  jobId: string;
  state: 'waiting' | 'active' | 'completed' | 'failed';
  progress?: {
    stage: number;
    total: number;
    message: string;
  };
  result?: {
    success: boolean;
    characterId: string;
    results: Array<{
      stage: number;
      type: string;
      viewType: string;
      imageUrl: string;
    }>;
  };
  failedReason?: string;
}

export interface ReferenceDataset {
  success: boolean;
  data: Array<{
    id: string;
    type: 'REFERENCE';
    url: string;
    width: number;
    height: number;
    createdAt: string;
    content?: string; // 'avatar' | 'front' | 'side' | 'back'
  }>;
  isComplete: boolean;
  stageCount: number;
}

class ImageGenerationService {
  /**
   * List all generated images for a character
   */
  async listCharacterImages(characterId: string): Promise<ImagesByType> {
    const response = await api.get<{ success: boolean; data: ImagesByType; total: number }>(
      `/api/v1/image-generation/characters/${characterId}/images`
    );
    return response.data.data;
  }

  /**
   * Activate an image (deactivates others of the same type)
   */
  async activateImage(characterId: string, imageId: string): Promise<void> {
    await api.patch(
      `/api/v1/image-generation/characters/${characterId}/images/${imageId}/activate`
    );
  }

  /**
   * Delete an image
   */
  async deleteImage(characterId: string, imageId: string): Promise<void> {
    await api.delete(
      `/api/v1/image-generation/characters/${characterId}/images/${imageId}`
    );
  }

  /**
   * Generate avatar for a character
   */
  async generateAvatar(request: GenerateAvatarRequest): Promise<{ jobId: string; message: string }> {
    const response = await api.post<{ jobId: string; message: string }>(
      '/api/v1/image-generation/avatar',
      { characterId: request.characterId }
    );
    return response.data;
  }

  /**
   * Check job status
   */
  async getJobStatus(jobId: string): Promise<JobStatus> {
    const response = await api.get<JobStatus>(`/api/v1/image-generation/status/${jobId}`);
    return response.data;
  }

  /**
   * Poll job status until completion or failure
   * @param jobId Job ID to monitor
   * @param onProgress Callback for progress updates
   * @param maxAttempts Maximum number of polling attempts (default: 60)
   * @param interval Polling interval in ms (default: 5000)
   */
  async pollJobStatus(
    jobId: string,
    onProgress?: (status: JobStatus) => void,
    maxAttempts = 60,
    interval = 5000
  ): Promise<JobStatus> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.getJobStatus(jobId);

      if (onProgress) {
        onProgress(status);
      }

      if (status.state === 'completed' || status.state === 'failed') {
        return status;
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error('Job polling timeout');
  }

  /**
   * Check if ComfyUI is healthy
   */
  async checkHealth(): Promise<{ comfyui: string }> {
    const response = await api.get<{ comfyui: string }>('/api/v1/image-generation/health');
    return response.data;
  }

  /**
   * Generate multi-stage reference dataset for a character
   */
  async generateMultiStageDataset(request: MultiStageDatasetRequest): Promise<MultiStageDatasetResponse> {
    const response = await api.post<MultiStageDatasetResponse>(
      '/api/v1/image-generation/character-dataset',
      request
    );
    return response.data;
  }

  /**
   * Get reference dataset for a character
   */
  async getReferenceDataset(characterId: string): Promise<ReferenceDataset> {
    const response = await api.get<ReferenceDataset>(
      `/api/v1/image-generation/characters/${characterId}/reference-dataset`
    );
    return response.data;
  }

  /**
   * Get multi-stage job status
   */
  async getMultiStageJobStatus(jobId: string): Promise<MultiStageJobStatus> {
    const response = await api.get<MultiStageJobStatus>(
      `/api/v1/image-generation/status/${jobId}`
    );
    return response.data;
  }

  /**
   * Poll multi-stage job status until completion or failure
   */
  async pollMultiStageJobStatus(
    jobId: string,
    onProgress?: (status: MultiStageJobStatus) => void,
    maxAttempts = 240, // 12 minutes with 3s interval
    interval = 3000
  ): Promise<MultiStageJobStatus> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.getMultiStageJobStatus(jobId);

      if (onProgress) {
        onProgress(status);
      }

      if (status.state === 'completed' || status.state === 'failed') {
        return status;
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error('Multi-stage job polling timeout');
  }
}

export const imageGenerationService = new ImageGenerationService();
