import { AgeRating, ContentTag, Prisma } from '../generated/prisma';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

/**
 * Content Classification Service
 *
 * Handles content classification with age ratings and content tags.
 * Supports filtering based on user preferences.
 */

// Type definitions
export interface ClassificationInput {
  ageRating: AgeRating;
  contentTags: ContentTag[];
  reason?: string;
  autoClassified?: boolean;
  reviewedBy?: string;
}

export interface ContentFilter {
  maxAgeRating: AgeRating;
  blockedTags: ContentTag[];
}

// Age rating hierarchy (lower index = less restrictive)
export const AGE_RATING_HIERARCHY: AgeRating[] = [
  AgeRating.L,
  AgeRating.TEN,
  AgeRating.TWELVE,
  AgeRating.FOURTEEN,
  AgeRating.SIXTEEN,
  AgeRating.EIGHTEEN,
];

/**
 * Get numeric value for age rating (for comparison)
 */
export function getAgeRatingLevel(rating: AgeRating): number {
  return AGE_RATING_HIERARCHY.indexOf(rating);
}

/**
 * Check if content passes age rating filter
 */
export function passesAgeRating(
  contentRating: AgeRating,
  maxAllowedRating: AgeRating
): boolean {
  return getAgeRatingLevel(contentRating) <= getAgeRatingLevel(maxAllowedRating);
}

/**
 * Check if content has any blocked tags
 */
export function hasBlockedTags(
  contentTags: ContentTag[],
  blockedTags: ContentTag[]
): boolean {
  return contentTags.some(tag => blockedTags.includes(tag));
}

/**
 * Check if content passes all filters
 */
export function passesContentFilter(
  contentRating: AgeRating,
  contentTags: ContentTag[],
  filter: ContentFilter
): boolean {
  // Check age rating
  if (!passesAgeRating(contentRating, filter.maxAgeRating)) {
    return false;
  }

  // Check blocked tags
  if (hasBlockedTags(contentTags, filter.blockedTags)) {
    return false;
  }

  return true;
}

/**
 * Classify content (create or update classification)
 */
export async function classifyContent(
  contentType: string,
  contentId: string,
  classification: ClassificationInput
) {
  try {
    const data = {
      contentType,
      contentId,
      ageRating: classification.ageRating,
      contentTags: classification.contentTags,
      reason: classification.reason,
      autoClassified: classification.autoClassified ?? true,
      reviewedBy: classification.reviewedBy,
      reviewedAt: classification.reviewedBy ? new Date() : null,
    };

    const result = await prisma.contentClassification.upsert({
      where: {
        contentType_contentId: {
          contentType,
          contentId,
        },
      },
      update: data,
      create: data,
    });

    logger.info(
      { contentType, contentId, ageRating: classification.ageRating },
      'Content classified'
    );

    return result;
  } catch (error) {
    logger.error({ error, contentType, contentId }, 'Error classifying content');
    throw error;
  }
}

/**
 * Get classification for content
 */
export async function getContentClassification(
  contentType: string,
  contentId: string
) {
  return prisma.contentClassification.findUnique({
    where: {
      contentType_contentId: {
        contentType,
        contentId,
      },
    },
  });
}

/**
 * Get all classifications for a content type
 */
export async function getClassificationsByType(contentType: string) {
  return prisma.contentClassification.findMany({
    where: { contentType },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Delete classification
 */
export async function deleteContentClassification(
  contentType: string,
  contentId: string
) {
  return prisma.contentClassification.delete({
    where: {
      contentType_contentId: {
        contentType,
        contentId,
      },
    },
  });
}

/**
 * Get user content filter preferences
 */
export async function getUserContentFilter(userId: string): Promise<ContentFilter> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      maxAgeRating: true,
      blockedTags: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return {
    maxAgeRating: user.maxAgeRating,
    blockedTags: user.blockedTags,
  };
}

/**
 * Update user content filter preferences
 */
export async function updateUserContentFilter(
  userId: string,
  filter: Partial<ContentFilter>
) {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(filter.maxAgeRating && { maxAgeRating: filter.maxAgeRating }),
        ...(filter.blockedTags && { blockedTags: filter.blockedTags }),
      },
      select: {
        id: true,
        maxAgeRating: true,
        blockedTags: true,
      },
    });

    logger.info({ userId, filter }, 'User content filter updated');

    return user;
  } catch (error) {
    logger.error({ error, userId }, 'Error updating user content filter');
    throw error;
  }
}

/**
 * Build Prisma where clause for content filtering
 * Use this to filter content queries based on user preferences
 */
export function buildContentFilterWhereClause(
  filter: ContentFilter
): Prisma.ContentClassificationWhereInput {
  return {
    AND: [
      // Age rating filter
      {
        ageRating: {
          in: AGE_RATING_HIERARCHY.slice(
            0,
            getAgeRatingLevel(filter.maxAgeRating) + 1
          ),
        },
      },
      // Blocked tags filter (content should not have ANY of the blocked tags)
      ...(filter.blockedTags.length > 0
        ? [
            {
              contentTags: {
                isEmpty: true, // Either has no tags
              },
            },
            {
              NOT: {
                contentTags: {
                  hasSome: filter.blockedTags, // Or doesn't have any blocked tags
                },
              },
            },
          ]
        : []),
    ],
  };
}

/**
 * Get filtered content IDs based on user preferences
 * Returns array of content IDs that pass the filter
 */
export async function getFilteredContentIds(
  contentType: string,
  filter: ContentFilter
): Promise<string[]> {
  const whereClause = buildContentFilterWhereClause(filter);

  const classifications = await prisma.contentClassification.findMany({
    where: {
      contentType,
      ...whereClause,
    },
    select: {
      contentId: true,
    },
  });

  return classifications.map(c => c.contentId);
}

/**
 * Auto-classify content based on keywords (basic implementation)
 * In production, this should use ML/AI for better accuracy
 */
export function autoClassifyFromText(text: string): ClassificationInput {
  const lowerText = text.toLowerCase();

  const contentTags: ContentTag[] = [];
  let ageRating: AgeRating = AgeRating.L; // Default to all ages

  // Violence detection
  if (
    lowerText.includes('kill') ||
    lowerText.includes('murder') ||
    lowerText.includes('violence') ||
    lowerText.includes('fight')
  ) {
    contentTags.push(ContentTag.VIOLENCE);
    ageRating = AgeRating.FOURTEEN;
  }

  // Gore detection
  if (
    lowerText.includes('blood') ||
    lowerText.includes('gore') ||
    lowerText.includes('brutal')
  ) {
    contentTags.push(ContentTag.GORE);
    ageRating = AgeRating.SIXTEEN;
  }

  // Sexual content detection
  if (
    lowerText.includes('sex') ||
    lowerText.includes('sexual') ||
    lowerText.includes('erotic')
  ) {
    contentTags.push(ContentTag.SEXUAL);
    ageRating = AgeRating.SIXTEEN;
  }

  // Nudity detection
  if (lowerText.includes('nude') || lowerText.includes('naked')) {
    contentTags.push(ContentTag.NUDITY);
    ageRating = AgeRating.EIGHTEEN;
  }

  // Language detection
  if (
    lowerText.includes('fuck') ||
    lowerText.includes('shit') ||
    lowerText.includes('damn')
  ) {
    contentTags.push(ContentTag.LANGUAGE);
    if (getAgeRatingLevel(ageRating) < getAgeRatingLevel(AgeRating.FOURTEEN)) {
      ageRating = AgeRating.FOURTEEN;
    }
  }

  // Horror detection
  if (
    lowerText.includes('horror') ||
    lowerText.includes('scary') ||
    lowerText.includes('terror')
  ) {
    contentTags.push(ContentTag.HORROR);
    if (getAgeRatingLevel(ageRating) < getAgeRatingLevel(AgeRating.TWELVE)) {
      ageRating = AgeRating.TWELVE;
    }
  }

  // Drugs detection
  if (lowerText.includes('drug') || lowerText.includes('cocaine')) {
    contentTags.push(ContentTag.DRUGS);
    if (getAgeRatingLevel(ageRating) < getAgeRatingLevel(AgeRating.SIXTEEN)) {
      ageRating = AgeRating.SIXTEEN;
    }
  }

  return {
    ageRating,
    contentTags,
    autoClassified: true,
    reason: 'Auto-classified based on content analysis',
  };
}

/**
 * Get content classification statistics
 */
export async function getClassificationStats() {
  const [
    totalClassifications,
    byAgeRating,
    autoClassifiedCount,
    manuallyReviewedCount,
  ] = await Promise.all([
    // Total count
    prisma.contentClassification.count(),

    // Count by age rating
    prisma.contentClassification.groupBy({
      by: ['ageRating'],
      _count: true,
    }),

    // Auto-classified count
    prisma.contentClassification.count({
      where: { autoClassified: true },
    }),

    // Manually reviewed count
    prisma.contentClassification.count({
      where: { autoClassified: false },
    }),
  ]);

  return {
    total: totalClassifications,
    autoClassified: autoClassifiedCount,
    manuallyReviewed: manuallyReviewedCount,
    byAgeRating: byAgeRating.reduce(
      (acc, item) => {
        acc[item.ageRating] = item._count;
        return acc;
      },
      {} as Record<string, number>
    ),
  };
}
