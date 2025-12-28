import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useStoryGenerationSocket, StoryGenerationStep } from '../useStoryGenerationSocket';
import { useAuth } from '../useAuth';
import { io, type Socket } from 'socket.io-client';

// Mock dependencies
jest.mock('socket.io-client');
jest.mock('../useAuth');
jest.mock('../lib/resolveApiBaseUrl', () => ({
  resolveApiBaseUrl: jest.fn(() => 'http://localhost:8082'),
}));

describe('useStoryGenerationSocket - Unit Tests', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    token: 'mock-token-123',
  };

  const mockSocket: Partial<Socket> = {
    id: 'socket-456',
    connected: false,
    connect: jest.fn(function(this: Partial<Socket>) {
      this.connected = true;
      return this;
    }),
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    auth: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useAuth
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    // Mock socket.io-client
    (io as jest.Mock).mockReturnValue(mockSocket as Socket);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
        })
      );

      expect(result.current.isConnected).toBe(false);
      expect(result.current.socketId).toBeNull();
      expect(result.current.connectionError).toBeNull();
      expect(result.current.currentProgress).toBeNull();
    });

    it('should create socket instance when user is authenticated', () => {
      renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
        })
      );

      expect(io).toHaveBeenCalledWith(
        'http://localhost:8082',
        expect.objectContaining({
          path: '/api/v1/ws',
          withCredentials: true,
          transports: ['websocket'],
          autoConnect: false,
          auth: { token: mockUser.token },
        })
      );
    });

    it('should not create socket when user is not authenticated', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isLoading: false,
      });

      const { result } = renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
        })
      );

      expect(io).not.toHaveBeenCalled();
      expect(result.current.isConnected).toBe(false);
    });

    it('should connect socket on mount', async () => {
      const { result } = renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
        })
      );

      // Simulate connection
      await act(async () => {
        const connectHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'connect'
        )?.[1];

        if (connectHandler) {
          connectHandler();
        }
      });

      expect(result.current.isConnected).toBe(true);
    });
  });

  describe('Connection Management', () => {
    it('should set isConnected to true when connected', async () => {
      const { result } = renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
        })
      );

      await act(async () => {
        const connectHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'connect'
        )?.[1];

        if (connectHandler) {
          connectHandler();
        }
      });

      expect(result.current.isConnected).toBe(true);
    });

    it('should set socketId when connected', async () => {
      const { result } = renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
        })
      );

      await act(async () => {
        const connectHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'connect'
        )?.[1];

        if (connectHandler) {
          connectHandler();
        }
      });

      expect(result.current.socketId).toBe('socket-456');
    });

    it('should set isConnected to false when disconnected', async () => {
      const { result } = renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
        })
      );

      // First connect
      await act(async () => {
        const connectHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'connect'
        )?.[1];

        if (connectHandler) {
          connectHandler();
        }
      });

      expect(result.current.isConnected).toBe(true);

      // Then disconnect
      await act(async () => {
        const disconnectHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'disconnect'
        )?.[1];

        if (disconnectHandler) {
          disconnectHandler();
        }
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.socketId).toBeNull();
    });

    it('should set connectionError on connection error', async () => {
      const { result } = renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
        })
      );

      await act(async () => {
        const errorHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'connect_error'
        )?.[1];

        if (errorHandler) {
          errorHandler(new Error('Connection failed'));
        }
      });

      expect(result.current.connectionError).toBe('Connection failed');
    });
  });

  describe('Room Management', () => {
    it('should emit join_story_generation when sessionId is provided', () => {
      renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
        })
      );

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'join_story_generation',
        { sessionId: 'session-123' },
        expect.any(Function)
      );
    });

    it('should handle successful room join', async () => {
      const onError = jest.fn();

      renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
          onError,
        })
      );

      // Get the emit callback
      const emitCall = (mockSocket.emit as jest.Mock).mock.calls.find(
        (call) => call[0] === 'join_story_generation'
      );

      await act(async () => {
        const callback = emitCall?.[2];
        if (callback) {
          callback({ success: true, sessionId: 'session-123' });
        }
      });

      expect(onError).not.toHaveBeenCalled();
    });

    it('should handle failed room join', async () => {
      const onError = jest.fn();

      const { result } = renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
          onError,
        })
      );

      // Get the emit callback
      const emitCall = (mockSocket.emit as jest.Mock).mock.calls.find(
        (call) => call[0] === 'join_story_generation'
      );

      await act(async () => {
        const callback = emitCall?.[2];
        if (callback) {
          callback({ success: false, error: 'Room not found' });
        }
      });

      expect(result.current.connectionError).toBe('Room not found');
      expect(onError).toHaveBeenCalledWith('Room not found');
    });

    it('should not join room when sessionId is null', () => {
      renderHook(() =>
        useStoryGenerationSocket({
          sessionId: null,
        })
      );

      // Should not emit join event
      const emitCalls = (mockSocket.emit as jest.Mock).mock.calls.filter(
        (call) => call[0] === 'join_story_generation'
      );

      expect(emitCalls).toHaveLength(0);
    });
  });

  describe('Progress Events', () => {
    it('should update currentProgress on progress event', async () => {
      const { result } = renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
        })
      );

      await act(async () => {
        const progressHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'story_generation_progress'
        )?.[1];

        if (progressHandler) {
          progressHandler({
            step: StoryGenerationStep.GENERATING_CONCEPT,
            progress: 45,
            message: 'Generating story concept...',
          });
        }
      });

      expect(result.current.currentProgress).toEqual({
        step: StoryGenerationStep.GENERATING_CONCEPT,
        progress: 45,
        message: 'Generating story concept...',
      });
    });

    it('should call onProgress callback', async () => {
      const onProgress = jest.fn();

      renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
          onProgress,
        })
      );

      await act(async () => {
        const progressHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'story_generation_progress'
        )?.[1];

        if (progressHandler) {
          progressHandler({
            step: StoryGenerationStep.GENERATING_CONCEPT,
            progress: 45,
            message: 'Generating...',
          });
        }
      });

      expect(onProgress).toHaveBeenCalledWith({
        step: StoryGenerationStep.GENERATING_CONCEPT,
        progress: 45,
        message: 'Generating...',
      });
    });

    it('should call onComplete callback when step is COMPLETED', async () => {
      const onComplete = jest.fn();
      const mockStory = { id: 'story-123', title: 'Test Story' };

      renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
          onComplete,
        })
      );

      await act(async () => {
        const progressHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'story_generation_progress'
        )?.[1];

        if (progressHandler) {
          progressHandler({
            step: StoryGenerationStep.COMPLETED,
            progress: 100,
            message: 'Story generation completed!',
            data: { story: mockStory },
          });
        }
      });

      expect(onComplete).toHaveBeenCalledWith(mockStory);
    });

    it('should call onError callback when step is ERROR', async () => {
      const onError = jest.fn();

      const { result } = renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
          onError,
        })
      );

      await act(async () => {
        const progressHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'story_generation_progress'
        )?.[1];

        if (progressHandler) {
          progressHandler({
            step: StoryGenerationStep.ERROR,
            progress: 0,
            message: 'Generation failed',
            data: { error: 'Service unavailable' },
          });
        }
      });

      expect(result.current.connectionError).toBe('Generation failed');
      expect(onError).toHaveBeenCalledWith('Service unavailable');
    });
  });

  describe('Progress Steps', () => {
    it('should handle UPLOADING_IMAGE step', async () => {
      const onProgress = jest.fn();
      const { result } = renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
          onProgress,
        })
      );

      await act(async () => {
        const progressHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'story_generation_progress'
        )?.[1];

        if (progressHandler) {
          progressHandler({
            step: StoryGenerationStep.UPLOADING_IMAGE,
            progress: 5,
            message: 'Uploading your image...',
          });
        }
      });

      expect(result.current.currentProgress?.step).toBe(StoryGenerationStep.UPLOADING_IMAGE);
      expect(onProgress).toHaveBeenCalled();
    });

    it('should handle ANALYZING_IMAGE step', async () => {
      const onProgress = jest.fn();
      const { result } = renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
          onProgress,
        })
      );

      await act(async () => {
        const progressHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'story_generation_progress'
        )?.[1];

        if (progressHandler) {
          progressHandler({
            step: StoryGenerationStep.ANALYZING_IMAGE,
            progress: 15,
            message: 'Analyzing your image...',
          });
        }
      });

      expect(result.current.currentProgress?.step).toBe(StoryGenerationStep.ANALYZING_IMAGE);
    });

    it('should handle EXTRACTING_DESCRIPTION step', async () => {
      const onProgress = jest.fn();
      const { result } = renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
          onProgress,
        })
      );

      await act(async () => {
        const progressHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'story_generation_progress'
        )?.[1];

        if (progressHandler) {
          progressHandler({
            step: StoryGenerationStep.EXTRACTING_DESCRIPTION,
            progress: 30,
            message: 'Analyzing your description...',
          });
        }
      });

      expect(result.current.currentProgress?.step).toBe(StoryGenerationStep.EXTRACTING_DESCRIPTION);
    });

    it('should handle GENERATING_PLOT step', async () => {
      const onProgress = jest.fn();
      const { result } = renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
          onProgress,
        })
      );

      await act(async () => {
        const progressHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'story_generation_progress'
        )?.[1];

        if (progressHandler) {
          progressHandler({
            step: StoryGenerationStep.GENERATING_PLOT,
            progress: 65,
            message: 'Story plot written',
            data: { objectives: ['obj-1', 'obj-2'] },
          });
        }
      });

      expect(result.current.currentProgress?.data?.objectives).toHaveLength(2);
    });

    it('should handle WRITING_SCENE step', async () => {
      const onProgress = jest.fn();
      const { result } = renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
          onProgress,
        })
      );

      await act(async () => {
        const progressHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'story_generation_progress'
        )?.[1];

        if (progressHandler) {
          progressHandler({
            step: StoryGenerationStep.WRITING_SCENE,
            progress: 75,
            message: 'Opening scene written',
            data: { initialText: 'The story begins...' },
          });
        }
      });

      expect(result.current.currentProgress?.data?.initialText).toContain('story');
    });

    it('should handle GENERATING_COVER step', async () => {
      const onProgress = jest.fn();
      const { result } = renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
          onProgress,
        })
      );

      await act(async () => {
        const progressHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'story_generation_progress'
        )?.[1];

        if (progressHandler) {
          progressHandler({
            step: StoryGenerationStep.GENERATING_COVER,
            progress: 80,
            message: 'Preparing cover image...',
          });
        }
      });

      expect(result.current.currentProgress?.step).toBe(StoryGenerationStep.GENERATING_COVER);
    });

    it('should handle CREATING_STORY step', async () => {
      const onProgress = jest.fn();
      const { result } = renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
          onProgress,
        })
      );

      await act(async () => {
        const progressHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'story_generation_progress'
        )?.[1];

        if (progressHandler) {
          progressHandler({
            step: StoryGenerationStep.CREATING_STORY,
            progress: 90,
            message: 'Creating your story...',
          });
        }
      });

      expect(result.current.currentProgress?.step).toBe(StoryGenerationStep.CREATING_STORY);
    });
  });

  describe('Cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const { unmount } = renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
        })
      );

      unmount();

      expect(mockSocket.off).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('connect_error', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('connection_established', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('story_generation_progress', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('story_generation_joined', expect.any(Function));
    });

    it('should remove progress listeners when sessionId changes', async () => {
      const { rerender } = renderHook(
        ({ sessionId }) =>
          useStoryGenerationSocket({
            sessionId,
          }),
        { initialProps: { sessionId: 'session-123' } }
      );

      // Clear previous calls
      (mockSocket.off as jest.Mock).mockClear();

      // Change sessionId
      rerender({ sessionId: 'session-456' });

      // Progress listeners should be removed and re-registered
      expect(mockSocket.off).toHaveBeenCalledWith('story_generation_progress', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('story_generation_joined', expect.any(Function));
    });
  });

  describe('Reconnection Handling', () => {
    it('should update socketId on reconnection', async () => {
      const { result } = renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
        })
      );

      // Initial connection
      await act(async () => {
        const connectHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'connect'
        )?.[1];

        if (connectHandler) {
          connectHandler();
        }
      });

      expect(result.current.socketId).toBe('socket-456');

      // Disconnect
      await act(async () => {
        const disconnectHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'disconnect'
        )?.[1];

        if (disconnectHandler) {
          disconnectHandler();
        }
      });

      expect(result.current.socketId).toBeNull();

      // Reconnect
      await act(async () => {
        const connectHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'connect'
        )?.[1];

        if (connectHandler) {
          connectHandler();
        }
      });

      expect(result.current.socketId).toBe('socket-456');
    });
  });

  describe('Multiple Progress Updates', () => {
    it('should handle multiple progress updates in sequence', async () => {
      const onProgress = jest.fn();
      const { result } = renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
          onProgress,
        })
      );

      const progressUpdates = [
        { step: StoryGenerationStep.UPLOADING_IMAGE, progress: 5, message: 'Uploading...' },
        { step: StoryGenerationStep.ANALYZING_IMAGE, progress: 15, message: 'Analyzing...' },
        { step: StoryGenerationStep.GENERATING_CONCEPT, progress: 45, message: 'Generating...' },
        { step: StoryGenerationStep.COMPLETED, progress: 100, message: 'Done!' },
      ];

      await act(async () => {
        const progressHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'story_generation_progress'
        )?.[1];

        if (progressHandler) {
          progressUpdates.forEach((update) => {
            progressHandler(update);
          });
        }
      });

      expect(onProgress).toHaveBeenCalledTimes(4);
      expect(result.current.currentProgress?.progress).toBe(100);
    });

    it('should update currentProgress with each update', async () => {
      const { result } = renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
        })
      );

      const progressUpdates = [
        { step: StoryGenerationStep.UPLOADING_IMAGE, progress: 5, message: 'Uploading...' },
        { step: StoryGenerationStep.GENERATING_CONCEPT, progress: 45, message: 'Generating...' },
        { step: StoryGenerationStep.COMPLETED, progress: 100, message: 'Done!' },
      ];

      for (const update of progressUpdates) {
        await act(async () => {
          const progressHandler = (mockSocket.on as jest.Mock).mock.calls.find(
            (call) => call[0] === 'story_generation_progress'
          )?.[1];

          if (progressHandler) {
            progressHandler(update);
          }
        });

        expect(result.current.currentProgress?.progress).toBe(update.progress);
      }
    });
  });

  describe('Connection Established Event', () => {
    it('should handle connection_established event', async () => {
      const { result } = renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
        })
      );

      await act(async () => {
        const establishedHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'connection_established'
        )?.[1];

        if (establishedHandler) {
          establishedHandler({ socketId: 'socket-789' });
        }
      });

      expect(result.current.socketId).toBe('socket-789');
    });
  });

  describe('Story Generation Joined Event', () => {
    it('should handle story_generation_joined event', async () => {
      renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
        })
      );

      await act(async () => {
        const joinedHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'story_generation_joined'
        )?.[1];

        if (joinedHandler) {
          joinedHandler({ sessionId: 'session-123' });
        }
      });

      // Event should be handled without errors
      expect(true).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing error data', async () => {
      const onError = jest.fn();
      const { result } = renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
          onError,
        })
      );

      await act(async () => {
        const progressHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'story_generation_progress'
        )?.[1];

        if (progressHandler) {
          progressHandler({
            step: StoryGenerationStep.ERROR,
            progress: 0,
            message: 'Error without data',
          });
        }
      });

      expect(result.current.connectionError).toBe('Error without data');
      expect(onError).toHaveBeenCalledWith('Error without data');
    });

    it('should handle completion without story data', async () => {
      const onComplete = jest.fn();

      renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
          onComplete,
        })
      );

      await act(async () => {
        const progressHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'story_generation_progress'
        )?.[1];

        if (progressHandler) {
          progressHandler({
            step: StoryGenerationStep.COMPLETED,
            progress: 100,
            message: 'Completed',
            data: {},
          });
        }
      });

      expect(onComplete).not.toHaveBeenCalled();
    });

    it('should handle null sessionId', () => {
      const { result } = renderHook(() =>
        useStoryGenerationSocket({
          sessionId: null,
        })
      );

      expect(result.current.isConnected).toBe(false);
      expect(result.current.socketId).toBeNull();
    });

    it('should handle undefined sessionId', () => {
      const { result } = renderHook(() =>
        useStoryGenerationSocket({
          sessionId: undefined as unknown as string | null,
        })
      );

      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('Progress Data Handling', () => {
    it('should store progress data correctly', async () => {
      const { result } = renderHook(() =>
        useStoryGenerationSocket({
          sessionId: 'session-123',
        })
      );

      const complexData = {
        title: 'The Dragon Academy',
        genre: 'fantasy',
        characters: [
          { id: 'char-1', name: 'Elena' },
          { id: 'char-2', name: 'Marcus' },
        ],
      };

      await act(async () => {
        const progressHandler = (mockSocket.on as jest.Mock).mockCalls.find(
          (call) => call[0] === 'story_generation_progress'
        )?.[1];

        if (progressHandler) {
          progressHandler({
            step: StoryGenerationStep.GENERATING_CONCEPT,
            progress: 45,
            message: 'Concept created',
            data: complexData,
          });
        }
      });

      expect(result.current.currentProgress?.data).toEqual(complexData);
    });
  });
});
