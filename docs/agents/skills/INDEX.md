# Global Skills Index

**Last Updated**: 2025-01-24

Global skills are available to all agents (Coder, Reviewer, Planner). These provide cross-cutting capabilities for common operations.

## Available Global Skills

| Skill | Description | Available To |
|-------|-------------|--------------|
| **agent-switching** | Switch between agent profiles (coder/reviewer/planner) | All Agents |
| **container-health-check** | Verify Docker containers are healthy before operations | Coder, Reviewer |
| **database-switch** | Switch between clean and populated database modes | Coder, Reviewer |

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
