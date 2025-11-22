# CharHub Database Backup System

**Last Updated:** 2025-11-22
**Status:** Active

---

## Overview

CharHub uses an automated backup system for the PostgreSQL database running in Docker. Backups are stored both locally on the VM and remotely in Google Cloud Storage (GCS) for redundancy.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    BACKUP ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [PostgreSQL Container]                                          │
│         │                                                        │
│         ▼ pg_dump (daily at 03:00 UTC)                          │
│  [/mnt/stateful_partition/backups/db/]                          │
│         │                                                        │
│         ├─► Local retention: 7 days                             │
│         │                                                        │
│         ▼ gsutil upload (encrypted in transit)                  │
│  [GCS: gs://charhub-deploy-temp/backups/db/]                    │
│         │                                                        │
│         └─► Remote retention: 30 days                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Security

| Aspect | Implementation |
|--------|----------------|
| **Storage** | Google Cloud Storage (private bucket) |
| **Access** | IAM-based, requires gcloud authentication |
| **Transit** | HTTPS/TLS encryption |
| **At Rest** | GCS default encryption |
| **Credentials** | Service account on VM |

**Important:** Backups are NOT stored in Cloudflare R2 because that bucket is public (used for serving images). GCS provides private storage by default.

---

## Quick Reference

### Manual Backup

```bash
# SSH into production VM
gcloud compute ssh charhub-vm --zone=us-central1-a

# Run backup
cd /mnt/stateful_partition/charhub
sudo ./scripts/backup/backup-database.sh
```

### Manual Restore

```bash
# List available backups
sudo ./scripts/backup/restore-database.sh

# Restore from specific backup
sudo ./scripts/backup/restore-database.sh /mnt/stateful_partition/backups/db/charhub_db_20251122_030000.sql.gz

# Restore from GCS
sudo ./scripts/backup/restore-database.sh gs://charhub-deploy-temp/backups/db/charhub_db_20251122_030000.sql.gz
```

### List Backups

```bash
sudo ./scripts/backup/list-backups.sh
```

---

## Scripts

### backup-database.sh

Main backup script that:
1. Creates a `pg_dump` of the database
2. Compresses with gzip
3. Uploads to Google Cloud Storage
4. Rotates old backups based on retention policy
5. Verifies backup integrity

**Options:**
- `--local-only` - Skip GCS upload
- `--no-rotate` - Skip deletion of old backups

**Output:**
- Local: `/mnt/stateful_partition/backups/db/charhub_db_YYYYMMDD_HHMMSS.sql.gz`
- Remote: `gs://charhub-deploy-temp/backups/db/charhub_db_YYYYMMDD_HHMMSS.sql.gz`

### restore-database.sh

Restore script that:
1. Lists available backups (local and remote)
2. Downloads from GCS if needed
3. Creates a safety backup before restore
4. Drops and recreates database
5. Restores from backup
6. Verifies restored data

**Safety Features:**
- Requires explicit "yes" confirmation
- Creates pre-restore backup automatically
- Validates backup integrity before restore

### setup-backup-cron.sh

One-time setup script that:
1. Makes backup scripts executable
2. Creates backup directory
3. Installs cron job for daily backups at 03:00 UTC

### list-backups.sh

Utility script to display all available backups with sizes and dates.

---

## Configuration

### Retention Policy

| Location | Retention | Purpose |
|----------|-----------|---------|
| Local (VM) | 7 days | Quick restore, no download needed |
| Remote (GCS) | 30 days | Disaster recovery, off-site backup |

### Schedule

- **Time:** 03:00 UTC daily (configured in cron)
- **Log:** `/var/log/charhub-backup.log`

### File Naming

Format: `charhub_db_YYYYMMDD_HHMMSS.sql.gz`

Example: `charhub_db_20251122_030000.sql.gz`

---

## Setup Instructions

### Initial Setup (Production VM)

After deploying to production, run the setup script once:

```bash
gcloud compute ssh charhub-vm --zone=us-central1-a

cd /mnt/stateful_partition/charhub
sudo ./scripts/backup/setup-backup-cron.sh
```

### Verify Cron Job

```bash
sudo crontab -l | grep backup
```

Expected output:
```
0 3 * * * cd /mnt/stateful_partition/charhub && /mnt/stateful_partition/charhub/scripts/backup/backup-database.sh >> /var/log/charhub-backup.log 2>&1
```

### Test Backup

```bash
sudo ./scripts/backup/backup-database.sh
```

---

## Monitoring

### View Backup Logs

```bash
# Real-time
tail -f /var/log/charhub-backup.log

# Last 50 lines
tail -50 /var/log/charhub-backup.log
```

### Check Last Backup

```bash
ls -la /mnt/stateful_partition/backups/db/ | tail -5
```

### Verify GCS Uploads

```bash
gsutil ls -l gs://charhub-deploy-temp/backups/db/ | tail -5
```

---

## Disaster Recovery

### Scenario 1: Database Corruption

1. Stop the backend: `docker compose stop backend`
2. List backups: `sudo ./scripts/backup/list-backups.sh`
3. Restore from latest: `sudo ./scripts/backup/restore-database.sh [backup_file]`
4. Restart backend: `docker compose start backend`
5. Verify application

### Scenario 2: VM Failure

1. Create new VM with same configuration
2. Deploy application
3. Download backup from GCS:
   ```bash
   gsutil cp gs://charhub-deploy-temp/backups/db/[latest].sql.gz /tmp/
   ```
4. Restore database
5. Verify application

### Scenario 3: Accidental Data Deletion

1. Check pre-restore backups: `ls /mnt/stateful_partition/backups/db/pre_restore_*`
2. Or use daily backup from before deletion
3. Restore using restore script

---

## Troubleshooting

### Backup Fails

```bash
# Check container is running
docker ps | grep postgres

# Check disk space
df -h /mnt/stateful_partition

# Check logs
tail -100 /var/log/charhub-backup.log
```

### GCS Upload Fails

```bash
# Check gsutil is available
which gsutil

# Check authentication
gcloud auth list

# Test GCS access
gsutil ls gs://charhub-deploy-temp/
```

### Restore Fails

```bash
# Check backup file exists and is valid
gunzip -t /path/to/backup.sql.gz

# Check PostgreSQL container logs
docker logs charhub-postgres-1 --tail 50

# Manual restore attempt
gunzip -c backup.sql.gz | docker exec -i charhub-postgres-1 psql -U charhub -d charhub_db
```

---

## Cost

| Component | Monthly Cost |
|-----------|-------------|
| GCS Storage (~300MB) | ~$0.01 |
| GCS Operations | ~$0.001 |
| **Total** | **< $0.02/month** |

---

## Related Documentation

- [CURRENT_DEPLOYMENT.md](./deploy/CURRENT_DEPLOYMENT.md) - Production infrastructure
- [DEV_OPERATIONS.md](./DEV_OPERATIONS.md) - Docker and development operations
- [CLAUDE.md](../CLAUDE.md) - Database operation guidelines

---

## Changelog

### 2025-11-22
- Initial backup system implementation
- Scripts: backup, restore, list, setup-cron
- GCS integration for remote storage
- Documentation created
