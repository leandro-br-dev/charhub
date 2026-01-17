/**
 * System Configuration API Routes
 * Admin endpoints for managing system configuration
 */

import { Router, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { logger } from '../../config/logger';
import { systemConfigurationService } from '../../services/config/systemConfigurationService';
import { prisma } from '../../config/database';

const router = Router();

// Helper function to check admin access
function requireAdmin(user: any, res: Response): boolean {
  if (user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required' });
    return false;
  }
  return true;
}

// Validation constants
const VALID_CATEGORIES = ['generation', 'correction', 'curation'];
const KEY_REGEX = /^[a-zA-Z0-9._-]+$/;

/**
 * GET /api/v1/system-config
 * Get all system configurations
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = req.auth?.user;

    if (!requireAdmin(user, res)) {
      return;
    }

    const configs = await systemConfigurationService.getAll();

    res.json({
      configs,
      count: configs.length,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get system configurations');
    res.status(500).json({ error: 'Failed to get system configurations' });
  }
});

/**
 * GET /api/v1/system-config/:key
 * Get single configuration by key
 */
router.get('/:key', requireAuth, async (req, res) => {
  try {
    const user = req.auth?.user;

    if (!requireAdmin(user, res)) {
      return;
    }

    const { key } = req.params;

    // Validate key format
    if (!KEY_REGEX.test(key)) {
      res.status(400).json({ error: 'Invalid key format' });
      return;
    }

    const value = await systemConfigurationService.get(key);

    if (value === null) {
      res.status(404).json({ error: 'Configuration key not found' });
      return;
    }

    // Get full config details from database
    const config = await prisma.systemConfiguration.findUnique({
      where: { key },
    });

    res.json({
      key,
      value,
      description: config?.description || null,
      category: config?.category || null,
      updatedAt: config?.updatedAt || null,
      updatedBy: config?.updatedBy || null,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get system configuration');
    res.status(500).json({ error: 'Failed to get system configuration' });
  }
});

/**
 * POST /api/v1/system-config
 * Create new configuration
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const user = req.auth?.user;

    if (!requireAdmin(user, res)) {
      return;
    }

    const { key, value, category, _description } = req.body;

    // Validate required fields
    if (!key || value === undefined || value === null || value === '') {
      res.status(400).json({ error: 'Key and value are required' });
      return;
    }

    // Validate key format
    if (!KEY_REGEX.test(key)) {
      res.status(400).json({ error: 'Invalid key format. Use alphanumeric characters, dots, underscores, and hyphens' });
      return;
    }

    // Validate category if provided
    if (category && !VALID_CATEGORIES.includes(category)) {
      res.status(400).json({
        error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
      });
      return;
    }

    // Check if key already exists
    const existing = await systemConfigurationService.exists(key);
    if (existing) {
      res.status(409).json({ error: 'Configuration key already exists' });
      return;
    }

    // Create configuration
    await systemConfigurationService.set(key, String(value), user?.id);

    // Get created config
    const config = await prisma.systemConfiguration.findUnique({
      where: { key },
    });

    logger.info({ key, userId: user?.id }, 'System configuration created');

    res.status(201).json({
      key,
      value,
      category: config?.category || null,
      updatedAt: config?.updatedAt,
      message: 'Configuration created successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Failed to create system configuration');
    res.status(500).json({ error: 'Failed to create system configuration' });
  }
});

/**
 * PUT /api/v1/system-config/:key
 * Update existing configuration
 */
router.put('/:key', requireAuth, async (req, res) => {
  try {
    const user = req.auth?.user;

    if (!requireAdmin(user, res)) {
      return;
    }

    const { key } = req.params;
    const { value, description, category } = req.body;

    // Validate key format
    if (!KEY_REGEX.test(key)) {
      res.status(400).json({ error: 'Invalid key format' });
      return;
    }

    // Validate value
    if (value === undefined || value === null || value === '') {
      res.status(400).json({ error: 'Value is required' });
      return;
    }

    // Validate category if provided
    if (category && !VALID_CATEGORIES.includes(category)) {
      res.status(400).json({
        error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
      });
      return;
    }

    // Check if key exists
    const existing = await systemConfigurationService.exists(key);
    if (!existing) {
      res.status(404).json({ error: 'Configuration key not found' });
      return;
    }

    // Update configuration value
    await systemConfigurationService.set(key, String(value), user?.id);

    // Update description and category if provided
    if (description !== undefined || category !== undefined) {
      await prisma.systemConfiguration.update({
        where: { key },
        data: {
          ...(description !== undefined && { description }),
          ...(category !== undefined && { category }),
        },
      });
    }

    // Get updated config
    const config = await prisma.systemConfiguration.findUnique({
      where: { key },
    });

    logger.info({ key, userId: user?.id }, 'System configuration updated');

    res.json({
      key,
      value,
      description: config?.description || null,
      category: config?.category || null,
      updatedAt: config?.updatedAt,
      message: 'Configuration updated successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Failed to update system configuration');
    res.status(500).json({ error: 'Failed to update system configuration' });
  }
});

/**
 * DELETE /api/v1/system-config/:key
 * Delete configuration
 */
router.delete('/:key', requireAuth, async (req, res) => {
  try {
    const user = req.auth?.user;

    if (!requireAdmin(user, res)) {
      return;
    }

    const { key } = req.params;

    // Validate key format
    if (!KEY_REGEX.test(key)) {
      res.status(400).json({ error: 'Invalid key format' });
      return;
    }

    // Check if key exists
    const existing = await systemConfigurationService.exists(key);
    if (!existing) {
      res.status(404).json({ error: 'Configuration key not found' });
      return;
    }

    // Delete configuration
    await systemConfigurationService.delete(key);

    logger.info({ key, userId: user?.id }, 'System configuration deleted');

    res.json({
      message: 'Configuration deleted successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Failed to delete system configuration');
    res.status(500).json({ error: 'Failed to delete system configuration' });
  }
});

export default router;
