---
name: charhub-express-patterns
description: Express framework patterns for CharHub backend. Use when implementing Express servers, middleware, or route handlers with TypeScript.
---

# CharHub Express Patterns

## Purpose

Define Express.js coding patterns, server setup, and conventions for CharHub backend development with Express and TypeScript.

## Server Setup

### Basic Express Server

```typescript
// src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';

const app = express();

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(pinoHttp({ logger }));

// Routes
app.use('/api', apiRoutes);

// Error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server started');
});
```

## Middleware Patterns

### Creating Middleware

```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

// Middleware factory pattern
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as AuthUser;

    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}
```

### Error Handling Middleware

```typescript
// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error({ err, req }, 'Error caught');

  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Resource already exists' });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Resource not found' });
  }

  // Default error
  res.status(500).json({ error: 'Internal server error' });
}
```

### Logging Middleware

```typescript
// src/middleware/logger.ts
import pino from 'pino';
import { pinoHttp } from 'pino-http';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

export const httpLogger = pinoHttp({ logger });
```

## Request/Response Patterns

### Extending Request Type

```typescript
// src/types/express.ts
import { User } from './user';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: {
        id: string;
        userId: string;
      };
    }
  }
}

export {};
```

### Request Handler Signature

```typescript
type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

// Wrapper for async handlers
export const asyncHandler = (fn: AsyncHandler) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

## Route Organization

### Route Structure

```
backend/src/
├── routes/
│   ├── index.ts          # Route aggregator
│   ├── api/
│   │   ├── index.ts       # API routes
│   │   ├── characters.ts  # Character routes
│   │   └── users.ts       # User routes
│   └── web/
│       └── index.ts       # Web routes (if any)
```

### Route Definition

```typescript
// routes/api/characters.ts
import { Router } from 'express';
import {
  getCharacters,
  getCharacterById,
  createCharacter,
  updateCharacter,
  deleteCharacter,
} from '../../controllers/characters.controller';

const router = Router();

router.get('/', getCharacters);
router.get('/:id', getCharacterById);
router.post('/', createCharacter);
router.patch('/:id', updateCharacter);
router.delete('/:id', deleteCharacter);

export default router;
```

### Route Aggregation

```typescript
// routes/api/index.ts
import { Router } from 'express';
import charactersRouter from './characters';
import usersRouter from './users';

const router = Router();

router.use('/characters', charactersRouter);
router.use('/users', usersRouter);

export default router;
```

## Controller Patterns

### Controller Structure

```typescript
// controllers/characters.controller.ts
import { Request, Response } from 'express';
import { characterService } from '../services/characters.service';
import { logger } from '../utils/logger';

export const getCharacters = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const characters = await characterService.findAll();
    res.json({ data: characters });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch characters');
    res.status(500).json({ error: 'Failed to fetch characters' });
  }
};

export const getCharacterById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const character = await characterService.findById(id);

    if (!character) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    res.json(character);
  } catch (error) {
    logger.error({ error, id: req.params.id }, 'Failed to fetch character');
    res.status(500).json({ error: 'Failed to fetch character' });
  }
};
```

## Validation Patterns

### Using Zod for Validation

```typescript
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

const createCharacterSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['BASIC', 'PREMIUM', 'BOT']),
});

export const createCharacter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate request body
    const data = createCharacterSchema.parse(req.body);

    // Call service
    const character = await characterService.create(data);

    res.status(201).json(character);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
      return;
    }

    next(error); // Pass to error handler
  }
};
```

### Validation Middleware

```typescript
// middleware/validation.ts
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export function validateBody<T extends z.ZodTypeAny>(schema: z.ZodType<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      } else {
        next(error);
      }
    }
  };
}

// Usage
router.post(
  '/characters',
  validateBody(createCharacterSchema),
  createCharacter
);
```

## Service Layer Patterns

### Service Structure

```typescript
// services/characters.service.ts
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger';

export class CharacterService {
  async findAll(filters?: CharacterFilters): Promise<Character[]> {
    try {
      return await prisma.character.findMany({
        where: filters,
      });
    } catch (error) {
      logger.error({ error, filters }, 'Failed to find characters');
      throw error;
    }
  }

  async findById(id: string): Promise<Character | null> {
    try {
      const character = await prisma.character.findUnique({
        where: { id },
      });

      if (!character) {
        logger.warn({ id }, 'Character not found');
        return null;
      }

      return character;
    } catch (error) {
      logger.error({ error, id }, 'Failed to find character');
      throw error;
    }
  }

  async create(data: CreateCharacterDto): Promise<Character> {
    try {
      const character = await prisma.character.create({
        data,
      });

      logger.info({ characterId: character.id }, 'Character created');

      return character;
    } catch (error) {
      logger.error({ error, data }, 'Failed to create character');
      throw error;
    }
  }
}

export const characterService = new CharacterService();
```

## Authentication Patterns

### Passport Strategy

```typescript
// src/config/passport.google.ts
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from '../lib/prisma';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Find or create user
        let user = await prisma.user.findUnique({
          where: { googleId: profile.id },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              googleId: profile.id,
              email: profile.emails![0].value,
              firstName: profile.name?.givenName,
              lastName: profile.name?.familyName,
              avatar: profile.picture,
            },
          });
        }

        done(null, user);
      } catch (error) {
        done(error);
      }
    }
  )
);
```

### Session Management

```typescript
// src/middleware/session.ts
import session from 'express-session';
import { prisma } from '../lib/prisma';

export const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
  store: new PrismaSessionStore(prisma),
});
```

## WebSocket Patterns (Socket.IO)

### Socket Setup

```typescript
// src/socket/index.ts
import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { authenticateSocket } from './middleware/auth';

export function initializeSocket(httpServer: HTTPServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
  });

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'Socket connected');

    socket.on('join-character', (characterId) => {
      socket.join(`character:${characterId}`);
      logger.info({ socketId: socket.id, characterId }, 'Joined character room');
    });

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, 'Socket disconnected');
    });
  });

  return io;
}
```

## Best Practices

### DO

✅ Use async/await for async handlers
✅ Handle errors with try/catch
✅ Use structured logging
✅ Validate input with Zod
✅ Extend Express Request type globally
✅ Use middleware for cross-cutting concerns
✅ Separate business logic into services
✅ Use TypeScript for all handlers

### DON'T

❌ Use callback style (use async/await)
❌ Skip error handling
❌ Mix business logic in routes
❌ Hardcode error messages
❌ Skip input validation
❌ Forget to call next() in middleware
❌ Use `any` types

## Related Skills

- `charhub-express-routes-patterns` - Route organization
- `charhub-express-controllers-patterns` - Controller patterns
- `charhub-express-middleware-patterns` - Middleware patterns
- `charhub-prisma-patterns` - Database patterns
- `charhub-typescript-standards` - TypeScript patterns
