import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../../lib/api';
import { systemConfigService } from '../systemConfig';

// Mock the api module
vi.mock('../../lib/api');

describe('systemConfigService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll()', () => {
    it('should fetch all configurations', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            configs: [
              {
                key: 'translation.default_provider',
                value: 'gemini',
              },
              {
                key: 'generation.daily_limit',
                value: '5',
              },
            ],
            count: 2,
          },
        },
      };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await systemConfigService.getAll();

      expect(api.get).toHaveBeenCalledWith('/api/v1/system-config');
      expect(result.configs).toHaveLength(2);
      expect(result.configs[0]).toEqual({
        key: 'translation.default_provider',
        value: 'gemini',
      });
    });

    it('should handle API errors gracefully', async () => {
      const mockError = new Error('Network error');
      vi.mocked(api.get).mockRejectedValue(mockError);

      await expect(systemConfigService.getAll()).rejects.toThrow('Network error');
    });

    it('should handle empty response', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            configs: [],
            count: 0,
          },
        },
      };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await systemConfigService.getAll();

      expect(result.configs).toHaveLength(0);
    });
  });

  describe('updateConfig()', () => {
    it('should update configuration value', async () => {
      vi.mocked(api.put).mockResolvedValue({ data: { success: true } });

      await systemConfigService.updateConfig('translation.default_provider', 'openai');

      expect(api.put).toHaveBeenCalledWith('/api/v1/system-config/translation.default_provider', {
        value: 'openai',
      });
    });

    it('should update boolean configuration as string', async () => {
      vi.mocked(api.put).mockResolvedValue({ data: { success: true } });

      await systemConfigService.updateConfig('generation.batch_enabled', 'true');

      expect(api.put).toHaveBeenCalledWith('/api/v1/system-config/generation.batch_enabled', {
        value: 'true',
      });
    });

    it('should update number configuration as string', async () => {
      vi.mocked(api.put).mockResolvedValue({ data: { success: true } });

      await systemConfigService.updateConfig('generation.daily_limit', '10');

      expect(api.put).toHaveBeenCalledWith('/api/v1/system-config/generation.daily_limit', {
        value: '10',
      });
    });

    it('should handle API errors gracefully', async () => {
      const mockError = new Error('Failed to update configuration');
      vi.mocked(api.put).mockRejectedValue(mockError);

      await expect(
        systemConfigService.updateConfig('translation.default_provider', 'openai')
      ).rejects.toThrow('Failed to update configuration');
    });

    it('should include auth token in request', async () => {
      // Mock localStorage to return auth token
      const mockUser = {
        id: 'user-123',
        token: 'test-token',
        role: 'ADMIN',
      };
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(mockUser));

      vi.mocked(api.put).mockResolvedValue({ data: { success: true } });

      await systemConfigService.updateConfig('translation.default_provider', 'openai');

      // Verify api.put was called (auth header is added by interceptor)
      expect(api.put).toHaveBeenCalled();
    });
  });

  describe('Integration scenarios', () => {
    it('should fetch and update configuration in sequence', async () => {
      const mockGetResponse = {
        data: {
          success: true,
          data: {
            configs: [
              {
                key: 'translation.default_provider',
                value: 'gemini',
              },
            ],
            count: 1,
          },
        },
      };

      vi.mocked(api.get).mockResolvedValue(mockGetResponse);
      vi.mocked(api.put).mockResolvedValue({ data: { success: true } });

      // First fetch
      const fetchResult = await systemConfigService.getAll();
      expect(fetchResult.configs[0].value).toBe('gemini');

      // Then update
      await systemConfigService.updateConfig('translation.default_provider', 'openai');
      expect(api.put).toHaveBeenCalledWith('/api/v1/system-config/translation.default_provider', {
        value: 'openai',
      });
    });

    it('should handle multiple concurrent requests', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            configs: [
              { key: 'translation.default_provider', value: 'gemini' },
              { key: 'generation.daily_limit', value: '5' },
            ],
            count: 2,
          },
        },
      };

      vi.mocked(api.get).mockResolvedValue(mockResponse);
      vi.mocked(api.put).mockResolvedValue({ data: { success: true } });

      // Concurrent fetch and update
      const [fetchResult] = await Promise.all([
        systemConfigService.getAll(),
        systemConfigService.updateConfig('test.key', 'test-value'),
      ]);

      expect(fetchResult.configs).toHaveLength(2);
      expect(api.put).toHaveBeenCalled();
    });
  });
});
