# Docker Compose Override Guide

This document explains how to use `docker-compose.override.yml` correctly to customize your Docker Compose configuration for different environments without modifying the base `docker-compose.yml` file.

## Overview

The `docker-compose.override.yml` file is automatically loaded by Docker Compose when you run `docker compose up`. It allows you to override or extend the base configuration without changing version-controlled files.

## Critical Issue: Port Merging

**IMPORTANT**: By default, Docker Compose **concatenates** (merges) port lists instead of replacing them. This means if you define ports in both files, both sets of ports will be used, which can cause conflicts.

### The Problem

```yaml
# docker-compose.yml (base)
services:
  postgres:
    ports:
      - "5432:5432"

# docker-compose.override.yml (WRONG - will merge)
services:
  postgres:
    ports:
      - "5434:5432"
```

**Result**: Docker tries to map BOTH `5432:5432` AND `5434:5432`, causing a port conflict.

### The Solution: `!override` Modifier

Use the `!override` modifier to **replace** instead of merge:

```yaml
# docker-compose.override.yml (CORRECT)
services:
  postgres:
    ports: !override
      - "5434:5432"
```

**Result**: Only `5434:5432` is mapped, replacing the base configuration.

## CharHub Multi-Environment Setup

CharHub uses two simultaneous environments on the same host:

| Environment | WSL Distribution | Main Ports | Test Ports |
|-------------|------------------|------------|------------|
| Reviewer    | Ubuntu-22.04-Reviewer | Postgres: 5433<br>Redis: 6380<br>Backend: 3001<br>Frontend: 5174<br>Nginx: 8081, 8444 | Postgres: 5435<br>Redis: 6382 |
| Coder       | Ubuntu-24.04-Coder | Postgres: 5434<br>Redis: 6381<br>Backend: 3002<br>Frontend: 5175<br>Nginx: 8082, 8445 | N/A |

**Note:** Test containers are used by Agent Reviewer for integration testing without affecting the main development database.

### Reviewer Override Example

**File**: `docker-compose.override.yml` (in Ubuntu-22.04-Reviewer)

```yaml
# Port overrides for Ubuntu-22.04-Reviewer environment
# Avoids conflicts with Ubuntu-24.04-Coder containers

services:
  postgres:
    ports: !override
      - "5433:5432"

  redis:
    ports: !override
      - "6380:6379"

  backend:
    ports: !override
      - "3001:3000"

  frontend:
    ports: !override
      - "5174:80"

  nginx:
    ports: !override
      - "8081:80"
      - "8444:443"

# If using test containers (optional, for integration testing):
# Add these to your docker-compose.test.yml or similar

  postgres-test:
    image: postgres:16-alpine
    ports: !override
      - "5435:5432"
    environment:
      POSTGRES_DB: charhub_test
      POSTGRES_USER: charhub
      POSTGRES_PASSWORD: charhub_test_pass

  redis-test:
    image: redis:7-alpine
    ports: !override
      - "6382:6379"
```

### Coder Override Example

**File**: `docker-compose.override.yml` (in Ubuntu-24.04-Coder)

```yaml
# Port overrides for Ubuntu-24.04-Coder environment
# Avoids conflicts with Ubuntu-22.04-Reviewer containers

services:
  postgres:
    ports: !override
      - "5434:5432"

  redis:
    ports: !override
      - "6381:6379"

  backend:
    ports: !override
      - "3002:3000"

  frontend:
    ports: !override
      - "5175:80"

  nginx:
    ports: !override
      - "8082:80"
      - "8445:443"
```

## Verifying Override Configuration

### Check Merged Configuration

```bash
# View the final merged configuration
docker compose config

# Check only port mappings
docker compose config | grep -A 3 "ports:"

# Verify specific service
docker compose config postgres
```

### Expected Output

For Coder environment, you should see:

```yaml
postgres:
  ports:
    - mode: ingress
      target: 5432
      published: "5434"
      protocol: tcp
```

If you see port `5432` published instead of `5434`, the `!override` modifier is missing.

## Testing Connection

### From Host (WSL)

```bash
# AGENT CODER - Test connections
psql -h localhost -p 5434 -U charhub -d charhub_db  # Postgres
redis-cli -h localhost -p 6381 ping                  # Redis
curl http://localhost:3002/api/v1/health             # Backend API
curl http://localhost:8082                           # Frontend (Nginx)

# AGENT REVIEWER - Test main environment connections
psql -h localhost -p 5433 -U charhub -d charhub_db  # Postgres
redis-cli -h localhost -p 6380 ping                  # Redis
curl http://localhost:3001/api/v1/health             # Backend API
curl http://localhost:8081                           # Frontend (Nginx)

# AGENT REVIEWER - Test environment connections (if using test containers)
psql -h localhost -p 5435 -U charhub -d charhub_test  # Postgres Test
redis-cli -h localhost -p 6382 ping                   # Redis Test
```

### From Other Containers (Docker Network)

Inside the Docker network, services always use internal ports:

```bash
# From backend container, connecting to postgres
docker compose exec backend psql -h postgres -p 5432 -U charhub -d charhub_db
#                                    ^^^^^^^^     ^^^^ (internal port)
```

## Common Pitfalls

### 1. Missing `!override` Modifier

**Symptom**: Port conflict errors like `bind: address already in use`

**Fix**: Add `!override` modifier to all `ports:` definitions in override file

### 2. Using `-f` Flag Incorrectly

```bash
# WRONG - disables automatic override loading
docker compose -f docker-compose.yml up

# CORRECT - automatically loads docker-compose.override.yml
docker compose up
```

### 3. Forgetting to Restart After Changes

```bash
# After modifying docker-compose.override.yml
docker compose down
docker compose up -d
```

### 4. Confusing Host vs Internal Ports

- **Host port** (left side): Used from outside Docker network (e.g., `5434:5432`)
- **Internal port** (right side): Used inside Docker network (e.g., `postgres:5432`)

## Other Override Use Cases

### Environment Variables

```yaml
services:
  backend:
    environment:
      NODE_ENV: development
      DEBUG: "true"
```

### Volume Mounts (Development)

```yaml
services:
  backend:
    volumes:
      - ./backend/src:/app/src  # Live code reload
```

### Build Arguments

```yaml
services:
  backend:
    build:
      args:
        NODE_ENV: development
```

### Command Override

```yaml
services:
  backend:
    command: npm run dev:debug
```

## References

- [Docker Compose Merge Documentation](https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/)
- [Stack Overflow: Override ports instead of merging](https://stackoverflow.com/questions/48851190/docker-compose-override-a-ports-property-instead-of-merging-it)
- [Docker Compose Issue #2260: Port overriding](https://github.com/docker/compose/issues/2260)

## Summary

1. Always use `!override` modifier when overriding `ports:` in override files
2. Docker Compose automatically loads `docker-compose.override.yml`
3. Use `docker compose config` to verify merged configuration
4. Each environment (Reviewer/Coder) has its own override file with unique ports
5. Never commit `docker-compose.override.yml` to git (add to `.gitignore`)

## Port Reference Table

### Complete Port Allocation

| Service | Agent Reviewer | Agent Coder | Notes |
|---------|---------------|-------------|-------|
| **Postgres (Main)** | 5433 | 5434 | Main development database |
| **Postgres (Test)** | 5435 | N/A | Test database (Reviewer only) |
| **Redis (Main)** | 6380 | 6381 | Main cache/sessions |
| **Redis (Test)** | 6382 | N/A | Test cache (Reviewer only) |
| **Backend API** | 3001 | 3002 | Express REST API |
| **Frontend Dev** | 5174 | 5175 | Vite dev server (direct access) |
| **Nginx HTTP** | 8081 | 8082 | Production-like frontend proxy |
| **Nginx HTTPS** | 8444 | 8445 | SSL/TLS frontend proxy |

### Quick Access URLs

**Agent Reviewer (Ubuntu-22.04-Reviewer):**
- Main App: http://localhost:8081
- API: http://localhost:3001/api/v1/health
- Postgres: `psql -h localhost -p 5433 -U charhub -d charhub_db`
- Postgres Test: `psql -h localhost -p 5435 -U charhub -d charhub_test`

**Agent Coder (Ubuntu-24.04-Coder):**
- Main App: http://localhost:8082
- API: http://localhost:3002/api/v1/health
- Postgres: `psql -h localhost -p 5434 -U charhub -d charhub_db`
