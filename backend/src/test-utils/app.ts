/**
 * Test app configuration
 * Exports Express app without starting the server (for integration tests)
 */
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import passport from 'passport';
import { configurePassport } from '../config/passport';
import v1Routes from '../routes/v1';

export function createTestApp() {
  const app = express();

  // Basic security headers
  app.use(helmet());

  // CORS - allow all origins in tests
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

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
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
      error: message,
      ...(process.env.NODE_ENV === 'test' && { stack: err.stack }),
    });
  });

  return app;
}
