import { Queue, Worker, Job } from 'bullmq';
import { defaultQueueOptions, defaultWorkerOptions, QueueName } from './config';
import { logger } from '../config/logger';

/**
 * Queue Manager
 * Centralized management for all BullMQ queues and workers
 */
class QueueManager {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();

  /**
   * Get or create a queue instance
   */
  getQueue<T = any>(name: QueueName): Queue<T> {
    if (!this.queues.has(name)) {
      const queue = new Queue<T>(name, defaultQueueOptions);
      this.queues.set(name, queue);
      logger.info({ queueName: name }, 'Queue created');
    }
    return this.queues.get(name) as Queue<T>;
  }

  /**
   * Register a worker for a queue
   */
  registerWorker<T = any>(
    name: QueueName,
    processor: (job: Job<T>) => Promise<any>,
    options?: Partial<typeof defaultWorkerOptions>
  ): Worker<T> {
    if (this.workers.has(name)) {
      logger.warn({ queueName: name }, 'Worker already registered, skipping');
      return this.workers.get(name) as Worker<T>;
    }

    const worker = new Worker<T>(
      name,
      processor,
      { ...defaultWorkerOptions, ...options }
    );

    // Worker event handlers
    worker.on('completed', (job: Job<T>) => {
      logger.info({ jobId: job.id, queueName: name }, 'Job completed');
    });

    worker.on('failed', (job: Job<T> | undefined, error: Error) => {
      logger.error(
        { jobId: job?.id, queueName: name, error: error.message },
        'Job failed'
      );
    });

    worker.on('error', (error: Error) => {
      logger.error({ queueName: name, error: error.message }, 'Worker error');
    });

    this.workers.set(name, worker);
    logger.info({ queueName: name }, 'Worker registered');

    return worker;
  }

  /**
   * Add a job to a queue
   */
  async addJob<T = any>(
    queueName: QueueName,
    jobName: string,
    data: T,
    options?: any
  ) {
    const queue = this.getQueue<T>(queueName);
    const job = await queue.add(jobName as any, data as any, options);
    logger.info(
      { jobId: job.id, jobName, queueName },
      'Job added to queue'
    );
    return job;
  }

  /**
   * Gracefully close all queues and workers
   */
  async closeAll(): Promise<void> {
    logger.info('Closing all queues and workers');

    // Close all workers first
    for (const [name, worker] of this.workers.entries()) {
      try {
        await worker.close();
        logger.info({ workerName: name }, 'Worker closed');
      } catch (error) {
        logger.error({ workerName: name, error }, 'Error closing worker');
      }
    }

    // Close all queues
    for (const [name, queue] of this.queues.entries()) {
      try {
        await queue.close();
        logger.info({ queueName: name }, 'Queue closed');
      } catch (error) {
        logger.error({ queueName: name, error }, 'Error closing queue');
      }
    }

    this.workers.clear();
    this.queues.clear();
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: QueueName) {
    const queue = this.getQueue(queueName);
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      queueName,
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }
}

// Singleton instance
export const queueManager = new QueueManager();
