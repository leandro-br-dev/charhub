import { $Enums, type User } from '../generated/prisma';
import { prisma } from '../config/database';
import type { AuthenticatedUser, OAuthProvider, UserRole } from '../types';

interface SyncOAuthUserInput {
  provider: OAuthProvider;
  providerAccountId: string;
  email?: string | null;
  displayName?: string | null;
  photo?: string | null;
}

const providerEnumMap: Record<OAuthProvider, $Enums.AuthProvider> = {
  google: $Enums.AuthProvider.GOOGLE,
  facebook: $Enums.AuthProvider.FACEBOOK,
};

function mapProvider(provider: $Enums.AuthProvider): OAuthProvider {
  return provider === $Enums.AuthProvider.GOOGLE ? 'google' : 'facebook';
}

function mapUser(record: User): AuthenticatedUser {
  return {
    id: record.id,
    provider: mapProvider(record.provider),
    providerAccountId: record.providerAccountId,
    displayName: record.displayName ?? undefined,
    email: record.email ?? undefined,
    photo: record.avatarUrl ?? undefined,
    role: record.role as UserRole,
  };
}

export async function syncOAuthUser(input: SyncOAuthUserInput): Promise<AuthenticatedUser> {
  const prismaProvider = providerEnumMap[input.provider];

  const user = await prisma.user.upsert({
    where: {
      provider_providerAccountId: {
        provider: prismaProvider,
        providerAccountId: input.providerAccountId,
      },
    },
    update: {
      email: input.email ?? undefined,
      displayName: input.displayName ?? undefined,
      avatarUrl: input.photo ?? undefined,
      lastLoginAt: new Date(),
    },
    create: {
      provider: prismaProvider,
      providerAccountId: input.providerAccountId,
      email: input.email ?? undefined,
      displayName: input.displayName ?? undefined,
      avatarUrl: input.photo ?? undefined,
    },
  });

  return mapUser(user);
}

export async function findUserById(id: string): Promise<AuthenticatedUser | null> {
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? mapUser(user) : null;
}