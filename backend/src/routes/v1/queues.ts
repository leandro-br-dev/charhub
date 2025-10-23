import { Router, Request, Response } from 'express';
import { queueManager, QueueName } from '../../queues';
import { isQueuesEnabled } from '../../config/features';
import { TestJobData } from '../../queues/jobs/testJob';
import { logger } from '../../config/logger';

const router = Router();

/**
 * POST /api/v1/queues/test
 * Add a test job to the queue
 */
router.post('/test', async (req: Request, res: Response): Promise<void> => {
  if (!isQueuesEnabled()) {
    res.status(503).json({ success: false, message: 'Queues are disabled in this environment' });
    return;
  }
  try {
    const { message = 'Hello from test job!', delay = 0 } = req.body as Partial<TestJobData>;

    const job = await queueManager.addJob<TestJobData>(
      QueueName.TEST,
      'test-job',
      { message, delay }
    );

    res.status(201).json({
      success: true,
      message: 'Test job added to queue',
      jobId: job.id,
      data: job.data,
    });
  } catch (error) {
    logger.error({ error }, 'Error adding test job to queue');
    res.status(500).json({
      success: false,
      message: 'Failed to add test job to queue',
    });
  }
});

/**
 * GET /api/v1/queues/stats
 * Get statistics for all queues
 */
router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  if (!isQueuesEnabled()) {
    res.status(503).json({ success: false, message: 'Queues are disabled in this environment' });
    return;
  }
  try {
    const stats = await queueManager.getQueueStats(QueueName.TEST);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error({ error }, 'Error getting queue stats');
    res.status(500).json({
      success: false,
      message: 'Failed to get queue stats',
    });
  }
});

/**
 * GET /api/v1/queues/health
 * Check if queue system is healthy
 */
router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  if (!isQueuesEnabled()) {
    res.status(503).json({ success: false, healthy: false, message: 'Queues are disabled in this environment' });
    return;
  }
  try {
    const stats = await queueManager.getQueueStats(QueueName.TEST);

    res.json({
      success: true,
      healthy: true,
      message: 'Queue system is operational',
      stats,
    });
  } catch (error) {
    logger.error({ error }, 'Queue health check failed');
    res.status(503).json({
      success: false,
      healthy: false,
      message: 'Queue system is not operational',
    });
  }
});

export default router;
