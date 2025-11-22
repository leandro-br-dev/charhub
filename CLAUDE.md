# Engineering Playbook

Welcome to CharHub. This guide is shared by every automation agent (GitHub Copilot, Claude, Cursor, etc.) and MUST be read before touching the codebase.

## ⚠️ CRITICAL: Development vs Production Environment Rules

**THIS SECTION IS THE MOST IMPORTANT AND MUST BE FOLLOWED AT ALL TIMES**

### Default Environment: DEVELOPMENT

- **ALL work is done in DEVELOPMENT environment by default**
- **NEVER assume the user wants to work in production**
- **NEVER execute production commands without EXPLICIT user request**

### Branch Rules

| Branch | Environment | Deploy Allowed |
|--------|-------------|----------------|
| `main` | Production | ✅ Only with explicit request |
| Any other branch | Development | ❌ No production deploy |

**Before ANY operation, check the current branch:**
```bash
git branch --show-current
```

- If branch is NOT `main` → You are in DEVELOPMENT. Do NOT touch production.
- If branch IS `main` → Still require explicit user confirmation before production operations.

### ❌ FORBIDDEN Actions (Without Explicit User Request):

1. **NEVER run `scripts/switch-env.ps1`** - This switches environment variables
2. **NEVER run `scripts/deploy-via-gcs-public.ps1`** - This deploys to production
3. **NEVER run any production-related commands** such as:
   - `gcloud compute ssh charhub-vm`
   - Any SSH commands to production servers
   - Any database commands on production
4. **NEVER run `docker compose down && docker compose up --build`** without user request
5. **NEVER change environment variables** from development to production

### ✅ ALLOWED Actions in Development:

1. Read and edit code files
2. Run type checks: `npx tsc --noEmit`
3. Read logs: `docker compose logs [service]`
4. Restart individual services: `docker compose restart [service]`
5. Check status: `docker compose ps`

### How to Identify User Intent:

- **"fix this error"** → Development environment (default)
- **"deploy to production"** → Requires explicit confirmation before proceeding
- **"the production server has an error"** → User explicitly mentioned production
- **"test in dev"** → Development environment

### Error Reports:

When user reports an error:
1. **Assume it's in development** unless they explicitly say "production"
2. **Check the URL** - `dev.charhub.app` = development, `charhub.app` = production
3. **Ask for clarification** if uncertain

## Encoding Requirements

- Always save source and docs using UTF-8 **without** BOM to prevent garbled characters (e.g., `Ã¢â‚¬â€œ`).
- Use LF newlines. On Windows set `files.eol`: `"\n"` and `git config core.autocrlf false` (per repo is fine).
- Prefer plain ASCII punctuation (regular hyphen `-`, straight quotes) unless a file already needs accented text.
- Configure your editor (`files.encoding`: `"utf8"`, disable "BOM") and confirm before committing.
- If in doubt, run `find . -type f -name '*.md' -print0 | xargs -0 file` (or a tiny Python script) to confirm no file starts with `0xEFBBBF`.
- **Never execute database deletion commands (e.g., `DROP DATABASE`, `DELETE FROM` without a `WHERE` clause, or `prisma migrate reset`) or any command that could lead to data loss, even on development servers, without explicit user instruction and confirmation.

## ⚠️ CRITICAL: Environment Files (.env) Protection Rules

**THIS SECTION IS MANDATORY FOR ALL AGENTS AND SCRIPTS**

### File Hierarchy and Purpose

| File | Purpose | Modification Rules |
|------|---------|-------------------|
| `.env` | Active development configuration | ✅ Can edit specific lines |
| `.env.development` | Backup of development settings | ✅ Can edit specific lines |
| `.env.production` | **PRODUCTION SECRETS - READ-ONLY** | ❌ **NEVER modify via scripts** |
| `.env.example` | Template for new developers | ✅ Can update structure |
| `secrets/production-secrets.txt` | Backup of all secrets | ❌ **NEVER modify** |

### ❌ ABSOLUTELY FORBIDDEN ACTIONS:

1. **NEVER delete or overwrite `.env.production`** - This file contains production secrets that cannot be recovered if lost
2. **NEVER run commands that could truncate or clear .env files** such as:
   - `echo "" > .env.production`
   - `> .env.production`
   - `rm .env.production`
   - `cp .env.example .env.production`
3. **NEVER use Write tool to completely replace .env files** - Always use Edit tool for specific line changes
4. **NEVER create scripts that copy .env.example over .env.production**

### ✅ ALLOWED ACTIONS:

1. **Edit specific lines** using the Edit tool with precise `old_string` and `new_string`
2. **Add new variables** at the end of .env files
3. **Read .env files** for debugging or configuration checks
4. **Update .env.example** to reflect new required variables (without real secrets)

### Environment Switching (Development ↔ Production)

The `scripts/switch-env.ps1` script handles environment switching by:
- Copying `.env.development` → `.env` (for development mode)
- Copying `.env.production` → `.env` (for production mode)

**IMPORTANT**: This script should NEVER modify `.env.production` - it only READS from it.

### Recovery Procedure

If `.env.production` is accidentally deleted or corrupted:
1. Check `secrets/production-secrets.txt` for credential backup
2. Use `.env` as template for structure
3. Replace values with production credentials from secrets file
4. Verify all sections are present before saving

### Verification Before Any .env Modification

Before modifying any .env file, agents MUST:
1. **Read the current content** to understand what exists
2. **Identify the specific line(s)** that need to change
3. **Use Edit tool** with precise old_string matching
4. **Never use Write tool** for existing .env files with secrets

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