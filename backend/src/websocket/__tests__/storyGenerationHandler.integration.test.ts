import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  getStoryGenerationRoom,
  emitStoryGenerationProgress,
  createProgressEvent,
} from '../storyGenerationHandler';
import { StoryGenerationStep } from '../../types/story-generation';
import { Server } from 'socket.io';

// Mock Socket.io Server
const mockIo = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
} as unknown as Server;

describe('Story Generation WebSocket Handler - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getStoryGenerationRoom', () => {
    it('should create room name with correct pattern', () => {
      const userId = 'user-123';
      const sessionId = 'session-456';

      const roomName = getStoryGenerationRoom(userId, sessionId);

      expect(roomName).toBe('story-generation:user-123:session-456');
    });

    it('should handle special characters in userId', () => {
      const userId = 'user@example.com';
      const sessionId = 'session-abc-123';

      const roomName = getStoryGenerationRoom(userId, sessionId);

      expect(roomName).toContain('user@example.com');
      expect(roomName).toContain('session-abc-123');
    });

    it('should handle UUID sessionIds', () => {
      const userId = 'user-123';
      const sessionId = '550e8400-e29b-41d4-a716-446655440000';

      const roomName = getStoryGenerationRoom(userId, sessionId);

      expect(roomName).toBe(`story-generation:${userId}:${sessionId}`);
    });

    it('should create unique room names for different sessions', () => {
      const userId = 'user-123';
      const session1 = 'session-1';
      const session2 = 'session-2';

      const room1 = getStoryGenerationRoom(userId, session1);
      const room2 = getStoryGenerationRoom(userId, session2);

      expect(room1).not.toBe(room2);
    });

    it('should create unique room names for different users', () => {
      const sessionId = 'session-123';
      const user1 = 'user-1';
      const user2 = 'user-2';

      const room1 = getStoryGenerationRoom(user1, sessionId);
      const room2 = getStoryGenerationRoom(user2, sessionId);

      expect(room1).not.toBe(room2);
    });

    it('should be parseable', () => {
      const userId = 'user-123';
      const sessionId = 'session-456';

      const roomName = getStoryGenerationRoom(userId, sessionId);
      const parts = roomName.split(':');

      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('story-generation');
      expect(parts[1]).toBe(userId);
      expect(parts[2]).toBe(sessionId);
    });
  });

  describe('createProgressEvent', () => {
    it('should create progress event with basic fields', () => {
      const step = StoryGenerationStep.GENERATING_CONCEPT;
      const progress = 50;
      const message = 'Generating story concept...';

      const event = createProgressEvent(step, progress, message);

      expect(event.step).toBe(StoryGenerationStep.GENERATING_CONCEPT);
      expect(event.progress).toBe(50);
      expect(event.message).toBe('Generating story concept...');
    });

    it('should create progress event with optional data', () => {
      const step = StoryGenerationStep.COMPLETED;
      const progress = 100;
      const message = 'Story generation completed!';
      const data = {
        storyId: 'story-123',
        story: { title: 'Test Story' },
      };

      const event = createProgressEvent(step, progress, message, data);

      expect(event.step).toBe(StoryGenerationStep.COMPLETED);
      expect(event.progress).toBe(100);
      expect(event.message).toBe('Story generation completed!');
      expect(event.data).toEqual(data);
    });

    it('should handle undefined data', () => {
      const event = createProgressEvent(
        StoryGenerationStep.GENERATING_CONCEPT,
        30,
        'Processing...'
      );

      expect(event.data).toBeUndefined();
    });

    it('should handle null data', () => {
      const event = createProgressEvent(
        StoryGenerationStep.GENERATING_CONCEPT,
        30,
        'Processing...',
        null
      );

      expect(event.data).toBeNull();
    });

    it('should handle complex data objects', () => {
      const complexData = {
        storyId: 'story-123',
        story: {
          title: 'The Dragon Academy',
          synopsis: 'A wizard story',
          characters: [
            { id: 'char-1', name: 'Elena' },
            { id: 'char-2', name: 'Marcus' },
          ],
        },
        coverJobId: 'job-456',
        metadata: {
          genre: 'fantasy',
          mood: 'mysterious',
        },
      };

      const event = createProgressEvent(
        StoryGenerationStep.COMPLETED,
        100,
        'Completed',
        complexData
      );

      expect(event.data).toEqual(complexData);
      expect(event.data?.story?.characters).toHaveLength(2);
    });

    describe('Progress Event Validations', () => {
      it('should accept progress value of 0', () => {
        const event = createProgressEvent(
          StoryGenerationStep.ERROR,
          0,
          'Error occurred'
        );

        expect(event.progress).toBe(0);
      });

      it('should accept progress value of 100', () => {
        const event = createProgressEvent(
          StoryGenerationStep.COMPLETED,
          100,
          'Completed'
        );

        expect(event.progress).toBe(100);
      });

      it('should accept intermediate progress values', () => {
        const progressValues = [15, 30, 45, 50, 65, 75, 85, 95];

        progressValues.forEach(progress => {
          const event = createProgressEvent(
            StoryGenerationStep.GENERATING_CONCEPT,
            progress,
            'Processing...'
          );

          expect(event.progress).toBe(progress);
        });
      });
    });

    describe('Step-Specific Events', () => {
      it('should create uploading image event', () => {
        const event = createProgressEvent(
          StoryGenerationStep.UPLOADING_IMAGE,
          5,
          'Uploading your image...'
        );

        expect(event.step).toBe(StoryGenerationStep.UPLOADING_IMAGE);
        expect(event.progress).toBe(5);
      });

      it('should create analyzing image event', () => {
        const event = createProgressEvent(
          StoryGenerationStep.ANALYZING_IMAGE,
          15,
          'Analyzing your image...'
        );

        expect(event.step).toBe(StoryGenerationStep.ANALYZING_IMAGE);
        expect(event.progress).toBe(15);
      });

      it('should create extracting description event', () => {
        const event = createProgressEvent(
          StoryGenerationStep.EXTRACTING_DESCRIPTION,
          30,
          'Analyzing your description...'
        );

        expect(event.step).toBe(StoryGenerationStep.EXTRACTING_DESCRIPTION);
        expect(event.progress).toBe(30);
      });

      it('should create generating concept event', () => {
        const event = createProgressEvent(
          StoryGenerationStep.GENERATING_CONCEPT,
          45,
          'Generating story concept...',
          { title: 'The Dragon Academy', genre: 'fantasy' }
        );

        expect(event.step).toBe(StoryGenerationStep.GENERATING_CONCEPT);
        expect(event.data?.title).toBe('The Dragon Academy');
      });

      it('should create generating plot event', () => {
        const event = createProgressEvent(
          StoryGenerationStep.GENERATING_PLOT,
          65,
          'Story plot written',
          { objectives: ['obj-1', 'obj-2'] }
        );

        expect(event.step).toBe(StoryGenerationStep.GENERATING_PLOT);
        expect(event.data?.objectives).toHaveLength(2);
      });

      it('should create writing scene event', () => {
        const event = createProgressEvent(
          StoryGenerationStep.WRITING_SCENE,
          75,
          'Opening scene written',
          { initialText: 'The story begins...' }
        );

        expect(event.step).toBe(StoryGenerationStep.WRITING_SCENE);
        expect(event.data?.initialText).toBeTruthy();
      });

      it('should create generating cover event', () => {
        const event = createProgressEvent(
          StoryGenerationStep.GENERATING_COVER,
          80,
          'Preparing cover image...'
        );

        expect(event.step).toBe(StoryGenerationStep.GENERATING_COVER);
      });

      it('should create creating story event', () => {
        const event = createProgressEvent(
          StoryGenerationStep.CREATING_STORY,
          90,
          'Creating your story...'
        );

        expect(event.step).toBe(StoryGenerationStep.CREATING_STORY);
      });

      it('should create completed event', () => {
        const event = createProgressEvent(
          StoryGenerationStep.COMPLETED,
          100,
          'Story generation completed!',
          { storyId: 'story-123', story: {}, coverJobId: 'job-456' }
        );

        expect(event.step).toBe(StoryGenerationStep.COMPLETED);
        expect(event.progress).toBe(100);
        expect(event.data?.storyId).toBe('story-123');
      });

      it('should create error event', () => {
        const event = createProgressEvent(
          StoryGenerationStep.ERROR,
          0,
          'Story generation failed',
          { error: 'LLM service unavailable', details: 'Connection timeout' }
        );

        expect(event.step).toBe(StoryGenerationStep.ERROR);
        expect(event.data?.error).toBe('LLM service unavailable');
      });
    });
  });

  describe('emitStoryGenerationProgress', () => {
    const userId = 'user-123';
    const sessionId = 'session-456';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should emit progress event to correct room', () => {
      const progress = createProgressEvent(
        StoryGenerationStep.GENERATING_CONCEPT,
        45,
        'Generating story concept...'
      );

      emitStoryGenerationProgress(mockIo, userId, sessionId, progress);

      expect(mockIo.to).toHaveBeenCalledWith('story-generation:user-123:session-456');
      expect(mockIo.emit).toHaveBeenCalledWith('story_generation_progress', progress);
    });

    it('should emit with completed event', () => {
      const progress = createProgressEvent(
        StoryGenerationStep.COMPLETED,
        100,
        'Story generation completed!',
        { storyId: 'story-123' }
      );

      emitStoryGenerationProgress(mockIo, userId, sessionId, progress);

      expect(mockIo.to).toHaveBeenCalled();
      expect(mockIo.emit).toHaveBeenCalledWith('story_generation_progress', expect.objectContaining({
        step: StoryGenerationStep.COMPLETED,
        progress: 100,
      }));
    });

    it('should emit with error event', () => {
      const progress = createProgressEvent(
        StoryGenerationStep.ERROR,
        0,
        'Generation failed',
        { error: 'Service unavailable' }
      );

      emitStoryGenerationProgress(mockIo, userId, sessionId, progress);

      expect(mockIo.emit).toHaveBeenCalledWith('story_generation_progress', expect.objectContaining({
        step: StoryGenerationStep.ERROR,
        data: { error: 'Service unavailable' },
      }));
    });

    it('should handle multiple progress updates', () => {
      const progressEvents = [
        createProgressEvent(StoryGenerationStep.UPLOADING_IMAGE, 5, 'Uploading...'),
        createProgressEvent(StoryGenerationStep.ANALYZING_IMAGE, 15, 'Analyzing...'),
        createProgressEvent(StoryGenerationStep.GENERATING_CONCEPT, 45, 'Generating...'),
        createProgressEvent(StoryGenerationStep.COMPLETED, 100, 'Done!'),
      ];

      progressEvents.forEach(event => {
        emitStoryGenerationProgress(mockIo, userId, sessionId, event);
      });

      expect(mockIo.emit).toHaveBeenCalledTimes(4);
    });

    it('should use correct room name for different users', () => {
      const users = ['user-1', 'user-2', 'user-3'];

      users.forEach(user => {
        const progress = createProgressEvent(
          StoryGenerationStep.GENERATING_CONCEPT,
          50,
          'Processing...'
        );
        emitStoryGenerationProgress(mockIo, user, sessionId, progress);
      });

      expect(mockIo.to).toHaveBeenCalledTimes(3);
    });
  });

  describe('Story Generation Flow Progress Events', () => {
    it('should follow correct progress sequence', () => {
      const flow = [
        { step: StoryGenerationStep.UPLOADING_IMAGE, progress: 5 },
        { step: StoryGenerationStep.ANALYZING_IMAGE, progress: 15 },
        { step: StoryGenerationStep.EXTRACTING_DESCRIPTION, progress: 30 },
        { step: StoryGenerationStep.GENERATING_CONCEPT, progress: 45 },
        { step: StoryGenerationStep.GENERATING_PLOT, progress: 65 },
        { step: StoryGenerationStep.WRITING_SCENE, progress: 75 },
        { step: StoryGenerationStep.GENERATING_COVER, progress: 80 },
        { step: StoryGenerationStep.CREATING_STORY, progress: 90 },
        { step: StoryGenerationStep.COMPLETED, progress: 100 },
      ];

      flow.forEach(({ step, progress }) => {
        const event = createProgressEvent(step, progress, `Step ${progress}%`);

        expect(event.step).toBe(step);
        expect(event.progress).toBe(progress);
      });
    });

    it('should handle alternative flow without image', () => {
      const flowWithoutImage = [
        { step: StoryGenerationStep.EXTRACTING_DESCRIPTION, progress: 30 },
        { step: StoryGenerationStep.GENERATING_CONCEPT, progress: 45 },
        { step: StoryGenerationStep.GENERATING_PLOT, progress: 65 },
        { step: StoryGenerationStep.WRITING_SCENE, progress: 75 },
        { step: StoryGenerationStep.COMPLETED, progress: 100 },
      ];

      flowWithoutImage.forEach(({ step, progress }) => {
        const event = createProgressEvent(step, progress, 'Processing...');

        expect(event.step).toBe(step);
        expect(event.progress).toBeGreaterThanOrEqual(30);
      });
    });

    it('should handle error at any step', () => {
      const steps = [
        StoryGenerationStep.UPLOADING_IMAGE,
        StoryGenerationStep.ANALYZING_IMAGE,
        StoryGenerationStep.GENERATING_CONCEPT,
        StoryGenerationStep.GENERATING_COVER,
      ];

      steps.forEach(step => {
        const errorEvent = createProgressEvent(
          StoryGenerationStep.ERROR,
          0,
          'Step failed',
          { failedStep: step }
        );

        expect(errorEvent.step).toBe(StoryGenerationStep.ERROR);
        expect(errorEvent.data?.failedStep).toBe(step);
      });
    });
  });

  describe('Event Data Structures', () => {
    it('should include story concept data', () => {
      const conceptData = {
        title: 'The Dragon Academy',
        genre: 'fantasy',
        mood: 'mysterious',
      };

      const event = createProgressEvent(
        StoryGenerationStep.GENERATING_CONCEPT,
        55,
        'Story concept created',
        conceptData
      );

      expect(event.data).toEqual(conceptData);
    });

    it('should include plot data with objectives', () => {
      const plotData = {
        synopsis: 'A wizard discovers magic',
        objectives: ['Learn magic', 'Defeat villain', 'Save academy'],
      };

      const event = createProgressEvent(
        StoryGenerationStep.GENERATING_PLOT,
        65,
        'Story plot written',
        plotData
      );

      expect(event.data?.objectives).toHaveLength(3);
    });

    it('should include scene data with initial text', () => {
      const sceneData = {
        initialText: 'The sun was setting over the ancient academy as Elena discovered the forbidden spell book...',
      };

      const event = createProgressEvent(
        StoryGenerationStep.WRITING_SCENE,
        75,
        'Opening scene written',
        sceneData
      );

      expect(event.data?.initialText).toContain('Elena');
      expect(event.data?.initialText).toContain('academy');
    });

    it('should include completed data', () => {
      const completedData = {
        storyId: 'story-123',
        story: {
          id: 'story-123',
          title: 'The Dragon Academy',
          synopsis: 'A wizard story',
          createdAt: new Date(),
        },
        coverJobId: 'job-456',
      };

      const event = createProgressEvent(
        StoryGenerationStep.COMPLETED,
        100,
        'Story generation completed!',
        completedData
      );

      expect(event.data?.storyId).toBe('story-123');
      expect(event.data?.story).toBeDefined();
      expect(event.data?.coverJobId).toBe('job-456');
    });

    it('should include error data with details', () => {
      const errorData = {
        error: 'Insufficient credits',
        details: 'Required: 75 credits, Available: 50 credits',
      };

      const event = createProgressEvent(
        StoryGenerationStep.ERROR,
        0,
        'Story generation failed',
        errorData
      );

      expect(event.data?.error).toBe('Insufficient credits');
      expect(event.data?.details).toContain('75 credits');
    });
  });

  describe('Real-time Progress Simulation', () => {
    it('should simulate complete generation flow with image', () => {
      const userId = 'user-sim';
      const sessionId = 'session-sim';

      const flowEvents = [
        createProgressEvent(StoryGenerationStep.UPLOADING_IMAGE, 5, 'Uploading image...'),
        createProgressEvent(StoryGenerationStep.ANALYZING_IMAGE, 15, 'Analyzing your image...'),
        createProgressEvent(StoryGenerationStep.EXTRACTING_DESCRIPTION, 30, 'Analyzing your description...'),
        createProgressEvent(StoryGenerationStep.GENERATING_CONCEPT, 45, 'Generating story concept...'),
        createProgressEvent(StoryGenerationStep.GENERATING_CONCEPT, 55, 'Story concept created'),
        createProgressEvent(StoryGenerationStep.GENERATING_PLOT, 65, 'Story plot written'),
        createProgressEvent(StoryGenerationStep.WRITING_SCENE, 75, 'Opening scene written'),
        createProgressEvent(StoryGenerationStep.GENERATING_COVER, 80, 'Preparing cover image...'),
        createProgressEvent(StoryGenerationStep.GENERATING_PLOT, 85, 'Creating story phases...'),
        createProgressEvent(StoryGenerationStep.CREATING_STORY, 90, 'Creating your story...'),
        createProgressEvent(StoryGenerationStep.GENERATING_COVER, 95, 'Generating cover image...'),
        createProgressEvent(StoryGenerationStep.COMPLETED, 100, 'Story generation completed!', {
          storyId: 'sim-story-123',
          story: { title: 'Simulated Story' },
        }),
      ];

      flowEvents.forEach(event => {
        emitStoryGenerationProgress(mockIo, userId, sessionId, event);
      });

      expect(mockIo.emit).toHaveBeenCalledTimes(flowEvents.length);
    });

    it('should handle error during generation', () => {
      const userId = 'user-err';
      const sessionId = 'session-err';

      const errorFlow = [
        createProgressEvent(StoryGenerationStep.UPLOADING_IMAGE, 5, 'Uploading image...'),
        createProgressEvent(StoryGenerationStep.ERROR, 0, 'Image upload failed', {
          error: 'File too large',
        }),
      ];

      errorFlow.forEach(event => {
        emitStoryGenerationProgress(mockIo, userId, sessionId, event);
      });

      expect(mockIo.emit).toHaveBeenCalledWith(
        'story_generation_progress',
        expect.objectContaining({
          step: StoryGenerationStep.ERROR,
        })
      );
    });
  });

  describe('Event Validation', () => {
    it('should validate progress values are within range', () => {
      const validProgress = [0, 5, 15, 30, 45, 50, 65, 75, 80, 85, 90, 95, 100];

      validProgress.forEach(progress => {
        const event = createProgressEvent(
          StoryGenerationStep.GENERATING_CONCEPT,
          progress,
          'Processing...'
        );

        expect(event.progress).toBeGreaterThanOrEqual(0);
        expect(event.progress).toBeLessThanOrEqual(100);
      });
    });

    it('should validate all step values are valid enums', () => {
      const validSteps = Object.values(StoryGenerationStep);

      validSteps.forEach(step => {
        const event = createProgressEvent(step, 50, 'Test');

        expect(Object.values(StoryGenerationStep)).toContain(event.step);
      });
    });

    it('should validate message is not empty', () => {
      const event = createProgressEvent(
        StoryGenerationStep.GENERATING_CONCEPT,
        50,
        'Valid message'
      );

      expect(event.message.length).toBeGreaterThan(0);
      expect(event.message.trim()).toBeTruthy();
    });
  });
});
