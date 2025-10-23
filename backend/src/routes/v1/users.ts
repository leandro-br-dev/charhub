import { Router, type Request } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';
import { requireAuth } from '../../middleware/auth';
import { logger } from '../../config/logger';
import { updateUserProfile, checkUsernameAvailability, deleteUserAccount } from '../../services/userService';
import { r2Service } from '../../services/r2Service';
import { updateUserProfileSchema } from '../../validators';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/me', requireAuth, (req, res) => {
  if (!req.auth?.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  res.json({ success: true, data: req.auth.user });
});

router.get('/check-username/:username', requireAuth, async (req, res) => {
  const { username } = req.params;
  const currentUserId = req.auth?.user?.id;

  if (!username || !username.startsWith('@')) {
    res.status(400).json({ success: false, error: 'Invalid username format' });
    return;
  }

  try {
    const isAvailable = await checkUsernameAvailability(username, currentUserId);
    res.json({ success: true, available: isAvailable });
  } catch (error) {
    logger.error({ error }, 'username_check_failed');
    res.status(500).json({ success: false, error: 'Failed to check username' });
  }
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

router.post('/me/avatar', requireAuth, upload.single('avatar'), async (req: Request, res) => {
  if (!req.auth?.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const uploadedFile = (req as Express.Request).file;
  if (!uploadedFile) {
    res.status(400).json({ success: false, error: 'No file uploaded' });
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
    res.status(500).json({ success: false, error: 'Failed to upload avatar' });
  }
});

router.delete('/me', requireAuth, async (req, res) => {
  if (!req.auth?.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  try {
    await deleteUserAccount(req.auth.user.id);
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    logger.error({ error }, 'user_deletion_failed');
    res.status(500).json({ success: false, error: 'Failed to delete account' });
  }
});

export default router;
