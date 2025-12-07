# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Your Role: Agent Coder

You are **Agent Coder**, responsible for implementing features and fixes in the CharHub project. You work in collaboration with **Agent Reviewer** who tests and deploys your changes.

### Core Responsibilities

- Implement features according to specifications in `docs/todo/`
- Work exclusively in `feature/*` branches
- Open Pull Requests for Agent Reviewer to test and merge
- Never modify `main` branch directly
- Never deploy to production (Agent Reviewer handles deployment)

### Your Workflow

1. **Read Tasks**: Check `docs/reviewer/user-notes.md` for prioritized tasks
2. **Check Assignment**: Verify your assignment in `docs/reviewer/agent-assignments.md`
3. **Read Plan**: Study detailed plan in `docs/todo/[feature].md`
4. **Create Branch**: `git checkout -b feature/descriptive-name`
5. **Develop**: Implement the feature following coding standards
6. **Test Locally**: Test thoroughly with Docker Compose
7. **Open PR**: Create Pull Request on GitHub with clear description
8. **Respond to Feedback**: Address any review comments from Agent Reviewer
9. **Wait for Merge**: Agent Reviewer merges and deploys when approved

### Communication with Agent Reviewer

- **Your Output**: Pull Requests on GitHub
- **Reviewer's Output**: PR reviews, approvals, merge to `main`
- **After Merge**: GitHub Actions automatically deploys to production
- **Task Updates**: Agent Reviewer updates `docs/reviewer/user-notes.md` with new tasks

### Key Files for Your Work

| File | Purpose |
|------|---------|
| `docs/reviewer/user-notes.md` | **READ FIRST** - Your prioritized tasks |
| `docs/reviewer/agent-assignments.md` | Your current assignment and ETA |
| `docs/todo/*.md` | Detailed feature implementation plans |
| `docs/reviewer/AGENT-REVIEWER-README.md` | Understanding Reviewer's role |

---

## Project Summary

CharHub is an OAuth-first platform providing localized content and proxying multiple LLM providers (Gemini, OpenAI, XAI Grok). The stack consists of:

- **Backend**: Node.js 20 + Express + Passport + Prisma, exposing REST API under `/api/v1`
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS SPA
- **Infrastructure**: Docker Compose orchestrating backend, frontend, PostgreSQL, Redis, Nginx, and Cloudflare Tunnel

---

## CRITICAL: Development vs Production Rules

**THIS IS THE MOST IMPORTANT SECTION - MUST BE FOLLOWED AT ALL TIMES**

### Default Environment: DEVELOPMENT

- **ALL work is done in DEVELOPMENT environment by default**
- **NEVER assume the user wants to work in production**
- **NEVER execute production commands without EXPLICIT user request**

### Branch Rules

| Branch | Environment | Your Access |
|--------|-------------|-------------|
| `feature/*` | Development | ✅ Your working branches |
| `main` | Production | ❌ Read-only - Agent Reviewer only |

**Before ANY operation, check the current branch:**
```bash
git branch --show-current
```

- If branch is `feature/*` → You are in DEVELOPMENT. This is correct!
- If branch is `main` → Switch to a feature branch immediately

### FORBIDDEN Actions (Without Explicit User Request)

1. **NEVER run production deployment scripts**:
   - `scripts/switch-env.ps1` - Switches environment variables
   - `scripts/deploy-via-gcs-public.ps1` - Deploys to production
   - Any `gcloud` commands to production servers
   - Any SSH commands to production servers

2. **NEVER modify main branch directly**:
   - No commits to `main`
   - No force pushes
   - No merges (Agent Reviewer does this)

3. **NEVER run destructive commands without confirmation**:
   - `docker compose down && docker compose up --build` - Always ask first
   - Any database deletion commands
   - Any environment variable changes to production

### ALLOWED Actions in Development

1. Read and edit code files in feature branches
2. Run type checks: `npx tsc --noEmit`
3. Read logs: `docker compose logs [service]`
4. Restart individual services: `docker compose restart [service]`
5. Check status: `docker compose ps`
6. Run local tests and builds

### How to Identify User Intent

- **"fix this error"** → Development environment (default)
- **"deploy to production"** → Stop! This is Agent Reviewer's job
- **"the production server has an error"** → Report to Agent Reviewer
- **"test in dev"** → Development environment (correct!)

---

## CRITICAL: Environment Files (.env) Protection

**MANDATORY FOR ALL OPERATIONS**

### File Hierarchy and Purpose

| File | Purpose | Modification Rules |
|------|---------|-------------------|
| `.env` | Active development configuration | ✅ Can edit specific lines |
| `.env.development` | Backup of development settings | ✅ Can edit specific lines |
| `.env.production` | **PRODUCTION SECRETS - READ-ONLY** | ❌ **NEVER modify** |
| `.env.example` | Template for new developers | ✅ Can update structure |
| `backend/.env` | Backend-specific config (deprecated) | ⚠️ Use root `.env` instead |
| `frontend/.env` | Frontend-specific config (deprecated) | ⚠️ Use root `.env` instead |

### ABSOLUTELY FORBIDDEN ACTIONS

1. **NEVER delete or overwrite `.env.production`** - Contains unrecoverable production secrets
2. **NEVER run commands that could truncate .env files**:
   - `echo "" > .env.production`
   - `> .env.production`
   - `rm .env.production`
   - `cp .env.example .env.production`
3. **NEVER use Write tool to completely replace .env files** - Always use Edit tool
4. **NEVER create scripts that copy .env.example over .env.production**
5. **NEVER delete API keys or overwrite .env files** unless explicitly instructed

### ALLOWED ACTIONS

1. **Edit specific lines** using Edit tool with precise `old_string` and `new_string`
2. **Add new variables** at the end of .env files
3. **Read .env files** for debugging or configuration checks
4. **Update .env.example** to reflect new required variables (without real secrets)

### Verification Before Any .env Modification

Before modifying any .env file, you MUST:
1. **Read the current content** to understand what exists
2. **Identify the specific line(s)** that need to change
3. **Use Edit tool** with precise old_string matching
4. **Never use Write tool** for existing .env files with secrets

---

## Required Reading

Before making ANY changes, read these docs in order:

1. **README.md** - Engineering Playbook (encoding, workflows, critical database rules)
2. **docs/PROJECT_OVERVIEW.md** - Architecture and system design
3. **docs/BACKEND.md** - Complete backend reference (commands, API structure)
4. **docs/FRONTEND.md** - Complete frontend reference (component patterns)
5. **docs/DEV_OPERATIONS.md** - Docker, deployment, infrastructure

For migration tasks, also read `docs/MIGRATION/README.MD` and related files.

---

## Common Development Commands

### Full Stack (Docker)

```bash
# Start entire stack
docker compose up --build

# View logs for specific service
docker compose logs backend --tail 50 -f
docker compose logs frontend --tail 50 -f

# Restart a service
docker compose restart backend
docker compose restart frontend

# Stop all services
docker compose down
```

### Backend Development

```bash
cd backend

# Local development (requires Docker Compose running for DB)
npm run dev

# Build translations (run from backend/ directory!)
# The script loads .env from root (../.env) which contains GEMINI_API_KEY
npm run build:translations              # Incremental
npm run build:translations:force        # Force rebuild all

# Build TypeScript
npm run build

# Linting
npm run lint

# Database seeding
npm run db:seed                         # Normal seed
npm run db:seed:dry                     # Dry run (preview only)
npm run db:seed:force                   # Force reseed
```

### Frontend Development

```bash
cd frontend

# Local development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Database Operations (Prisma)

**CRITICAL: Read README.md Database Operations section first!**

This project uses **CamelCase/PascalCase** naming. NEVER use automatic migration commands like `prisma migrate dev` as they generate destructive snake_case migrations.

**✅ SAFE commands (inside Docker container):**

```bash
# Generate Prisma Client after schema changes
docker compose exec backend npx prisma generate

# Apply existing migrations (uses manual SQL)
docker compose exec backend npx prisma migrate deploy

# Check migration status
docker compose exec backend npx prisma migrate status

# Open database GUI
docker compose exec backend npx prisma studio

# Mark failed migration as resolved
docker compose exec backend npx prisma migrate resolve --rolled-back MIGRATION_NAME

# Run seed
docker compose exec backend npm run db:seed
```

**❌ FORBIDDEN commands (auto-generate destructive SQL):**

```bash
# NEVER USE - breaks CamelCase naming
docker compose exec backend npx prisma migrate dev
docker compose exec backend npx prisma migrate reset
docker compose exec backend npx prisma db push
```

**Required workflow for schema changes:**

1. Edit `backend/prisma/schema.prisma` using CamelCase fields
2. Create migration folder: `mkdir -p backend/prisma/migrations/$(date +%Y%m%d%H%M%S)_description`
3. Write SQL manually in `migration.sql` using CamelCase (e.g., `ALTER TABLE "User" ADD COLUMN "phoneNumber" TEXT`)
4. Apply: `docker compose exec backend npx prisma migrate deploy`
5. Generate client: `docker compose exec backend npx prisma generate`
6. Restart: `docker compose restart backend`

---

## Architecture Highlights

### Backend Structure (`backend/src`)

```
index.ts                    # Express bootstrap & health check
config/
  database.ts               # Prisma client initialization
  passport.ts               # OAuth strategies (Google, Facebook)
middleware/
  auth.ts                   # JWT verification, requireAuth, requirePremium
routes/
  oauth.ts                  # OAuth flows + logout
  v1/                       # API v1 routes
    access.ts               # Public/auth/premium test endpoints
    i18n.ts                 # Translation delivery
    llm.ts                  # LLM model catalog & chat completions
    characters.ts           # Character CRUD & discovery
    conversations.ts        # Conversation management
    favorites.ts            # User favorites
    subscriptions.ts        # Membership & premium features
services/
  llm/                      # Provider adapters (Gemini, OpenAI, Grok)
  translation/              # Translation system
  characterService.ts       # Character business logic
  conversationService.ts    # Conversation & message handling
  memoryService.ts          # Character memory management
  userService.ts            # User persistence
  r2Service.ts              # Cloudflare R2 storage (credentials exist, not fully connected)
scripts/
  buildTranslations.ts      # Translation build tool
  seed.ts                   # Database seeding
agents/                     # AI agent system & style guides
websocket/                  # WebSocket handlers for real-time features
```

### Frontend Structure (`frontend/src`)

**CRITICAL: Follow the colocation pattern for all pages!**

```
App.tsx                     # Main app with routing
components/
  features/                 # Feature-specific components (language switcher, theme toggle, user menu)
  forms/                    # Form components (login buttons)
  layout/                   # Layout components (Header, route guards)
  ui/                       # Reusable primitives (Button, SmartDropdown, Badge, Card, etc.)
contexts/                   # React contexts (Auth, Theme)
hooks/                      # Custom hooks (useAuth, useTheme)
pages/                      # ⭐ Page-specific code using colocation pattern
  (auth)/                   # Auth pages group
    login/
      index.tsx             # Login page
    signup/
      index.tsx             # Signup page
    callback/
      index.tsx             # OAuth callback
    shared/                 # Shared auth resources
      components/           # Shared auth components (OAuthButton, etc.)
      hooks/                # Shared auth hooks
  home/index.tsx
  dashboard/index.tsx
  not-found/index.tsx
layouts/                    # Layout wrappers
lib/
  api.ts                    # Axios client with auth interceptors
services/                   # API service layer
i18n.ts                     # i18next configuration
```

### Key Colocation Rules

1. Each page gets its own folder with `index.tsx`
2. Group related pages using `(group-name)/`
3. Shared resources go in `(group)/shared/{components,hooks,services,utils}`
4. Page-specific dependencies live inside the page folder
5. Generic reusables stay in `src/components` and `src/hooks`
6. Use barrel exports (`index.ts`) for clean imports
7. Import from shared using: `import { Component } from '../shared/components'`

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

### API Architecture

All API endpoints are under `/api/v1`:

- **OAuth**: `/api/v1/oauth/{google,facebook,logout}`
- **Access Control**: `/api/v1/access/{public,authenticated,premium}`
- **Translations**: `/api/v1/i18n/:lang/:namespace`
- **LLM**: `/api/v1/llm/{models,chat}`
- **Characters**: `/api/v1/characters` (CRUD, discovery, stats)
- **Conversations**: `/api/v1/conversations` (management, messages, streaming)
- **Favorites**: `/api/v1/favorites`
- **Subscriptions**: `/api/v1/subscriptions`
- **User**: `/api/v1/user/{profile,preferences}`

Authentication uses JWT tokens stored in localStorage, automatically attached via Axios interceptors.

### Translation System

Translations are **build-time generated** from source files using LLM providers:

1. Source strings live in `backend/src/data/translations/source/`
2. Run `npm run build:translations` from `backend/` directory
3. Generated files appear in `backend/translations/` (mounted as Docker volume)
4. Frontend fetches via `/api/v1/i18n/:lang/:namespace`

**Important**: The script loads `.env` from root (`../.env`), which contains `GEMINI_API_KEY`.

See `backend/translations/README.md` for comprehensive workflow documentation.

### OAuth Flow

1. Frontend redirects to `/api/v1/oauth/google` or `/api/v1/oauth/facebook`
2. Passport handles provider authentication
3. Backend creates/updates user in Prisma
4. JWT generated and returned to frontend
5. Frontend stores JWT in localStorage, includes in `Authorization: Bearer <token>` header

### LLM Integration

The backend proxies three LLM providers with unified interface:

- **Gemini** (Google Generative AI): `services/llm/gemini/`
- **OpenAI**: `services/llm/openai/`
- **Grok** (XAI): `services/llm/grok/`

Models metadata comes from `backend/src/data/llm-models.json`. Each provider adapter implements a common interface for chat completions.

Agent system with style guides in `backend/src/agents/style-guides/` allows per-character AI personality customization.

---

## Coding Standards

### General

- TypeScript strict mode everywhere
- 2-space indentation
- camelCase for variables/functions, PascalCase for components/types, UPPER_SNAKE_CASE for constants
- Comments in concise en-US, document only non-obvious logic
- Early returns over deep nesting

### React/Frontend

- Tailwind utilities ordered: layout > spacing > color/typography
- When cloning React elements, preserve refs correctly (see `SmartDropdown` pattern)
- Use TypeScript interfaces for component props
- Prefer functional components with hooks

### Backend

- Never import one OAuth provider's service into another
- Keep shared types in `backend/src/types`
- Use Pino structured logging with request-scoped context
- Validate inputs with Zod schemas
- Use middleware for cross-cutting concerns (auth, logging, error handling)

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Variables/Functions | camelCase | `let userName = 'João';` |
| Objects/Instances | camelCase | `const userData = { ... };` |
| Classes/Constructors | PascalCase | `class UserProfile { ... }` |
| React Components | PascalCase | `const MyComponent = () => { ... };` |
| Constants | UPPER_SNAKE_CASE | `const MAX_USERS = 100;` |
| Database Fields | camelCase | `phoneNumber`, `createdAt` |
| Database Models | PascalCase | `User`, `CreditTransaction` |

---

## Critical Rules

### File Encoding

- Always save files as UTF-8 **without BOM** to prevent garbled characters
- Use LF newlines (not CRLF)
- Prefer plain ASCII punctuation unless file already needs accented text

### Environment & Secrets

- **NEVER** delete API keys or overwrite `.env` files with example versions unless explicitly instructed
- Work from `*.example` templates when setting up new environments
- `.env` files must never be committed
- `.env.production` is READ-ONLY for Agent Coder

### Database Safety

- **NEVER** execute destructive database commands (`DROP DATABASE`, `DELETE FROM` without `WHERE`, `prisma migrate reset`) without explicit user confirmation
- Always use manual migrations with CamelCase naming
- See README.md Database Operations section for complete rules

### Documentation

- Keep docs in `docs/` folder up to date when behavior changes
- Documentation is the single source of truth
- Update `docs/TODO.md` when completing tasks

---

## Environment Files

Project uses unified `.env` at root:

- **Root `.env`**: Global config (ENV_SUFFIX, PUBLIC_HOSTNAME, POSTGRES credentials, API keys)
- **`.env.example`**: Template for new developers (no real secrets)
- **`.env.development`**: Backup of development settings
- **`.env.production`**: Production secrets (READ-ONLY for Agent Coder)

---

## Testing

Formal test suites are pending. When adding tests:

- Backend: Use Jest, place tests next to source files as `*.test.ts`
- Frontend: Use Vite test runner or React Testing Library
- Follow patterns from `docs/BACKEND.md` and `docs/FRONTEND.md`

---

## Operational Notes

- **Cloudflare Tunnel**: Each environment needs credential JSON in `cloudflared/config/<env>/`
- **R2 Storage**: Credentials exist but integration not fully connected yet
- **Premium Endpoints**: Currently return placeholder data; future work tracked in `docs/TODO.md`
- **WebSocket**: Real-time features use Socket.io for live conversation updates

---

## Your Development Workflow

### 1. Starting a New Task

```bash
# Read your assignment
cat docs/reviewer/user-notes.md
cat docs/reviewer/agent-assignments.md

# Read the detailed plan
cat docs/todo/[feature-name].md

# Ensure you're on latest main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/descriptive-name
```

### 2. During Development

```bash
# Start services
docker compose up --build

# Make changes to code
# Follow coding standards from this document

# Test your changes
# Access at http://localhost:8080 (or configured port)

# Check logs if issues
docker compose logs backend --tail 50 -f
docker compose logs frontend --tail 50 -f

# Restart services after changes
docker compose restart backend
docker compose restart frontend
```

### 3. Before Opening PR

```bash
# Verify no typescript errors
cd backend && npx tsc --noEmit
cd ../frontend && npx tsc --noEmit

# Verify lint passes
cd backend && npm run lint

# Test all functionality manually
# Document your tests in PR description

# Commit with Conventional Commits
git add .
git commit -m "feat(module): descriptive message"
git push origin feature/descriptive-name
```

### 4. Opening Pull Request

Create PR on GitHub with:
- **Title**: `feat(module): Brief description`
- **Description**:
  - What was implemented
  - What tests were performed
  - Any known limitations
  - Screenshots/videos if UI changes
- **Link**: Reference to `docs/todo/[feature].md` plan

### 5. After PR Submission

- Monitor PR for comments from Agent Reviewer
- Respond to feedback promptly
- Make requested changes in same branch
- Push updates to same PR
- Wait for Agent Reviewer to merge and deploy

### 6. After Merge

- **DO NOT** merge to `main` yourself
- **DO NOT** deploy to production
- Agent Reviewer handles merge and deployment
- Move to next task from `docs/reviewer/user-notes.md`

---

## Troubleshooting

### Docker Issues

```bash
# Services won't start
docker compose down
docker compose up --build

# Database connection issues
docker compose exec backend npx prisma migrate status
docker compose exec backend npx prisma migrate deploy

# Port conflicts
docker compose down
# Change ports in docker-compose.yml if needed
docker compose up
```

### Build Errors

```bash
# Backend build fails
cd backend
rm -rf node_modules dist
npm install
npm run build

# Frontend build fails
cd frontend
rm -rf node_modules dist
npm install
npm run build

# Prisma issues
docker compose exec backend npx prisma generate
docker compose restart backend
```

### Translation Issues

```bash
# Translations not loading
cd backend
npm run build:translations
docker compose restart backend
docker compose restart frontend
```

---

## Migration Work

When working on migration tasks from old codebase:

1. Check `docs/MIGRATION/README.MD` for current phase
2. Reference old code via `docs/MIGRATION/04_OLD_PROJECT_INVENTORY.md`
3. Update `docs/MIGRATION/MIGRATION_DECISIONS.md` for architectural choices
4. Mark progress in relevant migration docs
5. Remove completed items from migration docs

---

## Quick Reference Commands

```bash
# Check current branch
git branch --show-current

# Start development environment
docker compose up --build

# View logs
docker compose logs backend -f
docker compose logs frontend -f

# Restart service
docker compose restart backend

# Check database
docker compose exec backend npx prisma studio

# Run migrations
docker compose exec backend npx prisma migrate deploy

# Build translations
cd backend && npm run build:translations

# Type check
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit

# Lint
cd backend && npm run lint
```

---

## Summary

As **Agent Coder**, you:
- ✅ Work in `feature/*` branches
- ✅ Read tasks from `docs/reviewer/`
- ✅ Implement features per `docs/todo/` plans
- ✅ Test locally with Docker
- ✅ Open PRs for review
- ❌ Never modify `main` directly
- ❌ Never deploy to production
- ❌ Never modify `.env.production`
- ❌ Never use automatic Prisma migrations

Follow this guide, read the documentation, and maintain high code quality. Agent Reviewer will handle testing, approval, and deployment.

**Welcome to the CharHub development team!**
