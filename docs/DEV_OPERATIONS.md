# Development & Operations Guide

This document consolidates the workflows required to run CharHub locally, manage environment variables, work with Docker, and configure Cloudflare tunnels for external access.

## Prerequisites

- Docker Desktop (or a compatible container runtime) with Compose v2.
- Node.js 20.x and npm 10.x if you intend to run services outside Docker.
- Access to Google/Facebook OAuth credentials and LLM provider keys (or test placeholders).
- Cloudflare account with tunnel permissions when exposing development/staging environments.

## Environment Files

### Root `.env`

Copy `.env.example` to `.env` in the repository root. Key fields:

- `ENV_SUFFIX` â€“ `dev` or `prod`; used by Docker Compose to pick the right Cloudflare config directory.
- `PUBLIC_HOSTNAME`, `PUBLIC_FACING_URL` â€“ Hostnames consumed by both backend and frontend during runtime.

### Backend (`backend/.env`)

- Provides database credentials, OAuth keys, JWT secret, LLM tokens, translation settings.
- When running via Docker Compose, `ENV_SUFFIX` and `PUBLIC_HOSTNAME` cascade into containers using `env_file`.
- Translation build expects `backend/translations` to exist; Docker volume keeps data across rebuilds.

### Frontend (`frontend/.env`)

- Configure `VITE_API_BASE_URL` (empty or `http://localhost`) plus OAuth path overrides if necessary.
- `VITE_CDN_PUBLIC_URL_BASE` reserved for serving assets from Cloudflare R2 later on.

## Local Development

### Running with Docker Compose

```bash
docker compose up --build
```

Services launched:

| Service | Purpose |
|---------|---------|
| `postgres` | Persistent database with health checks. |
| `backend` | Express API (build + runtime). Translation volume mounted. |
| `frontend` | React SPA served via Vite build output (development uses live reload). |
| `nginx` | Reverse proxy exposing SPA under `/` and API under `/api/v1`. |
| `cloudflared` | Optional tunnel service referencing `cloudflared/config/<env>/config.yml`. |

Front door (without tunnel) defaults to `http://localhost`. If Cloudflare tunnel is configured, dev traffic can hit `https://dev.charhub.app`.

### Running Services Individually

1. Prepare PostgreSQL locally (or use Docker service only).
2. In `backend/`: `npm install` then `npm run dev`.
3. In `frontend/`: `npm install` then `npm run dev`.
4. Update `.env` files to point at your chosen API base.

### Translation Workflow

- The backend container now prepares translations during startup when `NODE_ENV=development`. Tune behaviour with `DEV_TRANSLATION_MODE`: `auto` (default) tries the LLM build and falls back to copying English strings when secrets are missing, `offline` always mirrors English, and `skip` leaves files untouched.
- Regenerate strings manually with `npm run build:translations`; append `-- --offline` for a fast, no-network seed or `--force` to overwrite everything via the selected provider.
- Edit the English source files under `backend/translations/en/<namespace>.json`, run the command above, then commit the resulting JSON so teammates do not trigger generation on boot.
- Consider a GitHub Actions workflow that runs on pushes touching `backend/translations/en/**`, executes `npm ci` + `npm run build:translations -- --force`, and uploads a `backend-translations` artifact or opens an automated PR. Store LLM API keys as repository secrets (`GEMINI_API_KEY`, etc.) before enabling it.

### Cloudflare Tunnel

1. Create a tunnel per environment (e.g., `dev` & `prod`) in the Cloudflare dashboard.
2. Download the credential JSON (`<UUID>.json`) and place it under `cloudflared/config/<env>/`.
3. Update `cloudflared/config/<env>/config.yml` with the tunnel UUID and hostname mapping (`dev.charhub.app` ? `http://nginx:80`).
4. Ensure root `.env` sets `ENV_SUFFIX` to the matching directory name (`dev` or `prod`).
5. Start Compose; the `cloudflared` service will mount `/etc/cloudflared/config/<env>/` and run `tunnel ... run`.

### Postgres & Prisma

- Database data persist via the `postgres_data` volume. Reset with `docker volume rm charhub_postgres_data` if necessary.
- Apply migrations manually: `docker compose exec backend npx prisma migrate deploy`.
- Generate Prisma client (if schema changes): `docker compose exec backend npx prisma generate`.

### Monitoring & Logs

- `docker compose logs -f backend` â€“ Backend logs (Pino JSON entries).
- `docker compose logs -f frontend` â€“ Build output, Vite server messages.
- `docker compose logs -f cloudflared` â€“ Tunnel health and connection status.

## Deployment Considerations

- Production still relies on Docker Compose; adapt to managed services as the roadmap (see `docs/ROADMAP.md`) advances.
- Cloudflare R2 credentials exist but asset upload/publishing pipeline has not been implementedâ€”ensure secrets stay out of Git.
- Include manual smoke tests: OAuth login, `/api/v1/llm/models`, translation fetch, premium endpoint access with a token containing `role=PREMIUM`.
- Review `docs/TODO.md` before shipping; it tracks pending work around premium features, analytics, and observability.

## Common Issues

| Symptom | Resolution |
|---------|------------|
| OAuth redirect loops | Confirm `FRONTEND_URL` matches the origin of your SPA and that `redirect_uri` encoded in frontend matches backend whitelist. |
| `Translation not found` errors | Run `npm run build:translations` and ensure JSON files exist for language prefixes (e.g., `pt/`). |
| Cloudflare tunnel fails with `Cannot determine default origin certificate` | Replace placeholder tunnel IDs and ensure credential JSON is mounted (see steps above). |
| Premium endpoint returns 403 unexpectedly | Check stored JWT payload (`role` must be `PREMIUM` or `ADMIN`); update seed data or database rows accordingly. |

Keep this guide updated as deployment automation evolves (e.g., CI/CD, infrastructure-as-code). For feature planning, the authoritative source is `docs/ROADMAP.md` and the consolidated TODO.
