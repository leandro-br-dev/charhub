import { Router, Request, Response } from 'express';
import { styleThemeService } from '../../services/styleThemeService';
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { VisualStyle, Theme } from '../../generated/prisma';
import { sendError, API_ERROR_CODES } from '../../utils/apiErrors';

const router = Router();

/**
 * GET /api/v1/styles
 * List all available styles with their themes
 */
router.get('/styles', async (_req: Request, res: Response) => {
  try {
    const styles = await styleThemeService.getAllStyles();
    res.json(styles);
  } catch (error) {
    logger.error({ error }, 'Failed to get styles');
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to get styles'
    });
  }
});

/**
 * GET /api/v1/styles/:style/themes
 * Get all available themes for a style
 */
router.get('/styles/:style/themes', async (req: Request, res: Response): Promise<void> => {
  try {
    const { style } = req.params;

    // Validate style enum
    if (!Object.values(VisualStyle).includes(style as VisualStyle)) {
      sendError(res, 400, API_ERROR_CODES.INVALID_INPUT, {
        message: `Invalid style: ${style}`,
        details: { provided: style, validStyles: Object.values(VisualStyle) },
        field: 'style'
      });
      return;
    }

    const themes = await styleThemeService.getAvailableThemes(style as VisualStyle);
    res.json({ style, themes });
  } catch (error) {
    logger.error({ error, params: req.params }, 'Failed to get available themes');
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to get available themes'
    });
  }
});

/**
 * GET /api/v1/styles/:style/themes/:theme
 * Get checkpoint + LoRA configuration for a Style + Theme combination
 */
router.get('/styles/:style/themes/:theme', async (req: Request, res: Response): Promise<void> => {
  try {
    const { style, theme } = req.params;

    // Validate style enum
    if (!Object.values(VisualStyle).includes(style as VisualStyle)) {
      sendError(res, 400, API_ERROR_CODES.INVALID_INPUT, {
        message: `Invalid style: ${style}`,
        details: { provided: style, validStyles: Object.values(VisualStyle) },
        field: 'style'
      });
      return;
    }

    // Validate theme enum
    if (!Object.values(Theme).includes(theme as Theme)) {
      sendError(res, 400, API_ERROR_CODES.INVALID_INPUT, {
        message: `Invalid theme: ${theme}`,
        details: { provided: theme, validThemes: Object.values(Theme) },
        field: 'theme'
      });
      return;
    }

    const combo = await styleThemeService.getCombination(
      style as VisualStyle,
      theme as Theme
    );

    if (!combo) {
      sendError(res, 404, API_ERROR_CODES.NOT_FOUND, {
        message: `No checkpoint configuration found for ${style} + ${theme}`,
        details: { style, theme }
      });
      return;
    }

    res.json(combo);
  } catch (error) {
    logger.error({ error, params: req.params }, 'Failed to get Style + Theme combination');
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to get combination'
    });
  }
});

/**
 * GET /api/v1/style-themes/combinations
 * Get all Style + Theme combinations with their checkpoint and LoRA configurations
 */
router.get('/style-themes/combinations', async (_req: Request, res: Response) => {
  try {
    const combinations = await prisma.styleThemeCheckpoint.findMany({
      include: {
        styleConfig: {
          select: {
            style: true,
            name: true,
          },
        },
        checkpoint: {
          select: {
            id: true,
            name: true,
            filename: true,
            path: true,
          },
        },
        loraOverride: {
          select: {
            id: true,
            name: true,
            filename: true,
            filepathRelative: true,
            weight: true,
          },
        },
      },
      orderBy: [
        { styleConfig: { style: 'asc' } },
        { theme: 'asc' },
      ],
    });

    res.json(combinations);
  } catch (error) {
    logger.error({ error }, 'Failed to get all combinations');
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to get combinations'
    });
  }
});

export default router;
