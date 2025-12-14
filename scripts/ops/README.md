# Operations Scripts

Scripts for monitoring and maintaining the CharHub production environment.

## Scripts

### 📊 monitor-disk-space.sh

Monitors disk space and Docker resource usage, providing alerts and recommendations.

**Usage:**
```bash
# Basic usage (default thresholds: alert at 80%, critical at 85%)
./scripts/ops/monitor-disk-space.sh

# Custom thresholds
./scripts/ops/monitor-disk-space.sh --alert-threshold 75 --cleanup-threshold 90

# Run on production server
gcloud compute ssh charhub-vm --zone=us-central1-a --command="cd /opt/charhub && ./scripts/ops/monitor-disk-space.sh"
```

**What it monitors:**
- Disk usage on `/mnt/stateful_partition`
- Docker images, containers, volumes, and build cache
- System logs (journal)

**Exit codes:**
- `0`: Everything healthy
- `1`: Warning threshold exceeded
- `2`: Critical threshold exceeded

**Recommended schedule:** Weekly or before deployments

---

### 🧹 cleanup-docker.sh

Safely removes unused Docker resources while preserving running containers and named volumes.

**Usage:**
```bash
# Dry run (preview what would be deleted)
./scripts/ops/cleanup-docker.sh --dry-run

# Standard cleanup (removes unused images and build cache)
./scripts/ops/cleanup-docker.sh

# Aggressive cleanup (also removes unused volumes)
./scripts/ops/cleanup-docker.sh --aggressive

# Run on production server
gcloud compute ssh charhub-vm --zone=us-central1-a --command="cd /opt/charhub && ./scripts/ops/cleanup-docker.sh"
```

**What it removes:**

**Standard mode:**
- Dangling images (untagged)
- Unused images (not referenced by any container)
- Build cache
- Dangling volumes only (not attached to any container)

**Aggressive mode:**
- All of the above
- All unused volumes (even if they have a name but aren't used)

**What it preserves:**
- Running containers
- Images used by running containers
- Named volumes used by running containers

**Recommended schedule:** Weekly or when disk usage > 80%

---

## Common Workflows

### Before Deployment

```bash
# Check disk space
./scripts/ops/monitor-disk-space.sh

# If warning/critical, run cleanup
./scripts/ops/cleanup-docker.sh
```

### Weekly Maintenance

```bash
# Monitor
./scripts/ops/monitor-disk-space.sh

# Cleanup if needed (based on recommendations)
./scripts/ops/cleanup-docker.sh
```

### Emergency (Disk Full)

```bash
# Run aggressive cleanup
./scripts/ops/cleanup-docker.sh --aggressive

# Clean system logs
sudo journalctl --vacuum-time=7d

# Verify
./scripts/ops/monitor-disk-space.sh
```

---

## Integration with CI/CD

### GitHub Actions Integration

The deployment workflow automatically runs cleanup after successful deployments to prevent disk space issues.

See: `.github/workflows/deploy.yml`

---

## Troubleshooting

### "No space left on device"

1. **Check disk usage:**
   ```bash
   df -h /mnt/stateful_partition
   ```

2. **Run aggressive cleanup:**
   ```bash
   ./scripts/ops/cleanup-docker.sh --aggressive
   ```

3. **Clean logs:**
   ```bash
   sudo journalctl --vacuum-time=7d
   ```

4. **Find large files:**
   ```bash
   sudo du -h /mnt/stateful_partition | sort -h | tail -20
   ```

### "Cannot remove volume: volume is in use"

This is normal - the script only removes truly unused volumes. If you see this, it means:
- The volume is attached to a container (running or stopped)
- The volume contains important data (like `charhub_postgres_data`)

### Cleanup didn't free enough space

1. **Check what's using space:**
   ```bash
   sudo docker system df -v
   ```

2. **Check for stopped containers:**
   ```bash
   sudo docker ps -a
   ```

3. **Check for large log files:**
   ```bash
   sudo du -sh /var/log/*
   ```

---

## Security Notes

- Scripts require `sudo` for Docker commands
- Use `--dry-run` before running on production
- Always verify running containers after cleanup
- Never use `--aggressive` mode without understanding what will be removed

---

## Maintenance

These scripts should be reviewed and updated:
- After major infrastructure changes
- When adding new services to docker-compose
- When disk usage patterns change significantly

Last updated: 2025-12-14
