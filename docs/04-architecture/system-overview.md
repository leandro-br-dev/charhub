# Project Overview

CharHub is a full-stack platform that centralizes OAuth authentication (Google/Facebook), multi-model LLM access, and localized content delivery for a future modular game universe. This document summarises the architecture, core subsystems, and the repository layout you can rely on when extending the project.

## Core Responsibilities

- Handle OAuth login flows via Google and Facebook, persisting sessions with signed JWTs.
- Provide REST endpoints that proxy requests to Gemini, OpenAI, and XAI Grok models, exposing metadata and chat completions.
- Serve localized copy to the frontend through a file-backed translation service with build-time generation.
- Deliver a React-based SPA that consumes the API, handles session state, theme switching, and localization.
- Orchestrate the stack with Docker Compose, Cloudflare Tunnels, and Nginx, mapping production-friendly hostnames.

## High-Level Architecture

```
+------------------------------+          +------------------------------+
|          Frontend            |          |           Backend            |
| React 18 + Vite SPA          | <------> | Express.js API               |
| - Auth UI & session storage  |          | - OAuth routes (Google/Fb)   |
| - i18n via i18next           |          | - LLM proxy (Gemini/OpenAI)  |
| - Feature widgets (themes,   |          | - Translation file loader    |
|   language picker, menus)    |          | - Access control middleware  |
+---------------+--------------+          +-------+------+---------------+
                |                                 |      |
                v                                 v      v
         Cloudflare Tunnel                PostgreSQL  Cloudflare R2*
         (dev/prod hostnames)             (user data) (future assets)
                |
                v
             Nginx proxy  <---->  Docker network (frontend/backend/postgres)
```

\* R2 credentials are already part of the environment contract and will be used when asset/CDN storage is required.

## Repository Layout

Only development-relevant files are listed; generated artefacts (e.g., `dist/`) and dependency folders are excluded.

```
charhub/
+- docker-compose.yml            # Orchestrates backend, frontend, nginx, cloudflared
+- .env.example                  # Global env template (ENV_SUFFIX, hostnames)
+- backend/
¦  +- Dockerfile
¦  +- package.json
¦  +- src/
¦     +- index.ts                # Express bootstrap & health routes
¦     +- config/                 # Database & Passport initialisation
¦     +- middleware/             # JWT guard & premium gate
¦     +- routes/
¦     ¦  +- oauth.ts             # Google/Facebook flows + logout
¦     ¦  +- v1/                  # /api/v1 entrypoints (access, llm, i18n)
¦     +- services/
¦     ¦  +- translationService.ts
¦     ¦  +- userService.ts
¦     ¦  +- llm/                 # Gemini/OpenAI/Grok adapters
¦     +- scripts/                # buildTranslations command
¦     +- translations/           # Mounted volume with generated locales
+- frontend/
¦  +- Dockerfile
¦  +- package.json
¦  +- src/
¦     +- App.tsx
¦     +- components/
¦     ¦  +- features/            # Language switcher, theme toggle, user menu
¦     ¦  +- forms/               # Login button variants
¦     ¦  +- layout/              # Header & route guards
¦     ¦  +- ui/                  # Button, SmartDropdown primitives
¦     +- layouts/                # ExternalAuthLayout shell
¦     +- hooks/                  # useAuth, useTheme
¦     +- lib/api.ts              # Axios client
¦     +- pages/                  # Home/Login/Signup/Callback/Dashboard/etc
¦     +- i18n.ts                 # i18next configuration
+- nginx/
¦  +- conf.d/app.conf            # Reverse proxy for SPA + API
+- cloudflared/
¦  +- .gitignore                 # Ignore tunnel credential JSONs
¦  +- config/
¦     +- dev/config.yml
¦     +- prod/config.yml
+- docs/
   +- PROJECT_OVERVIEW.md        # (this file)
   +- BACKEND.md
   +- FRONTEND.md
   +- DEV_OPERATIONS.md
   +- TODO.md
   +- ROADMAP.md                 # Long-term plans kept for reference
```

## Key Integrations

- **OAuth Providers**: Passport strategies for Google and Facebook with state validation and JWT issuance.
- **LLM Providers**: Gemini (Google Generative AI), OpenAI (latest completions), and XAI Grok via HTTP calls. Models are listed from `src/data/llm-models.json`.
- **Localization Pipeline**: `npm run build:translations` hydrates JSON payloads under `backend/translations/`, which are mounted in Docker to persist across environments.
- **Cloudflare Tunnel**: `docker-compose` service maps `dev.charhub.app` / `charhub.app` to Nginx, keeping frontend/backend private behind the tunnel.
- **PostgreSQL**: Central database accessed through Prisma (schema located in `prisma/`).

Refer to the other documents in `docs/` for detailed backend/frontend/API behaviour, operational procedures, and future work.