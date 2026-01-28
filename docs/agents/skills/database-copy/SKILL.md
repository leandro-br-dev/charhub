---
name: database-copy
description: Safely copy database between environments (agent-01, agent-02, agent-03, reviewer). Use after running tests, recovering from data loss, or syncing environments.
---

# Database Copy

## Purpose

Safely copy database from another environment (agent-01, agent-02, agent-03, reviewer) to your current environment using PostgreSQL network operations. This script performs a read-only dump from the source and restores it to the destination, with automatic verification to ensure data integrity.

## When to Use

Use this skill:
- **After running tests** - Restore populated data to continue development
- **Recovering from accidental data loss** - Copy data from another environment
- **Syncing environments** - Ensure multiple agents have consistent data
- **Setting up new environment** - Bootstrap with existing data
- **Testing with production-like data** - Copy from reviewer or production

## Safety Features

- **Read-only source access** - Source database is never modified, only read via pg_dump
- **Automatic verification** - Verifies minimum 10 characters exist in source before copying
- **Data integrity checks** - Counts users, characters, and stories before and after copy
- **Network-based** - Uses PostgreSQL network connection, never mounts volumes directly
- **Graceful backend handling** - Stops destination backend before restore, restarts after

## Quick Reference

### Environment Ports

| Environment | PostgreSQL Port | Project Path |
|-------------|-----------------|--------------|
| **agent-01** | 5401 | /root/projects/charhub-agent-01 |
| **agent-02** | 5402 | /root/projects/charhub-agent-02 |
| **agent-03** | 5403 | /root/projects/charhub-agent-03 |
| **reviewer** | 5404 | /root/projects/charhub-reviewer |

## Usage

### Basic Syntax

```bash
./scripts/database/db-copy-from-env.sh <source-env> <source-port> <dest-env> <dest-port>
```

### Examples

```bash
# Copy from agent-03 to agent-02
./scripts/database/db-copy-from-env.sh agent-03 5403 agent-02 5402

# Copy from agent-03 to agent-01
./scripts/database/db-copy-from-env.sh agent-03 5403 agent-01 5401

# Copy from reviewer to agent-02
./scripts/database/db-copy-from-env.sh reviewer 5404 agent-02 5402
```

## How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. VALIDATE PARAMETERS                                              │
│     → Check source-env, source-port, dest-env, dest-port provided   │
│     → Verify destination project directory exists                   │
├─────────────────────────────────────────────────────────────────────┤
│  2. SAFETY CHECKS                                                   │
│     → Check source database accessible via network                  │
│     → Verify source has data (users AND characters)                 │
│     → Validate minimum 10 characters in source                      │
├─────────────────────────────────────────────────────────────────────┤
│  3. STOP DESTINATION BACKEND                                        │
│     → Prevents connection conflicts during restore                   │
├─────────────────────────────────────────────────────────────────────┤
│  4. CREATE DUMP FROM SOURCE                                         │
│     → pg_dump from source (read-only, network connection)           │
│     → Saves to: /tmp/charhub_dump_<env>_<timestamp>.sql             │
├─────────────────────────────────────────────────────────────────────┤
│  5. RESTORE TO DESTINATION                                          │
│     → psql restore to destination database                          │
│     → Uses --clean --if-exists to replace existing data             │
├─────────────────────────────────────────────────────────────────────┤
│  6. VERIFY RESTORED DATA                                            │
│     → Count restored users, characters, stories                     │
│     → Compare with source counts                                    │
├─────────────────────────────────────────────────────────────────────┤
│  7. RESTART DESTINATION BACKEND                                     │
│     → Services automatically reconnect                              │
├─────────────────────────────────────────────────────────────────────┤
│  8. CLEANUP                                                         │
│     → Prompt to delete dump file (optional to keep)                 │
└─────────────────────────────────────────────────────────────────────┘
```

## Output Examples

### Successful Copy

```
🔒 Running safety checks...

Checking source database at localhost:5403...
✓ Source database accessible
Verifying source has data...
✓ Source has 3 users and 94 characters
✓ Database is complete and ready to copy

🛑 Stopping agent-02 backend...
📦 Creating dump from agent-03...
✓ Dump created: 15234 lines
  File: /tmp/charhub_dump_agent-03_20260128_143022.sql

📥 Restoring dump to agent-02...
Destination postgres port: 5402
✓ Restore completed

🔍 Verifying restored data...
  Users:      3
  Characters: 94
  Stories:    12

🚀 Restarting agent-02 backend...

Delete dump file? (Y/n): y
✓ Dump file deleted

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Database copy completed successfully
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Source: agent-03 (3 users)
Destination: agent-02 (3 users, 94 characters, 12 stories)

agent-02 is ready for testing!
```

### Error: Source Not Accessible

```
🔒 Running safety checks...
Checking source database at localhost:5403...
❌ ERROR: Source database not accessible at localhost:5403

Make sure the source environment is running:
  cd /root/projects/charhub-agent-03
  docker compose ps postgres
```

### Error: Source Incomplete

```
🔒 Running safety checks...
Checking source database at localhost:5402...
✓ Source database accessible
Verifying source has data...
✓ Source has 2 users and 3 characters

❌ ERROR: Source database is incomplete (3 characters < 10 minimum)

This likely means the source environment is in 'test' mode.
Please switch the source to 'populated' mode first:
  cd /root/projects/charhub-agent-02
  ./scripts/database/db-switch.sh populated

Minimum requirements for a valid populated database:
  • 10+ characters
  • 2+ users
```

## Common Workflows

### After Running Tests

```bash
# 1. Tests leave database in clean state
cd backend && npm test

# 2. Copy populated data from another environment
cd /root/projects/charhub-agent-02
./scripts/database/db-copy-from-env.sh agent-03 5403 agent-02 5402

# 3. Continue development with realistic data
```

### Recover from Data Loss

```bash
# Accidentally ran docker compose down -v and lost data?
# No problem - copy from another environment:

./scripts/database/db-copy-from-env.sh agent-03 5403 agent-01 5401
```

### Sync All Environments

```bash
# Ensure all agents have consistent data from agent-03

# From agent-01
cd /root/projects/charhub-agent-01
./scripts/database/db-copy-from-env.sh agent-03 5403 agent-01 5401

# From agent-02
cd /root/projects/charhub-agent-02
./scripts/database/db-copy-from-env.sh agent-03 5403 agent-02 5402

# From reviewer
cd /root/projects/charhub-reviewer
./scripts/database/db-copy-from-env.sh agent-03 5403 reviewer 5404
```

### Bootstrap New Environment

```bash
# Setting up agent-04 for the first time?
# Copy data from an existing environment:

cd /root/projects/charhub-agent-04
./scripts/database/db-copy-from-env.sh agent-03 5403 agent-04 5405
```

## Troubleshooting

### Source Database Not Accessible

**Symptoms**: `Source database not accessible at localhost:5403`

**Solution**:
1. Verify source environment is running:
   ```bash
   cd /root/projects/charhub-agent-03
   docker compose ps postgres
   ```
2. Start source environment if needed:
   ```bash
   docker compose up -d postgres
   ```
3. Verify port is correct:
   ```bash
   nc -z localhost 5403 && echo "Port accessible" || echo "Port not accessible"
   ```

### Destination Project Not Found

**Symptoms**: `Destination project directory not found`

**Solution**:
1. Verify destination environment exists:
   ```bash
   ls -la /root/projects/charhub-*
   ```
2. Check environment name spelling
3. Ensure you have access to the destination directory

### Character Count Below Minimum

**Symptoms**: `Source database is incomplete (X characters < 10 minimum)`

**Solution**:
1. Switch source to populated mode:
   ```bash
   cd /root/projects/charhub-agent-03
   ./scripts/database/db-switch.sh populated
   ```
2. Wait for restore to complete
3. Retry the copy operation

### Restore Shows Errors

**Symptoms**: Error messages during restore phase

**Common causes**:
- Schema mismatch between environments
- Missing migrations on destination
- Network interruption during copy

**Solution**:
1. Verify both environments have same schema version:
   ```bash
   cd /root/projects/charhub-agent-03/backend
   npx prisma migrate status
   ```
2. If mismatch, run migrations on destination first:
   ```bash
   cd /root/projects/charhub-agent-02/backend
   npx prisma migrate deploy
   ```
3. Retry the copy operation

### Backend Not Starting After Copy

**Symptoms**: Backend fails to start after restore

**Solution**:
1. Check backend logs:
   ```bash
   cd /root/projects/charhub-agent-02
   docker compose logs backend
   ```
2. Look for database connection errors
3. Restart backend manually:
   ```bash
   docker compose restart backend
   ```
4. If persistent, check database schema matches code expectations

## Best Practices

1. **Always verify source has data** - Script checks this automatically, but be aware of the 10 character minimum

2. **Stop destination backend before copy** - Script handles this automatically

3. **Use after tests, not before** - This is for restoring data, not backing it up

4. **Keep dump files for debugging** - When prompted, choose 'n' to keep the file if you need to investigate

5. **Verify destination environment** - Ensure destination project exists and is accessible before starting

6. **Sync after schema changes** - After pulling schema changes, copy from an environment that has migrated

7. **Never use -v flag** - Remember: `docker compose down` (without -v) to preserve data

## Important Notes

### Do Not Use docker-compose down -v

**CRITICAL**: Never use the `-v` flag with `docker compose down` as it deletes database volumes:

```bash
# WRONG - Deletes all data!
docker compose down -v

# CORRECT - Preserves data
docker compose down
```

If you accidentally use `-v`, use this skill to restore from another environment.

### Use db-switch.sh for Local Backup/Restore

For backing up and restoring data **within the same environment**, use the `database-switch` skill:

```bash
# Backup and restore locally
./scripts/database/db-switch.sh clean      # Creates backup
./scripts/database/db-switch.sh populated  # Restores from backup
```

Use `database-copy` only when copying **between different environments**.

### Minimum Data Requirements

The script enforces minimum requirements to prevent copying incomplete databases:
- **10+ characters** - Ensures meaningful test data exists
- **2+ users** - Ensures proper user relationships exist

These requirements prevent copying empty or near-empty databases that would require additional setup.

## Related Operations

Other useful database scripts in `scripts/database/`:
- `db-switch.sh` - Switch between clean and populated database modes (local backup/restore)
- `db-copy-from-env.sh` - This script (copy between environments)

Other useful scripts in `scripts/`:
- `ops/health-check.sh` - Verify all containers are healthy
- `agents/setup-agent.sh` - Switch between agent profiles

## Technical Details

### PostgreSQL Commands Used

**pg_dump** (source):
```bash
pg_dump -h localhost -p 5403 -U charhub -d charhub_db \
  --clean --if-exists --no-owner --no-acl > dump.sql
```

**psql restore** (destination):
```bash
psql -h localhost -p 5402 -U charhub -d charhub_db < dump.sql
```

**Verification queries**:
```bash
psql -t -c "SELECT COUNT(*) FROM \"User\";"
psql -t -c "SELECT COUNT(*) FROM \"Character\";"
psql -t -c "SELECT COUNT(*) FROM \"Story\";"
```

### Network Access

The script uses PostgreSQL network access (not volume mounting):
- Source: Read-only access via `pg_dump` on `localhost:<source-port>`
- Destination: Write access via `psql` on `localhost:<dest-port>`
- No direct volume manipulation (100% safe for source)

### Temporary Files

Dump files are created in `/tmp/` with format:
```
/tmp/charhub_dump_<source-env>_<timestamp>.sql
```

Typical size: 10-20MB depending on data volume.

---

Remember: **Copy Between Environments, Switch Within Environment**

Use `database-copy` to copy data between different agent environments, and `database-switch` to backup and restore data within the same environment.
