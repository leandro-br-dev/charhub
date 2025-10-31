import { z } from 'zod';
import { AgeRating, ContentTag } from '../generated/prisma';

/**
 * Character Validators
 * Based on Prisma schema and old project requirements
 */

// Base character schema with common fields
const characterBaseSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().max(100).optional().nullable(),
  age: z.number().int().min(0).max(10000).optional().nullable(),
  gender: z.string().max(50).optional().nullable(),
  species: z.string().max(100).optional().nullable(),
  style: z.string().max(100).optional().nullable(),
  avatar: z.string().url().optional().nullable(),
  physicalCharacteristics: z.string().max(5000).optional().nullable(),
  personality: z.string().max(5000).optional().nullable(),
  history: z.string().max(5000).optional().nullable(),
  isPublic: z.boolean().default(true),
  originalLanguageCode: z.string().max(10).optional().nullable(),
});

// Create character schema
export const createCharacterSchema = characterBaseSchema.extend({
  userId: z.string().uuid('Invalid user ID'),
  loraId: z.string().uuid('Invalid LoRA ID').optional().nullable(),
  mainAttireId: z.string().uuid('Invalid main attire ID').optional().nullable(),
  attireIds: z.array(z.string().uuid()).optional().default([]),
  tagIds: z.array(z.string().uuid()).optional().default([]),
  ageRating: z.nativeEnum(AgeRating).default(AgeRating.L),
  contentTags: z.array(z.nativeEnum(ContentTag)).optional().default([]),
});

// Update character schema (all fields optional except constraints)
export const updateCharacterSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().max(100).optional().nullable(),
  age: z.number().int().min(0).max(10000).optional().nullable(),
  gender: z.string().max(50).optional().nullable(),
  species: z.string().max(100).optional().nullable(),
  style: z.string().max(100).optional().nullable(),
  avatar: z.string().url().optional().nullable(),
  physicalCharacteristics: z.string().max(5000).optional().nullable(),
  personality: z.string().max(5000).optional().nullable(),
  history: z.string().max(5000).optional().nullable(),
  isPublic: z.boolean().optional(),
  originalLanguageCode: z.string().max(10).optional().nullable(),
  loraId: z.string().uuid().optional().nullable(),
  mainAttireId: z.string().uuid().optional().nullable(),
  attireIds: z.array(z.string().uuid()).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  ageRating: z.nativeEnum(AgeRating).optional(),
  contentTags: z.array(z.nativeEnum(ContentTag)).optional(),
});

// Query parameters for listing characters
export const listCharactersQuerySchema = z.object({
  search: z.string().max(200).optional(),
  tags: z.array(z.string().uuid()).optional(),
  gender: z.string().max(50).optional(),
  isPublic: z.boolean().optional(),
  skip: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(20),
});

// Type exports
export type CreateCharacterInput = z.infer<typeof createCharacterSchema>;
export type UpdateCharacterInput = z.infer<typeof updateCharacterSchema>;
export type ListCharactersQuery = z.infer<typeof listCharactersQuerySchema>;
