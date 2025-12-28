import { useCallback, useEffect, useMemo, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { resolveApiBaseUrl } from '../lib/resolveApiBaseUrl';
import { useAuth } from './useAuth';

export enum StoryGenerationStep {
  UPLOADING_IMAGE = 'uploading_image',
  ANALYZING_IMAGE = 'analyzing_image',
  EXTRACTING_DESCRIPTION = 'extracting_description',
  GENERATING_CONCEPT = 'generating_concept',
  GENERATING_PLOT = 'generating_plot',
  WRITING_SCENE = 'writing_scene',
  GENERATING_COVER = 'generating_cover',
  CREATING_STORY = 'creating_story',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export interface StoryGenerationProgress {
  step: StoryGenerationStep;
  progress: number; // 0-100
  message: string;
  data?: any;
}

interface UseStoryGenerationSocketOptions {
  sessionId: string | null;
  onProgress?: (progress: StoryGenerationProgress) => void;
  onComplete?: (story: any) => void;
  onError?: (error: string) => void;
}

interface StoryGenerationSocketState {
  isConnected: boolean;
  socketId: string | null;
  connectionError: string | null;
  currentProgress: StoryGenerationProgress | null;
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

export function useStoryGenerationSocket(
  options: UseStoryGenerationSocketOptions
): StoryGenerationSocketState {
  const { sessionId, onProgress, onComplete, onError } = options;
  const { user } = useAuth();
  const token = user?.token;

  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState<StoryGenerationProgress | null>(null);

  const socket = useMemo(() => {
    if (!token) {
      console.log('[useStoryGenerationSocket] Cannot create socket - no token available');
      return null;
    }
    console.log('[useStoryGenerationSocket] Creating socket instance with token');
    return getSocket(token);
  }, [token]);

  // Connect to WebSocket
  useEffect(() => {
    if (!socket) {
      console.log('[useStoryGenerationSocket] No socket instance');
      return;
    }

    console.log('[useStoryGenerationSocket] Setting up socket event handlers');

    const handleConnect = () => {
      console.log('[useStoryGenerationSocket] Connected to WebSocket', { socketId: socket.id });
      setIsConnected(true);
      setConnectionError(null);
      setSocketId(socket.id ?? null);
    };

    const handleDisconnect = () => {
      console.log('[useStoryGenerationSocket] Disconnected from WebSocket');
      setIsConnected(false);
      setSocketId(null);
    };

    const handleConnectError = (error: Error) => {
      console.error('[useStoryGenerationSocket] Connection error:', error);
      setConnectionError(error.message);
    };

    const handleConnectionEstablished = (payload: { socketId?: string }) => {
      console.log('[useStoryGenerationSocket] Connection established', payload);
      if (payload?.socketId) {
        setSocketId(payload.socketId);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('connection_established', handleConnectionEstablished);

    if (!socket.connected) {
      console.log('[useStoryGenerationSocket] Connecting to WebSocket...');
      socket.connect();
    } else {
      console.log('[useStoryGenerationSocket] Socket already connected');
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('connection_established', handleConnectionEstablished);
    };
  }, [socket]);

  // Join story generation room
  useEffect(() => {
    if (!socket || !sessionId) {
      console.log('[useStoryGenerationSocket] Skipping join_story_generation', {
        hasSocket: !!socket,
        sessionId,
      });
      return;
    }

    let joined = true;

    console.log('[useStoryGenerationSocket] Joining story generation room', { sessionId });

    socket.emit(
      'join_story_generation',
      { sessionId },
      (response?: { success?: boolean; error?: string; sessionId?: string }) => {
        console.log('[useStoryGenerationSocket] join_story_generation callback', {
          sessionId,
          response,
        });

        if (response && response.success === false) {
          console.error('[useStoryGenerationSocket] Failed to join room', response.error);
          setConnectionError(response.error || 'Unable to join story generation room');
          if (onError) {
            onError(response.error || 'Unable to join story generation room');
          }
        } else {
          console.log('[useStoryGenerationSocket] Successfully joined room');
        }
      }
    );

    return () => {
      if (joined && socket.connected) {
        console.log('[useStoryGenerationSocket] Leaving room', { sessionId });
        // No explicit leave event needed - room cleanup handled by server
      }
      joined = false;
    };
  }, [socket, sessionId, onError]);

  // Listen for progress events
  useEffect(() => {
    if (!socket || !sessionId) {
      console.log('[useStoryGenerationSocket] Skipping progress handlers - no socket or session');
      return;
    }

    console.log('[useStoryGenerationSocket] Registering progress handlers', { sessionId });

    const handleProgress = (progress: StoryGenerationProgress) => {
      console.log('[useStoryGenerationSocket] story_generation_progress event received', {
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
      if (progress.step === StoryGenerationStep.COMPLETED) {
        console.log('[useStoryGenerationSocket] Generation completed!', progress.data);
        if (onComplete && progress.data?.story) {
          onComplete(progress.data.story);
        }
      }

      // Handle errors
      if (progress.step === StoryGenerationStep.ERROR) {
        console.error('[useStoryGenerationSocket] Generation error:', progress.data);
        setConnectionError(progress.message);
        if (onError) {
          onError(progress.data?.error || progress.message);
        }
      }
    };

    const handleStoryGenerationJoined = (payload: { sessionId: string }) => {
      console.log('[useStoryGenerationSocket] story_generation_joined event', payload);
    };

    socket.on('story_generation_progress', handleProgress);
    socket.on('story_generation_joined', handleStoryGenerationJoined);

    return () => {
      socket.off('story_generation_progress', handleProgress);
      socket.off('story_generation_joined', handleStoryGenerationJoined);
    };
  }, [socket, sessionId, onProgress, onComplete, onError]);

  return {
    isConnected,
    socketId,
    connectionError,
    currentProgress,
  };
}
