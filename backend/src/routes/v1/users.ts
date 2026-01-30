import { Router, type Request } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';
import { requireAuth } from '../../middleware/auth';
import { logger } from '../../config/logger';
import {
  updateUserProfile,
  checkUsernameAvailability,
  deleteUserAccount,
  searchUsers,
  updateWelcomeProgress,
  completeWelcome,
  getAgeRatingInfo
} from '../../services/userService';
import { r2Service } from '../../services/r2Service';
import { updateUserProfileSchema } from '../../validators';
import { sendError, API_ERROR_CODES } from '../../utils/apiErrors';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/me', requireAuth, (req, res) => {
  if (!req.auth?.user) {
    sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
    return;
  }

  res.json({ success: true, data: req.auth.user });
});

// Search users by username or display name
router.get('/search', requireAuth, async (req, res) => {
  if (!req.auth?.user) {
    sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
    return;
  }

  const query = req.query.q as string;
  const limitParam = parseInt(req.query.limit as string, 10);
  const limit = isNaN(limitParam) ? 10 : Math.min(limitParam, 20);

  if (!query || query.length < 2) {
    sendError(res, 400, API_ERROR_CODES.INVALID_INPUT, {
      message: 'Search query must be at least 2 characters',
      details: { minLength: 2, providedLength: query?.length || 0 },
      field: 'q'
    });
    return;
  }

  try {
    // Exclude current user from results
    const users = await searchUsers(query, [req.auth.user.id], limit);
    res.json({ success: true, data: users });
  } catch (error) {
    logger.error({ error }, 'user_search_failed');
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to search users'
    });
  }
});

router.get('/check-username/:username', requireAuth, async (req, res) => {
  const { username } = req.params;
  const currentUserId = req.auth?.user?.id;

  if (!username || !username.startsWith('@')) {
    sendError(res, 400, API_ERROR_CODES.INVALID_FORMAT, {
      message: 'Invalid username format',
      details: { requirement: 'Must start with @', provided: username },
      field: 'username'
    });
    return;
  }

  try {
    const isAvailable = await checkUsernameAvailability(username, currentUserId);
    res.json({ success: true, available: isAvailable });
  } catch (error) {
    logger.error({ error }, 'username_check_failed');
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to check username'
    });
  }
});

router.patch('/me', requireAuth, async (req, res) => {
  if (!req.auth?.user) {
    sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
    return;
  }

  try {
    const payload = updateUserProfileSchema.parse(req.body);
    const updated = await updateUserProfile(req.auth.user.id, payload);

    if (req.auth) {
      req.auth.user = updated;
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof ZodError) {
      sendError(res, 400, API_ERROR_CODES.VALIDATION_FAILED, {
        details: { errors: error.flatten() }
      });
      return;
    }

    logger.error({ error }, 'user_profile_update_failed');
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to update profile'
    });
  }
});

router.post('/me/avatar', requireAuth, upload.single('avatar'), async (req: Request, res) => {
  if (!req.auth?.user) {
    sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
    return;
  }

  const uploadedFile = (req as Express.Request).file;
  if (!uploadedFile) {
    sendError(res, 400, API_ERROR_CODES.MISSING_REQUIRED_FIELD, {
      message: 'No file uploaded',
      field: 'avatar'
    });
    return;
  }

  try {
    const { buffer, mimetype } = uploadedFile;
    const key = `avatars/${req.auth.user.id}-${Date.now()}.png`;

    const { publicUrl } = await r2Service.uploadObject({
      key,
      body: buffer,
      contentType: mimetype,
    });

    const updated = await updateUserProfile(req.auth.user.id, { photo: publicUrl });

    if (req.auth) {
      req.auth.user = updated;
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error({ error }, 'avatar_upload_failed');
    sendError(res, 500, API_ERROR_CODES.R2_STORAGE_ERROR, {
      message: 'Failed to upload avatar'
    });
  }
});

router.delete('/me', requireAuth, async (req, res) => {
  if (!req.auth?.user) {
    sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
    return;
  }

  try {
    await deleteUserAccount(req.auth.user.id);
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    logger.error({ error }, 'user_deletion_failed');
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to delete account'
    });
  }
});

// ============================================================================
// WELCOME FLOW ENDPOINTS
// ============================================================================

// Update welcome flow progress
router.patch('/me/welcome-progress', requireAuth, async (req, res) => {
  if (!req.auth?.user) {
    sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
    return;
  }

  try {
    // Validate with Zod schema first
    const payload = updateUserProfileSchema.parse(req.body);
    const updated = await updateWelcomeProgress(req.auth.user.id, payload);

    if (req.auth) {
      req.auth.user = updated;
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof ZodError) {
      sendError(res, 400, API_ERROR_CODES.VALIDATION_FAILED, {
        details: { errors: error.flatten() }
      });
      return;
    }

    if (error instanceof Error) {
      if (error.message === 'Invalid birthdate' || error.message === 'Age rating exceeds user\'s age') {
        sendError(res, 400, API_ERROR_CODES.INVALID_INPUT, {
          message: error.message
        });
        return;
      }
    }

    logger.error({ error }, 'welcome_progress_update_failed');
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to update welcome progress'
    });
  }
});

// Mark welcome flow as completed
router.post('/me/complete-welcome', requireAuth, async (req, res) => {
  if (!req.auth?.user) {
    sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
    return;
  }

  try {
    const updated = await completeWelcome(req.auth.user.id);

    if (req.auth) {
      req.auth.user = updated;
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error({ error }, 'complete_welcome_failed');
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to complete welcome flow'
    });
  }
});

// Get age rating information
router.get('/me/age-rating-info', requireAuth, async (req, res) => {
  if (!req.auth?.user) {
    sendError(res, 401, API_ERROR_CODES.AUTH_REQUIRED);
    return;
  }

  try {
    const info = await getAgeRatingInfo(req.auth.user.id);
    res.json({ success: true, data: info });
  } catch (error) {
    logger.error({ error }, 'age_rating_info_failed');
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to get age rating info'
    });
  }
});

export default router;
