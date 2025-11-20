import api from '../lib/api';

const API_PREFIX = import.meta.env.VITE_API_VERSION || '/api/v1';
const BASE_PATH = `${API_PREFIX}/credits`;

export interface CreditBalance {
  balance: number;
  userId: string;
}

export interface DailyRewardResponse {
  credits: number;
  newBalance: number;
  message: string;
}

export interface DailyRewardStatusResponse {
  claimed: boolean;
  canClaimAt: string;
}

export const creditService = {
  /**
   * Get current user's credit balance
   */
  async getBalance(): Promise<number> {
    const response = await api.get<{ success: boolean; data: CreditBalance }>(`${BASE_PATH}/balance`);
    return response.data.data.balance;
  },

  /**
   * Claim daily reward
   */
  async claimDailyReward(): Promise<DailyRewardResponse> {
    const response = await api.post<{ success: boolean; data: DailyRewardResponse }>(`${BASE_PATH}/daily-reward`);
    return response.data.data;
  },

  /**
   * Check if daily reward has been claimed
   */
  async getDailyRewardStatus(): Promise<DailyRewardStatusResponse> {
    const response = await api.get<{ success: boolean; data: DailyRewardStatusResponse }>(`${BASE_PATH}/daily-reward/status`);
    return response.data.data;
  },

  /**
   * Check if first chat reward has been claimed
   */
  async getFirstChatRewardStatus(): Promise<DailyRewardStatusResponse> {
    const response = await api.get<{ success: boolean; data: DailyRewardStatusResponse }>(`${BASE_PATH}/first-chat-reward/status`);
    return response.data.data;
  },
};
