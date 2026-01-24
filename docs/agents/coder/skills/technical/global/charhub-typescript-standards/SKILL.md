---
name: charhub-typescript-standards
description: TypeScript coding standards and best practices for CharHub. Use when writing TypeScript code in backend or frontend to ensure type safety, proper interfaces, and maintainable code.
---

# CharHub TypeScript Standards

## Purpose

Define TypeScript coding standards used across CharHub backend and frontend to ensure type safety, maintainability, and consistency.

## Core Principles

1. **Type Safety Over Convenience** - Never use `any` when a proper type can be defined
2. **Interfaces for Shapes** - Use interfaces for object shapes, types for unions
3. **Explicit Returns** - Explicitly type function returns
4. **Null Safety** - Handle null/undefined explicitly

## Interface vs Type

### Use Interfaces For

**Object shapes and API contracts**:
```typescript
// ✅ GOOD - Interface for object shape
interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

interface CreateCharacterDto {
  firstName: string;
  lastName: string;
  description?: string;  // Optional
}

interface ApiResponse<T> {
  data: T;
  error: string | null;
}
```

### Use Types For

**Unions, aliases, and utility types**:
```typescript
// ✅ GOOD - Type for union
type UserRole = 'ADMIN' | 'BASIC' | 'PREMIUM' | 'BOT';

// ✅ GOOD - Type for utility
type Nullable<T> = T | null;
type Optional<T> = T | undefined;

// ✅ GOOD - Type for mapped
type CharacterUpdate = Partial<CreateCharacterDto>;

// ✅ GOOD - Type for function signature
type EventHandler = (event: Event) => void;
```

## Function Type Signatures

### Always Specify Return Types

```typescript
// ❌ BAD - Return type inferred
function getUser(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

// ✅ GOOD - Explicit return type
async function getUser(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

// ✅ GOOD - Explicit return for complex types
async function getUserWithCharacters(
  id: string
): Promise<(User & { characters: Character[] }) | null> {
  return prisma.user.findUnique({
    where: { id },
    include: { characters: true },
  });
}
```

### Parameter Types

```typescript
// ✅ GOOD - Explicit parameter types
function createCharacter(data: CreateCharacterDto): Promise<Character> {
  return prisma.character.create({ data });
}

// ✅ GOOD - Destructured with types
function updateCharacter(
  id: string,
  { firstName, lastName }: Partial<Pick<Character, 'firstName' | 'lastName'>>
): Promise<Character> {
  return prisma.character.update({
    where: { id },
    data: { firstName, lastName },
  });
}
```

## Avoid `any` Type

### Why `any` is Bad

- Loses all type safety
- Defeats the purpose of TypeScript
- Hides potential bugs
- Makes IDE autocomplete less useful

### Proper Alternatives

```typescript
// ❌ BAD - Using any
function processData(data: any) {
  return data.value;
}

// ✅ GOOD - Using generic
function processData<T extends { value: string }>(data: T): string {
  return data.value;
}

// ✅ GOOD - Using specific interface
interface DataContainer {
  value: string;
}
function processData(data: DataContainer): string {
  return data.value;
}

// ✅ GOOD - Using unknown with type guard
function processData(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return (data as { value: string }).value;
  }
  throw new Error('Invalid data format');
}
```

### When `any` Might Be Acceptable

**Only in these specific cases**:
1. Migrating JavaScript to TypeScript gradually
2. Third-party library types are broken
3. Type assertions are proven correct and performance-critical

```typescript
// Example: Prisma select with complex nested structure
// Use expect.anything() in tests instead
const result = await prisma.character.findMany({
  select: expect.anything(), // Prisma handles validation internally
});
```

## Null and Undefined Handling

### Explicit Null Checks

```typescript
// ✅ GOOD - Explicit null handling
function getUserName(user: User | null): string {
  if (!user) {
    return 'Anonymous';
  }
  return `${user.firstName} ${user.lastName}`;
}

// ✅ GOOD - Optional chaining with nullish coalescing
function getAvatarUrl(user: User | null): string {
  return user?.avatarUrl ?? '/default-avatar.png';
}

// ✅ GOOD - Type guard for validation
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'firstName' in value
  );
}
```

### Non-Null Assertion

**Use sparingly** - only when you're certain value exists:

```typescript
// ⚠️ USE SPARINGLY - Non-null assertion
const element = document.getElementById('app')!; // We know it exists

// Better alternative with check
const element = document.getElementById('app');
if (!element) throw new Error('App element not found');
```

## Enums vs String Unions

### Prefer String Unions

```typescript
// ✅ GOOD - String union (recommended)
type UserRole = 'ADMIN' | 'BASIC' | 'PREMIUM' | 'BOT';

function canEditContent(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'PREMIUM';
}

// ❌ AVOID - Enum (unless needed for specific reason)
enum UserRole {
  ADMIN = 'ADMIN',
  BASIC = 'BASIC',
  PREMIUM = 'PREMIUM',
  BOT = 'BOT',
}
```

**Why string unions**:
- Simpler - just strings
- Better debugging - see actual values
- Easier to serialize/deserialize
- Work better with Prisma and databases

## Type Guards

### Creating Type Guards

```typescript
// ✅ GOOD - Type guard for API response
function isSuccessResponse<T>(response: ApiResponse<T>): response is { data: T; error: null } {
  return response.error === null && response.data !== null;
}

// ✅ GOOD - Type guard for discriminated union
type Character =
  | { type: 'NPC'; behavior: NpcBehavior }
  | { type: 'PLAYER'; userId: string };

function isPlayer(character: Character): character is Character & { type: 'PLAYER' } {
  return character.type === 'PLAYER';
}
```

### Using Type Guards

```typescript
// Type guard narrows type
function processCharacter(character: Character): void {
  if (isPlayer(character)) {
    // TypeScript knows this is PLAYER type
    console.log(character.userId);
  } else {
    // TypeScript knows this is NPC type
    console.log(character.behavior);
  }
}
```

## Generic Types

### Simple Generics

```typescript
// ✅ GOOD - Generic function
function first<T>(items: T[]): T | undefined {
  return items[0];
}

// ✅ GOOD - Generic with constraint
function length<T extends { length: number }>(item: T): number {
  return item.length;
}
```

### Generic Classes

```typescript
// ✅ GOOD - Generic repository pattern
class Repository<T> {
  constructor(private model: { findMany(): Promise<T[]> }) {}

  async findAll(): Promise<T[]> {
    return this.model.findMany();
  }
}
```

### Generic Constraints

```typescript
// ✅ GOOD - Constrain to having id property
function findById<T extends { id: string }>(
  items: T[],
  id: string
): T | undefined {
  return items.find(item => item.id === id);
}
```

## Utility Types

### Common Utility Types

```typescript
// Partial - Make all properties optional
type CharacterUpdate = Partial<Character>;

// Required - Make all properties required
type RequiredCharacter = Required<Partial<Character>>;

// Readonly - Make all properties readonly
type ReadonlyCharacter = Readonly<Character>;

// Pick - Select specific properties
type CharacterName = Pick<Character, 'firstName' | 'lastName'>;

// Omit - Remove specific properties
type CreateCharacterDto = Omit<Character, 'id' | 'createdAt'>;

// Record - Create object type with specific keys
type RolePermissions = Record<UserRole, string[]>;
```

## Config and Environment Types

### Environment Variables

```typescript
// ✅ GOOD - Type environment config
interface Config {
  port: number;
  databaseUrl: string;
  redisUrl: string;
  jwtSecret: string;
  nodeEnv: 'development' | 'production' | 'test';
}

// ✅ GOOD - Validation with zod
import { z } from 'zod';

const configSchema = z.object({
  port: z.number().default(3001),
  databaseUrl: z.string().url(),
  redisUrl: z.string().url(),
  jwtSecret: z.string().min(32),
  nodeEnv: z.enum(['development', 'production', 'test']),
});

type Config = z.infer<typeof configSchema>;
```

## Arrays and Collections

### Array Types

```typescript
// ✅ GOOD - Explicit array type
function getActiveCharacters(characters: Character[]): Character[] {
  return characters.filter(c => c.isActive);
}

// ✅ GOOD - Readonly array parameter
function countItems(items: readonly string[]): number {
  return items.length;
}

// ✅ GOOD - Tuple for fixed-length arrays
type Coordinate = [number, number]; // [x, y]
```

## Import/Export Types

### Type-Only Imports

```typescript
// ✅ GOOD - Type-only import (reduces bundle size in some scenarios)
import type { User, Character } from './types';

// ✅ GOOD - Mixed import (default and types)
import UserService, { type UserServiceConfig } from './UserService';

// ✅ GOOD - Export type
export type { User, Character };
export type { CreateUserDto };
```

## Common Patterns

### DTO (Data Transfer Object)

```typescript
// ✅ GOOD - Request DTO
interface CreateCharacterRequest {
  firstName: string;
  lastName: string;
  description?: string;
}

// ✅ GOOD - Response DTO
interface CharacterResponse {
  id: string;
  fullName: string;
  description: string | null;
}

// ✅ GOOD - Conversion function
function toResponse(character: Character): CharacterResponse {
  return {
    id: character.id,
    fullName: `${character.firstName} ${character.lastName}`,
    description: character.description,
  };
}
```

### Service Layer Types

```typescript
// ✅ GOOD - Service method signatures
interface CharacterService {
  findById(id: string): Promise<Character | null>;
  findAll(filters: CharacterFilters): Promise<Character[]>;
  create(data: CreateCharacterDto): Promise<Character>;
  update(id: string, data: UpdateCharacterDto): Promise<Character>;
  delete(id: string): Promise<void>;
}
```

## Best Practices Summary

| Do | Don't |
|-----|--------|
| Use interfaces for object shapes | Use `any` type |
| Specify return types explicitly | Rely on type inference for returns |
| Handle null/undefined explicitly | Assume values exist |
| Use string unions for enums | Use enums unnecessarily |
| Create type guards for validation | Use type assertions carelessly |
| Use generics for reusable code | Duplicate code with different types |
| Import types with `import type` | Mix types and values in imports |

## Related Skills

- `charhub-nestjs-patterns` - NestJS-specific TypeScript patterns
- `charhub-api-conventions` - API type definitions
- `charhub-vue3-patterns` - Vue 3 TypeScript patterns
