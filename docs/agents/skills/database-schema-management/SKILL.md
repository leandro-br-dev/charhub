---
name: database-schema-management
description: CRITICAL rules for database schema changes, migrations, and preventing manual database modifications. Available to all agents.
---

# Database Schema Management

## Purpose

Define **MANDATORY** rules for database schema changes to ensure consistency, reproducibility, and prevent production incidents.

## The Golden Rule

**NEVER execute SQL commands directly on the database to change schema.**

All schema changes MUST go through Prisma migrations. Manual SQL commands:
- Are NOT reproducible in production
- Have NO version control
- Create drift between environments
- Cause deployment failures
- Are IMPOSSIBLE to rollback safely

---

## Critical Rules

### For ALL Agents

| Rule | Description |
|------|-------------|
| **NO MANUAL SQL** | NEVER run ALTER TABLE, CREATE INDEX, etc. directly |
| **MIGRATIONS ONLY** | All schema changes via `npx prisma migrate dev` |
| **VERIFY MIGRATIONS** | Always check if schema changes have corresponding migrations |
| **SYNC CHECK** | Run `npx prisma migrate status` to verify sync |

### For Agent Coder

When modifying `schema.prisma`:

```bash
# 1. ALWAYS create migration IMMEDIATELY after schema change
npx prisma migrate dev --name descriptive_name

# 2. VERIFY migration was created
ls -la prisma/migrations/ | tail -5

# 3. VERIFY migration contains your changes
cat prisma/migrations/LATEST_FOLDER/migration.sql
```

**MANDATORY Checklist before PR:**
- [ ] Modified `schema.prisma`? → Migration MUST exist
- [ ] Migration file contains expected SQL changes
- [ ] `npx prisma migrate status` shows "Database schema is up to date"
- [ ] Tests pass with migration applied

### For Agent Reviewer

When reviewing PRs with schema changes:

```bash
# 1. Check if schema.prisma was modified
git diff origin/main...HEAD --name-only | grep schema.prisma

# 2. If YES, check for corresponding migration
git diff origin/main...HEAD --name-only | grep "prisma/migrations"

# 3. Verify migration content matches schema changes
# Compare schema.prisma changes with migration.sql
```

**MANDATORY Checklist during review:**
- [ ] Schema changed? → Migration file MUST exist in PR
- [ ] Migration timestamp is 2026 (not 2025)
- [ ] Migration SQL matches schema changes
- [ ] After checkout: `npx prisma migrate deploy` succeeds
- [ ] Tests pass after migration applied

---

## Schema Change Workflow

### Correct Workflow (Agent Coder)

```
1. Modify prisma/schema.prisma
   ↓
2. Run: npx prisma migrate dev --name add_field_to_table
   ↓
3. Verify: Migration created in prisma/migrations/
   ↓
4. Verify: Migration SQL is correct
   ↓
5. Run tests: npm test
   ↓
6. Commit BOTH schema.prisma AND migration folder
   ↓
7. Create PR
```

### Correct Workflow (Agent Reviewer)

```
1. Checkout PR branch
   ↓
2. Check: git diff origin/main...HEAD --name-only
   ↓
3. If schema.prisma changed:
   ├─ Verify migration exists in PR
   ├─ Verify migration SQL is correct
   └─ If NO migration → BLOCK PR, request migration
   ↓
4. Apply migrations: npx prisma migrate deploy
   ↓
5. Run tests: npm test
   ↓
6. Continue with review
```

---

## Common Mistakes and Prevention

### Mistake 1: Schema Change Without Migration

**Wrong:**
```bash
# Modified schema.prisma
# Did NOT run: npx prisma migrate dev
# Created PR without migration
```

**Correct:**
```bash
# Modified schema.prisma
npx prisma migrate dev --name add_new_column
# Verified migration created
# Created PR with both changes
```

### Mistake 2: Manual SQL to "Fix" Missing Migration

**ABSOLUTELY FORBIDDEN:**
```sql
-- NEVER DO THIS
ALTER TABLE "SomeTable" ADD COLUMN "newColumn" TEXT;
CREATE INDEX "SomeTable_newColumn_idx" ON "SomeTable"("newColumn");
```

**Correct Fix:**
```bash
# 1. Create the migration properly
npx prisma migrate dev --name add_new_column

# 2. If drift exists, resolve it:
npx prisma migrate resolve --applied MIGRATION_NAME
# OR
npx prisma migrate reset # (ONLY in development, loses all data!)
```

### Mistake 3: Copying Database Without Checking Migrations

**Wrong:**
```bash
# Copied database from another environment
# Did NOT check migration status
# Schema drift occurs
```

**Correct:**
```bash
# After copying database:
npx prisma migrate status
# If drift detected:
# - Identify missing migrations
# - Apply them or resolve
```

---

## Verification Commands

### Check Migration Status
```bash
cd backend
npx prisma migrate status
```

Expected output for healthy state:
```
Database schema is up to date!
```

### Check for Schema Drift
```bash
cd backend
npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma
```

### List Applied Migrations
```bash
PGPASSWORD=charhub_dev_password psql -h localhost -p 5401 -U charhub -d charhub_db \
  -c "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 10;"
```

### Compare Schema with Database
```bash
# Check table structure
PGPASSWORD=charhub_dev_password psql -h localhost -p 5401 -U charhub -d charhub_db \
  -c "\d \"TableName\""
```

---

## Emergency Procedures

### If You Find Schema Drift

1. **DO NOT** run manual SQL
2. **Identify** the cause:
   - Missing migration in codebase?
   - Migration applied but not in code?
   - Database copied from different environment?

3. **Resolve** properly:
   ```bash
   # If migration exists but not applied:
   npx prisma migrate deploy

   # If migration applied but not in code:
   npx prisma migrate resolve --applied MIGRATION_NAME

   # If development and can lose data:
   npx prisma migrate reset
   ```

### If Production Has Drift

1. **DO NOT** attempt to fix manually
2. **Report** to team lead
3. **Document** the drift
4. **Create** proper migration to fix
5. **Test** migration in staging first
6. **Apply** through normal deployment process

---

## Testing Requirements

### Tests MUST Validate Schema Sync

Before running tests:
```bash
# This should be in test setup or CI pipeline
npx prisma migrate deploy
```

Tests should fail if:
- Schema has changes not in migrations
- Migrations reference columns that don't exist
- Database schema doesn't match Prisma client

---

## Related Documentation

- `charhub-prisma-patterns` - Prisma ORM usage patterns
- `charhub-testing-standards` - Testing with database
- Agent Coder CLAUDE.md - Development workflow
- Agent Reviewer CLAUDE.md - Review workflow

---

## Summary

| Action | Allowed? | Correct Approach |
|--------|----------|------------------|
| Modify schema.prisma | YES | Must create migration |
| Run npx prisma migrate dev | YES | Required after schema change |
| Run ALTER TABLE directly | **NO** | Use migration |
| Run CREATE INDEX directly | **NO** | Use migration |
| Copy database between envs | CAUTION | Check migrate status after |
| Fix drift with manual SQL | **NO** | Use migrate resolve/reset |

**Remember: If it's not in a migration file, it doesn't exist in production.**
