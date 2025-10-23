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
  displayName?: string;
  fullName?: string | null;
  birthDate?: Date | null;
  gender?: string | null;
  photo?: string | null;
  preferredLanguage?: string | null;
  maxAgeRating?: import('../types').AgeRating;
  blockedTags?: import('../types').ContentTag[];
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
    preferredLanguage: record.preferredLanguage ?? undefined,
    maxAgeRating: record.maxAgeRating as import('../types').AgeRating,
    blockedTags: record.blockedTags as import('../types').ContentTag[],
  };
}

export async function syncOAuthUser(input: SyncOAuthUserInput): Promise<AuthenticatedUser> {
  const prismaProvider = providerEnumMap[input.provider];

  try {
    // Check if user exists first - fetch all relevant fields to check if they're empty
    const existingUser = await prisma.user.findUnique({
      where: {
        provider_providerAccountId: {
          provider: prismaProvider,
          providerAccountId: input.providerAccountId,
        },
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatarUrl: true
      },
    });

    // Generate username only if creating new user or existing user doesn't have one
    const needsUsername = !existingUser || !existingUser.username;
    const username = needsUsername ? await generateUniqueUsername(input.displayName) : undefined;

    // Build update data carefully - only update lastLoginAt and fill empty fields
    const updateData: Prisma.UserUpdateInput = {
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    };

    // Only update fields that are currently empty/null in the database
    if (existingUser) {
      if (!existingUser.email && input.email !== undefined && input.email !== null) {
        updateData.email = input.email;
      }
      if (!existingUser.displayName && input.displayName !== undefined && input.displayName !== null) {
        updateData.displayName = input.displayName;
      }
      if (!existingUser.avatarUrl && input.photo !== undefined && input.photo !== null) {
        updateData.avatarUrl = input.photo;
      }
      // Add username only if existing user doesn't have one and we generated one
      if (!existingUser.username && username) {
        updateData.username = username;
      }
    }

    const user = await prisma.user.upsert({
      where: {
        provider_providerAccountId: {
          provider: prismaProvider,
          providerAccountId: input.providerAccountId,
        },
      },
      update: updateData,
      create: {
        provider: prismaProvider,
        providerAccountId: input.providerAccountId,
        username: username ?? '', // This should never be undefined for new users
        ...(input.email && { email: input.email }),
        ...(input.displayName && { displayName: input.displayName }),
        ...(input.photo && { avatarUrl: input.photo }),
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
          // When linking accounts, only update provider info and lastLoginAt
          // Don't overwrite user's customized data (displayName, avatarUrl)
          const updateLinkData: Prisma.UserUpdateInput = {
            provider: prismaProvider,
            providerAccountId: input.providerAccountId,
            lastLoginAt: new Date(),
          };

          // Only fill empty fields, never overwrite
          if (!existing.displayName && input.displayName) {
            updateLinkData.displayName = input.displayName;
          }
          if (!existing.avatarUrl && input.photo) {
            updateLinkData.avatarUrl = input.photo;
          }

          const updated = await prisma.user.update({
            where: { id: existing.id },
            data: updateLinkData,
          });

          return mapUser(updated);
        }
      }
    }

    throw error;
  }
}

export async function updateUserProfile(userId: string, data: UpdateUserProfileParams): Promise<AuthenticatedUser> {
  const updatePayload: Prisma.UserUpdateInput = {};

  if (data.displayName !== undefined) {
    updatePayload.displayName = data.displayName;
  }

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

  if (data.photo !== undefined) {
    updatePayload.avatarUrl = data.photo;
  }

  if (data.preferredLanguage !== undefined) {
    updatePayload.preferredLanguage = data.preferredLanguage;
  }

  if (data.maxAgeRating !== undefined) {
    updatePayload.maxAgeRating = data.maxAgeRating as $Enums.AgeRating;
  }

  if (data.blockedTags !== undefined) {
    updatePayload.blockedTags = data.blockedTags as $Enums.ContentTag[];
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

export async function checkUsernameAvailability(username: string, currentUserId?: string): Promise<boolean> {
  const existing = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  // If no user found, username is available
  if (!existing) {
    return true;
  }

  // If found user is the current user, it's their own username (available to keep)
  if (currentUserId && existing.id === currentUserId) {
    return true;
  }

  // Username is taken by someone else
  return false;
}

export async function deleteUserAccount(userId: string): Promise<void> {
  const systemUser = await prisma.user.findUnique({
    where: { username: '@system' },
  });

  if (!systemUser) {
    throw new Error('System user not found. Please run the database seed script.');
  }

  const userCharacters = await prisma.character.findMany({
    where: { userId },
  });

  for (const character of userCharacters) {
    if (character.isPublic) {
      await prisma.character.update({
        where: { id: character.id },
        data: { userId: systemUser.id },
      });
    }
  }

  await prisma.user.delete({
    where: { id: userId },
  });
}
