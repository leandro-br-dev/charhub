# Feature: Dashboard New Filter "Novidades" and Fix "Popular"

**Status**: Active - Ready for Development
**Created**: 2026-01-14
**Priority**: High
**Estimated Complexity**: Medium (M)

---

## 1. Overview

### 1.1 Objective
Fix the character sorting on the dashboard by:
1. Creating a new "Novidades" (New) filter that shows characters by creation date (newest first)
2. Fixing the "Popular" filter to sort by conversation count (most conversations first)

### 1.2 Current State (Bug)
- Dashboard shows "Popular" and "Favorites" tabs
- "Popular" currently orders by `createdAt: 'desc'` (newest first)
- This is INCORRECT - "Popular" should show characters with most conversations
- Users see newest characters labeled as "Popular" which is misleading

**Evidence from code** (`backend/src/services/characterService.ts`):
```typescript
// Line 411 - getPublicCharacters
orderBy: { createdAt: 'desc' }

// Line 547 - similar pattern in other methods
orderBy: { createdAt: 'desc' }
```

### 1.3 Desired State
- Three tabs: "Popular" | "Novidades" | "Favoritos"
- **Popular**: Sorted by conversation count (descending) - characters with most interactions first
- **Novidades**: Sorted by creation date (descending) - newest characters first
- **Favoritos**: User's favorited characters (existing behavior - unchanged)

---

## 2. Technical Requirements

### 2.1 Backend Changes

#### 2.1.1 Character Service - New Sort Options

**File**: `backend/src/services/characterService.ts`

Add new parameter `sortBy` to character listing methods:

```typescript
export type CharacterSortBy = 'popular' | 'newest' | 'favorites';

interface GetCharactersOptions {
  page?: number;
  limit?: number;
  visibility?: CharacterVisibility;
  sortBy?: CharacterSortBy;  // NEW
  filters?: CharacterFilters;
}
```

#### 2.1.2 Implement Popular Sorting (by conversation count)

**Challenge**: Prisma doesn't natively support ordering by relation count in `orderBy`.

**Solution Options**:

**Option A - Raw SQL Query** (Recommended for performance):
```typescript
async getPopularCharacters(options: GetCharactersOptions) {
  const { page = 1, limit = 20, visibility = 'PUBLIC' } = options;
  const skip = (page - 1) * limit;

  // Get characters sorted by conversation count
  const characters = await prisma.$queryRaw`
    SELECT c.*,
           COUNT(DISTINCT cp.conversation_id) as conversation_count
    FROM "Character" c
    LEFT JOIN "ConversationParticipant" cp
      ON cp.acting_character_id = c.id
      OR cp.representing_character_id = c.id
    WHERE c.visibility = ${visibility}
      AND c.deleted_at IS NULL
    GROUP BY c.id
    ORDER BY conversation_count DESC
    LIMIT ${limit}
    OFFSET ${skip}
  `;

  return characters;
}
```

**Option B - Two-step query** (Simpler but less efficient):
```typescript
async getPopularCharacters(options: GetCharactersOptions) {
  const { page = 1, limit = 20 } = options;

  // Step 1: Get conversation counts for all characters
  const characterStats = await prisma.conversationParticipant.groupBy({
    by: ['actingCharacterId'],
    _count: { conversationId: true },
    orderBy: { _count: { conversationId: 'desc' } },
  });

  // Step 2: Get character details for top characters
  const topCharacterIds = characterStats
    .slice((page - 1) * limit, page * limit)
    .map(s => s.actingCharacterId)
    .filter(Boolean);

  const characters = await prisma.character.findMany({
    where: { id: { in: topCharacterIds } },
    include: characterInclude,
  });

  // Step 3: Sort by original order
  return topCharacterIds.map(id =>
    characters.find(c => c.id === id)
  ).filter(Boolean);
}
```

#### 2.1.3 New Endpoint or Parameter

**Option A - New Query Parameter** (Recommended):
```typescript
// GET /api/v1/characters?sortBy=popular
// GET /api/v1/characters?sortBy=newest
// GET /api/v1/characters?sortBy=favorites (requires userId)

router.get('/characters', async (req, res) => {
  const { sortBy = 'popular', page, limit, ...filters } = req.query;

  let characters;
  switch (sortBy) {
    case 'popular':
      characters = await characterService.getPopularCharacters({ page, limit, filters });
      break;
    case 'newest':
      characters = await characterService.getNewestCharacters({ page, limit, filters });
      break;
    case 'favorites':
      characters = await characterService.getFavoriteCharacters(userId, { page, limit });
      break;
  }

  res.json({ success: true, data: characters });
});
```

#### 2.1.4 Update getPublicCharacters Method

**File**: `backend/src/services/characterService.ts`

Modify existing method to support sorting:

```typescript
async getPublicCharacters(
  options: GetCharactersOptions & { sortBy?: CharacterSortBy }
): Promise<CharacterWithRelations[]> {
  const { page = 1, limit = 20, filters, sortBy = 'newest' } = options;
  const skip = (page - 1) * limit;

  // Build where clause (existing code)
  const where = buildWhereClause(filters);

  if (sortBy === 'popular') {
    return this.getPopularCharacters(options);
  }

  // Default: newest first
  const characters = await prisma.character.findMany({
    where,
    include: characterInclude,
    orderBy: { createdAt: 'desc' },  // Newest first
    skip,
    take: limit,
  });

  return characters;
}
```

### 2.2 Frontend Changes

#### 2.2.1 Dashboard Component

**File**: `frontend/src/pages/dashboard/Dashboard.tsx` (or similar)

Add new tab:

```typescript
const SORT_OPTIONS = [
  { key: 'popular', labelKey: 'dashboard:sections.popular' },
  { key: 'newest', labelKey: 'dashboard:sections.newest' },  // NEW
  { key: 'favorites', labelKey: 'dashboard:sections.favorites' },
];

// In component
const [activeSort, setActiveSort] = useState<string>('popular');

// Fetch characters with sort parameter
const { data: characters } = useQuery({
  queryKey: ['characters', activeSort, page, filters],
  queryFn: () => characterApi.getCharacters({
    sortBy: activeSort,
    page,
    ...filters
  }),
});
```

#### 2.2.2 Translation Keys

**File**: `backend/translations/_source/dashboard.json`

```json
{
  "sections": {
    "popular": "Popular",
    "newest": "New",
    "favorites": "Favorites",
    "noPopularCharacters": "No popular characters found.",
    "noNewCharacters": "No new characters yet.",
    "noFavoriteCharacters": "You haven't favorited any characters yet."
  }
}
```

**File**: `backend/translations/pt-br/dashboard.json`

```json
{
  "sections": {
    "popular": "Populares",
    "newest": "Novidades",
    "favorites": "Favoritos",
    "noPopularCharacters": "Nenhum personagem popular encontrado.",
    "noNewCharacters": "Nenhum personagem novo ainda.",
    "noFavoriteCharacters": "Você ainda não favoritou nenhum personagem."
  }
}
```

#### 2.2.3 Tab Component Update

Update dashboard tabs to show three options:

```tsx
<Tabs value={activeSort} onValueChange={setActiveSort}>
  <TabsList>
    <TabsTrigger value="popular">
      {t('dashboard:sections.popular')}
    </TabsTrigger>
    <TabsTrigger value="newest">
      {t('dashboard:sections.newest')}
    </TabsTrigger>
    <TabsTrigger value="favorites">
      {t('dashboard:sections.favorites')}
    </TabsTrigger>
  </TabsList>
</Tabs>
```

### 2.3 Existing characterStatsService Integration

**File**: `backend/src/services/characterStatsService.ts`

The `getConversationCount` method already exists and can be leveraged:

```typescript
async getConversationCount(characterId: string): Promise<number> {
  const participations = await prisma.conversationParticipant.findMany({
    where: {
      OR: [
        { actingCharacterId: characterId },
        { representingCharacterId: characterId }
      ]
    },
    select: { conversationId: true },
    distinct: ['conversationId']
  });
  return participations.length;
}
```

For batch operations (popular sorting), create efficient batch method:

```typescript
async getBatchConversationCounts(): Promise<Map<string, number>> {
  const counts = await prisma.conversationParticipant.groupBy({
    by: ['actingCharacterId'],
    _count: { conversationId: true },
  });

  const map = new Map<string, number>();
  counts.forEach(c => {
    if (c.actingCharacterId) {
      map.set(c.actingCharacterId, c._count.conversationId);
    }
  });

  return map;
}
```

---

## 3. Implementation Plan

### Phase 1: Backend - Add Sort Options (2-3 hours)
1. Add `sortBy` parameter to `getPublicCharacters`
2. Implement `getPopularCharacters` with conversation count sorting
3. Ensure `getNewestCharacters` uses `createdAt: 'desc'` (current behavior)
4. Update character routes to accept `sortBy` query param
5. Write unit tests for sorting logic

### Phase 2: Frontend - Add "Novidades" Tab (2 hours)
1. Add translation keys (en-US and pt-BR)
2. Update dashboard tabs to show three options
3. Update API calls to include `sortBy` parameter
4. Handle empty states for each tab

### Phase 3: Testing (1-2 hours)
1. Test "Popular" shows characters with most conversations first
2. Test "Novidades" shows newest characters first
3. Test "Favoritos" behavior unchanged
4. Test pagination works correctly with sorting
5. Test filters (gender, species) work with sorting
6. Performance testing with large datasets

---

## 4. Acceptance Criteria

### Functional
- [ ] Dashboard shows three tabs: Popular, Novidades, Favoritos
- [ ] "Popular" tab shows characters sorted by conversation count (highest first)
- [ ] "Novidades" tab shows characters sorted by creation date (newest first)
- [ ] "Favoritos" tab shows user's favorited characters (existing behavior)
- [ ] Each tab has appropriate empty state message
- [ ] Pagination works correctly in all tabs
- [ ] Filters (gender, species) apply correctly in all tabs

### Performance
- [ ] Popular sorting query executes in < 500ms
- [ ] No N+1 query problems
- [ ] Pagination offset doesn't degrade performance significantly

### UI/UX
- [ ] Tabs clearly labeled
- [ ] Active tab visually indicated
- [ ] Smooth transition between tabs
- [ ] Loading states shown during data fetch
- [ ] Mobile responsive

### Translations
- [ ] All new strings have en-US translations
- [ ] All new strings have pt-BR translations

---

## 5. Files to Modify/Create

### Backend
- `backend/src/services/characterService.ts` - Add sorting logic
- `backend/src/services/characterStatsService.ts` - Add batch conversation count method
- `backend/src/routes/characterRoutes.ts` - Add sortBy parameter
- `backend/translations/_source/dashboard.json` - Add translation keys
- `backend/translations/pt-br/dashboard.json` - Add Portuguese translations

### Frontend
- `frontend/src/pages/dashboard/Dashboard.tsx` - Add third tab
- `frontend/src/services/characterService.ts` - Update API calls
- `frontend/public/locales/en/dashboard.json` - Translations
- `frontend/public/locales/pt-BR/dashboard.json` - Translations

---

## 6. Database Considerations

### Index Recommendation

For optimal performance with conversation count sorting, consider adding an index:

```sql
-- Already exists in schema
CREATE INDEX idx_conversation_participant_acting_character
ON "ConversationParticipant"("acting_character_id");

CREATE INDEX idx_conversation_participant_representing_character
ON "ConversationParticipant"("representing_character_id");
```

### Caching Strategy (Future Enhancement)

Consider caching popular characters for 5-10 minutes since conversation counts don't change frequently:

```typescript
// Redis cache key pattern
const cacheKey = `popular:characters:page:${page}:limit:${limit}`;
```

---

## 7. Edge Cases

1. **Characters with zero conversations**: Should appear at end of "Popular" list
2. **New characters**: Will appear at top of "Novidades" but bottom of "Popular"
3. **Tied conversation counts**: Use `createdAt` as secondary sort
4. **Deleted conversations**: Should not count towards popularity
5. **Private conversations**: Consider whether to count (current: yes)

---

## 8. Related Features

- Character stats already track conversation counts (`characterStatsService.ts`)
- Infinite scroll implementation needs to work with all sort options
- Filter panel needs to preserve sort selection

---

## 9. Notes

- This fixes a user-facing bug where "Popular" shows newest instead of most popular
- The "Novidades" tab provides the behavior users currently see in "Popular"
- Migration is seamless - no data changes required, only logic changes
