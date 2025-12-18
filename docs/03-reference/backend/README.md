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
| `services/comfyui/*` | ComfyUI integration for AI-powered image generation via middleware. |
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
- `R2_*` (bucket, keys, endpoint) – Cloudflare R2 storage credentials consumidos pelo `r2Service`.
- `COMFYUI_URL` – ComfyUI middleware endpoint (e.g., `https://comfyui.charhub.app`).
- `COMFYUI_SERVICE_TOKEN` – Authentication token for ComfyUI middleware (required).
- `COMFYUI_TIMEOUT` – Timeout for image generation operations (default: 300000ms / 5 minutes).
- `DEV_TRANSLATION_MODE` (development only) – controls translation bootstrapping (`auto`, `offline`, or `skip`).

## Commands

### Local Development (outside Docker)

Run these from `backend/`:

- `npm run dev` – ts-node-dev hot-reload server (requires local Postgres running via Docker Compose).
- `npm run build` – transpile TypeScript to `dist/`.
- `npm start` – run compiled output (used inside Docker).
- `npm run build:translations` – executes `scripts/buildTranslations.ts`; add `-- --offline` for a no-network seed or `-- --force` to rebuild every locale via the selected provider.

### Docker Container Commands

**IMPORTANT**: When the backend is running in Docker (as is typical for development), all Prisma and database-related commands must run inside the container:

```bash
# Generate Prisma Client after schema changes
docker compose exec backend npx prisma generate

# Create and apply migrations
docker compose exec backend npx prisma migrate dev --name your_migration_name

# Apply migrations (production)
docker compose exec backend npx prisma migrate deploy

# Open Prisma Studio (database GUI)
docker compose exec backend npx prisma studio

# Run database seed
docker compose exec backend npm run db:seed

# Restart backend after Prisma changes
docker compose restart backend

# View backend logs
docker compose logs backend --tail 50 -f
```

### Translation System

See `backend/translations/README.md` for comprehensive translation workflow documentation.

**Quick Commands:**

```bash
# IMPORTANT: Run from backend/ directory
# The script loads .env from root (../.env) which contains GEMINI_API_KEY

cd backend

# Build all translations (incremental - only updates changed files)
npm run build:translations

# Force rebuild everything (ignores timestamps)
npm run build:translations -- --force

# Verbose output (shows what's being skipped/updated)
npm run build:translations -- -v

# Offline mode (copies English instead of translating)
npm run build:translations -- --offline
```

**Translation Workflow:**

1. Ensure `GEMINI_API_KEY` is configured in root `.env` file
2. Edit source files in `backend/translations/_source/*.json`
3. Run `npm run build:translations` (from backend/ directory)
4. Translations are auto-generated for 11 languages using Gemini API (pt-BR, es-ES, fr-FR, de-DE, zh-CN, hi-IN, ar-SA, ru-RU, ja-JP, ko-KR, it-IT)
5. Files are mounted to Docker container via volume
6. Restart backend if needed: `docker compose restart backend`

**Performance:** Incremental builds detect file changes via timestamps - only modified namespaces are retranslated (~0.5s vs ~90s full rebuild).
## API Overview

### OAuth (`/api/v1/oauth`)

#### Configuration

**IMPORTANT**: OAuth callback URLs use `PUBLIC_FACING_URL` instead of `BASE_URL` to ensure callbacks work from external access points (not localhost).

Environment variables in `backend/.env`:

```bash
# Internal/local communication
BASE_URL=http://localhost

# Public-facing URL for OAuth callbacks
PUBLIC_FACING_URL=https://dev.charhub.app

# OAuth credentials
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_CALLBACK_PATH=/api/v1/oauth/google/callback

FACEBOOK_CLIENT_ID=your_client_id
FACEBOOK_CLIENT_SECRET=your_client_secret
FACEBOOK_CALLBACK_PATH=/api/v1/oauth/facebook/callback
```

**Callback URLs Registered in Provider Dashboards:**

Must match `PUBLIC_FACING_URL + CALLBACK_PATH`:
- Google: `https://dev.charhub.app/api/v1/oauth/google/callback`
- Facebook: `https://dev.charhub.app/api/v1/oauth/facebook/callback`

**Configuration Location:** `backend/src/config/passport.ts` uses `OAUTH_BASE_URL = PUBLIC_FACING_URL || BASE_URL`

#### Endpoints

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

CharHub integrates **Google Gemini**, **OpenAI**, and **XAI Grok** for AI-powered conversations.

#### Configuration

Add API keys to `backend/.env`:

```bash
GEMINI_API_KEY=AIza...          # From https://ai.google.dev/
OPENAI_API_KEY=sk-proj-...      # From https://platform.openai.com/api-keys
GROK_API_KEY=xai-...            # From https://console.x.ai/
```

#### Endpoints

| Method & Path | Description |
|---------------|-------------|
| `GET /models` | Returns all supported models from `data/llm-models.json`. |
| `GET /models/:provider` | Filters models by `gemini`, `openai`, or `grok`. |
| `POST /chat` | Generate AI response. Body: `{ provider, model, userPrompt, systemPrompt?, temperature?, maxTokens? }` |

#### Model Classifications (October 2025)

**⚡ Fast** (optimized for speed/cost):
- `gemini-2.5-flash-lite`, `gpt-4.1-nano`, `grok-4-fast-non-reasoning`

**📈 Medium** (balanced quality/speed):
- `gemini-2.5-flash`, `gemini-2.0-flash`, `gpt-5-mini`, `grok-code-fast-1`

**🧠 High Performance** (maximum reasoning quality):
- `gemini-2.5-pro` (adaptive thinking), `gpt-5` (74.9% SWE-bench), `grok-4` (real-time search), `grok-4-fast-reasoning`

#### Example Request

```bash
curl -X POST http://localhost/api/v1/llm/chat \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "gemini",
    "model": "gemini-2.5-flash-lite",
    "userPrompt": "Explain Docker in one sentence"
  }'
```

**Note:** GPT-5 and GPT-Realtime models do not accept `temperature` or `maxTokens` parameters (they use defaults only).

Full API documentation: [LLM Providers Guide](../api/llm-providers.md)

### Localization (`/api/v1/i18n/:language/:namespace`)

- Valid namespaces: `common`, `home`, `login`, `signup`, `callback`, `dashboard`, `notFound`.
- Language matching: tries full locale (`pt-BR`), then prefix (`pt`), then falls back to `en`.
- Returns `{ resources }` JSON shaped for i18next.

### Storage (`/api/v1/storage`)

| Method & Path | Guard | Description |
|---------------|-------|-------------|
| `POST /storage/test-upload` | Dev only | Recebe `{ fileName, content, contentType? }` onde `content` é base64, faz upload para o Cloudflare R2 e retorna a URL pública. Disponível apenas quando `NODE_ENV=development`.

## Data & Persistence

- **Prisma schema** lives under `prisma/`. Run `npx prisma migrate dev` for local development (Docker Compose handles this automatically on container start).
- **Translations** generated once and mounted as a Docker volume (`./backend/translations:/app/translations`). They are read-only at runtime.
- **Logging**: Each Express request installs `req.log` via Pino HTTP integration (see `index.ts`), ensuring passport and guards emit structured logs.

### Database Models

O CharHub utiliza Prisma ORM com PostgreSQL. Consulte `backend/prisma/schema.prisma` para detalhes completos.

#### **Sistema de Chat (Phase 2)**

**Assistant**
- Representa um agente de IA com instruções e personalidade específicas
- Pode atuar em conversas representando um Character
- Campos principais: `name`, `description`, `instructions` (system prompt), `defaultCharacterId`
- Relacionamentos: pertence a um `User` (creator), pode ter um `Character` padrão

**Conversation**
- Representa uma sessão de chat entre usuário e personagens
- Campos principais: `title`, `settings` (JSON com preferências de LLM/roleplay), `lastMessageAt`
- Tracking de edições: `isTitleUserEdited`, `isTitleSystemEdited`, `titleLastUpdatedAt`
- Relacionamentos: pertence a um `User`, contém múltiplos `ConversationParticipant` e `Message`

**ConversationParticipant**
- Representa uma entidade participando de uma conversa
- **Restrição XOR**: Exatamente UM dos seguintes deve estar definido:
  - `userId` - Usuário humano participando
  - `actingCharacterId` - Character atuando diretamente (sem IA)
  - `actingAssistantId` - Assistant (IA) atuando
- `representingCharacterId` - Character sendo representado visualmente (obrigatório quando `actingAssistantId` está definido)
- `configOverride` - Configuração JSON específica para este participante nesta conversa

**Message**
- Representa uma mensagem individual na conversa
- Campos principais: `content` (texto ou JSON), `senderId`, `senderType` (enum: USER, CHARACTER, ASSISTANT, SYSTEM)
- Suporte a anexos: `attachments` (array JSON de URLs)
- Metadata: campo `metadata` (JSON) para informações adicionais (emoção, ação, etc.)

**SenderType** (enum)
- `USER` - Mensagem enviada pelo usuário humano
- `CHARACTER` - Mensagem de um character atuando diretamente
- `ASSISTANT` - Mensagem gerada por um assistant (IA)
- `SYSTEM` - Mensagens do sistema (notificações, avisos)

#### **Fluxo de Dados de Chat**

1. **Criar Conversa**: User cria Conversation, system adiciona User como ConversationParticipant
2. **Adicionar Character**: Adiciona ConversationParticipant com `actingAssistantId` (IA) ou `actingCharacterId` (direto)
3. **Enviar Mensagem**: Cria Message com `senderId` e `senderType`, atualiza `Conversation.lastMessageAt`
4. **Gerar Resposta IA**: Assistant processa histórico, gera resposta usando LLM, cria nova Message
5. **Histórico**: Busca Messages ordenadas por `timestamp` com paginação

### WebSocket (Real-time Chat)

A camada de tempo real do chat usa Socket.IO e está disponível no caminho `/api/v1/ws`. Use o mesmo token JWT emitido no login para autenticar o handshake (`socket.auth.token` ou query `token`). Cada conversa corresponde a uma sala `conversation:<ID>`.

Eventos principais:
- `join_conversation` / `leave_conversation` — gerenciam o ingresso do socket em uma conversa e validam se o usuário é dono/participante.
- `send_message` — payload `{ conversationId, content, attachments?, metadata?, assistantParticipantId? }`. Persiste a mensagem via `messageService` e emite `message_received`.
- `message_received` — broadcast com a mensagem serializada para todos os sockets na sala.
- `typing_start` / `typing_stop` — indicadores de digitação; o servidor envia `userId` e, quando disponível, `participantId`.
- `ai_response_start`, `ai_response_chunk`, `ai_response_complete`, `ai_response_error` — ciclo de geração de respostas do assistente disparado por `assistantService.sendAIMessage`.

A implementação completa está em `backend/src/websocket/chatHandler.ts`, que reutiliza `conversationService`, `messageService`, `assistantService` e `verifyJWT` para orquestrar autenticação, rooms e broadcast.


## AI Response Generation (Agents & Style Guides)

The backend includes an extensible style guide system for controlling AI response generation tone, formatting, and behavior.

**Location:** `backend/src/agents/style-guides/`

### How It Works

1. **StyleGuideService** (`index.ts`) loads all available guides
2. Each guide implements the `StyleGuide` interface
3. The `buildPrompt` method combines context and returns instructions for the LLM
4. Guides are combined into a single prompt before sending to LLM providers

### Adding a New Style Guide

1. Create `backend/src/agents/style-guides/myGuide.ts`
2. Implement the `StyleGuide` interface
3. Add to the `guides` array in `StyleGuideService`

### Future Improvements

- **Comprehensive Style Guide**: Tone, personality, dos/don'ts, formatting rules
- **Granular Guides**: Sensitive topics, roleplay scenarios, languages/cultures
- **Dynamic Loading**: Load guides based on conversation context instead of all at once

For implementation details, see `backend/src/agents/style-guides/README.md`.

## Testing & Observability

- Automated tests are not yet defined; future work includes unit tests for translation lookups and OAuth controllers.
- Health endpoints: `/healthz` (see `index.ts`) for container readiness; `/api/v1/access/public/ping` for API-level reachability.
- When running in Docker, check logs with `docker compose logs backend`.

## Related Documentation

- **[Tag System](tags-system.md)** - Content classification and filtering with tags
- **[Credit Verification](../../02-guides/development/credit-verification.md)** - Guide for credit system integration
- **[LLM Providers](../api/llm-providers.md)** - Full API documentation for AI providers (Gemini, OpenAI, Grok)
- **[LLM Tool-Calling](../api/llm-tools.md)** - Web search and tool integration for LLMs
- **[Translation System](translation-system.md)** - Complete translation workflow
- **[ComfyUI Setup](../../02-guides/operations/comfyui-setup.md)** - ComfyUI middleware configuration and deployment
- **Style Guides**: `backend/src/agents/style-guides/README.md` - AI response customization
- **[Development Operations](../../02-guides/development/dev-operations.md)** - Environment setup and deployment
