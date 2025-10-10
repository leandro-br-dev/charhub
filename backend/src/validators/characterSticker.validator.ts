import { z } from 'zod';
import { StickerStatus } from '../generated/prisma';

/**
 * Character Sticker Validators
 * For emotion/action sticker generation
 */

// Create character sticker schema
export const createCharacterStickerSchema = z.object({
  characterId: z.string().uuid('Invalid character ID'),
  emotionTag: z.string().max(100).optional().nullable(),
  actionTag: z.string().max(100).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  promptUsed: z.string().max(5000).optional().nullable(),
  status: z.nativeEnum(StickerStatus).default(StickerStatus.PENDING),
});

// Update character sticker schema
export const updateCharacterStickerSchema = z.object({
  emotionTag: z.string().max(100).optional().nullable(),
  actionTag: z.string().max(100).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  promptUsed: z.string().max(5000).optional().nullable(),
  status: z.nativeEnum(StickerStatus).optional(),
});

// Query parameters for listing stickers
export const listCharacterStickersQuerySchema = z.object({
  characterId: z.string().uuid().optional(),
  status: z.nativeEnum(StickerStatus).optional(),
  skip: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(20),
});

// Type exports
export type CreateCharacterStickerInput = z.infer<typeof createCharacterStickerSchema>;
export type UpdateCharacterStickerInput = z.infer<typeof updateCharacterStickerSchema>;
export type ListCharacterStickersQuery = z.infer<typeof listCharacterStickersQuerySchema>;
