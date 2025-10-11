import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { logger } from '../../config/logger';
import * as conversationService from '../../services/conversationService';
import * as messageService from '../../services/messageService';
import * as assistantService from '../../services/assistantService';
import { SenderType } from '../../generated/prisma';
import {
  createConversationSchema,
  updateConversationSchema,
  addParticipantSchema,
  listConversationsQuerySchema,
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
      const { id } = req.params;
      const userId = req.auth?.user?.id;
      const { participantId } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      if (!participantId) {
        return res.status(400).json({
          success: false,
          message: 'participantId is required',
        });
      }

      // Verify user owns the conversation
      const isOwner = await conversationService.isConversationOwner(id, userId);
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'You can only generate responses in your own conversations',
        });
      }

      // Generate and send AI response
      const message = await assistantService.sendAIMessage(id, participantId);

      return res.status(201).json({
        success: true,
        data: message,
      });
    } catch (error) {
      logger.error({ error }, 'Error generating AI response');
      return res.status(500).json({
        success: false,
        message: 'Failed to generate AI response',
      });
    }
  }
);

export default router;
