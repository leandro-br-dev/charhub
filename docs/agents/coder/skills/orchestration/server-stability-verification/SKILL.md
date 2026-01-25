---
name: server-stability-verification
description: Verify server stability and health after development. Use after implementation is complete to ensure backend and frontend services are running correctly and are stable before proceeding to testing.
---

# Server Stability Verification

## Purpose

Ensure that after development, the server environment is stable, healthy, and ready for manual testing. This includes verifying Docker containers, database connections, and service health.

## When to Use

- AFTER development-coordination (implementation complete)
- BEFORE requesting manual testing from user
- After any code changes that affect server behavior
- When containers need to be restarted or rebuilt

## Pre-Conditions

✅ Backend and frontend code changes complete
✅ All builds and lint passing
✅ i18n translations compiled

## Verification Steps

### Step 1: Docker Container Health Check

**Check container status**:
```bash
docker compose ps
```

**Expected output**: All services should be "Up" and healthy

**Services to verify**:
- [ ] `backend` - Running and healthy
- [ ] `frontend` - Running and healthy
- [ ] `postgres` - Running and accepting connections
- [ ] `redis` - Running and accepting connections

**If any service is NOT running**:
- Check logs: `docker compose logs {service-name}`
- Identify the issue
- Fix or restart as needed
- Re-verify all services

### Step 2: Restart Strategy

**Decide restart approach** based on what changed:

**Scenario A: Code changes only (NO Dockerfile, package.json, prisma/schema changes)**
```bash
# Simple restart - NO rebuild
docker compose down
docker compose up -d
```

**Scenario B: Dockerfile, package.json, or prisma/schema changed**
```bash
# Rebuild specific service that changed
docker compose up -d --build {backend|frontend}
```

**Scenario C: Unsure or want to be safe**
```bash
# Use smart restart script
./scripts/docker-smart-restart.sh
```

### Step 3: Database Migration Verification

**CRITICAL**: Ensure database schema is up to date

```bash
cd backend
npx prisma migrate deploy
```

**Verify migrations applied**:
```bash
npx prisma migrate status
```

**Expected output**: All migrations applied

### Step 4: Backend Health Check

**Check backend is responding**:
```bash
# Check backend logs for errors
docker compose logs backend | tail -50

# Verify backend started successfully
docker compose logs backend | grep "Application is running"
```

**Test backend API** (if running):
```bash
# Health check endpoint
curl http://localhost:3001/health

# Or check if port is listening
curl http://localhost:3001/
```

**Look for**:
- ✅ No startup errors
- ✅ Database connection successful
- ✅ Redis connection successful
- ✅ API listening on correct port

### Step 5: Frontend Health Check

**Check frontend is serving**:
```bash
# Check frontend logs for errors
docker compose logs frontend | tail -50

# Verify frontend compiled successfully
docker compose logs frontend | grep "Local:"
```

**Test frontend access**:
```bash
# Check if frontend is accessible
curl -I http://localhost:3000/
```

**Look for**:
- ✅ No compilation errors
- ✅ Vite dev server running
- ✅ Can access frontend URL

### Step 6: Service Integration Check

**Verify services can communicate**:
```bash
# Check backend can reach database
docker compose logs backend | grep "database"

# Check backend can reach redis
docker compose logs backend | grep "redis"
```

**Look for**:
- ✅ No connection errors
- ✅ Successful connection messages

### Step 7: Quick Smoke Test

**Perform quick functionality check**:
```bash
# Test a simple API endpoint
curl http://localhost:3001/api/health

# Or check if backend responds to basic request
curl http://localhost:3001/
```

**Expected**: Response from backend (not connection refused)

## Common Issues and Fixes

### Issue: Container Won't Start

**Symptoms**: Service status shows "Exit" or keeps restarting

**Diagnosis**:
```bash
docker compose logs {service-name}
```

**Common fixes**:
1. **Port conflict**: Another service using the port
2. **Build failure**: Code has compilation errors
3. **Dependency missing**: Need to rebuild with --build
4. **Volume issue**: Database volume corrupted (rare)

### Issue: Database Connection Errors

**Symptoms**: Backend logs show "can't reach database"

**Fixes**:
1. Verify postgres container is running
2. Check database is ready: `docker compose logs postgres`
3. Restart backend after postgres is fully up
4. Verify DATABASE_URL environment variable

### Issue: Frontend Shows Blank Page

**Symptoms**: Frontend loads but nothing displays

**Fixes**:
1. Check browser console for errors
2. Check frontend logs for compilation errors
3. Verify API endpoint is correct
4. Clear browser cache and reload

### Issue: "Module not found" Errors

**Symptoms**: Backend or frontend can't find dependencies

**Fixes**:
1. Rebuild with --build flag
2. Check package.json didn't change incorrectly
3. Verify node_modules is properly installed in container

## Stability Criteria

**Server is considered STABLE when**:
- ✅ All containers are "Up" (not restarting)
- ✅ No errors in recent logs (last 50 lines)
- ✅ Backend responds to HTTP requests
- ✅ Frontend loads without errors
- ✅ Database migrations applied
- ✅ No connection errors between services

**Server is UNSTABLE if**:
- ❌ Any container is restarting/exited
- ❌ Errors in logs (connection failed, compilation failed)
- ❌ Backend doesn't respond to requests
- ❌ Frontend has runtime errors
- ❌ Database migrations not applied

## If Server is Unstable

**Process**:
1. Identify which service is failing
2. Check logs for specific error
3. Determine root cause
4. Apply appropriate fix
5. Restart affected services
6. Re-verify ALL services
7. Only proceed when ALL are stable

**Do NOT proceed to manual testing if server is unstable**

## Integration with Workflow

This skill is the **FOURTH STEP** in the Agent Coder workflow:

```
1. feature-analysis-planning
   ↓
2. git-branch-management
   ↓
3. development-coordination
   ↓
4. server-stability-verification (THIS SKILL)
   ↓
5. manual-testing-protocol
   ↓
... (continue workflow)
```

## Output Format

When server-stability-verification is complete, report:

**Container Status**:
```
Service    Status    Health
---------  --------  -------
backend    Up        Healthy
frontend   Up        Healthy
postgres   Up        Healthy
redis      Up        Healthy
```

**Verification Results**:
- [ ] Container health check: PASS/FAIL
- [ ] Database migrations: PASS/FAIL
- [ ] Backend health check: PASS/FAIL
- [ ] Frontend health check: PASS/FAIL
- [ ] Service integration: PASS/FAIL

**Overall Stability**: STABLE / UNSTABLE

**If STABLE**:
```
"✅ Server is stable and ready for manual testing!

All services:
- Backend: Running on http://localhost:3001
- Frontend: Running on http://localhost:3000
- Database: Migrations applied
- Redis: Connected

Ready for manual testing phase."
```

**If UNSTABLE**:
```
"❌ Server is unstable. Issues found:

{list_of_issues}

Fixing issues...
{actions_taken}

Re-verifying...
{re_verification_results}

Proceeding to manual testing."
```

## Common Pitfalls

**❌ DON'T**:
- Skip container health verification
- Ignore errors in logs
- Proceed to testing with unstable server
- Forget to run database migrations
- Use --build unnecessarily (causes cache bloat)

**✅ DO**:
- Verify ALL containers are healthy
- Check logs for any errors
- Fix unstable issues before proceeding
- Run migrations before testing
- Use appropriate restart strategy

## Quick Reference Commands

```bash
# Check all containers
docker compose ps

# View service logs
docker compose logs {service}
docker compose logs -f {service}  # Follow logs

# Restart services (smart)
./scripts/docker-smart-restart.sh

# Restart specific service
docker compose up -d --build {service}

# Database migrations
cd backend && npx prisma migrate deploy

# Check migrations status
npx prisma migrate status

# Health check script (if exists)
./scripts/health-check.sh
```

## Handoff to Next Phase

When server is verified as stable:

**Next skill**: manual-testing-protocol

**Message to user**:
```
"✅ Server stability verified!

All services are running and healthy:
• Backend: http://localhost:3001
• Frontend: http://localhost:3000
• Database: Ready
• Redis: Connected

Ready for manual testing. Please test the new feature(s) and report back.

What you can test:
{list_of_new_features_to_test}

When ready, let me know if testing passed or if you found any issues."
```
