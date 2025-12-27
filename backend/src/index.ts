import 'dotenv/config';
import { createServer } from 'http';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import passport from 'passport';
import pinoHttp from 'pino-http';
import { logger } from './config/logger';
import { configurePassport } from './config/passport';
import { disconnectDatabase } from './config/database';
import { initializeWorkers, scheduleRecurringJobs } from './queues/workers';
import { isQueuesEnabled } from './config/features';
import { queueManager } from './queues';
import v1Routes from './routes/v1';
import { setupChatSocket } from './websocket/chatHandler';
import webhookRoutes from './routes/webhooks';

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Nginx)
const server = createServer(app);
const PORT = Number(process.env.PORT) || 3000;

// HTTP logging middleware
app.use(pinoHttp({ logger }));

// Basic security headers
app.use(helmet());

// CORS policy - Allow multiple origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [process.env.FRONTEND_URL || 'http://localhost'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked origin: ${origin}. Allowed: ${allowedOrigins.join(', ')}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Webhook routes MUST come before body parsers (need raw body)
app.use('/api/v1/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Passport strategies
app.use(passport.initialize());
configurePassport();

// Health check
app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version: 'v1',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API v1 routes
app.use('/api/v1', v1Routes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found', path: _req.path });
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Initialize queue workers (guarded to avoid Redis errors in environments without Redis)
if (isQueuesEnabled()) {
  initializeWorkers();
  // Schedule recurring jobs after workers are initialized
  scheduleRecurringJobs().catch((error: unknown) => {
    logger.error({ error }, 'Failed to schedule recurring jobs');
  });
}

const io = setupChatSocket(server);

// Attach io to app for access in routes
(app as any).io = io;

// Start server
server.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`API version: v1`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Base URL: ${process.env.BASE_URL || `http://localhost:${PORT}`}`);
});

// Graceful shutdown hooks
let isShuttingDown = false;

const shutdown = async (signal: string) => {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  logger.info({ signal }, 'shutdown_initiated');
  io.close();

  await queueManager.closeAll();
  await disconnectDatabase();

  server.close((error) => {
    if (error) {
      logger.error({ error }, 'http_server_close_failed');
      process.exit(1);
    }

    process.exit(0);
  });
};

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
