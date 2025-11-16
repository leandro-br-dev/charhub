import api from '../lib/api';
import type { Plan } from './subscriptionService';

const API_PREFIX = import.meta.env.VITE_API_VERSION || '/api/v1';
const BASE_PATH = `${API_PREFIX}/plans`;

export const planService = {
  /**
   * Get all available plans
   */
  async list(): Promise<Plan[]> {
    const response = await api.get<{ success: boolean; data: Plan[] }>(BASE_PATH);
    return response.data.data || [];
  },

  /**
   * Get a specific plan by ID
   */
  async getById(planId: string): Promise<Plan> {
    const response = await api.get<{ success: boolean; data: Plan }>(`${BASE_PATH}/${planId}`);
    return response.data.data;
  }
};
