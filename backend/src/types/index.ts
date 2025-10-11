export type OAuthProvider = 'google' | 'facebook';

export type UserRole = 'BASIC' | 'PREMIUM' | 'ADMIN';

export interface AuthenticatedUser {
  id: string;
  provider: OAuthProvider;
  providerAccountId: string;
  displayName?: string;
  email?: string;
  photo?: string;
  role: UserRole;
  fullName?: string;
  birthDate?: string;
  gender?: string;
}

export interface JwtPayload {
  sub: string;
  provider: OAuthProvider;
  providerAccountId: string;
  role: UserRole;
  email?: string;
  displayName?: string;
  iat?: number;
  exp?: number;
}

export interface AuthContext {
  user: AuthenticatedUser;
  token: string;
}

// Import express type declarations
import './express';