export type OAuthProvider = 'google' | 'facebook' | 'system';

export type UserRole = 'BASIC' | 'PREMIUM' | 'ADMIN' | 'BOT';

export type AgeRating = 'L' | 'TEN' | 'TWELVE' | 'FOURTEEN' | 'SIXTEEN' | 'EIGHTEEN';

export type ContentTag =
  | 'VIOLENCE'
  | 'GORE'
  | 'SEXUAL'
  | 'NUDITY'
  | 'LANGUAGE'
  | 'DRUGS'
  | 'ALCOHOL'
  | 'HORROR'
  | 'PSYCHOLOGICAL'
  | 'DISCRIMINATION'
  | 'CRIME'
  | 'GAMBLING';

export interface AuthenticatedUser {
  id: string;
  provider: OAuthProvider;
  providerAccountId: string;
  username?: string;
  displayName?: string;
  email?: string;
  photo?: string;
  role: UserRole;
  fullName?: string;
  birthDate?: string;
  gender?: string;
  preferredLanguage?: string;
  hasCompletedWelcome?: boolean;
  maxAgeRating?: AgeRating;
  blockedTags?: ContentTag[];
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