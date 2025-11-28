import { Prisma } from '../generated/prisma';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import type { CreateLoraInput, UpdateLoraInput } from '../validators';

/**
 * LoRA Service
 *
 * Handles LoRA (Low-Rank Adaptation) model management.
 * Supports Civitai integration for importing LoRA models.
 */

// Include options for LoRA queries
const loraInclude = {
  characters: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
    take: 10, // Limit to avoid performance issues
  },
} as const;

/**
 * Create a new LoRA
 */
export async function createLora(data: CreateLoraInput) {
  try {
    const lora = await prisma.lora.create({
      data: {
        ...data,
        tags: data.tags || [],
        trainedWords: data.trainedWords || [],
        imageUrls: data.imageUrls || [],
      },
      include: loraInclude,
    });

    logger.info({ loraId: lora.id }, 'LoRA created successfully');

    return lora;
  } catch (error) {
    logger.error({ error, data }, 'Error creating LoRA');
    throw error;
  }
}

/**
 * Get LoRA by ID
 */
export async function getLoraById(loraId: string) {
  try {
    const lora = await prisma.lora.findUnique({
      where: { id: loraId },
      include: loraInclude,
    });

    if (!lora) {
      return null;
    }

    return lora;
  } catch (error) {
    logger.error({ error, loraId }, 'Error getting LoRA by ID');
    throw error;
  }
}

/**
 * Get LoRA by Civitai IDs
 */
export async function getLoraByCivitaiIds(
  civitaiModelId?: string,
  civitaiVersionId?: string
) {
  try {
    if (!civitaiModelId && !civitaiVersionId) {
      return null;
    }

    const where: Prisma.LoraWhereInput = {
      ...(civitaiModelId && { civitaiModelId }),
      ...(civitaiVersionId && { civitaiVersionId }),
      deleted: false,
    };

    const lora = await prisma.lora.findFirst({
      where,
      include: loraInclude,
    });

    return lora;
  } catch (error) {
    logger.error(
      { error, civitaiModelId, civitaiVersionId },
      'Error getting LoRA by Civitai IDs'
    );
    throw error;
  }
}

/**
 * List LoRAs with filters
 */
export async function listLoras(options?: {
  search?: string;
  modelType?: string;
  baseModel?: string;
  category?: string;
  deleted?: boolean;
  skip?: number;
  limit?: number;
}) {
  try {
    const {
      search,
      modelType,
      baseModel,
      category,
      deleted = false,
      skip = 0,
      limit = 20,
    } = options || {};

    const where: Prisma.LoraWhereInput = {
      deleted,
    };

    // Add search filter
    if (search && search.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { tags: { has: searchTerm } },
        { trainedWords: { has: searchTerm } },
      ];
    }

    // Add modelType filter
    if (modelType) {
      where.modelType = modelType;
    }

    // Add baseModel filter
    if (baseModel) {
      where.baseModel = baseModel;
    }

    // Add category filter
    if (category) {
      where.category = category;
    }

    const loras = await prisma.lora.findMany({
      where,
      include: loraInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    logger.debug({ filters: options, count: loras.length }, 'LoRAs fetched');

    return loras;
  } catch (error) {
    logger.error({ error, options }, 'Error listing LoRAs');
    throw error;
  }
}

/**
 * Update LoRA
 */
export async function updateLora(loraId: string, data: UpdateLoraInput) {
  try {
    const lora = await prisma.lora.update({
      where: { id: loraId },
      data,
      include: loraInclude,
    });

    logger.info({ loraId }, 'LoRA updated successfully');

    return lora;
  } catch (error) {
    logger.error({ error, loraId, data }, 'Error updating LoRA');
    throw error;
  }
}

/**
 * Soft delete LoRA (mark as deleted)
 */
export async function softDeleteLora(loraId: string) {
  try {
    const lora = await prisma.lora.update({
      where: { id: loraId },
      data: { deleted: true },
    });

    logger.info({ loraId }, 'LoRA soft deleted successfully');

    return lora;
  } catch (error) {
    logger.error({ error, loraId }, 'Error soft deleting LoRA');
    throw error;
  }
}

/**
 * Hard delete LoRA (permanent)
 */
export async function deleteLora(loraId: string) {
  try {
    const lora = await prisma.lora.delete({
      where: { id: loraId },
    });

    logger.info({ loraId }, 'LoRA deleted permanently');

    return lora;
  } catch (error) {
    logger.error({ error, loraId }, 'Error deleting LoRA');
    throw error;
  }
}

/**
 * Get LoRAs count
 */
export async function getLorasCount(deleted = false): Promise<number> {
  try {
    return await prisma.lora.count({
      where: { deleted },
    });
  } catch (error) {
    logger.error({ error, deleted }, 'Error getting LoRAs count');
    throw error;
  }
}
