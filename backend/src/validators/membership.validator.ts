import { z } from 'zod';
import { MembershipRole } from '../generated/prisma';

/**
 * Membership Validators
 * For multi-user conversation membership management
 */

// Invite user to conversation
export const inviteUserSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
});

// Kick user from conversation
export const kickUserSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
});

// Update member permissions
export const updateMemberPermissionsSchema = z.object({
  role: z.nativeEnum(MembershipRole).optional(),
  canWrite: z.boolean().optional(),
  canInvite: z.boolean().optional(),
  canModerate: z.boolean().optional(),
}).refine(
  (data) => {
    // At least one field must be provided
    return data.role !== undefined ||
           data.canWrite !== undefined ||
           data.canInvite !== undefined ||
           data.canModerate !== undefined;
  },
  {
    message: 'At least one permission field must be provided',
  }
);

// Transfer ownership
export const transferOwnershipSchema = z.object({
  newOwnerId: z.string().uuid('Invalid user ID format'),
});
