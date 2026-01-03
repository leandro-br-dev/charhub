import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../types';

/**
 * CharHub Official user ID (UUID constant)
 * Characters owned by this user can only be edited by ADMINs
 */
export const CHARHUB_OFFICIAL_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Check if user role is ADMIN
 */
export function isAdmin(role: UserRole | undefined): boolean {
  return role === 'ADMIN';
}

/**
 * Check if user can edit a character
 * - User is owner, OR
 * - User is ADMIN and character belongs to CharHub Official
 */
export function canEditCharacter(
  userId: string,
  userRole: UserRole | undefined,
  characterUserId: string
): boolean {
  // User is owner
  if (userId === characterUserId) {
    return true;
  }

  // User is ADMIN and character is official
  if (isAdmin(userRole) && characterUserId === CHARHUB_OFFICIAL_ID) {
    return true;
  }

  return false;
}

/**
 * Require ADMIN role middleware
 * Use this for admin-only routes
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
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
}

/**
 * Require character edit permission middleware
 * Checks if user can edit the character (owner OR admin for official characters)
 */
export async function requireCharacterEditPermission(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.auth?.user?.id;
  const userRole = req.auth?.user?.role;
  const characterId = req.params.id;

  if (!userId) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  if (!characterId) {
    res.status(400).json({
      success: false,
      message: 'Character ID is required',
    });
    return;
  }

  try {
    // Import dynamically to avoid circular dependency
    const { prisma } = await import('../config/database');

    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { userId: true },
    });

    if (!character) {
      res.status(404).json({
        success: false,
        message: 'Character not found',
      });
      return;
    }

    if (!canEditCharacter(userId, userRole, character.userId)) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to edit this character',
      });
      return;
    }

    next();
  } catch (error) {
    req.log.error({ error }, 'Error checking character edit permission');
    res.status(500).json({
      success: false,
      message: 'Failed to verify permissions',
    });
  }
}
