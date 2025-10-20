import { z } from 'zod';

const ISO_DATE_SUFFIX = 'T00:00:00.000Z';

const birthDateSchema = z
  .union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
  .optional()
  .refine(value => {
    if (value === undefined || value === '') {
      return true;
    }
    const date = new Date(value + ISO_DATE_SUFFIX);
    return !Number.isNaN(date.getTime());
  }, 'Birth date must be a valid YYYY-MM-DD value')
  .transform(value => {
    if (value === undefined) {
      return undefined;
    }
    if (value === '') {
      return null;
    }
    return new Date(value + ISO_DATE_SUFFIX);
  });

const displayNameSchema = z
  .string()
  .trim()
  .min(2, 'Display name must contain at least 2 characters')
  .max(120, 'Display name cannot exceed 120 characters');

const genderSchema = z
  .union([
    z.literal('feminine'),
    z.literal('masculine'),
    z.literal('non-binary'),
    z.literal('unspecified'),
  ])
  .optional();

const usernameSchema = z
  .string()
  .trim()
  .min(4, 'Username must contain at least 3 characters after the @')
  .max(21, 'Username cannot exceed 20 characters after the @')
  .regex(/^@[a-zA-Z0-9_]+$/, 'Username must start with @ and contain only letters, numbers, and underscores')
  .optional();

const ageRatingSchema = z.enum(['L', 'TEN', 'TWELVE', 'FOURTEEN', 'SIXTEEN', 'EIGHTEEN']).optional();

const contentTagSchema = z.enum([
  'VIOLENCE',
  'GORE',
  'SEXUAL',
  'NUDITY',
  'LANGUAGE',
  'DRUGS',
  'ALCOHOL',
  'HORROR',
  'PSYCHOLOGICAL',
  'DISCRIMINATION',
  'CRIME',
  'GAMBLING',
]);

const preferredLanguageSchema = z
  .string()
  .trim()
  .min(2, 'Language code must be at least 2 characters')
  .max(10, 'Language code cannot exceed 10 characters')
  .optional()
  .transform(value => {
    if (value === undefined) {
      return undefined;
    }
    return value.length === 0 ? null : value;
  });

export const updateUserProfileSchema = z.object({
  username: usernameSchema.optional(),
  displayName: displayNameSchema.optional(),
  fullName: z
    .string()
    .trim()
    .max(200, 'Full name cannot exceed 200 characters')
    .optional()
    .transform(value => {
      if (value === undefined) {
        return undefined;
      }
      return value.length === 0 ? null : value;
    }),
  birthDate: birthDateSchema.optional(),
  gender: genderSchema.optional(),
  photo: z.string().url().optional(),
  preferredLanguage: preferredLanguageSchema,
  maxAgeRating: ageRatingSchema,
  blockedTags: z.array(contentTagSchema).optional(),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
