import { useQuery } from '@tanstack/react-query';
import { chatService } from '../../../../services/chatService';

interface BackgroundData {
  type: string;
  value: string | null;
}

export function useConversationBackground(conversationId: string | undefined) {
  return useQuery<BackgroundData>({
    queryKey: ['conversation', conversationId, 'background'],
    queryFn: async () => {
      if (!conversationId) throw new Error('Conversation ID is required');
      const result = await chatService.getConversationBackground(conversationId);
      console.log('[useConversationBackground] Result:', result);
      return result;
    },
    enabled: !!conversationId,
    staleTime: 5 * 60 * 1000, // 5 minutes - background doesn't change often
    retry: 1,
  });
}
