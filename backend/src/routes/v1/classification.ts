import { Router, Request, Response } from 'express';
import { AgeRating, ContentTag } from '../../generated/prisma';
import {
  classifyContent,
  getContentClassification,
  deleteContentClassification,
  getUserContentFilter,
  updateUserContentFilter,
  passesContentFilter,
  autoClassifyFromText,
  getClassificationStats,
  AGE_RATING_HIERARCHY,
} from '../../services/contentClassificationService';
import { logger } from '../../config/logger';

const router = Router();

/**
 * POST /api/v1/classification/classify
 * Classify content with age rating and tags
 */
router.post('/classify', async (req: Request, res: Response) => {
  try {
    const {
      contentType,
      contentId,
      ageRating,
      contentTags = [],
      reason,
      autoClassified = true,
      reviewedBy,
    } = req.body;

    if (!contentType || !contentId || !ageRating) {
      return res.status(400).json({
        success: false,
        message: 'contentType, contentId, and ageRating are required',
      });
    }

    // Validate age rating
    if (!Object.values(AgeRating).includes(ageRating)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ageRating. Must be one of: ${Object.values(AgeRating).join(', ')}`,
      });
    }

    // Validate content tags
    const invalidTags = contentTags.filter(
      (tag: string) => !Object.values(ContentTag).includes(tag as ContentTag)
    );
    if (invalidTags.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid content tags: ${invalidTags.join(', ')}`,
      });
    }

    const classification = await classifyContent(contentType, contentId, {
      ageRating,
      contentTags,
      reason,
      autoClassified,
      reviewedBy,
    });

    return res.status(201).json({
      success: true,
      data: classification,
    });
  } catch (error) {
    logger.error({ error }, 'Error classifying content');
    return res.status(500).json({
      success: false,
      message: 'Failed to classify content',
    });
  }
});

/**
 * POST /api/v1/classification/auto-classify
 * Auto-classify content from text
 */
router.post('/auto-classify', async (req: Request, res: Response) => {
  try {
    const { text, contentType, contentId, saveToDb = false } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'text is required',
      });
    }

    const classification = autoClassifyFromText(text);

    // Optionally save to database
    let savedClassification;
    if (saveToDb) {
      if (!contentType || !contentId) {
        return res.status(400).json({
          success: false,
          message: 'contentType and contentId are required when saveToDb is true',
        });
      }

      savedClassification = await classifyContent(
        contentType,
        contentId,
        classification
      );
    }

    return res.json({
      success: true,
      classification,
      ...(savedClassification && { saved: savedClassification }),
    });
  } catch (error) {
    logger.error({ error }, 'Error auto-classifying content');
    return res.status(500).json({
      success: false,
      message: 'Failed to auto-classify content',
    });
  }
});

/**
 * GET /api/v1/classification/:contentType/:contentId
 * Get classification for specific content
 */
router.get('/:contentType/:contentId', async (req: Request, res: Response) => {
  try {
    const { contentType, contentId } = req.params;

    const classification = await getContentClassification(contentType, contentId);

    if (!classification) {
      return res.status(404).json({
        success: false,
        message: 'Classification not found',
      });
    }

    return res.json({
      success: true,
      data: classification,
    });
  } catch (error) {
    logger.error({ error }, 'Error getting classification');
    return res.status(500).json({
      success: false,
      message: 'Failed to get classification',
    });
  }
});

/**
 * DELETE /api/v1/classification/:contentType/:contentId
 * Delete classification
 */
router.delete('/:contentType/:contentId', async (req: Request, res: Response) => {
  try {
    const { contentType, contentId } = req.params;

    await deleteContentClassification(contentType, contentId);

    return res.json({
      success: true,
      message: 'Classification deleted',
    });
  } catch (error) {
    logger.error({ error }, 'Error deleting classification');
    return res.status(500).json({
      success: false,
      message: 'Failed to delete classification',
    });
  }
});

/**
 * POST /api/v1/classification/check-filter
 * Check if content passes filter
 */
router.post('/check-filter', async (req: Request, res: Response) => {
  try {
    const { contentRating, contentTags, maxAgeRating, blockedTags = [] } = req.body;

    if (!contentRating || !maxAgeRating) {
      return res.status(400).json({
        success: false,
        message: 'contentRating and maxAgeRating are required',
      });
    }

    const passes = passesContentFilter(
      contentRating,
      contentTags || [],
      { maxAgeRating, blockedTags }
    );

    return res.json({
      success: true,
      passes,
      contentRating,
      contentTags,
      filter: {
        maxAgeRating,
        blockedTags,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error checking filter');
    return res.status(500).json({
      success: false,
      message: 'Failed to check filter',
    });
  }
});

/**
 * GET /api/v1/classification/user/:userId/preferences
 * Get user content filter preferences
 */
router.get('/user/:userId/preferences', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const preferences = await getUserContentFilter(userId);

    return res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    logger.error({ error }, 'Error getting user preferences');
    return res.status(500).json({
      success: false,
      message: 'Failed to get user preferences',
    });
  }
});

/**
 * PUT /api/v1/classification/user/:userId/preferences
 * Update user content filter preferences
 */
router.put('/user/:userId/preferences', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { maxAgeRating, blockedTags } = req.body;

    if (!maxAgeRating && !blockedTags) {
      return res.status(400).json({
        success: false,
        message: 'At least one of maxAgeRating or blockedTags is required',
      });
    }

    const user = await updateUserContentFilter(userId, {
      maxAgeRating,
      blockedTags,
    });

    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error({ error }, 'Error updating user preferences');
    return res.status(500).json({
      success: false,
      message: 'Failed to update user preferences',
    });
  }
});

/**
 * GET /api/v1/classification/stats
 * Get classification statistics
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await getClassificationStats();

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error({ error }, 'Error getting stats');
    return res.status(500).json({
      success: false,
      message: 'Failed to get stats',
    });
  }
});

/**
 * GET /api/v1/classification/enums
 * Get available age ratings and content tags
 */
router.get('/enums', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      ageRatings: AGE_RATING_HIERARCHY,
      contentTags: Object.values(ContentTag),
      ageRatingDescriptions: {
        [AgeRating.L]: 'Livre - All ages',
        [AgeRating.TEN]: '10+ - Mild themes',
        [AgeRating.TWELVE]: '12+ - Moderate themes',
        [AgeRating.FOURTEEN]: '14+ - More mature themes, mild sexual references',
        [AgeRating.SIXTEEN]: '16+ - Strong themes, explicit language, moderate violence',
        [AgeRating.EIGHTEEN]: '18+ - Adult content, explicit violence/sexual content',
      },
    },
  });
});

export default router;
