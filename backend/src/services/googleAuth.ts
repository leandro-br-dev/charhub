import jwt from 'jsonwebtoken';
import type { AuthenticatedUser, JwtPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const TOKEN_EXPIRATION = process.env.TOKEN_EXPIRATION || '15m';

export function generateJWT(user: AuthenticatedUser): string {
  const payload: JwtPayload = {
    sub: user.id,
    provider: user.provider,
    providerAccountId: user.providerAccountId,
    role: user.role,
    email: user.email,
    displayName: user.displayName,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRATION,
  } as jwt.SignOptions);
}

export function verifyJWT(token: string): JwtPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}