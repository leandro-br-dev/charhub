# FEATURE-015: Dashboard Performance Optimization

**Status**: In Review
**Priority**: High
**Assigned To**: Agent Coder
**Created**: 2026-01-25
**Last Updated**: 2026-01-28
**Epic**: Performance Optimization
**PR**: [PR #151](https://github.com/leandro-br-dev/charhub/pull/151)

---

## Problem Statement

The dashboard page has significant performance issues due to inefficient API usage patterns, causing unnecessary server load and slow user experience.

### Current Pain Points

1. **N+1 Query Problem for Stats**: After fetching 30 characters (~465ms), the frontend makes 30 additional individual requests to `/api/v1/characters/:id/stats` (~440ms each), creating massive overhead.

2. **Unnecessary Data Loading**: Stories and other tab content are fetched immediately on dashboard load, even when the user is on the Characters tab and may never visit other tabs.

3. **Incorrect Cache Behavior**: When switching between "Popular", "Newest", and "Favorites" sorting options, no new API request is made - the frontend reorders cached data locally, showing incorrect results.

4. **Excessive Response Payload**: Character list response includes large amounts of unused data (full history, personality, all images with metadata, translations) when only basic card info is needed.

### Impact Analysis

**Current Flow (30 characters)**:
```
1x GET /characters?limit=30         ~465ms  (returns excessive data)
30x GET /characters/:id/stats       ~13,200ms total (~440ms each)
1x GET /stories                     ~XXXms  (unnecessary)
─────────────────────────────────────────────────────────────────
Total network overhead: ~14 seconds of requests for initial load
```

**Target Flow (30 characters)**:
```
1x GET /characters?limit=30&includeStats=true  ~500-600ms (optimized payload + stats)
─────────────────────────────────────────────────────────────────
Total: ~500-600ms (92-96% reduction)
```

### Target Users

- All users browsing the dashboard
- System performance (reduced server load)

### Value Proposition

- **User Experience**: 10x faster initial dashboard load
- **Server Load**: 96% reduction in API requests
- **Bandwidth**: Reduced payload size by removing unused fields
- **Scalability**: Enables efficient infinite scroll without request explosion

---

## User Stories

### US-1: Batch Stats Loading
**As a** user viewing the dashboard,
**I want** character cards to show stats (conversation count, favorite count) immediately,
**So that** I don't wait for dozens of individual requests to complete.

**Acceptance Criteria**:
- [ ] Stats (conversationCount, favoriteCount, isFavoritedByUser) are included in character list response
- [ ] No individual `/stats` requests are made
- [ ] Character cards display stats immediately without loading states
- [ ] Backend uses batch query instead of N individual queries

### US-2: Lazy Tab Loading
**As a** user on the Characters tab,
**I want** Stories data to only load when I click the Stories tab,
**So that** the initial page load is faster.

**Acceptance Criteria**:
- [ ] Dashboard initially only fetches data for the active tab (Characters)
- [ ] Stories API is called only when Stories tab is clicked (first time)
- [ ] Chat/Conversations API is called only when Chat tab is clicked
- [ ] Tab data is cached after first load (within session)
- [ ] Loading indicator shown when switching to unloaded tab

### US-3: Correct Sorting Behavior
**As a** user switching between Popular/Newest/Favorites,
**I want** fresh data from the server sorted correctly,
**So that** I see accurate results for each view.

**Acceptance Criteria**:
- [ ] Clicking "Popular" triggers new API request with `sortBy=popular`
- [ ] Clicking "Newest" triggers new API request with `sortBy=newest`
- [ ] Clicking "Favorites" triggers new API request with `sortBy=favorites`
- [ ] Each view maintains its own pagination state
- [ ] React Query cache keys differentiate by sortBy parameter

### US-4: Optimized Character Payload
**As a** developer optimizing the dashboard,
**I want** the character list endpoint to return only card-relevant fields,
**So that** bandwidth and processing time are reduced.

**Acceptance Criteria**:
- [ ] New `fields` query parameter allows selecting specific fields
- [ ] Dashboard requests only: id, firstName, lastName, avatar, ageRating, style, theme, creator.username
- [ ] Fields like physicalCharacteristics, personality, history, translations are excluded
- [ ] Images array returns only active AVATAR image (not all references)
- [ ] Payload size reduced by ~70%

---

## Technical Approach

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     CURRENT ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Dashboard Mount                                              │
│       ↓                                                       │
│  ┌─────────────────┐   ┌─────────────────┐                   │
│  │ Fetch Characters │   │ Fetch Stories   │  (parallel)      │
│  └────────┬────────┘   └─────────────────┘                   │
│           ↓                                                   │
│  ┌─────────────────────────────────────────┐                 │
│  │ For each character: fetch stats (N+1)   │                 │
│  └─────────────────────────────────────────┘                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     TARGET ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Dashboard Mount (Characters Tab Active)                      │
│       ↓                                                       │
│  ┌─────────────────────────────────────────┐                 │
│  │ Fetch Characters + Stats (single call)  │                 │
│  │ GET /characters?includeStats=true       │                 │
│  └─────────────────────────────────────────┘                 │
│                                                               │
│  User clicks Stories Tab                                      │
│       ↓                                                       │
│  ┌─────────────────────────────────────────┐                 │
│  │ Fetch Stories (lazy load)               │                 │
│  └─────────────────────────────────────────┘                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Backend Changes

#### 1. Optimized Batch Stats Query

**File**: `backend/src/services/characterStatsService.ts`

Replace the current `getBatchCharacterStats` with a true batch implementation:

```typescript
/**
 * Get stats for multiple characters in a single optimized query
 * Solves N+1 problem by using batch queries
 */
async getBatchCharacterStatsOptimized(
  characterIds: string[],
  userId?: string
): Promise<Map<string, CharacterStats>> {
  if (characterIds.length === 0) {
    return new Map();
  }

  // Batch query: conversation counts
  const conversationCounts = await prisma.conversationParticipant.groupBy({
    by: ['actingCharacterId'],
    where: {
      OR: [
        { actingCharacterId: { in: characterIds } },
        { representingCharacterId: { in: characterIds } },
      ],
    },
    _count: {
      conversationId: true,
    },
  });

  // Batch query: favorite counts
  const favoriteCounts = await prisma.favoriteCharacter.groupBy({
    by: ['characterId'],
    where: {
      characterId: { in: characterIds },
    },
    _count: {
      _all: true,
    },
  });

  // Batch query: user favorites (if authenticated)
  let userFavorites = new Set<string>();
  if (userId) {
    const favorites = await prisma.favoriteCharacter.findMany({
      where: {
        userId,
        characterId: { in: characterIds },
      },
      select: { characterId: true },
    });
    userFavorites = new Set(favorites.map(f => f.characterId));
  }

  // Build result map
  const statsMap = new Map<string, CharacterStats>();

  for (const id of characterIds) {
    const convCount = conversationCounts.find(c => c.actingCharacterId === id);
    const favCount = favoriteCounts.find(f => f.characterId === id);

    statsMap.set(id, {
      characterId: id,
      conversationCount: convCount?._count.conversationId || 0,
      messageCount: 0, // Omit for list view (expensive query)
      favoriteCount: favCount?._count._all || 0,
      isFavoritedByUser: userFavorites.has(id),
    });
  }

  return statsMap;
}
```

#### 2. Enhanced Character List Endpoint

**File**: `backend/src/routes/v1/characters.ts`

Add query parameters:

```typescript
// Query params
interface CharacterListQuery {
  skip?: number;
  limit?: number;
  sortBy?: 'popular' | 'newest' | 'favorites';
  ageRatings?: string[];
  genders?: string[];
  species?: string[];
  search?: string;
  // NEW parameters
  includeStats?: boolean;  // Include stats in response
  fields?: string;         // Comma-separated field list (e.g., "id,firstName,avatar")
}

// In handler
if (query.includeStats) {
  const characterIds = characters.map(c => c.id);
  const statsMap = await characterStatsService.getBatchCharacterStatsOptimized(
    characterIds,
    req.user?.id
  );

  // Merge stats into character objects
  characters = characters.map(char => ({
    ...char,
    stats: statsMap.get(char.id),
  }));
}

// Field filtering
if (query.fields) {
  const allowedFields = query.fields.split(',');
  characters = characters.map(char =>
    pick(char, [...allowedFields, 'id']) // Always include id
  );
}
```

#### 3. Slim Character DTO for Dashboard

**File**: `backend/src/types/character.ts` (NEW)

```typescript
export interface CharacterCardDTO {
  id: string;
  firstName: string;
  lastName: string | null;
  avatar: string | null;
  ageRating: AgeRating;
  style: VisualStyle;
  theme: Theme | null;
  creator: {
    id: string;
    username: string;
  };
  stats?: {
    conversationCount: number;
    favoriteCount: number;
    isFavoritedByUser: boolean;
  };
}
```

### Frontend Changes

#### 1. Update Character Service

**File**: `frontend/src/services/characterService.ts`

```typescript
interface GetCharactersParams {
  skip?: number;
  limit?: number;
  sortBy?: 'popular' | 'newest' | 'favorites';
  ageRatings?: string[];
  genders?: string[];
  species?: string[];
  includeStats?: boolean;  // NEW
  fields?: string;         // NEW
}

export async function getCharactersForDashboard(
  params: GetCharactersParams
): Promise<CharacterListResult> {
  const response = await api.get('/api/v1/characters', {
    params: {
      ...params,
      includeStats: true,
      fields: 'id,firstName,lastName,avatar,ageRating,style,theme,creator',
    },
  });
  return response.data;
}
```

#### 2. Update Dashboard Component

**File**: `frontend/src/pages/dashboard/index.tsx`

```typescript
// Remove individual stats fetching
// BEFORE:
useEffect(() => {
  if (characters.length > 0) {
    const ids = characters.map(c => c.id);
    Promise.all(ids.map(id => characterStatsService.getStats(id)))
      .then(stats => setCharacterStats(stats));
  }
}, [characters]);

// AFTER:
// Stats come with characters - no additional fetch needed
const { data: charactersData } = useQuery({
  queryKey: ['characters', sortBy, filters],
  queryFn: () => getCharactersForDashboard({
    sortBy,
    ...filters,
    includeStats: true,
  }),
});
```

#### 3. Implement Lazy Tab Loading

**File**: `frontend/src/pages/dashboard/index.tsx`

```typescript
const [activeTab, setActiveTab] = useState<'discover' | 'chat' | 'story'>('discover');
const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['discover']));

// Characters query - always enabled for discover tab
const charactersQuery = useQuery({
  queryKey: ['dashboard', 'characters', sortBy, filters],
  queryFn: () => getCharactersForDashboard({ sortBy, ...filters }),
  enabled: activeTab === 'discover' || loadedTabs.has('discover'),
});

// Stories query - only enabled when stories tab is active or was loaded
const storiesQuery = useQuery({
  queryKey: ['dashboard', 'stories'],
  queryFn: () => storyService.getPopular(),
  enabled: activeTab === 'story' || loadedTabs.has('story'),
});

// Track loaded tabs
const handleTabChange = (tab: string) => {
  setActiveTab(tab);
  setLoadedTabs(prev => new Set([...prev, tab]));
};
```

#### 4. Fix Sort View Cache Keys

**File**: `frontend/src/pages/dashboard/index.tsx`

```typescript
// BEFORE (wrong - same cache key for all sorts):
const { data } = useQuery({
  queryKey: ['characters'],
  queryFn: () => getCharacters({ sortBy: currentSort }),
});

// AFTER (correct - separate cache per sort):
const { data } = useQuery({
  queryKey: ['characters', currentSort, filters],  // Include sortBy in key
  queryFn: () => getCharactersForDashboard({
    sortBy: currentSort,
    ...filters,
  }),
  // Optionally keep previous data while loading new sort
  placeholderData: keepPreviousData,
});
```

---

## Database Changes

No schema changes required. Optimization is at query level.

### Query Optimization

Add composite index for favorite counts (if not exists):

```sql
CREATE INDEX IF NOT EXISTS "idx_favorite_character_character_id"
ON "FavoriteCharacter"("characterId");
```

---

## Testing Requirements

### Unit Tests

- [ ] `characterStatsService.getBatchCharacterStatsOptimized()` returns correct counts
- [ ] `characterStatsService.getBatchCharacterStatsOptimized()` handles empty array
- [ ] `characterStatsService.getBatchCharacterStatsOptimized()` handles user favorites correctly
- [ ] Character list with `includeStats=true` includes stats object
- [ ] Character list with `fields` parameter returns only requested fields

### Integration Tests

- [ ] Dashboard API returns characters with embedded stats
- [ ] Response payload is reduced when using fields parameter
- [ ] Sort parameter changes return different ordered results

### E2E Tests

- [ ] Dashboard loads without individual stats requests (check network tab)
- [ ] Switching tabs triggers appropriate API calls
- [ ] Switching between Popular/Newest/Favorites shows correct data
- [ ] Infinite scroll works with optimized endpoint

### Performance Tests

- [ ] Measure response time for 30 characters with stats (target: <600ms)
- [ ] Measure response payload size reduction (target: >70% reduction)
- [ ] Load test with concurrent users

---

## Success Criteria

### Core Functionality

- [ ] Single API call returns characters + stats
- [ ] Lazy tab loading implemented
- [ ] Sort views trigger fresh API requests
- [ ] Payload optimized for dashboard needs

### Performance Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Initial load requests | 31+ | 1 |
| Initial load time | ~14s | <1s |
| Response payload size | ~150KB | <50KB |
| Time to interactive | ~15s | <2s |

### Quality

- [ ] No regressions in existing functionality
- [ ] All tests passing
- [ ] Code review approved
- [ ] Performance benchmarks met

---

## Dependencies

### Internal

- Existing `characterStatsService.ts` (to be modified)
- Existing `characterService.ts` (backend and frontend)
- Dashboard page component

### External

- None

---

## Risks & Mitigations

### Risk 1: Cache Invalidation Complexity
**Impact**: Medium
**Description**: With stats embedded in character response, cache invalidation becomes more complex when a user favorites a character.
**Mitigation**:
- Invalidate character list query on favorite toggle
- Use optimistic updates for immediate UI feedback
- Consider short TTL for dashboard queries

### Risk 2: Backend Query Performance
**Impact**: Low
**Description**: Batch stats query might be slow for very large character sets.
**Mitigation**:
- Query is limited by pagination (max 30-50 per request)
- Add database indexes
- Monitor query performance in production

### Risk 3: Breaking API Changes
**Impact**: Medium
**Description**: Adding new query parameters should be backward compatible.
**Mitigation**:
- New parameters are optional with sensible defaults
- Existing behavior unchanged when params not provided
- Version API if needed (unlikely)

---

## Implementation Phases

### Phase 1: Backend Optimization
1. Implement `getBatchCharacterStatsOptimized()`
2. Add `includeStats` query parameter to characters endpoint
3. Add `fields` query parameter for payload optimization
4. Write unit and integration tests

### Phase 2: Frontend - Stats Integration
1. Update character service to use `includeStats=true`
2. Remove individual stats fetching from dashboard
3. Update character cards to use embedded stats
4. Verify stats display correctly

### Phase 3: Frontend - Lazy Tab Loading
1. Implement tab state tracking
2. Conditionally enable queries based on active tab
3. Add loading states for tab switches
4. Test tab switching behavior

### Phase 4: Frontend - Fix Sort Behavior
1. Update React Query cache keys to include sortBy
2. Ensure fresh data on sort change
3. Add loading indicator during sort change
4. Test all sort options

### Phase 5: Testing & Validation
1. Run all automated tests
2. Manual testing of all scenarios
3. Performance benchmarking
4. Fix any regressions

---

## Notes

- The backend already has `getBatchCharacterStats()` but it still makes N individual calls internally - needs true batch optimization
- Consider adding Redis caching for popular characters stats in future iteration
- Monitor error rates after deployment - batch query failures affect more users

---

## References

- Frontend dashboard: `frontend/src/pages/dashboard/index.tsx`
- Character service (frontend): `frontend/src/services/characterService.ts`
- Character stats service (backend): `backend/src/services/characterStatsService.ts`
- Characters route (backend): `backend/src/routes/v1/characters.ts`

---

**End of FEATURE-015 Specification**
