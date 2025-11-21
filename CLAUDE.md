# Engineering Playbook

Welcome to CharHub. This guide is shared by every automation agent (GitHub Copilot, Claude, Cursor, etc.) and MUST be read before touching the codebase.

## Encoding Requirements

- Always save source and docs using UTF-8 **without** BOM to prevent garbled characters (e.g., `Ã¢â‚¬â€œ`).
- Use LF newlines. On Windows set `files.eol`: `"\n"` and `git config core.autocrlf false` (per repo is fine).
- Prefer plain ASCII punctuation (regular hyphen `-`, straight quotes) unless a file already needs accented text.
- Configure your editor (`files.encoding`: `"utf8"`, disable "BOM") and confirm before committing.
- If in doubt, run `find . -type f -name '*.md' -print0 | xargs -0 file` (or a tiny Python script) to confirm no file starts with `0xEFBBBF`.
- **Never delete API keys or overwrite `.env` files** with their example counterparts unless the user explicitly instructs you. If a change is required, edit only the specific lines to avoid losing existing secrets or local configuration.
- **Never execute database deletion commands (e.g., `DROP DATABASE`, `DELETE FROM` without a `WHERE` clause, or `prisma migrate reset`) or any command that could lead to data loss, even on development servers, without explicit user instruction and confirmation.

## Before You Start

1. Read the following reference material **before any implementation**:
   - **Project Overview**: `README.md` (root), `docs/PROJECT_OVERVIEW.md`
   - **Backend**: `docs/BACKEND.md` (complete backend reference)
     - Includes: OAuth setup, LLM integration, translations, database operations
     - Detailed docs: `backend/translations/README.md`, `backend/docs/LLM_API.md`, `backend/src/agents/style-guides/README.md`
   - **Frontend**: `docs/FRONTEND.md` (complete frontend reference)
     - Also see: `frontend/README.md` for detailed component architecture
   - **Operations**: `docs/DEV_OPERATIONS.md` (Docker, deployment, infrastructure)
   - **Roadmap**: `docs/ROADMAP.md` (strategic plan and feature priorities)
   - **TODO**: `docs/TODO.md` (ongoing priorities and pending tasks)
   - **For Migration Tasks**:
     - `docs/MIGRATION/README.MD` (current migration status and next steps)
     - `docs/MIGRATION/01_RESUMO_EXECUTIVO.md`
     - `docs/MIGRATION/02_PLANO_DE_MIGRACAO.md`
     - `docs/MIGRATION/03_GUIA_TECNICO_E_REFERENCIA.md`
     - `docs/MIGRATION/04_OLD_PROJECT_INVENTORY.md` (complete file inventory)
2. Confirm that `.env` files are **never** committed. Work from the `*.example` templates.
3. Make sure you understand the current state by scanning the latest commit history when in doubt.

## Documentation Structure

```
docs/                           # Project-level documentation
├── PROJECT_OVERVIEW.md         # Architecture and system design
├── BACKEND.md                  # Complete backend reference ⭐
├── FRONTEND.md                 # Complete frontend reference ⭐
├── DEV_OPERATIONS.md           # Infrastructure and deployment
├── ROADMAP.md                  # Strategic plan
├── TODO.md                     # Current priorities
├── deploy/                     # Deployment definitions
├── features/                   # New implementations
└── MIGRATION/                  # Migration-specific docs

backend/                        # Backend-specific documentation
├── README.md                   # Quick start guide
├── translations/README.md      # Translation system ⭐
├── docs/LLM_API.md            # LLM integration reference ⭐
└── src/agents/style-guides/README.md  # AI response customization

frontend/                       # Frontend-specific documentation
└── README.md                   # Architecture and component patterns ⭐
```

**⭐ Key References:** These documents contain comprehensive, authoritative information for their respective areas.

## Migration-Specific Guidelines

When working on migration tasks:

1. **Read First**: Check `docs/MIGRATION_START.md` for current phase and assigned tasks
2. **Reference Old Code**: Use `docs/OLD_PROJECT_INVENTORY.md` to locate files in `E:\Projects\charhub_dev_old_version\`
3. **Document Decisions**: Update `docs/MIGRATION_DECISIONS.md` for any architectural choices
4. **Mark Progress**: Update `docs/MIGRATION_CHECKLIST.md` when completing tasks
5. **Clean Up**: Remove completed items from migration docs as you finish them
6. **Conventional Commits**: Use format `feat(module): description` for migration work

## Project Summary

- **Purpose**: OAuth-first platform that supplies localized content and proxies multiple LLM providers (Gemini, OpenAI, XAI Grok).
- **Backend**: Node.js 20 + Express + Passport + Prisma, exposed under `/api/v1`, packaged with Docker.
- **Frontend**: React 18 + TypeScript + Vite + Tailwind, consumes the API via Axios, handles session, theme, and localization.
- **Infra**: Docker Compose orchestrates backend, frontend, PostgreSQL, Nginx, and Cloudflare Tunnel. Translations are generated files mounted as a volume. Cloudflare R2 credentials are present but integration is pending.

## Folder Map (Essentials Only)

```
backend/    TypeScript API (OAuth, LLM proxy, translations)
frontend/   React SPA and UI primitives
nginx/      Reverse proxy config
cloudflared/ Tunnel configuration per environment
docs/       Authoritative documentation bundle
```

For a deeper tree, see `docs/PROJECT_OVERVIEW.md`.

## Core Technologies

- Node.js 20, Express, Passport, Prisma, Pino
- React 18, TypeScript, Vite, Tailwind CSS, React Router, i18next
- PostgreSQL 16, Docker Compose, Nginx, Cloudflare Tunnel
- LLM integrations: Gemini, OpenAI, XAI Grok

## Development Workflow

1. **Environment**: Copy `.env.example` to `.env` (root) and fill values locally. Keep secrets out of git. Note: The `.env` file is now unified at the project root (not in backend/ or frontend/ subdirectories).
2. **Translations**: Run `npm run build:translations` (from backend directory) after changing locale source files. The script automatically loads environment variables from the root `.env` file (including `GEMINI_API_KEY` for AI-powered translations).
3. **Docker**: `docker compose up --build` to run the full stack; services mount translations and tunnel configs automatically.
4. **Local Dev**: Back-end `npm run dev`; front-end `npm run dev`. Keep Vite proxy aligned with backend base URL.
5. **Database Operations**: See detailed section "Database Operations (Prisma)" below for CRITICAL migration management rules.
6. **Testing**: Formal test suites are pending; when adding them, follow the guidance in `docs/BACKEND.md` and `docs/FRONTEND.md`.
7. **Commits/PRs**: Use Conventional Commits. Document manual tests. Rebase before opening PRs. Reference open TODO items.

## Coding Standards

- TypeScript strict mode everywhere. Prefer explicit types and early returns.
- 2-space indentation. camelCase for variables/functions, PascalCase for components/types.
- Comments in concise en-US; document only non-obvious logic.
- Tailwind utilities ordered: layout > spacing > color/typography.
- Never import one OAuth provider's service into another; keep shared types in `backend/src/types`.
- When cloning React elements, preserve refs correctly (see `SmartDropdown` pattern).

## Naming Conventions
Follow consistent conventions for readability (based on JavaScript/TypeScript standards). Use ESLint for enforcement.

| Type | Convention | Example |
|------|------------|---------|
| **Local/Global Variables** | camelCase | `let userName = 'João';` |
| **Functions** | camelCase | `function calculateTotal() { ... }` |
| **Objects and Instances** | camelCase | `const userData = { name: 'Ana' };` |
| **Classes and Constructors** | PascalCase | `class UserProfile { ... }` |
| **React Components** | PascalCase | `const MyComponent = () => { ... };` |
| **Constants** | UPPER_SNAKE_CASE (or camelCase if simple) | `const MAX_USERS = 100;` |
| **Modules/Imports** | camelCase (file name) | `import myUtil from './myUtil.js';` |

- **Consistency**: Choose one style per project and apply it throughout the code.
- **Exceptions**: Follow external API styles; avoid in your own code.


### Frontend Page Structure Pattern (Colocation)

All pages must follow the **colocation pattern** to encapsulate page-specific dependencies:

```
frontend/src/pages/
  ├── (auth)/                    # Group: authentication flow
  │   ├── login/
  │   │   └── index.tsx          # Login page
  │   ├── signup/
  │   │   └── index.tsx          # Signup page
  │   ├── callback/
  │   │   └── index.tsx          # OAuth callback handler
  │   └── shared/                # Shared resources for auth group
  │       ├── components/
  │       │   ├── GoogleIcon.tsx
  │       │   ├── FacebookIcon.tsx
  │       │   ├── OAuthButton.tsx
  │       │   └── index.ts       # Barrel export
  │       └── hooks/
  │           ├── useAuthRedirect.tsx
  │           └── index.ts       # Barrel export
  │
  ├── home/
  │   └── index.tsx
  │
  ├── dashboard/
  │   └── index.tsx
  │
  └── not-found/
      └── index.tsx
```

**Key Rules:**
1. **Each page gets its own folder** with an `index.tsx` entry point
2. **Group related pages** using parentheses `(group-name)/` when they share logic or components
3. **Shared resources** go in `(group)/shared/{components,hooks,services,utils}`
4. **Page-specific dependencies** (components, hooks, utils) live inside the page folder
5. **Generic reusables** stay in `src/components` and `src/hooks` (not page-specific)
6. **Use barrel exports** (`index.ts`) for cleaner imports from shared folders
7. **Delete entire folders** when removing features (colocation ensures cleanup)

**Example: Adding a forgot-password page**
```
pages/
  └── (auth)/
      ├── forgot-password/
      │   ├── index.tsx
      │   └── components/
      │       └── ResetForm.tsx
      └── shared/
          └── components/
              └── OAuthButton.tsx  # Still shared with login/signup
```

**Import Pattern:**
```typescript
// ✅ Good: Clean barrel imports
import { OAuthButton, GoogleIcon } from '../shared/components';
import { useAuthRedirect } from '../shared/hooks';

// ❌ Bad: Direct file imports when barrel exists
import { OAuthButton } from '../shared/components/OAuthButton';
```

## Database Operations (Prisma)

**⚠️ CRITICAL: Manual Migration Management ⚠️**

This project uses **CamelCase** and **PascalCase** naming conventions for all database fields and models. Prisma's automatic migration tools can generate destructive snake_case migrations that break the entire codebase.

### ❌ FORBIDDEN COMMANDS - DO NOT USE:

```bash
# ❌ NEVER USE - Generates automatic migrations with wrong naming conventions
docker compose exec backend npx prisma migrate dev

# ❌ NEVER USE - Can destructively reset database
docker compose exec backend npx prisma migrate reset

# ❌ NEVER USE - Can generate schema changes automatically
docker compose exec backend npx prisma db push
```

**Why these are forbidden:**
- `prisma migrate dev` auto-generates SQL migrations based on schema differences, often using **snake_case** instead of our **CamelCase** conventions
- These commands can rename ALL existing columns (e.g., `userId` → `user_id`), breaking every query in the codebase
- Prisma may drop and recreate tables, causing data loss
- No control over the exact SQL being executed

### ✅ REQUIRED WORKFLOW - Manual Migrations Only:

**Step 1: Edit Schema**
```bash
# Edit the Prisma schema file directly
# File: backend/prisma/schema.prisma
# Use CamelCase for fields, PascalCase for models
```

**Step 2: Create Migration Folder**
```bash
# Create migration folder with timestamp
mkdir -p backend/prisma/migrations/$(date +%Y%m%d%H%M%S)_your_description
```

**Step 3: Write SQL Manually**
```sql
-- File: backend/prisma/migrations/YYYYMMDDHHMMSS_your_description/migration.sql
-- Example: Adding a new field with CORRECT CamelCase naming

ALTER TABLE "User" ADD COLUMN "phoneNumber" TEXT;
-- ✅ Correct: CamelCase field name

-- ❌ WRONG: snake_case would break everything
-- ALTER TABLE "User" ADD COLUMN "phone_number" TEXT;
```

**Step 4: Apply Migration**
```bash
# Apply your manual migration
docker compose exec backend npx prisma migrate deploy

# Verify the changes
docker compose exec backend npx prisma studio
```

**Step 5: Generate Prisma Client**
```bash
# Regenerate Prisma Client to match new schema
docker compose exec backend npx prisma generate

# Restart backend to load new types
docker compose restart backend
```

### ✅ SAFE COMMANDS - These are OK to use:

```bash
# ✅ Generate Prisma Client after schema changes (read-only)
docker compose exec backend npx prisma generate

# ✅ Apply existing migrations (uses your manual SQL)
docker compose exec backend npx prisma migrate deploy

# ✅ Check migration status (read-only)
docker compose exec backend npx prisma migrate status

# ✅ Open database GUI (read-only)
docker compose exec backend npx prisma studio

# ✅ Mark a failed migration as resolved
docker compose exec backend npx prisma migrate resolve --rolled-back MIGRATION_NAME
```

### 📋 Naming Convention Examples:

**✅ CORRECT - CamelCase/PascalCase:**
```prisma
model User {
  id              String   @id @default(uuid())
  displayName     String?
  createdAt       DateTime @default(now())
  favoriteCharacters FavoriteCharacter[]
}

model CreditTransaction {
  userId          String
  amountCredits   Float
  balanceAfter    Float?
}
```

**❌ WRONG - snake_case (breaks everything):**
```prisma
model User {
  id              String   @id @default(uuid())
  display_name    String?  // ❌ Wrong!
  created_at      DateTime @default(now())  // ❌ Wrong!
  favorite_characters FavoriteCharacter[]  // ❌ Wrong!
}
```

### 🛠️ Data Migration Scripts:

For complex data transformations, create TypeScript scripts instead of raw SQL:

```bash
# Create script
# File: backend/src/scripts/migrate-your-feature.ts

import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function migrate() {
  // Your safe data transformation logic here
  console.log('Migration completed successfully');
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Add to `backend/package.json`:
```json
{
  "scripts": {
    "migrate:your-feature": "tsx src/scripts/migrate-your-feature.ts"
  }
}
```

### 🆘 If Something Goes Wrong:

If an agent accidentally ran a destructive command:

1. **Stop immediately** - Don't apply any more migrations
2. **Check git status** - See what files changed
3. **Review migration files** - Check `backend/prisma/migrations/` for snake_case
4. **Restore from git** - `git checkout backend/prisma/schema.prisma`
5. **Mark migration as rolled back**: `docker compose exec backend npx prisma migrate resolve --rolled-back BAD_MIGRATION_NAME`
6. **Create correct migration manually** following the steps above

## Operational Notes

- Tunnels: each environment needs its own credential JSON in `cloudflared/config/<env>/`. Update `ENV_SUFFIX` accordingly.
- R2: credentials exist but code has not been connected yet; avoid assuming storage is live.
- Premium endpoints currently return placeholder data; future work is tracked in `docs/TODO.md`.

## Expectations for New Engineers

- Study the docs listed above to understand current capabilities and limitations.
- Align any new feature with the priorities in `docs/TODO.md` and the strategic plan in `docs/ROADMAP.md`.
- Ask for clarification if requirements conflict; the roadmap document takes precedence for long-term direction.
- Keep documentation up to date when behaviour changes; the docs folder is the single source of truth.

Welcome aboard; keep the playbook handy and update it whenever the workflow evolves.