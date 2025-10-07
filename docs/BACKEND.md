# Backend Reference

The backend is a TypeScript Express application that authenticates users, proxies LLM requests, and serves locale resources. This guide consolidates the runtime requirements, directory structure, and available endpoints as of the current implementation.

## Runtime Stack

- **Node.js 20** with ES modules.
- **Express.js** router mounted at `/api/v1`.
- **Passport.js** Google & Facebook strategies (OAuth 2.0).
- **Prisma** ORM targeting PostgreSQL 16.
- **Pino** structured logging with request-scoped context.
- **JSON Web Tokens** for session propagation (`generateJWT` / `verifyJWT`).
- **i18next-compatible translation files** generated at build time.

## Source Layout (`backend/src`)

| Path | Purpose |
|------|---------|
| `index.ts` | Entry point: sets up Express, registers middleware, health check, and mounts routers. |
| `config/database.ts` | Prisma client initialisation and connection helpers. |
| `config/passport.ts` | Passport strategies for Google and Facebook OAuth flows. |
| `middleware/auth.ts` | JWT verification, `requireAuth`, and `requirePremium` guard. |
| `routes/oauth.ts` | `/api/v1/oauth/*` routes wrapping passport callbacks and logout. |
| `routes/v1/index.ts` | Aggregates versioned routers (`access`, `llm`, `i18n`). |
| `routes/v1/access.ts` | Public, authenticated, and premium test endpoints. |
| `routes/v1/i18n.ts` | Translation delivery (`/api/v1/i18n/:lang/:namespace`). |
| `routes/v1/llm.ts` | Model catalogue and chat completion endpoints. |
| `services/translationService.ts` | Loads translation JSON from `../translations`. |
| `services/userService.ts` | User persistence helpers (backed by Prisma). |
| `services/llm/*` | Provider-specific adapters (Gemini, OpenAI, Grok). |
| `scripts/buildTranslations.ts` | CLI tool to hydrate translations from source strings. |

## Environment Variables

Backend container reads `backend/.env`. Important keys:

- `PORT` (default `3000`) – Express listen port inside the container.
- `DATABASE_URL` – PostgreSQL connection string (Prisma).
- `FRONTEND_URL` / `BASE_URL` – used for OAuth redirect whitelists.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` – Google OAuth client.
- `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` – Facebook OAuth client.
- `JWT_SECRET` – symmetric signing secret for generated access tokens.
- `GEMINI_API_KEY`, `OPENAI_API_KEY`, `GROK_API_KEY` – LLM provider keys.
- `PUBLIC_HOSTNAME` / `PUBLIC_FACING_URL` – canonical hostname, surfaced to frontend via env propagation.
- `R2_*` (bucket, keys, endpoint) – future-proofed Cloudflare R2 configuration (not yet consumed in code).
- `DEV_TRANSLATION_MODE` (development only) – controls translation bootstrapping (`auto`, `offline`, or `skip`).

## Commands

Run these from `backend/`:

- `npm run dev` – ts-node-dev hot-reload server (requires local Postgres running via Docker Compose).
- `npm run build` – transpile TypeScript to `dist/`.
- `npm start` – run compiled output (used inside Docker).
- `npm run build:translations` – executes `scripts/buildTranslations.ts`; add `-- --offline` for a no-network seed or `-- --force` to rebuild every locale via the selected provider.
## API Overview

### OAuth (`/api/v1/oauth`)

| Method & Path | Description |
|---------------|-------------|
| `GET /oauth/google` | Redirects to Google OAuth, issuing a state token and storing the desired redirect URI. |
| `GET /oauth/google/callback` | Handles Google callback, issues JWT, redirects back to frontend with `token` and encoded user metadata. |
| `GET /oauth/facebook` | Same pattern for Facebook. |
| `GET /oauth/facebook/callback` | Facebook callback. |
| `POST /oauth/logout` | Stateless endpoint returning success (client clears local data). |

### Access Control (`/api/v1/access`)

| Method & Path | Guard | Description |
|---------------|-------|-------------|
| `GET /public/ping` | none | Health response. |
| `GET /protected/me` | `requireAuth` | Returns the authenticated user payload attached by JWT. |
| `GET /premium/insights` | `requirePremium` | Requires `role` to be `PREMIUM` or `ADMIN`; returns sample data. |

### LLM (`/api/v1/llm`)

| Method & Path | Description |
|---------------|-------------|
| `GET /models` | Returns all supported models extracted from `data/llm-models.json`. |
| `GET /models/:provider` | Filters models by `gemini`, `openai`, or `grok`. |
| `POST /chat` | Body `{ provider, model, userPrompt, systemPrompt?, temperature?, maxTokens? }`. Proxies to provider adapters and returns the raw completion. |

### Localization (`/api/v1/i18n/:language/:namespace`)

- Valid namespaces: `common`, `home`, `login`, `signup`, `callback`, `dashboard`, `notFound`.
- Language matching: tries full locale (`pt-BR`), then prefix (`pt`), then falls back to `en`.
- Returns `{ resources }` JSON shaped for i18next.

## Data & Persistence

- **Prisma schema** lives under `prisma/`. Run `npx prisma migrate dev` for local development (Docker Compose handles this automatically on container start).
- **Translations** generated once and mounted as a Docker volume (`./backend/translations:/app/translations`). They are read-only at runtime.
- **Logging**: Each Express request installs `req.log` via Pino HTTP integration (see `index.ts`), ensuring passport and guards emit structured logs.

## Testing & Observability

- Automated tests are not yet defined; future work includes unit tests for translation lookups and OAuth controllers.
- Health endpoints: `/healthz` (see `index.ts`) for container readiness; `/api/v1/access/public/ping` for API-level reachability.
- When running in Docker, check logs with `docker compose logs backend`.

Refer to `docs/DEV_OPERATIONS.md` for environment preparation, and `docs/TODO.md` for pending backend enhancements (e.g., R2 usage, premium feature completion).
