/**
 * ComfyUI Service Unit Tests
 * Tests for ComfyUI middleware integration
 */

import { ComfyUIService } from '../comfyuiService';
import axios from 'axios';
import type { ComfyWorkflow } from '../types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ComfyUIService', () => {
  let service: ComfyUIService;
  const mockBaseUrl = 'https://test-comfyui.example.com';
  const mockToken = 'test-token-123';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock axios.create to return a mock instance
    const mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
    } as any;

    mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);
  });

  describe('Constructor', () => {
    it('should initialize with custom config', () => {
      service = new ComfyUIService({
        baseUrl: mockBaseUrl,
        timeout: 10000,
        serviceToken: mockToken,
      });


      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: mockBaseUrl,
          timeout: 10000,
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('should initialize with environment variables', () => {
      process.env.COMFYUI_URL = 'https://env-comfyui.example.com';
      process.env.COMFYUI_TIMEOUT = '30000';
      process.env.COMFYUI_SERVICE_TOKEN = 'env-token';

      new ComfyUIService();

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://env-comfyui.example.com',
          timeout: 30000,
          headers: expect.objectContaining({
            'Authorization': 'Bearer env-token',
          }),
        })
      );
    });

    it('should use default values when no config provided', () => {
      delete process.env.COMFYUI_URL;
      delete process.env.COMFYUI_TIMEOUT;
      delete process.env.COMFYUI_SERVICE_TOKEN;

      new ComfyUIService();

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://localhost:8188',
          timeout: 300000,
        })
      );
    });

    it('should not add Authorization header if no token provided', () => {
      delete process.env.COMFYUI_SERVICE_TOKEN;

      new ComfyUIService({ baseUrl: mockBaseUrl });

      const callArgs = mockedAxios.create.mock.calls[0]?.[0];
      expect(callArgs?.headers).not.toHaveProperty('Authorization');
    });
  });

  describe('queuePrompt', () => {
    beforeEach(() => {
      service = new ComfyUIService({
        baseUrl: mockBaseUrl,
        timeout: 10000,
        serviceToken: mockToken,
      });
    });

    it('should queue a prompt successfully', async () => {
      const mockWorkflow: ComfyWorkflow = {
        '1': { inputs: {}, class_type: 'TestNode' },
      };

      const mockResponse = {
        data: {
          prompt_id: 'test-prompt-123',
          number: 1,
        },
      };

      const mockAxiosInstance = (service as any).client;
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const result = await service.queuePrompt(mockWorkflow);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/prompt', {
        prompt: mockWorkflow,
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error when queue fails', async () => {
      const mockWorkflow: ComfyWorkflow = {
        '1': { inputs: {}, class_type: 'TestNode' },
      };

      const mockAxiosInstance = (service as any).client;
      mockAxiosInstance.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.queuePrompt(mockWorkflow))
        .rejects
        .toThrow('Failed to queue prompt: Network error');
    });
  });

  describe('getHistory', () => {
    beforeEach(() => {
      service = new ComfyUIService({
        baseUrl: mockBaseUrl,
        timeout: 10000,
        serviceToken: mockToken,
      });
    });

    it('should get history for a prompt ID', async () => {
      const mockPromptId = 'test-prompt-123';
      const mockHistory = {
        [mockPromptId]: {
          outputs: {
            '9': {
              images: [
                { filename: 'test.png', subfolder: '', type: 'output' },
              ],
            },
          },
        },
      };

      const mockAxiosInstance = (service as any).client;
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockHistory });

      const result = await service.getHistory(mockPromptId);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/history/${mockPromptId}`);
      expect(result).toEqual(mockHistory);
    });

    it('should return null when history fetch fails', async () => {
      const mockPromptId = 'test-prompt-123';

      const mockAxiosInstance = (service as any).client;
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Not found'));

      const result = await service.getHistory(mockPromptId);

      expect(result).toBeNull();
    });
  });

  describe('getImage', () => {
    beforeEach(() => {
      service = new ComfyUIService({
        baseUrl: mockBaseUrl,
        timeout: 10000,
        serviceToken: mockToken,
      });
    });

    it('should fetch image bytes successfully', async () => {
      const mockImageData = Buffer.from('fake-image-data');
      const mockAxiosInstance = (service as any).client;
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockImageData,
      });

      const result = await service.getImage('test.png', '', 'output');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/view', {
        params: {
          filename: 'test.png',
          subfolder: '',
          type: 'output',
        },
        responseType: 'arraybuffer',
      });
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should return null when image fetch fails', async () => {
      const mockAxiosInstance = (service as any).client;
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Image not found'));

      const result = await service.getImage('test.png', '', 'output');

      expect(result).toBeNull();
    });
  });

  describe('freeMemory', () => {
    beforeEach(() => {
      service = new ComfyUIService({
        baseUrl: mockBaseUrl,
        timeout: 10000,
        serviceToken: mockToken,
      });
    });

    it('should free memory successfully', async () => {
      const mockAxiosInstance = (service as any).client;
      mockAxiosInstance.post.mockResolvedValueOnce({ data: { status: 'ok' } });

      const result = await service.freeMemory();

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/free', {
        unload_models: true,
        free_memory: true,
      });
      expect(result).toBe(true);
    });

    it('should return true on 404 (endpoint not found)', async () => {
      const mockAxiosInstance = (service as any).client;
      const error = new Error('Not found');
      (error as any).response = { status: 404 };
      mockAxiosInstance.post.mockRejectedValueOnce(error);

      const result = await service.freeMemory();

      expect(result).toBe(true);
    });

    it('should return false on other errors', async () => {
      const mockAxiosInstance = (service as any).client;
      mockAxiosInstance.post.mockRejectedValueOnce(new Error('Server error'));

      const result = await service.freeMemory();

      expect(result).toBe(false);
    });
  });

  describe('uploadImage', () => {
    beforeEach(() => {
      service = new ComfyUIService({
        baseUrl: mockBaseUrl,
        timeout: 10000,
        serviceToken: mockToken,
      });
    });

    it('should upload image successfully', async () => {
      const mockImageBuffer = Buffer.from('test-image-data');
      const mockFilename = 'test-upload.png';
      const mockResponse = {
        data: {
          name: mockFilename,
          subfolder: '',
          type: 'input',
        },
      };

      const mockAxiosInstance = (service as any).client;
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const result = await service.uploadImage(mockImageBuffer, mockFilename);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/upload/image',
        expect.any(Object), // FormData
        expect.objectContaining({
          headers: expect.any(Object),
        })
      );
      expect(result).toBe(mockFilename);
    });

    it('should upload with overwrite flag', async () => {
      const mockImageBuffer = Buffer.from('test-image-data');
      const mockFilename = 'test-upload.png';
      const mockResponse = {
        data: {
          name: mockFilename,
          subfolder: '',
          type: 'input',
        },
      };

      const mockAxiosInstance = (service as any).client;
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      await service.uploadImage(mockImageBuffer, mockFilename, true);

      expect(mockAxiosInstance.post).toHaveBeenCalled();
    });

    it('should throw error when upload fails', async () => {
      const mockImageBuffer = Buffer.from('test-image-data');
      const mockFilename = 'test-upload.png';

      const mockAxiosInstance = (service as any).client;
      mockAxiosInstance.post.mockRejectedValueOnce(new Error('Upload failed'));

      await expect(service.uploadImage(mockImageBuffer, mockFilename))
        .rejects
        .toThrow('Failed to upload image to ComfyUI: Upload failed');
    });
  });

  describe('healthCheck', () => {
    beforeEach(() => {
      service = new ComfyUIService({
        baseUrl: mockBaseUrl,
        timeout: 10000,
        serviceToken: mockToken,
      });
    });

    it('should return true when health check passes', async () => {
      const mockAxiosInstance = (service as any).client;
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { status: 'ok' },
      });

      const result = await service.healthCheck();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/system_stats',
        { timeout: 5000 }
      );
      expect(result).toBe(true);
    });

    it('should return false when health check fails', async () => {
      const mockAxiosInstance = (service as any).client;
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Service unavailable'));

      const result = await service.healthCheck();

      expect(result).toBe(false);
    });
  });
});
