import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { logger } from '../../config/logger';
import { membershipService } from '../../services/membershipService';
import {
  inviteUserSchema,
  kickUserSchema,
  updateMemberPermissionsSchema,
} from '../../validators/membership.validator';

const router = Router();

/**
 * POST /api/v1/conversations/:conversationId/members/invite
 * Invite a user to a conversation
 */
router.post('/:conversationId/members/invite', requireAuth, async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const inviterId = req.auth?.user?.id;

    if (!inviterId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const validatedData = inviteUserSchema.parse(req.body);

    const membership = await membershipService.inviteUser(
      conversationId,
      validatedData.userId,
      inviterId
    );

    return res.status(201).json({
      success: true,
      data: membership,
      message: 'User invited successfully',
    });
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error,
      });
    }

    if (error instanceof Error) {
      logger.error({ error, conversationId: req.params.conversationId }, 'Error inviting user');
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    logger.error({ error }, 'Unknown error inviting user');
    return res.status(500).json({
      success: false,
      message: 'Failed to invite user',
    });
  }
});

/**
 * POST /api/v1/conversations/:conversationId/members/join
 * Accept invitation and join conversation
 */
router.post('/:conversationId/members/join', requireAuth, async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const membership = await membershipService.joinConversation(conversationId, userId);

    return res.json({
      success: true,
      data: membership,
      message: 'Joined conversation successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error({ error, conversationId: req.params.conversationId, userId: req.auth?.user?.id }, 'Error joining conversation');
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    logger.error({ error }, 'Unknown error joining conversation');
    return res.status(500).json({
      success: false,
      message: 'Failed to join conversation',
    });
  }
});

/**
 * POST /api/v1/conversations/:conversationId/members/leave
 * Leave a conversation
 */
router.post('/:conversationId/members/leave', requireAuth, async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    await membershipService.leaveConversation(conversationId, userId);

    return res.json({
      success: true,
      message: 'Left conversation successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error({ error, conversationId: req.params.conversationId, userId: req.auth?.user?.id }, 'Error leaving conversation');
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    logger.error({ error }, 'Unknown error leaving conversation');
    return res.status(500).json({
      success: false,
      message: 'Failed to leave conversation',
    });
  }
});

/**
 * POST /api/v1/conversations/:conversationId/members/kick
 * Kick a user from conversation (requires moderation permission)
 */
router.post('/:conversationId/members/kick', requireAuth, async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const moderatorUserId = req.auth?.user?.id;

    if (!moderatorUserId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const validatedData = kickUserSchema.parse(req.body);

    await membershipService.kickUser(
      conversationId,
      validatedData.userId,
      moderatorUserId
    );

    return res.json({
      success: true,
      message: 'User kicked successfully',
    });
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error,
      });
    }

    if (error instanceof Error) {
      logger.error({ error, conversationId: req.params.conversationId }, 'Error kicking user');
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    logger.error({ error }, 'Unknown error kicking user');
    return res.status(500).json({
      success: false,
      message: 'Failed to kick user',
    });
  }
});

/**
 * GET /api/v1/conversations/:conversationId/members
 * List active members of a conversation
 */
router.get('/:conversationId/members', requireAuth, async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Verify user has access to this conversation
    const hasAccess = await membershipService.hasAccess(conversationId, userId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const members = await membershipService.getActiveMembers(conversationId);

    return res.json({
      success: true,
      data: members,
    });
  } catch (error) {
    logger.error({ error, conversationId: req.params.conversationId }, 'Error listing members');
    return res.status(500).json({
      success: false,
      message: 'Failed to list members',
    });
  }
});

/**
 * PATCH /api/v1/conversations/:conversationId/members/:userId
 * Update member permissions (requires owner/moderator permission)
 */
router.patch('/:conversationId/members/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { conversationId, userId: targetUserId } = req.params;
    const moderatorUserId = req.auth?.user?.id;

    if (!moderatorUserId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const validatedData = updateMemberPermissionsSchema.parse(req.body);

    const updatedMembership = await membershipService.updateMemberPermissions(
      conversationId,
      targetUserId,
      moderatorUserId,
      validatedData
    );

    return res.json({
      success: true,
      data: updatedMembership,
      message: 'Member permissions updated successfully',
    });
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error,
      });
    }

    if (error instanceof Error) {
      logger.error({ error, conversationId: req.params.conversationId }, 'Error updating member permissions');
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    logger.error({ error }, 'Unknown error updating member permissions');
    return res.status(500).json({
      success: false,
      message: 'Failed to update member permissions',
    });
  }
});

/**
 * POST /api/v1/conversations/:conversationId/members/transfer-ownership
 * Transfer conversation ownership (owner only)
 */
router.post('/:conversationId/members/transfer-ownership', requireAuth, async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const currentOwnerId = req.auth?.user?.id;

    if (!currentOwnerId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const validatedData = inviteUserSchema.parse(req.body); // Reuse schema (just needs userId)

    await membershipService.transferOwnership(
      conversationId,
      validatedData.userId,
      currentOwnerId
    );

    return res.json({
      success: true,
      message: 'Ownership transferred successfully',
    });
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error,
      });
    }

    if (error instanceof Error) {
      logger.error({ error, conversationId: req.params.conversationId }, 'Error transferring ownership');
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    logger.error({ error }, 'Unknown error transferring ownership');
    return res.status(500).json({
      success: false,
      message: 'Failed to transfer ownership',
    });
  }
});

/**
 * POST /api/v1/conversations/:conversationId/members/generate-invite-link
 * Generate shareable invite link (owner or members with canInvite permission)
 */
router.post('/:conversationId/members/generate-invite-link', requireAuth, async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const inviterId = req.auth?.user?.id;

    if (!inviterId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Capturar origin da requisição (prioridade: origin header, referer header, fallback para env)
    const origin = req.get('origin') || req.get('referer')?.split('/').slice(0, 3).join('/');

    const link = await membershipService.generateInviteLink(conversationId, inviterId, origin);

    return res.json({
      success: true,
      data: { link },
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error({ error, conversationId: req.params.conversationId }, 'Error generating invite link');
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    logger.error({ error }, 'Unknown error generating invite link');
    return res.status(500).json({
      success: false,
      message: 'Failed to generate invite link',
    });
  }
});

/**
 * POST /api/v1/conversations/:conversationId/members/join-by-token
 * Join conversation using invite token
 */
router.post('/:conversationId/members/join-by-token', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.user?.id;
    const { token } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required',
      });
    }

    const result = await membershipService.acceptInviteByToken(token, userId);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error({ error, conversationId: req.params.conversationId }, 'Error accepting invite');
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    logger.error({ error }, 'Unknown error accepting invite');
    return res.status(500).json({
      success: false,
      message: 'Failed to accept invite',
    });
  }
});

/**
 * PATCH /api/v1/conversations/:conversationId/membership
 * Update current user's membership settings (auto-translate, etc.)
 */
router.patch('/:conversationId/membership', requireAuth, async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { autoTranslateEnabled } = req.body;

    if (typeof autoTranslateEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'autoTranslateEnabled must be a boolean',
      });
    }

    const updatedMembership = await membershipService.updateMembershipSettings(
      conversationId,
      userId,
      { autoTranslateEnabled }
    );

    return res.json({
      success: true,
      data: updatedMembership,
      message: 'Membership settings updated successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error({ error, conversationId: req.params.conversationId }, 'Error updating membership settings');
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    logger.error({ error }, 'Unknown error updating membership settings');
    return res.status(500).json({
      success: false,
      message: 'Failed to update membership settings',
    });
  }
});

/**
 * GET /api/v1/conversations/:conversationId/membership
 * Get current user's membership settings
 */
router.get('/:conversationId/membership', requireAuth, async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const membership = await membershipService.getUserMembership(conversationId, userId);

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'Membership not found',
      });
    }

    return res.json({
      success: true,
      data: membership,
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error({ error, conversationId: req.params.conversationId }, 'Error getting membership settings');
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    logger.error({ error }, 'Unknown error getting membership settings');
    return res.status(500).json({
      success: false,
      message: 'Failed to get membership settings',
    });
  }
});

export default router;
