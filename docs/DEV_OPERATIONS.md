# Development & Operations Guide

This document consolidates the workflows required to run CharHub locally, manage environment variables, work with Docker, and configure Cloudflare tunnels for external access.

**Related Documentation:**
- **[Database Operations Guide](DATABASE_OPERATIONS.md)** - PostgreSQL administration, DBeaver connection, backups, and troubleshooting
- **[Production Deployment Guide](deploy/CURRENT_DEPLOYMENT.md)** - Complete guide for deploying to production
- **[Future Improvements](deploy/FUTURE_IMPROVEMENTS.md)** - Roadmap of planned deployment improvements
- **[Architecture Decisions](ARCHITECTURE_DECISIONS.md)** - Repository structure and architectural choices

## Prerequisites

- Docker Desktop (or a compatible container runtime) with Compose v2.
- Node.js 20.x and npm 10.x if you intend to run services outside Docker.
- Access to Google/Facebook OAuth credentials and LLM provider keys (or test placeholders).
- Cloudflare account with tunnel permissions when exposing development/staging environments.

## Environment Files

### Root `.env`

Copy `.env.example` to `.env` in the repository root. Key fields:

- `ENV_SUFFIX` - `dev` or `prod`; used by Docker Compose to pick the right Cloudflare config directory.
- `PUBLIC_HOSTNAME`, `PUBLIC_FACING_URL` - Hostnames consumed by both backend and frontend during runtime.
- `BACKEND_ENABLE_HOT_RELOAD` - Set to `true` (default) so the backend container uses `ts-node-dev`; switch to `false` to boot with plain `tsx` when file watching is undesirable.
- `BACKEND_HOT_RELOAD_POLL_INTERVAL` - Milliseconds used by Chokidar polling (effective only when hot reload is enabled).

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
| `frontend` | React SPA; runs `npm run dev` when `NODE_ENV=development` and serves the built bundle via Nginx when `NODE_ENV=production`. |
| `nginx` | Reverse proxy exposing SPA under `/` and API under `/api/v1`. |
| `cloudflared` | Optional tunnel service referencing `cloudflared/config/<env>/config.yml`. |

> **Tip:** Set `NODE_ENV=development` in the root `.env` to enable hot reload for both backend (ts-node-dev) and frontend (Vite). Switch back to `production` to build and serve optimized assets behind Nginx.
> **Hostnames:** When exposing the Vite dev server through the tunnel, add every expected hostname (e.g., `dev.charhub.app`) to `VITE_ALLOWED_HOSTS` (comma separated) in `frontend/.env` so the host check passes.

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

#### Prisma Migration Workflow

O Prisma oferece dois fluxos de trabalho para gerenciar o schema do banco de dados:

##### **Opção 1: Migrations (Recomendado para Produção)**

Este é o fluxo **correto e recomendado** que cria histórico versionado de mudanças no banco de dados.

**1. Criar uma nova migração (desenvolvimento):**
```bash
docker compose exec backend npx prisma migrate dev --name <nome_descritivo>
```
Este comando:
- Cria um novo arquivo SQL em `backend/prisma/migrations/`
- Aplica a migração no banco de dados
- Gera o Prisma Client automaticamente

Exemplos de nomes descritivos:
- `add_chat_models` - Adiciona tabelas do sistema de chat
- `add_user_avatar_fields` - Adiciona campos de avatar ao User
- `update_character_indexes` - Atualiza índices da tabela Character

**2. Aplicar migrações pendentes (produção/staging):**
```bash
docker compose exec backend npx prisma migrate deploy
```
Aplica todas as migrações que ainda não foram executadas no banco de dados. Use este comando em ambientes de produção.

**3. Verificar status das migrações:**
```bash
docker compose exec backend npx prisma migrate status
```
Mostra quais migrações foram aplicadas e quais estão pendentes.

**4. Resolver migrações com drift (estado inconsistente):**

Se o banco de dados tiver mudanças que não estão no histórico de migrações:

```bash
# Opção A: Marcar uma migração como aplicada (se o banco já está correto)
docker compose exec backend npx prisma migrate resolve --applied <nome_da_migração>

# Opção B: Criar baseline do estado atual
# 1. Criar diretório da migração
mkdir -p backend/prisma/migrations/$(date +%Y%m%d%H%M%S)_baseline_state
echo "-- Baseline migration (database already in sync)" > backend/prisma/migrations/$(date +%Y%m%d%H%M%S)_baseline_state/migration.sql

# 2. Marcar como aplicada
docker compose exec backend npx prisma migrate resolve --applied <nome_do_diretório>
```

##### **Opção 2: DB Push (Apenas para Prototipagem Rápida)**

**⚠️ ATENÇÃO:** Este método **não cria arquivos de migração** e **não deve ser usado em produção**.

```bash
docker compose exec backend npx prisma db push
```

Use `db push` apenas quando:
- Estiver prototipando e mudando o schema frequentemente
- Não se importar em perder o histórico de mudanças
- Estiver trabalhando em desenvolvimento local

Depois de finalizar o protótipo, crie uma migração apropriada com `migrate dev`.

##### **Comandos Auxiliares**

**Gerar o Prisma Client (atualizar tipos TypeScript):**
```bash
docker compose exec backend npx prisma generate
```
Execute após modificar o `schema.prisma` manualmente ou quando o cliente estiver desatualizado.

**Formatar o schema Prisma:**
```bash
docker compose exec backend npx prisma format
```
Formata o arquivo `schema.prisma` seguindo as convenções do Prisma.

**Abrir o Prisma Studio (interface visual):**
```bash
docker compose exec backend npx prisma studio
```
Abre o Prisma Studio em `http://localhost:5555` para visualizar e editar dados do banco.

**Validar tabelas criadas (PostgreSQL):**
```bash
docker compose exec postgres psql -U charhub -d charhub_db -c "\dt"
```

**Descrever estrutura de uma tabela:**
```bash
docker compose exec postgres psql -U charhub -d charhub_db -c '\d "NomeDaTabela"'
```

##### **Fluxo Recomendado para Adicionar Novas Tabelas**

1. **Editar o schema:**
   - Abra `backend/prisma/schema.prisma`
   - Adicione os novos models, enums e relações
   - Formate o schema: `docker compose exec backend npx prisma format`

2. **Criar a migração:**
   ```bash
   docker compose exec backend npx prisma migrate dev --name add_sua_feature
   ```

3. **Validar no banco:**
   ```bash
   # Verificar tabelas
   docker compose exec postgres psql -U charhub -d charhub_db -c "\dt"

   # Ver estrutura específica
   docker compose exec postgres psql -U charhub -d charhub_db -c '\d "NomeDaTabela"'
   ```

4. **Validar no Prisma Studio:**
   ```bash
   docker compose exec backend npx prisma studio
   ```
   Abra `http://localhost:5555` e verifique se as tabelas aparecem corretamente.

5. **Commitar as mudanças:**
   ```bash
   git add backend/prisma/schema.prisma
   git add backend/prisma/migrations/
   git commit -m "feat(db): add <sua_feature> models"
   ```

##### **Notas Importantes**

- **Sempre use migrações em produção** - Nunca use `db push` em ambientes de produção ou staging
- **Commite os arquivos de migração** - Os arquivos em `backend/prisma/migrations/` devem ser versionados no Git
- **Uma migração por feature** - Agrupe mudanças relacionadas em uma única migração
- **Nomes descritivos** - Use nomes claros que expliquem o que a migração faz
- **Tabelas de junção automáticas** - O Prisma cria automaticamente tabelas com prefixo `_` para relações many-to-many (ex: `_CharacterToTag`)
- **Caso de erro "drift detected"** - Veja a seção "Resolver migrações com drift" acima

### Monitoring & Logs

- `docker compose logs -f backend` - Backend logs (Pino JSON entries).
- `docker compose logs -f frontend` - Build output, Vite server messages.
- `docker compose logs -f cloudflared` - Tunnel health and connection status.

## Deployment Considerations

- Production still relies on Docker Compose; adapt to managed services as the roadmap (see `docs/ROADMAP.md`) advances.
- Cloudflare R2 credentials agora alimentam o serviço `r2Service` (endpoint `/api/v1/storage/test-upload` disponível em desenvolvimento); o pipeline completo de publicação de assets permanece pendente.
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
