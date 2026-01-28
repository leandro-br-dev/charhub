---
name: charhub-prisma-patterns
description: Prisma ORM patterns and best practices for CharHub. Use when working with database operations, migrations, or Prisma client in NestJS services.
---

# CharHub Prisma Patterns

## Purpose

Define Prisma ORM usage patterns, best practices, and common operations for CharHub backend database interactions.

## Prisma Setup

### Prisma Module

```typescript
// prisma/prisma.module.ts
import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### Prisma Service

```typescript
// prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

## CRUD Operations

### Create

```typescript
async create(data: CreateCharacterDto): Promise<Character> {
  return this.prisma.character.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      description: data.description,
      type: data.type,
      user: {
        connect: { id: data.userId }
      }
    },
  });
}
```

### Read

```typescript
// Find by ID
async findById(id: string): Promise<Character | null> {
  return this.prisma.character.findUnique({
    where: { id },
  });
}

// Find many with filters
async findAll(filters?: CharacterFilters): Promise<Character[]> {
  return this.prisma.character.findMany({
    where: {
      isActive: filters?.isActive,
      type: filters?.type,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

// Find with relations
async findByIdWithRelations(id: string): Promise<Character | null> {
  return this.prisma.character.findUnique({
    where: { id },
    include: {
      user: true,
      statistics: true,
    },
  });
}

// Find specific fields (select)
async findByIdMinimal(id: string): Promise<Character | null> {
  return this.prisma.character.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      type: true,
    },
  });
}
```

### Update

```typescript
async update(id: string, data: UpdateCharacterDto): Promise<Character> {
  return this.prisma.character.update({
    where: { id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      description: data.description,
    },
  });
}

// Upsert (create or update)
async upsert(data: UpsertCharacterDto): Promise<Character> {
  return this.prisma.character.upsert({
    where: { id: data.id },
    create: {
      firstName: data.firstName,
      lastName: data.lastName,
    },
    update: {
      firstName: data.firstName,
      lastName: data.lastName,
    },
  });
}
```

### Delete

```typescript
// Hard delete
async delete(id: string): Promise<Character> {
  return this.prisma.character.delete({
    where: { id },
  });
}

// Soft delete (preferred)
async softDelete(id: string): Promise<Character> {
  return this.prisma.character.update({
    where: { id },
    data: {
      isActive: false,
      deletedAt: new Date(),
    },
  });
}
```

## Advanced Queries

### Filtering

```typescript
// Multiple conditions
async findActivePremiumUsers(): Promise<Character[]> {
  return this.prisma.character.findMany({
    where: {
      isActive: true,
      type: 'PREMIUM',
      user: {
        isActive: true,
      },
    },
  });
}

// OR conditions
async searchCharacters(query: string): Promise<Character[]> {
  return this.prisma.character.findMany({
    where: {
      OR: [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    },
  });
}
```

### Relations

```typescript
// Include nested relations
async findWithAllRelations(id: string) {
  return this.prisma.character.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
      statistics: true,
      avatar: true,
    },
  });
}
```

### Pagination

```typescript
async findPaginated(page: number, limit: number) {
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    this.prisma.character.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    this.prisma.character.count(),
  ]);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

### Transactions

```typescript
async transferCharacter(
  characterId: string,
  fromUserId: string,
  toUserId: string
): Promise<void> {
  await this.prisma.$transaction(async (tx) => {
    // Update character ownership
    await tx.character.update({
      where: { id: characterId },
      data: { userId: toUserId },
    });

    // Log transfer
    await tx.characterTransfer.create({
      data: {
        characterId,
        fromUserId,
        toUserId,
        transferredAt: new Date(),
      },
    });
  });
}
```

### Batch Operations

```typescript
async updateMultiple(ids: string[], data: UpdateCharacterDto) {
  return this.prisma.character.updateMany({
    where: {
      id: { in: ids },
    },
    data,
  });
}

async deleteMultiple(ids: string[]) {
  return this.prisma.character.deleteMany({
    where: {
      id: { in: ids },
    },
  });
}
```

## Error Handling

### Prisma Error Codes

| Code | Meaning | HTTP Status | Handling |
|------|---------|-------------|----------|
| P2002 | Unique constraint violated | 409 Conflict | Resource already exists |
| P2025 | Record not found | 404 Not Found | Resource doesn't exist |
| P2003 | Foreign key constraint | 400 Bad Request | Invalid reference |
| P2014 | Changing required relation | 400 Bad Request | Can't change required relation |

### Error Handling Pattern

```typescript
@Injectable()
export class CharacterService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateCharacterDto): Promise<Character> {
    try {
      return await this.prisma.character.create({ data });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Character already exists');
      }
      if (error.code === 'P2003') {
        throw new BadRequestException('Invalid user reference');
      }
      throw new InternalServerErrorException('Failed to create character');
    }
  }

  async findById(id: string): Promise<Character> {
    const character = await this.prisma.character.findUnique({
      where: { id },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    return character;
  }
}
```

## Migration Workflow - CRITICAL!

### The Golden Rule

**EVERY schema.prisma change MUST have a corresponding migration.**

If you modify `schema.prisma` and don't create a migration:
- Tests may pass locally (Prisma auto-syncs in dev)
- Production WILL FAIL (no auto-sync)
- Other developers will have drift
- Agent Reviewer MUST block your PR

### MANDATORY: Create Migration After Schema Change

```bash
# 1. IMMEDIATELY after modifying schema.prisma:
npx prisma migrate dev --name descriptive_name

# 2. VERIFY migration was created:
ls -la prisma/migrations/ | tail -3

# 3. VERIFY migration content is correct:
cat prisma/migrations/LATEST_TIMESTAMP_*/migration.sql

# 4. COMMIT BOTH schema.prisma AND the migration folder
```

### Migration Naming Convention

```bash
# Good names (descriptive, snake_case):
npx prisma migrate dev --name add_theme_to_character
npx prisma migrate dev --name add_correction_tracking_fields
npx prisma migrate dev --name remove_deprecated_columns

# Bad names (vague):
npx prisma migrate dev --name update
npx prisma migrate dev --name fix
npx prisma migrate dev --name changes
```

### Migration File Structure

```
prisma/
├── schema.prisma              # Schema definition
├── migrations/                # Migration files
│   ├── 20260124000000_init/
│   │   └── migration.sql
│   ├── 20260124100000_add_character_type/
│   │   └── migration.sql
│   └── ...
└── seed.ts                    # Seed data (optional)
```

**Note**: Migration timestamps MUST be 2026, not 2025!

### Deploy Migrations

```bash
# Apply migrations in production/staging
npx prisma migrate deploy

# Check migration status
npx prisma migrate status
```

### Before Running Tests

```bash
# CRITICAL: Always run migrations before testing
cd backend
npx prisma migrate deploy
npm test
```

### FORBIDDEN Actions

| Action | Why Forbidden |
|--------|---------------|
| Manual ALTER TABLE | Not reproducible in production |
| Manual CREATE INDEX | Not tracked in version control |
| Skip migration creation | Causes deployment failures |
| Commit schema without migration | PR must be blocked |

### Pre-PR Checklist for Schema Changes

- [ ] Modified `schema.prisma`?
- [ ] Created migration with `npx prisma migrate dev --name ...`?
- [ ] Verified migration file exists in `prisma/migrations/`?
- [ ] Verified migration SQL contains expected changes?
- [ ] Migration timestamp is 2026 (not 2025)?
- [ ] `npx prisma migrate status` shows "up to date"?
- [ ] Committed BOTH schema.prisma AND migration folder?

**If any checkbox is NO, do NOT create PR!**

## Schema Patterns

### Model Naming

```prisma
// ✅ GOOD - PascalCase model names
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  role      UserRole
  createdAt DateTime @default(now())
}

// ❌ BAD - snake_case model names
model user {
  // ...
}
```

### Field Naming

```pr
// ✅ GOOD - camelCase field names
model Character {
  id          String   @id @default(uuid())
  firstName   String
  lastName    String
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
}

// ❌ BAD - snake_case field names
model Character {
  first_name  String
  is_active   Boolean
}
```

### Enums

```prisma
enum UserRole {
  ADMIN
  BASIC
  PREMIUM
  BOT
}

model User {
  id   String    @id @default(uuid())
  role UserRole  @default(BASIC)
}
```

### Relations

```prisma
model User {
  id         String      @id @default(uuid())
  characters Character[]
  createdAt  DateTime    @default(now())
}

model Character {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
}
```

## Select vs Include

### When to Use Select

```typescript
// ✅ Use select when you need specific fields
async getCharacterName(id: string): Promise<{ firstName: string; lastName: string } | null> {
  return this.prisma.character.findUnique({
    where: { id },
    select: {
      firstName: true,
      lastName: true,
    },
  });
}
```

### When to Use Include

```typescript
// ✅ Use include when you need relations
async getCharacterWithUser(id: string) {
  return this.prisma.character.findUnique({
    where: { id },
    include: {
      user: true,
    },
  });
}
```

## Testing with Prisma

### Mocking Prisma

```typescript
// character.service.spec.ts
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

describe('CharacterService', () => {
  let service: CharacterService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new CharacterService(mockPrisma as unknown as PrismaClient);
  });

  it('should find character by id', async () => {
    const mockCharacter = { id: '1', firstName: 'John' };
    mockPrisma.character.findUnique.mockResolvedValue(mockCharacter);

    const result = await service.findById('1');

    expect(result).toEqual(mockCharacter);
  });
});
```

### Critical: Don't Test Prisma Selects

```typescript
// ❌ WRONG - This doesn't work
expect(mockPrisma.character.findMany).toHaveBeenCalledWith({
  select: expect.objectContaining({
    id: true,
    firstName: true,
  }),
});

// ✅ CORRECT - Use expect.anything()
expect(mockPrisma.character.findMany).toHaveBeenCalledWith({
  select: expect.anything(), // Prisma handles validation
});
```

**Reason**: Prisma select objects have complex nested structure. The service logic matters, not the exact select shape.

## Best Practices

### DO

✅ Use transactions for multi-step operations
✅ Handle Prisma error codes properly
✅ Run migrations before tests
✅ Use select to limit returned fields
✅ Use include for relations
✅ Soft delete when possible
✅ Index frequently queried fields

### DON'T

❌ Run migrations in production without backup
❌ Skip error handling
❌ Use N+1 queries (use include instead)
❌ Test Prisma select shapes exactly
❌ Forget to run migrate deploy before tests
❌ Use hard-coded IDs in queries

## Performance Tips

### Use Select for Large Queries

```typescript
// ✅ GOOD - Only select needed fields
async getCharacterList() {
  return this.prisma.character.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  });
}
```

### Batch Operations

```typescript
// ✅ GOOD - Single query for multiple updates
await this.prisma.character.updateMany({
  where: { type: 'BASIC' },
  data: { isActive: false },
});

// ❌ BAD - Multiple queries
for (const id of ids) {
  await this.prisma.character.update({
    where: { id },
    data: { isActive: false },
  });
}
```

## Related Skills

- `charhub-nestjs-patterns` - NestJS service integration
- `charhub-api-conventions` - API endpoint patterns
- `charhub-testing-standards` - Testing with Prisma
