import api from '../../../lib/api';

export interface PublicConversation {
  id: string;
  title: string;
  lastMessageAt: string | null;
  createdAt: string;
  isMultiUser: boolean;
  maxUsers: number;
  owner: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  participants: Array<{
    id: string;
    userId: string | null;
    actingCharacterId: string | null;
    actingAssistantId: string | null;
    representingCharacterId: string | null;
    user: {
      id: string;
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
    actingCharacter: {
      id: string;
      name: string;
      displayName: string;
      avatarUrl: string | null;
      gender: string | null;
      contentTags: string[] | null;
    } | null;
    actingAssistant: {
      id: string;
      displayName: string;
    } | null;
    representingCharacter: {
      id: string;
      name: string;
      displayName: string;
      avatarUrl: string | null;
      gender: string | null;
      contentTags: string[] | null;
    } | null;
  }>;
  latestMessages: Array<{
    id: string;
    senderId: string;
    senderType: string;
    content: string;
    timestamp: string;
  }>;
  memberCount: number;
  onlineCount: number;
}

export interface DiscoverConversationsParams {
  search?: string;
  gender?: string;
  tags?: string; // comma-separated
  sortBy?: 'popular' | 'recent' | 'newest';
  skip?: number;
  limit?: number;
}

export interface DiscoverConversationsResponse {
  success: boolean;
  data: PublicConversation[];
  count: number;
}

/**
 * Discover public conversations
 * No authentication required
 */
export async function discoverPublicConversations(
  params: DiscoverConversationsParams = {}
): Promise<DiscoverConversationsResponse> {
  const queryParams = new URLSearchParams();

  if (params.search) queryParams.append('search', params.search);
  if (params.gender) queryParams.append('gender', params.gender);
  if (params.tags) queryParams.append('tags', params.tags);
  if (params.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());

  const response = await api.get<DiscoverConversationsResponse>(
    `/conversations/public?${queryParams.toString()}`
  );

  return response.data;
}

export const discoverService = {
  discoverPublicConversations,
};
