# Feature: Character Generation Flow Adjustment & Correction System

**Status**: Active
**Priority**: High
**Assigned To**: Agent Coder
**Created**: 2026-01-17
**Feature ID**: FEATURE-011

---

## Overview

This feature adjusts the automated character generation flow to be more sustainable and adds two critical correction mechanisms to fix data quality issues in bot-generated characters. The system currently generates ~17 characters/day with high operational cost, and 32% of characters (120 out of 379) lack avatar images. Many characters also have incomplete data (missing speciesId, generic "Character" names from LLM fallbacks).

This feature implements:
1. Reduced daily generation rate (17 → 5 characters/day)
2. Avatar correction flow for bot-generated characters without avatars (5/day)
3. Data completeness correction flow for bot-generated characters with missing/incomplete data (10/day)
4. Configuration management system for parameters

---

## Problem Statement

### Current Issues

1. **High Generation Rate**: The system generates ~17 characters/day, which is costly and may not be sustainable long-term. The initial phase served to kickstart character population when the site had few characters, but now needs adjustment.

2. **Missing Avatar Images**: 32% of bot-generated characters (120 out of 379) don't have avatar images. This indicates avatar generation failures in the existing pipeline, leaving characters incomplete and less engaging for users.

3. **Incomplete Character Data**: Many bot-generated characters have:
   - No `speciesId` defined (NULL in database)
   - Generic "Character" as firstName (LLM error fallback)
   - Missing lastName, age, or other required fields

4. **No Correction Mechanism**: There's no automated system to detect and fix these data quality issues. Characters remain incomplete indefinitely.

5. **Configuration Management**: All parameters are hardcoded in `.env.production`, requiring deployment changes for any adjustments. No admin UI exists for parameter management.

### Impact

- **User Experience**: Characters without avatars are less discoverable and engaging
- **Data Quality**: Incomplete character records affect search, recommendations, and AI interactions
- **Operational Cost**: High generation rate consumes LLM credits and compute resources
- **Maintainability**: Configuration changes require deployment, reducing agility

---

## User Stories

- As a **system administrator**, I want to reduce the daily character generation rate to control operational costs while maintaining character population growth.
- As a **system administrator**, I want an automated correction flow to fix bot-generated characters missing avatar images.
- As a **system administrator**, I want an automated correction flow to fix bot-generated characters with incomplete data (species, names, etc.).
- As a **system administrator**, I want to manage generation and correction parameters through admin UI instead of deployment changes.
- As a **content manager**, I want visibility into correction job statistics (success/failure rates, characters corrected).

---

## Value Proposition

### Quantitative Benefits

- **Cost Reduction**: Reducing generation from 17 to 5 characters/day reduces daily LLM and compute costs by ~70%
- **Data Quality**: Correcting 120 avatar-less characters improves character completeness from 68% to 100% over 24 days
- **User Engagement**: Characters with avatars have higher engagement rates (click-through, favorites)
- **Operational Efficiency**: Automated correction reduces manual data cleanup work

### Qualitative Benefits

- **Sustainable Growth**: Controlled generation rate matches platform maturity
- **Better UX**: Complete character records provide better user experience
- **Agility**: Admin-configurable parameters enable quick adjustments without deployment
- **Data Integrity**: Proactive correction maintains high data quality standards

---

## Technical Approach

### Architecture Overview

The system extends the existing character population infrastructure with three new scheduled job types:

1. **Reduced New Character Generation** (Hourly Job)
   - Modifies existing `hourly-generation` job
   - Changes daily limit from 17 to 5 characters
   - Only affects auto-generation bot (userId: `00000000-0000-0000-0000-000000000001`)

2. **Avatar Correction Flow** (Daily Job)
   - New job type: `avatar-correction`
   - Runs daily after new character generation
   - Selects 5 bot-generated characters without active AVATAR images
   - Generates complete package: AVATAR + 4 REFERENCE images
   - Uses existing `multiStageCharacterGenerator`

3. **Data Completeness Correction Flow** (Daily Job)
   - New job type: `data-completeness-correction`
   - Runs daily after avatar correction
   - Selects 10 bot-generated characters with incomplete data:
     - `speciesId` is NULL
     - `firstName` is "Character" (LLM fallback error)
   - Uses existing "autofill" pattern with `compileCharacterDataWithLLM`
   - For "Character" names: passes empty string to trigger LLM name generation

4. **Configuration Management** (Database Table)
   - New table: `SystemConfiguration`
   - Stores parameters as key-value pairs with metadata
   - Admin API endpoints for CRUD operations
   - Optional: Admin UI for parameter management

### Database Schema Changes

```prisma
// System Configuration Table
model SystemConfiguration {
  id          String   @id @default(uuid())
  key         String   @unique
  value       String
  description String?
  category    String?  // e.g., "generation", "correction", "curation"
  updatedAt   DateTime @updatedAt
  updatedBy   String?  // User ID who last updated

  @@index([category])
}

// Migration tracking (optional)
model CorrectionJobLog {
  id            String   @id @default(uuid())
  jobType       String   // "avatar-correction" or "data-completeness-correction"
  targetCount   Int
  successCount  Int
  failureCount  Int
  duration      Int?     // Duration in seconds
  startedAt     DateTime @default(now())
  completedAt   DateTime?
  errors        Json?    // Array of {characterId, error}
  metadata      Json?    // Additional job-specific data

  @@index([jobType, startedAt])
}
```

### Backend Changes

#### New API Endpoints

```
GET    /api/v1/system-config
GET    /api/v1/system-config/:key
POST   /api/v1/system-config
PUT    /api/v1/system-config/:key
DELETE /api/v1/system-config/:key

POST   /api/v1/character-population/trigger-avatar-correction
POST   /api/v1/character-population/trigger-data-correction
GET    /api/v1/character-population/correction-stats
```

#### New Services

1. **`SystemConfigurationService`**
   - `getConfiguration(key: string): Promise<string | null>`
   - `setConfiguration(key: string, value: string, userId?: string): Promise<void>`
   - `getConfigurationsByCategory(category: string): Promise<Record<string, string>>`
   - `getAllConfigurations(): Promise<SystemConfiguration[]>`
   - `refreshCache(): Promise<void>` - Reloads configuration from database

2. **`AvatarCorrectionService`**
   - `findCharactersWithoutAvatars(limit: number): Promise<Character[]>`
   - `correctCharacterAvatar(characterId: string): Promise<boolean>`
   - `runBatchCorrection(limit: number): Promise<CorrectionResult>`

3. **`DataCompletenessCorrectionService`**
   - `findCharactersWithIncompleteData(limit: number): Promise<Character[]>`
   - `correctCharacterData(characterId: string): Promise<boolean>`
   - `runBatchCorrection(limit: number): Promise<CorrectionResult>`

#### Modified Services

1. **`batchCharacterGenerator.ts`**
   - Add configuration reading from `SystemConfigurationService`
   - Change default `BATCH_SIZE_PER_RUN` to read from config (default: 5)

2. **`characterPopulationWorker.ts`**
   - Add handlers for new job types:
     - `processAvatarCorrection(job: Job)`
     - `processDataCompletenessCorrection(job: Job)`

#### New Job Types

```typescript
// In queues/jobs/characterPopulationJob.ts
export interface AvatarCorrectionJobData {
  targetCount?: number; // Default from config
}

export interface DataCompletenessCorrectionJobData {
  targetCount?: number; // Default from config
}
```

### Frontend Changes

#### New Admin Pages (Optional - Phase 2)

- `/admin/system-configuration` - Configuration management UI
- `/admin/correction-jobs` - Correction job history and statistics

#### i18n Keys

```json
{
  "admin": {
    "systemConfig": {
      "title": "System Configuration",
      "generation": {
        "dailyLimit": "Daily Generation Limit",
        "batchSize": "Batch Size Per Run",
        "enabled": "Generation Enabled"
      },
      "correction": {
        "avatarDailyLimit": "Avatar Correction Daily Limit",
        "dataDailyLimit": "Data Completeness Correction Daily Limit",
        "enabled": "Correction Flows Enabled"
      }
    },
    "correctionJobs": {
      "title": "Correction Jobs",
      "avatarCorrection": "Avatar Correction",
      "dataCorrection": "Data Completeness Correction",
      "stats": "Statistics",
      "history": "Job History"
    }
  }
}
```

---

## Configuration Management

### Approach: Database Table with .env Fallback

**Recommended Approach**: Use a hybrid configuration system:
- **Database table** (`SystemConfiguration`) for runtime-configurable parameters
- **.env files** for sensitive/infrequently changed values (API keys, secrets)
- **Configuration service** that reads from database with .env fallback

### Rationale

**Database Table Advantages**:
- Real-time parameter changes without deployment
- Admin UI for non-technical users
- Audit trail (who changed what, when)
- Configuration versioning (optional)
- Easy to extend with new parameters

**.env Fallback Advantages**:
- Backward compatibility
- Safety net if database is unavailable
- Secrets stay in .env (never in database)

**Why Not Pure .env?**
- Requires deployment for every parameter change
- No audit trail
- No admin UI
- Slower iteration cycle

**Why Not Pure Database?**
- .env is standard practice for 12-factor apps
- Migration effort for existing parameters
- Security concerns for secrets in database

### Configuration Schema

| Key | Default Value | Category | Description |
|-----|---------------|----------|-------------|
| `generation.daily_limit` | `5` | generation | Max new characters per day (reduced from 17) |
| `generation.enabled` | `true` | generation | Master switch for character generation |
| `correction.avatar_daily_limit` | `5` | correction | Max avatar corrections per day |
| `correction.data_daily_limit` | `10` | correction | Max data completeness corrections per day |
| `correction.enabled` | `true` | correction | Master switch for correction flows |
| `curation.daily_hour` | `3` | curation | UTC hour for daily curation job |
| `batch.size_per_run` | `5` | batch | Batch size for generation runs |

### Configuration Service Pattern

```typescript
class SystemConfigurationService {
  private cache = new Map<string, string>();

  async get(key: string, defaultValue?: string): Promise<string | null> {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Check database
    const config = await prisma.systemConfiguration.findUnique({
      where: { key }
    });

    if (config) {
      this.cache.set(key, config.value);
      return config.value;
    }

    // Fallback to .env
    const envValue = process.env[key];
    if (envValue) {
      this.cache.set(key, envValue);
      return envValue;
    }

    return defaultValue ?? null;
  }

  async set(key: string, value: string, userId?: string): Promise<void> {
    // Upsert to database
    await prisma.systemConfiguration.upsert({
      where: { key },
      create: { key, value, updatedBy: userId },
      update: { value, updatedBy: userId }
    });

    // Update cache
    this.cache.set(key, value);
  }
}
```

---

## Implementation Tasks

### Phase 1: Core Functionality (Agent Coder)

#### Backend - Database Schema
- [ ] Create `SystemConfiguration` table migration
- [ ] Create `CorrectionJobLog` table migration
- [ ] Run migrations and verify schema

#### Backend - Services
- [ ] Implement `SystemConfigurationService` with caching
- [ ] Implement `AvatarCorrectionService`:
  - Query for characters without AVATAR images
  - Filter by bot userId only
  - Integrate with existing `multiStageCharacterGenerator`
- [ ] Implement `DataCompletenessCorrectionService`:
  - Query for characters with NULL speciesId OR firstName = "Character"
  - Filter by bot userId only
  - Integrate with existing `compileCharacterDataWithLLM`

#### Backend - Job Processing
- [ ] Add `processAvatarCorrection` handler to `characterPopulationWorker.ts`
- [ ] Add `processDataCompletenessCorrection` handler to `characterPopulationWorker.ts`
- [ ] Add job type definitions to `characterPopulationJob.ts`
- [ ] Implement logging to `CorrectionJobLog` table

#### Backend - API Endpoints
- [ ] Create `/api/v1/system-config` CRUD endpoints
- [ ] Add `POST /api/v1/character-population/trigger-avatar-correction`
- [ ] Add `POST /api/v1/character-population/trigger-data-correction`
- [ ] Add `GET /api/v1/character-population/correction-stats`
- [ ] Add admin authentication to all endpoints

#### Backend - Configuration Migration
- [ ] Update `batchCharacterGenerator.ts` to use `SystemConfigurationService`
- [ ] Update `characterPopulationWorker.ts` to use `SystemConfigurationService`
- [ ] Change default `BATCH_SIZE_PER_RUN` from 10 to 5
- [ ] Ensure .env fallback works for all config reads

#### Backend - Scheduled Jobs
- [ ] Update `queues/workers/index.ts` to schedule new correction jobs:
    - Avatar correction: Daily at 4 AM UTC (after generation)
    - Data correction: Daily at 5 AM UTC (after avatar correction)

#### Backend - Testing
- [ ] Unit tests for `SystemConfigurationService`
- [ ] Unit tests for `AvatarCorrectionService`
- [ ] Unit tests for `DataCompletenessCorrectionService`
- [ ] Integration tests for API endpoints
- [ ] Manual testing with local database

### Phase 2: Configuration & Deployment (Agent Reviewer)

#### Production Configuration
- [ ] Update `.env.production` with new parameters:
  - `CORRECTION_AVATAR_DAILY_LIMIT=5`
  - `CORRECTION_DATA_DAILY_LIMIT=10`
  - `GENERATION_DAILY_LIMIT=5` (new)
- [ ] Sync `.env.production` to production server
- [ ] Restart backend services

#### Database Migration
- [ ] Run Prisma migrations on production database
- [ ] Verify tables created successfully
- [ ] Back up database before migration

#### Monitoring
- [ ] Monitor first few correction job runs
- [ ] Verify avatar correction generates AVATAR + 4 REFERENCES
- [ ] Verify data correction fixes speciesId and names
- [ ] Check logs for errors or failures

### Phase 3: Admin UI (Optional - Agent Coder)

#### Frontend Pages
- [ ] Create `/admin/system-configuration` page
- [ ] Create configuration form with validation
- [ ] Create `/admin/correction-jobs` page
- [ ] Add job statistics display
- [ ] Add job history table with filters

#### Frontend Components
- [ ] `SystemConfigurationForm.vue` - Edit configuration values
- [ ] `CorrectionJobStats.vue` - Display correction statistics
- [ ] `CorrectionJobHistory.vue` - Job history list
- [ ] Add i18n translations for all UI text

---

## Acceptance Criteria

### Generation Rate Reduction

- [ ] Daily character generation reduced from ~17 to 5 characters
- [ ] Only affects auto-generation bot (userId: `00000000-0000-0000-0000-000000000001`)
- [ ] User-generated characters unaffected
- [ ] Configuration is adjustable via database or .env

### Avatar Correction Flow

- [ ] Daily correction job runs automatically
- [ ] Selects 5 bot-generated characters without active AVATAR image
- [ ] Generates complete package: 1 AVATAR + 4 REFERENCE images
- [ ] Only processes bot-generated characters (userId filter)
- [ ] Logs results to `CorrectionJobLog` table
- [ ] Handles failures gracefully (continues to next character)
- [ ] Can be triggered manually via API endpoint

### Data Completeness Correction Flow

- [ ] Daily correction job runs automatically
- [ ] Selects 10 bot-generated characters with:
  - `speciesId` IS NULL, OR
  - `firstName` = "Character" (LLM fallback)
- [ ] Uses `compileCharacterDataWithLLM` with empty name for "Character" cases
- [ ] Only processes bot-generated characters (userId filter)
- [ ] Logs results to `CorrectionJobLog` table
- [ ] Handles failures gracefully (continues to next character)
- [ ] Can be triggered manually via API endpoint

### Configuration Management

- [ ] `SystemConfiguration` table exists with proper schema
- [ ] `SystemConfigurationService` implements caching
- [ ] .env fallback works for missing database values
- [ ] API endpoints support CRUD operations
- [ ] Admin-only access enforced
- [ ] Configuration changes take effect immediately (cache invalidation)
- [ ] Audit trail captures who changed what (updatedBy field)

### API Endpoints

- [ ] `GET /api/v1/system-config` returns all configurations
- [ ] `GET /api/v1/system-config/:key` returns single configuration
- [ ] `POST /api/v1/system-config` creates new configuration
- [ ] `PUT /api/v1/system-config/:key` updates configuration
- [ ] `DELETE /api/v1/system-config/:key` deletes configuration
- [ ] `POST /api/v1/character-population/trigger-avatar-correction` starts job
- [ ] `POST /api/v1/character-population/trigger-data-correction` starts job
- [ ] `GET /api/v1/character-population/correction-stats` returns statistics

### Data Quality Metrics

- [ ] All bot-generated characters have active AVATAR image after 24 days (120 / 5 = 24 days)
- [ ] All bot-generated characters have non-NULL speciesId after 12 days (assuming ~120 incomplete / 10 per day)
- [ ] No bot-generated characters have firstName = "Character" after correction cycle
- [ ] `CorrectionJobLog` tracks success/failure rates
- [ ] Admin can view correction statistics via API

---

## Testing Requirements

### Unit Tests

#### SystemConfigurationService
- [ ] Test `get()` returns database value
- [ ] Test `get()` falls back to .env if database empty
- [ ] Test `get()` uses cache efficiently
- [ ] Test `set()` upserts to database
- [ ] Test `set()` invalidates cache

#### AvatarCorrectionService
- [ ] Test `findCharactersWithoutAvatars()` filters correctly
- [ ] Test `findCharactersWithoutAvatars()` only returns bot characters
- [ ] Test `correctCharacterAvatar()` generates AVATAR + REFERENCES
- [ ] Test `correctCharacterAvatar()` handles errors gracefully
- [ ] Test `runBatchCorrection()` logs results properly

#### DataCompletenessCorrectionService
- [ ] Test `findCharactersWithIncompleteData()` finds NULL speciesId
- [ ] Test `findCharactersWithIncompleteData()` finds "Character" names
- [ ] Test `findCharactersWithIncompleteData()` only returns bot characters
- [ ] Test `correctCharacterData()` uses empty name for "Character" cases
- [ ] Test `correctCharacterData()` handles errors gracefully
- [ ] Test `runBatchCorrection()` logs results properly

### Integration Tests

- [ ] End-to-end avatar correction job flow
- [ ] End-to-end data correction job flow
- [ ] Configuration CRUD operations via API
- [ ] Manual job triggering via API endpoints
- [ ] Authentication/authorization on all admin endpoints

### Manual Testing Scenarios

#### Scenario 1: Avatar Correction
1. Create 10 bot-generated characters without avatars
2. Manually trigger avatar correction job with limit=5
3. Verify 5 characters get AVATAR + 4 REFERENCE images
4. Verify `CorrectionJobLog` records success
5. Verify remaining 5 characters are NOT corrected

#### Scenario 2: Data Completeness Correction
1. Create 5 bot-generated characters with speciesId=NULL
2. Create 5 bot-generated characters with firstName="Character"
3. Manually trigger data correction job with limit=10
4. Verify all 10 characters have updated speciesId and firstName
5. Verify `CorrectionJobLog` records success

#### Scenario 3: Configuration Management
1. Update `generation.daily_limit` via API
2. Verify change takes effect immediately
3. Verify next generation job respects new limit
4. Check `updatedBy` field records correct user

#### Scenario 4: Error Handling
1. Trigger correction with invalid characterId
2. Verify job continues to next character
3. Verify error logged to `CorrectionJobLog`
4. Verify no partial updates to database

---

## Success Metrics

### Operational Metrics

- [ ] **Generation Rate**: Average daily characters generated = 5 ± 1 (allowing for retries)
- [ ] **Avatar Correction**: 5 characters corrected per day (100% success rate expected)
- [ ] **Data Correction**: 10 characters corrected per day (95%+ success rate)
- [ ] **Job Failure Rate**: < 5% for both correction flows

### Data Quality Metrics

- [ ] **Avatar Coverage**: Increase from 68% to 100% over 24 days
- [ ] **Species Completeness**: 100% of bot characters have speciesId after correction cycle
- [ ] **Name Quality**: 0 bot characters with firstName="Character" after correction cycle

### Performance Metrics

- [ ] **Avatar Correction Time**: < 5 minutes per character (includes 4 reference generations)
- [ ] **Data Correction Time**: < 30 seconds per character (LLM call only)
- [ ] **Database Load**: < 100ms query time for character selection

### Cost Metrics

- [ ] **LLM Cost Reduction**: 70% reduction in daily LLM usage (17 → 5 new chars)
- [ ] **Correction Cost**: Offset by value of fixing existing incomplete characters
- [ ] **Storage Cost**: +480 images/month (5 avatars × 5 references × 30 days = ~750 images)

---

## Open Questions

1. **Correction Priority**: Should avatar correction run before or after data correction?
   - **Recommendation**: Avatar first (reference images need complete character data)

2. **Correction Scope**: Should we also correct user-generated characters, or only bot-generated?
   - **Decision**: Bot-generated only (per requirements). User-generated may have intentional incompleteness.

3. **Rate Limiting**: Should correction jobs have rate limiting to avoid overwhelming ComfyUI/LLM services?
   - **Recommendation**: Add delay between corrections (30 seconds) similar to batch generation

4. **Configuration Changes**: Should configuration changes require approval or be immediate?
   - **Recommendation**: Immediate for agility, but log all changes to audit table

5. **Correction History**: How long should we keep `CorrectionJobLog` records?
   - **Recommendation**: 90 days retention, then archive to cold storage

6. **Admin UI Priority**: Is Phase 3 (Admin UI) required for initial release?
   - **Decision**: No. Phase 1-2 provide full functionality. Admin UI can be future enhancement.

---

## Implementation Notes

### Key Dependencies

- **Existing Services**:
  - `batchCharacterGenerator.ts` - Character generation pipeline
  - `multiStageCharacterGenerator.ts` - Reference image generation
  - `compileCharacterDataWithLLM()` - Character data compilation
  - `curationQueue.ts` - Curated image management

- **Database Tables**:
  - `Character` - Main character records
  - `CharacterImage` - Character images (type: AVATAR, REFERENCE, etc.)
  - `CuratedImage` - Source images for generation
  - `BatchGenerationLog` - Existing generation logs

### Critical Considerations

1. **Avatar Generation Timeout**: Avatar generation can take 2-5 minutes. Correction job must handle timeouts gracefully.

2. **Reference Generation**: The existing `multiStageCharacterGenerator` generates 4 reference views (face, front, side, back). Ensure this is called for avatar correction.

3. **LLM Name Generation**: When firstName is "Character", pass empty string to `compileCharacterDataWithLLM` to force LLM to generate creative name.

4. **Species Mapping**: When correcting speciesId, LLM may return species name (e.g., "Human"). Must map to existing Species table or create new entry.

5. **Error Recovery**: If correction fails, should we retry next day or mark as permanently failed?
   - **Recommendation**: Retry indefinitely (new characters selected each day)

6. **Concurrent Jobs**: Ensure avatar and data correction jobs don't run simultaneously to avoid resource contention.

### Code Patterns to Follow

1. **Configuration Service**: Use singleton pattern with caching (similar to `batchCharacterGenerator`)
2. **Job Processing**: Follow existing `processHourlyGeneration` pattern in `characterPopulationWorker.ts`
3. **Error Handling**: Use try-catch with logging (existing pattern in `batchCharacterGenerator`)
4. **Database Queries**: Use Prisma with proper indexes (characterId, userId, type for CharacterImage)
5. **API Endpoints**: Follow existing admin route pattern in `character-population.ts`

### Migration Strategy

1. **Phase 1** (Week 1): Backend implementation and local testing
2. **Phase 2** (Week 2): Production deployment and monitoring
3. **Phase 3** (Future): Admin UI development

### Rollback Plan

If issues arise in production:
1. Set `correction.enabled=false` in database to disable correction jobs
2. Set `generation.daily_limit=17` to restore original generation rate
3. Restart backend services to apply changes
4. Monitor logs for errors

---

## Dependencies

### External Dependencies

- **ComfyUI Service**: Avatar generation endpoint (existing dependency)
- **LLM Services**: OpenAI/Gemini for character data compilation (existing dependency)
- **R2 Storage**: Image storage (existing dependency)

### Internal Dependencies

- **Feature 009 (R2 Storage)**: Already implemented, used for image storage
- **Feature 010 (Character Population)**: Existing batch generation system
- **Database Migration**: Requires Prisma migration to be applied

### Blocked By

- None (ready to implement)

### Blocking

- Future features that depend on complete character data:
  - Advanced character search
  - Character recommendation system
  - Character analytics

---

## References

- **Existing Batch Generation**: `/backend/src/services/batch/batchCharacterGenerator.ts`
- **Character Population Worker**: `/backend/src/queues/workers/characterPopulationWorker.ts`
- **Character Data Compilation**: `/backend/src/controllers/automatedCharacterGenerationController.ts`
- **Multi-Stage Generator**: `/backend/src/services/image-generation/multiStageCharacterGenerator.ts`
- **Database Schema**: `/backend/prisma/schema.prisma`
- **Admin Routes**: `/backend/src/routes/v1/character-population.ts`

---

**End of Feature Specification**

**Next Steps**:
1. Agent Coder: Implement Phase 1 (Backend Services & Jobs)
2. Agent Reviewer: Deploy Phase 2 (Production Configuration)
3. Monitor correction job runs for first week
4. Adjust parameters based on metrics

**Questions?** Contact Agent Planner for clarification or requirements discussion.
