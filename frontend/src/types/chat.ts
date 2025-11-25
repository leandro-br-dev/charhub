/**
 * Chat Types
 * Based on backend Prisma schemas and old project structure
 */

// Sender types for messages
export enum SenderType {
  USER = 'USER',
  CHARACTER = 'CHARACTER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
}

// Base participant information
export interface ParticipantCharacter {
  id: string;
  firstName: string;
  lastName: string | null;
  avatar: string | null;
  gender: string | null;
}

export interface ParticipantAssistant {
  id: string;
  name: string;
  description: string | null;
  avatar: string | null;
}

export interface ParticipantUser {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
}

// Conversation participant
export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string | null;
  actingCharacterId: string | null;
  actingAssistantId: string | null;
  representingCharacterId: string | null;
  configOverride: string | null;
  joinedAt: string;

  // Relations
  user?: ParticipantUser | null;
  actingCharacter?: ParticipantCharacter | null;
  actingAssistant?: ParticipantAssistant | null;
  representingCharacter?: ParticipantCharacter | null;
}

// Message
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: SenderType;
  content: string;
  attachments: string | null;
  metadata: Record<string, unknown> | null;
  timestamp: string;
}

// Conversation
export interface Conversation {
  id: string;
  title: string;
  isTitleUserEdited: boolean;
  isTitleSystemEdited: boolean;
  projectId: string | null;
  settings: Record<string, unknown> | null;
  lastMessageAt: string | null;
  titleLastUpdatedAt: string | null;
  memoryLastUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;

  // Relations
  owner?: ParticipantUser;
  participants?: ConversationParticipant[];
  messages?: Message[];
}

// API Payloads
export interface CreateConversationPayload {
  title?: string;
  participantIds: string[]; // Character IDs
  settings?: Record<string, unknown>;
  projectId?: string;
  visibility?: 'PRIVATE' | 'UNLISTED' | 'PUBLIC';

  // Multi-user settings
  isMultiUser?: boolean;
  maxUsers?: number; // 1-4
  allowUserInvites?: boolean;
  requireApproval?: boolean;
}

export interface UpdateConversationPayload {
  title?: string;
  settings?: Record<string, unknown>;
  isTitleUserEdited?: boolean;
}

export interface AddParticipantPayload {
  userId?: string;
  actingCharacterId?: string;
  actingAssistantId?: string;
  representingCharacterId?: string;
  configOverride?: string;
}

export interface SendMessagePayload {
  conversationId: string;
  content: string;
  attachments?: string[];
  metadata?: Record<string, unknown>;
}

export interface GenerateAIResponsePayload {
  participantId: string;
}

// Query parameters
export interface ListConversationsQuery {
  search?: string;
  projectId?: string;
  skip?: number;
  limit?: number;
  sortBy?: 'lastMessageAt' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ListMessagesQuery {
  conversationId: string;
  skip?: number;
  limit?: number;
  before?: string; // ISO timestamp
  after?: string; // ISO timestamp
}

// UI-specific types
export interface ConversationListItem {
  id: string;
  title: string;
  lastMessage: Message | null;
  lastMessageAt: string | null;
  participants?: ConversationParticipant[];
  unreadCount?: number;
}

export interface ChatViewState {
  conversationId: string | null;
  isLoading: boolean;
  error: string | null;
  isTyping: boolean;
  typingUsers: string[];
}

// WebSocket event types (for Phase 2.4)
export interface WebSocketMessage {
  type: 'message' | 'typing_start' | 'typing_stop' | 'ai_response_start' | 'ai_response_chunk' | 'ai_response_end';
  conversationId: string;
  data: unknown;
}
