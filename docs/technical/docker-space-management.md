# Docker Space Management

**Environment**: Development Only (NOT for production)
**Last Updated**: 2026-01-18
**Related**: [FEATURE-012](../05-business/planning/features/backlog/FEATURE-012-docker-space-management.md)

---

## Overview

This document describes the Docker space management system implemented to prevent disk exhaustion from Docker build cache accumulation.

### Problem

Agent Coder uses `docker compose up -d --build` for every restart, creating ~500MB-2GB of new cache layers each time. With 3 agent projects doing this multiple times daily, the cache can grow to 100GB+ within days.

### Solution

1. **Behavior Change**: Use `--build` only when necessary
2. **Automated Cleanup**: Daily/weekly cron jobs
3. **Cache Limits**: Docker daemon configured with 10GB max cache
4. **Monitoring**: Space check scripts with alert thresholds

---

## Quick Reference

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `docker-smart-restart.sh` | Intelligent restart | Daily development |
| `docker-space-check.sh` | Check space usage | Before builds, weekly |
| `docker-cleanup-quick.sh` | Light cleanup | After development sessions |
| `docker-cleanup-full.sh` | Full cleanup | Emergency only |
| `docker-maintenance-setup.sh` | Configure cron | Once per host |

---

## Setup Instructions

### For Each Agent (After Pull)

When you pull this repository to a new machine or agent project:

#### Step 1: Copy daemon.json (if not exists)

```bash
# Check if daemon.json exists
cat /etc/docker/daemon.json

# If not, copy from example
sudo cp docker/daemon.json.example /etc/docker/daemon.json
sudo systemctl restart docker
```

#### Step 2: Setup Cron (Once Per Host)

```bash
# Run the setup script
./scripts/docker-maintenance-setup.sh
```

The script will:
- Check if cron is already configured (shared across projects)
- Add cron entries only if not present
- Create log file if needed

**Important**: Only ONE cron configuration is needed per host. If another agent already configured it, the script will detect this and skip.

#### Step 3: Verify Setup

```bash
# Check cron is configured
crontab -l | grep docker-maintenance

# Check Docker space
./scripts/docker-space-check.sh

# Test cleanup script (safe to run)
./scripts/docker-cleanup-quick.sh
```

---

## Daily Development Workflow

### Restarting Containers

**Preferred Method**: Use the smart restart script:

```bash
./scripts/docker-smart-restart.sh
```

This automatically detects if rebuild is needed based on file changes.

**Manual Method**: Only use `--build` when necessary:

```bash
# DEFAULT: No rebuild (use for most restarts)
docker compose down
docker compose up -d

# REBUILD: Only when Dockerfile, package.json, or prisma schema changed
docker compose up -d --build backend
docker compose up -d --build frontend
```

### When to Rebuild

| File Changed | Action |
|--------------|--------|
| `backend/Dockerfile` | `--build backend` |
| `frontend/Dockerfile` | `--build frontend` |
| `package.json` or `package-lock.json` | `--build <service>` |
| `prisma/schema.prisma` | `--build backend` |
| Source code only | No `--build` needed |

---

## Automated Maintenance

### Cron Schedule

| Time | Frequency | Action |
|------|-----------|--------|
| 3:00 AM | Daily | Quick cleanup (cache > 48h) |
| 4:00 AM | Sunday | Deep cleanup (all unused) |

### Logs

```bash
# View maintenance logs
tail -f /var/log/docker-maintenance.log

# Check last cleanup
grep "Maintenance Complete" /var/log/docker-maintenance.log | tail -5
```

---

## Manual Cleanup

### Quick Cleanup (Safe)

Removes only old/unused items. Safe to run anytime:

```bash
./scripts/docker-cleanup-quick.sh
```

### Full Cleanup (Emergency)

Use only when disk is critically low:

```bash
./scripts/docker-cleanup-full.sh
```

**Note**: Named volumes (postgres_data, redis_data) are NEVER deleted.

---

## Monitoring

### Space Check

```bash
./scripts/docker-space-check.sh
```

**Thresholds**:
- **OK** (exit 0): Cache < 50GB
- **Warning** (exit 1): Cache 50-100GB
- **Critical** (exit 2): Cache > 100GB

### Manual Check

```bash
docker system df
```

---

## WSL-Specific: Disk Compaction

After cleanup, WSL needs manual compaction to reclaim space in the ext4.vhdx file.

### Steps (Run from Windows PowerShell)

```powershell
# 1. Shutdown WSL
wsl --shutdown

# 2. Wait a few seconds, then compact
# Option A: Using diskpart (requires admin)
diskpart
# In diskpart:
#   select vdisk file="C:\Users\<user>\AppData\Local\Packages\...\LocalState\ext4.vhdx"
#   compact vdisk
#   exit

# Option B: Using Optimize-VHD (Hyper-V feature)
Optimize-VHD -Path "C:\path\to\ext4.vhdx" -Mode Full
```

**When to Compact**:
- After running `docker-cleanup-full.sh`
- When ext4.vhdx is significantly larger than actual usage
- Monthly maintenance

---

## Troubleshooting

### "Disk full" Error

1. Run `./scripts/docker-cleanup-full.sh`
2. Compact WSL disk (see above)
3. Check if cron is running: `crontab -l`

### Cron Not Running

```bash
# Check cron service
systemctl status cron

# Re-run setup
./scripts/docker-maintenance-setup.sh
```

### Build Cache Growing Despite Limits

1. Verify daemon.json: `cat /etc/docker/daemon.json`
2. Restart Docker: `sudo systemctl restart docker`
3. Check if agents are using `--build` unnecessarily

---

## Configuration Files

| File | Purpose |
|------|---------|
| `/etc/docker/daemon.json` | Docker daemon config (10GB cache limit) |
| `docker/daemon.json.example` | Template for daemon.json |
| `/var/log/docker-maintenance.log` | Cron job logs |
| `.docker-build-marker-*` | Smart restart tracking files |

---

## Related Documentation

- [FEATURE-012: Docker Space Management](../05-business/planning/features/backlog/FEATURE-012-docker-space-management.md) - Full specification
- [docker-space-analysis.md](./docker-space-analysis.md) - Original problem analysis
- [Agent Coder CLAUDE.md](../agents/coder/CLAUDE.md) - Agent guidelines
