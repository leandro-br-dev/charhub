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

/**
 * Chat Service
 * API client for chat/conversation operations
 * Based on backend routes (Phase 2.2) and old project structure
 */
export const chatService = {
  /**
   * Create a new conversation with participants
   */
  async createConversation(payload: CreateConversationPayload): Promise<Conversation> {
    const response = await api.post<ApiResponse<Conversation>>(BASE_PATH, payload);
    return response.data.data;
  },

  /**
   * Create conversation with a single character (convenience method)
   */
  async createConversationWithCharacter(characterId: string, title?: string): Promise<Conversation> {
    return this.createConversation({
      title: title || 'New Conversation',
      participantIds: [characterId],
    });
  },

  /**
   * Get conversation by ID with messages
   */
  async getConversation(conversationId: string): Promise<Conversation> {
    const response = await api.get<ApiResponse<Conversation>>(`${BASE_PATH}/${conversationId}`);
    return response.data.data;
  },

  /**
   * List conversations with filters and pagination
   */
  async listConversations(query?: ListConversationsQuery): Promise<{ items: Conversation[]; total: number }> {
    const response = await api.get<ApiResponse<Conversation[]>>(BASE_PATH, { params: query });
    return {
      items: response.data.data || [],
      total: response.data.count || 0,
    };
  },

  /**
   * Update conversation (title, settings)
   */
  async updateConversation(conversationId: string, payload: UpdateConversationPayload): Promise<Conversation> {
    const response = await api.patch<ApiResponse<Conversation>>(`${BASE_PATH}/${conversationId}`, payload);
    return response.data.data;
  },

  /**
   * Update conversation title
   */
  async updateConversationTitle(conversationId: string, title: string): Promise<Conversation> {
    return this.updateConversation(conversationId, { title, isTitleUserEdited: true });
  },

  /**
   * Delete conversation (not implemented in backend yet - placeholder)
   */
  async deleteConversation(conversationId: string): Promise<void> {
    // TODO: Implement when backend supports deletion
    await api.delete(`${BASE_PATH}/${conversationId}`);
  },

  /**
   * Add participant to conversation
   */
  async addParticipant(conversationId: string, payload: AddParticipantPayload): Promise<any> {
    const response = await api.post<ApiResponse<any>>(
      `${BASE_PATH}/${conversationId}/participants`,
      payload
    );
    return response.data.data;
  },

  /**
   * Add character as participant (convenience method)
   */
  async addCharacterParticipant(conversationId: string, characterId: string): Promise<any> {
    return this.addParticipant(conversationId, {
      actingCharacterId: characterId,
    });
  },

  /**
   * Remove participant from conversation
   */
  async removeParticipant(conversationId: string, participantId: string): Promise<void> {
    await api.delete(`${BASE_PATH}/${conversationId}/participants/${participantId}`);
  },

  /**
   * Send user message to conversation
   */
  async sendMessage(payload: SendMessagePayload): Promise<Message> {
    const { conversationId, ...messageData } = payload;
    const response = await api.post<ApiResponse<Message>>(
      `${BASE_PATH}/${conversationId}/messages`,
      messageData
    );
    return response.data.data;
  },

  /**
   * Get messages from conversation with pagination
   */
  async getMessages(query: ListMessagesQuery): Promise<{ items: Message[]; total: number }> {
    const { conversationId, ...params } = query;
    const response = await api.get<ApiResponse<Message[]>>(
      `${BASE_PATH}/${conversationId}/messages`,
      { params }
    );
    return {
      items: response.data.data || [],
      total: response.data.count || 0,
    };
  },

  /**
   * Delete message (not fully implemented in backend - placeholder)
   */
  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    // TODO: Backend needs a dedicated message delete endpoint
    // For now, would need to use generic delete
    await api.delete(`${BASE_PATH}/${conversationId}/messages/${messageId}`);
  },

  /**
   * Generate AI response from assistant
   */
  async generateAIResponse(conversationId: string, payload: GenerateAIResponsePayload): Promise<Message> {
    const response = await api.post<ApiResponse<Message>>(
      `${BASE_PATH}/${conversationId}/generate`,
      payload
    );
    return response.data.data;
  },

  /**
   * Generate AI response for a participant (convenience method)
   */
  async generateResponseForParticipant(conversationId: string, participantId: string): Promise<Message> {
    return this.generateAIResponse(conversationId, { participantId });
  },
};

export type ChatService = typeof chatService;
