---
name: database-switch
description: Switch between clean and populated database modes with automatic backup/restore. Use before running tests (clean) or manual testing (populated).
---

# Database Switch

## Purpose

Switch between clean database (for CI-equivalent tests) and populated database (for manual testing) with automatic backup and restore functionality. Preserves your development data while allowing you to test with a fresh database.

## When to Use

Use this skill before:
- Running automated tests that require empty database
- Performing CI-equivalent validation locally
- Running tests that conflict with existing data
- Switching between test environments

## Available Modes

| Mode | Purpose | When to Use |
|------|---------|-------------|
| **clean** | Empty database with schema only | Before running automated tests, CI validation |
| **populated** | Database restored from backup | For manual testing, user acceptance testing |

## Quick Switch

```bash
# Switch to clean database (backs up current data first)
./scripts/database/db-switch.sh clean

# Switch to populated database (restores from backup)
./scripts/database/db-switch.sh populated
```

## How It Works

### Clean Mode Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. CREATE BACKUP of current database                        │
│     → Saves to: /root/backups/charhub-db/populated_backup.sql │
│     → Only creates backup if database has data               │
├─────────────────────────────────────────────────────────────┤
│  2. STOP all services                                         │
├─────────────────────────────────────────────────────────────┤
│  3. REMOVE database volume                                    │
│     → Deletes ALL data                                       │
├─────────────────────────────────────────────────────────────┤
│  4. RESTART services                                          │
├─────────────────────────────────────────────────────────────┤
│  5. RUN migrations                                            │
│     → Creates fresh schema                                   │
│     → Adds system data (admin, bot, narrator)                │
├─────────────────────────────────────────────────────────────┤
│  6. VERIFY services are healthy                               │
└─────────────────────────────────────────────────────────────┘

Result: Empty database (except system data) ready for testing
```

### Populated Mode Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. CHECK backup exists                                       │
│     → Error if no backup found                               │
├─────────────────────────────────────────────────────────────┤
│  2. STOP all services                                         │
├─────────────────────────────────────────────────────────────┤
│  3. REMOVE database volume                                    │
├─────────────────────────────────────────────────────────────┤
│  4. RESTART services                                          │
├─────────────────────────────────────────────────────────────┤
│  5. RUN migrations                                            │
│     → Creates schema                                         │
├─────────────────────────────────────────────────────────────┤
│  6. RESTORE from backup                                       │
│     → Restores all users, characters, configurations        │
├─────────────────────────────────────────────────────────────┤
│  7. VERIFY restoration                                         │
│     → Shows restored counts                                  │
├─────────────────────────────────────────────────────────────┤
│  8. VERIFY services are healthy                               │
└─────────────────────────────────────────────────────────────┘

Result: Database restored with all your development data
```

## Output Examples

### Switching to Clean

```
🔄 Switching to clean database mode...

📋 CLEAN MODE: Empty database for CI-equivalent tests

This mode provides:
  - Backup of current data (to /root/backups/charhub-db/populated_backup.sql)
  - Fresh database schema (via migrations)
  - No seed data
  - Same environment as GitHub Actions CI

💾 Creating backup of current database...
  Users in database: 3
  Backup location: /root/backups/charhub-db/populated_backup.sql
✓ Backup created successfully (15M)

Removing database volume...
Starting database...
Waiting for database to be ready...
Running database migrations...

✅ Switched to CLEAN database
Database is empty and ready for CI-equivalent tests

💡 To restore your data, run:
  ./scripts/database/db-switch.sh populated

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Database switched to clean mode
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏥 Running health checks...
  PostgreSQL: ✓ Running
  Redis:      ✓ Running
  Backend:    ✓ Running
  Frontend:   ✓ Running
```

### Switching to Populated

```
🔄 Switching to populated database mode...

📋 POPULATED MODE: Restore database from backup

This mode provides:
  - Restores data from backup
  - All users, characters, configurations preserved
  - Ready for manual testing

Removing database volume...
Starting database...
Waiting for database to be ready...
Running database migrations...

📥 Restoring database from backup...
  Backup file: /root/backups/charhub-db/populated_backup.sql
  Backup size: 15M

✓ Restore completed
  Users:      3
  Characters: 94

✅ Switched to POPULATED database
Database restored from backup and ready for manual testing

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Database switched to populated mode
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Environment Variables

The script automatically loads PostgreSQL credentials from `.env`:

```bash
# From .env file
POSTGRES_USER=charhub
POSTGRES_PASSWORD=charhub_dev_password
POSTGRES_DB=charhub_db
```

If `.env` is not found or variables are missing, it uses fallback defaults.

## Multi-Agent Compatibility

**This script works correctly in ALL multi-agent environments:**

| Environment | PostgreSQL Port | Script Behavior |
|-------------|-----------------|-----------------|
| charhub-agent-01 | 5401 | ✓ Operates on agent-01 database |
| charhub-agent-02 | 5402 | ✓ Operates on agent-02 database |
| charhub-agent-03 | 5403 | ✓ Operates on agent-03 database |

The script uses `docker compose exec` which always targets the correct database container for the current environment.

**Technical Note**: The script no longer uses hardcoded ports (previous version used port 5401 which caused it to operate on the wrong database in multi-agent environments).

## Backup Location

```
/root/backups/charhub-db/populated_backup.sql
```

**Backup Details**:
- Created automatically when switching to `clean` mode
- Only created if database has data (skips empty databases)
- Size typically 10-20MB depending on data
- Shows creation date and size in output

## System Data

Even in **clean** mode, you'll see some residual data:

```
Users: 2 (admin@charhub.internal, bot@charhub.internal)
Characters: 1 (Narrator)
```

This is **expected behavior** - these are system entities created by database migrations:
- **Admin user**: Required for system administration
- **Bot user**: Used for automated operations
- **Narrator character**: Default character for conversations

Your personal data is fully removed and restored during switches.

## Typical Workflow

### Before Running Tests

```bash
# 1. Switch to clean database
./scripts/database/db-switch.sh clean

# 2. Wait for services to be ready (script handles this)

# 3. Run tests
cd backend && npm test

# 4. Restore your development data
./scripts/database/db-switch.sh populated
```

### Before Manual Testing

```bash
# 1. Ensure database is populated
./scripts/database/db-switch.sh populated

# 2. Wait for services (script handles this)

# 3. Test manually in browser
# Open http://localhost:8402
```

### Before Creating Pull Request

```bash
# 1. Switch to clean for automated testing
./scripts/database/db-switch.sh clean

# 2. Run all tests
cd backend && npm test

# 3. Switch back to populated for review
./scripts/database/db-switch.sh populated

# 4. Create PR
gh pr create --title "feat: ..."
```

## Integration with Workflows

### Agent Coder Workflow

```
Feature Implementation Complete
  ↓
Switch to CLEAN database
  ↓
Run automated tests (npm test)
  ↓
Tests passed?
  ├─ NO → Fix issues, retest
  └─ YES → Switch to POPULATED database
         ↓
         Manual testing / PR creation
```

### Agent Reviewer Workflow

```
PR Received for Review
  ↓
Switch to CLEAN database
  ↓
Run local QA tests
  ↓
Tests passed?
  ├─ NO → Request changes
  └─ YES → Switch to POPULATED database
         ↓
         Manual verification
         ↓
         Approve PR
```

## Troubleshooting

### No Backup Found Error

```
❌ ERROR: No backup found at /root/backups/charhub-db/populated_backup.sql

Cannot restore - no backup exists!
Please run './scripts/database/db-switch.sh clean' first to create a backup.
```

**Solution**: Run `./scripts/database/db-switch.sh clean` first to create a backup.

### Database Connection Errors

```
psql: error: connection to server at "localhost" (::1), port 5432 failed
```

**Solution**:
1. Check PostgreSQL container is running: `docker compose ps postgres`
2. Check health status: `./scripts/ops/health-check.sh`
3. Restart services: `docker compose restart postgres`

### Services Not Starting After Switch

```
Backend: ✗ Not running
```

**Solution**:
1. Check backend logs: `docker compose logs backend`
2. Check for database connection errors
3. Verify migrations completed successfully
4. Restart: `docker compose restart backend`

### Empty Backup Created

```
⚠️  Database is empty, no backup needed
```

**This is not an error** - the script detected an empty database and skipped backup creation.

### Restore Shows Different Counts

If restored counts don't match expected:
1. Check backup file size: `ls -lh /root/backups/charhub-db/populated_backup.sql`
2. Verify backup date is recent: `stat /root/backups/charhub-db/populated_backup.sql`
3. Check for errors in restore output
4. Consider backup may be from an older state

## Best Practices

1. **Always test after switching to clean** - Run tests immediately before data changes
2. **Restore before manual testing** - Ensure you have realistic data to test with
3. **Check backup size** - Verify backup was created (should be 10-20MB)
4. **Monitor health checks** - Script shows health status, verify all services running
5. **Switch before PR** - Always test in clean mode before creating PR
6. **Restore after testing** - Don't leave database in clean mode when done testing

## Related Operations

Other useful database scripts in `scripts/database/`:
- `db-switch.sh` - This script (clean/populated switching)
- `db-copy-from-env.sh` - Copy database from another environment

Other useful scripts in `scripts/`:
- `ops/health-check.sh` - Verify all containers are healthy
- `docker/docker-smart-restart.sh` - Restart Docker services

## Safety Features

✅ **Automatic backup** - Never lose data when switching to clean
✅ **Empty database check** - Skips backup if database is already empty
✅ **Health verification** - Confirms all services running after switch
✅ **Migration safety** - Runs migrations before restore to ensure schema
✅ **Multi-agent safe** - Works correctly in all agent environments
✅ **Environment aware** - Loads credentials from .env automatically

---

Remember: **Clean for Tests, Populated for Manual Testing**

Always switch to clean mode before running automated tests, and restore to populated mode before manual testing. This ensures your tests run in a consistent environment while preserving your development data.
