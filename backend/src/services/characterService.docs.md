# Character Service Documentation

**Purpose**: Character CRUD operations and business logic with optimized list queries for dashboard performance.

**Related Files**:
- Service: `backend/src/services/characterService.ts`
- Types: `backend/src/services/characterService.ts` (CharacterWithRelations, CharacterListResult)
- Routes: `backend/src/routes/v1/characters.ts`
- Validators: `backend/src/validators/`
- Used by: Dashboard, character list views, character detail pages, conversation system

## Overview

The character service handles all character-related operations including creation, retrieval, updating, deletion, and filtering. It supports multiple query patterns optimized for different use cases (dashboard cards, detail views, conversation selection).

### Key Features

- **Full CRUD operations** for characters
- **Multi-criteria filtering** (search, tags, gender, species, age rating)
- **Visibility-based access control** (PUBLIC, PRIVATE, UNLISTED)
- **Batch character retrieval** with pagination
- **Avatar enrichment** for easy image access
- **Stats integration** through characterStatsService
- **Permission checks** for editing and access control

### Architecture

```
Character Request
       ↓
Apply Filters (search, tags, gender, species, etc.)
       ↓
Query Database (with includes)
       ↓
Enrich with Avatar URL
       ↓
Apply Content Tag Filtering (post-query)
       ↓
Return Paginated Result
```

## Architecture

### Database Schema

```prisma
model Character {
  id                      String       @id @default(uuid())
  firstName               String
  lastName                String?
  age                     Int?
  gender                  CharacterGender?
  speciesId               String?
  style                   String?
  physicalCharacteristics String?
  personality             String?
  history                 String?
  visibility              Visibility   @default(PRIVATE)
  originalLanguageCode    String?
  ageRating               AgeRating    @default(G)
  contentTags             ContentTag[]
  userId                  String
  isSystemCharacter       Boolean      @default(false)
  contentVersion          Int          @default(1)
  createdAt               DateTime     @default(now())
  updatedAt               DateTime     @updatedAt

  // Relations
  user             User              @relation(fields: [userId], references: [id])
  species          Species?          @relation(fields: [speciesId], references: [id])
  lora             Lora?
  mainAttire       Attire?
  attires          Attire[]
  tags             Tag[]
  stickers         Sticker[]
  images           CharacterImage[]
  conversations    ConversationParticipant[]
  favorites        FavoriteCharacter[]

  @@index([userId])
  @@index([visibility])
  @@index([createdAt])
}

enum Visibility {
  PRIVATE
  UNLISTED
  PUBLIC
}
```

### CharacterWithRelations Interface

```typescript
export interface CharacterWithRelations {
  id: string;
  firstName: string;
  lastName: string | null;
  age: number | null;
  gender: CharacterGender | null;
  speciesId: string | null;
  style: string | null;
  physicalCharacteristics: string | null;
  personality: string | null;
  history: string | null;
  visibility: Visibility;
  originalLanguageCode: string | null;
  ageRating: AgeRating;
  contentTags: ContentTag[];
  userId: string;
  loraId: string | null;
  mainAttireId: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  creator?: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  species?: {
    id: string;
    name: string;
  } | null;
  lora?: unknown | null;
  mainAttire?: unknown | null;
  attires?: unknown[];
  tags?: unknown[];
  stickers?: unknown[];
}
```

### CharacterListResult Interface

```typescript
export interface CharacterListResult {
  characters: CharacterWithRelations[];
  total: number;         // Total count (before pagination)
  hasMore: boolean;      // Whether more pages exist
}
```

## API/Usage

### Get Public Characters (with Pagination)

**Use Case**: Browse public characters on dashboard (unauthenticated users).

```typescript
import { getPublicCharacters } from '../services/characterService';

const result = await getPublicCharacters({
  search: 'dragon',
  tags: ['fantasy', 'magic'],
  gender: ['Female', 'Male'],
  species: ['Dragon', 'Human'],
  ageRatings: ['G', 'PG'],
  blockedTags: ['violence'], // Filter out these content tags
  skip: 0,
  limit: 30,
});

console.log(result.characters); // Array of characters
console.log(result.total); // 150
console.log(result.hasMore); // true
```

**Parameters**:
- `search?: string` - Search in firstName, lastName, physicalCharacteristics, personality, history
- `tags?: string[]` - Filter by tag IDs
- `gender?: string | string[]` - Filter by gender (supports multiple)
- `species?: string | string[]` - Filter by species (supports multiple)
- `ageRatings?: string[]` - Filter by age rating
- `blockedTags?: string[]` - Exclude characters with these content tags
- `skip?: number` - Pagination offset (default: 0)
- `limit?: number` - Page size (default: 20)

**Returns**: `Promise<CharacterListResult>`

### Get Public and Own Characters (with Pagination)

**Use Case**: Dashboard for authenticated users (shows public + user's own characters).

```typescript
import { getPublicAndOwnCharacters } from '../services/characterService';

const result = await getPublicAndOwnCharacters('user_123', {
  search: 'elf',
  skip: 0,
  limit: 30,
});

// Returns: PUBLIC characters from anyone + user's own characters (any visibility)
```

**Parameters**: Same as `getPublicCharacters()` + `userId: string`

**Returns**: `Promise<CharacterListResult>`

### Get Characters by User ID

**Use Case**: User's character management page (shows only their characters).

```typescript
import { getCharactersByUserId } from '../services/characterService';

const characters = await getCharactersByUserId('user_123', {
  search: 'warrior',
  tags: ['combat'],
  gender: 'Female',
  skip: 0,
  limit: 20,
});
```

**Parameters**: Same as `getPublicCharacters()` (all filters apply)

**Returns**: `Promise<CharacterWithRelations[]>`

### Get Popular Characters

**Use Case**: "Popular" tab on dashboard, sorted by conversation count.

```typescript
import { getPopularCharacters } from '../services/characterService';

const result = await getPopularCharacters({
  search: 'fantasy',
  skip: 0,
  limit: 30,
});

// Returns characters sorted by conversation count (descending)
```

**Performance Note**: This method fetches conversation counts after fetching characters, which can be slow. Consider using batch stats endpoint (FEATURE-015) instead.

**Parameters**: Same as `getPublicCharacters()`

**Returns**: `Promise<CharacterListResult>`

### Get Newest Characters

**Use Case**: "Newest" tab on dashboard, sorted by creation date.

```typescript
import { getNewestCharacters } from '../services/characterService';

const result = await getNewestCharacters({
  species: ['Elf', 'Dwarf'],
  skip: 0,
  limit: 30,
});

// Returns characters sorted by createdAt (descending - newest first)
```

**Parameters**: Same as `getPublicCharacters()`

**Returns**: `Promise<CharacterListResult>`

### Get Character by ID

**Use Case**: Character detail page.

```typescript
import { getCharacterById } from '../services/characterService';

const character = await getCharacterById('char_123');

if (!character) {
  return res.status(404).json({ error: 'Character not found' });
}

console.log(character.firstName);
console.log(character.avatar); // Enriched field
```

**Returns**: `Promise<CharacterWithRelations | null>`

### Create Character

**Use Case**: User creates a new character.

```typescript
import { createCharacter } from '../services/characterService';
import type { CreateCharacterInput } from '../validators';

const input: CreateCharacterInput = {
  userId: 'user_123',
  firstName: 'Aragorn',
  lastName: 'Elessar',
  age: 87,
  gender: 'Male',
  species: 'Human',
  personality: 'Brave and noble...',
  visibility: 'PUBLIC',
  ageRating: 'PG',
  attireIds: ['attire_1', 'attire_2'],
  tagIds: ['fantasy', 'warrior'],
};

const character = await createCharacter(input);
```

**Parameters**: `CreateCharacterInput` (see validators)

**Returns**: `Promise<CharacterWithRelations>` with enriched `avatar` field

### Update Character

**Use Case**: User edits existing character.

```typescript
import { updateCharacter } from '../services/characterService';
import type { UpdateCharacterInput } from '../validators';

const updates: UpdateCharacterInput = {
  firstName: 'Aragorn',
  personality: 'Updated personality...',
  contentTags: ['fantasy', 'adventure'],
};

const character = await updateCharacter('char_123', updates);
```

**Parameters**: `UpdateCharacterInput` (partial, all fields optional)

**Returns**: `Promise<CharacterWithRelations>`

**Side Effects**:
- Increments `contentVersion` if translatable fields changed
- Invalidates translations via `translationService`

### Delete Character

**Use Case**: User deletes their character.

```typescript
import { deleteCharacter } from '../services/characterService';

await deleteCharacter('char_123');

// Cascade deletes relations (conversations, favorites, images, etc.)
```

### Permission Checks

```typescript
import {
  isCharacterOwner,
  canEditCharacter,
  canAccessCharacter
} from '../services/characterService';

// Check if user owns character
const isOwner = await isCharacterOwner('char_123', 'user_123');

// Check if user can edit (owner or ADMIN editing official character)
const canEdit = canEditCharacter(
  'user_123',
  'ADMIN', // userRole
  '00000000-0000-0000-0000-000000000001' // characterUserId (CharHub Official)
);

// Check if user can access based on visibility
const canAccess = await canAccessCharacter('char_123', 'user_123');
```

### Favorite Operations

```typescript
import {
  toggleFavoriteCharacter,
  getFavoriteCharacters,
  isCharacterFavorited
} from '../services/characterService';

// Toggle favorite
const result = await toggleFavoriteCharacter('user_123', 'char_123', true);
// { success: true, isFavorite: true }

// Get user's favorite characters
const favorites = await getFavoriteCharacters('user_123', {
  skip: 0,
  limit: 20,
});

// Check if character is favorited
const isFavorited = await isCharacterFavorited('user_123', 'char_123');
```

### Avatar Enrichment Helpers

```typescript
import {
  getActiveAvatarUrl,
  enrichCharacterWithAvatar,
  enrichCharactersWithAvatar
} from '../services/characterService';

// Extract avatar URL from images array
const avatarUrl = getActiveAvatarUrl(character.images);

// Add avatar field to single character
const enriched = enrichCharacterWithAvatar(character);
// { ...character, avatar: 'https://...' }

// Add avatar field to array
const enriched = enrichCharactersWithAvatar(characters);
```

**Note**: All service methods automatically enrich results with `avatar` field.

## FEATURE-015: Dashboard Performance Optimization

### Overview

FEATURE-015 introduced major performance optimizations for character list queries, primarily through batch stats loading and optimized payloads.

### Key Changes

#### 1. Batch Stats Integration

The character list endpoint now supports `includeStats=true` parameter to embed stats directly in the response, eliminating N+1 query problem.

**Before (N+1 Problem)**:
```
1x GET /characters?limit=30         ~465ms
30x GET /characters/:id/stats       ~13,200ms
─────────────────────────────────────────────
Total: ~14 seconds
```

**After (Optimized)**:
```
1x GET /characters?limit=30&includeStats=true  ~600ms
─────────────────────────────────────────────
Total: ~600ms (96% faster)
```

#### 2. Field Selection

The endpoint supports `fields` parameter to reduce payload size by returning only requested fields.

**Example Request**:
```http
GET /api/v1/characters?fields=id,firstName,lastName,avatar,ageRating,stats
```

**Example Response**:
```json
{
  "id": "char_123",
  "firstName": "Aragorn",
  "lastName": "Elessar",
  "avatar": "https://...",
  "ageRating": "PG",
  "stats": {
    "conversationCount": 42,
    "favoriteCount": 1337,
    "isFavoritedByUser": true
  }
  // personality, history, etc. NOT included
}
```

#### 3. Usage in Routes

```typescript
// backend/src/routes/v1/characters.ts
router.get('/', async (req, res) => {
  const { includeStats, fields, sortBy, limit = 30 } = req.query;

  // Fetch characters
  let result;
  if (sortBy === 'popular') {
    result = await getPopularCharacters({ limit: Number(limit) });
  } else if (sortBy === 'newest') {
    result = await getNewestCharacters({ limit: Number(limit) });
  } else {
    result = await getPublicCharacters({ limit: Number(limit) });
  }

  // Add stats if requested
  if (includeStats === 'true') {
    const characterIds = result.characters.map(c => c.id);
    const statsMap = await characterStatsService.getBatchCharacterStatsOptimized(
      characterIds,
      req.user?.id
    );

    result.characters = result.characters.map(char => ({
      ...char,
      stats: statsMap.get(char.id),
    }));
  }

  // Filter fields if requested
  if (fields) {
    const allowedFields = fields.split(',');
    result.characters = result.characters.map(char =>
      pick(char, [...allowedFields, 'id'])
    );
  }

  res.json(result);
});
```

### Performance Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| API requests for 30 characters | 31 | 1 | 97% reduction |
| Initial load time | ~14s | <1s | 93% faster |
| Response payload size | ~150KB | <50KB | 67% smaller |

### Frontend Integration

```typescript
// frontend/src/services/characterService.ts
export async function getCharactersForDashboard(params: {
  sortBy?: 'popular' | 'newest' | 'favorites';
  limit?: number;
}) {
  return api.get('/api/v1/characters', {
    params: {
      ...params,
      includeStats: true,
      fields: 'id,firstName,lastName,avatar,ageRating,stats',
    },
  });
}

// Usage in component
const { data } = useQuery({
  queryKey: ['characters', sortBy],
  queryFn: () => getCharactersForDashboard({ sortBy }),
});

// Stats come embedded - no separate fetch needed
data.characters.forEach(char => {
  console.log(char.stats.conversationCount);
});
```

## Filtering & Search

### Search Behavior

Search queries multiple fields using case-insensitive `contains`:

```typescript
// Searches in:
- firstName
- lastName
- physicalCharacteristics
- personality
- history (for public characters)
```

**Example**:
```typescript
const results = await getPublicCharacters({
  search: 'dragon warrior',
});

// Matches: "Dragon Warrior", "dragon-like personality", etc.
```

### Gender Filtering

Supports multiple values with special handling for `unknown`:

```typescript
// Single gender
await getPublicCharacters({ gender: 'Female' });

// Multiple genders
await getPublicCharacters({ gender: ['Female', 'Male'] });

// Include unknown (null gender)
await getPublicCharacters({ gender: ['Female', 'unknown'] });
```

### Species Filtering

Similar to gender, supports multiple values:

```typescript
await getPublicCharacters({
  species: ['Human', 'Elf', 'Dwarf'],
});
```

### Content Tag Filtering (Blocked)

Post-query filtering to exclude characters with specific content tags:

```typescript
const results = await getPublicCharacters({
  blockedTags: ['violence', 'gore'],
});

// Characters with these tags are filtered out after query
```

**Note**: This is done in-memory due to Prisma limitations with array filtering.

## Sorting Options

### Available Sort Methods

| Method | Service | Order | Use Case |
|--------|---------|-------|----------|
| `popular` | `getPopularCharacters()` | Conversation count | Popular tab |
| `newest` | `getNewestCharacters()` | Creation date (desc) | Newest tab |
| `favorites` | `getFavoriteCharacters()` | Favorite date | Favorites tab |

### Popular Sort Implementation

```typescript
// Fetches characters first, then counts conversations
const result = await getPopularCharacters({ limit: 30 });

// Behind the scenes:
// 1. Fetch characters with filters
// 2. Get conversation counts for each
// 3. Sort by count (descending)
// 4. Apply pagination
```

**Performance**: Consider using batch stats for better performance with many characters.

## Error Handling

```typescript
try {
  const character = await createCharacter(input);
  res.json(character);
} catch (error) {
  if (error.code === 'P2002') {
    // Prisma unique constraint violation
    return res.status(409).json({ error: 'Character already exists' });
  }

  if (error.code === 'P2025') {
    // Prisma record not found
    return res.status(404).json({ error: 'Character not found' });
  }

  logger.error({ error }, 'Failed to create character');
  res.status(500).json({ error: 'Internal server error' });
}
```

## Important Notes

### Best Practices

**DO**:
- Use `getPublicCharacters()` for unauthenticated browsing
- Use `getPublicAndOwnCharacters()` for authenticated dashboard
- Use `getCharactersByUserId()` for user's character management
- Always handle pagination with `skip` and `limit`
- Include `blockedTags` for content filtering
- Use `includeStats=true` for dashboard to avoid N+1 queries
- Use `fields` parameter to reduce payload size

**DON'T**:
- Fetch all characters without pagination (use limit)
- Expose PRIVATE characters to non-owners
- Forget to validate permissions before edits
- Include heavy fields (history, personality) in list views
- Make individual stats requests in a loop (use batch)

### Visibility Rules

| Visibility | Owner | Others (Auth) | Unauthenticated |
|------------|-------|---------------|------------------|
| PUBLIC | ✅ | ✅ | ✅ |
| UNLISTED | ✅ | ✅ | ✅ |
| PRIVATE | ✅ | ❌ | ❌ |

**Note**: UNLISTED characters are accessible to anyone with the direct link.

### Content Versioning

Characters have `contentVersion` field that increments when translatable content changes:

```typescript
// Automatically incremented when updating:
- personality
- history
- physicalCharacteristics
```

This triggers translation invalidation via `translationService`.

### Gender Validation

Gender strings are normalized to enum values:

```typescript
// Valid inputs: "Male", "MALE", "male", "Female", etc.
// Invalid: defaults to "UNKNOWN" with warning log
```

### Species Lookup

Species is resolved from name to ID:

```typescript
const character = await createCharacter({
  species: 'Human',  // Name
  // Converts to: { speciesId: 'species_123' }
});
```

If species not found, `speciesId` is `null` (not an error).

## Testing

```typescript
import {
  createCharacter,
  getCharacterById,
  getPublicCharacters,
  updateCharacter,
  deleteCharacter,
  canEditCharacter,
  canAccessCharacter,
} from '../services/characterService';

describe('Character Service', () => {
  describe('getPublicCharacters', () => {
    it('should return paginated results', async () => {
      const result = await getPublicCharacters({
        skip: 0,
        limit: 10,
      });

      expect(result.characters.length).toBeLessThanOrEqual(10);
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.hasMore).toBeBoolean();
    });

    it('should filter by search term', async () => {
      const result = await getPublicCharacters({
        search: 'dragon',
      });

      result.characters.forEach(char => {
        const searchStr = `${char.firstName} ${char.lastName} ${char.personality}`.toLowerCase();
        expect(searchStr).toContain('dragon');
      });
    });

    it('should filter by multiple genders', async () => {
      const result = await getPublicCharacters({
        gender: ['Female', 'Male'],
      });

      result.characters.forEach(char => {
        expect(['FEMALE', 'MALE', null]).toContain(char.gender);
      });
    });

    it('should exclude blocked content tags', async () => {
      const result = await getPublicCharacters({
        blockedTags: ['violence'],
      });

      result.characters.forEach(char => {
        expect(char.contentTags).not.toContain('violence');
      });
    });
  });

  describe('createCharacter', () => {
    it('should create character with relations', async () => {
      const input: CreateCharacterInput = {
        userId: 'user_123',
        firstName: 'Test',
        gender: 'Female',
        species: 'Human',
        attireIds: ['attire_1'],
        tagIds: ['fantasy'],
      };

      const character = await createCharacter(input);

      expect(character.id).toBeDefined();
      expect(character.firstName).toBe('Test');
      expect(character.gender).toBe('FEMALE');
      expect(character.avatar).toBeDefined(); // Enriched field
    });
  });

  describe('canEditCharacter', () => {
    it('should allow owner to edit', () => {
      const canEdit = canEditCharacter(
        'user_123',
        'USER',
        'user_123' // character owner
      );

      expect(canEdit).toBe(true);
    });

    it('should allow ADMIN to edit official character', () => {
      const canEdit = canEditCharacter(
        'admin_123',
        'ADMIN',
        '00000000-0000-0000-0000-000000000001' // CharHub Official
      );

      expect(canEdit).toBe(true);
    });

    it('should not allow non-owner to edit', () => {
      const canEdit = canEditCharacter(
        'user_456',
        'USER',
        'user_123' // different owner
      );

      expect(canEdit).toBe(false);
    });
  });
});
```

## Dependencies

- **Prisma**: Database ORM for character operations
- **characterStatsService**: For stats aggregation (FEATURE-015)
- **translationService**: For translation invalidation on content changes
- **favoriteService**: For favorite operations
- **Logger**: For structured logging

## See Also

- **Feature Spec**: `docs/05-business/planning/features/active/FEATURE-015-dashboard-performance-optimization.md`
- **Character Stats Service**: `backend/src/services/characterStatsService.docs.md`
- **Characters Route**: `backend/src/routes/v1/characters.ts`
- **Validators**: `backend/src/validators/`

---

**Related Features**:
- FEATURE-015: Dashboard Performance Optimization (batch stats, field selection)
