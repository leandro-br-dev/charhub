import { Router } from 'express';
import { requireAuth, requirePremium } from '../../middleware/auth';

const router = Router();

router.get('/public/ping', (_req, res) => {
  res.json({ status: 'ok', message: 'Public endpoint reachable' });
});

router.get('/protected/me', requireAuth, (req, res) => {
  res.json({ user: req.auth?.user });
});

router.get('/premium/insights', requirePremium, (req, res) => {
  res.json({ message: 'Premium access granted', user: req.auth?.user });
});

export default router;