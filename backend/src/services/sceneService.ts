import { Prisma, AgeRating, ContentTag, Visibility, VisualStyle } from '../generated/prisma';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

/**
 * Scene Service
 *
 * Handles scene and area management system (FEATURE-022).
 * Scenes represent locations with multiple areas that can be connected.
 * Assets can be placed in areas for interactive storytelling.
 */

// Input types for scene operations
export interface CreateSceneInput {
  name: string;
  description: string;
  shortDescription?: string | null;
  genre?: string | null;
  era?: string | null;
  mood?: string | null;
  style?: VisualStyle | null;
  imagePrompt?: string | null;
  mapPrompt?: string | null;
  coverImageUrl?: string | null;
  mapImageUrl?: string | null;
  ageRating?: AgeRating;
  contentTags?: ContentTag[];
  visibility?: Visibility;
  authorId: string;
  originalLanguageCode?: string | null;
  tagIds?: string[];
  initialAreas?: CreateAreaInput[];
}

export interface UpdateSceneInput {
  name?: string;
  description?: string;
  shortDescription?: string | null;
  genre?: string | null;
  era?: string | null;
  mood?: string | null;
  style?: VisualStyle | null;
  imagePrompt?: string | null;
  mapPrompt?: string | null;
  coverImageUrl?: string | null;
  mapImageUrl?: string | null;
  ageRating?: AgeRating;
  contentTags?: ContentTag[];
  visibility?: Visibility;
  tagIds?: string[];
}

export interface ListScenesFilters {
  authorId?: string;
  genre?: string;
  mood?: string;
  era?: string;
  search?: string;
  visibility?: Visibility;
  style?: string;
  skip?: number;
  limit?: number;
}

// Input types for area operations
export interface CreateAreaInput {
  name: string;
  description: string;
  shortDescription?: string | null;
  imagePrompt?: string | null;
  mapPrompt?: string | null;
  environmentImageUrl?: string | null;
  mapImageUrl?: string | null;
  displayOrder?: number;
  isAccessible?: boolean;
  originalLanguageCode?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export interface UpdateAreaInput {
  name?: string;
  description?: string;
  shortDescription?: string | null;
  imagePrompt?: string | null;
  mapPrompt?: string | null;
  environmentImageUrl?: string | null;
  mapImageUrl?: string | null;
  displayOrder?: number;
  isAccessible?: boolean;
  metadata?: Prisma.InputJsonValue;
}

// Input types for asset-area linking
export interface LinkAssetToAreaInput {
  areaId: string;
  assetId: string;
  position?: string | null;
  isHidden?: boolean;
  isInteractable?: boolean;
  discoveryHint?: string | null;
  metadata?: Prisma.InputJsonValue;
  displayOrder?: number;
}

export interface UpdateAreaAssetInput {
  position?: string | null;
  isHidden?: boolean;
  isInteractable?: boolean;
  discoveryHint?: string | null;
  metadata?: Prisma.InputJsonValue;
  displayOrder?: number;
}

// Input types for area connections
export interface ConnectAreasInput {
  fromAreaId: string;
  toAreaId: string;
  direction?: string | null;
  description?: string | null;
  isLocked?: boolean;
  lockHint?: string | null;
}

export interface UpdateConnectionInput {
  direction?: string | null;
  description?: string | null;
  isLocked?: boolean;
  lockHint?: string | null;
}

// Include options for scene queries
const sceneInclude = {
  author: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
    },
  },
  areas: {
    orderBy: {
      displayOrder: 'asc' as const,
    },
    include: {
      assets: {
        include: {
          asset: {
            select: {
              id: true,
              name: true,
              description: true,
              type: true,
              category: true,
              previewImageUrl: true,
            },
          },
        },
        orderBy: {
          displayOrder: 'asc' as const,
        },
      },
      connections: {
        include: {
          toArea: {
            select: {
              id: true,
              name: true,
              shortDescription: true,
            },
          },
        },
      },
      connectedFrom: {
        include: {
          fromArea: {
            select: {
              id: true,
              name: true,
              shortDescription: true,
            },
          },
        },
      },
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
      areas: true,
    },
  },
} as const;

// Include options for area queries
const areaInclude = {
  scene: {
    select: {
      id: true,
      name: true,
      shortDescription: true,
      visibility: true,
      authorId: true,
    },
  },
  assets: {
    include: {
      asset: {
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          category: true,
          previewImageUrl: true,
        },
      },
    },
    orderBy: {
      displayOrder: 'asc' as const,
    },
  },
  connections: {
    include: {
      toArea: {
        select: {
          id: true,
          name: true,
          shortDescription: true,
        },
      },
    },
  },
  connectedFrom: {
    include: {
      fromArea: {
        select: {
          id: true,
          name: true,
          shortDescription: true,
        },
      },
    },
  },
  images: {
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
} as const;

// ============================================================================
// SCENE CRUD
// ============================================================================

/**
 * Create a new scene
 */
export async function createScene(data: CreateSceneInput) {
  try {
    const { tagIds, contentTags, style, authorId, initialAreas, ...sceneData } = data;

    const scene = await prisma.scene.create({
      data: {
        ...sceneData,
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
        areas: initialAreas && initialAreas.length > 0
          ? {
              create: initialAreas,
            }
          : undefined,
      } as Prisma.SceneUncheckedCreateInput,
      include: sceneInclude,
    });

    logger.info(
      { sceneId: scene.id, authorId, areaCount: scene.areas.length },
      'Scene created successfully'
    );

    return scene;
  } catch (error) {
    logger.error({ error, data }, 'Error creating scene');
    throw error;
  }
}

/**
 * Get scene by ID
 */
export async function getSceneById(sceneId: string) {
  try {
    const scene = await prisma.scene.findUnique({
      where: { id: sceneId },
      include: sceneInclude,
    });

    if (!scene) {
      return null;
    }

    return scene;
  } catch (error) {
    logger.error({ error, sceneId }, 'Error getting scene by ID');
    throw error;
  }
}

/**
 * List scenes with filters
 */
export async function listScenes(filters: ListScenesFilters) {
  try {
    const {
      authorId,
      genre,
      mood,
      era,
      search,
      visibility,
      style,
      skip = 0,
      limit = 20,
    } = filters;

    const where: Prisma.SceneWhereInput = {};

    // Author filter
    if (authorId) {
      where.authorId = authorId;
    }

    // Genre filter
    if (genre) {
      where.genre = genre;
    }

    // Mood filter
    if (mood) {
      where.mood = mood;
    }

    // Era filter
    if (era) {
      where.era = era;
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
        { shortDescription: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const scenes = await prisma.scene.findMany({
      where,
      include: sceneInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    logger.debug(
      { filters, count: scenes.length },
      'Scenes listed successfully'
    );

    return scenes;
  } catch (error) {
    logger.error({ error, filters }, 'Error listing scenes');
    throw error;
  }
}

/**
 * Full-text search for scenes
 */
export async function searchScenes(query: string, options?: {
  genre?: string;
  mood?: string;
  authorId?: string;
  skip?: number;
  limit?: number;
}) {
  try {
    const {
      genre,
      mood,
      authorId,
      skip = 0,
      limit = 20,
    } = options || {};

    const where: Prisma.SceneWhereInput = {};

    if (authorId) {
      where.authorId = authorId;
    }

    if (genre) {
      where.genre = genre;
    }

    if (mood) {
      where.mood = mood;
    }

    if (query && query.trim()) {
      const searchTerm = query.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { shortDescription: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const scenes = await prisma.scene.findMany({
      where,
      include: sceneInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    logger.debug(
      { query, options, count: scenes.length },
      'Scene search completed'
    );

    return scenes;
  } catch (error) {
    logger.error({ error, query, options }, 'Error searching scenes');
    throw error;
  }
}

/**
 * Update scene
 */
export async function updateScene(sceneId: string, data: UpdateSceneInput) {
  try {
    const { tagIds, contentTags, style, ...updateData } = data;

    // Handle tag updates
    const scene = await prisma.scene.update({
      where: { id: sceneId },
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
      } as Prisma.SceneUncheckedUpdateInput,
      include: sceneInclude,
    });

    logger.info({ sceneId }, 'Scene updated successfully');

    return scene;
  } catch (error) {
    logger.error({ error, sceneId, data }, 'Error updating scene');
    throw error;
  }
}

/**
 * Delete scene (and all areas)
 */
export async function deleteScene(sceneId: string) {
  try {
    const scene = await prisma.scene.delete({
      where: { id: sceneId },
    });

    logger.info({ sceneId }, 'Scene deleted successfully');

    return scene;
  } catch (error) {
    logger.error({ error, sceneId }, 'Error deleting scene');
    throw error;
  }
}

// ============================================================================
// AREA MANAGEMENT
// ============================================================================

/**
 * Add area to scene
 */
export async function addArea(sceneId: string, data: CreateAreaInput) {
  try {
    const area = await prisma.sceneArea.create({
      data: {
        ...data,
        sceneId,
      },
      include: areaInclude,
    });

    logger.info(
      { sceneId, areaId: area.id },
      'Area added to scene successfully'
    );

    return area;
  } catch (error) {
    logger.error({ error, sceneId, data }, 'Error adding area to scene');
    throw error;
  }
}

/**
 * Update area
 */
export async function updateArea(areaId: string, data: UpdateAreaInput) {
  try {
    const area = await prisma.sceneArea.update({
      where: { id: areaId },
      data,
      include: areaInclude,
    });

    logger.info({ areaId }, 'Area updated successfully');

    return area;
  } catch (error) {
    logger.error({ error, areaId, data }, 'Error updating area');
    throw error;
  }
}

/**
 * Remove area
 */
export async function removeArea(areaId: string) {
  try {
    const area = await prisma.sceneArea.delete({
      where: { id: areaId },
    });

    logger.info({ areaId }, 'Area removed successfully');

    return area;
  } catch (error) {
    logger.error({ error, areaId }, 'Error removing area');
    throw error;
  }
}

/**
 * Get area detail with all assets and connections
 */
export async function getAreaDetail(areaId: string) {
  try {
    const area = await prisma.sceneArea.findUnique({
      where: { id: areaId },
      include: areaInclude,
    });

    if (!area) {
      return null;
    }

    return area;
  } catch (error) {
    logger.error({ error, areaId }, 'Error getting area detail');
    throw error;
  }
}

/**
 * Get all areas in a scene
 */
export async function getSceneAreas(sceneId: string) {
  try {
    const areas = await prisma.sceneArea.findMany({
      where: {
        sceneId,
      },
      include: areaInclude,
      orderBy: {
        displayOrder: 'asc',
      },
    });

    logger.debug(
      { sceneId, count: areas.length },
      'Scene areas fetched'
    );

    return areas;
  } catch (error) {
    logger.error({ error, sceneId }, 'Error getting scene areas');
    throw error;
  }
}

// ============================================================================
// ASSET-AREA LINKING
// ============================================================================

/**
 * Link asset to area
 */
export async function linkAssetToArea(areaId: string, assetId: string, data?: Omit<LinkAssetToAreaInput, 'areaId' | 'assetId'>) {
  try {
    const areaAsset = await prisma.sceneAreaAsset.create({
      data: {
        areaId,
        assetId,
        position: data?.position,
        isHidden: data?.isHidden ?? false,
        isInteractable: data?.isInteractable ?? true,
        discoveryHint: data?.discoveryHint,
        metadata: data?.metadata,
        displayOrder: data?.displayOrder ?? 0,
      },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
            category: true,
            previewImageUrl: true,
          },
        },
        area: {
          select: {
            id: true,
            name: true,
            sceneId: true,
          },
        },
      },
    });

    logger.info(
      { areaId, assetId },
      'Asset linked to area successfully'
    );

    return areaAsset;
  } catch (error) {
    logger.error({ error, areaId, assetId, data }, 'Error linking asset to area');
    throw error;
  }
}

/**
 * Unlink asset from area
 */
export async function unlinkAssetFromArea(areaId: string, assetId: string) {
  try {
    const areaAsset = await prisma.sceneAreaAsset.delete({
      where: {
        areaId_assetId: {
          areaId,
          assetId,
        },
      },
    });

    logger.info(
      { areaId, assetId },
      'Asset unlinked from area successfully'
    );

    return areaAsset;
  } catch (error) {
    logger.error({ error, areaId, assetId }, 'Error unlinking asset from area');
    throw error;
  }
}

/**
 * Get all assets in an area
 */
export async function getAreaAssets(areaId: string) {
  try {
    const areaAssets = await prisma.sceneAreaAsset.findMany({
      where: {
        areaId,
      },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
            category: true,
            previewImageUrl: true,
          },
        },
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });

    logger.debug(
      { areaId, count: areaAssets.length },
      'Area assets fetched'
    );

    return areaAssets;
  } catch (error) {
    logger.error({ error, areaId }, 'Error getting area assets');
    throw error;
  }
}

/**
 * Update area asset (placement, visibility, etc.)
 */
export async function updateAreaAsset(
  areaId: string,
  assetId: string,
  data: UpdateAreaAssetInput
) {
  try {
    const areaAsset = await prisma.sceneAreaAsset.update({
      where: {
        areaId_assetId: {
          areaId,
          assetId,
        },
      },
      data,
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
            category: true,
            previewImageUrl: true,
          },
        },
        area: {
          select: {
            id: true,
            name: true,
            sceneId: true,
          },
        },
      },
    });

    logger.info(
      { areaId, assetId },
      'Area asset updated successfully'
    );

    return areaAsset;
  } catch (error) {
    logger.error({ error, areaId, assetId, data }, 'Error updating area asset');
    throw error;
  }
}

// ============================================================================
// AREA CONNECTIONS
// ============================================================================

/**
 * Connect two areas
 */
export async function connectAreas(fromAreaId: string, toAreaId: string, data?: Omit<ConnectAreasInput, 'fromAreaId' | 'toAreaId'>) {
  try {
    const connection = await prisma.sceneAreaConnection.create({
      data: {
        fromAreaId,
        toAreaId,
        direction: data?.direction,
        description: data?.description,
        isLocked: data?.isLocked ?? false,
        lockHint: data?.lockHint,
      },
      include: {
        fromArea: {
          select: {
            id: true,
            name: true,
            shortDescription: true,
          },
        },
        toArea: {
          select: {
            id: true,
            name: true,
            shortDescription: true,
          },
        },
      },
    });

    logger.info(
      { fromAreaId, toAreaId },
      'Areas connected successfully'
    );

    return connection;
  } catch (error) {
    logger.error({ error, fromAreaId, toAreaId, data }, 'Error connecting areas');
    throw error;
  }
}

/**
 * Disconnect two areas
 */
export async function disconnectAreas(fromAreaId: string, toAreaId: string) {
  try {
    const connection = await prisma.sceneAreaConnection.delete({
      where: {
        fromAreaId_toAreaId: {
          fromAreaId,
          toAreaId,
        },
      },
    });

    logger.info(
      { fromAreaId, toAreaId },
      'Areas disconnected successfully'
    );

    return connection;
  } catch (error) {
    logger.error({ error, fromAreaId, toAreaId }, 'Error disconnecting areas');
    throw error;
  }
}

/**
 * Get all connections for an area
 */
export async function getAreaConnections(areaId: string) {
  try {
    // Get outgoing connections
    const outgoing = await prisma.sceneAreaConnection.findMany({
      where: {
        fromAreaId: areaId,
      },
      include: {
        toArea: {
          select: {
            id: true,
            name: true,
            shortDescription: true,
          },
        },
      },
    });

    // Get incoming connections
    const incoming = await prisma.sceneAreaConnection.findMany({
      where: {
        toAreaId: areaId,
      },
      include: {
        fromArea: {
          select: {
            id: true,
            name: true,
            shortDescription: true,
          },
        },
      },
    });

    const connections = {
      outgoing,
      incoming,
    };

    logger.debug(
      { areaId, outgoing: outgoing.length, incoming: incoming.length },
      'Area connections fetched'
    );

    return connections;
  } catch (error) {
    logger.error({ error, areaId }, 'Error getting area connections');
    throw error;
  }
}

/**
 * Update connection
 */
export async function updateConnection(
  fromAreaId: string,
  toAreaId: string,
  data: UpdateConnectionInput
) {
  try {
    const connection = await prisma.sceneAreaConnection.update({
      where: {
        fromAreaId_toAreaId: {
          fromAreaId,
          toAreaId,
        },
      },
      data,
      include: {
        fromArea: {
          select: {
            id: true,
            name: true,
            shortDescription: true,
          },
        },
        toArea: {
          select: {
            id: true,
            name: true,
            shortDescription: true,
          },
        },
      },
    });

    logger.info(
      { fromAreaId, toAreaId },
      'Connection updated successfully'
    );

    return connection;
  } catch (error) {
    logger.error({ error, fromAreaId, toAreaId, data }, 'Error updating connection');
    throw error;
  }
}

// ============================================================================
// CONTEXT BUILDERS
// ============================================================================

/**
 * Build text context of scene for LLM
 * This creates a comprehensive text description of the scene and all its areas
 */
export async function buildSceneContext(sceneId: string): Promise<string> {
  try {
    const scene = await getSceneById(sceneId);

    if (!scene) {
      return '';
    }

    const contextParts: string[] = [];

    // Scene header
    contextParts.push(`# ${scene.name}`);
    contextParts.push('');

    if (scene.description) {
      contextParts.push(scene.description);
      contextParts.push('');
    }

    // Classification
    const classificationParts: string[] = [];
    if (scene.genre) classificationParts.push(`Genre: ${scene.genre}`);
    if (scene.era) classificationParts.push(`Era: ${scene.era}`);
    if (scene.mood) classificationParts.push(`Mood: ${scene.mood}`);
    if (classificationParts.length > 0) {
      contextParts.push(classificationParts.join(' | '));
      contextParts.push('');
    }

    // Areas
    if (scene.areas && scene.areas.length > 0) {
      contextParts.push('## Areas:');
      contextParts.push('');

      for (const area of scene.areas) {
        contextParts.push(`### ${area.name}`);
        if (area.shortDescription) {
          contextParts.push(area.shortDescription);
        }
        if (area.description) {
          contextParts.push(area.description);
        }

        // Assets in area
        const visibleAssets = area.assets.filter(aa => !aa.isHidden);
        if (visibleAssets.length > 0) {
          contextParts.push('');
          contextParts.push('**Items in this area:**');
          visibleAssets.forEach(aa => {
            const asset = aa.asset;
            let assetDesc = `- ${asset.name}`;
            if (aa.position) {
              assetDesc += ` (${aa.position})`;
            }
            if (asset.description) {
              assetDesc += `: ${asset.description}`;
            }
            contextParts.push(assetDesc);
          });
        }

        // Connections
        if (area.connections && area.connections.length > 0) {
          contextParts.push('');
          contextParts.push('**Exits:**');
          area.connections.forEach(conn => {
            let exitDesc = `- ${conn.toArea.name}`;
            if (conn.direction) {
              exitDesc += ` (${conn.direction})`;
            }
            if (conn.isLocked && conn.lockHint) {
              exitDesc += ` [LOCKED: ${conn.lockHint}]`;
            }
            if (conn.description) {
              exitDesc += ` - ${conn.description}`;
            }
            contextParts.push(exitDesc);
          });
        }

        contextParts.push('');
      }
    }

    const context = contextParts.join('\n');

    logger.debug(
      { sceneId, areaCount: scene.areas.length, contextLength: context.length },
      'Scene context built'
    );

    return context;
  } catch (error) {
    logger.error({ error, sceneId }, 'Error building scene context');
    throw error;
  }
}

/**
 * Build text context of area for LLM
 * This creates a detailed text description of a specific area
 */
export async function buildAreaContext(areaId: string): Promise<string> {
  try {
    const area = await getAreaDetail(areaId);

    if (!area) {
      return '';
    }

    const contextParts: string[] = [];

    // Area header
    contextParts.push(`# ${area.name}`);
    contextParts.push('');

    if (area.description) {
      contextParts.push(area.description);
      contextParts.push('');
    }

    // Scene context
    if (area.scene) {
      contextParts.push(`**Location:** ${area.scene.name}`);
      if (area.scene.shortDescription) {
        contextParts.push(`(${area.scene.shortDescription})`);
      }
      contextParts.push('');
    }

    // Assets
    const visibleAssets = area.assets.filter(aa => !aa.isHidden);
    if (visibleAssets.length > 0) {
      contextParts.push('## Items:');
      visibleAssets.forEach(aa => {
        const asset = aa.asset;
        let assetDesc = `- **${asset.name}**`;
        if (aa.position) {
          assetDesc += ` (${aa.position})`;
        }
        if (asset.description) {
          assetDesc += `: ${asset.description}`;
        }
        if (aa.discoveryHint) {
          assetDesc += ` [Hint: ${aa.discoveryHint}]`;
        }
        contextParts.push(assetDesc);
      });
      contextParts.push('');
    }

    // Hidden assets (for GM/debug view)
    const hiddenAssets = area.assets.filter(aa => aa.isHidden);
    if (hiddenAssets.length > 0) {
      contextParts.push('## Hidden Items:');
      hiddenAssets.forEach(aa => {
        const asset = aa.asset;
        let assetDesc = `- **${asset.name}**`;
        if (aa.position) {
          assetDesc += ` (${aa.position})`;
        }
        if (aa.discoveryHint) {
          assetDesc += ` [Hint: ${aa.discoveryHint}]`;
        }
        contextParts.push(assetDesc);
      });
      contextParts.push('');
    }

    // Exits
    if (area.connections && area.connections.length > 0) {
      contextParts.push('## Exits:');
      area.connections.forEach(conn => {
        let exitDesc = `- **${conn.toArea.name}**`;
        if (conn.direction) {
          exitDesc += ` (${conn.direction})`;
        }
        if (conn.isLocked) {
          exitDesc += ' [LOCKED]';
          if (conn.lockHint) {
            exitDesc += ` - ${conn.lockHint}`;
          }
        }
        if (conn.description) {
          exitDesc += `\n  ${conn.description}`;
        }
        contextParts.push(exitDesc);
      });
      contextParts.push('');
    }

    // Entrances (incoming connections)
    if (area.connectedFrom && area.connectedFrom.length > 0) {
      contextParts.push('## Entrances (from other areas):');
      area.connectedFrom.forEach(conn => {
        let entranceDesc = `- **${conn.fromArea.name}**`;
        if (conn.direction) {
          entranceDesc += ` (${conn.direction})`;
        }
        if (conn.description) {
          entranceDesc += ` - ${conn.description}`;
        }
        contextParts.push(entranceDesc);
      });
      contextParts.push('');
    }

    const context = contextParts.join('\n');

    logger.debug(
      { areaId, assetCount: area.assets.length, contextLength: context.length },
      'Area context built'
    );

    return context;
  } catch (error) {
    logger.error({ error, areaId }, 'Error building area context');
    throw error;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if user owns scene
 */
export async function isSceneOwner(
  sceneId: string,
  userId: string
): Promise<boolean> {
  try {
    const scene = await prisma.scene.findUnique({
      where: { id: sceneId },
      select: { authorId: true },
    });

    return scene?.authorId === userId;
  } catch (error) {
    logger.error({ error, sceneId, userId }, 'Error checking scene ownership');
    return false;
  }
}

/**
 * Get scene count by user
 */
export async function getSceneCountByUser(userId: string): Promise<number> {
  try {
    return await prisma.scene.count({
      where: { authorId: userId },
    });
  } catch (error) {
    logger.error({ error, userId }, 'Error getting scene count');
    throw error;
  }
}

/**
 * Get public scenes
 */
export async function getPublicScenes(options?: {
  genre?: string;
  mood?: string;
  search?: string;
  skip?: number;
  limit?: number;
}) {
  try {
    const {
      genre,
      mood,
      search,
      skip = 0,
      limit = 20,
    } = options || {};

    const where: Prisma.SceneWhereInput = {
      visibility: Visibility.PUBLIC,
    };

    if (genre) {
      where.genre = genre;
    }

    if (mood) {
      where.mood = mood;
    }

    if (search && search.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { shortDescription: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const scenes = await prisma.scene.findMany({
      where,
      include: sceneInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    logger.debug(
      { filters: options, count: scenes.length },
      'Public scenes fetched'
    );

    return scenes;
  } catch (error) {
    logger.error({ error, options }, 'Error getting public scenes');
    throw error;
  }
}
