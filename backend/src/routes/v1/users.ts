import { Router } from 'express';
import { ZodError } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { logger } from '../../config/logger';
import { updateUserProfile } from '../../services/userService';
import { updateUserProfileSchema } from '../../validators';

const router = Router();

router.get('/me', requireAuth, (req, res) => {
  if (!req.auth?.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  res.json({ success: true, data: req.auth.user });
});

router.patch('/me', requireAuth, async (req, res) => {
  if (!req.auth?.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
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
      res.status(400).json({ success: false, error: 'Validation error', details: error.flatten() });
      return;
    }

    logger.error({ error }, 'user_profile_update_failed');
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

export default router;
