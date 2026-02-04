/**
 * LLM Catalog Service
 * Manages LLM model catalog for admin interface
 *
 * This service interfaces with the database-backed LLM model catalog API.
 */

import api from '../lib/api';

// ============================================================================
// Types
// ============================================================================

/**
 * Supported LLM providers
 */
export type LLMProvider = 'gemini' | 'openai' | 'grok' | 'openrouter' | 'anthropic' | 'together_ai' | 'groq';

/**
 * Model category based on use case
 */
export type LLMModelCategory = 'CHAT' | 'CODING' | 'REASONING' | 'VISION' | 'SPEECH' | 'TRANSLATION' | 'AGENTIC' | 'EMBEDDING';

/**
 * Model type based on capabilities
 */
export type LLMModelType = 'TEXT' | 'MULTIMODAL' | 'REASONING' | 'SPEECH' | 'EMBEDDING';

/**
 * Individual model information from database
 */
export interface LLMModelInfo {
  id: string;                     // Database ID
  provider: LLMProvider;          // Provider ID
  name: string;                   // Model ID (e.g., "gemini-2.5-flash")
  displayName: string;            // Human-readable name
  category: LLMModelCategory;     // Use case category
  type: LLMModelType;             // Model type
  contextWindow: number;          // Context window size in tokens
  maxOutput: number;              // Maximum output tokens
  supportsTools: boolean;         // Supports function calling
  supportsVision: boolean;        // Supports image inputs
  supportsReasoning: boolean;     // Has extended thinking
  description?: string;           // Model description
  version: string;                // Model version
  source?: string;                // Source URL/documentation
  isActive: boolean;              // Whether model is enabled
  isAvailable: boolean;           // Whether model is available
  createdAt: string;              // Creation timestamp
  updatedAt: string;              // Last update timestamp
}

/**
 * Provider group with models
 */
export interface LLMProviderGroup {
  provider: LLMProvider;
  models: LLMModelInfo[];
  count: number;
}

/**
 * Grouped catalog response
 */
export interface GroupedCatalogResponse {
  grouped: LLMProviderGroup[];
  totalProviders: number;
  totalModels: number;
}

/**
 * Form values for creating/updating a model
 */
export interface LLMModelFormValues {
  provider: LLMProvider;
  name: string;                   // Model ID
  displayName: string;
  category: LLMModelCategory;
  type: LLMModelType;
  contextWindow: number;
  maxOutput: number;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsReasoning: boolean;
  description?: string;
  version?: string;
  source?: string;
  isActive?: boolean;
  isAvailable?: boolean;
}

/**
 * Empty form values for new model creation
 */
export const EMPTY_MODEL_FORM: LLMModelFormValues = {
  provider: 'gemini',
  name: '',
  displayName: '',
  category: 'CHAT',
  type: 'TEXT',
  contextWindow: 128000,
  maxOutput: 4096,
  supportsTools: false,
  supportsVision: false,
  supportsReasoning: false,
  description: '',
  version: '1.0.0',
  isActive: true,
  isAvailable: true
};

// ============================================================================
// API Response Types
// ============================================================================

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
  details?: any;
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// Service
// ============================================================================

const API_PREFIX = import.meta.env.VITE_API_VERSION || '/api/v1';
const BASE_PATH = `${API_PREFIX}/llm-catalog`;

export const llmCatalogService = {
  /**
   * Get all models with optional filtering
   */
  async getAll(filters?: {
    provider?: LLMProvider;
    category?: LLMModelCategory;
    type?: LLMModelType;
    isActive?: boolean;
    isAvailable?: boolean;
    supportsTools?: boolean;
    supportsVision?: boolean;
    supportsReasoning?: boolean;
  }): Promise<LLMModelInfo[]> {
    const params = new URLSearchParams();
    if (filters?.provider) params.set('provider', filters.provider);
    if (filters?.category) params.set('category', filters.category);
    if (filters?.type) params.set('type', filters.type);
    if (filters?.isActive !== undefined) params.set('isActive', String(filters.isActive));
    if (filters?.isAvailable !== undefined) params.set('isAvailable', String(filters.isAvailable));
    if (filters?.supportsTools !== undefined) params.set('supportsTools', String(filters.supportsTools));
    if (filters?.supportsVision !== undefined) params.set('supportsVision', String(filters.supportsVision));
    if (filters?.supportsReasoning !== undefined) params.set('supportsReasoning', String(filters.supportsReasoning));

    const queryString = params.toString();
    const url = queryString ? `${BASE_PATH}?${queryString}` : BASE_PATH;

    const response = await api.get<ApiResponse<{ models: LLMModelInfo[]; count: number }>>(url);
    if (response.data.success) {
      return response.data.data.models;
    }
    throw new Error(response.data.message || 'Failed to fetch models');
  },

  /**
   * Get all available providers
   */
  async getProviders(): Promise<string[]> {
    const response = await api.get<ApiResponse<{ providers: string[]; count: number }>>(`${BASE_PATH}/providers`);
    if (response.data.success) {
      return response.data.data.providers;
    }
    throw new Error(response.data.message || 'Failed to fetch providers');
  },

  /**
   * Get models grouped by provider
   */
  async getGrouped(): Promise<GroupedCatalogResponse> {
    const response = await api.get<ApiResponse<GroupedCatalogResponse>>(`${BASE_PATH}/grouped`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to fetch grouped models');
  },

  /**
   * Get a specific model by ID
   */
  async getById(id: string): Promise<LLMModelInfo> {
    const response = await api.get<ApiResponse<LLMModelInfo>>(`${BASE_PATH}/${id}`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to fetch model');
  },

  /**
   * Create a new model
   */
  async create(values: LLMModelFormValues): Promise<{ success: boolean; message: string; model?: LLMModelInfo }> {
    try {
      const response = await api.post<ApiResponse<LLMModelInfo>>(`${BASE_PATH}`, values);
      if (response.data.success) {
        return { success: true, model: response.data.data, message: response.data.message || 'llmCatalog:messages.createSuccess' };
      }
      return { success: false, message: response.data.message || 'llmCatalog:errors.createFailed' };
    } catch (error: any) {
      console.error('[llmCatalogService] Create failed:', error);
      const message = error.response?.data?.message || 'llmCatalog:errors.createFailed';
      return { success: false, message };
    }
  },

  /**
   * Update an existing model
   */
  async update(id: string, values: Partial<LLMModelFormValues>): Promise<{ success: boolean; message: string; model?: LLMModelInfo }> {
    try {
      const response = await api.put<ApiResponse<LLMModelInfo>>(`${BASE_PATH}/${id}`, values);
      if (response.data.success) {
        return { success: true, model: response.data.data, message: response.data.message || 'llmCatalog:messages.updateSuccess' };
      }
      return { success: false, message: response.data.message || 'llmCatalog:errors.updateFailed' };
    } catch (error: any) {
      console.error('[llmCatalogService] Update failed:', error);
      const message = error.response?.data?.message || 'llmCatalog:errors.updateFailed';
      return { success: false, message };
    }
  },

  /**
   * Delete a model
   */
  async delete(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.delete<ApiResponse<never>>(`${BASE_PATH}/${id}`);
      if (response.data.success) {
        return { success: true, message: response.data.message || 'llmCatalog:messages.deleteSuccess' };
      }
      return { success: false, message: response.data.message || 'llmCatalog:errors.deleteFailed' };
    } catch (error: any) {
      console.error('[llmCatalogService] Delete failed:', error);
      const message = error.response?.data?.message || 'llmCatalog:errors.deleteFailed';
      return { success: false, message };
    }
  },

  /**
   * Toggle model availability
   */
  async toggleAvailability(id: string): Promise<{ success: boolean; message: string; model?: LLMModelInfo }> {
    try {
      const response = await api.patch<ApiResponse<LLMModelInfo>>(`${BASE_PATH}/${id}/toggle-availability`);
      if (response.data.success) {
        return { success: true, model: response.data.data, message: response.data.message || 'llmCatalog:messages.toggleSuccess' };
      }
      return { success: false, message: response.data.message || 'llmCatalog:errors.toggleFailed' };
    } catch (error: any) {
      console.error('[llmCatalogService] Toggle availability failed:', error);
      const message = error.response?.data?.message || 'llmCatalog:errors.toggleFailed';
      return { success: false, message };
    }
  },

  /**
   * Refresh model cache
   */
  async refreshCache(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post<ApiResponse<never>>(`${BASE_PATH}/cache/refresh`);
      if (response.data.success) {
        return { success: true, message: response.data.message || 'Cache refreshed successfully' };
      }
      return { success: false, message: response.data.message || 'Failed to refresh cache' };
    } catch (error: any) {
      console.error('[llmCatalogService] Refresh cache failed:', error);
      const message = error.response?.data?.message || 'Failed to refresh cache';
      return { success: false, message };
    }
  },

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Get display name for a provider
   */
  getProviderDisplayName(provider: LLMProvider): string {
    const names: Record<LLMProvider, string> = {
      gemini: 'Google Gemini',
      openai: 'OpenAI',
      grok: 'XAI Grok',
      openrouter: 'OpenRouter',
      anthropic: 'Anthropic',
      together_ai: 'Together AI',
      groq: 'Groq'
    };
    return names[provider] || provider;
  },

  /**
   * Get category display name
   */
  getCategoryDisplayName(category: LLMModelCategory): string {
    const names: Record<LLMModelCategory, string> = {
      CHAT: 'Chat',
      CODING: 'Coding',
      REASONING: 'Reasoning',
      VISION: 'Vision',
      SPEECH: 'Speech',
      TRANSLATION: 'Translation',
      AGENTIC: 'Agentic',
      EMBEDDING: 'Embedding'
    };
    return names[category] || category;
  },

  /**
   * Get type display name
   */
  getTypeDisplayName(type: LLMModelType): string {
    const names: Record<LLMModelType, string> = {
      TEXT: 'Text',
      MULTIMODAL: 'Multimodal',
      REASONING: 'Reasoning',
      SPEECH: 'Speech',
      EMBEDDING: 'Embedding'
    };
    return names[type] || type;
  },

  /**
   * Get category badge color class
   */
  getCategoryBadgeClass(category: LLMModelCategory): string {
    const classes: Record<LLMModelCategory, string> = {
      CHAT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      CODING: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      REASONING: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      VISION: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      SPEECH: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      TRANSLATION: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      AGENTIC: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      EMBEDDING: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200'
    };
    return classes[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  },

  /**
   * Get type badge color class
   */
  getTypeBadgeClass(type: LLMModelType): string {
    const classes: Record<LLMModelType, string> = {
      TEXT: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
      MULTIMODAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      REASONING: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
      SPEECH: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
      EMBEDDING: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
    };
    return classes[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  },

  /**
   * Format context window for display
   */
  formatContextWindow(tokens: number): string {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(0)}K`;
    }
    return String(tokens);
  }
};

export type LLMCatalogService = typeof llmCatalogService;
