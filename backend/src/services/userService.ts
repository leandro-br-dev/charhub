import { Prisma, $Enums, type User } from '../generated/prisma';
import { prisma } from '../config/database';
import type { AuthenticatedUser, OAuthProvider, UserRole } from '../types';
import { generateUniqueUsername } from '../utils/username';

interface SyncOAuthUserInput {
  provider: OAuthProvider;
  providerAccountId: string;
  email?: string | null;
  displayName?: string | null;
  photo?: string | null;
}

interface UpdateUserProfileParams {
  username?: string | null;
  displayName: string;
  fullName?: string | null;
  birthDate?: Date | null;
  gender?: string | null;
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
    username: record.username ?? undefined,
    displayName: record.displayName ?? undefined,
    email: record.email ?? undefined,
    photo: record.avatarUrl ?? undefined,
    role: record.role as UserRole,
    fullName: record.fullName ?? undefined,
    birthDate: record.birthDate ? record.birthDate.toISOString() : undefined,
    gender: record.gender ?? undefined,
  };
}

export async function syncOAuthUser(input: SyncOAuthUserInput): Promise<AuthenticatedUser> {
  const prismaProvider = providerEnumMap[input.provider];

  try {
    // Check if user exists first
    const existingUser = await prisma.user.findUnique({
      where: {
        provider_providerAccountId: {
          provider: prismaProvider,
          providerAccountId: input.providerAccountId,
        },
      },
      select: { id: true, username: true },
    });

    // Generate username only if creating new user or existing user doesn't have one
    const needsUsername = !existingUser || !existingUser.username;
    const username = needsUsername ? await generateUniqueUsername(input.displayName) : undefined;

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
        // Add username if user doesn't have one
        ...(existingUser && !existingUser.username && username ? { username } : {}),
      },
      create: {
        provider: prismaProvider,
        providerAccountId: input.providerAccountId,
        username: username!,
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

export async function updateUserProfile(userId: string, data: UpdateUserProfileParams): Promise<AuthenticatedUser> {
  const updatePayload: Prisma.UserUpdateInput = {
    displayName: data.displayName,
  };

  if (data.username !== undefined) {
    updatePayload.username = data.username;
  }

  if (data.fullName !== undefined) {
    updatePayload.fullName = data.fullName;
  }

  if (data.birthDate !== undefined) {
    updatePayload.birthDate = data.birthDate;
  }

  if (data.gender !== undefined) {
    updatePayload.gender = data.gender;
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: updatePayload,
    });

    return mapUser(user);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const targetMeta = error.meta?.target;
      const targets = Array.isArray(targetMeta)
        ? targetMeta
        : typeof targetMeta === 'string'
        ? [targetMeta]
        : [];

      if (targets.some(target => target.includes('username'))) {
        throw new Error('Username is already taken.');
      }
    }
    throw error;
  }
}

export async function findUserById(id: string): Promise<AuthenticatedUser | null> {
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? mapUser(user) : null;
}
