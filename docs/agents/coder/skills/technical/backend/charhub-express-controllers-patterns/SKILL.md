---
name: charhub-express-controllers-patterns
description: Express controller patterns for CharHub. Use when implementing request handlers, controller logic, or separating business logic from routes in Express.
---

# CharHub Express Controllers Patterns

## Purpose

Define Express controller patterns, request handling conventions, and separation of concerns for CharHub backend development.

## Controller vs Service

### Separation of Concerns

```typescript
// ❌ BAD - Business logic in controller
router.get('/characters/:id', async (req, res) => {
  const { id } = req.params;

  // Business logic mixed with controller logic
  const character = await prisma.character.findUnique({
    where: { id },
    include: { user: true, stats: true },
  });

  if (!character) {
    return res.status(404).json({ error: 'Not found' });
  }

  const formatted = {
    ...character,
    fullName: `${character.firstName} ${character.lastName}`,
  };

  res.json(formatted);
});

// ✅ GOOD - Controller delegates to service
router.get('/characters/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Controller: handle request/response
  const character = await characterService.findById(id);

  if (!character) {
    res.status(404).json({ error: 'Character not found' });
    return;
  }

  res.json(character);
}));
```

## Controller Structure

### Basic Controller

```typescript
// controllers/characters.controller.ts
import { Response } from 'express';
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

## Request Handling Patterns

### Extracting Parameters

```typescript
export const updateCharacter = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const data = req.body;

  const character = await characterService.update(id, data);

  res.json(character);
};

export const searchCharacters = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { q } = req.query;
  const { type } = req.query;

  const results = await characterService.search({
    query: q as string,
    type: type as CharacterType,
  });

  res.json({ data: results });
};
```

### User from Session

```typescript
export const getCurrentUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  // Added by authentication middleware
  const user = req.user as AuthUser;

  res.json({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    role: user.role,
  });
};

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
```

## Response Patterns

### Success Responses

```typescript
// 200 OK
res.status(200).json(character);

// 201 Created
res.status(201).json(newCharacter);

// 204 No Content
res.status(204).send();

// With pagination
res.status(200).json({
  data: characters,
  meta: {
    total: 100,
    page: 1,
    limit: 20,
    totalPages: 5,
  },
});
```

### Error Responses

```typescript
// 400 Bad Request
res.status(400).json({
  error: 'Validation failed',
  details: [{ field: 'firstName', message: 'Required' }],
});

// 401 Unauthorized
res.status(401).json({ error: 'Unauthorized' });

// 403 Forbidden
res.status(403).json({ error: 'Forbidden' });

// 404 Not Found
res.status(404).json({ error: 'Character not found' });

// 409 Conflict
res.status(409).json({ error: 'Character already exists' });

// 500 Internal Server Error
res.status(500).json({ error: 'Internal server error' });
```

## Validation in Controllers

### With Zod

```typescript
import { z } from 'zod';

const createCharacterSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  type: z.enum(['BASIC', 'PREMIUM', 'BOT']),
  description: z.string().optional(),
});

export const createCharacter = async (
  req: Request,
  res: Response
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

    // Pass to error handler
    throw error;
  }
};
```

## Controller Organization

### Grouping Related Handlers

```typescript
// controllers/characters.controller.ts

// Query operations
export const getAll = async (req: Request, res: Response) => {
  const characters = await characterService.findAll();
  res.json({ data: characters });
};

export const getById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const character = await characterService.findById(id);

  if (!character) {
    return res.status(404).json({ error: 'Not found' });
  }

  res.json(character);
};

export const search = async (req: Request, res: Response) => {
  const { q } = req.query;
  const results = await characterService.search(q as string);
  res.json({ data: results });
};

// Mutations
export const create = async (req: Request, res: Response) => {
  const data = createCharacterSchema.parse(req.body);
  const character = await characterService.create(data);
  res.status(201).json(character);
};

export const update = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = updateCharacterSchema.parse(req.body);
  const character = await characterService.update(id, data);
  res.json(character);
};

export const remove = async (req: Request, res: Response) => {
  const { id } = req.params;
  await characterService.delete(id);
  res.status(204).send();
};
```

## File Upload Controllers

### Handling File Uploads

```typescript
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images allowed'));
    }
  },
});

export const uploadAvatar = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Upload to S3
    const url = await s3Service.upload(file);

    // Update character
    const character = await characterService.update(id, {
      avatarUrl: url,
    });

    res.json({ avatarUrl: url });
  } catch (error) {
    logger.error({ error }, 'Failed to upload avatar');
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
};

router.post('/characters/:id/avatar', upload.single('avatar'), uploadAvatar);
```

## Authentication Controllers

### OAuth Callbacks

```typescript
// controllers/auth.controller.ts
import passport from 'passport';

export const googleCallback = async (
  req: Request,
  res: Response
): Promise<void> => {
  // Passport adds user to req.user
  const user = req.user as AuthUser;

  // Create session
  req.session.userId = user.id;
  req.session.save();

  // Redirect
  res.redirect('/dashboard');
};

export const logout = async (
  req: Request,
  res: Response
): Promise<void> => {
  req.session.destroy((err) => {
    if (err) {
      logger.error({ err }, 'Failed to destroy session');
    }
  });

  res.redirect('/login');
};
```

## Best Practices

### DO

✅ Keep controllers thin - delegate to services
✅ Handle request/response logic
✅ Validate input before using
✅ Return appropriate status codes
✅ Use structured logging
✅ Handle all error cases
✅ Use TypeScript for all handlers

### DON'T

❌ Put business logic in controllers
❌ Skip input validation
❌ Use hardcoded status codes without reason
❌ Mix controller with service logic
❌ Skip error handling
❌ Use `any` types for req/res
❌ Forget to check for null/undefined

## Related Skills

- `charhub-express-patterns` - Express server setup
- `charhub-express-routes-patterns` - Route organization
- `charhub-express-middleware-patterns` - Middleware patterns
- `charhub-prisma-patterns` - Database patterns
- `charhub-typescript-standards` - TypeScript patterns
