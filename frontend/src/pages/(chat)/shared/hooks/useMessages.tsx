import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { chatService } from '../../../../services/chatService';
import type {
  Message,
  SendMessagePayload,
  GenerateAIResponsePayload,
  ListMessagesQuery,
} from '../../../../types/chat';
import { conversationKeys } from './useConversations';

/**
 * Query keys for message-related queries
 */
export const messageKeys = {
  all: ['messages'] as const,
  lists: () => [...messageKeys.all, 'list'] as const,
  list: (conversationId: string, query?: Omit<ListMessagesQuery, 'conversationId'>) =>
    [...messageKeys.lists(), conversationId, query] as const,
};

/**
 * Hook to get messages for a conversation with pagination
 */
export function useMessagesQuery(conversationId: string | null, query?: Omit<ListMessagesQuery, 'conversationId'>) {
  return useQuery({
    queryKey: messageKeys.list(conversationId || '', query),
    queryFn: () =>
      chatService.getMessages({
        conversationId: conversationId!,
        ...query,
      }),
    enabled: !!conversationId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Hook for infinite scroll messages (load more older messages)
 */
export function useInfiniteMessagesQuery(conversationId: string | null, limit: number = 50) {
  return useInfiniteQuery({
    queryKey: messageKeys.list(conversationId || '', { limit }),
    queryFn: ({ pageParam }) =>
      chatService.getMessages({
        conversationId: conversationId!,
        limit,
        before: pageParam,
      }),
    enabled: !!conversationId,
    getNextPageParam: (lastPage) => {
      // If we have messages, use the oldest message timestamp as cursor
      if (lastPage.items.length > 0) {
        return lastPage.items[0].timestamp;
      }
      return undefined;
    },
    initialPageParam: undefined as string | undefined,
    staleTime: 1000 * 30,
  });
}

/**
 * Hook for message mutations (send, delete)
 */
export function useMessageMutations(conversationId: string) {
  const queryClient = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: (payload: Omit<SendMessagePayload, 'conversationId'>) =>
      chatService.sendMessage({
        conversationId,
        ...payload,
      }),
    onSuccess: (newMessage) => {
      // Optimistically add message to cache
      queryClient.setQueryData<{ items: Message[]; total: number }>(
        messageKeys.list(conversationId),
        (old) => {
          if (!old) return { items: [newMessage], total: 1 };
          return {
            items: [...old.items, newMessage],
            total: old.total + 1,
          };
        }
      );

      // Invalidate conversation to update lastMessageAt
      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversationId) });
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (messageId: string) =>
      chatService.deleteMessage(conversationId, messageId),
    onSuccess: () => {
      // Invalidate messages list
      queryClient.invalidateQueries({ queryKey: messageKeys.list(conversationId) });
      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversationId) });
    },
  });

  const generateAIMutation = useMutation({
    mutationFn: (payload: GenerateAIResponsePayload) =>
      chatService.generateAIResponse(conversationId, payload),
    onSuccess: (aiMessage) => {
      // Add AI message to cache
      queryClient.setQueryData<{ items: Message[]; total: number }>(
        messageKeys.list(conversationId),
        (old) => {
          if (!old) return { items: [aiMessage], total: 1 };
          return {
            items: [...old.items, aiMessage],
            total: old.total + 1,
          };
        }
      );

      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversationId) });
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });

  return {
    send: sendMutation,
    delete: deleteMutation,
    generateAI: generateAIMutation,
  };
}
