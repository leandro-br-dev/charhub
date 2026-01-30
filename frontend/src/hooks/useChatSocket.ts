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

interface OnlineUser {
  id: string;
  displayName?: string;
  photo?: string;
}

interface ChatSocketState {
  isConnected: boolean;
  socketId: string | null;
  socket: Socket | null;  // Expose the socket instance for translation features
  connectionError: string | null;
  typingParticipants: Set<string>;
  onlineUsers: string[];
  isMemoryCompressing: boolean;
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
  // Get all query keys that match this conversation's messages
  const queryCache = queryClient.getQueryCache();
  const matchingQueries = queryCache.findAll({
    queryKey: messageKeys.lists(),
  });

  console.log('[useChatSocket] appendMessageToCache', {
    conversationId,
    messageId: message.id,
    matchingQueriesCount: matchingQueries.length,
    matchingQueryKeys: matchingQueries.map(q => q.queryKey),
  });

  // Update all matching query keys to handle different query parameter combinations
  matchingQueries.forEach((query) => {
    const queryKey = query.queryKey;

    // Check if this query is for the right conversation
    // Format: ['messages', 'list', conversationId, query?]
    if (queryKey.length >= 3 && queryKey[2] === conversationId) {
      queryClient.setQueryData<{ items: Message[]; total: number }>(
        queryKey,
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
    }
  });

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

  // Invalidate to trigger re-render
  queryClient.invalidateQueries({ queryKey: messageKeys.lists() });
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
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isMemoryCompressing, setIsMemoryCompressing] = useState(false);

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
      console.log('[useChatSocket] Socket already connected - setting connected state');
      // Socket is already connected, but the 'connect' event already fired
      // so we need to manually set the connected state
      setIsConnected(true);
      setSocketId(socket.id ?? null);
      setConnectionError(null);
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
      console.log('[useChatSocket] Skipping join_conversation', {
        hasSocket: !!socket,
        conversationId,
        autoJoin
      });
      return;
    }

    let joined = true;

    console.log('[useChatSocket] Emitting join_conversation', { conversationId });

    socket.emit('join_conversation', { conversationId }, (response?: { success?: boolean; error?: string; onlineUsers?: string[] }) => {
      console.log('[useChatSocket] join_conversation callback', {
        conversationId,
        response
      });

      if (response && response.success === false) {
        console.error('[useChatSocket] Failed to join conversation', response.error);
        setConnectionError(response.error || 'Unable to join conversation');
      } else {
        console.log('[useChatSocket] Successfully joined conversation room');
        // Set initial online users from join response
        if (response?.onlineUsers) {
          setOnlineUsers(response.onlineUsers);
        }
      }
    });

    return () => {
      if (joined && socket.connected) {
        console.log('[useChatSocket] Leaving conversation', { conversationId });
        socket.emit('leave_conversation', { conversationId });
      }
      setTypingParticipants(new Set());
      joined = false;
    };
  }, [socket, conversationId, autoJoin]);

  useEffect(() => {
    if (!socket) {
      console.log('[useChatSocket] Skipping message handlers - no socket');
      return;
    }

    console.log('[useChatSocket] Registering message handlers', {
      conversationId,
      currentUserId
    });

    const handleMessageReceived = (message: Message) => {
      console.log('[useChatSocket] message_received event received', {
        messageId: message?.id,
        conversationId: message?.conversationId,
        senderType: message?.senderType,
        contentPreview: message?.content?.substring(0, 50)
      });

      if (!message || !message.conversationId) {
        console.warn('[useChatSocket] Invalid message received - missing data', message);
        return;
      }

      console.log('[useChatSocket] Appending message to cache', {
        messageId: message.id,
        conversationId: message.conversationId
      });

      appendMessageToCache(queryClient, message.conversationId, message);

      if (message.conversationId === conversationId) {
        setTypingParticipants((prev) => {
          if (prev.size === 0) {
            return prev;
          }
          console.log('[useChatSocket] Clearing typing participants');
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

    // Multi-user presence handlers
    const handleUserJoined = (payload: { conversationId: string; userId: string; user?: OnlineUser }) => {
      if (!conversationId || payload.conversationId !== conversationId) return;
      console.log('[useChatSocket] User joined:', payload.userId);
      setOnlineUsers((prev) => {
        if (prev.includes(payload.userId)) return prev;
        return [...prev, payload.userId];
      });
    };

    const handleUserLeft = (payload: { conversationId: string; userId: string }) => {
      if (!conversationId || payload.conversationId !== conversationId) return;
      console.log('[useChatSocket] User left:', payload.userId);
      setOnlineUsers((prev) => prev.filter((id) => id !== payload.userId));
    };

    const handlePresenceUpdate = (payload: { conversationId: string; onlineUsers: string[] }) => {
      if (!conversationId || payload.conversationId !== conversationId) return;
      console.log('[useChatSocket] Presence update:', payload.onlineUsers);
      setOnlineUsers(payload.onlineUsers);
    };

    // Message deletion handler
    const handleMessageDeleted = (payload: { conversationId: string; messageId: string; deletedCount: number }) => {
      if (!payload || !payload.conversationId) {
        console.warn('[useChatSocket] Invalid message_deleted payload', payload);
        return;
      }

      console.log('[useChatSocket] message_deleted event received', {
        conversationId: payload.conversationId,
        messageId: payload.messageId,
        deletedCount: payload.deletedCount
      });

      // Remove deleted message(s) from all matching query caches
      const queryCache = queryClient.getQueryCache();
      const matchingQueries = queryCache.findAll({
        queryKey: messageKeys.lists(),
      });

      matchingQueries.forEach((query) => {
        const queryKey = query.queryKey;

        // Check if this query is for the right conversation
        // Format: ['messages', 'list', conversationId, query?]
        if (queryKey.length >= 3 && queryKey[2] === payload.conversationId) {
          queryClient.setQueryData<{ items: Message[]; total: number }>(
            queryKey,
            (current) => {
              if (!current) return current;

              // Filter out the deleted message(s)
              // For simplicity, we'll invalidate the query to refetch from server
              // since we don't know which messages were cascade deleted
              return current;
            }
          );
        }
      });

      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: messageKeys.list(payload.conversationId) });
      queryClient.invalidateQueries({ queryKey: messageKeys.lists() });
      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(payload.conversationId) });

      console.log('[useChatSocket] Message deletion handled, queries invalidated');
    };

    // Memory compression handlers
    const handleMemoryCompressionStarted = (payload: { conversationId: string }) => {
      if (!conversationId || payload.conversationId !== conversationId) return;
      console.log('[useChatSocket] Memory compression started');
      setIsMemoryCompressing(true);
    };

    const handleMemoryCompressionComplete = (payload: { conversationId: string }) => {
      if (!conversationId || payload.conversationId !== conversationId) return;
      console.log('[useChatSocket] Memory compression complete');
      setIsMemoryCompressing(false);
    };

    socket.on('message_received', handleMessageReceived);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('typing_start', handleTypingStart);
    socket.on('typing_stop', handleTypingStop);
    socket.on('ai_response_error', handleAssistantError);
    socket.on('user_joined', handleUserJoined);
    socket.on('user_left', handleUserLeft);
    socket.on('presence_update', handlePresenceUpdate);
    socket.on('memory_compression_started', handleMemoryCompressionStarted);
    socket.on('memory_compression_complete', handleMemoryCompressionComplete);

    return () => {
      socket.off('message_received', handleMessageReceived);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('typing_start', handleTypingStart);
      socket.off('typing_stop', handleTypingStop);
      socket.off('ai_response_error', handleAssistantError);
      socket.off('user_joined', handleUserJoined);
      socket.off('user_left', handleUserLeft);
      socket.off('presence_update', handlePresenceUpdate);
      socket.off('memory_compression_started', handleMemoryCompressionStarted);
      socket.off('memory_compression_complete', handleMemoryCompressionComplete);
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
        console.log('[useChatSocket] sendMessage called', {
          hasSocket: !!socket,
          socketId: socket?.id,
          connected: socket?.connected,
          payload
        });

        if (!socket) {
          console.error('[useChatSocket] sendMessage failed: socket is null');
          reject(new Error('Socket is not initialized'));
          return;
        }

        if (!socket.connected) {
          console.error('[useChatSocket] sendMessage failed: socket not connected', {
            socketId: socket.id,
            connected: socket.connected
          });
          reject(new Error('Socket is not connected'));
          return;
        }

        console.log('[useChatSocket] Emitting send_message event', {
          conversationId: payload.conversationId,
          contentLength: payload.content.length,
          socketId: socket.id
        });

        socket.emit('send_message', payload, (response?: { success?: boolean; data?: Message; respondingBots?: string[]; error?: string }) => {
          console.log('[useChatSocket] send_message callback received', {
            hasResponse: !!response,
            success: response?.success,
            hasData: !!response?.data,
            error: response?.error
          });

          if (!response) {
            console.error('[useChatSocket] sendMessage failed: no response from server');
            reject(new Error('No response from server'));
            return;
          }

          if (response.success && response.data) {
            console.log('[useChatSocket] sendMessage succeeded', {
              messageId: response.data.id,
              respondingBots: response.respondingBots
            });
            resolve({
              message: response.data,
              respondingBots: response.respondingBots || [],
            });
          } else {
            console.error('[useChatSocket] sendMessage failed', {
              error: response.error
            });
            reject(new Error(response.error || 'Failed to send message'));
          }
        });
      }),
    [socket]
  );

  return {
    isConnected,
    socketId,
    socket,  // Expose socket instance for translation features
    connectionError,
    typingParticipants,
    onlineUsers,
    isMemoryCompressing,
    sendMessage,
    emitTypingStart,
    emitTypingStop,
  };
}
