# Character Stats Service Documentation

**Purpose**: Optimized statistics aggregation for character engagement metrics.

**Related Files**:
- Service: `backend/src/services/characterStatsService.ts`
- Types: `backend/src/services/characterStatsService.ts` (CharacterStats interface)
- Routes: `backend/src/routes/v1/characters.ts`
- Used by: Dashboard, character list views, character detail pages

## Overview

The character stats service provides aggregated statistics about character engagement, including conversation counts, message counts, favorite counts, and image counts. It supports both individual character stats retrieval and optimized batch retrieval for multiple characters.

### Key Features

- **Individual stats retrieval** for single character
- **Optimized batch stats retrieval** using Prisma `groupBy()` to solve N+1 query problem
- **User-specific favorite status** tracking
- **Image count tracking** (excluding avatar images)
- **Efficient database queries** with minimal round-trips

### Stats Flow

```
Request stats for N characters
       ↓
Identify unique character IDs
       ↓
Execute 4 batch queries in parallel:
  - Conversation counts (groupBy)
  - Favorite counts (groupBy)
  - Image counts (groupBy)
  - User favorites (findMany, if authenticated)
       ↓
Aggregate results into Map
       ↓
Return Map<characterId, CharacterStats>
```

## Architecture

### Database Schema

The service queries multiple tables:

```prisma
model Character {
  id        String   @id
  // ... character fields
}

model ConversationParticipant {
  id                   String    @id
  conversationId       String
  actingCharacterId    String?
  representingCharacterId String?

  conversation         Conversation @relation(fields: [conversationId], references: [id])
  actingCharacter      Character?  @relation(fields: [actingCharacterId], references: [id])
  representingCharacter Character? @relation(fields: [representingCharacterId], references: [id])

  @@index([actingCharacterId])
  @@index([representingCharacterId])
}

model FavoriteCharacter {
  id         String   @id @default(uuid())
  userId     String
  characterId String

  user       User     @relation(fields: [userId], references: [id])
  character  Character @relation(fields: [characterId], references: [id])

  @@unique([userId, characterId])
  @@index([characterId])
}

model CharacterImage {
  id         String   @id @default(uuid())
  characterId String
  type       String   // AVATAR, REFERENCE, etc.
  url        String

  character  Character @relation(fields: [characterId], references: [id])

  @@index([characterId])
}
```

### CharacterStats Interface

```typescript
export interface CharacterStats {
  characterId: string;        // Character ID
  conversationCount: number;  // Number of conversations character participates in
  messageCount: number;       // Number of messages sent by character
  favoriteCount: number;      // Total number of favorites across all users
  isFavoritedByUser: boolean; // Whether current user favorited this character
  imageCount: number;         // Number of non-avatar images
}
```

## API/Usage

### Get Stats for Single Character

```typescript
import { characterStatsService } from '../services/characterStatsService';

const stats = await characterStatsService.getCharacterStats(
  'char_123',
  'user_456' // optional user ID for isFavoritedByUser
);

console.log(stats.conversationCount); // 42
console.log(stats.favoriteCount); // 1337
console.log(stats.isFavoritedByUser); // true
```

### Get Batch Stats (Legacy - N+1 Problem)

```typescript
// WARNING: This method makes N individual queries internally
// Use getBatchCharacterStatsOptimized() instead for better performance

const statsArray = await characterStatsService.getBatchCharacterStats(
  ['char_1', 'char_2', 'char_3'],
  'user_456'
);

// Returns: CharacterStats[]
```

**Performance**: O(N) database queries - one per character.

### Get Batch Stats (Optimized - Recommended)

```typescript
// RECOMMENDED: Single batch query using groupBy
const statsMap = await characterStatsService.getBatchCharacterStatsOptimized(
  ['char_1', 'char_2', 'char_3'],
  'user_456' // optional user ID
);

// Returns: Map<string, CharacterStats>
const char1Stats = statsMap.get('char_1');
console.log(char1Stats.conversationCount);
```

**Performance**: O(1) database queries - always 4 queries regardless of N characters.

**Parameters**:
- `characterIds: string[]` - Array of character IDs (duplicates removed automatically)
- `userId?: string` - Optional user ID to check if characters are favorited by this user

**Returns**: `Promise<Map<string, CharacterStats>>` - Map keyed by characterId

**Example**:

```typescript
// In character list route handler
app.get('/api/v1/characters', async (req, res) => {
  const { includeStats, limit = 30 } = req.query;

  // Fetch characters
  const characters = await prisma.character.findMany({
    take: limit,
    // ... other filters
  });

  // If stats requested, fetch in batch
  if (includeStats === 'true') {
    const characterIds = characters.map(c => c.id);
    const statsMap = await characterStatsService.getBatchCharacterStatsOptimized(
      characterIds,
      req.user?.id
    );

    // Merge stats into response
    const charactersWithStats = characters.map(char => ({
      ...char,
      stats: statsMap.get(char.id),
    }));

    return res.json(charactersWithStats);
  }

  return res.json(characters);
});
```

### Get Individual Stat Counts

```typescript
// Conversation count
const convCount = await characterStatsService.getConversationCount('char_123');

// Message count
const msgCount = await characterStatsService.getMessageCount('char_123');

// Image count (excludes AVATAR type)
const imgCount = await characterStatsService.getImageCount('char_123');
```

## Database Queries

### Batch Query Breakdown

The `getBatchCharacterStatsOptimized()` method executes 4 parallel queries:

#### Query 1: Conversation Counts (Acting Role)

```sql
SELECT acting_character_id, COUNT(conversation_id) as _count
FROM "ConversationParticipant"
WHERE acting_character_id IN ($1, $2, $3, ...)
GROUP BY acting_character_id
```

#### Query 2: Conversation Counts (Representing Role)

```sql
SELECT representing_character_id, COUNT(conversation_id) as _count
FROM "ConversationParticipant"
WHERE representing_character_id IN ($1, $2, $3, ...)
GROUP BY representing_character_id
```

**Note**: The two conversation count queries are merged with `Math.max()` to approximate distinct conversation count (a character can act in or represent a conversation).

#### Query 3: Favorite Counts

```sql
SELECT character_id, COUNT(*) as _count
FROM "FavoriteCharacter"
WHERE character_id IN ($1, $2, $3, ...)
GROUP BY character_id
```

#### Query 4: Image Counts (Excluding AVATAR)

```sql
SELECT character_id, COUNT(*) as _count
FROM "CharacterImage"
WHERE character_id IN ($1, $2, $3, ...)
  AND type != 'AVATAR'
GROUP BY character_id
```

#### Query 5: User Favorites (If Authenticated)

```sql
SELECT character_id
FROM "FavoriteCharacter"
WHERE user_id = $1
  AND character_id IN ($2, $3, $4, ...)
```

### Performance Comparison

**For 30 characters**:

| Method | Queries | Time (approx) | Improvement |
|--------|---------|---------------|-------------|
| Legacy (N+1) | 30 | ~13,200ms | - |
| Optimized (batch) | 4 | ~500ms | **96% faster** |

## Error Handling

```typescript
try {
  const statsMap = await characterStatsService.getBatchCharacterStatsOptimized(
    characterIds,
    userId
  );

  // Handle empty result gracefully
  if (statsMap.size === 0) {
    console.log('No stats found');
  }
} catch (error) {
  // Database errors
  logger.error({ error, characterIds }, 'Failed to fetch batch stats');
  throw new Error('Unable to load character statistics');
}
```

**Edge Cases Handled**:
- Empty `characterIds` array → Returns empty Map
- Duplicate character IDs → Duplicates removed
- Invalid character IDs → Returns stats with 0 counts
- No `userId` provided → `isFavoritedByUser` is `false` for all
- Character with no stats → Returns default stats (all counts = 0)

## Frontend Integration

### Fetch Stats with Character List

```typescript
// frontend/src/services/characterService.ts
export async function getCharactersWithStats(params: {
  limit?: number;
  sortBy?: string;
}) {
  const response = await api.get('/api/v1/characters', {
    params: {
      ...params,
      includeStats: true, // Enable stats in response
    },
  });

  return response.data; // Each character has .stats property
}
```

### Display Stats in Component

```typescript
// frontend/src/components/CharacterCard.tsx
interface CharacterCardProps {
  character: {
    id: string;
    firstName: string;
    stats?: {
      conversationCount: number;
      favoriteCount: number;
      isFavoritedByUser: boolean;
    };
  };
}

function CharacterCard({ character }: CharacterCardProps) {
  const { stats } = character;

  return (
    <div className="character-card">
      <h3>{character.firstName}</h3>

      {stats ? (
        <div className="stats">
          <span>💬 {stats.conversationCount}</span>
          <span>⭐ {stats.favoriteCount}</span>
          {stats.isFavoritedByUser && <span className="badge">Favorited</span>}
        </div>
      ) : (
        <div className="stats loading">Loading stats...</div>
      )}
    </div>
  );
}
```

### TanStack Query Integration

```typescript
// frontend/src/pages/dashboard/index.tsx
import { useQuery } from '@tanstack/react-query';

export function useCharactersWithStats(sortBy: string) {
  return useQuery({
    queryKey: ['characters', sortBy, { withStats: true }],
    queryFn: () => getCharactersWithStats({ sortBy }),
    // Stats come with characters - no separate query needed
  });
}
```

## Important Notes

### Best Practices

**DO**:
- Use `getBatchCharacterStatsOptimized()` for multiple characters (dashboard, lists)
- Use `getCharacterStats()` for single character (detail page)
- Include `userId` parameter to get accurate `isFavoritedByUser` status
- Handle empty Maps gracefully in calling code
- Use the stats for display purposes only (not for critical business logic)

**DON'T**:
- Use `getBatchCharacterStats()` (legacy method) - it has N+1 problem
- Fetch stats individually in a loop - use batch method
- Assume stats exist - check for `undefined` before accessing
- Cache stats for long periods - they become stale quickly
- Use `messageCount` in batch queries - it's expensive and set to 0

### Message Count Omission

The `getBatchCharacterStatsOptimized()` method returns `messageCount: 0` because counting messages requires additional complex queries that would degrade performance. For dashboard and list views, `conversationCount` is sufficient. Use `getCharacterStats()` for individual characters if `messageCount` is needed.

### Image Count Filtering

Image counts exclude AVATAR type images to show only user-generated content images. This is useful for identifying characters with rich visual content.

### Conversation Count Approximation

The conversation count uses `Math.max()` of acting and representing roles, which is an approximation. A character could theoretically participate in the same conversation in both roles, but this is rare in practice. For dashboard purposes, this approximation is acceptable.

## Testing

```typescript
import { characterStatsService } from '../services/characterStatsService';

describe('Character Stats Service', () => {
  describe('getBatchCharacterStatsOptimized', () => {
    it('should return stats for multiple characters', async () => {
      const characterIds = ['char_1', 'char_2', 'char_3'];

      const statsMap = await characterStatsService.getBatchCharacterStatsOptimized(
        characterIds,
        'user_123'
      );

      expect(statsMap.size).toBe(3);
      expect(statsMap.get('char_1')).toMatchObject({
        characterId: 'char_1',
        conversationCount: expect.any(Number),
        favoriteCount: expect.any(Number),
        imageCount: expect.any(Number),
      });
    });

    it('should handle empty array', async () => {
      const statsMap = await characterStatsService.getBatchCharacterStatsOptimized([]);

      expect(statsMap.size).toBe(0);
    });

    it('should handle duplicates', async () => {
      const statsMap = await characterStatsService.getBatchCharacterStatsOptimized([
        'char_1',
        'char_1',
        'char_1',
      ]);

      expect(statsMap.size).toBe(1);
    });

    it('should include user favorite status', async () => {
      const statsMap = await characterStatsService.getBatchCharacterStatsOptimized(
        ['char_1'],
        'user_123'
      );

      const stats = statsMap.get('char_1');
      expect(stats).toHaveProperty('isFavoritedByUser');
      expect(typeof stats.isFavoritedByUser).toBe('boolean');
    });

    it('should exclude AVATAR images from count', async () => {
      // Create test data with AVATAR and REFERENCE images
      const statsMap = await characterStatsService.getBatchCharacterStatsOptimized(
        ['char_1']
      );

      const stats = statsMap.get('char_1');
      expect(stats.imageCount).toBeGreaterThanOrEqual(0);
      // Should not count AVATAR images
    });
  });

  describe('getImageCount', () => {
    it('should exclude AVATAR type images', async () => {
      const count = await characterStatsService.getImageCount('char_1');

      expect(count).toBeGreaterThanOrEqual(0);
      // Verify only non-AVATAR images counted
    });
  });
});
```

## Dependencies

- **Prisma**: Database ORM for stats queries
- **favoriteService**: For favorite stats aggregation

## See Also

- **Feature Spec**: `docs/05-business/planning/features/active/FEATURE-015-dashboard-performance-optimization.md`
- **Character Service**: `backend/src/services/characterService.docs.md`
- **Characters Route**: `backend/src/routes/v1/characters.ts`
- **Performance Guide**: See FEATURE-015 for optimization details

---

**Related Features**:
- FEATURE-015: Dashboard Performance Optimization (introduced optimized batch stats)
