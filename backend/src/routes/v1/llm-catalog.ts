/**
 * LLM Model Catalog API Routes
 * Admin endpoints for managing LLM model catalog
 */

import { Router, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { logger } from '../../config/logger';
import { llmModelCatalogService } from '../../services/llmModelCatalogService';
import { LLMModelCategory, LLMModelType } from '../../generated/prisma';
import { sendError, API_ERROR_CODES } from '../../utils/apiErrors';

const router = Router();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check admin access
 */
function requireAdmin(user: any, res: Response): boolean {
  if (user?.role !== 'ADMIN') {
    sendError(res, 403, API_ERROR_CODES.ADMIN_REQUIRED);
    return false;
  }
  return true;
}

/**
 * Validate provider format
 */
const VALID_PROVIDERS = [
  'gemini',
  'openai',
  'grok',
  'openrouter',
  'anthropic',
  'together_ai',
  'groq',
];

function isValidProvider(provider: string): boolean {
  return VALID_PROVIDERS.includes(provider);
}

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/v1/llm-catalog
 * Get all models with optional filtering
 * Admin only for full access, users can see active/available models
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = req.auth?.user;

    // Non-admin users can only see active and available models
    const filters: any = {};

    if (user?.role !== 'ADMIN') {
      filters.isActive = true;
      filters.isAvailable = true;
    } else {
      // Admin can apply filters
      const { provider, category, type, isActive, isAvailable, supportsTools, supportsVision, supportsReasoning } = req.query;

      if (provider) {
        if (!isValidProvider(provider as string)) {
          sendError(res, 400, API_ERROR_CODES.INVALID_INPUT, {
            message: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}`,
            field: 'provider'
          });
          return;
        }
        filters.provider = provider;
      }

      if (category) {
        if (!Object.values(LLMModelCategory).includes(category as LLMModelCategory)) {
          sendError(res, 400, API_ERROR_CODES.INVALID_INPUT, {
            message: `Invalid category. Must be one of: ${Object.values(LLMModelCategory).join(', ')}`,
            field: 'category'
          });
          return;
        }
        filters.category = category as LLMModelCategory;
      }

      if (type) {
        if (!Object.values(LLMModelType).includes(type as LLMModelType)) {
          sendError(res, 400, API_ERROR_CODES.INVALID_INPUT, {
            message: `Invalid type. Must be one of: ${Object.values(LLMModelType).join(', ')}`,
            field: 'type'
          });
          return;
        }
        filters.type = type as LLMModelType;
      }

      if (isActive !== undefined) {
        filters.isActive = isActive === 'true';
      }

      if (isAvailable !== undefined) {
        filters.isAvailable = isAvailable === 'true';
      }

      if (supportsTools !== undefined) {
        filters.supportsTools = supportsTools === 'true';
      }

      if (supportsVision !== undefined) {
        filters.supportsVision = supportsVision === 'true';
      }

      if (supportsReasoning !== undefined) {
        filters.supportsReasoning = supportsReasoning === 'true';
      }
    }

    const models = await llmModelCatalogService.getAll(
      Object.keys(filters).length > 0 ? filters : undefined
    );

    res.json({
      success: true,
      data: {
        models,
        count: models.length,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get LLM models');
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to get LLM models'
    });
  }
});

/**
 * GET /api/v1/llm-catalog/providers
 * Get all available providers
 */
router.get('/providers', requireAuth, async (_req, res) => {
  try {
    const providers = await llmModelCatalogService.getProviders();

    res.json({
      success: true,
      data: {
        providers,
        count: providers.length,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get LLM providers');
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to get LLM providers'
    });
  }
});

/**
 * GET /api/v1/llm-catalog/grouped
 * Get models grouped by provider
 */
router.get('/grouped', requireAuth, async (_req, res) => {
  try {
    const grouped = await llmModelCatalogService.getByProvider();

    // Convert Map to array for JSON serialization
    const result = Array.from(grouped.entries()).map(([provider, models]) => ({
      provider,
      models,
      count: models.length,
    }));

    res.json({
      success: true,
      data: {
        grouped: result,
        totalProviders: result.length,
        totalModels: result.reduce((sum, g) => sum + g.count, 0),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get grouped LLM models');
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to get grouped LLM models'
    });
  }
});

/**
 * GET /api/v1/llm-catalog/:id
 * Get single model by ID
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const model = await llmModelCatalogService.getById(id);

    if (!model) {
      sendError(res, 404, API_ERROR_CODES.NOT_FOUND, {
        message: 'LLM model not found',
        details: { id }
      });
      return;
    }

    // Non-admin users can only see active and available models
    if (req.auth?.user?.role !== 'ADMIN') {
      if (!model.isActive || !model.isAvailable) {
        sendError(res, 404, API_ERROR_CODES.NOT_FOUND, {
          message: 'LLM model not found',
        });
        return;
      }
    }

    res.json({
      success: true,
      data: model,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get LLM model');
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to get LLM model'
    });
  }
});

/**
 * POST /api/v1/llm-catalog
 * Create new model (admin only)
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const user = req.auth?.user;

    if (!requireAdmin(user, res)) {
      return;
    }

    const {
      provider,
      name,
      displayName,
      category,
      type,
      contextWindow,
      maxOutput,
      supportsTools,
      supportsVision,
      supportsReasoning,
      description,
      version,
      source,
    } = req.body;

    // Validate required fields
    if (!provider || !name || !displayName || !category || !type) {
      sendError(res, 400, API_ERROR_CODES.MISSING_REQUIRED_FIELD, {
        message: 'Missing required fields: provider, name, displayName, category, type'
      });
      return;
    }

    // Validate provider
    if (!isValidProvider(provider)) {
      sendError(res, 400, API_ERROR_CODES.INVALID_INPUT, {
        message: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}`,
        field: 'provider'
      });
      return;
    }

    // Validate category
    if (!Object.values(LLMModelCategory).includes(category)) {
      sendError(res, 400, API_ERROR_CODES.INVALID_INPUT, {
        message: `Invalid category. Must be one of: ${Object.values(LLMModelCategory).join(', ')}`,
        field: 'category'
      });
      return;
    }

    // Validate type
    if (!Object.values(LLMModelType).includes(type)) {
      sendError(res, 400, API_ERROR_CODES.INVALID_INPUT, {
        message: `Invalid type. Must be one of: ${Object.values(LLMModelType).join(', ')}`,
        field: 'type'
      });
      return;
    }

    // Validate numeric fields
    if (contextWindow !== undefined && (typeof contextWindow !== 'number' || contextWindow <= 0)) {
      sendError(res, 400, API_ERROR_CODES.INVALID_INPUT, {
        message: 'contextWindow must be a positive number',
        field: 'contextWindow'
      });
      return;
    }

    if (maxOutput !== undefined && (typeof maxOutput !== 'number' || maxOutput <= 0)) {
      sendError(res, 400, API_ERROR_CODES.INVALID_INPUT, {
        message: 'maxOutput must be a positive number',
        field: 'maxOutput'
      });
      return;
    }

    // Check if model already exists
    const exists = await llmModelCatalogService.existsByProviderAndName(provider, name);
    if (exists) {
      sendError(res, 409, API_ERROR_CODES.ALREADY_EXISTS, {
        message: 'Model with this provider and name already exists',
        details: { provider, name }
      });
      return;
    }

    // Create model
    const model = await llmModelCatalogService.create(
      {
        provider,
        name,
        displayName,
        category,
        type,
        contextWindow: contextWindow ?? 128000,
        maxOutput: maxOutput ?? 4096,
        supportsTools: supportsTools ?? false,
        supportsVision: supportsVision ?? false,
        supportsReasoning: supportsReasoning ?? false,
        description,
        version,
        source,
      },
      user?.id
    );

    res.status(201).json({
      success: true,
      data: model,
      message: 'LLM model created successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Failed to create LLM model');
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to create LLM model'
    });
  }
});

/**
 * PUT /api/v1/llm-catalog/:id
 * Update existing model (admin only)
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const user = req.auth?.user;

    if (!requireAdmin(user, res)) {
      return;
    }

    const { id } = req.params;

    // Check if model exists
    const exists = await llmModelCatalogService.exists(id);
    if (!exists) {
      sendError(res, 404, API_ERROR_CODES.NOT_FOUND, {
        message: 'LLM model not found',
        details: { id }
      });
      return;
    }

    const {
      displayName,
      category,
      type,
      contextWindow,
      maxOutput,
      supportsTools,
      supportsVision,
      supportsReasoning,
      description,
      version,
      source,
      isActive,
      isAvailable,
    } = req.body;

    // Validate category if provided
    if (category && !Object.values(LLMModelCategory).includes(category)) {
      sendError(res, 400, API_ERROR_CODES.INVALID_INPUT, {
        message: `Invalid category. Must be one of: ${Object.values(LLMModelCategory).join(', ')}`,
        field: 'category'
      });
      return;
    }

    // Validate type if provided
    if (type && !Object.values(LLMModelType).includes(type)) {
      sendError(res, 400, API_ERROR_CODES.INVALID_INPUT, {
        message: `Invalid type. Must be one of: ${Object.values(LLMModelType).join(', ')}`,
        field: 'type'
      });
      return;
    }

    // Validate numeric fields
    if (contextWindow !== undefined && (typeof contextWindow !== 'number' || contextWindow <= 0)) {
      sendError(res, 400, API_ERROR_CODES.INVALID_INPUT, {
        message: 'contextWindow must be a positive number',
        field: 'contextWindow'
      });
      return;
    }

    if (maxOutput !== undefined && (typeof maxOutput !== 'number' || maxOutput <= 0)) {
      sendError(res, 400, API_ERROR_CODES.INVALID_INPUT, {
        message: 'maxOutput must be a positive number',
        field: 'maxOutput'
      });
      return;
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (category !== undefined) updateData.category = category;
    if (type !== undefined) updateData.type = type;
    if (contextWindow !== undefined) updateData.contextWindow = contextWindow;
    if (maxOutput !== undefined) updateData.maxOutput = maxOutput;
    if (supportsTools !== undefined) updateData.supportsTools = supportsTools;
    if (supportsVision !== undefined) updateData.supportsVision = supportsVision;
    if (supportsReasoning !== undefined) updateData.supportsReasoning = supportsReasoning;
    if (description !== undefined) updateData.description = description;
    if (version !== undefined) updateData.version = version;
    if (source !== undefined) updateData.source = source;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;

    // Update model
    const model = await llmModelCatalogService.update(id, updateData, user?.id);

    res.json({
      success: true,
      data: model,
      message: 'LLM model updated successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Failed to update LLM model');
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to update LLM model'
    });
  }
});

/**
 * DELETE /api/v1/llm-catalog/:id
 * Delete model (admin only)
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const user = req.auth?.user;

    if (!requireAdmin(user, res)) {
      return;
    }

    const { id } = req.params;

    // Check if model exists
    const exists = await llmModelCatalogService.exists(id);
    if (!exists) {
      sendError(res, 404, API_ERROR_CODES.NOT_FOUND, {
        message: 'LLM model not found',
        details: { id }
      });
      return;
    }

    // Delete model
    await llmModelCatalogService.delete(id, user?.id);

    res.json({
      success: true,
      message: 'LLM model deleted successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Failed to delete LLM model');
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to delete LLM model'
    });
  }
});

/**
 * PATCH /api/v1/llm-catalog/:id/toggle-availability
 * Toggle model availability (admin only)
 */
router.patch('/:id/toggle-availability', requireAuth, async (req, res) => {
  try {
    const user = req.auth?.user;

    if (!requireAdmin(user, res)) {
      return;
    }

    const { id } = req.params;

    // Check if model exists
    const exists = await llmModelCatalogService.exists(id);
    if (!exists) {
      sendError(res, 404, API_ERROR_CODES.NOT_FOUND, {
        message: 'LLM model not found',
        details: { id }
      });
      return;
    }

    // Toggle availability
    const model = await llmModelCatalogService.toggleAvailability(id, user?.id);

    res.json({
      success: true,
      data: model,
      message: `Model availability toggled to ${model.isAvailable ? 'available' : 'unavailable'}`,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to toggle LLM model availability');
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to toggle LLM model availability'
    });
  }
});

/**
 * POST /api/v1/llm-catalog/cache/refresh
 * Refresh model cache (admin only)
 */
router.post('/cache/refresh', requireAuth, async (req, res) => {
  try {
    const user = req.auth?.user;

    if (!requireAdmin(user, res)) {
      return;
    }

    await llmModelCatalogService.refreshCache();

    res.json({
      success: true,
      message: 'LLM model cache refreshed successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Failed to refresh LLM model cache');
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, {
      message: 'Failed to refresh LLM model cache'
    });
  }
});

export default router;
