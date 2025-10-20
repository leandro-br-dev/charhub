import { useCallback, useEffect, useMemo, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { resolveApiBaseUrl } from '../lib/resolveApiBaseUrl';
import { useAuth } from './useAuth';
import type { Message } from '../types/chat';
import { messageKeys } from '../pages/(chat)/shared/hooks/useMessages';
import { conversationKeys } from '../pages/(chat)/shared/hooks/useConversations';

interface UseChatSocketOptions {
  conversationId?: string | null;
  autoJoin?: boolean;
  currentUserId?: string | null;
}

interface SendMessageOptions {
  conversationId: string;
  content: string;
  attachments?: string[] | null;
  metadata?: Record<string, unknown> | null;
  assistantParticipantId?: string;
}

interface SendMessageResult {
  message: Message;
  respondingBots: string[];
}

interface ChatSocketState {
  isConnected: boolean;
  socketId: string | null;
  connectionError: string | null;
  typingParticipants: Set<string>;
  sendMessage: (payload: SendMessageOptions) => Promise<SendMessageResult>;
  emitTypingStart: (conversationId: string, participantId?: string) => void;
  emitTypingStop: (conversationId: string, participantId?: string) => void;
}

let socketInstance: Socket | null = null;

function getSocket(token: string): Socket {
  const baseUrl = resolveApiBaseUrl() ?? (typeof window !== 'undefined' ? window.location.origin : '');
  if (!socketInstance) {
    socketInstance = io(baseUrl, {
      path: '/api/v1/ws',
      withCredentials: true,
      transports: ['websocket'],
      autoConnect: false,
      auth: { token },
    });
  } else {
    socketInstance.auth = { token };
  }

  if (!socketInstance.connected) {
    socketInstance.connect();
  }

  return socketInstance;
}

function appendMessageToCache(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
  message: Message
) {
  queryClient.setQueryData<{ items: Message[]; total: number }>(
    messageKeys.list(conversationId),
    (current) => {
      if (!current) {
        return { items: [message], total: 1 };
      }

      const alreadyExists = current.items.some((item) => item.id === message.id);
      if (alreadyExists) {
        return current;
      }

      return {
        items: [...current.items, message],
        total: current.total + 1,
      };
    }
  );

  queryClient.setQueryData(
    conversationKeys.detail(conversationId),
    (current: any) => {
      if (!current) return current;

      const hasMessage = Array.isArray(current.messages)
        ? current.messages.some((item: Message) => item.id === message.id)
        : false;

      const updatedMessages = hasMessage
        ? current.messages
        : [...(current.messages || []), message];

      return {
        ...current,
        messages: updatedMessages,
        lastMessageAt: message.timestamp,
      };
    }
  );

  queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
}

export function useChatSocket(options: UseChatSocketOptions = {}): ChatSocketState {
  const { conversationId = null, autoJoin = true, currentUserId = null } = options;
  const { user } = useAuth();
  const token = user?.token;
  const queryClient = useQueryClient();

  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [typingParticipants, setTypingParticipants] = useState<Set<string>>(new Set());

  // Debug logging for token availability
  useEffect(() => {
    console.log('[useChatSocket] Auth state:', {
      hasUser: !!user,
      userId: user?.id,
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'null'
    });
  }, [user, token]);

  const socket = useMemo(() => {
    if (!token) {
      console.log('[useChatSocket] Cannot create socket - no token available');
      return null;
    }
    console.log('[useChatSocket] Creating socket instance with token');
    return getSocket(token);
  }, [token]);

  useEffect(() => {
    if (!socket) {
      console.log('[useChatSocket] No socket instance');
      return;
    }

    console.log('[useChatSocket] Setting up socket event handlers', {
      connected: socket.connected,
      id: socket.id
    });

    const handleConnect = () => {
      console.log('[useChatSocket] ✅ Connected to WebSocket', { socketId: socket.id });
      setIsConnected(true);
      setConnectionError(null);
      setSocketId(socket.id ?? null);
    };

    const handleDisconnect = () => {
      console.log('[useChatSocket] ❌ Disconnected from WebSocket');
      setIsConnected(false);
      setSocketId(null);
    };

    const handleConnectError = (error: Error) => {
      console.error('[useChatSocket] ⚠️ Connection error:', error);
      setConnectionError(error.message);
    };

    const handleConnectionEstablished = (payload: { socketId?: string }) => {
      console.log('[useChatSocket] 🎉 Connection established', payload);
      if (payload?.socketId) {
        setSocketId(payload.socketId);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('connection_established', handleConnectionEstablished);

    if (!socket.connected) {
      console.log('[useChatSocket] Connecting to WebSocket...');
      socket.connect();
    } else {
      console.log('[useChatSocket] Socket already connected');
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('connection_established', handleConnectionEstablished);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !conversationId || !autoJoin) {
      return;
    }

    let joined = true;

    socket.emit('join_conversation', { conversationId }, (response?: { success?: boolean; error?: string }) => {
      if (response && response.success === false) {
        setConnectionError(response.error || 'Unable to join conversation');
      }
    });

    return () => {
      if (joined && socket.connected) {
        socket.emit('leave_conversation', { conversationId });
      }
      setTypingParticipants(new Set());
      joined = false;
    };
  }, [socket, conversationId, autoJoin]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleMessageReceived = (message: Message) => {
      if (!message || !message.conversationId) {
        return;
      }

      appendMessageToCache(queryClient, message.conversationId, message);

      if (message.conversationId === conversationId) {
        setTypingParticipants((prev) => {
          if (prev.size === 0) {
            return prev;
          }
          return new Set();
        });
      }
    };

    const handleTypingStart = (payload: { conversationId: string; userId?: string; participantId?: string; source?: string }) => {
      if (!conversationId || payload.conversationId !== conversationId) {
        return;
      }

      if (payload.userId && currentUserId && payload.userId === currentUserId) {
        return;
      }

      const id = payload.participantId || payload.userId;
      if (!id) {
        return;
      }

      setTypingParticipants((prev) => {
        if (prev.has(id)) {
          return prev;
        }
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    };

    const handleTypingStop = (payload: { conversationId: string; userId?: string; participantId?: string }) => {
      if (!conversationId || payload.conversationId !== conversationId) {
        return;
      }

      const id = payload.participantId || payload.userId;
      if (!id) {
        return;
      }

      setTypingParticipants((prev) => {
        if (!prev.has(id)) {
          return prev;
        }
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    };

    const handleAssistantError = (payload: { conversationId: string; error?: string }) => {
      if (payload.conversationId === conversationId && payload.error) {
        setConnectionError(payload.error);
      }
    };

    socket.on('message_received', handleMessageReceived);
    socket.on('typing_start', handleTypingStart);
    socket.on('typing_stop', handleTypingStop);
    socket.on('ai_response_error', handleAssistantError);

    return () => {
      socket.off('message_received', handleMessageReceived);
      socket.off('typing_start', handleTypingStart);
      socket.off('typing_stop', handleTypingStop);
      socket.off('ai_response_error', handleAssistantError);
    };
  }, [socket, queryClient, conversationId, currentUserId]);

  const emitTypingStart = useCallback(
    (targetConversationId: string, participantId?: string) => {
      if (!socket) return;
      socket.emit('typing_start', {
        conversationId: targetConversationId,
        participantId,
      });
    },
    [socket]
  );

  const emitTypingStop = useCallback(
    (targetConversationId: string, participantId?: string) => {
      if (!socket) return;
      socket.emit('typing_stop', {
        conversationId: targetConversationId,
        participantId,
      });
    },
    [socket]
  );

  const sendMessage = useCallback(
    (payload: SendMessageOptions) =>
      new Promise<SendMessageResult>((resolve, reject) => {
        if (!socket) {
          reject(new Error('Socket is not connected'));
          return;
        }

        socket.emit('send_message', payload, (response?: { success?: boolean; data?: Message; respondingBots?: string[]; error?: string }) => {
          if (!response) {
            reject(new Error('No response from server'));
            return;
          }

          if (response.success && response.data) {
            resolve({
              message: response.data,
              respondingBots: response.respondingBots || [],
            });
          } else {
            reject(new Error(response.error || 'Failed to send message'));
          }
        });
      }),
    [socket]
  );

  return {
    isConnected,
    socketId,
    connectionError,
    typingParticipants,
    sendMessage,
    emitTypingStart,
    emitTypingStop,
  };
}
