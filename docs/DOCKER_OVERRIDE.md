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

| Environment | WSL Distribution | Port Prefix |
|-------------|------------------|-------------|
| Reviewer    | Ubuntu-22.04-Reviewer | 5433, 6380, 3001, 5174, 8081, 8444 |
| Coder       | Ubuntu-24.04-Coder | 5434, 6381, 3002, 5175, 8082, 8445 |

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
# Test Postgres connection (Coder environment)
psql -h 172.22.220.48 -p 5434 -U charhub -d charhub_db

# Test Postgres connection (Reviewer environment)
psql -h 172.22.220.48 -p 5433 -U charhub -d charhub_db

# Test Redis connection (Coder)
redis-cli -h 172.22.220.48 -p 6381 ping

# Test backend API (Coder)
curl http://172.22.220.48:3002/api/v1/health
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
