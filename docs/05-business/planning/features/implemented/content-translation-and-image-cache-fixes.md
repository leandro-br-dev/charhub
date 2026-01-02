# Bug Fix: Content Translation System & Image Cache Optimization

**Status**: Active (Urgent)
**Priority**: P0 (Critical)
**Type**: Bug Fix
**Created**: 2025-12-30
**Assigned To**: Agent Coder
**Estimated Complexity**: Medium (Translation) + Low (Image Cache Audit)

---

## 🚨 Executive Summary

Two urgent issues affecting user experience have been identified:

1. **CRITICAL: Content Translation System Broken** - Dynamic content (characters, stories) is not being translated to user's preferred language. The `ContentTranslation` table is empty, indicating complete failure of the translation pipeline.

2. **MEDIUM: Image Cache Audit Needed** - Need to verify all components are using `CachedImage` component instead of raw `<img>` tags to avoid redundant network requests.

---

## 📋 Problem Statement

### Problem 1: Content Translation Not Working (CRITICAL)

**User Impact**: Users see content in the original creator's language instead of their preferred language.

**Technical Details**:
- The translation system exists and is partially configured
- Character routes have `translationMiddleware()` applied
- **Story routes are MISSING `translationMiddleware()`**
- The `ContentTranslation` table is completely empty
- Expected behavior: API should return translated content based on `User.preferredLanguage`

**Affected Areas**:
- ❌ Story cards (title, synopsis, initialText)
- ❌ Story detail pages
- ✅ Character cards (working - middleware is applied)
- ✅ Character profiles (working - middleware is applied)

**Root Cause**:
- `backend/src/routes/v1/story.ts` does NOT use `translationMiddleware()`
- Without the middleware, responses bypass translation layer
- No translations are requested → no LLM calls → empty `ContentTranslation` table

### Problem 2: Image Cache Component Usage (MEDIUM)

**User Impact**: Potential redundant image fetches, slower page loads.

**Current State**:
- `CachedImage.tsx` component exists with blob-based caching (5min TTL)
- Major components already use it: `CharacterCard`, `StoryCard`, `CharacterAvatarUploader`, `StoryCoverImageUploader`
- Initial search shows NO raw `<img>` tags in `.tsx` files (good sign)

**Need**:
- Comprehensive audit to confirm all image rendering uses `CachedImage`
- Check for edge cases: modal dialogs, dynamic renders, third-party components

---

## 🎯 Success Criteria

### For Translation Fix:
- [ ] All Story GET routes use `translationMiddleware()`
- [ ] `ContentTranslation` table populates when users request content in different languages
- [ ] Story cards display translated content (title, synopsis) based on user language preference
- [ ] Story detail pages show translated initialText
- [ ] Existing Character translation continues to work (regression test)
- [ ] Translation caching works (Redis → Database → LLM fallback)

### For Image Cache Audit:
- [ ] Document all image rendering locations in the application
- [ ] Confirm `CachedImage` usage or justify exceptions
- [ ] Identify any components using raw `<img>` tags
- [ ] Create tracking issue for any necessary migrations

---

## 🔍 Technical Investigation

### Translation System Architecture (Current State)

```
┌─────────────────────────────────────────────────────────────┐
│                    Translation Flow                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. GET /api/v1/characters/:id?                             │
│     └─> translationMiddleware() ✅                          │
│         ├─> Intercepts res.json()                           │
│         ├─> Detects user language (DB → Header → Accept)    │
│         ├─> Checks if translation needed                    │
│         └─> Calls translationService.translate()            │
│             ├─> Try Redis cache                             │
│             ├─> Try Database (ContentTranslation)           │
│             └─> Call LLM (gemini-2.5-flash-lite)           │
│                 └─> Save to Database + Redis                │
│                                                              │
│  2. GET /api/v1/story/:id? ❌ MISSING MIDDLEWARE            │
│     └─> No translation middleware                           │
│         └─> Returns original content only                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Translation Middleware Configuration

**File**: `backend/src/middleware/translationMiddleware.ts`

**Translatable Fields**:
```typescript
Character: ['personality', 'history', 'physicalCharacteristics']
Story: ['title', 'synopsis', 'initialText']
Attire: ['name', 'description']
Tag: ['name', 'description']
Plan: ['description', 'features']
```

**Language Detection Priority**:
1. `req.user.preferredLanguage` (from database)
2. `X-User-Language` header (from frontend localStorage)
3. `Accept-Language` header
4. Fallback: `en-US`

### Current Route Configuration

**Characters** (✅ Working):
```typescript
// backend/src/routes/v1/characters.ts

router.get('/:id', optionalAuth, translationMiddleware(), async (req, res) => {
  // Translation happens automatically
});

router.get('/', optionalAuth, translationMiddleware(), async (req, res) => {
  // Translation happens automatically
});
```

**Stories** (❌ Broken):
```typescript
// backend/src/routes/v1/story.ts

router.get('/:id', optionalAuth, async (req, res) => {
  // NO translationMiddleware() - translations never happen
});

router.get('/', async (req, res) => {
  // NO translationMiddleware() - translations never happen
});

router.get('/my', requireAuth, async (req, res) => {
  // NO translationMiddleware() - translations never happen
});
```

### Database Schema

**Table**: `ContentTranslation`
```sql
CREATE TABLE "ContentTranslation" (
  id                    UUID PRIMARY KEY,

  -- Polymorphic content reference
  contentType           VARCHAR NOT NULL,  -- "Character", "Story", "Attire", etc.
  contentId             VARCHAR NOT NULL,
  fieldName             VARCHAR NOT NULL,  -- "personality", "title", etc.

  -- Languages
  originalLanguageCode  VARCHAR NOT NULL,  -- "pt-BR", "en-US", etc.
  targetLanguageCode    VARCHAR NOT NULL,
  originalText          TEXT NOT NULL,
  translatedText        TEXT NOT NULL,

  -- Metadata
  translationProvider   VARCHAR,           -- "gemini", "openai", etc.
  translationModel      VARCHAR,           -- "gemini-2.5-flash-lite"
  confidence            FLOAT,
  status                TranslationStatus,

  -- Performance
  translationTimeMs     INTEGER,
  characterCount        INTEGER,
  sourceVersion         INTEGER DEFAULT 1,

  createdAt             TIMESTAMP,
  updatedAt             TIMESTAMP,

  UNIQUE(contentType, contentId, fieldName, targetLanguageCode)
);
```

**Current State**: Table is **completely empty** (0 rows)

---

## 🛠️ Proposed Solution

### Fix 1: Enable Translation for Story Routes

**File**: `backend/src/routes/v1/story.ts`

**Changes Required**:

1. Import the middleware:
```typescript
import { translationMiddleware } from '../../middleware/translationMiddleware';
```

2. Apply to GET routes:
```typescript
// Story detail
router.get('/:id', optionalAuth, translationMiddleware(), async (req, res) => {
  // existing code
});

// Story list (public)
router.get('/', translationMiddleware(), async (req, res) => {
  // existing code
});

// User's stories
router.get('/my', requireAuth, translationMiddleware(), async (req, res) => {
  // existing code
});
```

**Important**: Only apply to GET routes (read operations). POST/PUT/DELETE should NOT translate since they handle creation/updates.

### Fix 2: Verify Data Flow

**Ensure Story objects include translation-required fields**:

The middleware needs these fields to work:
- `story.id` (for contentId)
- `story.originalLanguageCode` (to detect if translation needed)
- `story.title`, `story.synopsis`, `story.initialText` (fields to translate)

**Verification Steps**:
1. Check `storyService.ts` ensures `originalLanguageCode` is set on creation
2. Verify Story Prisma queries include `originalLanguageCode` in SELECT
3. Test translation flow with different languages

### Fix 3: Image Cache Audit Checklist

**Audit Plan**:

1. **Search for raw `<img>` usage**:
```bash
# Search for img tags in TSX files
grep -r "<img" frontend/src --include="*.tsx"

# Search for img tags in JSX files
grep -r "<img" frontend/src --include="*.jsx"

# Search for Image components (Next.js)
grep -r "from 'next/image'" frontend/src

# Search for dynamic image renders
grep -r "createElement('img'" frontend/src
```

2. **Review image-heavy components**:
   - Gallery views (`ImageGallery.tsx`)
   - Avatar components (`Avatar.tsx`, `CharacterAvatarUploader.tsx`)
   - Card components (`CharacterCard.tsx`, `StoryCard.tsx`)
   - Modal/Dialog image displays
   - Message attachments (`MessageList.tsx`)
   - User menu (`UserMenu.tsx`)
   - Navigation rail (`NavigationRail.tsx`)

3. **Document findings**:
   - Create list of all image rendering locations
   - Note which use `CachedImage` vs raw `<img>`
   - Identify valid exceptions (e.g., external images, icons)

4. **Create migration plan** (if needed):
   - Prioritize high-traffic components
   - Estimate effort for each migration
   - Consider cache TTL per component type

---

## 🔬 Testing Strategy

### Translation Testing

**Unit Tests**:
```typescript
// Test translationMiddleware on Story routes

describe('Story Translation', () => {
  it('should translate story title to user language', async () => {
    // Create story in pt-BR
    const story = await createStory({
      title: 'História de Teste',
      originalLanguageCode: 'pt-BR'
    });

    // Request as en-US user
    const response = await request(app)
      .get(`/api/v1/story/${story.id}`)
      .set('X-User-Language', 'en-US');

    expect(response.body.data.title).not.toBe('História de Teste');
    expect(response.body.data._translations.title.from).toBe('pt-BR');
    expect(response.body.data._translations.title.to).toBe('en-US');
  });

  it('should cache translations in database', async () => {
    // First request triggers translation
    await getStory(storyId, 'en-US');

    // Check ContentTranslation table
    const translation = await prisma.contentTranslation.findUnique({
      where: {
        contentType_contentId_fieldName_targetLanguageCode: {
          contentType: 'Story',
          contentId: storyId,
          fieldName: 'title',
          targetLanguageCode: 'en-US'
        }
      }
    });

    expect(translation).toBeTruthy();
    expect(translation.status).toBe('ACTIVE');
  });

  it('should use cached translation on second request', async () => {
    const spy = jest.spyOn(translationService, 'translateWithLLM');

    // First request
    await getStory(storyId, 'en-US');
    expect(spy).toHaveBeenCalled();

    // Second request (should use cache)
    spy.mockClear();
    await getStory(storyId, 'en-US');
    expect(spy).not.toHaveBeenCalled();
  });
});
```

**Integration Tests**:
```typescript
// Test full user flow

describe('User Story Translation Flow', () => {
  it('should show translated stories based on user preference', async () => {
    // Create user with pt-BR preference
    const user = await createUser({ preferredLanguage: 'pt' });

    // Create English story
    const story = await createStory({
      title: 'Test Story',
      synopsis: 'A test synopsis',
      originalLanguageCode: 'en-US'
    });

    // Fetch as Portuguese user
    const response = await authenticatedRequest(user)
      .get(`/api/v1/story/${story.id}`);

    // Should be translated to pt-BR
    expect(response.body.data.title).not.toBe('Test Story');
    expect(response.body.data._translations.title.to).toBe('pt-BR');
  });
});
```

**Manual Testing Checklist**:
- [ ] Create story in Portuguese, view as English user → sees English translation
- [ ] Create story in English, view as Portuguese user → sees Portuguese translation
- [ ] Create character in Japanese, view as Spanish user → sees Spanish translation
- [ ] Check `ContentTranslation` table has entries after tests
- [ ] Verify Redis cache populates (check with `redis-cli KEYS translation:*`)
- [ ] Test translation performance (< 100ms for cached, < 2s for LLM)
- [ ] Verify same-language requests skip translation (original text returned)

### Image Cache Testing

**Verification**:
- [ ] Open browser DevTools → Network tab
- [ ] Navigate to character gallery
- [ ] Verify images loaded once (check request count)
- [ ] Navigate away and back
- [ ] Verify images served from blob cache (0ms load time)
- [ ] Wait 5+ minutes (TTL expiry)
- [ ] Verify images refetch after cache expiration

---

## 📊 Metrics & Monitoring

### Translation Metrics

**Database Queries** (PostgreSQL):
```sql
-- Count total translations
SELECT COUNT(*) FROM "ContentTranslation";

-- Translations by content type
SELECT "contentType", COUNT(*)
FROM "ContentTranslation"
GROUP BY "contentType";

-- Translations by language pair
SELECT "originalLanguageCode", "targetLanguageCode", COUNT(*)
FROM "ContentTranslation"
GROUP BY "originalLanguageCode", "targetLanguageCode"
ORDER BY COUNT(*) DESC;

-- Average translation time
SELECT "translationProvider", AVG("translationTimeMs") as avg_ms
FROM "ContentTranslation"
GROUP BY "translationProvider";

-- Recent translations
SELECT "contentType", "contentId", "fieldName",
       "originalLanguageCode", "targetLanguageCode",
       "translationTimeMs", "createdAt"
FROM "ContentTranslation"
ORDER BY "createdAt" DESC
LIMIT 20;
```

**Redis Cache Monitoring**:
```bash
# Check translation cache keys
redis-cli KEYS "translation:*"

# Check cache hit ratio
redis-cli INFO stats | grep keyspace_hits
```

**Application Logs**:
- Translation cache hits/misses
- LLM call duration
- Translation errors/fallbacks

### Image Cache Metrics

**Browser DevTools**:
- Total image requests per page
- Cache hit rate (from blob vs network)
- Average image load time

**Application Monitoring**:
- R2 bandwidth usage (should decrease with caching)
- Image fetch errors

---

## 🚧 Implementation Plan

### Phase 1: Translation Fix (P0 - Urgent)

**Day 1: Implementation** (2-3 hours)
1. ✅ Add `translationMiddleware()` to story routes
2. ✅ Verify `originalLanguageCode` field on Story model
3. ✅ Add `originalLanguageCode` to story validator
4. ✅ Add logic to set `originalLanguageCode` from user preference on story creation
5. ✅ Test manual translation flow
6. ✅ TypeScript compilation and linting pass

**Day 2: Testing & Validation** (2 hours)
1. ⏳ Write unit tests for Story translation
2. ⏳ Write integration tests for translation flow
3. ✅ Manual QA on dev environment
4. ✅ Check database metrics
5. ⏳ Verify `ContentTranslation` table populates (requires actual translation requests)

**Day 3: Deployment** (1 hour)
1. ⏳ Deploy to staging
2. ⏳ Smoke test with different languages
3. ⏳ Monitor logs for errors
4. ⏳ Deploy to production
5. ⏳ Monitor `ContentTranslation` table growth

### Phase 2: Image Cache Audit (P2 - Medium)

**Day 1: Audit** (2 hours)
1. ✅ Run grep searches for `<img>` tags
2. ✅ Review all image-rendering components
3. ✅ Document findings (see below)
4. ✅ Identify components needing migration

**Day 2: Analysis** (1 hour)
1. ✅ Categorize findings (critical vs nice-to-have)
2. ✅ Estimate migration effort
3. ✅ Prioritize based on traffic/impact
4. ⏳ Create follow-up tickets if needed

**Day 3: Implementation** (if needed)
1. ⏳ Migrate high-priority components
2. ⏳ Test cache behavior
3. ⏳ Deploy and monitor

---

## 📝 Implementation Progress

### Completed Changes (2025-01-01)

**Backend Changes:**
1. ✅ `backend/src/routes/v1/story.ts`:
   - Added `import { translationMiddleware } from '../../middleware/translationMiddleware';`
   - Added `translationMiddleware()` to GET routes: `/my`, `/`, `/:id`
   - Added logic to set `originalLanguageCode` from user preference on story creation

2. ✅ `backend/src/validators/story.validator.ts`:
   - Added `originalLanguageCode` field to `createStorySchema`

**Audit Results:**
- **Valid uses (no migration needed)**: `/logo.png` static assets, upload preview components (ImageCropperModal, UrlImageUploader, etc.)
- **Recommended for CachedImage migration**: `story-card.tsx`, `ConversationCard.tsx`, `dashboard-carousel.tsx`, `recent-conversations.tsx`, `ImageGalleryModal.tsx`, `ChatView.tsx`, and other list/sidebar components showing remote images

**Testing:**
- ✅ TypeScript compilation passed
- ✅ ESLint linting passed (only pre-existing warnings)
- ✅ Docker containers start successfully
- ✅ Backend API responds without errors
- ✅ No translation-related errors in logs

---

## 🎓 Knowledge Transfer

### Translation System Overview

**For Future Developers**:

1. **How it works**:
   - Middleware intercepts API responses
   - Detects user's preferred language
   - Translates content fields automatically
   - Caches in Redis (1hr) and Database (permanent)

2. **Adding new translatable content**:
   ```typescript
   // 1. Add to TRANSLATABLE_FIELDS in translationMiddleware.ts
   const TRANSLATABLE_FIELDS = {
     MyNewModel: ['field1', 'field2'],
   };

   // 2. Ensure model has these fields:
   model MyNewModel {
     id                   String
     originalLanguageCode String  // Required!
     contentVersion       Int     // Required for cache invalidation
     field1               String  // Will be translated
     field2               String  // Will be translated
   }

   // 3. Add middleware to GET routes:
   router.get('/', translationMiddleware(), handler);
   ```

3. **Debugging translation issues**:
   ```typescript
   // Check middleware logs
   // Look for: "Translation cache hit" or "Translation cache miss"

   // Check if middleware is applied
   // Verify route has translationMiddleware()

   // Check response has _translations metadata
   // Should have: response.data._translations.fieldName

   // Query database
   // SELECT * FROM "ContentTranslation" WHERE "contentType" = 'Story'
   ```

### Image Cache Best Practices

1. **Always use `CachedImage` for remote images**:
   ```tsx
   import { CachedImage } from '@/components/ui/CachedImage';

   <CachedImage
     src={imageUrl}
     alt="Description"
     loading="lazy"
     className="w-full h-full object-cover"
   />
   ```

2. **When to use raw `<img>`**:
   - Local assets (imported images)
   - SVG inline code
   - Data URLs
   - Icon fonts (Material Symbols)

3. **Cache configuration**:
   ```tsx
   <CachedImage
     src={url}
     ttlMs={5 * 60 * 1000}      // 5min default
     useBlobCache={true}         // Enable blob caching
     crossOrigin="anonymous"     // For CORS images
   />
   ```

---

## 🔗 Related Documentation

- [Translation Service Code](../../../../../../backend/src/services/translation/translationService.ts)
- [Translation Middleware Code](../../../../../../backend/src/middleware/translationMiddleware.ts)
- [CachedImage Component](../../../../../../frontend/src/components/ui/CachedImage.tsx)
- [Story Routes](../../../../../../backend/src/routes/v1/story.ts)
- [Character Routes](../../../../../../backend/src/routes/v1/characters.ts)
- [Database Schema](../../../../../../backend/prisma/schema.prisma)

---

## ✅ Definition of Done

- [ ] All Story GET routes use `translationMiddleware()`
- [ ] `ContentTranslation` table has entries (>0 rows)
- [ ] Story cards show translated titles/synopses
- [ ] Story detail pages show translated content
- [ ] Translation unit tests pass (>90% coverage)
- [ ] Manual QA completed across 3+ languages
- [ ] No regression in Character translation
- [ ] Image cache audit documented with findings
- [ ] Performance metrics logged (translation time < 2s)
- [ ] Documentation updated
- [ ] Code reviewed and approved
- [ ] Deployed to production
- [ ] Monitoring dashboards updated

---

## 📝 Notes

### Why Translation Table is Empty

The `ContentTranslation` table is empty because:
1. Story routes don't have `translationMiddleware()` applied
2. No translation requests are made for stories
3. No LLM calls happen for story content
4. Nothing is saved to the database

**Expected behavior after fix**:
- User with `preferredLanguage: 'pt'` requests English story
- Middleware detects language mismatch
- Calls `translationService.translate()`
- LLM translates content
- Saves to `ContentTranslation` table
- Returns translated response to user

### Cache Invalidation Strategy

Translations are invalidated when:
- `sourceVersion` increments (content updated)
- Translation marked as `OUTDATED` or `DEPRECATED`
- Manual admin action

**Example**:
```typescript
// User edits story
await prisma.story.update({
  where: { id },
  data: {
    title: 'New Title',
    contentVersion: { increment: 1 }  // Invalidates cached translations
  }
});
```

### Performance Considerations

**Translation Costs**:
- Redis cache hit: ~1-5ms
- Database cache hit: ~10-50ms
- LLM translation: ~500-2000ms (first time only)

**Optimization**:
- Pre-translate popular content (see `scripts/preTranslatePopular.ts`)
- Batch translations for lists (future enhancement)
- Use faster model for short text (`gemini-2.5-flash-lite`)

---

**Last Updated**: 2025-12-30
**Next Review**: After Phase 1 deployment
