import { z } from 'zod';

export const createStorySchema = z.object({
  title: z.string().min(1).max(100),
  synopsis: z.string().max(2000).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  initialText: z.string().max(5000).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  coverImage: z.string().url().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  objectives: z.any().optional(),
  characterIds: z.array(z.string().uuid()).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  ageRating: z.enum(['L', 'TEN', 'TWELVE', 'FOURTEEN', 'SIXTEEN', 'EIGHTEEN']).optional(),
  contentTags: z.array(z.enum(['VIOLENCE', 'GORE', 'SEXUAL', 'NUDITY', 'LANGUAGE', 'DRUGS', 'ALCOHOL', 'HORROR', 'PSYCHOLOGICAL', 'DISCRIMINATION', 'CRIME', 'GAMBLING'])).optional(),
  isPublic: z.boolean().optional(),
});
