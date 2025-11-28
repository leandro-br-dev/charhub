import axios from '../lib/axios';

export interface GeneratedImage {
  id: string;
  type: 'AVATAR' | 'COVER' | 'STICKER' | 'SAMPLE' | 'OTHER';
  url: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  isActive: boolean;
  createdAt: string;
}

export interface ImagesByType {
  AVATAR?: GeneratedImage[];
  COVER?: GeneratedImage[];
  STICKER?: GeneratedImage[];
  SAMPLE?: GeneratedImage[];
  OTHER?: GeneratedImage[];
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
    characterId?: string;
  };
  failedReason?: string;
}

class ImageGenerationService {
  /**
   * List all generated images for a character
   */
  async listCharacterImages(characterId: string): Promise<ImagesByType> {
    const response = await axios.get<{ success: boolean; data: ImagesByType; total: number }>(
      `/api/v1/image-generation/characters/${characterId}/images`
    );
    return response.data.data;
  }

  /**
   * Activate an image (deactivates others of the same type)
   */
  async activateImage(characterId: string, imageId: string): Promise<void> {
    await axios.patch(
      `/api/v1/image-generation/characters/${characterId}/images/${imageId}/activate`
    );
  }

  /**
   * Generate avatar for a character
   */
  async generateAvatar(request: GenerateAvatarRequest): Promise<{ jobId: string; message: string }> {
    const response = await axios.post<{ jobId: string; message: string }>(
      '/api/v1/image-generation/avatar',
      { characterId: request.characterId }
    );
    return response.data;
  }

  /**
   * Check job status
   */
  async getJobStatus(jobId: string): Promise<JobStatus> {
    const response = await axios.get<JobStatus>(`/api/v1/image-generation/status/${jobId}`);
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
    const response = await axios.get<{ comfyui: string }>('/api/v1/image-generation/health');
    return response.data;
  }
}

export const imageGenerationService = new ImageGenerationService();
