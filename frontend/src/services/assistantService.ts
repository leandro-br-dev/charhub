import api from '../lib/api';

const API_PREFIX = import.meta.env.VITE_API_VERSION || '/api/v1';
const BASE_PATH = `${API_PREFIX}/assistants`;

export interface Assistant {
  id: string;
  name: string;
  description?: string | null;
  instructions: string;
  defaultCharacterId?: string | null;
  isPublic: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
  defaultCharacter?: {
    id: string;
    firstName: string;
    lastName: string | null;
    avatar: string | null;
  } | null;
}

export interface AssistantForConversation {
  id: string;
  name: string;
  description?: string | null;
  instructions: string;
  defaultCharacterId?: string | null;
  defaultCharacter?: {
    id: string;
    avatar: string | null;
    firstName: string;
    lastName: string | null;
  } | null;
}

export const assistantService = {
  async getMyAssistants(params?: { search?: string }): Promise<{ success: boolean; data: AssistantForConversation[] }> {
    try {
      const response = await api.get<{ success: boolean; data: AssistantForConversation[] }>(BASE_PATH, {
        params: {
          ...params,
          forConversation: 'my'
        }
      });
      return response.data;
    } catch (error) {
      console.error('[assistantService] getMyAssistants failed:', error);
      return { success: false, data: [] };
    }
  },

  async getPublicAssistants(params?: { search?: string }): Promise<{ success: boolean; data: AssistantForConversation[] }> {
    try {
      const response = await api.get<{ success: boolean; data: AssistantForConversation[] }>(BASE_PATH, {
        params: {
          ...params,
          forConversation: 'public'
        }
      });
      return response.data;
    } catch (error) {
      console.error('[assistantService] getPublicAssistants failed:', error);
      return { success: false, data: [] };
    }
  },

  async getById(assistantId: string): Promise<Assistant> {
    const response = await api.get<{ success: boolean; data: Assistant }>(`${BASE_PATH}/${assistantId}`);
    return response.data.data;
  },

  async create(payload: {
    name: string;
    description?: string;
    instructions: string;
    defaultCharacterId?: string;
    isPublic?: boolean;
  }): Promise<{ success: boolean; data?: Assistant; message?: string }> {
    try {
      const response = await api.post<{ success: boolean; data: Assistant }>(BASE_PATH, payload);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('[assistantService] create failed:', error);
      return { success: false, message: 'Failed to create assistant' };
    }
  },

  async update(assistantId: string, payload: {
    name?: string;
    description?: string | null;
    instructions?: string;
    defaultCharacterId?: string | null;
    isPublic?: boolean;
  }): Promise<{ success: boolean; data?: Assistant; message?: string }> {
    try {
      const response = await api.put<{ success: boolean; data: Assistant }>(`${BASE_PATH}/${assistantId}`, payload);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('[assistantService] update failed:', error);
      return { success: false, message: 'Failed to update assistant' };
    }
  },

  async remove(assistantId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await api.delete<{ success: boolean; message: string }>(`${BASE_PATH}/${assistantId}`);
      return { success: response.data.success, message: response.data.message };
    } catch (error) {
      console.error('[assistantService] remove failed:', error);
      return { success: false, message: 'Failed to delete assistant' };
    }
  }
};

export type AssistantService = typeof assistantService;
