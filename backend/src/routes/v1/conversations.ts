import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { translationMiddleware } from '../../middleware/translationMiddleware';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';
import * as conversationService from '../../services/conversationService';
import * as messageService from '../../services/messageService';
import * as assistantService from '../../services/assistantService';
import { SenderType } from '../../generated/prisma';
import { trackFromLLMResponse } from '../../services/llm/llmUsageTracker';
import {
  createConversationSchema,
  updateConversationSchema,
  addParticipantSchema,
  listConversationsQuerySchema,
  updateParticipantSchema,
  discoverConversationsQuerySchema,
} from '../../validators/conversation.validator';
import {
  sendMessageSchema,
  listMessagesQuerySchema,
} from '../../validators/message.validator';
import { sendError, API_ERROR_CODES } from '../../utils/apiErrors';

const router = Router();

/**
 * POST /api/v1/conversations
 * Create a new conversation
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.user?.id;
    if (!userId) {
      sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
      return;
    }

    // Validate input
    const validatedData = createConversationSchema.parse(req.body);

    const conversation = await conversationService.createConversation(
      userId,
      validatedData
    );

    return res.status(201).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      sendError(res, 400, API_ERROR_CODES.VALIDATION_FAILED, {
        details: { errors: error }
      });
      return;
    }

    logger.error({ error }, 'Error creating conversation');
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to create conversation'
    });
    return;
  }
});

/**
 * PATCH /api/v1/conversations/:id/participants/:participantId
 * Update participant configuration (configOverride, representingCharacterId)
 */
router.patch('/:id/participants/:participantId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id, participantId } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED); return;
    }

    // Validate body; we only allow the two fields
    const payload = updateParticipantSchema.parse(req.body);

    await conversationService.updateParticipant(id, participantId, userId, payload);

    return res.json({ success: true, message: 'Participant updated successfully' });
  } catch (error) {
    if (error instanceof Error && (error as any).statusCode) {
      return sendError(res, (error as any).statusCode, API_ERROR_CODES.INTERNAL_ERROR, { message: error.message });
    }
    if (error instanceof Error && 'issues' in error) {
      return sendError(res, 400, API_ERROR_CODES.VALIDATION_FAILED, { details: { errors: error } });
    }
    logger.error({ error }, 'Error updating participant');
    return sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, { message: 'Failed to update participant' });
  }
});

/**
 * GET /api/v1/conversations
 * List conversations for authenticated user
 */
router.get('/', requireAuth, translationMiddleware(), async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.user?.id;
    if (!userId) {
      sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED); return;
    }

    // Parse query parameters
    const filters = listConversationsQuerySchema.parse({
      search: req.query.search,
      projectId: req.query.projectId,
      skip: req.query.skip ? parseInt(req.query.skip as string, 10) : 0,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      sortBy: req.query.sortBy || 'lastMessageAt',
      sortOrder: req.query.sortOrder || 'desc',
    });

    const conversations = await conversationService.listConversations(
      userId,
      filters
    );

    return res.json({
      success: true,
      data: conversations,
      count: conversations.length,
    });
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error,
      });
    }

    logger.error({ error }, 'Error listing conversations');
    return res.status(500).json({
      success: false,
      message: 'Failed to list conversations',
    });
  }
});

/**
 * GET /api/v1/conversations/public
 * Discover public conversations (no auth required)
 */
router.get('/public', async (req: Request, res: Response) => {
  try {
    // Parse query parameters
    const query = discoverConversationsQuerySchema.parse({
      search: req.query.search,
      gender: req.query.gender,
      tags: req.query.tags,
      sortBy: req.query.sortBy || 'popular',
      skip: req.query.skip ? parseInt(req.query.skip as string, 10) : 0,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    });

    const conversations = await conversationService.discoverPublicConversations(query);

    return res.json({
      success: true,
      data: conversations,
      count: conversations.length,
    });
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error,
      });
    }

    logger.error({ error }, 'Error discovering public conversations');
    return res.status(500).json({
      success: false,
      message: 'Failed to discover public conversations',
    });
  }
});

/**
 * GET /api/v1/conversations/:id
 * Get conversation by ID with messages
 */
router.get('/:id', requireAuth, translationMiddleware(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED); return;
    }

    const conversation = await conversationService.getConversationById(
      id,
      userId
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    return res.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    logger.error({ error }, 'Error getting conversation');
    return res.status(500).json({
      success: false,
      message: 'Failed to get conversation',
    });
  }
});

/**
 * PATCH /api/v1/conversations/:id
 * Update conversation (title, settings)
 */
router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED); return;
    }

    // Validate input
    const validatedData = updateConversationSchema.parse(req.body);

    const conversation = await conversationService.updateConversation(
      id,
      userId,
      validatedData
    );

    return res.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error,
      });
    }

    logger.error({ error }, 'Error updating conversation');
    return res.status(500).json({
      success: false,
      message: 'Failed to update conversation',
    });
  }
});


/**
 * DELETE /api/v1/conversations/:id
 * Delete conversation
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED); return;
    }

    await conversationService.deleteConversation(id, userId);

    return res.json({
      success: true,
      message: 'Conversation deleted successfully',
    });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      return res.status(status).json({
        success: false,
        message: error.message,
      });
    }

    logger.error({ error }, 'Error deleting conversation');
    return res.status(500).json({
      success: false,
      message: 'Failed to delete conversation',
    });
  }
});

/**
 * POST /api/v1/conversations/:id/participants
 * Add participant to conversation
 */
router.post(
  '/:id/participants',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.auth?.user?.id;

      if (!userId) {
        sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED); return;
      }

      // Validate input
      const validatedData = addParticipantSchema.parse(req.body);

      const participant = await conversationService.addParticipant(
        id,
        userId,
        validatedData
      );

      return res.status(201).json({
        success: true,
        data: participant,
      });
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error,
        });
      }

      logger.error({ error }, 'Error adding participant');
      return res.status(500).json({
        success: false,
        message: 'Failed to add participant',
      });
    }
  }
);

/**
 * DELETE /api/v1/conversations/:id/participants/:participantId
 * Remove participant from conversation
 */
router.delete(
  '/:id/participants/:participantId',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { id, participantId } = req.params;
      const userId = req.auth?.user?.id;

      if (!userId) {
        sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED); return;
      }

      await conversationService.removeParticipant(id, userId, participantId);

      return res.json({
        success: true,
        message: 'Participant removed successfully',
      });
    } catch (error) {
      logger.error({ error }, 'Error removing participant');
      return res.status(500).json({
        success: false,
        message: 'Failed to remove participant',
      });
    }
  }
);

/**
 * POST /api/v1/conversations/:id/messages
 * Send a message in a conversation
 */
router.post(
  '/:id/messages',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.auth?.user?.id;

      if (!userId) {
        sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED); return;
      }

      // Validate input
      const validatedData = sendMessageSchema.parse({
        ...req.body,
        conversationId: id,
      });

      // Create user message
      const message = await messageService.createMessage({
        conversationId: id,
        senderId: userId,
        senderType: SenderType.USER,
        content: validatedData.content,
        attachments: validatedData.attachments,
        metadata: validatedData.metadata,
      });

      return res.status(201).json({
        success: true,
        data: message,
      });
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error,
        });
      }

      logger.error({ error }, 'Error sending message');
      return res.status(500).json({
        success: false,
        message: 'Failed to send message',
      });
    }
  }
);

/**
 * GET /api/v1/conversations/:id/messages
 * Get messages from a conversation with pagination
 */
router.get(
  '/:id/messages',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.auth?.user?.id;

      if (!userId) {
        sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED); return;
      }

      // Parse query parameters
      const query = listMessagesQuerySchema.parse({
        conversationId: id,
        skip: req.query.skip ? parseInt(req.query.skip as string, 10) : 0,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
        before: req.query.before,
        after: req.query.after,
      });

      const messages = await messageService.listMessages(id, userId, query);

      return res.json({
        success: true,
        data: messages,
        count: messages.length,
      });
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error,
        });
      }

      logger.error({ error }, 'Error getting messages');
      return res.status(500).json({
        success: false,
        message: 'Failed to get messages',
      });
    }
  }
);

/**
 * POST /api/v1/conversations/:id/generate
 * Generate AI response from assistant
 */
router.post(
  '/:id/generate',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { id: conversationId } = req.params;
      const userId = req.auth?.user?.id;
      const { participantId } = req.body;
      const preferredLanguage = req.headers['x-user-language'] as string | undefined;

      logger.info({ conversationId, userId, participantId, body: req.body }, 'Generating AI response for regeneration - START');

      if (!userId) {
        logger.warn({ conversationId }, 'Generate AI: No userId');
        sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED); return;
      }

      if (!participantId) {
        logger.warn({ conversationId, userId }, 'Generate AI: Missing participantId');
        return sendError(res, 400, API_ERROR_CODES.MISSING_REQUIRED_FIELD, { message: 'participantId is required', field: 'participantId' });
      }

      // Step 1: Verify user has access to the conversation
      const conversation = await conversationService.getConversationById(conversationId, userId);
      if (!conversation) {
        logger.warn({ conversationId, userId }, 'Generate AI: Conversation not found or access denied');
        return sendError(res, 404, API_ERROR_CODES.NOT_FOUND, { message: 'Conversation not found or access denied' });
      }

      // Step 2: Use ConversationManagerAgent to determine context (SFW/NSFW)
      const { agentService } = await import('../../services/agentService');
      const conversationManager = agentService.getConversationManagerAgent();
      const lastMessage = (conversation as any).messages[(conversation as any).messages.length - 1];
      const managerResult = await conversationManager.execute(conversation as any, lastMessage);
      const { isNSFW } = managerResult;

      // Step 3: Estimate credit cost
      const { getCurrentBalance, hasEnoughCredits, createTransaction } = await import('../../services/creditService');
      const serviceType = isNSFW ? 'LLM_CHAT_NSFW' : 'LLM_CHAT_SAFE';
      const estimatedTokens = 1000; // Same estimation as websocket flow

      const serviceCost = await prisma.serviceCreditCost.findUnique({
        where: { serviceIdentifier: serviceType },
      });
      const creditsPerThousandTokens = serviceCost?.creditsPerUnit || (isNSFW ? 3 : 2);
      const estimatedCreditCost = Math.ceil((estimatedTokens / 1000) * creditsPerThousandTokens);

      // Step 4: Verify user has enough credits
      const hasCredits = await hasEnoughCredits(userId, estimatedCreditCost);
      if (!hasCredits) {
        const balance = await getCurrentBalance(userId);
        logger.warn({ userId, conversationId, required: estimatedCreditCost, current: balance }, 'Insufficient credits for regeneration');
        return res.status(402).json({ // 402 Payment Required
          success: false,
          error: 'insufficient_credits',
          message: `Insufficient credits. Required: ${estimatedCreditCost}, Available: ${Math.floor(balance)}`,
          required: estimatedCreditCost,
          current: Math.floor(balance),
        });
      }

      logger.info({ userId, estimatedCost: estimatedCreditCost, isNSFW }, 'Credit check passed for regeneration');

      // Step 5: Generate AI response, passing cost info
      const message = await assistantService.sendAIMessage(
        conversationId,
        participantId,
        preferredLanguage,
        estimatedCreditCost,
        isNSFW
      );

      // Step 6: Deduct credits by creating a transaction
      if (estimatedCreditCost > 0) {
        await createTransaction(
          userId,
          'CONSUMPTION',
          -estimatedCreditCost,
          `Chat regeneration (${isNSFW ? 'NSFW' : 'SFW'})`,
          undefined,
          undefined
        );
        logger.info({ userId, creditCost: estimatedCreditCost, messageId: message.id }, 'Credits charged for regeneration');
      }

      // Step 7: Broadcast the regenerated message to all users in the conversation room via WebSocket
      const io = (req.app as any).io;
      if (io) {
        const room = `conversation:${conversationId}`;
        const serializedMessage = {
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          senderType: message.senderType,
          content: message.content,
          attachments: message.attachments ?? null,
          metadata: message.metadata ?? null,
          timestamp: message.timestamp instanceof Date
            ? message.timestamp.toISOString()
            : new Date(message.timestamp).toISOString(),
        };

        io.to(room).emit('message_received', serializedMessage);

        logger.info(
          { conversationId, messageId: message.id, participantId },
          'Broadcasted regenerated message via WebSocket'
        );
      }

      // Step 8: Return the new message
      return res.status(201).json({
        success: true,
        data: message,
      });

    } catch (error) {
      logger.error({ error, conversationId: req.params.id, participantId: req.body.participantId }, 'Error generating AI response');
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate AI response';
      return res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }
);

/**
 * DELETE /api/v1/conversations/:id/messages/:messageId
 * Delete a message from a conversation
 */
router.delete(
  '/:id/messages/:messageId',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { id: conversationId, messageId } = req.params;
      const userId = req.auth?.user?.id;

      if (!userId) {
        sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED); return;
      }

      const result = await messageService.deleteMessage(conversationId, messageId, userId);

      // Broadcast message_deleted event to all users in the conversation room via WebSocket
      const io = (req.app as any).io;
      if (io) {
        const room = `conversation:${conversationId}`;
        io.to(room).emit('message_deleted', {
          conversationId,
          messageId,
          deletedCount: result.deletedCount,
          deletedBy: userId,
        });

        logger.info(
          { conversationId, messageId, deletedCount: result.deletedCount },
          'Broadcasted message_deleted event'
        );
      }

      return res.json({
        success: true,
        message: 'Message deleted successfully',
        data: result,
      });
    } catch (error) {
      const statusCode = (error as any).statusCode || 500;
      const message = error instanceof Error ? error.message : 'Failed to delete message';

      logger.error({ error, statusCode }, 'Error deleting message');

      return res.status(statusCode).json({
        success: false,
        message,
      });
    }
  }
);

/**
 * GET /api/v1/conversations/:id/background
 * Get resolved background for a conversation (auto or manual)
 */
router.get('/:id/background', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED); return;
    }

    // Verify user has access to this conversation (owner OR active member for multi-user)
    const { membershipService } = await import('../../services/membershipService');
    const hasAccess = await membershipService.hasAccess(id, userId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const background = await conversationService.resolveConversationBackground(id);

    return res.json({
      success: true,
      data: background,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error resolving conversation background');

    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to resolve background',
    });
  }
});

/**
 * GET /api/v1/conversations/public
 * List public conversations (discovery feature)
 */
router.get('/public', async (req: Request, res: Response) => {
  try {
    const sortBy = (req.query.sortBy as 'recent' | 'popular') || 'recent';
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const conversations = await conversationService.listPublicConversations({
      sortBy,
      limit,
      offset,
    });

    return res.json({
      success: true,
      data: conversations,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error listing public conversations');

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to list public conversations',
    });
  }
});

/**
 * POST /api/v1/conversations/:id/suggest-reply
 * Generate AI suggestion for user's next reply
 */
router.post('/:id/suggest-reply', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED); return;
    }

    // Get user's preferred language
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferredLanguage: true },
    });

    const userLanguage = user?.preferredLanguage || 'en-US';

    // Verify user owns or has access to the conversation
    const conversation = await conversationService.getConversationById(id, userId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    // Get last 10 messages for context
    const recentMessages = await messageService.listMessages(id, userId!, { conversationId: id, limit: 10, skip: 0 });

    // Build context from messages (or empty if no messages)
    const hasMessages = recentMessages && recentMessages.length > 0;
    const context = hasMessages
      ? recentMessages
          .reverse() // Show in chronological order
          .map((msg) => {
            // Use "User" and "Character" to be clear for the LLM
            const senderName = msg.senderType === 'USER' ? 'User' : 'Character';
            return `${senderName}: ${msg.content}`;
          })
          .join('\n')
      : '';

    // Import LLM service dynamically to avoid circular dependencies
    const { callLLM } = await import('../../services/llm');

    // Determine the appropriate prompt based on whether there are messages
    const systemPrompt = hasMessages
      ? `You are the User. Your task is to generate the User's next reply in a roleplay conversation.
- Analyze the provided conversation context.
- Generate a natural, engaging, and concise reply (1-3 sentences) from the User's perspective.
- IMPORTANT: Speak ONLY as the User. Do NOT generate a response for the Character.
- Respond in ${userLanguage}.`
      : `You are a user starting a new conversation. Your task is to generate a friendly, engaging opening message.
- Keep it concise (1-2 sentences).
- IMPORTANT: Speak ONLY as the user.
- Respond in ${userLanguage}.`;

    const userPrompt = hasMessages
      ? `This is the conversation so far:\n${context}\n\nNow, generate the User's next reply:`
      : `Generate a friendly opening message to start a conversation:`;

    // Generate suggestion using a fast, cheap model
    const suggestion = await callLLM({
      provider: 'gemini',
      model: 'gemini-2.5-flash-lite',
      systemPrompt,
      userPrompt,
      temperature: 0.8, // Slightly lower temperature for more focused responses
      maxTokens: 100,
    });

    // Track LLM usage for cost analysis
    trackFromLLMResponse(suggestion, {
      userId: undefined,
      feature: 'CHAT_MESSAGE',
      featureId: req.params.id,
      operation: 'reply_suggestion',
    });

    return res.json({
      success: true,
      data: {
        suggestion: suggestion.content,
        contextMessages: recentMessages?.length || 0,
      },
    });
  } catch (error: any) {
    logger.error({
      error: error?.message || error,
      stack: error?.stack,
      conversationId: req.params.id
    }, 'Error generating reply suggestion');

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to generate suggestion',
    });
  }
});

export default router;
