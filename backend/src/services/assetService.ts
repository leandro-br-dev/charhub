import { Prisma, AssetType, AssetCategory, Visibility, VisualStyle, ContentTag } from '../generated/prisma';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

/**
 * Asset Service
 *
 * Handles asset management system for characters (FEATURE-021).
 * Assets include: clothing, accessories, scars, hairstyles, objects, vehicles, furniture, and props.
 */

// Input types for asset operations
export interface CreateAssetInput {
  name: string;
  description: string;
  type: AssetType;
  category: AssetCategory;
  promptPrimary?: string | null;
  promptContext?: string | null;
  negativePrompt?: string | null;
  placementZone?: string | null;
  placementDetail?: string | null;
  previewImageUrl?: string | null;
  style?: VisualStyle | null;
  ageRating?: string;
  contentTags?: ContentTag[];
  visibility?: Visibility;
  authorId: string;
  originalLanguageCode?: string | null;
  tagIds?: string[];
}

export interface UpdateAssetInput {
  name?: string;
  description?: string;
  type?: AssetType;
  category?: AssetCategory;
  promptPrimary?: string | null;
  promptContext?: string | null;
  negativePrompt?: string | null;
  placementZone?: string | null;
  placementDetail?: string | null;
  previewImageUrl?: string | null;
  style?: VisualStyle | null;
  ageRating?: string;
  contentTags?: ContentTag[];
  visibility?: Visibility;
  tagIds?: string[];
}

export interface ListAssetsFilters {
  authorId?: string;
  type?: AssetType;
  category?: AssetCategory;
  search?: string;
  visibility?: Visibility;
  style?: string;
  skip?: number;
  limit?: number;
}

export interface LinkAssetToCharacterInput {
  characterId: string;
  assetId: string;
  placementZone?: string | null;
  placementDetail?: string | null;
  contextNote?: string | null;
  isVisible?: boolean;
  isPrimary?: boolean;
  displayOrder?: number;
}

export interface UpdateCharacterAssetInput {
  placementZone?: string | null;
  placementDetail?: string | null;
  contextNote?: string | null;
  isVisible?: boolean;
  isPrimary?: boolean;
  displayOrder?: number;
}

// Include options for asset queries
const assetInclude = {
  author: {
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
    },
  },
  images: {
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
  tags: {
    include: {
      tag: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
  },
  _count: {
    select: {
      characterAssets: true,
    },
  },
} as const;

/**
 * Create a new asset
 */
export async function createAsset(data: CreateAssetInput) {
  try {
    const { tagIds, contentTags, style, authorId, ...assetData } = data;

    const asset = await prisma.asset.create({
      data: {
        ...assetData,
        authorId,
        contentTags: contentTags || [],
        style: style || null,
        tags: tagIds && tagIds.length > 0
          ? {
              create: tagIds.map(tagId => ({
                tagId,
              })),
            }
          : undefined,
      } as Prisma.AssetUncheckedCreateInput,
      include: assetInclude,
    });

    logger.info(
      { assetId: asset.id, authorId },
      'Asset created successfully'
    );

    return asset;
  } catch (error) {
    logger.error({ error, data }, 'Error creating asset');
    throw error;
  }
}

/**
 * Get asset by ID
 */
export async function getAssetById(assetId: string) {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: assetInclude,
    });

    if (!asset) {
      return null;
    }

    return asset;
  } catch (error) {
    logger.error({ error, assetId }, 'Error getting asset by ID');
    throw error;
  }
}

/**
 * List assets with filters
 */
export async function listAssets(filters: ListAssetsFilters) {
  try {
    const {
      authorId,
      type,
      category,
      search,
      visibility,
      style,
      skip = 0,
      limit = 20,
    } = filters;

    const where: Prisma.AssetWhereInput = {};

    // Author filter
    if (authorId) {
      where.authorId = authorId;
    }

    // Type filter
    if (type) {
      where.type = type;
    }

    // Category filter
    if (category) {
      where.category = category;
    }

    // Visibility filter
    if (visibility) {
      where.visibility = visibility;
    }

    // Style filter
    if (style) {
      where.style = style as VisualStyle;
    }

    // Search filter
    if (search && search.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const assets = await prisma.asset.findMany({
      where,
      include: assetInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    logger.debug(
      { filters, count: assets.length },
      'Assets listed successfully'
    );

    return assets;
  } catch (error) {
    logger.error({ error, filters }, 'Error listing assets');
    throw error;
  }
}

/**
 * Full-text search for assets
 */
export async function searchAssets(query: string, options?: {
  type?: AssetType;
  category?: AssetCategory;
  authorId?: string;
  skip?: number;
  limit?: number;
}) {
  try {
    const {
      type,
      category,
      authorId,
      skip = 0,
      limit = 20,
    } = options || {};

    const where: Prisma.AssetWhereInput = {};

    if (authorId) {
      where.authorId = authorId;
    }

    if (type) {
      where.type = type;
    }

    if (category) {
      where.category = category;
    }

    if (query && query.trim()) {
      const searchTerm = query.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { promptPrimary: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const assets = await prisma.asset.findMany({
      where,
      include: assetInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    logger.debug(
      { query, options, count: assets.length },
      'Asset search completed'
    );

    return assets;
  } catch (error) {
    logger.error({ error, query, options }, 'Error searching assets');
    throw error;
  }
}

/**
 * Update asset
 */
export async function updateAsset(assetId: string, data: UpdateAssetInput) {
  try {
    const { tagIds, contentTags, style, ...updateData } = data;

    // Handle tag updates
    const asset = await prisma.asset.update({
      where: { id: assetId },
      data: {
        ...updateData,
        ...(contentTags !== undefined && { contentTags }),
        ...(style !== undefined && { style }),
        tags: tagIds !== undefined
          ? {
              deleteMany: {},
              create: tagIds.map(tagId => ({
                tagId,
              })),
            }
          : undefined,
      } as Prisma.AssetUncheckedUpdateInput,
      include: assetInclude,
    });

    logger.info({ assetId }, 'Asset updated successfully');

    return asset;
  } catch (error) {
    logger.error({ error, assetId, data }, 'Error updating asset');
    throw error;
  }
}

/**
 * Delete asset
 */
export async function deleteAsset(assetId: string) {
  try {
    const asset = await prisma.asset.delete({
      where: { id: assetId },
    });

    logger.info({ assetId }, 'Asset deleted successfully');

    return asset;
  } catch (error) {
    logger.error({ error, assetId }, 'Error deleting asset');
    throw error;
  }
}

/**
 * Link asset to character
 */
export async function linkAssetToCharacter(
  characterId: string,
  assetId: string,
  data?: Omit<LinkAssetToCharacterInput, 'characterId' | 'assetId'>
) {
  try {
    const characterAsset = await prisma.characterAsset.create({
      data: {
        characterId,
        assetId,
        placementZone: data?.placementZone,
        placementDetail: data?.placementDetail,
        contextNote: data?.contextNote,
        isVisible: data?.isVisible ?? true,
        isPrimary: data?.isPrimary ?? false,
        displayOrder: data?.displayOrder ?? 0,
      },
      include: {
        asset: {
          include: assetInclude,
        },
        character: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info(
      { characterId, assetId },
      'Asset linked to character successfully'
    );

    return characterAsset;
  } catch (error) {
    logger.error({ error, characterId, assetId, data }, 'Error linking asset to character');
    throw error;
  }
}

/**
 * Unlink asset from character
 */
export async function unlinkAssetFromCharacter(characterId: string, assetId: string) {
  try {
    const characterAsset = await prisma.characterAsset.delete({
      where: {
        characterId_assetId: {
          characterId,
          assetId,
        },
      },
    });

    logger.info(
      { characterId, assetId },
      'Asset unlinked from character successfully'
    );

    return characterAsset;
  } catch (error) {
    logger.error({ error, characterId, assetId }, 'Error unlinking asset from character');
    throw error;
  }
}

/**
 * Get all assets for a character
 */
export async function getCharacterAssets(characterId: string) {
  try {
    const characterAssets = await prisma.characterAsset.findMany({
      where: {
        characterId,
      },
      include: {
        asset: {
          include: assetInclude,
        },
      },
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    logger.debug(
      { characterId, count: characterAssets.length },
      'Character assets fetched'
    );

    return characterAssets;
  } catch (error) {
    logger.error({ error, characterId }, 'Error getting character assets');
    throw error;
  }
}

/**
 * Get all characters using an asset
 */
export async function getAssetCharacters(assetId: string) {
  try {
    const characterAssets = await prisma.characterAsset.findMany({
      where: {
        assetId,
      },
      include: {
        character: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    logger.debug(
      { assetId, count: characterAssets.length },
      'Asset characters fetched'
    );

    return characterAssets;
  } catch (error) {
    logger.error({ error, assetId }, 'Error getting asset characters');
    throw error;
  }
}

/**
 * Update character asset (placement, visibility, etc.)
 */
export async function updateCharacterAsset(
  characterId: string,
  assetId: string,
  data: UpdateCharacterAssetInput
) {
  try {
    const characterAsset = await prisma.characterAsset.update({
      where: {
        characterId_assetId: {
          characterId,
          assetId,
        },
      },
      data,
      include: {
        asset: {
          include: assetInclude,
        },
        character: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info(
      { characterId, assetId },
      'Character asset updated successfully'
    );

    return characterAsset;
  } catch (error) {
    logger.error({ error, characterId, assetId, data }, 'Error updating character asset');
    throw error;
  }
}

/**
 * Build text context of all character assets for LLM
 * This creates a comprehensive text description of all assets a character has
 */
export async function buildCharacterAssetContext(characterId: string): Promise<string> {
  try {
    const characterAssets = await getCharacterAssets(characterId);

    if (characterAssets.length === 0) {
      return '';
    }

    const contextParts: string[] = [];

    // Group assets by category for better organization
    const wearableAssets = characterAssets.filter(ca => ca.asset.category === 'WEARABLE');
    const holdableAssets = characterAssets.filter(ca => ca.asset.category === 'HOLDABLE');
    const environmentalAssets = characterAssets.filter(ca => ca.asset.category === 'ENVIRONMENTAL');

    // Build wearable assets section
    if (wearableAssets.length > 0) {
      contextParts.push('## Worn Items:');
      wearableAssets.forEach(ca => {
        const asset = ca.asset;
        const placementInfo = ca.placementDetail || ca.placementZone || '';
        const visibilityText = ca.isVisible ? '' : ' (hidden/secret)';

        let assetDesc = `- ${asset.name}`;
        if (placementInfo) {
          assetDesc += ` (on ${placementInfo})`;
        }
        assetDesc += visibilityText;

        if (asset.description) {
          assetDesc += `: ${asset.description}`;
        }

        if (ca.contextNote) {
          assetDesc += ` [${ca.contextNote}]`;
        }

        contextParts.push(assetDesc);
      });
    }

    // Build holdable assets section
    if (holdableAssets.length > 0) {
      contextParts.push('\n## Held Items:');
      holdableAssets.forEach(ca => {
        const asset = ca.asset;
        const placementInfo = ca.placementDetail || ca.placementZone || '';

        let assetDesc = `- ${asset.name}`;
        if (placementInfo) {
          assetDesc += ` (in ${placementInfo})`;
        }

        if (asset.description) {
          assetDesc += `: ${asset.description}`;
        }

        if (ca.contextNote) {
          assetDesc += ` [${ca.contextNote}]`;
        }

        contextParts.push(assetDesc);
      });
    }

    // Build environmental assets section
    if (environmentalAssets.length > 0) {
      contextParts.push('\n## Environmental Items:');
      environmentalAssets.forEach(ca => {
        const asset = ca.asset;

        let assetDesc = `- ${asset.name}`;

        if (asset.description) {
          assetDesc += `: ${asset.description}`;
        }

        if (ca.contextNote) {
          assetDesc += ` [${ca.contextNote}]`;
        }

        contextParts.push(assetDesc);
      });
    }

    const context = contextParts.join('\n');

    logger.debug(
      { characterId, assetCount: characterAssets.length, contextLength: context.length },
      'Character asset context built'
    );

    return context;
  } catch (error) {
    logger.error({ error, characterId }, 'Error building character asset context');
    throw error;
  }
}

/**
 * Check if user owns asset
 */
export async function isAssetOwner(
  assetId: string,
  userId: string
): Promise<boolean> {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      select: { authorId: true },
    });

    return asset?.authorId === userId;
  } catch (error) {
    logger.error({ error, assetId, userId }, 'Error checking asset ownership');
    return false;
  }
}

/**
 * Get asset count by user
 */
export async function getAssetCountByUser(userId: string): Promise<number> {
  try {
    return await prisma.asset.count({
      where: { authorId: userId },
    });
  } catch (error) {
    logger.error({ error, userId }, 'Error getting asset count');
    throw error;
  }
}

/**
 * Get public assets
 */
export async function getPublicAssets(options?: {
  type?: AssetType;
  category?: AssetCategory;
  search?: string;
  skip?: number;
  limit?: number;
}) {
  try {
    const {
      type,
      category,
      search,
      skip = 0,
      limit = 20,
    } = options || {};

    const where: Prisma.AssetWhereInput = {
      visibility: Visibility.PUBLIC,
    };

    if (type) {
      where.type = type;
    }

    if (category) {
      where.category = category;
    }

    if (search && search.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const assets = await prisma.asset.findMany({
      where,
      include: assetInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    logger.debug(
      { filters: options, count: assets.length },
      'Public assets fetched'
    );

    return assets;
  } catch (error) {
    logger.error({ error, options }, 'Error getting public assets');
    throw error;
  }
}
