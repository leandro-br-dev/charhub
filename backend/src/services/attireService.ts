import { Prisma } from '../generated/prisma';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import type { CreateAttireInput, UpdateAttireInput } from '../validators';

/**
 * Attire Service
 *
 * Handles clothing/appearance system for characters.
 */

// Include options for attire queries
const attireInclude = {
  owner: {
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
    },
  },
  charactersUsingAsMain: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatar: true,
    },
    take: 5,
  },
  characters: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatar: true,
    },
    take: 10,
  },
} as const;

/**
 * Create a new attire
 */
export async function createAttire(data: CreateAttireInput) {
  try {
    const { contentTags, ...attireData } = data;

    const attire = await prisma.attire.create({
      data: {
        ...attireData,
        contentTags: contentTags || [],
      },
      include: attireInclude,
    });

    logger.info(
      { attireId: attire.id, userId: data.userId },
      'Attire created successfully'
    );

    return attire;
  } catch (error) {
    logger.error({ error, data }, 'Error creating attire');
    throw error;
  }
}

/**
 * Get attire by ID
 */
export async function getAttireById(attireId: string) {
  try {
    const attire = await prisma.attire.findUnique({
      where: { id: attireId },
      include: attireInclude,
    });

    if (!attire) {
      return null;
    }

    return attire;
  } catch (error) {
    logger.error({ error, attireId }, 'Error getting attire by ID');
    throw error;
  }
}

/**
 * Get attires by user ID
 */
export async function getAttiresByUserId(
  userId: string,
  options?: {
    search?: string;
    gender?: string;
    skip?: number;
    limit?: number;
  }
) {
  try {
    const { search, gender, skip = 0, limit = 20 } = options || {};

    const where: Prisma.AttireWhereInput = {
      userId,
    };

    // Add search filter
    if (search && search.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Add gender filter
    if (gender && gender !== 'all') {
      where.gender = gender;
    }

    const attires = await prisma.attire.findMany({
      where,
      include: attireInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    logger.debug(
      { userId, filters: options, count: attires.length },
      'Attires fetched for user'
    );

    return attires;
  } catch (error) {
    logger.error({ error, userId, options }, 'Error getting attires by user');
    throw error;
  }
}

/**
 * Get public attires
 */
export async function getPublicAttires(options?: {
  search?: string;
  gender?: string;
  skip?: number;
  limit?: number;
}) {
  try {
    const { search, gender, skip = 0, limit = 20 } = options || {};

    const where: Prisma.AttireWhereInput = {
      isPublic: true,
    };

    // Add search filter
    if (search && search.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Add gender filter
    if (gender && gender !== 'all') {
      where.gender = gender;
    }

    const attires = await prisma.attire.findMany({
      where,
      include: attireInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    logger.debug(
      { filters: options, count: attires.length },
      'Public attires fetched'
    );

    return attires;
  } catch (error) {
    logger.error({ error, options }, 'Error getting public attires');
    throw error;
  }
}

/**
 * Update attire
 */
export async function updateAttire(attireId: string, data: UpdateAttireInput) {
  try {
    const { contentTags, ...updateData } = data;

    const attire = await prisma.attire.update({
      where: { id: attireId },
      data: {
        ...updateData,
        ...(contentTags !== undefined && { contentTags }),
      },
      include: attireInclude,
    });

    logger.info({ attireId }, 'Attire updated successfully');

    return attire;
  } catch (error) {
    logger.error({ error, attireId, data }, 'Error updating attire');
    throw error;
  }
}

/**
 * Delete attire
 */
export async function deleteAttire(attireId: string) {
  try {
    const attire = await prisma.attire.delete({
      where: { id: attireId },
    });

    logger.info({ attireId }, 'Attire deleted successfully');

    return attire;
  } catch (error) {
    logger.error({ error, attireId }, 'Error deleting attire');
    throw error;
  }
}

/**
 * Check if user owns attire
 */
export async function isAttireOwner(
  attireId: string,
  userId: string
): Promise<boolean> {
  try {
    const attire = await prisma.attire.findUnique({
      where: { id: attireId },
      select: { userId: true },
    });

    return attire?.userId === userId;
  } catch (error) {
    logger.error({ error, attireId, userId }, 'Error checking ownership');
    return false;
  }
}

/**
 * Get attire count by user
 */
export async function getAttireCountByUser(userId: string): Promise<number> {
  try {
    return await prisma.attire.count({
      where: { userId },
    });
  } catch (error) {
    logger.error({ error, userId }, 'Error getting attire count');
    throw error;
  }
}
