import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../../middleware/auth';
import { isAdmin } from '../../../middleware/authorization';

const router = Router();

/**
 * Middleware to require admin role
 * Uses the existing isAdmin function from authorization middleware
 */
const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.auth?.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  if (!isAdmin(req.auth.user.role)) {
    res.status(403).json({
      success: false,
      message: 'Admin privileges required',
    });
    return;
  }

  next();
};

/**
 * GET /api/v1/admin
 * General admin endpoint - returns admin menu info
 */
router.get('/', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        message: 'Admin API',
        version: 'v1',
        endpoints: {
          analytics: '/api/v1/admin/analytics',
          translations: '/api/v1/admin/translations',
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin info',
    });
  }
});

export default router;
