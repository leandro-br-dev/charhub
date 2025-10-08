# CharHub

CharHub is an OAuth-first platform that connects users to multiple generative AI providers while serving localized content for future interactive narrative experiences. The project ships as a Dockerized stack with an Express backend, a React SPA frontend, and optional Cloudflare tunnels for public exposure.

## Overview

- **Social Login**: Google and Facebook flows with state validation, JWT issuance, and automatic hydration in the frontend.
- **LLM Proxy**: REST endpoints to list models and request completions from Gemini, OpenAI, and XAI Grok providers.
- **Localization**: File-backed translation service with intelligent fallback consumed by the SPA through i18next.
- **User Interface**: React + Vite with Tailwind, language/theme switchers, user menu, and protected routes.
- **Infrastructure**: Docker Compose orchestrates PostgreSQL, backend, frontend, Nginx, and Cloudflared; translation JSONs are mounted as a persistent volume.

## Tech Stack

| Layer    | Technologies                                          |
|----------|-------------------------------------------------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router, i18next |
| Backend  | Node.js 20, Express, Passport.js, Prisma, Pino         |
| Data     | PostgreSQL 16 (via Prisma)                             |
| LLMs     | Gemini, OpenAI, XAI Grok (HTTP adapters)               |
| Infra    | Docker Compose, Nginx, Cloudflare Tunnel, Cloudflare R2 (planned) |

## Getting Started

### 1. Prepare environment variables

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill in OAuth keys, JWT secret, and LLM API keys as required. Set `ENV_SUFFIX` (`dev` or `prod`) so the Cloudflared service loads the correct configuration folder.

### 2. Run with Docker Compose

```bash
docker compose up --build
```

- SPA: [`http://localhost`](http://localhost) (or `https://dev.charhub.app` if the tunnel is configured).
- API: [`http://localhost/api/v1`](http://localhost/api/v1).
- Logs: `docker compose logs -f backend` / `frontend` / `cloudflared`.

### 3. Manual execution (optional)

1. Start PostgreSQL (`docker compose up postgres`).
2. In `backend/`: `npm install && npm run dev`.
3. In `frontend/`: `npm install && npm run dev`.

### Development translations

- The backend container now prepares translations automatically on startup.
- Control the behaviour with `DEV_TRANSLATION_MODE`: `auto` (default) tries LLM generation with a fallback to English copies when keys are missing, `offline` always mirrors English resources, and `skip` leaves existing files untouched.
- Run `npm run build:translations` for fresh AI output or `npm run build:translations -- --offline` to seed the JSON files without calling an LLM.
## Documentation

- `docs/PROJECT_OVERVIEW.md` - architecture summary and repository layout.
- `docs/BACKEND.md` - routes, services, environment variables, and commands.
- `docs/FRONTEND.md` - UI flows, component organization, and Vite configuration.
- `docs/DEV_OPERATIONS.md` - environment prep, Docker usage, Cloudflare tunnel setup, translation pipeline.
- `docs/TODO.md` - current priorities (see `docs/ROADMAP.md` for long-term plans).

## Current Status

- OAuth flows, JWT session handling, and premium guards implemented.
- LLM proxy operational; metrics and rate limiting still pending.
- Translation service live with multiple pre-generated locales.
- UI foundation shipped (landing, login, callback, dashboard placeholder).
- Cloudflare Tunnel integration validated; Cloudflare R2 storage not yet wired into runtime code.

## Contributing

1. Follow Conventional Commits (`feat:`, `fix:`, etc.) when opening PRs.
2. Run `npm run build` in both `backend/` and `frontend/` before submitting changes.
3. Check `docs/TODO.md` to align with the current backlog and priorities.

## License

ISC - see the original repository for details.










