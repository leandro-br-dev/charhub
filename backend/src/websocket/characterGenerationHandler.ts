import type { Server } from 'socket.io';
import type {
  CharacterGenerationStep,
  CharacterGenerationProgress,
} from '../types/character-generation';

/**
 * Get room name for character generation session
 */
export function getCharacterGenerationRoom(userId: string, sessionId: string): string {
  return `character-generation:${userId}:${sessionId}`;
}

/**
 * Emit character generation progress event
 */
export function emitCharacterGenerationProgress(
  io: Server,
  userId: string,
  sessionId: string,
  progress: CharacterGenerationProgress
): void {
  const room = getCharacterGenerationRoom(userId, sessionId);
  io.to(room).emit('character_generation_progress', progress);
}

/**
 * Helper to create progress event
 */
export function createProgressEvent(
  step: CharacterGenerationStep,
  progress: number,
  message: string,
  data?: any
): CharacterGenerationProgress {
  return {
    step,
    progress,
    message,
    data,
  };
}
