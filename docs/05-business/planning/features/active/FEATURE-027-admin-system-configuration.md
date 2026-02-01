# FEATURE-027: Admin System Configuration Page

**Status**: Active
**Priority**: P1 - High
**Type**: Enhancement (Admin Tooling)
**Depends on**: None (infrastructure already exists)
**Blocks**: None
**Assigned To**: Agent Coder
**Created**: 2026-02-01
**Last Updated**: 2026-02-01

---

## Overview

Create a dedicated admin page for managing runtime system configuration parameters. The project already has backend infrastructure (`SystemConfiguration` table, `SystemConfigurationService`, and REST API), but lacks a frontend interface and seed data. This feature completes the system by adding an admin UI, expanding the configurable parameters, and seeding default values from `.env`.

The goal is to eliminate the need for SSH access and container restarts when changing business/operational parameters.

---

## Problem Statement

**Current state:**
- ~20 business/operational parameters are configured via `.env` file
- Changing any parameter requires SSH access to the server, editing the `.env` file, and restarting the Docker container
- No visibility into current parameter values without SSH access
- No audit trail of who changed what and when
- Only ~5 parameters currently use the `SystemConfiguration` table; the rest read directly from `process.env`

**Problems:**
1. Operational friction: SSH + restart for simple config changes
2. Downtime: Container restart causes brief service interruption
3. No audit trail for configuration changes
4. No validation of parameter values before applying
5. Limited categories in the current API (only `generation`, `correction`, `curation`)

**Target users:** Admin users (role: `ADMIN`)

**Value proposition:** Instant configuration changes via web UI with zero downtime, full audit trail, and value validation.

---

## Solution

1. **Seed system**: Populate `SystemConfiguration` table with default values on first run (upsert pattern - never overwrite existing DB values)
2. **Migrate consumers**: Update all services that read `process.env` for business parameters to use `SystemConfigurationService` instead
3. **Expand categories**: Add new categories (`translation`, `context`, `moderation`, `scheduling`) to the API validation
4. **Frontend admin page**: Dedicated `/admin/system-config` page with grouped configuration editor
5. **Cache invalidation**: Refresh in-memory cache immediately when values are updated via the API (already implemented in `set()`)

**Explicitly out of scope:**
- Cron job / periodic cache refresh (single backend instance, not needed)
- Sensitive variables (API keys, secrets, credentials) - these stay in `.env` only
- Frontend environment variables (`VITE_*`) - these are build-time constants

---

## Variables to Migrate

### Category: `translation`

| Key (DB format) | .env Name | Default | Type | Description |
|---|---|---|---|---|
| `translation.default_provider` | `TRANSLATION_DEFAULT_PROVIDER` | `gemini` | string | LLM provider for translations |
| `translation.default_model` | `TRANSLATION_DEFAULT_MODEL` | `gemini-2.5-flash-lite` | string | LLM model for translations |
| `translation.cache_ttl` | `TRANSLATION_CACHE_TTL` | `3600` | number | Translation cache TTL in seconds |
| `translation.enable_pre_translation` | `TRANSLATION_ENABLE_PRE_TRANSLATION` | `false` | boolean | Enable pre-translation of content |

### Category: `context`

| Key (DB format) | .env Name | Default | Type | Description |
|---|---|---|---|---|
| `context.max_tokens` | `MAX_CONTEXT_TOKENS` | `8000` | number | Max context window tokens for chat memory |

### Category: `generation`

| Key (DB format) | .env Name | Default | Type | Description |
|---|---|---|---|---|
| `generation.daily_limit` | `GENERATION_DAILY_LIMIT` | `5` | number | Daily character generation limit |
| `generation.batch_enabled` | `BATCH_GENERATION_ENABLED` | `false` | boolean | Enable automated batch generation |
| `generation.batch_size_per_run` | `BATCH_SIZE_PER_RUN` | `24` | number | Max characters per batch run |
| `generation.batch_retry_attempts` | `BATCH_RETRY_ATTEMPTS` | `3` | number | Retry attempts for failed generations |
| `generation.batch_timeout_minutes` | `BATCH_TIMEOUT_MINUTES` | `5` | number | Timeout per generation job (minutes) |

### Category: `correction`

| Key (DB format) | .env Name | Default | Type | Description |
|---|---|---|---|---|
| `correction.avatar_daily_limit` | `CORRECTION_AVATAR_DAILY_LIMIT` | `5` | number | Daily avatar correction limit |
| `correction.data_daily_limit` | `CORRECTION_DATA_DAILY_LIMIT` | `10` | number | Daily data completeness correction limit |

### Category: `curation`

| Key (DB format) | .env Name | Default | Type | Description |
|---|---|---|---|---|
| `curation.search_keywords` | `CIVITAI_SEARCH_KEYWORDS` | `anime,fantasy,sci-fi,...` | string | Comma-separated search keywords |
| `curation.anime_model_ids` | `CIVITAI_ANIME_MODEL_IDS` | `` | string | Comma-separated Civitai model IDs |
| `curation.auto_approval_threshold` | `AUTO_APPROVAL_THRESHOLD` | `4.5` | number | Quality threshold for auto-approval (0-5) |
| `curation.require_manual_review` | `REQUIRE_MANUAL_REVIEW` | `false` | boolean | Require manual review for curated images |

### Category: `moderation`

| Key (DB format) | .env Name | Default | Type | Description |
|---|---|---|---|---|
| `moderation.nsfw_filter_enabled` | `NSFW_FILTER_ENABLED` | `true` | boolean | Enable NSFW content filtering |
| `moderation.nsfw_filter_strictness` | `NSFW_FILTER_STRICTNESS` | `medium` | enum (low/medium/high) | NSFW filter strictness level |

### Category: `scheduling`

| Key (DB format) | .env Name | Default | Type | Description |
|---|---|---|---|---|
| `scheduling.daily_curation_hour` | `DAILY_CURATION_HOUR` | `3` | number | Hour (UTC) for daily curation job (0-23) |

**Total: 20 parameters across 7 categories**

---

## Database Schema

No schema changes needed. The existing `SystemConfiguration` model is sufficient:

```prisma
model SystemConfiguration {
  id          String   @id @default(uuid())
  key         String   @unique
  value       String
  description String?
  category    String?
  updatedAt   DateTime @updatedAt
  updatedBy   String?

  @@index([category])
}
```

### Seed Data

**File**: `backend/prisma/seed.ts` (or new file `backend/prisma/seeds/systemConfiguration.ts`)

The seed must use **upsert with `skipDuplicates` logic**: only insert if the key does not already exist in the database. This ensures admin-modified values are never overwritten by a redeploy.

```typescript
// Pattern for each seed entry:
await prisma.systemConfiguration.upsert({
  where: { key: 'translation.default_provider' },
  create: {
    key: 'translation.default_provider',
    value: process.env.TRANSLATION_DEFAULT_PROVIDER || 'gemini',
    description: 'LLM provider for translations',
    category: 'translation',
  },
  update: {}, // Empty update = never overwrite existing values
});
```

The seed reads current `.env` values as defaults on first run, so existing installations get their current configuration migrated to the database automatically.

---

## Backend Implementation

### 1. Expand Category Validation

**File**: `backend/src/routes/v1/system-config.ts`

Update `VALID_CATEGORIES` constant:

```typescript
const VALID_CATEGORIES = [
  'translation',
  'context',
  'generation',
  'correction',
  'curation',
  'moderation',
  'scheduling',
];
```

### 2. Add Value Type Metadata

Add a `valueType` field to the seed data and expose it in the API response. This tells the frontend how to render the input (text, number, boolean toggle, select dropdown).

**Option A** (recommended): Store `valueType` in the `description` field as structured metadata, e.g., `"type:number|min:0|max:23|LLM provider for translations"`.

**Option B**: Add a new column `valueType` to the schema. This requires a migration.

**Decision for Agent Coder**: Use Option A to avoid a migration. Parse the description field to extract type hints. The format:

```
type:<string|number|boolean|enum>|min:<n>|max:<n>|options:<a,b,c>|<human description>
```

Examples:
- `type:string|LLM provider for translations`
- `type:number|min:0|max:100000|Max context window tokens for chat memory`
- `type:boolean|Enable NSFW content filtering`
- `type:enum|options:low,medium,high|NSFW filter strictness level`

### 3. Add GET by Category Endpoint

**File**: `backend/src/routes/v1/system-config.ts`

Add a new route to get configurations grouped by category:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/system-config` | Get all configurations (existing) |
| GET | `/api/v1/system-config/categories` | Get all configurations grouped by category |
| GET | `/api/v1/system-config/:key` | Get single configuration (existing) |
| POST | `/api/v1/system-config` | Create configuration (existing) |
| PUT | `/api/v1/system-config/:key` | Update configuration (existing) |
| DELETE | `/api/v1/system-config/:key` | Delete configuration (existing) |

The `/categories` endpoint should return:

```json
{
  "categories": [
    {
      "name": "translation",
      "label": "Translation System",
      "configs": [
        {
          "key": "translation.default_provider",
          "value": "gemini",
          "description": "LLM provider for translations",
          "valueType": "string",
          "updatedAt": "2026-02-01T...",
          "updatedBy": "user-uuid"
        }
      ]
    }
  ]
}
```

### 4. Migrate Service Consumers

All services that currently read `process.env.VARIABLE_NAME` for business parameters must be updated to use `systemConfigurationService.get('key')` (or `getInt`/`getBool`).

**Files to update** (search for each env variable usage):

| Service File | Variables to Migrate |
|---|---|
| Translation service | `TRANSLATION_DEFAULT_PROVIDER`, `TRANSLATION_DEFAULT_MODEL`, `TRANSLATION_CACHE_TTL`, `TRANSLATION_ENABLE_PRE_TRANSLATION` |
| Chat/context service | `MAX_CONTEXT_TOKENS` |
| `batchCharacterGenerator.ts` | Already partially migrated - verify all params |
| `characterPopulationWorker.ts` | Already partially migrated - verify all params |
| Curation/scheduling services | `DAILY_CURATION_HOUR`, `AUTO_APPROVAL_THRESHOLD`, etc. |
| Content moderation | `NSFW_FILTER_ENABLED`, `NSFW_FILTER_STRICTNESS` |

**Important**: These service methods become `async` since `systemConfigurationService.get()` is async. Agent Coder must handle this carefully, especially in synchronous initialization paths. For startup-critical values, use `initializeCache()` at boot time and then read from cache synchronously if needed.

### 5. Initialize Cache on Server Startup

**File**: `backend/src/index.ts` (or `backend/src/app.ts` - wherever the server boots)

Add `await systemConfigurationService.initializeCache()` during server startup, after database connection is established.

---

## Frontend Implementation

### 1. New Page: `/admin/system-config`

**File**: `frontend/src/pages/admin/system-config/index.tsx`

**Layout:**

```
┌──────────────────────────────────────────────────────────┐
│  System Configuration                                     │
│  Manage runtime parameters without server restart          │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  [Search input: Filter configurations...]                  │
│                                                            │
│  ┌─ Translation System ──────────────────────────────┐    │
│  │                                                     │    │
│  │  Default Provider          [ gemini         ] [Save]│    │
│  │  LLM provider for translations                      │    │
│  │                                                     │    │
│  │  Default Model             [ gemini-2.5-... ] [Save]│    │
│  │  LLM model for translations                         │    │
│  │                                                     │    │
│  │  Cache TTL (seconds)       [ 3600           ] [Save]│    │
│  │  Translation cache TTL in seconds                    │    │
│  │                                                     │    │
│  │  Pre-Translation           [  Toggle OFF    ] [Save]│    │
│  │  Enable pre-translation of content                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                            │
│  ┌─ Context Window ──────────────────────────────────┐    │
│  │  Max Tokens                [ 8000           ] [Save]│    │
│  │  Max context window tokens for chat memory          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                            │
│  ┌─ Character Generation ────────────────────────────┐    │
│  │  ...                                                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                            │
│  ... (more categories)                                     │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

**Key UI behaviors:**

1. **Grouped by category** - Each category is a collapsible card/section
2. **Inline editing** - Each parameter has an input field matching its type:
   - `string`: Text input
   - `number`: Number input with min/max validation
   - `boolean`: Toggle switch
   - `enum`: Select dropdown with predefined options
3. **Individual save** - Each parameter has its own save button (not a single form submit). This avoids accidentally changing multiple values. The save button should only be enabled when the value has changed from its current state.
4. **Search/filter** - Text input at the top to filter parameters by key or description
5. **Last updated info** - Show "Updated X ago by [user]" under each parameter
6. **Success/error feedback** - Toast notification on save success or failure
7. **Confirmation for critical values** - Parameters that affect generation limits or enable/disable features should show a confirmation dialog before saving

### 2. Service Layer

**File**: `frontend/src/services/systemConfig.ts`

```typescript
import api from '../lib/api';

export interface SystemConfigItem {
  key: string;
  value: string;
  description: string | null;
  valueType: string;       // parsed from description metadata
  category: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface SystemConfigCategory {
  name: string;
  label: string;
  configs: SystemConfigItem[];
}

export const systemConfigService = {
  async getByCategories(): Promise<{ categories: SystemConfigCategory[] }> {
    const response = await api.get('/api/v1/system-config/categories');
    return response.data;
  },

  async updateConfig(key: string, value: string): Promise<void> {
    await api.put(`/api/v1/system-config/${key}`, { value });
  },
};
```

### 3. Route Registration

**File**: `frontend/src/App.tsx`

Add inside the `<AdminRoute>` wrapper:

```tsx
<Route path="/admin/system-config" element={<SystemConfigPage />} />
```

### 4. Navigation

**File**: `frontend/src/components/layout/NavigationRail.tsx`

Add a new entry to the admin dropdown menu:

```tsx
{ to: '/admin/system-config', icon: 'settings', label: t('navigation:adminSystemConfig') }
```

Position it as the first item in the admin dropdown (it's the most used admin function).

### 5. Translations

**File**: `backend/translations/_source/systemConfig.json`

Create a new i18n namespace `systemConfig` with:

```json
{
  "description": "System Configuration admin page translations",
  "resources": {
    "title": "System Configuration",
    "header": {
      "title": "System Configuration",
      "description": "Manage runtime parameters without server restart. Changes take effect immediately."
    },
    "search": {
      "placeholder": "Filter configurations..."
    },
    "categories": {
      "translation": "Translation System",
      "context": "Context Window",
      "generation": "Character Generation",
      "correction": "Correction System",
      "curation": "Image Curation",
      "moderation": "Content Moderation",
      "scheduling": "Job Scheduling"
    },
    "actions": {
      "save": "Save",
      "saving": "Saving...",
      "reset": "Reset to default"
    },
    "messages": {
      "saveSuccess": "Configuration \"{{key}}\" updated successfully",
      "saveError": "Failed to update configuration",
      "loadError": "Failed to load system configurations",
      "confirmChange": "Are you sure you want to change \"{{key}}\"? This will take effect immediately."
    },
    "meta": {
      "updatedAt": "Updated {{time}}",
      "updatedBy": "by {{user}}",
      "neverUpdated": "Default value (never modified)"
    }
  }
}
```

Also update `backend/translations/_source/navigation.json` to add:

```json
"adminSystemConfig": "System Config"
```

---

## Testing

### Backend Unit Tests

- [ ] Seed creates all 20 configuration entries with correct defaults
- [ ] Seed does not overwrite existing database values (upsert with empty update)
- [ ] `GET /api/v1/system-config/categories` returns configs grouped by category
- [ ] New categories (`translation`, `context`, `moderation`, `scheduling`) are accepted
- [ ] All migrated services read from `systemConfigurationService` instead of `process.env`
- [ ] Cache is refreshed after `set()` call
- [ ] `initializeCache()` loads all DB values at startup

### Frontend Tests

- [ ] System config page renders all categories
- [ ] Each parameter type renders correct input (text/number/toggle/select)
- [ ] Save button calls PUT endpoint with correct key and value
- [ ] Toast shows on success/error
- [ ] Search filter works across keys and descriptions
- [ ] Page is not accessible to non-admin users
- [ ] Boolean toggle sends `"true"`/`"false"` as string value

### Integration Tests

- [ ] Change value via API -> service reads new value (not old .env value)
- [ ] Change value via API -> cache is updated without restart
- [ ] Seed + restart -> existing DB values are preserved

---

## Success Criteria

- [ ] Admin users can view all 20 business parameters grouped by category
- [ ] Admin users can edit any parameter and the change takes effect immediately (no restart)
- [ ] Parameters are seeded with `.env` defaults on first deployment
- [ ] Subsequent deployments do not overwrite admin-modified values
- [ ] All 20 parameters are migrated from direct `process.env` reads to `systemConfigurationService`
- [ ] Non-admin users cannot access the page or API
- [ ] Full i18n support with `systemConfig` namespace
- [ ] Audit trail visible (who changed what, when)

---

## Implementation Phases

### Phase 1: Backend Foundation
1. Create seed data for all 20 parameters (upsert pattern)
2. Expand `VALID_CATEGORIES` in route validation
3. Add `GET /categories` endpoint
4. Add `initializeCache()` to server startup
5. Add description metadata parsing (type hints)

### Phase 2: Service Migration
1. Migrate translation service to use `systemConfigurationService`
2. Migrate context/chat service
3. Migrate moderation/NSFW filter
4. Migrate scheduling (curation hour)
5. Verify batch generation / correction services (already partially migrated)

### Phase 3: Frontend
1. Create `systemConfig` translation namespace
2. Create `systemConfigService` API service
3. Create `/admin/system-config` page with category groups
4. Add route to `App.tsx`
5. Add navigation entry to admin dropdown
6. Implement inline editing with type-specific inputs
7. Add search/filter functionality

### Phase 4: Testing
1. Backend unit tests for seed, categories endpoint, and service migration
2. Frontend tests for page rendering and interactions
3. Integration test for end-to-end config change flow

---

## Risks & Mitigations

### Risk 1: Async Service Calls in Sync Contexts
**Impact**: Medium
**Description**: Some services may read config values synchronously during initialization. Switching to async `systemConfigurationService.get()` could break these paths.
**Mitigation**: Call `initializeCache()` at server boot. For startup-critical paths, read from cache (which is a sync `Map.get()`) after cache is initialized. Agent Coder may need to expose a sync `getFromCache(key)` method on the service.

### Risk 2: Empty Database on Fresh Install
**Impact**: Low
**Description**: If seed hasn't run yet, all values would be `null` until seeded.
**Mitigation**: The service already falls back to `.env` then to default values. Seed runs as part of `prisma migrate deploy` / `prisma db seed`.

### Risk 3: Category Label Localization
**Impact**: Low
**Description**: Category names in the API response need to be translatable.
**Mitigation**: Return category keys from API; frontend maps them to translated labels via i18n.

---

## Notes

- The existing `SystemConfigurationService` singleton and REST API are well-implemented and require minimal changes
- The `.env` file continues to serve as the source of truth for infrastructure/secrets (DB credentials, API keys, OAuth, etc.)
- Future enhancement: if horizontal scaling is needed, add a periodic cache refresh (every 5-10 min) to sync across instances. Not needed now with single backend instance.
- The `OFFICIAL_BOT_USER_ID` is intentionally excluded from this feature - it's a system identity, not a tunable parameter.

---

**End of FEATURE-027 Specification**
