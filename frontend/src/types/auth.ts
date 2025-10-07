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
  token?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: AuthUser;
}