import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { logger } from '../../config/logger';
import * as assistantService from '../../services/assistantService';

const router = Router();

/**
 * POST /api/v1/assistants
 * Create a new assistant
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

    const { name, description, instructions, defaultCharacterId, visibility } = req.body;

    if (!name || !instructions) {
      return res.status(400).json({
        success: false,
        message: 'Name and instructions are required',
      });
    }

    const assistant = await assistantService.createAssistant({
      name,
      description,
      instructions,
      defaultCharacterId,
      visibility,
      userId,
    });

    return res.status(201).json({
      success: true,
      data: assistant,
    });
  } catch (error) {
    logger.error({ error }, 'Error creating assistant');
    return res.status(500).json({
      success: false,
      message: 'Failed to create assistant',
    });
  }
});

/**
 * GET /api/v1/assistants/:id
 * Get assistant by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const assistant = await assistantService.getAssistantById(id);

    if (!assistant) {
      return res.status(404).json({
        success: false,
        message: 'Assistant not found',
      });
    }

    // Check if assistant is public or user owns it
    const userId = req.auth?.user?.id;
    if (assistant.visibility !== 'PUBLIC' && assistant.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    return res.json({
      success: true,
      data: assistant,
    });
  } catch (error) {
    logger.error({ error }, 'Error getting assistant');
    return res.status(500).json({
      success: false,
      message: 'Failed to get assistant',
    });
  }
});

/**
 * GET /api/v1/assistants
 * List assistants (public, user's own, or for conversations)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.user?.id;
    const {
      search,
      skip,
      limit,
      userId: filterUserId,
      public: publicOnly,
      forConversation,
    } = req.query;

    let assistants;

    // Special mode for AddParticipantModal
    if (forConversation === 'my' && userId) {
      assistants = await assistantService.getMyAssistantsForConversation(userId, {
        search: typeof search === 'string' ? search : undefined,
        skip: typeof skip === 'string' ? parseInt(skip, 10) : undefined,
        limit: typeof limit === 'string' ? parseInt(limit, 10) : undefined,
      });
    } else if (forConversation === 'public') {
      assistants = await assistantService.getPublicAssistantsForConversation({
        search: typeof search === 'string' ? search : undefined,
        skip: typeof skip === 'string' ? parseInt(skip, 10) : undefined,
        limit: typeof limit === 'string' ? parseInt(limit, 10) : undefined,
      });
    }
    // If filtering by specific user
    else if (filterUserId && typeof filterUserId === 'string') {
      assistants = await assistantService.getAssistantsByUserId(filterUserId, {
        search: typeof search === 'string' ? search : undefined,
        skip: typeof skip === 'string' ? parseInt(skip, 10) : undefined,
        limit: typeof limit === 'string' ? parseInt(limit, 10) : undefined,
      });
    }
    // If user is authenticated and no specific filter
    else if (userId && publicOnly !== 'true') {
      assistants = await assistantService.getAssistantsByUserId(userId, {
        search: typeof search === 'string' ? search : undefined,
        skip: typeof skip === 'string' ? parseInt(skip, 10) : undefined,
        limit: typeof limit === 'string' ? parseInt(limit, 10) : undefined,
      });
    }
    // Otherwise get public assistants
    else {
      assistants = await assistantService.getPublicAssistants({
        search: typeof search === 'string' ? search : undefined,
        skip: typeof skip === 'string' ? parseInt(skip, 10) : undefined,
        limit: typeof limit === 'string' ? parseInt(limit, 10) : undefined,
      });
    }

    return res.json({
      success: true,
      data: assistants,
      count: assistants.length,
    });
  } catch (error) {
    logger.error({ error }, 'Error listing assistants');
    return res.status(500).json({
      success: false,
      message: 'Failed to list assistants',
    });
  }
});

/**
 * PUT /api/v1/assistants/:id
 * Update assistant
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Check ownership
    const isOwner = await assistantService.isAssistantOwner(id, userId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own assistants',
      });
    }

    const { name, description, instructions, defaultCharacterId, visibility } = req.body;

    const assistant = await assistantService.updateAssistant(id, {
      name,
      description,
      instructions,
      defaultCharacterId,
      visibility,
    });

    return res.json({
      success: true,
      data: assistant,
    });
  } catch (error) {
    logger.error({ error }, 'Error updating assistant');
    return res.status(500).json({
      success: false,
      message: 'Failed to update assistant',
    });
  }
});

/**
 * DELETE /api/v1/assistants/:id
 * Delete assistant
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

    // Check ownership
    const isOwner = await assistantService.isAssistantOwner(id, userId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own assistants',
      });
    }

    await assistantService.deleteAssistant(id);

    return res.json({
      success: true,
      message: 'Assistant deleted successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Error deleting assistant');
    return res.status(500).json({
      success: false,
      message: 'Failed to delete assistant',
    });
  }
});

export default router;
