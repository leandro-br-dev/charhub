---
name: test-environment-preparation
description: Prepare the test environment by managing database state for automated testing. Use before running automated tests to ensure a clean test database that can be restored after testing.
---

# Test Environment Preparation

## Purpose

Prepare the test environment for automated testing by managing database state using the `db-switch.sh` script. This ensures tests run against a clean database without affecting development data.

## When to Use

- BEFORE running automated test suite
- AFTER parallel-tasks-execution (tests and documentation created)
- When you need a clean database for testing
- When you need to isolate test data from development data

## Pre-Conditions

✅ Automated tests have been created (by test-writer)
✅ Documentation has been created (by coder-doc-specialist)
✅ Server is stable and running

## The db-switch.sh Script

**Location**: `./scripts/database/db-switch.sh`

**Purpose**: Manage database states for development and testing

**Available commands**:
```bash
./scripts/database/db-switch.sh clean      # Create clean test database
./scripts/database/db-switch.sh populated  # Restore development database from backup
./scripts/database/db-switch.sh status     # Check current database state
```

## Environment Preparation Workflow

### Step 1: Verify Current Database State

**Check what database is currently active**:
```bash
./scripts/database/db-switch.sh status
```

**Expected output examples**:
```
"Current database: development"
or
"Current database: test"
```

**If output shows "test" database**:
- A test database already exists
- You may need to clean it or create fresh
- Proceed based on testing needs

### Step 2: Backup Development Database

**ALWAYS backup before switching to test database**:
```bash
./scripts/database/db-switch.sh backup
```

**What this does**:
- Creates a backup of current development database
- Stores it with timestamp for restoration
- Ensures no data loss if something goes wrong

**Verify backup was created**:
```bash
# Should show backup files
ls -la ./backups/db/
```

### Step 3: Create Clean Test Database

**Switch to clean test database**:
```bash
./scripts/database/db-switch.sh clean
```

**What this does**:
- Creates a new clean database for testing
- Copies schema from development database
- Does NOT copy data (starts empty/with seed data)
- Switches active database to test database

**Expected output**:
```
"Test database created and activated.
Schema copied from development.
Database is ready for testing."
```

**Verify test database is active**:
```bash
./scripts/database/db-switch.sh status
# Should show: "Current database: test"
```

### Step 4: Verify Database Connectivity

**Ensure applications can connect to test database**:
```bash
# Check backend can connect
docker compose logs backend | grep "database"

# Should show successful connection
# No connection errors
```

**If connection errors**:
- Restart backend: `docker compose restart backend`
- Verify DATABASE_URL points to test database
- Check test database container is running

### Step 5: Apply Migrations to Test Database

**CRITICAL**: Ensure test database schema is up to date
```bash
cd backend
npx prisma migrate deploy
```

**What this does**:
- Applies any pending migrations to test database
- Ensures schema matches current code
- Prevents test failures due to schema mismatch

**Verify migrations applied**:
```bash
npx prisma migrate status
```

**Expected**: All migrations applied, no pending

### Step 6: Verify Test Environment

**Quick verification that everything is ready**:
```bash
# Test database active
./scripts/database/db-switch.sh status

# Containers running
docker compose ps

# Backend connected to test database
docker compose logs backend | tail -20

# Migrations applied
cd backend && npx prisma migrate status
```

**All should show**: Ready for testing

## During Testing

**Tests are now running against test database**:
- Test data is isolated
- Development data is safe
- Tests can modify data freely

**DO NOT**:
- Switch databases during testing
- Modify development data while tests run
- Stop containers during testing

**After tests complete**:
- Proceed to restore step

## Restore Development Database

### Step 1: Verify Tests Are Complete

**Ensure**:
- All tests have finished running
- Test results are recorded
- No more test execution needed

### Step 2: Restore Development Database

**Switch back to development database**:
```bash
./scripts/database/db-switch.sh populated
```

**What this does**:
- Switches active database back to development
- Test database remains available for future testing
- Development data is as it was before testing

**Verify restoration**:
```bash
./scripts/database/db-switch.sh status
# Should show: "Current database: development"
```

### Step 3: Verify Development Environment

**Ensure development environment is healthy**:
```bash
# Containers running
docker compose ps

# Backend connected to development database
docker compose logs backend | tail -20

# Quick smoke test
curl http://localhost:3001/health
```

**All should show**: Development environment ready

## Integration with Workflow

This skill is used **DURING** the parallel-tasks-execution phase:

```
5. manual-testing-protocol (user confirmed tests passed)
   ↓
6. parallel-tasks-execution
   │
   ├─→ 6a. Create tests and documentation (parallel)
   │   └─→ test-writer + coder-doc-specialist
   │
   ├─→ 6b. TEST ENVIRONMENT PREPARATION (THIS SKILL)
   │   └─→ ./scripts/database/db-switch.sh clean
   │
   ├─→ 6c. Run automated tests
   │   └─→ npm test (backend + frontend)
   │
   └─→ 6d. Restore development database
       └─→ ./scripts/database/db-switch.sh populated
   ↓
7. pr-readiness-checklist
```

## Troubleshooting

### Issue: db-switch.sh command not found

**Symptom**: `bash: ./scripts/database/db-switch.sh: No such file or directory`

**Fixes**:
1. Verify script exists: `ls -la scripts/db-switch.sh`
2. Make sure you're in project root directory
3. Check script is executable: `chmod +x scripts/db-switch.sh`

### Issue: Backup creation fails

**Symptom**: Error when running `./scripts/database/db-switch.sh backup`

**Possible causes**:
- Disk space full
- Database container not running
- Permissions issue

**Fixes**:
1. Check disk space: `df -h`
2. Verify postgres container: `docker compose ps`
3. Check logs: `docker compose logs postgres`

### Issue: Test database creation fails

**Symptom**: Error when running `./scripts/database/db-switch.sh clean`

**Possible causes**:
- Development database has issues
- Schema migration problems
- Container not healthy

**Fixes**:
1. Check development database is healthy
2. Verify migrations work on development
3. Check postgres logs: `docker compose logs postgres`

### Issue: Backend won't connect after switch

**Symptom**: Backend logs show database connection errors

**Fixes**:
1. Restart backend: `docker compose restart backend`
2. Wait a few seconds for backend to start up
3. Check logs again: `docker compose logs backend`
4. Verify DATABASE_URL environment variable

### Issue: Tests fail with schema errors

**Symptom**: Tests fail with "table does not exist" or similar

**Fixes**:
1. Run migrations on test database: `cd backend && npx prisma migrate deploy`
2. Verify migrations applied: `npx prisma migrate status`
3. Re-run tests

## Output Format

### Before Preparation

```
"Preparing test environment...

Current state:
• Database: {development/test}
• Containers: {status}

Steps:
1. Backup development database
2. Create clean test database
3. Apply migrations
4. Verify connectivity

Starting preparation..."
```

### After Preparation

```
"✅ Test environment ready!

Database:
• Development database: Backed up
• Test database: Created and activated
• Migrations: Applied

Containers:
• Backend: Connected to test database
• Frontend: Running
• Postgres: Running

Ready to run automated tests."
```

### After Restoration

```
"✅ Development environment restored!

Database:
• Test database: Preserved for future use
• Development database: Activated

Containers:
• All services: Running
• Backend: Connected to development database

Development environment ready."
```

## Common Pitfalls

**❌ DON'T**:
- Skip backup step before switching
- Run tests against development database
- Forget to restore after testing
- Switch databases while tests are running
- Delete test database (keep for reuse)

**✅ DO**:
- ALWAYS backup before clean
- ALWAYS use clean test database for tests
- ALWAYS restore after testing complete
- Verify database state after each operation
- Keep test database for future test runs

## Quick Reference Commands

```bash
# Check current database
./scripts/database/db-switch.sh status

# Backup development database
./scripts/database/db-switch.sh backup

# Create clean test database
./scripts/database/db-switch.sh clean

# Restore development database
./scripts/database/db-switch.sh populated

# List backups
ls -la ./backups/db/

# Verify migrations (when in test database)
cd backend && npx prisma migrate deploy
cd backend && npx prisma migrate status
```

## Handoff

### When Preparation Complete

**Continue to**: Run automated tests (within parallel-tasks-execution)

**Message**:
```
"✅ Test environment prepared!

Clean test database ready.
Running automated tests now..."
```

### When Restoration Complete

**Continue to**: pr-readiness-checklist

**Message**:
```
"✅ Development environment restored!

Test database preserved for future use.
Proceeding to PR readiness checklist."
```
