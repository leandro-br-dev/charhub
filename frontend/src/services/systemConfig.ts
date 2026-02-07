import api from '../lib/api';

/**
 * Types for System Configuration
 * Simplified to basic key-value pairs
 */

export interface SystemConfigItem {
  key: string;
  value: string;
}

export interface SystemConfigResponse {
  configs: SystemConfigItem[];
}

/**
 * System Configuration Service
 * Simplified service for fetching and updating system configuration parameters.
 */
export const systemConfigService = {
  /**
   * Get all configurations as simple key-value pairs
   */
  async getAll(): Promise<SystemConfigResponse> {
    const response = await api.get('/api/v1/system-config');
    // Backend returns { success: true, data: { configs: [...] } }
    return response.data.data;
  },

  /**
   * Update a single configuration value
   */
  async updateConfig(key: string, value: string): Promise<void> {
    await api.put(`/api/v1/system-config/${key}`, { value });
  },
};
