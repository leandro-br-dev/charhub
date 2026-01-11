/**
 * Visual Styles API Routes
 *
 * Provides endpoints for managing and querying visual style configurations
 * for image generation.
 */

import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';
import {
  getAllVisualStyles,
  getVisualStyleConfiguration,
  getCheckpointOverrides,
  isValidVisualStyle,
} from '../../services/visualStyleService';
import { VisualStyle, ContentType } from '../../generated/prisma';

const router = Router();

/**
 * GET /api/v1/visual-styles
 *
 * Get all available visual styles
 */
router.get('/', async (req, res) => {
  try {
    const styles = await getAllVisualStyles();

    return res.json({
      success: true,
      data: styles,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to get visual styles');
    return res.status(500).json({
      success: false,
      message: 'Failed to get visual styles',
    });
  }
});

/**
 * GET /api/v1/visual-styles/:style
 *
 * Get configuration for a specific visual style
 */
router.get('/:style', async (req, res) => {
  try {
    const { style } = req.params;
    const { contentType } = req.query;

    // Validate style enum
    if (!Object.values(VisualStyle).includes(style as VisualStyle)) {
      return res.status(400).json({
        success: false,
        message: `Invalid visual style: ${style}. Valid values: ${Object.values(VisualStyle).join(', ')}`,
      });
    }

    // Validate contentType if provided
    let parsedContentType: ContentType | undefined;
    if (contentType) {
      if (!Object.values(ContentType).includes(contentType as ContentType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid content type: ${contentType}. Valid values: ${Object.values(ContentType).join(', ')}`,
        });
      }
      parsedContentType = contentType as ContentType;
    }

    const config = await getVisualStyleConfiguration(style as VisualStyle, parsedContentType);

    if (!config) {
      return res.status(404).json({
        success: false,
        message: `Visual style not found or inactive: ${style}`,
      });
    }

    return res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to get visual style configuration');
    return res.status(500).json({
      success: false,
      message: 'Failed to get visual style configuration',
    });
  }
});

/**
 * GET /api/v1/visual-styles/:style/checkpoint-overrides
 *
 * Get checkpoint overrides for a specific visual style
 */
router.get('/:style/checkpoint-overrides', async (req, res) => {
  try {
    const { style } = req.params;

    // Validate style enum
    if (!Object.values(VisualStyle).includes(style as VisualStyle)) {
      return res.status(400).json({
        success: false,
        message: `Invalid visual style: ${style}`,
      });
    }

    const overrides = await getCheckpointOverrides(style as VisualStyle);

    return res.json({
      success: true,
      data: overrides,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to get checkpoint overrides');
    return res.status(500).json({
      success: false,
      message: 'Failed to get checkpoint overrides',
    });
  }
});

/**
 * POST /api/v1/visual-styles/validate
 *
 * Validate if a visual style exists and is active
 */
router.post('/validate', async (req, res) => {
  try {
    const schema = z.object({
      style: z.enum(Object.values(VisualStyle) as [VisualStyle, ...VisualStyle[]]),
    });

    const { style } = schema.parse(req.body);

    const isValid = await isValidVisualStyle(style);

    return res.json({
      success: true,
      data: {
        style,
        isValid,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body',
        errors: error.errors,
      });
    }

    logger.error({ err: error }, 'Failed to validate visual style');
    return res.status(500).json({
      success: false,
      message: 'Failed to validate visual style',
    });
  }
});

// ============================================================================
// ADMIN ROUTES (require ADMIN role)
// ============================================================================

/**
 * POST /api/v1/visual-styles/admin/checkpoint
 *
 * Create a new checkpoint
 * Requires ADMIN role
 */
router.post('/admin/checkpoint', async (req, res) => {
  try {
    // Check admin role (middleware will handle this)
    const schema = z.object({
      name: z.string().min(1),
      filename: z.string().min(1),
      path: z.string().min(1),
      civitaiUrl: z.string().url().optional(),
      modelType: z.enum(['CHECKPOINT', 'LORA_STYLE', 'LORA_CONTENT']),
      config: z.object({
        sampler: z.string().optional(),
        cfg: z.number().optional(),
        steps: z.number().optional(),
        clipSkip: z.number().optional(),
      }).optional(),
    });

    const data = schema.parse(req.body);

    const checkpoint = await prisma.styleCheckpoint.create({
      data: {
        name: data.name,
        filename: data.filename,
        path: data.path,
        civitaiUrl: data.civitaiUrl,
        modelType: data.modelType as any,
        config: data.config as any,
      },
    });

    logger.info({ checkpointId: checkpoint.id }, 'Created new checkpoint');

    return res.json({
      success: true,
      data: checkpoint,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body',
        errors: error.errors,
      });
    }

    logger.error({ err: error }, 'Failed to create checkpoint');
    return res.status(500).json({
      success: false,
      message: 'Failed to create checkpoint',
    });
  }
});

/**
 * POST /api/v1/visual-styles/admin/lora
 *
 * Create a new LoRA
 * Requires ADMIN role
 */
router.post('/admin/lora', async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      filename: z.string().min(1),
      path: z.string().min(1),
      civitaiUrl: z.string().url().optional(),
      modelType: z.enum(['CHECKPOINT', 'LORA_STYLE', 'LORA_CONTENT']),
      triggerWords: z.string().optional(),
      weight: z.number().min(0).max(1.5).default(1.0),
    });

    const data = schema.parse(req.body);

    const lora = await prisma.styleLora.create({
      data: {
        name: data.name,
        filename: data.filename,
        path: data.path,
        civitaiUrl: data.civitaiUrl,
        modelType: data.modelType as any,
        triggerWords: data.triggerWords,
        weight: data.weight,
      },
    });

    logger.info({ loraId: lora.id }, 'Created new LoRA');

    return res.json({
      success: true,
      data: lora,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body',
        errors: error.errors,
      });
    }

    logger.error({ err: error }, 'Failed to create LoRA');
    return res.status(500).json({
      success: false,
      message: 'Failed to create LoRA',
    });
  }
});

/**
 * PUT /api/v1/visual-styles/admin/:style/lora
 *
 * Add a LoRA to a visual style
 * Requires ADMIN role
 */
router.put('/admin/:style/lora', async (req, res) => {
  try {
    const { style } = req.params;

    // Validate style enum
    if (!Object.values(VisualStyle).includes(style as VisualStyle)) {
      return res.status(400).json({
        success: false,
        message: `Invalid visual style: ${style}`,
      });
    }

    const schema = z.object({
      loraId: z.string().uuid(),
      weight: z.number().min(0).max(1.5).optional(),
      priority: z.number().int().default(0),
    });

    const data = schema.parse(req.body);

    // Get the visual style config
    const styleConfig = await prisma.visualStyleConfig.findUnique({
      where: { style: style as VisualStyle },
    });

    if (!styleConfig) {
      return res.status(404).json({
        success: false,
        message: `Visual style not found: ${style}`,
      });
    }

    // Create the mapping
    const mapping = await prisma.styleLoraMapping.create({
      data: {
        styleId: styleConfig.id,
        loraId: data.loraId,
        weight: data.weight,
        priority: data.priority,
      },
    });

    logger.info({ style, loraId: data.loraId }, 'Added LoRA to visual style');

    return res.json({
      success: true,
      data: mapping,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body',
        errors: error.errors,
      });
    }

    logger.error({ err: error }, 'Failed to add LoRA to visual style');
    return res.status(500).json({
      success: false,
      message: 'Failed to add LoRA to visual style',
    });
  }
});

export default router;
