# Migration Guide: Legacy to ID-Based System

**Last Updated**: 2025-12-31

This guide helps you migrate from the legacy naming system (`charhub-coder`, `charhub-reviewer`, etc.) to the new ID-based architecture (`charhub-agent-01`, `charhub-agent-02`, etc.).

---

## 📋 Table of Contents

1. [Why Migrate?](#why-migrate)
2. [Before You Start](#before-you-start)
3. [Migration Strategy](#migration-strategy)
4. [Step-by-Step Migration](#step-by-step-migration)
5. [Post-Migration Verification](#post-migration-verification)
6. [Rollback Plan](#rollback-plan)

---

## Why Migrate?

### Problems with Legacy System

**Legacy naming** (`charhub-coder`, `charhub-reviewer`, `charhub-designer`):
- ❌ Can only have ONE agent of each type
- ❌ Can't have 2 coders working in parallel
- ❌ Folder name tied to role (renaming required to switch roles)
- ❌ Doesn't scale beyond 4 agents

### Benefits of ID-Based System

**New ID-based naming** (`charhub-agent-01`, `charhub-agent-02`, ...):
- ✅ Support up to 99 concurrent agents
- ✅ Multiple agents of same type (2+ coders, reviewers, etc.)
- ✅ Flexible role assignment (switch roles without renaming folders)
- ✅ Automatic port allocation (no conflicts)
- ✅ Simple ID-based identification

---

## Before You Start

### 1. Backup Your Work

```bash
# Commit all changes in legacy workspaces
cd ~/projects/charhub-coder
git add .
git commit -m "chore: backup before migration to ID-based system"
git push

cd ~/projects/charhub-reviewer
git add .
git commit -m "chore: backup before migration to ID-based system"
git push

# Repeat for all legacy workspaces
```

### 2. Stop All Services

```bash
# Stop all running agents
cd ~/projects/charhub-coder
docker compose down

cd ~/projects/charhub-reviewer
docker compose down

cd ~/projects/charhub-planner
docker compose down

cd ~/projects/charhub-designer
docker compose down
```

### 3. Document Current Setup

Create a mapping of what you want to migrate to:

| Legacy Folder | Current Role | New Agent ID | New Folder |
|---------------|--------------|--------------|------------|
| charhub-coder | Coder | 01 | charhub-agent-01 |
| charhub-reviewer | Reviewer | 02 | charhub-agent-02 |
| charhub-planner | Planner | 03 | charhub-agent-03 |
| charhub-designer | Designer | 04 | charhub-agent-04 |

**Note**: You can choose different IDs if you prefer (e.g., 10, 11, 12, 13).

---

## Migration Strategy

### Option A: Rename Existing Folders (Recommended)

**Pros**: Keep git history, branches, uncommitted work
**Cons**: Slightly more complex

**When to use**: You have uncommitted work or active feature branches

### Option B: Fresh Clone with New Names

**Pros**: Clean start, simple process
**Cons**: Lose uncommitted changes (need to backup first)

**When to use**: Everything is committed and pushed

---

## Step-by-Step Migration

### Option A: Rename Existing Folders

#### Step 1: Rename Directories

```bash
cd ~/projects

# Rename legacy folders to ID-based names
mv charhub-coder charhub-agent-01
mv charhub-reviewer charhub-agent-02
mv charhub-planner charhub-agent-03
mv charhub-designer charhub-agent-04
```

#### Step 2: Run Setup Scripts

```bash
# Agent 01 (was Coder)
cd ~/projects/charhub-agent-01
./scripts/setup-agent.sh coder
# This creates:
# - docker-compose.override.yml (ports: 8001, 5101, ...)
# - .agentrc (ID=01, role=coder)
# - CLAUDE.md (coder template)

# Agent 02 (was Reviewer)
cd ~/projects/charhub-agent-02
./scripts/setup-agent.sh reviewer

# Agent 03 (was Planner)
cd ~/projects/charhub-agent-03
./scripts/setup-agent.sh planner

# Agent 04 (was Designer)
cd ~/projects/charhub-agent-04
./scripts/setup-agent.sh designer
```

#### Step 3: Update Environment Files

```bash
# For each agent, update .env files with new ports

# Agent 01
cd ~/projects/charhub-agent-01/backend
# Edit .env: PORT=8001
cd ../frontend
# Edit .env: VITE_API_URL=http://localhost:8001

# Agent 02
cd ~/projects/charhub-agent-02/backend
# Edit .env: PORT=8002
cd ../frontend
# Edit .env: VITE_API_URL=http://localhost:8002

# Repeat for all agents...
```

#### Step 4: Start and Verify

```bash
# Start each agent
cd ~/projects/charhub-agent-01
docker compose up -d

cd ~/projects/charhub-agent-02
docker compose up -d

cd ~/projects/charhub-agent-03
docker compose up -d

cd ~/projects/charhub-agent-04
docker compose up -d

# Verify all running
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep charhub-agent
```

---

### Option B: Fresh Clone with New Names

#### Step 1: Create New Agent Directories

```bash
cd ~/projects

# Create new directories
mkdir charhub-agent-01
mkdir charhub-agent-02
mkdir charhub-agent-03
mkdir charhub-agent-04
```

#### Step 2: Clone Repository

```bash
# Clone into each new directory
cd charhub-agent-01
git clone https://github.com/leandro-br-dev/charhub.git .

cd ../charhub-agent-02
git clone https://github.com/leandro-br-dev/charhub.git .

cd ../charhub-agent-03
git clone https://github.com/leandro-br-dev/charhub.git .

cd ../charhub-agent-04
git clone https://github.com/leandro-br-dev/charhub.git .
```

#### Step 3: Run Setup Scripts

```bash
# Same as Option A Step 2
cd ~/projects/charhub-agent-01
./scripts/setup-agent.sh coder

cd ~/projects/charhub-agent-02
./scripts/setup-agent.sh reviewer

cd ~/projects/charhub-agent-03
./scripts/setup-agent.sh planner

cd ~/projects/charhub-agent-04
./scripts/setup-agent.sh designer
```

#### Step 4: Restore Work from Legacy Folders

```bash
# If you had uncommitted work in legacy folders, restore it

# Example: Restore coder's work
cd ~/projects/charhub-coder
git diff > /tmp/coder-changes.patch

cd ~/projects/charhub-agent-01
git apply /tmp/coder-changes.patch

# Repeat for each agent with uncommitted work
```

#### Step 5: Copy Environment Files

```bash
# Copy .env files from legacy folders if customized

cp ~/projects/charhub-coder/backend/.env ~/projects/charhub-agent-01/backend/.env
cp ~/projects/charhub-coder/frontend/.env ~/projects/charhub-agent-01/frontend/.env

# Update ports in copied .env files to match new IDs
# Agent 01: PORT=8001, VITE_API_URL=http://localhost:8001
```

#### Step 6: Start Services

```bash
# Same as Option A Step 4
cd ~/projects/charhub-agent-01
docker compose up -d

# ... repeat for all agents
```

---

## Post-Migration Verification

### 1. Verify Directory Structure

```bash
cd ~/projects
ls -d charhub-agent-*

# Expected output:
# charhub-agent-01  charhub-agent-02  charhub-agent-03  charhub-agent-04
```

### 2. Verify Agent Metadata

```bash
# Check each agent's configuration
for agent in charhub-agent-*; do
  echo "=== $agent ==="
  cat "$agent/.agentrc" | grep "AGENT_ID\|AGENT_ROLE"
done

# Expected output:
# === charhub-agent-01 ===
# AGENT_ID=01
# AGENT_ROLE=coder
# === charhub-agent-02 ===
# AGENT_ID=02
# AGENT_ROLE=reviewer
# ...
```

### 3. Verify Port Assignments

```bash
# Check running services
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep charhub-agent

# Expected output (example):
# charhub-agent-01-backend-1    0.0.0.0:8001->3000/tcp
# charhub-agent-01-frontend-1   0.0.0.0:5101->5173/tcp
# charhub-agent-02-backend-1    0.0.0.0:8002->3000/tcp
# charhub-agent-02-frontend-1   0.0.0.0:5102->5173/tcp
# ...
```

### 4. Verify Services Health

```bash
# Test each agent's backend
curl http://localhost:8001/api/v1/health  # Agent 01
curl http://localhost:8002/api/v1/health  # Agent 02
curl http://localhost:8003/api/v1/health  # Agent 03
curl http://localhost:8004/api/v1/health  # Agent 04

# All should return: {"status":"ok"}
```

### 5. Verify Frontend Access

```bash
# Open each agent's frontend in browser
open http://localhost:5101  # Agent 01
open http://localhost:5102  # Agent 02
open http://localhost:5103  # Agent 03
open http://localhost:5104  # Agent 04

# All should load successfully
```

### 6. Verify Git State

```bash
# Check each agent is on correct branch
cd ~/projects/charhub-agent-01
git branch
# Coder should be on feature/* branch

cd ~/projects/charhub-agent-02
git branch
# Reviewer should be on main

cd ~/projects/charhub-agent-03
git branch
# Planner should be on main or feature/planning-*

cd ~/projects/charhub-agent-04
git branch
# Designer should be on feature/design-* or main
```

---

## Rollback Plan

If migration fails, you can rollback:

### If You Used Option A (Rename)

```bash
# Stop new setup
cd ~/projects/charhub-agent-01
docker compose down

# Rename back to legacy names
cd ~/projects
mv charhub-agent-01 charhub-coder
mv charhub-agent-02 charhub-reviewer
mv charhub-agent-03 charhub-planner
mv charhub-agent-04 charhub-designer

# Remove generated files
cd charhub-coder
rm -f docker-compose.override.yml .agentrc CLAUDE.md

# Start legacy services
docker compose up -d
```

### If You Used Option B (Fresh Clone)

```bash
# Stop new agents
cd ~/projects/charhub-agent-01
docker compose down
# ... repeat for all

# Start legacy agents
cd ~/projects/charhub-coder
docker compose up -d
# ... repeat for all

# Delete new directories later (after verifying rollback works)
```

---

## Cleanup Legacy Folders

After successful migration and verification (1-2 days), you can remove legacy folders:

```bash
# Only do this after confirming new setup works!

# If you used Option A (renamed folders)
# Legacy folders are now new ID-based folders, nothing to cleanup

# If you used Option B (fresh clone)
cd ~/projects
rm -rf charhub-coder charhub-reviewer charhub-planner charhub-designer

# Or keep as backup for a while
mv charhub-coder charhub-coder.backup
mv charhub-reviewer charhub-reviewer.backup
# ... etc
```

---

## Migration Checklist

Use this checklist to track your migration:

- [ ] Backed up all work (committed and pushed)
- [ ] Stopped all legacy agent services
- [ ] Documented desired ID mapping
- [ ] Created or renamed to `charhub-agent-XX` directories
- [ ] Ran `setup-agent.sh` for each agent
- [ ] Updated `.env` files with new ports
- [ ] Started all new agent services
- [ ] Verified all services are "Up"
- [ ] Verified backend health checks pass
- [ ] Verified frontends load in browser
- [ ] Verified correct git branches
- [ ] Tested one feature/task with new setup
- [ ] Documented what worked/didn't work
- [ ] Waited 1-2 days before cleanup
- [ ] Removed or backed up legacy folders

---

## Troubleshooting Migration Issues

### Issue: "docker-compose.override.yml already exists"

**Cause**: Old override file from legacy setup

**Solution**:
```bash
# Backup existing override
mv docker-compose.override.yml docker-compose.override.yml.backup

# Re-run setup
./scripts/setup-agent.sh coder
```

### Issue: Port conflicts after migration

**Cause**: Legacy services still running, or reused same ports

**Solution**:
```bash
# Find what's using the port
lsof -i :8001

# Stop legacy service
docker ps -a | grep charhub
docker rm -f <container-id>

# Or choose different IDs (10, 11, 12 instead of 01, 02, 03)
```

### Issue: Missing feature branch after migration

**Cause**: Cloned fresh without checking out branch

**Solution**:
```bash
# Fetch all branches
git fetch --all

# List all branches
git branch -a

# Checkout your feature branch
git checkout feature/your-feature-name
```

### Issue: Database data lost

**Cause**: Used fresh clone without copying volumes

**Solution**:
```bash
# Stop new agent
docker compose down

# Copy database volume from legacy folder
docker run --rm \
  -v charhub-coder_postgres_data:/from \
  -v charhub-agent-01_postgres_data:/to \
  alpine sh -c "cd /from && cp -av . /to"

# Restart
docker compose up -d
```

---

## FAQ

### Q: Do I need to migrate all agents at once?

**A**: No! You can migrate one at a time. Legacy and ID-based agents can coexist.

Example:
```
charhub-coder (legacy) - keep using while testing new system
charhub-agent-01 (new) - test this first
charhub-agent-02 (new) - migrate reviewer when ready
```

### Q: Can I use non-sequential IDs?

**A**: Yes! You can use any 2-digit IDs (01-99). Sequential is recommended for organization, but not required.

### Q: What if I want to add a 5th agent after migration?

**A**: Just create `charhub-agent-05` and run setup! That's the beauty of the new system.

```bash
mkdir ~/projects/charhub-agent-05
cd ~/projects/charhub-agent-05
git clone https://github.com/leandro-br-dev/charhub.git .
./scripts/setup-agent.sh coder
docker compose up -d
```

### Q: Can I change an agent's role after migration?

**A**: Yes! Use the `switch-agent-role.sh` script:

```bash
cd ~/projects/charhub-agent-01
./scripts/switch-agent-role.sh reviewer
```

### Q: Do the ID numbers have any special meaning?

**A**: No, they're just unique identifiers for port allocation. You can assign them however makes sense to you.

---

## Success Stories

After successful migration, you'll be able to:

✅ Run multiple coders in parallel (Agent 01, Agent 02 both as Coder)
✅ Add new agents instantly without folder renames
✅ Switch agent roles without losing configuration
✅ Scale to 99 agents without conflicts
✅ Use simple port formula to find any agent's ports

---

## Need Help?

- **Setup issues**: See [SETUP.md](SETUP.md)
- **System overview**: See [README.md](README.md)
- **Role-specific help**: See respective `CLAUDE.md` templates

---

**Ready to migrate?** Follow the steps above and enjoy the flexibility of the ID-based system! 🚀
