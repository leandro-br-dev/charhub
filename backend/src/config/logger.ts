import pino from 'pino';

const LOG_PRETTY = process.env.USE_PRETTY_LOGS === 'true';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Centralized logger instance
 * In production, uses JSON output (no pino-pretty)
 * In development, uses pino-pretty if USE_PRETTY_LOGS=true
 */
export const logger = pino(
  LOG_PRETTY && !IS_PRODUCTION
    ? {
        level: process.env.LOG_LEVEL || 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        },
      }
    : {
        level: process.env.LOG_LEVEL || 'info',
      }
);
