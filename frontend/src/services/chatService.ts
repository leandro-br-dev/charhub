import api from '../lib/api';
import type {
  Conversation,
  Message,
  CreateConversationPayload,
  UpdateConversationPayload,
  AddParticipantPayload,
  SendMessagePayload,
  GenerateAIResponsePayload,
  ListConversationsQuery,
  ListMessagesQuery,
} from '../types/chat';

const API_PREFIX = import.meta.env.VITE_API_VERSION || '/api/v1';
const BASE_PATH = `${API_PREFIX}/conversations`;

interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
}

function unwrapResponse<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new Error(response.message || 'Request failed');
  }
  return response.data;
}

function unwrapListResponse<T>(response: ApiResponse<T[]>): { items: T[]; total: number } {
  if (!response.success) {
    throw new Error(response.message || 'Request failed');
  }
  return {
    items: response.data || [],
    total: response.count ?? response.data?.length ?? 0,
  };
}

export const chatService = {
  async createConversation(payload: CreateConversationPayload): Promise<Conversation> {
    const { data } = await api.post<ApiResponse<Conversation>>(BASE_PATH, payload);
    return unwrapResponse(data);
  },

  async createConversationWithCharacter(characterId: string, title?: string): Promise<Conversation> {
    const basePayload: CreateConversationPayload = {
      title: title || 'New Conversation',
      participantIds: [characterId],
    };
    return this.createConversation(basePayload);
  },

  async listConversations(query?: ListConversationsQuery): Promise<{ items: Conversation[]; total: number }> {
    const { data } = await api.get<ApiResponse<Conversation[]>>(BASE_PATH, {
      params: query,
    });
    return unwrapListResponse(data);
  },

  async getConversation(conversationId: string): Promise<Conversation> {
    const { data } = await api.get<ApiResponse<Conversation>>(`${BASE_PATH}/${conversationId}`);
    return unwrapResponse(data);
  },

  async updateConversation(
    conversationId: string,
    payload: UpdateConversationPayload
  ): Promise<Conversation> {
    const { data } = await api.patch<ApiResponse<Conversation>>(
      `${BASE_PATH}/${conversationId}`,
      payload
    );
    return unwrapResponse(data);
  },

  async updateConversationTitle(conversationId: string, title: string): Promise<Conversation> {
    return this.updateConversation(conversationId, { title, isTitleUserEdited: true });
  },

  async deleteConversation(conversationId: string): Promise<void> {
    // Endpoint not implemented in backend yet; throw for now to surface intent.
    throw new Error('Conversation deletion is not supported yet.');
  },

  async addParticipant(conversationId: string, payload: AddParticipantPayload): Promise<void> {
    await api.post<ApiResponse<unknown>>(
      `${BASE_PATH}/${conversationId}/participants`,
      payload
    );
  },

  async addCharacterParticipant(conversationId: string, characterId: string): Promise<void> {
    await this.addParticipant(conversationId, { actingCharacterId: characterId });
  },

  async removeParticipant(conversationId: string, participantId: string): Promise<void> {
    await api.delete<ApiResponse<unknown>>(
      `${BASE_PATH}/${conversationId}/participants/${participantId}`
    );
  },

  async getMessages(query: ListMessagesQuery): Promise<{ items: Message[]; total: number }> {
    const { conversationId, ...params } = query;
    const { data } = await api.get<ApiResponse<Message[]>>(
      `${BASE_PATH}/${conversationId}/messages`,
      { params }
    );
    return unwrapListResponse(data);
  },

  async sendMessage(payload: SendMessagePayload): Promise<Message> {
    const { conversationId, ...messageData } = payload;
    const { data } = await api.post<ApiResponse<Message>>(
      `${BASE_PATH}/${conversationId}/messages`,
      messageData
    );
    return unwrapResponse(data);
  },

  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    await api.delete<ApiResponse<unknown>>(
      `${BASE_PATH}/${conversationId}/messages/${messageId}`
    );
  },

  async generateAIResponse(
    conversationId: string,
    payload: GenerateAIResponsePayload
  ): Promise<Message> {
    const { data } = await api.post<ApiResponse<Message>>(
      `${BASE_PATH}/${conversationId}/generate`,
      payload
    );
    return unwrapResponse(data);
  },

  async updateConversationSettings(
    conversationId: string,
    settingsData: Record<string, unknown>
  ): Promise<Conversation> {
    return this.updateConversation(conversationId, { settings: settingsData });
  },

  async getConversationGallery(conversationId: string): Promise<string[]> {
    // Gallery endpoints are not implemented yet; return empty list to avoid UI errors.
    console.warn('[chatService] Conversation gallery is not yet supported.');
    return [];
  },
};

export type ChatService = typeof chatService;
