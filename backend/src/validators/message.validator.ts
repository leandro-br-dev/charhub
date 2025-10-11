import { z } from 'zod';
import { SenderType } from '../generated/prisma';

/**
 * Message Validators
 * Based on Prisma schema for Chat System (Phase 2)
 */

// Send message schema
export const sendMessageSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
  content: z.string().min(1, 'Message content is required').max(10000, 'Message content is too long'),
  attachments: z.array(z.string().url('Invalid attachment URL')).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(), // Flexible JSON metadata (emotion, action, etc.)
});

// Create message schema (internal use, includes sender info)
export const createMessageSchema = sendMessageSchema.extend({
  senderId: z.string().uuid('Invalid sender ID'),
  senderType: z.nativeEnum(SenderType),
});

// Query parameters for listing messages
export const listMessagesQuerySchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
  skip: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(50),
  before: z.string().datetime().optional(), // ISO timestamp for pagination
  after: z.string().datetime().optional(), // ISO timestamp for pagination
});

// Delete message schema
export const deleteMessageSchema = z.object({
  messageId: z.string().uuid('Invalid message ID'),
});

// Type exports
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
export type DeleteMessageInput = z.infer<typeof deleteMessageSchema>;
