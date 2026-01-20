# FEATURE-012: Docker Space Management System

**Status**: Backlog
**Priority**: Critical (P0)
**Type**: Infrastructure / DevOps
**Created**: 2025-01-18
**Author**: Agent Planner (Technical Consultant)

---

## Executive Summary

This specification addresses a critical infrastructure issue where Docker build cache grows exponentially across 3 agent projects (charhub-agent-01, 02, 03), causing disk exhaustion and 6+ hour cleanup scenarios.

### Problem Statement

- **Build Cache**: 148.2 GB (96% reclaimable) - PRIMARY ISSUE
- **Orphan Volumes**: 35.16 GB reclaimable
- **Total Reclaimable**: ~316 GB out of ~324 GB used
- **Root Cause**: Agent Coder uses `docker compose up -d --build` for EVERY local test, creating new BuildKit cache layers each time

### Impact

- Development blocked when disk fills up
- 6+ hours to clean up and restore functionality
- Affects all 3 projects simultaneously
- Reduces developer productivity significantly

---

## Solution Architecture

### Design Principles

1. **Minimize Cache Growth** - Smart rebuilding, not forced rebuilding
2. **Automated Cleanup** - Prevent accumulation through scheduled maintenance
3. **Agent Behavior Change** - Teach agents WHEN to rebuild vs. restart
4. **Monitoring** - Early warning before critical thresholds

### Components Overview

```
+------------------+     +--------------------+     +------------------+
|   Agent Behavior |     |  Docker Config     |     |  Maintenance     |
|   Guidelines     |     |  (daemon.json)     |     |  Scripts         |
+------------------+     +--------------------+     +------------------+
        |                        |                        |
        v                        v                        v
+-----------------------------------------------------------------------+
|                     Docker Space Management System                      |
+-----------------------------------------------------------------------+
        |                        |                        |
        v                        v                        v
+------------------+     +--------------------+     +------------------+
|  Smart Restart   |     |  Cache Limits      |     |  Cron Jobs       |
|  (no --build)    |     |  (10GB max)        |     |  (daily/weekly)  |
+------------------+     +--------------------+     +------------------+
```

---

## Implementation Specification

### 1. Immediate Changes (Stop the Bleeding)

#### 1.1 Docker Daemon Configuration

Create `/etc/docker/daemon.json`:

```json
{
  "builder": {
    "gc": {
      "enabled": true,
      "defaultKeepStorage": "10GB",
      "policy": [
        { "keepStorage": "10GB", "filter": { "unused-for": { "168h": true } } },
        { "keepStorage": "5GB", "filter": { "unused-for": { "72h": true } } },
        { "keepStorage": "2GB" }
      ]
    }
  },
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

**Explanation**:
- Limits BuildKit cache to 10GB maximum
- Aggressive cleanup: items unused for 7 days reduced to 5GB
- Items unused for 3 days reduced to 2GB
- Log rotation prevents log file accumulation

#### 1.2 One-Time Cleanup Script

Create `scripts/docker-cleanup-full.sh`:

```bash
#!/bin/bash
set -euo pipefail

# =============================================================================
# docker-cleanup-full.sh - Full Docker cleanup (preserves named volumes)
# Usage: ./scripts/docker-cleanup-full.sh
# WARNING: This will remove ALL build cache and unused images
# =============================================================================

echo "=========================================="
echo "  Docker Full Cleanup (Cache + Images)"
echo "=========================================="
echo ""

# Show current usage
echo "Current Docker disk usage:"
docker system df
echo ""

# Confirm action
read -p "This will remove ALL build cache and unused images. Continue? [y/N] " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "Step 1/4: Pruning build cache..."
docker builder prune -af

echo ""
echo "Step 2/4: Pruning unused images..."
docker image prune -af

echo ""
echo "Step 3/4: Pruning unused volumes (except named)..."
# This only removes anonymous volumes, NOT named ones like postgres_data
docker volume prune -f

echo ""
echo "Step 4/4: Pruning unused networks..."
docker network prune -f

echo ""
echo "=========================================="
echo "  Cleanup Complete"
echo "=========================================="
echo ""
echo "New Docker disk usage:"
docker system df
echo ""
echo "Named volumes preserved:"
docker volume ls --filter "name=postgres_data" --filter "name=redis_data"
```

#### 1.3 Immediate Manual Cleanup

Execute these commands NOW on the affected system:

```bash
# Step 1: Stop all containers across all projects
cd /root/projects/charhub-agent-01 && docker compose down
cd /root/projects/charhub-agent-02 && docker compose down
cd /root/projects/charhub-agent-03 && docker compose down

# Step 2: Remove ALL build cache (primary issue)
docker builder prune -af

# Step 3: Remove dangling images
docker image prune -af

# Step 4: Remove unused anonymous volumes (NOT named volumes)
docker volume prune -f

# Step 5: Verify named volumes are intact
docker volume ls | grep -E "postgres_data|redis_data"

# Step 6: Verify disk space recovered
docker system df
df -h /var/lib/docker
```

---

### 2. Agent Behavior Changes (Critical)

#### 2.1 The Core Problem

The current CLAUDE.md instructs:
```bash
# Current (PROBLEMATIC)
docker compose down
docker compose up -d --build  # <-- Creates new cache layers EVERY time
```

This creates ~500MB-2GB of new cache layers per build, per project, multiple times daily.

#### 2.2 New Docker Guidelines for Agent Coder

**Replace the "Local Testing" section in Agent Coder's CLAUDE.md with**:

```markdown
### Local Testing (Docker Space-Aware)

**IMPORTANT: Use `--build` ONLY when necessary to prevent cache explosion**

#### When to RESTART (no --build) - Default Action
Use simple restart when:
- Testing behavior changes without dependency changes
- Running tests after code edits
- Verifying fixes

```bash
# Default restart - NO rebuild, uses existing image
docker compose down
docker compose up -d

# View logs
docker compose logs -f backend
docker compose logs -f frontend
```

#### When to REBUILD (with --build) - Only These Cases
Use `--build` ONLY when:
1. **Dockerfile changed** - Any modification to backend/Dockerfile or frontend/Dockerfile
2. **package.json changed** - New npm dependencies added/removed
3. **package-lock.json changed** - Dependency versions updated
4. **prisma/schema.prisma changed** - Database schema modified
5. **Build errors occur** - Container fails to start due to stale image

```bash
# Rebuild specific service only (preferred - smaller cache impact)
docker compose up -d --build backend
docker compose up -d --build frontend

# Rebuild all services (rarely needed)
docker compose down
docker compose up -d --build
```

#### Decision Tree for Agent Coder

```
Did I change Dockerfile, package.json, package-lock.json, or prisma/schema.prisma?
├─ YES → Use `docker compose up -d --build <service>`
└─ NO → Use `docker compose up -d` (no --build)

Is container failing to start?
├─ YES → Check logs first, then try `--build` if stale image suspected
└─ NO → Never use `--build` unnecessarily
```

#### Weekly Maintenance (Agent Coder Responsibility)
After significant development sessions, run:
```bash
# Quick cleanup - removes old cache, keeps recent
./scripts/docker-cleanup-quick.sh
```
```

#### 2.3 Smart Restart Script

Create `scripts/docker-smart-restart.sh`:

```bash
#!/bin/bash
set -euo pipefail

# =============================================================================
# docker-smart-restart.sh - Intelligent Docker restart
# Usage: ./scripts/docker-smart-restart.sh [--force-build]
# Detects if rebuild is needed based on file changes
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FORCE_BUILD=false

if [ "${1:-}" = "--force-build" ]; then
    FORCE_BUILD=true
fi

# Track if any service needs rebuild
BACKEND_NEEDS_BUILD=false
FRONTEND_NEEDS_BUILD=false

# =============================================================================
# Detection Functions
# =============================================================================

check_backend_changes() {
    local MARKER_FILE="$PROJECT_ROOT/.docker-build-marker-backend"

    # Files that require rebuild
    local WATCH_FILES=(
        "$PROJECT_ROOT/backend/Dockerfile"
        "$PROJECT_ROOT/backend/package.json"
        "$PROJECT_ROOT/backend/package-lock.json"
        "$PROJECT_ROOT/backend/prisma/schema.prisma"
    )

    # Check if marker exists
    if [ ! -f "$MARKER_FILE" ]; then
        echo "Backend: No build marker found, rebuild needed"
        return 0  # Needs build
    fi

    # Check if any watched file is newer than marker
    for FILE in "${WATCH_FILES[@]}"; do
        if [ -f "$FILE" ] && [ "$FILE" -nt "$MARKER_FILE" ]; then
            echo "Backend: $FILE changed, rebuild needed"
            return 0  # Needs build
        fi
    done

    echo "Backend: No changes detected, skip rebuild"
    return 1  # No build needed
}

check_frontend_changes() {
    local MARKER_FILE="$PROJECT_ROOT/.docker-build-marker-frontend"

    # Files that require rebuild
    local WATCH_FILES=(
        "$PROJECT_ROOT/frontend/Dockerfile"
        "$PROJECT_ROOT/frontend/package.json"
        "$PROJECT_ROOT/frontend/package-lock.json"
    )

    # Check if marker exists
    if [ ! -f "$MARKER_FILE" ]; then
        echo "Frontend: No build marker found, rebuild needed"
        return 0  # Needs build
    fi

    # Check if any watched file is newer than marker
    for FILE in "${WATCH_FILES[@]}"; do
        if [ -f "$FILE" ] && [ "$FILE" -nt "$MARKER_FILE" ]; then
            echo "Frontend: $FILE changed, rebuild needed"
            return 0  # Needs build
        fi
    done

    echo "Frontend: No changes detected, skip rebuild"
    return 1  # No build needed
}

update_build_marker() {
    local SERVICE=$1
    touch "$PROJECT_ROOT/.docker-build-marker-$SERVICE"
}

# =============================================================================
# Main Logic
# =============================================================================

echo "=========================================="
echo "  Smart Docker Restart"
echo "=========================================="
echo ""

cd "$PROJECT_ROOT"

# Check what needs rebuilding
if [ "$FORCE_BUILD" = true ]; then
    echo "Force build requested"
    BACKEND_NEEDS_BUILD=true
    FRONTEND_NEEDS_BUILD=true
else
    if check_backend_changes; then
        BACKEND_NEEDS_BUILD=true
    fi
    if check_frontend_changes; then
        FRONTEND_NEEDS_BUILD=true
    fi
fi

echo ""

# Stop containers
echo "Stopping containers..."
docker compose down

# Restart with appropriate build flags
if [ "$BACKEND_NEEDS_BUILD" = true ] && [ "$FRONTEND_NEEDS_BUILD" = true ]; then
    echo "Rebuilding ALL services..."
    docker compose up -d --build
    update_build_marker "backend"
    update_build_marker "frontend"
elif [ "$BACKEND_NEEDS_BUILD" = true ]; then
    echo "Rebuilding backend only..."
    docker compose up -d --build backend
    docker compose up -d
    update_build_marker "backend"
elif [ "$FRONTEND_NEEDS_BUILD" = true ]; then
    echo "Rebuilding frontend only..."
    docker compose up -d --build frontend
    docker compose up -d
    update_build_marker "frontend"
else
    echo "No rebuild needed, simple restart..."
    docker compose up -d
fi

echo ""
echo "Waiting for services to be healthy..."
sleep 5

# Check health
"$SCRIPT_DIR/health-check.sh" --wait || true

echo ""
echo "Done! Services status:"
docker compose ps
```

---

### 3. Preventive Maintenance System

#### 3.1 Quick Cleanup Script (Daily Use)

Create `scripts/docker-cleanup-quick.sh`:

```bash
#!/bin/bash
set -euo pipefail

# =============================================================================
# docker-cleanup-quick.sh - Quick Docker cleanup for daily use
# Usage: ./scripts/docker-cleanup-quick.sh
# Safe to run anytime - removes only old/unused items
# =============================================================================

echo "=========================================="
echo "  Quick Docker Cleanup"
echo "=========================================="
echo ""

# Show current usage
echo "Current Docker disk usage:"
docker system df
echo ""

# Prune build cache older than 24 hours
echo "Pruning build cache older than 24h..."
docker builder prune -f --filter "until=24h"

# Prune dangling images only
echo "Pruning dangling images..."
docker image prune -f

# Prune unused anonymous volumes
echo "Pruning unused anonymous volumes..."
docker volume prune -f

echo ""
echo "=========================================="
echo "  Quick Cleanup Complete"
echo "=========================================="
echo ""
echo "New Docker disk usage:"
docker system df
```

#### 3.2 Automated Maintenance via Cron

Create `scripts/docker-maintenance-cron.sh`:

```bash
#!/bin/bash
set -euo pipefail

# =============================================================================
# docker-maintenance-cron.sh - Automated Docker maintenance for cron
# Usage: Run via cron, logs to /var/log/docker-maintenance.log
# =============================================================================

LOG_FILE="/var/log/docker-maintenance.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

log() {
    echo "[$TIMESTAMP] $1" >> "$LOG_FILE"
}

log "=== Docker Maintenance Started ==="

# Get current disk usage
BEFORE=$(docker system df --format '{{.Size}}' | head -1)
log "Disk usage before: Build Cache"

# Prune build cache older than 48 hours
docker builder prune -f --filter "until=48h" >> "$LOG_FILE" 2>&1

# Prune unused images older than 48 hours
docker image prune -af --filter "until=48h" >> "$LOG_FILE" 2>&1

# Prune unused anonymous volumes
docker volume prune -f >> "$LOG_FILE" 2>&1

# Get new disk usage
AFTER=$(docker system df --format '{{.Size}}' | head -1)
log "Disk usage after: Build Cache"

log "=== Docker Maintenance Complete ==="
```

#### 3.3 Cron Configuration

Add to system crontab (`/etc/crontab` or user crontab):

```cron
# Docker maintenance - daily quick cleanup at 3 AM
0 3 * * * root /root/projects/charhub-agent-01/scripts/docker-maintenance-cron.sh

# Docker deep cleanup - weekly on Sunday at 4 AM
0 4 * * 0 root docker builder prune -af && docker image prune -af --filter "until=168h"
```

---

### 4. Docker Compose Enhancements

#### 4.1 Add Build Cache Limits to docker-compose.yml

Update the backend and frontend build sections:

```yaml
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      args:
        NODE_ENV: ${NODE_ENV:-production}
        BUILDKIT_INLINE_CACHE: 1
      cache_from:
        - type=local,src=/tmp/.buildx-cache-backend
      cache_to:
        - type=local,dest=/tmp/.buildx-cache-backend,mode=max
    # ... rest of config

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: ${NODE_ENV:-production}
      args:
        NODE_ENV: ${NODE_ENV:-production}
        BUILDKIT_INLINE_CACHE: 1
      cache_from:
        - type=local,src=/tmp/.buildx-cache-frontend
      cache_to:
        - type=local,dest=/tmp/.buildx-cache-frontend,mode=max
    # ... rest of config
```

**Note**: This approach uses local directory caching instead of BuildKit's default cache, making it easier to control and clean up.

---

### 5. Monitoring and Alerting

#### 5.1 Docker Space Check Script

Create `scripts/docker-space-check.sh`:

```bash
#!/bin/bash
set -euo pipefail

# =============================================================================
# docker-space-check.sh - Check Docker space and alert if threshold exceeded
# Usage: ./scripts/docker-space-check.sh
# Exit codes: 0 = OK, 1 = Warning, 2 = Critical
# =============================================================================

# Thresholds in GB
WARNING_THRESHOLD_GB=50
CRITICAL_THRESHOLD_GB=100

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

# Get build cache size in bytes
CACHE_SIZE_BYTES=$(docker system df --format '{{.Size}}' 2>/dev/null | head -1 | sed 's/[^0-9.]//g')
CACHE_UNIT=$(docker system df --format '{{.Size}}' 2>/dev/null | head -1 | sed 's/[0-9.]//g')

# Convert to GB (approximate)
case "$CACHE_UNIT" in
    "GB") CACHE_SIZE_GB=$CACHE_SIZE_BYTES ;;
    "MB") CACHE_SIZE_GB=$(echo "$CACHE_SIZE_BYTES / 1024" | bc -l) ;;
    "KB") CACHE_SIZE_GB=$(echo "$CACHE_SIZE_BYTES / 1024 / 1024" | bc -l) ;;
    *) CACHE_SIZE_GB=0 ;;
esac

# Round to integer
CACHE_SIZE_GB=$(printf "%.0f" "$CACHE_SIZE_GB")

echo "=========================================="
echo "  Docker Space Check"
echo "=========================================="
echo ""
docker system df
echo ""

# Check thresholds
if [ "$CACHE_SIZE_GB" -ge "$CRITICAL_THRESHOLD_GB" ]; then
    echo -e "${RED}CRITICAL: Build cache is ${CACHE_SIZE_GB}GB (threshold: ${CRITICAL_THRESHOLD_GB}GB)${NC}"
    echo ""
    echo "IMMEDIATE ACTION REQUIRED:"
    echo "  Run: ./scripts/docker-cleanup-full.sh"
    exit 2
elif [ "$CACHE_SIZE_GB" -ge "$WARNING_THRESHOLD_GB" ]; then
    echo -e "${YELLOW}WARNING: Build cache is ${CACHE_SIZE_GB}GB (threshold: ${WARNING_THRESHOLD_GB}GB)${NC}"
    echo ""
    echo "RECOMMENDED ACTION:"
    echo "  Run: ./scripts/docker-cleanup-quick.sh"
    exit 1
else
    echo -e "${GREEN}OK: Build cache is ${CACHE_SIZE_GB}GB (threshold: ${WARNING_THRESHOLD_GB}GB)${NC}"
    exit 0
fi
```

#### 5.2 Pre-Build Space Check

Add to Agent Coder workflow - check space before rebuilding:

```bash
# Add to smart-restart.sh or run manually
check_available_space() {
    local AVAILABLE_GB=$(df -BG /var/lib/docker | tail -1 | awk '{print $4}' | sed 's/G//')

    if [ "$AVAILABLE_GB" -lt 10 ]; then
        echo "ERROR: Only ${AVAILABLE_GB}GB available. Run cleanup first!"
        echo "  ./scripts/docker-cleanup-quick.sh"
        exit 1
    fi
}
```

---

### 6. Multi-Project Coordination

Since all 3 projects share the same Docker daemon, implement project-aware cleanup.

#### 6.1 Shared Scripts Location

Create symbolic links in each project:

```bash
# In each project (charhub-agent-01, 02, 03)
mkdir -p scripts/docker
ln -sf /root/shared-scripts/docker-cleanup-full.sh scripts/docker/cleanup-full.sh
ln -sf /root/shared-scripts/docker-cleanup-quick.sh scripts/docker/cleanup-quick.sh
ln -sf /root/shared-scripts/docker-space-check.sh scripts/docker/space-check.sh
```

Or copy the scripts to each project during setup.

#### 6.2 Project-Specific Naming

Update docker-compose.yml to use project-specific naming to avoid conflicts:

```yaml
# In docker-compose.yml, add at top level
name: charhub-agent-01  # or 02, 03

services:
  # ... services
```

This ensures `docker compose down` only affects the current project.

---

## Agent CLAUDE.md Updates

### Agent Coder CLAUDE.md Changes

Add new section after "Local Testing":

```markdown
## Docker Space Management (CRITICAL)

### Understanding the Problem
Using `--build` creates new Docker cache layers each time. With 3 projects rebuilding multiple times daily, this can consume 100GB+ in days.

### The Golden Rule
**"Restart without `--build` is the DEFAULT. Rebuild only when NECESSARY."**

### When to Restart vs Rebuild

| Scenario | Action |
|----------|--------|
| Testing code changes | `docker compose up -d` (no --build) |
| Dockerfile changed | `docker compose up -d --build` |
| package.json changed | `docker compose up -d --build` |
| prisma/schema.prisma changed | `docker compose up -d --build backend` |
| Container won't start | Check logs first, then try `--build` |

### Smart Restart (Recommended)
Use the smart restart script that detects changes automatically:
```bash
./scripts/docker-smart-restart.sh
```

### Weekly Maintenance
Run quick cleanup after development sessions:
```bash
./scripts/docker-cleanup-quick.sh
```

### Space Check Before Building
If in doubt about disk space:
```bash
./scripts/docker-space-check.sh
```

### Emergency Cleanup
If disk is full:
```bash
./scripts/docker-cleanup-full.sh
```
```

### Agent Planner CLAUDE.md Note

Add to quality monitoring checklist:

```markdown
## Infrastructure Monitoring

### Docker Space
- Monitor via `docker system df`
- Alert threshold: 50GB build cache
- Critical threshold: 100GB build cache
- Weekly cleanup should keep cache under 20GB
```

---

## Implementation Checklist

### Phase 1: Immediate (Day 1)
- [ ] Execute manual cleanup commands
- [ ] Create `/etc/docker/daemon.json` with cache limits
- [ ] Restart Docker daemon
- [ ] Verify named volumes preserved

### Phase 2: Scripts (Day 1-2)
- [ ] Create `docker-cleanup-full.sh`
- [ ] Create `docker-cleanup-quick.sh`
- [ ] Create `docker-smart-restart.sh`
- [ ] Create `docker-space-check.sh`
- [ ] Create `docker-maintenance-cron.sh`
- [ ] Make all scripts executable

### Phase 3: Agent Updates (Day 2)
- [ ] Update Agent Coder CLAUDE.md with new Docker guidelines
- [ ] Update Agent Planner CLAUDE.md with monitoring note
- [ ] Update all 3 project CLAUDE.md files

### Phase 4: Automation (Day 2-3)
- [ ] Configure cron jobs for daily/weekly cleanup
- [ ] Test automated cleanup
- [ ] Verify cron logs

### Phase 5: Verification (Day 3)
- [ ] Run `docker system df` - verify cache under 10GB
- [ ] Test smart restart script
- [ ] Verify builds still work correctly
- [ ] Test full cleanup preserves named volumes

---

## Success Criteria

1. **Build cache stays under 20GB** during normal development
2. **No manual cleanup needed** more than monthly
3. **Agents use `--build` only when necessary** (tracked via markers)
4. **Named volumes (postgres_data, redis_data) NEVER deleted accidentally**
5. **Automated cleanup runs daily** with logs
6. **Space alerts trigger** before reaching critical levels

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Script deletes named volumes | Scripts explicitly exclude named volumes |
| Cache limit too aggressive | Start at 10GB, adjust based on usage |
| Cron job fails silently | Logging to /var/log/docker-maintenance.log |
| Agents forget new rules | Smart restart script enforces behavior |
| Build fails after cleanup | Cache rebuilds automatically on next build |

---

## Rollback Plan

If issues occur after implementation:

1. **Remove daemon.json limits**: `rm /etc/docker/daemon.json && systemctl restart docker`
2. **Restore old agent behavior**: Revert CLAUDE.md changes
3. **Disable cron jobs**: Comment out in crontab
4. **Manual builds**: `docker compose up -d --build` always works

---

## Appendix A: Quick Reference Card

```
+------------------------------------------+
|     DOCKER SPACE MANAGEMENT CHEAT SHEET  |
+------------------------------------------+
| DAILY DEVELOPMENT:                       |
|   ./scripts/docker-smart-restart.sh      |
|                                          |
| CHECK SPACE:                             |
|   ./scripts/docker-space-check.sh        |
|                                          |
| QUICK CLEANUP:                           |
|   ./scripts/docker-cleanup-quick.sh      |
|                                          |
| FULL CLEANUP (emergency):                |
|   ./scripts/docker-cleanup-full.sh       |
|                                          |
| REBUILD RULES:                           |
|   - Dockerfile changed  -> --build       |
|   - package.json changed -> --build      |
|   - prisma schema changed -> --build     |
|   - Everything else -> NO --build        |
+------------------------------------------+
```

---

## Appendix B: File Inventory

Files to create:
1. `/etc/docker/daemon.json` - Docker daemon config
2. `scripts/docker-cleanup-full.sh` - Full cleanup
3. `scripts/docker-cleanup-quick.sh` - Quick cleanup
4. `scripts/docker-smart-restart.sh` - Smart restart
5. `scripts/docker-space-check.sh` - Space monitoring
6. `scripts/docker-maintenance-cron.sh` - Cron maintenance

Files to update:
1. `docs/agents/coder/CLAUDE.md` - Agent Coder guidelines
2. `docs/agents/planner/CLAUDE.md` - Agent Planner monitoring

---

**Document Version**: 1.0
**Last Updated**: 2025-01-18
**Next Review**: After implementation complete
