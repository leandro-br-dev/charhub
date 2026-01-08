import api from '../lib/api';

const API_PREFIX = '/api/v1/admin/analytics';

/**
 * Types for LLM Cost Analytics
 */

export interface DateRange {
  from: Date;
  to: Date;
}

export interface CostByFeature {
  feature: string;
  totalCost: number;
  totalTokens: number;
  requestCount: number;
  avgCostPerRequest: number;
  avgTokensPerRequest: number;
}

export interface CostByModel {
  provider: string;
  model: string;
  totalCost: number;
  totalTokens: number;
  requestCount: number;
  avgCostPerRequest: number;
}

export interface CostByPlan {
  subscriptionPlan: string;
  avgCost: number;
  userCount: number;
  totalCost: number;
}

export interface DailyCost {
  date: string;
  totalCost: number;
  totalTokens: number;
  requestCount: number;
}

export interface TopUser {
  userId: string;
  totalCost: number;
  requestCount: number;
}

export interface CachingMetrics {
  totalRequests: number;
  cachedRequests: number;
  cacheHitRate: string;
  costSavings: string;
}

export interface LLMAnalyticsOverview {
  totalCost: number;
  costsByFeature: CostByFeature[];
  costsByModel: CostByModel[];
  costsByPlan: CostByPlan[];
  dailyCosts: DailyCost[];
  topUsers: TopUser[];
  cachingMetrics: CachingMetrics;
}

/**
 * Analytics Service
 * Provides methods for fetching LLM cost analytics data.
 */
export const analyticsService = {
  /**
   * Get LLM costs aggregated by feature type
   */
  async getCostByFeature(dateRange?: DateRange): Promise<{ data: CostByFeature[]; dateRange: DateRange }> {
    const params = new URLSearchParams();
    if (dateRange?.from) params.append('from', dateRange.from.toISOString());
    if (dateRange?.to) params.append('to', dateRange.to.toISOString());

    const response = await api.get(`${API_PREFIX}/llm/costs/by-feature?${params.toString()}`);
    return response.data;
  },

  /**
   * Get LLM costs aggregated by model
   */
  async getCostByModel(dateRange?: DateRange): Promise<{ data: CostByModel[]; dateRange: DateRange }> {
    const params = new URLSearchParams();
    if (dateRange?.from) params.append('from', dateRange.from.toISOString());
    if (dateRange?.to) params.append('to', dateRange.to.toISOString());

    const response = await api.get(`${API_PREFIX}/llm/costs/by-model?${params.toString()}`);
    return response.data;
  },

  /**
   * Get total operational LLM costs
   */
  async getTotalOperationalCost(dateRange?: DateRange): Promise<{ data: { totalCost: number; currency: string }; dateRange: DateRange }> {
    const params = new URLSearchParams();
    if (dateRange?.from) params.append('from', dateRange.from.toISOString());
    if (dateRange?.to) params.append('to', dateRange.to.toISOString());

    const response = await api.get(`${API_PREFIX}/llm/costs/total?${params.toString()}`);
    return response.data;
  },

  /**
   * Get average LLM cost per user grouped by subscription plan
   */
  async getAverageCostByPlan(): Promise<{ data: CostByPlan[] }> {
    const response = await api.get(`${API_PREFIX}/llm/costs/by-plan`);
    return response.data;
  },

  /**
   * Get daily LLM costs (time series data)
   */
  async getDailyCosts(dateRange?: DateRange): Promise<{ data: DailyCost[]; dateRange: DateRange }> {
    const params = new URLSearchParams();
    if (dateRange?.from) params.append('from', dateRange.from.toISOString());
    if (dateRange?.to) params.append('to', dateRange.to.toISOString());

    const response = await api.get(`${API_PREFIX}/llm/costs/daily?${params.toString()}`);
    return response.data;
  },

  /**
   * Get top users by LLM cost
   */
  async getTopUsersByCost(dateRange?: DateRange, limit: number = 50): Promise<{ data: TopUser[]; dateRange: DateRange }> {
    const params = new URLSearchParams();
    if (dateRange?.from) params.append('from', dateRange.from.toISOString());
    if (dateRange?.to) params.append('to', dateRange.to.toISOString());
    params.append('limit', limit.toString());

    const response = await api.get(`${API_PREFIX}/llm/costs/top-users?${params.toString()}`);
    return response.data;
  },

  /**
   * Get caching effectiveness metrics
   */
  async getCachingMetrics(dateRange?: DateRange): Promise<{ data: CachingMetrics; dateRange: DateRange }> {
    const params = new URLSearchParams();
    if (dateRange?.from) params.append('from', dateRange.from.toISOString());
    if (dateRange?.to) params.append('to', dateRange.to.toISOString());

    const response = await api.get(`${API_PREFIX}/llm/caching?${params.toString()}`);
    return response.data;
  },

  /**
   * Get comprehensive LLM analytics overview
   * This fetches all data in a single request
   */
  async getOverview(dateRange?: DateRange): Promise<{ data: LLMAnalyticsOverview; dateRange: DateRange }> {
    const params = new URLSearchParams();
    if (dateRange?.from) params.append('from', dateRange.from.toISOString());
    if (dateRange?.to) params.append('to', dateRange.to.toISOString());

    const response = await api.get(`${API_PREFIX}/llm/overview?${params.toString()}`);
    return response.data;
  },
};
