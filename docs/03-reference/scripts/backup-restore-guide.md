# Database Backup & Restore Guide

**Last Updated**: 2025-12-05
**Status**: ✅ Tested and Production Ready
**Location**: `/scripts/backup/`

---

## 📋 Overview

CharHub includes automated database backup scripts that:
- Create compressed PostgreSQL backups
- Upload to Google Cloud Storage
- Rotate old backups automatically
- Provide easy restore functionality

---

## 🚀 Quick Start

### Create Backup
```bash
cd /root/projects/charhub-reviewer
sudo ./scripts/backup/backup-database.sh
```

### List Backups
```bash
sudo ./scripts/backup/list-backups.sh
```

### Restore from Backup
```bash
sudo ./scripts/backup/restore-database.sh /mnt/stateful_partition/backups/db/charhub_db_20251205_120000.sql.gz
```

---

## 📂 Available Scripts

### 1. backup-database.sh
**Purpose**: Create database backup and upload to GCS

**Usage**:
```bash
./backup-database.sh [--local-only] [--no-rotate]
```

**Options**:
- `--local-only` - Skip upload to Google Cloud Storage
- `--no-rotate` - Skip deletion of old backups

**What it does**:
1. Creates compressed backup of PostgreSQL database
2. Verifies backup integrity
3. Uploads to GCS (unless `--local-only`)
4. Rotates old backups (unless `--no-rotate`)
5. Logs all operations

**Configuration**:
- Local storage: `/mnt/stateful_partition/backups/db`
- GCS bucket: `gs://charhub-deploy-temp/backups/db`
- Local retention: 7 days
- Remote retention: 30 days
- Container name: `charhub-postgres-1`
- Database: `charhub_db`
- User: `charhub`

**Requirements**:
- PostgreSQL container must be running
- `gsutil` command for GCS upload (optional)
- Write permissions to `/mnt/stateful_partition/backups`

---

### 2. restore-database.sh
**Purpose**: Restore database from backup file

**Usage**:
```bash
./restore-database.sh [backup_file]
```

**Examples**:
```bash
# Restore from local backup
./restore-database.sh /mnt/stateful_partition/backups/db/charhub_db_20251205_120000.sql.gz

# Restore from GCS
./restore-database.sh gs://charhub-deploy-temp/backups/db/charhub_db_20251205_120000.sql.gz

# List available backups
./restore-database.sh
```

**What it does**:
1. Lists available backups (if no file specified)
2. Verifies backup file integrity
3. Creates safety backup before restore
4. Drops and recreates database
5. Restores from backup file
6. Verifies restored data
7. Shows table counts

**Safety Features**:
- Requires explicit confirmation (`yes`)
- Creates pre-restore safety backup
- Verifies file integrity before restore
- Downloads GCS files to temp location

**⚠️ WARNING**: This will **REPLACE ALL DATA** in the database!

---

### 3. list-backups.sh
**Purpose**: Quick view of all available backups

**Usage**:
```bash
./list-backups.sh
```

**Output**:
- Local backups with size and date
- Remote GCS backups with size and date
- Total count and space used

---

## 🔄 Automated Backups

### Using Systemd Timer (Recommended for Production)

**Files**:
- `/scripts/backup/charhub-backup.service` - Service definition
- `/scripts/backup/charhub-backup.timer` - Timer configuration
- `/scripts/backup/setup-backup-cron.sh` - Setup script

**Setup**:
```bash
cd /root/projects/charhub-reviewer
sudo ./scripts/backup/setup-backup-cron.sh
```

**Verify**:
```bash
# Check timer status
sudo systemctl status charhub-backup.timer

# Check last backup
sudo journalctl -u charhub-backup.service -n 50
```

**Schedule**:
- Default: Daily at 3:00 AM
- Configurable in `charhub-backup.timer`

---

## 🧪 Testing Scripts

### Test Backup Script
```bash
# Test with local-only (no GCS upload)
sudo ./scripts/backup/backup-database.sh --local-only

# Verify backup was created
ls -lh /mnt/stateful_partition/backups/db/

# Verify backup integrity
gunzip -t /mnt/stateful_partition/backups/db/charhub_db_*.sql.gz
```

### Test Restore Script
```bash
# List backups (no restore)
sudo ./scripts/backup/restore-database.sh

# Test restore in non-production environment
# (DO NOT run in production without backup!)
sudo ./scripts/backup/restore-database.sh /path/to/backup.sql.gz
```

---

## 🔐 Permissions

### Required Permissions
- **Local filesystem**: Write to `/mnt/stateful_partition/backups`
- **Docker**: Execute commands in PostgreSQL container
- **GCS** (optional): `gsutil` configured with service account

### GCS Authentication
```bash
# Configure gsutil (on VM)
gcloud auth configure-docker

# Test access
gsutil ls gs://charhub-deploy-temp/backups/db/
```

---

## 📊 Backup Retention Policy

| Location | Retention | Rotation |
|----------|-----------|----------|
| Local (`/mnt/stateful_partition/backups`) | 7 days | Automatic |
| Remote (GCS `charhub-deploy-temp`) | 30 days | Automatic |

**Disk Usage**:
- Average backup size: ~5-10 MB (compressed)
- 7 local backups: ~70 MB max
- 30 remote backups: ~300 MB max

---

## 🚨 Troubleshooting

### Backup Fails

**Error**: `PostgreSQL container 'charhub-postgres-1' is not running`
```bash
# Check container status
docker ps | grep postgres

# Start postgres
docker compose up -d postgres
```

**Error**: `gsutil not found`
```bash
# Install gcloud SDK
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init
```

**Error**: `Permission denied`
```bash
# Fix permissions
sudo chown -R $(whoami):$(whoami) /mnt/stateful_partition/backups
sudo chmod -R 755 /scripts/backup/
```

---

### Restore Fails

**Error**: `Backup file is corrupted`
```bash
# Verify file
gunzip -t /path/to/backup.sql.gz

# If corrupted, try different backup
./scripts/backup/list-backups.sh
```

**Error**: `Database drop failed`
```bash
# Disconnect all users first
docker exec charhub-postgres-1 psql -U charhub -d postgres -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = 'charhub_db';
"

# Then retry restore
```

---

## 📝 Best Practices

### Before Major Changes
```bash
# Create manual backup
sudo ./scripts/backup/backup-database.sh --local-only

# Document what you're about to do
echo "Pre-migration backup: $(date)" >> /var/log/charhub-backup.log
```

### Before Restore
```bash
# Always list backups first
./scripts/backup/list-backups.sh

# Choose the right backup
# - Most recent for disaster recovery
# - Specific date for rollback
```

### After Restore
```bash
# Restart backend to reconnect
docker compose restart backend

# Verify application works
curl https://charhub.app/api/v1/health

# Check logs
docker compose logs -f backend
```

---

## 🔗 Related Documentation

- [Infrastructure Guide](../../02-guides/infrastructure/database-connection.md)
- [Operations - Maintenance](../../06-operations/maintenance/)
- [Deployment Guide](../../02-guides/deployment/)

---

## 📈 Monitoring Backups

### Check Last Backup
```bash
# View logs
tail -50 /var/log/charhub-backup.log

# Check systemd
sudo journalctl -u charhub-backup.service -since yesterday
```

### Verify Backup Schedule
```bash
# List timers
sudo systemctl list-timers --all | grep charhub

# Show timer details
sudo systemctl status charhub-backup.timer
```

---

## 🆘 Emergency Recovery

### Complete Data Loss
```bash
# 1. List available backups
./scripts/backup/list-backups.sh

# 2. Restore from most recent backup
./scripts/backup/restore-database.sh gs://charhub-deploy-temp/backups/db/charhub_db_LATEST.sql.gz

# 3. Restart services
docker compose restart backend

# 4. Verify
curl https://charhub.app
```

### Partial Data Corruption
```bash
# 1. Identify corruption
docker exec charhub-postgres-1 psql -U charhub -d charhub_db -c "SELECT * FROM User LIMIT 1;"

# 2. Restore from backup before corruption
./scripts/backup/list-backups.sh
./scripts/backup/restore-database.sh [backup-before-corruption]

# 3. Replay recent changes if possible
# (requires application logs or transaction logs)
```

---

[← Back to Scripts Reference](./README.md) | [← Back to Documentation Home](../../README.md)
