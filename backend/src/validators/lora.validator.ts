import { z } from 'zod';

/**
 * LoRA Validators
 * For Civitai integration and LoRA management
 */

// Base LoRA schema
const loraBaseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  modelType: z.string().max(50).optional().nullable(),
  baseModel: z.string().max(50).optional().nullable(),
  downloadCount: z.number().int().min(0).optional().default(0),
  modelUrl: z.string().url().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  trainedWords: z.array(z.string()).optional().default([]),
  nsfw: z.boolean().default(false),
  category: z.string().max(100).optional().nullable(),
  term: z.string().max(100).optional().nullable(),
});

// Create LoRA schema
export const createLoraSchema = loraBaseSchema.extend({
  civitaiModelId: z.string().max(100).optional().nullable(),
  civitaiVersionId: z.string().max(100).optional().nullable(),
  filename: z.string().max(500).optional().nullable(),
  filepathRelative: z.string().max(1000).optional().nullable(),
  firstImageUrl: z.string().url().optional().nullable(),
  imageUrls: z.array(z.string().url()).optional().default([]),
  deleted: z.boolean().default(false),
});

// Update LoRA schema
export const updateLoraSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  modelType: z.string().max(50).optional().nullable(),
  baseModel: z.string().max(50).optional().nullable(),
  downloadCount: z.number().int().min(0).optional(),
  modelUrl: z.string().url().optional().nullable(),
  tags: z.array(z.string()).optional(),
  trainedWords: z.array(z.string()).optional(),
  nsfw: z.boolean().optional(),
  filename: z.string().max(500).optional().nullable(),
  filepathRelative: z.string().max(1000).optional().nullable(),
  firstImageUrl: z.string().url().optional().nullable(),
  imageUrls: z.array(z.string().url()).optional(),
  category: z.string().max(100).optional().nullable(),
  term: z.string().max(100).optional().nullable(),
  deleted: z.boolean().optional(),
});

// Import LoRA from Civitai URL
export const importLoraSchema = z.object({
  url: z.string().url('Invalid Civitai URL'),
  characterId: z.string().uuid('Invalid character ID').optional(),
});

// Query parameters for listing LoRAs
export const listLorasQuerySchema = z.object({
  search: z.string().max(200).optional(),
  modelType: z.string().max(50).optional(),
  baseModel: z.string().max(50).optional(),
  category: z.string().max(100).optional(),
  deleted: z.boolean().optional().default(false),
  skip: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(20),
});

// Type exports
export type CreateLoraInput = z.infer<typeof createLoraSchema>;
export type UpdateLoraInput = z.infer<typeof updateLoraSchema>;
export type ImportLoraInput = z.infer<typeof importLoraSchema>;
export type ListLorasQuery = z.infer<typeof listLorasQuerySchema>;
