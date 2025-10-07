# Engineering Playbook

Welcome to CharHub. This guide is shared by every automation agent (GitHub Copilot, Claude, Cursor, etc.) and MUST be read before touching the codebase.

## Encoding Requirements

- Always save this playbook and related docs using UTF-8 without BOM to prevent garbled characters.
- Configure your editor accordingly (for example, in VS Code set "files.encoding": "utf8") and confirm encoding before committing.

## Before You Start

1. Read the following reference material **before any implementation**:
   - Root `README.md`
   - `docs/PROJECT_OVERVIEW.md`
   - `docs/BACKEND.md`
   - `docs/FRONTEND.md`
   - `docs/DEV_OPERATIONS.md`
   - `docs/TODO.md` (ongoing priorities)
   - `docs/ROADMAP.md` (long-term vision)
2. Confirm that `.env` files are **never** committed. Work from the `*.example` templates.
3. Make sure you understand the current state by scanning the latest commit history when in doubt.

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

1. **Environment**: Copy `.env.example` to `.env` (root, backend, frontend) and fill values locally. Keep secrets out of git.
2. **Translations**: Run `npm run build:translations` (backend) after changing locale source files.
3. **Docker**: `docker compose up --build` to run the full stack; services mount translations and tunnel configs automatically.
4. **Local Dev**: Back-end `npm run dev`; front-end `npm run dev`. Keep Vite proxy aligned with backend base URL.
5. **Testing**: Formal test suites are pending; when adding them, follow the guidance in `docs/BACKEND.md` and `docs/FRONTEND.md`.
6. **Commits/PRs**: Use Conventional Commits. Document manual tests. Rebase before opening PRs. Reference open TODO items.

## Coding Standards

- TypeScript strict mode everywhere. Prefer explicit types and early returns.
- 2-space indentation. camelCase for variables/functions, PascalCase for components/types.
- Comments in concise en-US; document only non-obvious logic.
- Tailwind utilities ordered: layout > spacing > color/typography.
- Never import one OAuth provider's service into another; keep shared types in `backend/src/types`.
- When cloning React elements, preserve refs correctly (see `SmartDropdown` pattern).

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