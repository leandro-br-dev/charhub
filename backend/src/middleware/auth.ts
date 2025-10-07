import type { NextFunction, Request, Response } from 'express';
import { verifyJWT } from '../services/googleAuth';
import { findUserById } from '../services/userService';
import type { AuthenticatedUser } from '../types';

async function resolveAuthenticatedUser(req: Request, res: Response): Promise<AuthenticatedUser | null> {
  if (req.auth?.user) {
    return req.auth.user;
  }

  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization header missing or malformed' });
    return null;
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'Missing access token' });
    return null;
  }

  try {
    const payload = verifyJWT(token);
    const user = await findUserById(payload.sub);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return null;
    }

    req.auth = { user, token };
    return user;
  } catch (error) {
    req.log.warn({ error }, 'auth_token_verification_failed');
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = await resolveAuthenticatedUser(req, res);
  if (!user) {
    return;
  }
  next();
}

export async function requirePremium(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = await resolveAuthenticatedUser(req, res);
  if (!user) {
    return;
  }

  if (user.role === 'PREMIUM' || user.role === 'ADMIN') {
    next();
    return;
  }

  res.status(403).json({ error: 'Premium subscription required' });
}