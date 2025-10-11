import { z } from 'zod';

/**
 * Conversation Validators
 * Based on Prisma schema for Chat System (Phase 2)
 */

// Create conversation schema
export const createConversationSchema = z.object({
  title: z.string().min(1, 'Title must include at least 1 character').max(200, 'Title cannot exceed 200 characters').optional().default('New Conversation'),
  participantIds: z.array(z.string().uuid()).min(1, 'At least one participant is required'),
  settings: z.record(z.unknown()).optional().nullable(), // Flexible JSON settings
  projectId: z.string().uuid().optional().nullable(),
});

// Update conversation schema
export const updateConversationSchema = z.object({
  title: z.string().min(1, 'Title must include at least 1 character').max(200, 'Title cannot exceed 200 characters').optional(),
  settings: z.record(z.unknown()).optional().nullable(),
  isTitleUserEdited: z.boolean().optional(),
});

// Add participant schema
export const addParticipantSchema = z.object({
  // XOR constraint: Exactly ONE of these must be provided
  userId: z.string().uuid().optional(),
  actingCharacterId: z.string().uuid().optional(),
  actingAssistantId: z.string().uuid().optional(),

  // Optional: character being represented (required when actingAssistantId is set)
  representingCharacterId: z.string().uuid().optional(),

  // Optional: JSON config override for this participant
  configOverride: z.string().max(5000).optional().nullable(),
}).refine(
  (data) => {
    // Exactly one of userId, actingCharacterId, or actingAssistantId must be set
    const setFields = [data.userId, data.actingCharacterId, data.actingAssistantId].filter(Boolean);
    return setFields.length === 1;
  },
  {
    message: 'Exactly one of userId, actingCharacterId, or actingAssistantId must be provided',
  }
).refine(
  (data) => {
    // If actingAssistantId is set, representingCharacterId should be set
    if (data.actingAssistantId && !data.representingCharacterId) {
      return false;
    }
    return true;
  },
  {
    message: 'representingCharacterId is required when actingAssistantId is provided',
  }
);

// Query parameters for listing conversations
export const listConversationsQuerySchema = z.object({
  search: z.string().max(200).optional(),
  projectId: z.string().uuid().optional(),
  skip: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.union([z.literal('lastMessageAt'), z.literal('createdAt'), z.literal('updatedAt')]).default('lastMessageAt'),
  sortOrder: z.union([z.literal('asc'), z.literal('desc')]).default('desc'),
});

// Type exports
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
export type AddParticipantInput = z.infer<typeof addParticipantSchema>;
export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;
