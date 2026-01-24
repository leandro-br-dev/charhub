---
name: container-health-check
description: Verify Docker containers are healthy before critical operations. Use before testing, deployment, or user acceptance testing.
---

# Container Health Check

## Purpose

Verify all Docker containers are running and healthy before performing critical operations like testing, deployment, or user acceptance testing.

## When to Use

Use this skill before:
- Running automated tests
- Creating Pull Requests
- Deploying to production
- User acceptance testing
- Any operation that requires healthy services

## Quick Check

```bash
# Quick health check
./scripts/ops/health-check.sh

# Wait for services to become healthy (up to 2 minutes)
./scripts/ops/health-check.sh --wait
```

## What Gets Checked

### Service Status

The script checks the following services:

| Service | Health Check |
|---------|---------------|
| **PostgreSQL** | Container status (Up/Down) |
| **Redis** | Container status (Up/Down) |
| **Backend** | Container status + log analysis |
| **Frontend** | Container status (Up/Down) |

### Backend Log Analysis

Additional checks for backend service:
- **Restart loop detection** - Checks if backend is restarting repeatedly
- **Error scanning** - Searches for errors in recent logs (last 50 lines)

## Output Examples

### All Services Healthy

```
🏥 Docker Services Health Check

  postgres: ✓ Healthy (Up)
  redis: ✓ Healthy (Up)
  backend: ✓ Healthy (Up)
  frontend: ✓ Healthy (Up)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ All services are healthy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Safe to proceed with:
  ✓ Creating Pull Requests
  ✓ Running tests
  ✓ User acceptance testing
  ✓ Deployment
```

### Services Not Healthy

```
🏥 Docker Services Health Check

  postgres: ✓ Healthy (Up)
  redis: ✗ Not healthy (Exit)
  backend: ✓ Healthy (Up)
  frontend: ✗ Not healthy (Down)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✗ Some services are not healthy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO NOT proceed with:
  ✗ Creating Pull Requests
  ✗ User acceptance testing
  ✗ Deployment

Actions required:
  1. Check logs: docker compose logs <service>
  2. Fix issues causing unhealthy status
  3. Restart services: docker compose restart <service>
  4. Run this check again: ./scripts/ops/health-check.sh

Common issues:
  - Backend restart loop: Check for code errors or missing env vars
  - Database connection failed: Verify DATABASE_URL in .env
  - Redis connection failed: Check if Redis is running
```

## Exit Codes

- **0** - All services healthy
- **1** - One or more services not healthy

## Usage in Scripts

### Before Running Tests

```bash
# Ensure services are healthy before testing
./scripts/ops/health-check.sh || exit 1

# Run tests
npm test
```

### Before Deployment

```bash
# Verify production environment health
./scripts/ops/health-check.sh || exit 1

# Proceed with deployment
./scripts/docker/deploy.sh
```

### Wait Mode

When starting services, use `--wait` to pause until services are ready:

```bash
# Start services
docker compose up -d

# Wait for services to become healthy (up to 2 minutes)
./scripts/ops/health-check.sh --wait

# Then proceed with operations
npm test
```

## Integration with Workflows

### Agent Coder Workflow

```
1. Development Complete
2. Check container health → ./scripts/ops/health-check.sh
3. If healthy → Run tests
4. If not healthy → Fix issues and recheck
```

### Agent Reviewer Workflow

```
1. PR Approved
2. Check container health → ./scripts/ops/health-check.sh
3. If healthy → Deploy
4. If not healthy → Block deployment
```

## Troubleshooting

### Service Shows "Not Healthy" But Containers Are Running

**Check individual service logs**:
```bash
docker compose logs backend
docker compose logs postgres
docker compose logs redis
docker compose logs frontend
```

### Backend Restart Loop

**Symptoms**: Backend shows "Up" but keeps restarting

**Check for errors**:
```bash
docker compose logs backend --tail=100 | grep -i error
```

**Common causes**:
- Missing environment variables
- Database connection failure
- Code syntax errors (TypeScript compilation fails)
- Port conflicts

### Database Connection Failed

**Verify .env configuration**:
```bash
# Check DATABASE_URL
cat backend/.env | grep DATABASE_URL

# Verify postgres is accessible
docker compose exec postgres psql -U postgres -c "SELECT 1"
```

### Redis Connection Failed

**Check Redis status**:
```bash
docker compose exec redis redis-cli ping
# Should return: PONG
```

## Best Practices

1. **Always check before critical operations** - Run health check before testing, deployment, or UAT

2. **Use wait mode after starting services** - Use `--wait` after `docker compose up -d` to ensure services are ready

3. **Fix issues before proceeding** - Don't ignore unhealthy services; fix the root cause first

4. **Check logs for context** - When services are unhealthy, always check logs to understand why

5. **Restart services after fixes** - After fixing issues, restart affected services and recheck

## Related Operations

Other useful scripts in `scripts/`:
- `docker/docker-smart-restart.sh` - Smart restart with health check
- `docker/docker-space-check.sh` - Check Docker disk usage
- `docker/docker-cleanup-quick.sh` - Quick cleanup of Docker cache

---

Remember: **Healthy Services = Reliable Operations**

Always verify container health before critical operations to avoid failed tests, broken deployments, or wasted time.
