export type OAuthProvider = 'google' | 'facebook';
export type UserRole = 'BASIC' | 'PREMIUM' | 'ADMIN';

export interface AuthUser {
  id: string;
  provider: OAuthProvider;
  providerAccountId?: string;
  displayName?: string;
  email?: string;
  photo?: string;
  role?: UserRole;
  fullName?: string;
  birthDate?: string;
  gender?: string;
  token?: string;
  allow_nsfw?: boolean;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: AuthUser;
}