import pino from 'pino';

const LOG_PRETTY = process.env.USE_PRETTY_LOGS === 'true';

/**
 * Centralized logger instance
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: LOG_PRETTY
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
      }
    : undefined,
});
