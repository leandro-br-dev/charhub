---
name: charhub-express-routes-patterns
description: Express route patterns and conventions for CharHub. Use when defining API routes, organizing route files, or setting up route handlers.
---

# CharHub Express Routes Patterns

## Purpose

Define Express route organization, RESTful conventions, and HTTP method patterns for CharHub backend API.

## Route Organization

### Directory Structure

```
backend/src/routes/
├── index.ts              # Main route aggregator
├── api/
│   ├── index.ts          # API routes entry
│   ├── characters.ts     # Character routes
│   ├── users.ts          # User routes
│   └── auth/             # Authentication routes
│       ├── index.ts
│       ├── google.ts
│       └── facebook.ts
└── web/                  # Web routes (if any)
    └── index.ts
```

## RESTful Route Conventions

### Route Naming (kebab-case)

```typescript
// ✅ GOOD - kebab-case routes
router.get('/user-settings', getUserSettings);
router.get('/character-avatar', getCharacterAvatar);
router.post('/system-configuration', createSystemConfig);

// ❌ BAD - camelCase routes
router.get('/userSettings', getUserSettings);
router.get('/characterAvatar', getCharacterAvatar);
```

### Resource Routes

```
/api/characters
├── GET    /api/characters           (list)
├── POST   /api/characters           (create)
├── GET    /api/characters/:id       (detail)
├── PATCH  /api/characters/:id       (update)
└── DELETE /api/characters/:id       (delete)
```

### CRUD Operations

```typescript
// routes/api/characters.ts
import { Router } from 'express';

const router = Router();

// List all
router.get('/', getCharacters);

// Get by ID
router.get('/:id', getCharacterById);

// Create
router.post('/', createCharacter);

// Update
router.patch('/:id', updateCharacter);

// Delete
router.delete('/:id', deleteCharacter);

export default router;
```

## Route Handler Patterns

### Async Handler Wrapper

```typescript
// utils/asyncHandler.ts
import { Request, Response, NextFunction } from 'express';

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export const asyncHandler = (fn: AsyncHandler) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Usage in routes
router.get('/', asyncHandler(getCharacters));
```

### Basic Handler

```typescript
export const getCharacterById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  const character = await characterService.findById(id);

  if (!character) {
    res.status(404).json({ error: 'Character not found' });
    return;
  }

  res.json(character);
};
```

### Handler with Validation

```typescript
import { z } from 'zod';

const createCharacterSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  type: z.enum(['BASIC', 'PREMIUM', 'BOT']),
});

export const createCharacter = async (
  req: Request,
  res: Response
): Promise<void> => {
  // Validate body
  const data = createCharacterSchema.parse(req.body);

  // Call service
  const character = await characterService.create(data);

  res.status(201).json(character);
};
```

## Route Parameters

### Path Parameters

```typescript
// Single parameter
router.get('/characters/:id', (req, res) => {
  const { id } = req.params;
  // id is string, convert if needed
});

// Multiple parameters
router.get('/users/:userId/characters/:characterId', (req, res) => {
  const { userId, characterId } = req.params;
});
```

### Query Parameters

```typescript
// With validation
import { z } from 'zod';

const listQuerySchema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
  type: z.enum(['BASIC', 'PREMIUM', 'BOT']).optional(),
  search: z.string().optional(),
});

export const getCharacters = async (req: Request, res: Response) => {
  // Parse and validate query params
  const query = listQuerySchema.parse(req.query);

  const characters = await characterService.findAll(query);

  res.json({ data: characters, meta: query });
};
```

## HTTP Status Codes

### Successful Responses

| Code | Usage |
|------|-------|
| 200 OK | GET, PATCH success |
| 201 Created | POST success |
| 204 No Content | DELETE success |

### Error Responses

```typescript
// 400 Bad Request
res.status(400).json({ error: 'Validation failed' });

// 401 Unauthorized
res.status(401).json({ error: 'Unauthorized' });

// 403 Forbidden
res.status(403).json({ error: 'Forbidden' });

// 404 Not Found
res.status(404).json({ error: 'Resource not found' });

// 409 Conflict
res.status(409).json({ error: 'Resource already exists' });

// 500 Internal Server Error
res.status(500).json({ error: 'Internal server error' });
```

## Response Format

### Success Response

```typescript
// Single resource
res.status(200).json({
  id: 'uuid-123',
  firstName: 'John',
  lastName: 'Doe',
  type: 'BASIC',
});

// Collection with pagination
res.status(200).json({
  data: [...],
  meta: {
    total: 100,
    page: 1,
    limit: 20,
    totalPages: 5,
  },
});

// Created
res.status(201).json({
  id: 'uuid-123',
  firstName: 'John',
  lastName: 'Doe',
  createdAt: '2025-01-24T10:00:00Z',
});
```

### Error Response

```typescript
// Current pattern
res.status(404).json({ error: 'Character not found' });

// With validation details
res.status(400).json({
  error: 'Validation failed',
  details: [
    {
      field: 'firstName',
      message: 'First name is required',
    },
  ],
});
```

## Route Modules

### Nested Routes

```typescript
// routes/api/index.ts
import { Router } from 'express';
import charactersRouter from './characters';
import authRouter from './auth';

const router = Router();

router.use('/characters', charactersRouter);
router.use('/auth', authRouter);

export default router;
```

### Route Composition

```typescript
// Main server setup
import apiRouter from './routes/api';

app.use('/api', apiRouter);
```

## Authentication Routes

### Protected Routes

```typescript
// routes/api/characters.ts
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';

// All routes require authentication
router.use(requireAuth);

// Some routes require specific roles
router.post('/', requireRole('ADMIN'), createCharacter);

// Or per-route
router.get('/', requireAuth, getCharacters);
router.get('/:id', requireAuth, getCharacterById);
```

### OAuth Routes

```typescript
// routes/api/auth/google.ts
import passport from 'passport';

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  googleCallback
);

async function googleCallback(req, res) {
  // Successful authentication, redirect
  res.redirect('/');
}
```

## File Upload Routes

### Multer Configuration

```typescript
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  },
});

router.post('/upload', upload.single('avatar'), uploadAvatar);
```

## Versioned Routes

### API Versioning

```typescript
// v1 routes
import { Router } from 'express';
const v1Router = Router();

v1Router.get('/characters', getCharactersV1);
v1Router.post('/characters', createCharacterV1);

export default v1Router;

// In main router
import v1Router from './api/v1';

app.use('/api/v1', v1Router);
```

## Best Practices

### DO

✅ Use kebab-case for routes
✅ Use async/await for handlers
✅ Validate input with Zod
✅ Return appropriate status codes
✅ Use asyncHandler wrapper
✅ Organize routes by resource
✅ Separate routes from controllers

### DON'T

❌ Use camelCase for routes
❌ Skip error handling
❌ Hardcode status codes without reason
❌ Put business logic in routes
❌ Skip input validation
❌ Mix route definitions with controllers

## Related Skills

- `charhub-express-patterns` - Express server setup
- `charhub-express-controllers-patterns` - Controller patterns
- `charhub-express-middleware-patterns` - Middleware patterns
- `charhub-prisma-patterns` - Database patterns
- `charhub-typescript-standards` - TypeScript patterns
