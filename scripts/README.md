# CharHub Scripts

**Last Updated**: 2025-01-25

---

## 📋 Overview

This directory contains automation scripts for CharHub infrastructure, organized by category and purpose.

---

## 📂 Directory Structure

```
scripts/
├── backup/              # Database backup and restore scripts
│   ├── backup-database.sh       # Create PostgreSQL backup
│   ├── restore-database.sh      # Restore from backup
│   ├── list-backups.sh          # List available backups
│   └── setup-backup-cron.sh     # Configure automated backups
│
├── database/            # Database management scripts
│   ├── db-switch.sh             # Switch between clean/populated database
│   └── db-copy-from-env.sh      # Copy database from environment
│
├── docker/              # Docker maintenance scripts
│   ├── docker-smart-restart.sh       # Smart container restart
│   ├── docker-cleanup-quick.sh       # Quick Docker cleanup
│   ├── docker-cleanup-full.sh        # Full Docker cleanup
│   ├── docker-space-check.sh         # Check Docker disk usage
│   ├── docker-maintenance-setup.sh   # Setup maintenance cron
│   └── docker-maintenance-cron.sh    # Maintenance cron job
│
└── ops/                 # Operational scripts (production)
    ├── health-check.sh             # Service health checks
    ├── env-compare.sh              # Compare .env keys
    ├── env-sync-production.sh      # Sync .env to production
    ├── monitor-disk-space.sh       # Monitor disk usage
    ├── backup-database.sh          # Production backup
    ├── restore-database-backup.sh  # Production restore
    ├── cleanup-docker.sh           # Production Docker cleanup
    └── install-native-docker.sh    # Install Docker on server
```

---

## 🚀 Scripts by Category

### 📦 Database Backup (`/backup/`)

**Purpose**: Local development database backup and restore

| Script | Description | Usage |
|--------|-------------|-------|
| `backup-database.sh` | Create compressed backup | `sudo ./scripts/backup/backup-database.sh` |
| `restore-database.sh` | Restore from backup | `sudo ./scripts/backup/restore-database.sh <file>` |
| `list-backups.sh` | List available backups | `sudo ./scripts/backup/list-backups.sh` |
| `setup-backup-cron.sh` | Configure automated backups | `sudo ./scripts/backup/setup-backup-cron.sh` |

**Used by**: Local development

**Documentation**: [Backup & Restore Guide](../docs/03-reference/scripts/backup-restore-guide.md)

**Status**: ✅ Tested and Production Ready

---

### 🗄️ Database Management (`/database/`)

**Purpose**: Database state management for testing

| Script | Description | Usage |
|--------|-------------|-------|
| `db-switch.sh` | Switch clean/populated DB | `./scripts/database/db-switch.sh [clean\|restore]` |
| `db-copy-from-env.sh` | Copy DB from environment | `./scripts/database/db-copy-from-env.sh` |

**Used by**: Testing workflow, feature-tester agent

**Global Skill**: `database-switch`

---

### 🐳 Docker Maintenance (`/docker/`)

**Purpose**: Docker container maintenance and cleanup

| Script | Description | Usage |
|--------|-------------|-------|
| `docker-smart-restart.sh` | Smart container restart | `./scripts/docker/docker-smart-restart.sh` |
| `docker-cleanup-quick.sh` | Quick cleanup (images, volumes) | `./scripts/docker/docker-cleanup-quick.sh` |
| `docker-cleanup-full.sh` | Full cleanup (including system) | `./scripts/docker/docker-cleanup-full.sh` |
| `docker-space-check.sh` | Check Docker disk usage | `./scripts/docker/docker-space-check.sh` |
| `docker-maintenance-setup.sh` | Setup maintenance cron | `sudo ./scripts/docker/docker-maintenance-setup.sh` |
| `docker-maintenance-cron.sh` | Maintenance cron job | (called by cron) |

**Used by**: Development and production maintenance

**Global Skill**: `container-health-check`

---

### ⚙️ Operations (`/ops/`)

**Purpose**: Production server operations and environment management

| Script | Description | Usage |
|--------|-------------|-------|
| `health-check.sh` | Check service health | `./scripts/ops/health-check.sh` |
| `env-compare.sh` | Compare .env keys | `./scripts/ops/env-compare.sh` |
| `env-sync-production.sh` | Sync .env to production | `./scripts/ops/env-sync-production.sh [--dry-run]` |
| `monitor-disk-space.sh` | Monitor disk usage | `./scripts/ops/monitor-disk-space.sh` |
| `backup-database.sh` | Production backup | `./scripts/ops/backup-database.sh` |
| `restore-database-backup.sh` | Production restore | `./scripts/ops/restore-database-backup.sh <file>` |
| `cleanup-docker.sh` | Production Docker cleanup | `./scripts/ops/cleanup-docker.sh` |
| `install-native-docker.sh` | Install Docker | `sudo ./scripts/ops/install-native-docker.sh` |

**Used by**: Agent Reviewer, env-guardian sub-agent

**Skill**: `production-env-sync`

---

## 🔧 Script Usage by Agent

### Agent Coder (Development)

Uses scripts for local development and testing:
- `database/db-switch.sh` - Switch database modes
- `docker/docker-smart-restart.sh` - Restart containers

### Agent Reviewer (Operations)

Uses scripts for production operations:
- `ops/env-compare.sh` - Before deployment
- `ops/env-sync-production.sh` - Sync to production
- `ops/health-check.sh` - Verify deployment

---

## 🔐 Permissions

### Development Scripts (No sudo required)
- `database/*` - Database switching
- `docker/*` - Docker operations (if user in docker group)

### Production Scripts (Sudo required)
- `ops/*` - Production operations
- `backup/*` - Backup operations

**Best Practice**: Use `sudo` only when necessary.

---

## 📖 Documentation

### Script Documentation
- [Backup & Restore Guide](../docs/03-reference/scripts/backup-restore-guide.md)
---

## 🚨 Important Notes

### For Agent Reviewer
- ✅ Can run all scripts
- ✅ Responsible for production operations
- ✅ Should verify health after operations
- ⚠️ Always use `env-compare.sh` before deployment

### For Agent Coder
- ✅ Can use `db-switch.sh` for testing
- ✅ Can use `docker-smart-restart.sh` for development
- ❌ Should NOT run production scripts (`ops/*`)
- ℹ️ Report production issues to Agent Reviewer

---

## 📊 Maintenance Schedule

### Daily (Automated)
- Database backup (via systemd timer on production)

### As Needed
- `health-check.sh` - Before/after deployments
- `env-compare.sh` - Before every deployment
- `env-sync-production.sh` - When environment changes

### Weekly
- `docker-cleanup-quick.sh` - Free up Docker space

---

## 🆘 Troubleshooting

### Script Fails to Execute
```bash
# Check permissions
ls -la scripts/

# Make executable
chmod +x scripts/category/script.sh
```

### Permission Denied
```bash
# Run with sudo (for production scripts)
sudo ./scripts/ops/script.sh

# Add user to docker group (for Docker scripts)
sudo usermod -aG docker $USER
newgrp docker
```

### Health Check Fails
```bash
# Run diagnostics
./scripts/ops/health-check.sh

# Check container status
docker ps -a

# Smart restart
./scripts/docker/docker-smart-restart.sh
```

---

## 🔗 Related Skills

Global skills that use these scripts:
- `database-switch` - Uses `database/db-switch.sh`
- `container-health-check` - Uses `ops/health-check.sh`
- `production-env-sync` - Uses `ops/env-compare.sh` and `ops/env-sync-production.sh`

---

[← Back to Documentation Home](../docs/README.md)
