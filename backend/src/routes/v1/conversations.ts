import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';
import * as conversationService from '../../services/conversationService';
import * as messageService from '../../services/messageService';
import * as assistantService from '../../services/assistantService';
import { SenderType } from '../../generated/prisma';
import {
  createConversationSchema,
  updateConversationSchema,
  addParticipantSchema,
  listConversationsQuerySchema,
  updateParticipantSchema,
} from '../../validators/conversation.validator';
import {
  sendMessageSchema,
  listMessagesQuerySchema,
} from '../../validators/message.validator';

const router = Router();

/**
 * POST /api/v1/conversations
 * Create a new conversation
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
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
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error,
      });
    }

    logger.error({ error }, 'Error creating conversation');
    return res.status(500).json({
      success: false,
      message: 'Failed to create conversation',
    });
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
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Validate body; we only allow the two fields
    const payload = updateParticipantSchema.parse(req.body);

    await conversationService.updateParticipant(id, participantId, userId, payload);

    return res.json({ success: true, message: 'Participant updated successfully' });
  } catch (error) {
    if (error instanceof Error && (error as any).statusCode) {
      return res.status((error as any).statusCode).json({ success: false, message: error.message });
    }
    if (error instanceof Error && 'issues' in error) {
      return res.status(400).json({ success: false, message: 'Validation error', errors: error });
    }
    logger.error({ error }, 'Error updating participant');
    return res.status(500).json({ success: false, message: 'Failed to update participant' });
  }
});

/**
 * GET /api/v1/conversations
 * List conversations for authenticated user
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
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
 * GET /api/v1/conversations/:id
 * Get conversation by ID with messages
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
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
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
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
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
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
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
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
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
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
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
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
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
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

      logger.info({ conversationId, userId, participantId }, 'Generating AI response for regeneration');

      if (!userId) {
        logger.warn({ conversationId }, 'Generate AI: No userId');
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      if (!participantId) {
        logger.warn({ conversationId, userId }, 'Generate AI: Missing participantId');
        return res.status(400).json({ success: false, message: 'participantId is required' });
      }

      // Step 1: Verify user has access to the conversation
      const conversation = await conversationService.getConversationById(conversationId, userId);
      if (!conversation) {
        logger.warn({ conversationId, userId }, 'Generate AI: Conversation not found or access denied');
        return res.status(404).json({ success: false, message: 'Conversation not found or access denied' });
      }

      // Step 2: Use ConversationManagerAgent to determine context (SFW/NSFW)
      const { agentService } = await import('../../services/agentService');
      const conversationManager = agentService.getConversationManagerAgent();
      const lastMessage = conversation.messages[conversation.messages.length - 1];
      const managerResult = await conversationManager.execute(conversation, lastMessage);
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

      // Step 7: Return the new message
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
      const { id, messageId } = req.params;
      const userId = req.auth?.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      await messageService.deleteMessage(id, messageId, userId);

      return res.json({
        success: true,
        message: 'Message deleted successfully',
      });
    } catch (error) {
      logger.error({ error }, 'Error deleting message');
      return res.status(500).json({
        success: false,
        message: 'Failed to delete message',
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
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Verify user has access to this conversation
    const hasAccess = await conversationService.isConversationOwner(id, userId);
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
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
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
            const senderName = msg.senderType === 'USER' ? 'You' : 'Character';
            return `${senderName}: ${msg.content}`;
          })
          .join('\n')
      : '';

    // Import LLM service dynamically to avoid circular dependencies
    const { callLLM } = await import('../../services/llm');

    // Determine the appropriate prompt based on whether there are messages
    const systemPrompt = hasMessages
      ? `You are helping a user write their next message in a roleplay conversation. Suggest a natural, engaging reply that continues the story. Keep it concise (1-3 sentences). Match the tone and style of the conversation. Respond in ${userLanguage}.`
      : `You are helping a user start a new conversation. Suggest a friendly, engaging opening message. Keep it concise (1-2 sentences). Respond in ${userLanguage}.`;

    const userPrompt = hasMessages
      ? `Recent conversation:\n${context}\n\nSuggest the user's next reply:`
      : `Suggest a friendly opening message to start a conversation:`;

    // Generate suggestion using a fast, cheap model
    const suggestion = await callLLM({
      provider: 'gemini',
      model: 'gemini-2.5-flash-lite',
      systemPrompt,
      userPrompt,
      temperature: 0.9,
      maxTokens: 100,
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
