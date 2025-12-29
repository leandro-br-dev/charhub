import type { Server } from 'socket.io';
import type {
  StoryGenerationStep,
  StoryGenerationProgress,
} from '../types/story-generation';

/**
 * Get room name for story generation session
 */
export function getStoryGenerationRoom(userId: string, sessionId: string): string {
  return `story-generation:${userId}:${sessionId}`;
}

/**
 * Emit story generation progress event
 */
export function emitStoryGenerationProgress(
  io: Server,
  userId: string,
  sessionId: string,
  progress: StoryGenerationProgress
): void {
  const room = getStoryGenerationRoom(userId, sessionId);
  io.to(room).emit('story_generation_progress', progress);
}

/**
 * Helper to create progress event
 */
export function createProgressEvent(
  step: StoryGenerationStep,
  progress: number,
  message: string,
  data?: any
): StoryGenerationProgress {
  return {
    step,
    progress,
    message,
    data,
  };
}
