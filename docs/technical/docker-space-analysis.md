# Docker Space Analysis - WSL ext4.vhdx (222 GB)

**Date**: 2026-01-18
**Status**: Remediation Implemented (see FEATURE-012)

---

## Executive Summary

The WSL ext4.vhdx file has grown to 222 GB, primarily due to Docker accumulating unused resources across 3 similar projects (charhub-agent-01, charhub-agent-02, charhub-agent-03).

**Key Finding**: ~316 GB of Docker resources are marked as reclaimable (97% of total usage), but the actual disk space is not automatically freed by WSL.

---

## Problem Analysis

### Current Docker Space Usage

| Component | Total Size | Reclaimable | Reclaimable % |
|-----------|------------|-------------|---------------|
| **Build Cache** | 148.2 GB | 142.6 GB | 96% |
| **Images** | 138.5 GB | 138.5 GB | 99% |
| **Local Volumes** | 37.39 GB | 35.16 GB | 94% |
| **Containers** | 233.8 MB | 0 MB | 0% |
| **TOTAL** | ~324 GB | ~316 GB | 97% |

### Root Causes

#### 1. Build Cache Accumulation (148.2 GB)
- Docker BuildKit caches layers from every build
- Each rebuild of the 3 projects creates new cache entries
- 795 cached build objects, 0 active
- **Impact**: Largest single consumer of space

#### 2. Orphaned Anonymous Volumes (35.16 GB reclaimable)
- 127 total volumes, only 12 in active use
- ~115 anonymous volumes not referenced by any container
- Typical orphaned volume sizes: ~414 MB, ~218 MB
- **Cause**: Volumes created during testing/builds not cleaned up

#### 3. Image Layer Duplication
- 3 nearly identical backend images (1.74GB, 1.92GB, 1.92GB)
- 3 nearly identical frontend images (843MB, 842MB, 843MB)
- **Note**: This is intentional - each agent project runs independently

---

## Active Projects (Preserve)

### CharHub Agent 01
- **Status**: Running (Up 2 days)
- **Containers**: 6 (postgres, redis, backend, frontend, nginx, cloudflared)
- **Volumes**: `charhub-agent-01_postgres_data`, `charhub-agent-01_redis_data`

### CharHub Agent 02
- **Status**: Running (Up 2 days)
- **Containers**: 6 (postgres, redis, backend, frontend, nginx, cloudflared)
- **Volumes**: `charhub-agent-02_postgres_data`, `charhub-agent-02_redis_data`

### CharHub Agent 03
- **Status**: Running (Up 23 hours)
- **Containers**: 6 (postgres, redis, backend, frontend, nginx, cloudflared)
- **Volumes**: `charhub-agent-03_postgres_data`, `charhub-agent-03_redis_data`

**Total Active Containers**: 18
**Total Active Volumes**: 12 (6 named + 6 project volumes)

---

## Remediation Plan

### Phase 1: Docker Cleanup (Safe - ~180 GB recovery)

These commands only affect unused resources:

```bash
# 1. Clear BuildKit build cache (recovers ~142 GB)
docker builder prune -a -f
# -a: Remove all unused cache, not just dangling
# -f: Force (no confirmation prompt)

# 2. Remove unused volumes (recovers ~35 GB)
docker volume prune -f
# Only removes volumes not referenced by any container
# All named volumes (postgres_data, redis_data) are preserved

# 3. Remove dangling images (recovers additional space)
docker image prune -f
# Only removes images not tagged and not used by containers
```

### Phase 2: WSL Disk Compaction

After Docker cleanup, the space is freed within Docker but the ext4.vhdx file remains the same size. WSL needs explicit compaction.

**Run from Windows PowerShell or Command Prompt:**

```powershell
# 1. Optimize WSL disk (shrinks ext4.vhdx to actual used space)
wsl --manage <distro-name> --set-sparse true
wsl --manage <distro-name> --set-sparse false

# OR for WSL1/distributions without --manage:
wsl --shutdown
# Then run from PowerShell in the .vhdx location:
optimize-vhd -Path "\\wsl$\Ubuntu\ext4.vhdx" -Mode Full
```

### Phase 3: Prevention (Future)

Add automated cleanup to crontab:

```bash
# Edit crontab
crontab -e

# Add weekly cleanup (runs every Sunday at 2 AM)
0 2 * * 0 docker builder prune -a -f && docker volume prune -f && docker image prune -f
```

Optional: Configure Docker daemon size limits in `/etc/docker/daemon.json`:

```json
{
  "builder": {
    "gc": {
      "enabled": true,
      "defaultKeepStorage": "10GB"
    }
  }
}
```

---

## Safety Verification

### Commands to Verify Active Resources Before Cleanup

```bash
# List all running containers (should show 18)
docker ps

# List all active volumes (should show 12 in use)
docker volume ls --format "{{.Name}}: {{.UsageData.RefCount}}"

# Verify specific project volumes exist
docker volume ls | grep -E "(charhub-agent-01|charhub-agent-02|charhub-agent-03)"

# Check container health
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Commands to Verify After Cleanup

```bash
# Verify all containers still running
docker ps

# Verify volumes still attached
docker inspect charhub-agent-01-backend-1 | grep -A 10 Mounts

# Check final space usage
docker system df
```

---

## Expected Results

### Before Cleanup
- Docker reported: ~324 GB
- Actual disk usage: ~201 GB
- ext4.vhdx: 222 GB

### After Docker Cleanup
- Docker reported: ~30-40 GB
- Actual disk usage: ~201 GB (no change yet!)
- ext4.vhdx: 222 GB (no change yet!)

### After WSL Compaction
- Docker reported: ~30-40 GB
- Actual disk usage: ~30-40 GB
- ext4.vhdx: ~35-45 GB

---

## Important Notes

1. **The 3 agent projects must remain separate** - each runs its own AI agent with specific containers. This is by design.

2. **Named volumes are always preserved** by `docker volume prune`. Only anonymous volumes (hash names) are removed.

3. **Running containers are never affected** by these cleanup commands.

4. **WSL compaction is required** - Docker cleanup frees space internally, but WSL needs help shrinking the virtual disk file.

5. **Regular maintenance** - Consider scheduling weekly cleanup to prevent recurrence.

---

## References

- Docker Prune Documentation: https://docs.docker.com/engine/reference/commandline/prune/
- WSL Disk Management: https://learn.microsoft.com/en-us/windows/wsl/disk-space
