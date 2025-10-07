import { Prisma, $Enums, type User } from '../generated/prisma';
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

  try {
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
  } catch (error) {
    // Allow linking Google/Facebook accounts that share the same email address
    if (input.email && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const targetMeta = error.meta?.target;
      const targets = Array.isArray(targetMeta)
        ? targetMeta
        : typeof targetMeta === 'string'
        ? [targetMeta]
        : [];

      if (targets.some(target => target.includes('email'))) {
        const existing = await prisma.user.findUnique({ where: { email: input.email } });

        if (existing) {
          const updated = await prisma.user.update({
            where: { id: existing.id },
            data: {
              provider: prismaProvider,
              providerAccountId: input.providerAccountId,
              displayName: input.displayName ?? undefined,
              avatarUrl: input.photo ?? undefined,
              lastLoginAt: new Date(),
            },
          });

          return mapUser(updated);
        }
      }
    }

    throw error;
  }
}

export async function findUserById(id: string): Promise<AuthenticatedUser | null> {
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? mapUser(user) : null;
}
