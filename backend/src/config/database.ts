import { PrismaClient } from '../generated/prisma';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

/**
 * Prisma Client singleton instance
 * Prevents multiple instances in development (hot reload)
 */
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

/**
 * Gracefully disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
