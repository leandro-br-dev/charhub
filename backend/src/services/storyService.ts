import { prisma } from '../config/database';
import { createStorySchema } from '../validators/story.validator';
import type { Story, Prisma } from '../generated/prisma';

export async function createStory(data: unknown, authorId: string): Promise<Story> {
  const validatedData = createStorySchema.parse(data);

  const { characterIds, tagIds, ...storyData } = validatedData;

  const story = await prisma.story.create({
    data: {
      ...storyData,
      authorId,
      characters: {
        connect: characterIds?.map((id: string) => ({ id })) || [],
      },
      tags: {
        connect: tagIds?.map((id: string) => ({ id })) || [],
      },
    },
    include: {
      author: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      characters: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
      tags: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
  });

  return story;
}

export async function getStoryById(id: string, userId?: string): Promise<Story | null> {
  const story = await prisma.story.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      characters: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
      tags: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
  });

  if (!story) {
    return null;
  }

  // Check if user has access to this story
  if (!story.isPublic && story.authorId !== userId) {
    return null;
  }

  return story;
}

export async function listStories(params: {
  search?: string;
  tags?: string[];
  ageRatings?: string[];
  contentTags?: string[];
  authorId?: string;
  isPublic?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}): Promise<{ items: Story[]; total: number; page: number; pageSize: number }> {
  const {
    search,
    tags,
    ageRatings,
    contentTags,
    authorId,
    isPublic,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 20,
  } = params;

  const where: Prisma.StoryWhereInput = {};

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { synopsis: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (tags && tags.length > 0) {
    where.tags = {
      some: {
        id: {
          in: tags,
        },
      },
    };
  }

  if (ageRatings && ageRatings.length > 0) {
    where.ageRating = {
      in: ageRatings as any[],
    };
  }

  if (contentTags && contentTags.length > 0) {
    where.contentTags = {
      hasSome: contentTags as any[],
    };
  }

  if (authorId) {
    where.authorId = authorId;
  }

  if (isPublic !== undefined) {
    where.isPublic = isPublic;
  }

  const [items, total] = await Promise.all([
    prisma.story.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        characters: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.story.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize: limit,
  };
}

export async function updateStory(
  id: string,
  data: unknown,
  userId: string
): Promise<Story | null> {
  // Check if story exists and user is the author
  const existingStory = await prisma.story.findUnique({
    where: { id },
    select: { authorId: true },
  });

  if (!existingStory || existingStory.authorId !== userId) {
    return null;
  }

  const validatedData = createStorySchema.partial().parse(data);
  const { characterIds, tagIds, ...storyData } = validatedData;

  const story = await prisma.story.update({
    where: { id },
    data: {
      ...storyData,
      ...(characterIds !== undefined && {
        characters: {
          set: characterIds.map((id: string) => ({ id })),
        },
      }),
      ...(tagIds !== undefined && {
        tags: {
          set: tagIds.map((id: string) => ({ id })),
        },
      }),
    },
    include: {
      author: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      characters: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
      tags: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
  });

  return story;
}

export async function deleteStory(id: string, userId: string): Promise<boolean> {
  // Check if story exists and user is the author
  const existingStory = await prisma.story.findUnique({
    where: { id },
    select: { authorId: true },
  });

  if (!existingStory || existingStory.authorId !== userId) {
    return false;
  }

  await prisma.story.delete({
    where: { id },
  });

  return true;
}

export async function getMyStories(
  userId: string,
  params: {
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'updatedAt' | 'title';
    sortOrder?: 'asc' | 'desc';
  }
): Promise<{ items: Story[]; total: number; page: number; pageSize: number }> {
  return listStories({
    ...params,
    authorId: userId,
  });
}
