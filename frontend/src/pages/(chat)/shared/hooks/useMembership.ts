// frontend/src/pages/(chat)/shared/hooks/useMembership.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../../lib/api';

// Types
export interface Member {
  id: string;
  conversationId: string;
  userId: string;
  role: 'OWNER' | 'MODERATOR' | 'MEMBER' | 'VIEWER';
  canWrite: boolean;
  canInvite: boolean;
  canModerate: boolean;
  isActive: boolean;
  joinedAt: string;
  invitedBy?: string;
  user: {
    id: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    preferredLanguage?: string;
  };
}

export interface InviteUserPayload {
  userId: string;
}

export interface UpdatePermissionsPayload {
  role?: 'OWNER' | 'MODERATOR' | 'MEMBER' | 'VIEWER';
  canWrite?: boolean;
  canInvite?: boolean;
  canModerate?: boolean;
}

// Query keys
export const membershipKeys = {
  all: ['memberships'] as const,
  list: (conversationId: string) => [...membershipKeys.all, 'list', conversationId] as const,
};

// Hooks

/**
 * Get active members of a conversation
 */
export function useMembersQuery(conversationId: string | undefined) {
  return useQuery({
    queryKey: membershipKeys.list(conversationId || ''),
    queryFn: async () => {
      if (!conversationId) return { items: [] };
      const response = await api.get<{ success: boolean; data: Member[] }>(
        `/api/v1/conversations/${conversationId}/members`
      );
      return { items: response.data.data };
    },
    enabled: !!conversationId,
    staleTime: 30_000,
  });
}

/**
 * Membership mutations
 */
export function useMembershipMutations(conversationId: string | undefined) {
  const queryClient = useQueryClient();

  const invalidateMembers = () => {
    if (conversationId) {
      queryClient.invalidateQueries({ queryKey: membershipKeys.list(conversationId) });
    }
  };

  // Invite user
  const inviteUser = useMutation({
    mutationFn: async (payload: InviteUserPayload) => {
      if (!conversationId) throw new Error('Conversation ID required');
      const response = await api.post(
        `/api/v1/conversations/${conversationId}/members/invite`,
        payload
      );
      return response.data;
    },
    onSuccess: invalidateMembers,
  });

  // Leave conversation
  const leaveConversation = useMutation({
    mutationFn: async () => {
      if (!conversationId) throw new Error('Conversation ID required');
      const response = await api.post(
        `/api/v1/conversations/${conversationId}/members/leave`
      );
      return response.data;
    },
    onSuccess: invalidateMembers,
  });

  // Kick user
  const kickUser = useMutation({
    mutationFn: async (userId: string) => {
      if (!conversationId) throw new Error('Conversation ID required');
      const response = await api.post(
        `/api/v1/conversations/${conversationId}/members/kick`,
        { userId }
      );
      return response.data;
    },
    onSuccess: invalidateMembers,
  });

  // Update permissions
  const updatePermissions = useMutation({
    mutationFn: async ({
      userId,
      permissions
    }: {
      userId: string;
      permissions: UpdatePermissionsPayload;
    }) => {
      if (!conversationId) throw new Error('Conversation ID required');
      const response = await api.patch(
        `/api/v1/conversations/${conversationId}/members/${userId}`,
        permissions
      );
      return response.data;
    },
    onSuccess: invalidateMembers,
  });

  // Transfer ownership
  const transferOwnership = useMutation({
    mutationFn: async (newOwnerId: string) => {
      if (!conversationId) throw new Error('Conversation ID required');
      const response = await api.post(
        `/api/v1/conversations/${conversationId}/members/transfer-ownership`,
        { userId: newOwnerId }
      );
      return response.data;
    },
    onSuccess: invalidateMembers,
  });

  return {
    inviteUser,
    leaveConversation,
    kickUser,
    updatePermissions,
    transferOwnership,
  };
}
