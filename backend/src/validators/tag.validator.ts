import { z } from 'zod';
import { AgeRating, TagType } from '../generated/prisma';

/**
 * Tag Validators
 * For character and story categorization
 */

// Base tag schema
const tagBaseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.nativeEnum(TagType),
  weight: z.number().int().min(1).max(100).default(1),
  ageRating: z.nativeEnum(AgeRating).default(AgeRating.L),
  originalLanguageCode: z.string().max(10).optional().nullable(),
});

// Create tag schema
export const createTagSchema = tagBaseSchema;

// Update tag schema
export const updateTagSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.nativeEnum(TagType).optional(),
  weight: z.number().int().min(1).max(100).optional(),
  ageRating: z.nativeEnum(AgeRating).optional(),
  originalLanguageCode: z.string().max(10).optional().nullable(),
});

// Query parameters for listing tags
export const listTagsQuerySchema = z.object({
  search: z.string().max(200).optional(),
  type: z.nativeEnum(TagType).optional(),
  skip: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(100),
});

// Type exports
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
export type ListTagsQuery = z.infer<typeof listTagsQuerySchema>;
