import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService } from '../../../../services/chatService';
import type {
  Conversation,
  CreateConversationPayload,
  UpdateConversationPayload,
  ListConversationsQuery,
} from '../../../../types/chat';

/**
 * Query keys for conversation-related queries
 */
export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  list: (filters?: ListConversationsQuery) => [...conversationKeys.lists(), filters] as const,
  details: () => [...conversationKeys.all, 'detail'] as const,
  detail: (id: string) => [...conversationKeys.details(), id] as const,
};

/**
 * Hook to list conversations with filters
 */
export function useConversationListQuery(query?: ListConversationsQuery) {
  return useQuery({
    queryKey: conversationKeys.list(query),
    queryFn: () => chatService.listConversations(query),
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to get a specific conversation by ID
 */
export function useConversationQuery(conversationId: string | null) {
  return useQuery({
    queryKey: conversationKeys.detail(conversationId || ''),
    queryFn: () => chatService.getConversation(conversationId!),
    enabled: !!conversationId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Hook for conversation mutations (create, update, delete)
 */
export function useConversationMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: CreateConversationPayload) =>
      chatService.createConversation(payload),
    onSuccess: () => {
      // Invalidate conversations list
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });

  const createWithCharacterMutation = useMutation({
    mutationFn: ({ characterId, title }: { characterId: string; title?: string }) =>
      chatService.createConversationWithCharacter(characterId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      conversationId,
      payload,
    }: {
      conversationId: string;
      payload: UpdateConversationPayload;
    }) => chatService.updateConversation(conversationId, payload),
    onSuccess: (data) => {
      // Update conversation detail cache
      queryClient.setQueryData(conversationKeys.detail(data.id), data);
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });

  const updateTitleMutation = useMutation({
    mutationFn: ({ conversationId, title }: { conversationId: string; title: string }) =>
      chatService.updateConversationTitle(conversationId, title),
    onSuccess: (data) => {
      queryClient.setQueryData(conversationKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (conversationId: string) =>
      chatService.deleteConversation(conversationId),
    onSuccess: (_, conversationId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: conversationKeys.detail(conversationId) });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });

  return {
    create: createMutation,
    createWithCharacter: createWithCharacterMutation,
    update: updateMutation,
    updateTitle: updateTitleMutation,
    delete: deleteMutation,
  };
}

/**
 * Hook for participant mutations (add, remove)
 */
export function useParticipantMutations(conversationId: string) {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: (characterId: string) =>
      chatService.addCharacterParticipant(conversationId, characterId),
    onSuccess: () => {
      // Invalidate conversation detail to refetch participants
      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversationId) });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (participantId: string) =>
      chatService.removeParticipant(conversationId, participantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversationId) });
    },
  });

  return {
    add: addMutation,
    remove: removeMutation,
  };
}
