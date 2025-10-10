import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { logger } from '../../config/logger';
import * as loraService from '../../services/loraService';
import { createLoraSchema, updateLoraSchema } from '../../validators';

const router = Router();

/**
 * POST /api/v1/loras
 * Create a new LoRA
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const validatedData = createLoraSchema.parse(req.body);
    const lora = await loraService.createLora(validatedData);

    return res.status(201).json({
      success: true,
      data: lora,
    });
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error,
      });
    }

    logger.error({ error }, 'Error creating LoRA');
    return res.status(500).json({
      success: false,
      message: 'Failed to create LoRA',
    });
  }
});

/**
 * GET /api/v1/loras/:id
 * Get LoRA by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const lora = await loraService.getLoraById(id);

    if (!lora) {
      return res.status(404).json({
        success: false,
        message: 'LoRA not found',
      });
    }

    return res.json({
      success: true,
      data: lora,
    });
  } catch (error) {
    logger.error({ error }, 'Error getting LoRA');
    return res.status(500).json({
      success: false,
      message: 'Failed to get LoRA',
    });
  }
});

/**
 * GET /api/v1/loras
 * List LoRAs with filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, modelType, baseModel, category, deleted, skip, limit } =
      req.query;

    const loras = await loraService.listLoras({
      search: typeof search === 'string' ? search : undefined,
      modelType: typeof modelType === 'string' ? modelType : undefined,
      baseModel: typeof baseModel === 'string' ? baseModel : undefined,
      category: typeof category === 'string' ? category : undefined,
      deleted: deleted === 'true',
      skip: typeof skip === 'string' ? parseInt(skip, 10) : undefined,
      limit: typeof limit === 'string' ? parseInt(limit, 10) : undefined,
    });

    return res.json({
      success: true,
      data: loras,
      count: loras.length,
    });
  } catch (error) {
    logger.error({ error }, 'Error listing LoRAs');
    return res.status(500).json({
      success: false,
      message: 'Failed to list LoRAs',
    });
  }
});

/**
 * PUT /api/v1/loras/:id
 * Update LoRA
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateLoraSchema.parse(req.body);

    const lora = await loraService.updateLora(id, validatedData);

    return res.json({
      success: true,
      data: lora,
    });
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error,
      });
    }

    logger.error({ error }, 'Error updating LoRA');
    return res.status(500).json({
      success: false,
      message: 'Failed to update LoRA',
    });
  }
});

/**
 * DELETE /api/v1/loras/:id
 * Soft delete LoRA
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await loraService.softDeleteLora(id);

    return res.json({
      success: true,
      message: 'LoRA deleted successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Error deleting LoRA');
    return res.status(500).json({
      success: false,
      message: 'Failed to delete LoRA',
    });
  }
});

export default router;
