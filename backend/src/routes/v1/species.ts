import { Router, Response } from 'express';
import { prisma } from '../../config/database';
import { optionalAuth } from '../../middleware/auth';
import { logger } from '../../config/logger';

const router = Router();

/**
 * GET /api/v1/species
 * Returns all available species
 */
router.get('/', optionalAuth, async (_req, res: Response) => {
  try {
    const species = await prisma.species.findMany({
      where: { searchable: true },
      select: {
        id: true,
        name: true,
        category: true,
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    res.json({
      success: true,
      data: species
    });
  } catch (error) {
    logger.error({ error }, 'Error getting species');
    res.status(500).json({
      success: false,
      message: 'Failed to load species',
    });
  }
});

export default router;
