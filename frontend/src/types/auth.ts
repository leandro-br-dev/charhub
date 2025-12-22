import type { AgeRating, ContentTag } from './characters';

export type OAuthProvider = 'google' | 'facebook';
export type UserRole = 'BASIC' | 'PREMIUM' | 'ADMIN';

export interface AuthUser {
  id: string;
  provider: OAuthProvider;
  providerAccountId?: string;
  username?: string;
  displayName?: string;
  email?: string;
  photo?: string;
  role?: UserRole;
  fullName?: string;
  birthDate?: string;
  gender?: string;
  preferredLanguage?: string;
  hasCompletedWelcome?: boolean;
  maxAgeRating?: AgeRating;
  blockedTags?: ContentTag[];
  token?: string;
  allow_nsfw?: boolean;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: AuthUser;
}