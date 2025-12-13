/**
 * Test authentication helpers
 * Generate JWT tokens for integration tests
 */
import { generateJWT } from '../services/googleAuth';
import { createTestUser } from './factories';
import type { AuthenticatedUser } from '../types';

/**
 * Create a test user and generate JWT token
 */
export async function createAuthenticatedTestUser(overrides: any = {}): Promise<{
  user: any;
  token: string;
}> {
  const user = await createTestUser(overrides);

  const authenticatedUser: AuthenticatedUser = {
    id: user.id,
    provider: user.provider.toLowerCase() as 'google' | 'facebook',
    providerAccountId: user.providerAccountId,
    role: user.role,
    email: user.email || undefined,
    displayName: user.displayName || undefined,
  };

  const token = generateJWT(authenticatedUser);

  return { user, token };
}

/**
 * Generate auth header for requests
 */
export function getAuthHeader(token: string): { Authorization: string } {
  return {
    Authorization: `Bearer ${token}`,
  };
}
