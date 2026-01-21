# CharHub Scripts

**Last Updated**: 2025-12-05

---

## 📋 Overview

This directory contains automation scripts for CharHub infrastructure and maintenance tasks.

---

## 📂 Directory Structure

```
scripts/
├── backup/              # Database backup and restore scripts
│   ├── backup-database.sh
│   ├── restore-database.sh
│   ├── list-backups.sh
│   ├── setup-backup-cron.sh
│   ├── charhub-backup.service
│   └── charhub-backup.timer
└── archive/             # Deprecated scripts (historical reference)
    └── legacy/          # Old PowerShell deployment scripts
```

---

## 🚀 Active Scripts

### 📦 Backup Scripts (`/backup/`)

**Purpose**: Automated database backup and restore

**Key Scripts**:
- **`backup-database.sh`** - Create compressed PostgreSQL backup
- **`restore-database.sh`** - Restore database from backup
- **`list-backups.sh`** - List all available backups

**Documentation**: [Backup & Restore Guide](../docs/03-reference/scripts/backup-restore-guide.md)

**Quick Start**:
```bash
# Create backup
sudo ./scripts/backup/backup-database.sh

# List backups
sudo ./scripts/backup/list-backups.sh

# Restore from backup
sudo ./scripts/backup/restore-database.sh /path/to/backup.sql.gz
```

**Status**: ✅ **Tested and Production Ready**

**Requirements**:
- PostgreSQL container running
- Docker access
- `gsutil` for GCS upload (optional)

---

## 📚 Script Categories

### Database Management
- **Backup**: `/backup/backup-database.sh`
- **Restore**: `/backup/restore-database.sh`
- **List**: `/backup/list-backups.sh`

### Deployment
- **Current**: GitHub Actions (`.github/workflows/deploy-production.yml`)
- **Legacy**: Archived PowerShell scripts (see `/archive/legacy/`)

### Monitoring
- **Health Checks**: Integrated in GitHub Actions workflow
- **Manual Check**: `curl https://charhub.app/api/v1/health`

---

## 🔧 Script Development Guidelines

### Creating New Scripts

1. **Choose Category**: backup, deployment, monitoring, or maintenance
2. **Follow Naming**: `action-target.sh` (e.g., `backup-database.sh`)
3. **Add Documentation**: Update this README and create guide in `/docs/03-reference/scripts/`
4. **Include Header**:
```bash
#!/bin/bash
# ============================================
# Script Name and Purpose
# ============================================
# Description
# Usage: ./script-name.sh [options]
# ============================================

set -e  # Exit on error
```

5. **Error Handling**:
```bash
error_exit() {
    echo "[ERROR] $1" >&2
    exit 1
}
```

6. **Logging**:
```bash
log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $1"
}
```

### Testing Scripts

1. **Test in non-production first**
2. **Dry-run mode** when possible
3. **Document test results**
4. **Verify error handling**
5. **Check permissions**

---

## 📖 Documentation

### Active Scripts Documentation
- [Backup & Restore Guide](../docs/03-reference/scripts/backup-restore-guide.md)

### Archived Scripts
- [Archive README](./archive/README.md) - Why scripts were archived

### Related Guides
- [Deployment Guide](../docs/02-guides/deployment/) - Infrastructure setup and deployment
- [Operations Guide](../docs/06-operations/) - SRE, monitoring, and incident response

---

## 🔐 Permissions

Scripts require specific permissions:

| Script | Permission Required | Why |
|--------|-------------------|-----|
| `backup-database.sh` | sudo | Docker exec, file write to `/mnt/stateful_partition` |
| `restore-database.sh` | sudo | Docker exec, database drop/create |
| `list-backups.sh` | sudo | Read `/mnt/stateful_partition`, gsutil access |

**Best Practice**: Use `sudo` only when necessary, run as normal user when possible.

---

## 🚨 Important Notes

### For Agent Reviewer
- ✅ Can run all scripts
- ✅ Responsible for backup schedule
- ✅ Should test restore procedure monthly
- ⚠️ Always create backup before major changes

### For Agent Coder
- ℹ️ Should know scripts exist
- ℹ️ Can read documentation
- ❌ Should not modify scripts (Agent Reviewer's responsibility)
- ℹ️ Report script issues to Agent Reviewer

---

## 📊 Maintenance Schedule

### Daily (Automated)
- Database backup (via systemd timer)

### Weekly (Manual)
- Verify backups exist
- Check backup log

### Monthly (Manual)
- Test restore procedure
- Verify GCS access
- Check disk usage

---

## 🆘 Troubleshooting

### Script Fails to Execute
```bash
# Check permissions
ls -la scripts/backup/

# Make executable
chmod +x scripts/backup/*.sh

# Check she bang
head -1 scripts/backup/backup-database.sh
# Should be: #!/bin/bash
```

### Permission Denied
```bash
# Run with sudo
sudo ./scripts/backup/backup-database.sh

# Or fix ownership
sudo chown -R $(whoami):$(whoami) scripts/
```

### Docker Not Found
```bash
# Scripts expect Docker to be available
docker --version

# If not found, install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

---

## 📞 Support

- **Script Issues**: See individual script documentation
- **Backup Issues**: [Backup & Restore Guide](../docs/03-reference/scripts/backup-restore-guide.md)
- **General Questions**: [GitHub Discussions](https://github.com/leandro-br-dev/charhub/discussions)

---

[← Back to Documentation Home](../docs/README.md)
