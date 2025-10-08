# Backend OAuth Service

## Overview
Node.js and TypeScript service that exposes OAuth 2.0 integrations for Google and Facebook. The API is packaged via Docker and runs behind an Nginx reverse proxy orchestrated with docker-compose.

## Tech Stack
- Node.js 20 (LTS recommended)
- TypeScript 5+
- Express.js for HTTP routing
- Passport.js (or a similar library) to manage OAuth flows
- Prisma ORM for database management
- PostgreSQL 16 (Alpine)
- dotenv to load environment variables
- Docker and docker-compose
- Nginx as the reverse proxy

## Suggested Structure
```
backend/
|- src/
|  |- index.ts          # HTTP entry point
|  |- routes/oauth.ts   # starts OAuth flows and handles callbacks
|  |- services/
|  |  |- googleAuth.ts
|  |  |- facebookAuth.ts
|  |- config/
|     |- passport.ts
|- .env.example
|- package.json
|- tsconfig.json
|- Dockerfile
|- README.md
```

## Environment Variables
Create a `.env` file in `backend/` (do not commit the real file).

```
# Environment
NODE_ENV=development
USE_PRETTY_LOGS=false

# HTTP configuration
PORT=3000
BASE_URL=http://localhost
FRONTEND_URL=http://localhost
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://charhub:charhub_dev_password@postgres:5432/charhub_db?schema=public

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_PATH=/api/v1/oauth/google/callback

# Facebook OAuth
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
FACEBOOK_CALLBACK_PATH=/api/v1/oauth/facebook/callback

# Sessions (JWT example)
JWT_SECRET=
TOKEN_EXPIRATION=15m
```

Load these variables with `dotenv` before starting the server.

## OAuth Flow
1. The frontend calls `GET /api/v1/oauth/google` or `GET /api/v1/oauth/facebook` to start the flow.
2. The backend redirects the user to the provider with an anti-CSRF `state` parameter.
3. The provider returns to `/api/v1/oauth/{provider}/callback` configured in `.env`.
4. The callback exchanges the `code` for an access token and profile data.
5. The backend generates its own token (JWT or session) and responds to the frontend.

## Expected Routes
- `GET /api/v1/health` -> basic heartbeat.
- `GET /api/v1/oauth/google` -> starts Google OAuth.
- `GET /api/v1/oauth/facebook` -> starts Facebook OAuth.
- `GET /api/v1/oauth/google/callback` -> handles the Google callback.
- `GET /api/v1/oauth/facebook/callback` -> handles the Facebook callback.
- `POST /api/v1/oauth/logout` -> invalidates the user session/token.

Add middleware for logging, validation, and error handling as needed.

## Database (Prisma + PostgreSQL)

Este projeto utiliza **Prisma ORM** para gerenciar o banco de dados PostgreSQL.

### Comandos do Prisma

```bash
# Gerar Prisma Client
npm run prisma:generate

# Criar nova migration
npm run prisma:migrate

# Aplicar migrations (produção)
npm run prisma:migrate:deploy

# Abrir Prisma Studio (UI visual)
npm run prisma:studio

# Popular banco com dados iniciais
npm run db:seed
```

Para mais detalhes, consulte [prisma/README.md](./prisma/README.md).

## NPM Scripts
```
"scripts": {
  "dev": "ts-node-dev --respawn --transpileOnly src/index.ts",
  "build": "prisma generate && tsc",
  "start": "node dist/index.js",
  "lint": "eslint 'src/**/*.ts'",
  "test": "jest",
  "prisma:generate": "prisma generate",
  "prisma:migrate": "prisma migrate dev",
  "prisma:migrate:deploy": "prisma migrate deploy",
  "prisma:studio": "prisma studio",
  "db:seed": "ts-node prisma/seed.ts"
}
```

## Dockerfile Skeleton
```
# backend/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/index.js"]
```
Use `npm install` for local builds; run `npm ci` inside containers.

## docker-compose.yml Snippet
```
services:
  backend:
    build: ./backend
    env_file: ./backend/.env
    networks: [app-net]

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/certs:/etc/nginx/certs:ro
    ports:
      - "80:80"
      - "443:443"
    networks: [app-net]

networks:
  app-net:
    driver: bridge
```
Nginx must forward `/api` traffic to `backend:3000`. Configure `nginx/conf.d/app.conf` similar to:
```
location /api/ {
  proxy_pass http://backend_service;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

## Local Development
1. `cp backend/.env.example backend/.env` and populate credentials.
2. `npm install` to install dependencies.
3. `npm run dev` for hot reload.
4. Register OAuth credentials with `http://localhost` redirect URIs for local testing.

## Testing
- Unit tests for authentication services.
- Integration tests simulating callbacks with mock tokens.
- Validate provider error handling (`error`, `error_description`).

## Security
- Use random `state` values and validate them on callbacks.
- Terminate TLS at Nginx.
- Keep `client_secret` values only in environment variables.
- Log suspicious attempts and failures.

## Observability
- Structured logging (JSON) with `pino` or `winston`.
- Optional metrics endpoint (Prometheus) at `/metrics`.

## Deployment Checklist
1. Ensure valid TLS certificates (Let's Encrypt or similar).
2. Set `BASE_URL` to the public domain.
3. Update redirect URIs in provider dashboards.
4. Use CI pipelines to build and publish Docker images to a private registry.
