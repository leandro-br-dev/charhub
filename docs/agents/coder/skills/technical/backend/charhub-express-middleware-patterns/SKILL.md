---
name: charhub-express-middleware-patterns
description: Express middleware patterns for CharHub. Use when creating authentication, logging, error handling, or custom middleware for Express.
---

# CharHub Express Middleware Patterns

## Purpose

Define Express middleware patterns, execution order, and conventions for CharHub backend middleware development.

## Middleware Execution Order

```
Request → 1. helmet (security)
        → 2. cors
        → 3. body-parser
        → 4. session
        → 5. logging
        → 6. authentication
        → 7. routes
        → 8. error handler (must be last)
```

## Security Middleware

### Helmet

```typescript
import helmet from 'helmet';

app.use(helmet());

// With custom configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));
```

### CORS

```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

## Body Parser

### JSON and URL-encoded

```typescript
import express from 'express';

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Raw body (for webhooks)
app.use(express.raw({ type: 'application/json' }));
```

### Size Limits

```typescript
app.use(express.json({
  limit: '10mb', // Limit payload size
}));
```

## Session Middleware

### Express Session

```typescript
import session from 'express-session';

app.use(session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
}));
```

### Custom Session Store (Prisma)

```typescript
// middleware/sessionStore.ts
import { PrismaSessionStore } from './sessionStore';

app.use(session({
  store: new PrismaSessionStore(prisma),
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  },
}));
```

## Logging Middleware

### Pino HTTP Logger

```typescript
import pino from 'pino';
import { pinoHttp } from 'pino-http';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  },
});

app.use(pinoHttp({ logger }));
```

### Custom Logging

```typescript
// middleware/requestLogger.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(
      {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration,
      },
      'HTTP request'
    );
  });

  next();
}

app.use(requestLogger);
```

## Authentication Middleware

### Passport Authentication

```typescript
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';

passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      const user = await authService.validateCredentials(email, password);
      if (user) {
        return done(null, user);
      }
      return done(null, false);
    }
  )
);

app.use(passport.initialize());
app.use(passport.session());
```

### Require Auth Middleware

```typescript
// middleware/auth.ts
import { Request, Response, NextFunction } from 'express';

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Usage
app.use('/api', requireAuth);
```

### Role-Based Authorization

```typescript
// middleware/role.ts
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as AuthUser;

    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}

// Usage
app.use('/api/admin', requireRole('ADMIN'));
```

## Error Handling Middleware

### Error Handler

```typescript
// middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ZodError } from 'zod';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error({ err, req }, 'Error caught');

  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.errors,
    });
    return;
  }

  // Prisma errors
  if (err.code === 'P2002') {
    res.status(409).json({ error: 'Resource already exists' });
    return;
  }

  // Default
  res.status(500).json({ error: 'Internal server error' });
}

// Must be last
app.use(errorHandler);
```

### Not Found Handler

```typescript
// middleware/notFoundHandler.ts
import { Request, Response } from 'express';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: 'Not found', path: req.url });
};

// Must be before error handler
app.use(notFoundHandler);
```

## Request Validation Middleware

### Zod Validation Middleware

```typescript
// middleware/validation.ts
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function validateBody<T extends z.ZodTypeAny>(schema: z.ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
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
import { z } from 'zod';

const createCharacterSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  type: z.enum(['BASIC', 'PREMIUM', 'BOT']),
});

router.post(
  '/characters',
  validateBody(createCharacterSchema),
  createCharacter
);
```

### Query Validation

```typescript
export function validateQuery<T extends z.ZodTypeAny>(schema: z.ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Invalid query parameters',
          details: error.errors,
        });
      } else {
        next(error);
      }
    }
  };
}

// Usage
const listQuerySchema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
});

router.get('/characters', validateQuery(listQuerySchema), getCharacters);
```

## Rate Limiting

### express-rate-limit

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
});

app.use('/api', limiter);
```

## Conditional Middleware

### Environment-Specific

```typescript
const devMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'development') {
    // Development-only logic
    res.setHeader('X-Debug', 'true');
  }
  next();
};

app.use(devMiddleware);
```

### Path-Specific Middleware

```typescript
// Only for specific routes
app.use('/api/upload', upload.single('file'), (req, res, next) => {
  // Post-upload logic
  next();
});
```

## Custom Middleware Factory

### Configuration Middleware

```typescript
// middleware/config.ts
export function createConfigMiddleware(config: {
  uploadPath: string;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.uploadPath = config.uploadPath;
    next();
  };
}

// Usage
app.use(createConfigMiddleware({ uploadPath: '/uploads' }));
```

## Request Property Extension

### Extending Express Request

```typescript
// types/express.ts
import { User } from './user';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: {
        id: string;
        userId: string;
      };
      uploadPath?: string;
    }
  }
}

export {};
```

## Best Practices

### DO

✅ Order middleware correctly
✅ Keep middleware focused on single concern
✅ Handle all error cases
✅ Use TypeScript for middleware functions
✅ Log important events
✅ Validate input early
✅ Use helmet for security headers

### DON'T

❌ Skip error handling in middleware
❌ Put business logic in middleware
❌ Forget to call next()
❌ Mix middleware with routes
❌ Use synchronous operations for heavy tasks
❌ Skip TypeScript typing

## Middleware Checklist

| Step | Middleware | Purpose |
|------|-----------|---------|
| 1 | helmet | Security headers |
| 2 | cors | Cross-origin resource sharing |
| 3 | express.json() | Body parsing |
| 4 | express.urlencoded() | URL-encoded bodies |
| 5 | session | Session management |
| 6 | logging | Request/response logging |
| 7 | passport | Authentication |
| 8 | custom auth | Authorization |
| 9 | routes | Route handlers |
| 10 | notFoundHandler | 404 handling |
| 11 | errorHandler | Error handling |

## Related Skills

- `charhub-express-patterns` - Express server setup
- `charhub-express-routes-patterns` - Route organization
- `charhub-express-controllers-patterns` - Controller patterns
- `charhub-typescript-standards` - TypeScript patterns
