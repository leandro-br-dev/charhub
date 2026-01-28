# Global Skills Index

**Last Updated**: 2026-01-27

Global skills are available to all agents (Coder, Reviewer, Planner). These provide cross-cutting capabilities for common operations.

## Available Global Skills

| Skill | Description | Available To |
|-------|-------------|--------------|
| **agent-switching** | Switch between agent profiles (coder/reviewer/planner) | All Agents |
| **container-health-check** | Verify Docker containers are healthy before operations | Coder, Reviewer |
| **database-copy** | Safely copy database between environments | Coder, Reviewer |
| **database-switch** | Switch between clean and populated database modes | Coder, Reviewer |
| **database-schema-management** | **CRITICAL**: Rules for schema changes and migrations | Coder, Reviewer |

## Skill Details

### agent-switching

**Purpose**: Switch the active agent profile, loading the appropriate CLAUDE.md, skills, and sub-agents.

**Usage**:
```bash
./scripts/agents/setup-agent.sh coder|reviewer|planner
```

**Documentation**: [agent-switching/SKILL.md](agent-switching/SKILL.md)

---

### container-health-check

**Purpose**: Verify all Docker containers are running and healthy before performing critical operations.

**Usage**:
```bash
./scripts/ops/health-check.sh           # Quick check
./scripts/ops/health-check.sh --wait    # Wait up to 2 minutes
```

**Services Checked**:
- PostgreSQL: Container status
- Redis: Container status
- Backend: Container status + log analysis
- Frontend: Container status

**Documentation**: [container-health-check/SKILL.md](container-health-check/SKILL.md)

**When to Use**:
- Before running automated tests
- Before creating Pull Requests
- Before deploying to production
- Before user acceptance testing

---

### database-switch

**Purpose**: Switch between clean database (for CI-equivalent tests) and populated database (for manual testing) with automatic backup and restore.

**Usage**:
```bash
./scripts/database/db-switch.sh clean      # Switch to empty database (backs up first)
./scripts/database/db-switch.sh populated  # Restore database from backup
```

**Modes**:
- **clean**: Empty database with schema only (for automated tests, CI validation)
- **populated**: Database restored from backup (for manual testing, UAT)

**Backup Location**: `/root/backups/charhub-db/populated_backup.sql`

**Documentation**: [database-switch/SKILL.md](database-switch/SKILL.md)

**When to Use**:
- Before running automated tests (switch to clean)
- After running automated tests (restore to populated)
- Before manual testing (ensure populated)
- Before creating Pull Request (test in clean, then restore)

**Multi-Agent Compatible**: Works correctly in all environments (agent-01, agent-02, agent-03)

---

### database-copy

**Purpose**: Safely copy database from another environment (agent-01, agent-02, agent-03, reviewer) to your current environment using PostgreSQL network operations.

**Usage**:
```bash
./scripts/database/db-copy-from-env.sh <source-env> <source-port> <dest-env> <dest-port>

# Examples
./scripts/database/db-copy-from-env.sh agent-03 5403 agent-02 5402   # Copy from agent-03 to agent-02
./scripts/database/db-copy-from-env.sh reviewer 5404 agent-01 5401   # Copy from reviewer to agent-01
```

**Environment Ports**:
- agent-01: 5401
- agent-02: 5402
- agent-03: 5403
- reviewer: 5404

**Safety Features**:
- Read-only source access (never modifies source database)
- Automatic verification (minimum 10 characters required)
- Data integrity checks (counts before and after)
- Network-based (no volume mounting)

**Documentation**: [database-copy/SKILL.md](database-copy/SKILL.md)

**When to Use**:
- After running tests (restore populated data)
- Recovering from accidental data loss
- Syncing environments
- Setting up new environment
- Testing with production-like data

**Important Notes**:
- Use `db-switch.sh` for local backup/restore within same environment
- Use `db-copy-from-env.sh` for copying between different environments
- Never use `docker compose down -v` (deletes data)

---

### database-schema-management

**Purpose**: Define MANDATORY rules for database schema changes to ensure consistency, reproducibility, and prevent production incidents.

**CRITICAL**: This skill defines rules that MUST be followed by ALL agents.

**The Golden Rule**: **NEVER execute SQL commands directly on the database to change schema.**

All schema changes MUST go through Prisma migrations.

**For Agent Coder**:
```bash
# IMMEDIATELY after modifying schema.prisma:
npx prisma migrate dev --name descriptive_name

# VERIFY migration was created:
ls -la prisma/migrations/ | tail -5

# COMMIT BOTH schema.prisma AND migration folder
```

**For Agent Reviewer**:
```bash
# Check if schema.prisma was modified in PR:
git diff origin/main...HEAD --name-only | grep schema.prisma

# If YES → Check for corresponding migration:
git diff origin/main...HEAD --name-only | grep "prisma/migrations"

# If schema changed but NO migration → BLOCK PR IMMEDIATELY!
```

**Forbidden Actions**:
| Action | Why Forbidden |
|--------|---------------|
| Run ALTER TABLE directly | Not reproducible in production |
| Run CREATE INDEX directly | Not tracked in version control |
| "Fix" drift with manual SQL | Creates permanent inconsistencies |
| Approve PR without migration | Deployment will fail |

**Documentation**: [database-schema-management/SKILL.md](database-schema-management/SKILL.md)

**When to Use**:
- When modifying `schema.prisma` (Agent Coder)
- When reviewing PRs with schema changes (Agent Reviewer)
- When database drift is detected
- When debugging schema-related errors

---

## Adding New Global Skills

When creating a new global skill:

1. **Create directory**:
   ```bash
   mkdir -p docs/agents/skills/your-skill-name
   ```

2. **Create SKILL.md**:
   ```bash
   touch docs/agents/skills/your-skill-name/SKILL.md
   ```

3. **Add frontmatter**:
   ```yaml
   ---
   name: your-skill-name
   description: Brief description of what this skill does and when to use it
   ---

   # Your Skill Name

   ## Purpose
   ...
   ```

4. **Update this INDEX.md**: Add skill to the table above

5. **Update agent CLAUDE.md files**: Add skill to "Global Skills" section for agents that need it

6. **Update relevant sub-agents**: Add skill reference to sub-agents that should use it

7. **Test the skill**: Verify it works correctly across all agents

8. **Commit changes**:
   ```bash
   git add docs/agents/skills/your-skill-name
   git commit -m "feat(skills): add global skill your-skill-name"
   ```

---

## Maintenance

- Keep skill descriptions concise and clear
- Update documentation when skills change
- Remove skills that are no longer needed
- Ensure all skills have proper frontmatter
- Test skills after major changes

---

For more information about skills in general, see [skills.md](../skills.md).
