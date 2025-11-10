import { z } from 'zod';
import { AgeRating, ContentTag, Visibility } from '../generated/prisma';

/**
 * Attire (Clothing/Appearance) Validators
 */

// Base attire schema
const attireBaseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional().nullable(),
  gender: z.string().max(50).optional().nullable(),
  promptHead: z.string().max(1000).optional().nullable(),
  promptBody: z.string().max(1000).optional().nullable(),
  promptFull: z.string().max(2000).optional().nullable(),
  previewImageUrl: z.string().url().optional().nullable(),
  originalLanguageCode: z.string().max(10).optional().nullable(),
  visibility: z.nativeEnum(Visibility).default(Visibility.PRIVATE),
});

// Create attire schema
export const createAttireSchema = attireBaseSchema.extend({
  userId: z.string().uuid('Invalid user ID'),
  ageRating: z.nativeEnum(AgeRating).default(AgeRating.L),
  contentTags: z.array(z.nativeEnum(ContentTag)).optional().default([]),
});

// Update attire schema
export const updateAttireSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  gender: z.string().max(50).optional().nullable(),
  promptHead: z.string().max(1000).optional().nullable(),
  promptBody: z.string().max(1000).optional().nullable(),
  promptFull: z.string().max(2000).optional().nullable(),
  previewImageUrl: z.string().url().optional().nullable(),
  visibility: z.nativeEnum(Visibility).optional(),
  ageRating: z.nativeEnum(AgeRating).optional(),
  contentTags: z.array(z.nativeEnum(ContentTag)).optional(),
});

// Query parameters for listing attires
export const listAttiresQuerySchema = z.object({
  search: z.string().max(200).optional(),
  gender: z.string().max(50).optional(),
  visibility: z.nativeEnum(Visibility).optional(),
  skip: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(20),
});

// Type exports
export type CreateAttireInput = z.infer<typeof createAttireSchema>;
export type UpdateAttireInput = z.infer<typeof updateAttireSchema>;
export type ListAttiresQuery = z.infer<typeof listAttiresQuerySchema>;
