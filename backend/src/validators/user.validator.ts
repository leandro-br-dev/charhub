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

export const updateUserProfileSchema = z.object({
  displayName: displayNameSchema,
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
  birthDate: birthDateSchema,
  gender: genderSchema,
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
