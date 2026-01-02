import { useCallback, useEffect, useMemo, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { resolveApiBaseUrl } from '../lib/resolveApiBaseUrl';
import { useAuth } from './useAuth';

export enum CharacterGenerationStep {
  UPLOADING_IMAGE = 'uploading_image',
  ANALYZING_IMAGE = 'analyzing_image',
  EXTRACTING_DESCRIPTION = 'extracting_description',
  GENERATING_DETAILS = 'generating_details',
  GENERATING_HISTORY = 'generating_history',
  CREATING_CHARACTER = 'creating_character',
  QUEUING_AVATAR = 'queuing_avatar',
  GENERATING_AVATAR = 'generating_avatar',
  QUEUING_MULTI_STAGE = 'queuing_multi_stage',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export interface CharacterGenerationProgress {
  step: CharacterGenerationStep;
  progress: number; // 0-100
  message: string;
  data?: any;
}

interface UseCharacterGenerationSocketOptions {
  sessionId: string | null;
  onProgress?: (progress: CharacterGenerationProgress) => void;
  onComplete?: (character: any) => void;
  onError?: (error: string) => void;
}

interface CharacterGenerationSocketState {
  isConnected: boolean;
  socketId: string | null;
  connectionError: string | null;
  currentProgress: CharacterGenerationProgress | null;
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

export function useCharacterGenerationSocket(
  options: UseCharacterGenerationSocketOptions
): CharacterGenerationSocketState {
  const { sessionId, onProgress, onComplete, onError } = options;
  const { user } = useAuth();
  const token = user?.token;

  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState<CharacterGenerationProgress | null>(null);

  const socket = useMemo(() => {
    if (!token) {
      console.log('[useCharacterGenerationSocket] Cannot create socket - no token available');
      return null;
    }
    console.log('[useCharacterGenerationSocket] Creating socket instance with token');
    return getSocket(token);
  }, [token]);

  // Connect to WebSocket
  useEffect(() => {
    if (!socket) {
      console.log('[useCharacterGenerationSocket] No socket instance');
      return;
    }

    console.log('[useCharacterGenerationSocket] Setting up socket event handlers');

    const handleConnect = () => {
      console.log('[useCharacterGenerationSocket] ✅ Connected to WebSocket', { socketId: socket.id });
      setIsConnected(true);
      setConnectionError(null);
      setSocketId(socket.id ?? null);
    };

    const handleDisconnect = () => {
      console.log('[useCharacterGenerationSocket] ❌ Disconnected from WebSocket');
      setIsConnected(false);
      setSocketId(null);
    };

    const handleConnectError = (error: Error) => {
      console.error('[useCharacterGenerationSocket] ⚠️ Connection error:', error);
      setConnectionError(error.message);
    };

    const handleConnectionEstablished = (payload: { socketId?: string }) => {
      console.log('[useCharacterGenerationSocket] 🎉 Connection established', payload);
      if (payload?.socketId) {
        setSocketId(payload.socketId);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('connection_established', handleConnectionEstablished);

    if (!socket.connected) {
      console.log('[useCharacterGenerationSocket] Connecting to WebSocket...');
      socket.connect();
    } else {
      console.log('[useCharacterGenerationSocket] Socket already connected');
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('connection_established', handleConnectionEstablished);
    };
  }, [socket]);

  // Join character generation room
  useEffect(() => {
    if (!socket || !sessionId) {
      console.log('[useCharacterGenerationSocket] Skipping join_character_generation', {
        hasSocket: !!socket,
        sessionId,
      });
      return;
    }

    let joined = true;

    console.log('[useCharacterGenerationSocket] Joining character generation room', { sessionId });

    socket.emit(
      'join_character_generation',
      { sessionId },
      (response?: { success?: boolean; error?: string; sessionId?: string }) => {
        console.log('[useCharacterGenerationSocket] join_character_generation callback', {
          sessionId,
          response,
        });

        if (response && response.success === false) {
          console.error('[useCharacterGenerationSocket] Failed to join room', response.error);
          setConnectionError(response.error || 'Unable to join character generation room');
          if (onError) {
            onError(response.error || 'Unable to join character generation room');
          }
        } else {
          console.log('[useCharacterGenerationSocket] Successfully joined room');
        }
      }
    );

    return () => {
      if (joined && socket.connected) {
        console.log('[useCharacterGenerationSocket] Leaving room', { sessionId });
        // No explicit leave event needed - room cleanup handled by server
      }
      joined = false;
    };
  }, [socket, sessionId, onError]);

  // Listen for progress events
  useEffect(() => {
    if (!socket || !sessionId) {
      console.log('[useCharacterGenerationSocket] Skipping progress handlers - no socket or session');
      return;
    }

    console.log('[useCharacterGenerationSocket] Registering progress handlers', { sessionId });

    const handleProgress = (progress: CharacterGenerationProgress) => {
      console.log('[useCharacterGenerationSocket] character_generation_progress event received', {
        step: progress.step,
        progress: progress.progress,
        message: progress.message,
        hasData: !!progress.data,
      });

      setCurrentProgress(progress);

      // Call progress callback
      if (onProgress) {
        onProgress(progress);
      }

      // Handle completion
      if (progress.step === CharacterGenerationStep.COMPLETED) {
        console.log('[useCharacterGenerationSocket] Generation completed!', progress.data);
        if (onComplete && progress.data?.character) {
          onComplete(progress.data.character);
        }
      }

      // Handle errors
      if (progress.step === CharacterGenerationStep.ERROR) {
        console.error('[useCharacterGenerationSocket] Generation error:', progress.data);
        setConnectionError(progress.message);
        if (onError) {
          onError(progress.data?.error || progress.message);
        }
      }
    };

    const handleCharacterGenerationJoined = (payload: { sessionId: string }) => {
      console.log('[useCharacterGenerationSocket] character_generation_joined event', payload);
    };

    socket.on('character_generation_progress', handleProgress);
    socket.on('character_generation_joined', handleCharacterGenerationJoined);

    return () => {
      socket.off('character_generation_progress', handleProgress);
      socket.off('character_generation_joined', handleCharacterGenerationJoined);
    };
  }, [socket, sessionId, onProgress, onComplete, onError]);

  return {
    isConnected,
    socketId,
    connectionError,
    currentProgress,
  };
}
