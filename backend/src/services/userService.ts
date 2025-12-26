import { Prisma, $Enums, type User } from '../generated/prisma';
import { prisma } from '../config/database';
import type { AuthenticatedUser, OAuthProvider, UserRole } from '../types';
import { generateUniqueUsername } from '../utils/username';
import { grantInitialCredits } from './creditService';

interface SyncOAuthUserInput {
  provider: OAuthProvider;
  providerAccountId: string;
  email?: string | null;
  displayName?: string | null;
  photo?: string | null;
  preferredLanguage?: string | null;
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
  system: $Enums.AuthProvider.SYSTEM,
};

function mapProvider(provider: $Enums.AuthProvider): OAuthProvider {
  switch (provider) {
    case $Enums.AuthProvider.GOOGLE:
      return 'google';
    case $Enums.AuthProvider.FACEBOOK:
      return 'facebook';
    case $Enums.AuthProvider.SYSTEM:
      return 'system';
    default:
      return 'google';
  }
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
    hasCompletedWelcome: record.hasCompletedWelcome,
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

    // Check if user exists before upsert to know if it's a new user
    const existingUserCheck = await prisma.user.findUnique({
      where: {
        provider_providerAccountId: {
          provider: prismaProvider,
          providerAccountId: input.providerAccountId,
        },
      },
    });

    const isNewUser = !existingUserCheck;

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
        ...(input.preferredLanguage && { preferredLanguage: input.preferredLanguage }),
      },
    });

    // Grant initial credits for new users
    if (isNewUser) {
      try {
        await grantInitialCredits(user.id);
      } catch (error) {
        // Log error but don't fail signup
        console.error('Failed to grant initial credits:', error);
      }
    }

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

interface SearchUsersResult {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export async function searchUsers(
  query: string,
  excludeUserIds: string[] = [],
  limit: number = 10
): Promise<SearchUsersResult[]> {
  if (!query || query.length < 2) {
    return [];
  }

  const users = await prisma.user.findMany({
    where: {
      AND: [
        {
          id: {
            notIn: excludeUserIds,
          },
        },
        {
          OR: [
            {
              username: {
                contains: query,
                mode: 'insensitive',
              },
            },
            {
              displayName: {
                contains: query,
                mode: 'insensitive',
              },
            },
          ],
        },
      ],
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
    },
    take: limit,
    orderBy: [
      { displayName: 'asc' },
      { username: 'asc' },
    ],
  });

  return users;
}

// ============================================================================
// WELCOME FLOW & AGE RATING FUNCTIONS
// ============================================================================

// Age rating requirements mapping (minimum age for each rating)
const AGE_RATING_MAP: Record<import('../types').AgeRating, number> = {
  L: 0,           // Livre (All ages)
  TEN: 10,        // 10+
  TWELVE: 12,     // 12+
  FOURTEEN: 14,   // 14+
  SIXTEEN: 16,    // 16+
  EIGHTEEN: 18,   // 18+
};

/**
 * Calculate user's age based on birthdate
 */
export function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Get maximum allowed age rating based on user's age
 */
export function getMaxAllowedAgeRating(birthDate: Date | null): import('../types').AgeRating {
  if (!birthDate) return 'L'; // No birthdate = only "Livre" content

  const age = calculateAge(birthDate);

  if (age >= 18) return 'EIGHTEEN';
  if (age >= 16) return 'SIXTEEN';
  if (age >= 14) return 'FOURTEEN';
  if (age >= 12) return 'TWELVE';
  if (age >= 10) return 'TEN';
  return 'L';
}

/**
 * Validate if requested age rating is allowed for user's age
 */
export function validateAgeRating(
  requestedRating: import('../types').AgeRating,
  birthDate: Date | null
): boolean {
  const maxAllowed = getMaxAllowedAgeRating(birthDate);
  const requestedMinAge = AGE_RATING_MAP[requestedRating];
  const maxAllowedMinAge = AGE_RATING_MAP[maxAllowed];

  return requestedMinAge <= maxAllowedMinAge;
}

/**
 * Update user's welcome flow progress
 */
export async function updateWelcomeProgress(
  userId: string,
  data: Partial<UpdateUserProfileParams>
): Promise<AuthenticatedUser> {
  // Validate birthDate if provided
  if (data.birthDate) {
    const age = calculateAge(data.birthDate);
    if (age < 0 || age > 120) {
      throw new Error('Invalid birthdate');
    }
  }

  // Validate maxAgeRating if provided along with birthDate
  if (data.maxAgeRating && data.birthDate) {
    const isValid = validateAgeRating(data.maxAgeRating, data.birthDate);
    if (!isValid) {
      throw new Error('Age rating exceeds user\'s age');
    }
  }

  // Use existing updateUserProfile function
  return updateUserProfile(userId, data);
}

/**
 * Mark welcome flow as completed
 */
export async function completeWelcome(userId: string): Promise<AuthenticatedUser> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { hasCompletedWelcome: true },
  });

  return mapUser(user);
}

/**
 * Get age rating information for user
 */
export interface AgeRatingInfo {
  hasBirthDate: boolean;
  age: number | null;
  maxAllowedRating: import('../types').AgeRating;
  currentMaxRating: import('../types').AgeRating;
}

export async function getAgeRatingInfo(userId: string): Promise<AgeRatingInfo> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      birthDate: true,
      maxAgeRating: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const hasBirthDate = !!user.birthDate;
  const age = user.birthDate ? calculateAge(user.birthDate) : null;
  const maxAllowedRating = getMaxAllowedAgeRating(user.birthDate);
  const currentMaxRating = user.maxAgeRating as import('../types').AgeRating;

  return {
    hasBirthDate,
    age,
    maxAllowedRating,
    currentMaxRating,
  };
}

/**
 * Get allowed age ratings for a user based on their birthdate
 * Returns all age ratings from L up to their maxAllowedRating
 */
export function getAllowedAgeRatingsForUser(birthDate: Date | null): import('../types').AgeRating[] {
  const maxAllowed = getMaxAllowedAgeRating(birthDate);
  const maxAge = AGE_RATING_MAP[maxAllowed];

  // Return all ratings from L up to maxAllowed
  const allRatings: import('../types').AgeRating[] = ['L', 'TEN', 'TWELVE', 'FOURTEEN', 'SIXTEEN', 'EIGHTEEN'];
  return allRatings.filter(rating => AGE_RATING_MAP[rating] <= maxAge);
}

/**
 * Get content filtering options for a user
 * Returns allowed age ratings and blocked content tags
 */
export interface UserContentFilters {
  allowedAgeRatings: import('../types').AgeRating[];
  blockedTags: import('../types').ContentTag[];
}

export async function getUserContentFilters(userId: string): Promise<UserContentFilters> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      birthDate: true,
      blockedTags: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return {
    allowedAgeRatings: getAllowedAgeRatingsForUser(user.birthDate),
    blockedTags: (user.blockedTags as import('../types').ContentTag[]) || [],
  };
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
    if (character.visibility === 'PUBLIC') {
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
