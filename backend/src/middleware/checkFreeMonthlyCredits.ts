/**
 * Middleware to check and grant monthly credits for FREE plan users
 *
 * This middleware should be applied AFTER authentication middleware
 * It automatically grants monthly credits to FREE users who are eligible (30+ days since last grant)
 *
 * Usage:
 * router.get('/some-route', authenticateJWT, checkFreeMonthlyCredits, handler);
 */

import type { NextFunction, Request, Response } from 'express';
import { grantFreeMonthlyCreditsOnLogin } from '../services/creditService';
import { logger } from '../config/logger';

/**
 * Middleware to automatically grant monthly credits for FREE plan users on login/access
 *
 * This runs silently in the background - if credits are granted, logs it but doesn't affect response
 * If an error occurs, logs it but doesn't fail the request
 */
export async function checkFreeMonthlyCredits(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  // Skip if no authenticated user
  if (!req.auth?.user?.id) {
    return next();
  }

  const userId = req.auth.user.id;

  try {
    // Attempt to grant FREE monthly credits if eligible
    // This function has built-in checks:
    // 1. User has active FREE plan
    // 2. 30+ days since last grant
    const creditsGranted = await grantFreeMonthlyCreditsOnLogin(userId);

    if (creditsGranted) {
      logger.info(
        { userId },
        'FREE monthly credits granted on user access'
      );
    }
  } catch (error) {
    // Log error but don't fail the request
    // Credits are a bonus - shouldn't block user's primary action
    logger.error(
      { userId, error },
      'Error checking/granting FREE monthly credits'
    );
  }

  // Always continue to next middleware/handler
  next();
}
