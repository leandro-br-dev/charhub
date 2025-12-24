#!/bin/bash
# Automated PostgreSQL backup for production deploys
# Creates timestamped compressed backups with retention policy
#
# Usage:
#   ./backup-database.sh
#
# Environment Variables:
#   APP_DIR             - Application directory (default: /mnt/stateful_partition/charhub)
#   COMPOSE             - Docker compose command (default: /var/lib/toolbox/bin/docker-compose)
#   POSTGRES_USER       - Database user (default: charhub)
#   POSTGRES_DB         - Database name (default: charhub_db)
#   RETENTION_DAYS      - Days to keep backups (default: 30)
#   MAX_BACKUPS         - Maximum number of backups to keep (default: 10)
#   GITHUB_SHA          - Commit SHA for filename (optional)

set -e  # Exit on error
set -u  # Exit on undefined variable

# Configuration
APP_DIR="${APP_DIR:-/mnt/stateful_partition/charhub}"
BACKUP_DIR="$APP_DIR/backups/database"
COMPOSE="${COMPOSE:-/var/lib/toolbox/bin/docker-compose}"
POSTGRES_USER="${POSTGRES_USER:-charhub}"
POSTGRES_DB="${POSTGRES_DB:-charhub_db}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
MAX_BACKUPS="${MAX_BACKUPS:-10}"
GITHUB_SHA="${GITHUB_SHA:-manual}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
COMMIT_SHORT="${GITHUB_SHA:0:7}"
BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}_${COMMIT_SHORT}.sql.gz"

log_info "Starting database backup..."
log_info "Target: $BACKUP_FILE"
log_info "Database: $POSTGRES_DB"
log_info "User: $POSTGRES_USER"
echo ""

# Check if docker-compose is available
# Support both command format (docker compose) and file path (/path/to/docker-compose)
if [[ "$COMPOSE" == *" "* ]]; then
    # It's a command with spaces (e.g., "docker compose")
    COMPOSE_CMD=$(echo "$COMPOSE" | cut -d' ' -f1)
    if ! command -v "$COMPOSE_CMD" &> /dev/null; then
        log_error "Docker compose command not found: $COMPOSE"
        exit 1
    fi
else
    # It's a file path
    if [ ! -f "$COMPOSE" ]; then
        log_error "Docker compose not found at: $COMPOSE"
        exit 1
    fi
fi

# Check if postgres container is running
cd "$APP_DIR"
POSTGRES_STATUS=$(sudo $COMPOSE ps postgres --format='{{.Status}}' 2>/dev/null || echo "not found")
if [[ ! "$POSTGRES_STATUS" =~ "Up" ]]; then
    log_error "PostgreSQL container is not running"
    log_error "Status: $POSTGRES_STATUS"
    exit 1
fi

log_info "PostgreSQL container status: $POSTGRES_STATUS"
echo ""

# Execute backup
log_info "Creating backup (this may take a few minutes)..."
START_TIME=$(date +%s)

# Use gzip -6 (balanced compression) instead of -9 (maximum)
# Savings: ~1-2 min for typical databases
# Trade-off: ~5-10% larger file size, but 6-8x faster compression
sudo $COMPOSE exec -T postgres pg_dump \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  2>/dev/null | gzip -6 > "$BACKUP_FILE"

BACKUP_EXIT_CODE=${PIPESTATUS[0]}
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Verify backup was created
if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file was not created"
    exit 1
fi

if [ $BACKUP_EXIT_CODE -ne 0 ]; then
    log_error "pg_dump failed with exit code: $BACKUP_EXIT_CODE"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Get backup size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
BACKUP_SIZE_BYTES=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE" 2>/dev/null || echo "0")

# Verify backup is not empty (should be at least 1KB)
if [ "$BACKUP_SIZE_BYTES" -lt 1024 ]; then
    log_error "Backup file is too small (${BACKUP_SIZE}), likely corrupted"
    rm -f "$BACKUP_FILE"
    exit 1
fi

echo ""
log_info "✅ Backup created successfully!"
log_info "File: $(basename "$BACKUP_FILE")"
log_info "Size: $BACKUP_SIZE"
log_info "Duration: ${DURATION}s"
echo ""

# Retention: Delete backups older than N days
log_info "Applying retention policy..."
log_info "Retention: ${RETENTION_DAYS} days, ${MAX_BACKUPS} backups maximum"

DELETED_BY_AGE=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -print -delete | wc -l)
if [ "$DELETED_BY_AGE" -gt 0 ]; then
    log_info "Deleted $DELETED_BY_AGE backup(s) older than ${RETENTION_DAYS} days"
fi

# Keep only last N backups
cd "$BACKUP_DIR"
BACKUP_COUNT=$(ls -t backup_*.sql.gz 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
    EXCESS_COUNT=$((BACKUP_COUNT - MAX_BACKUPS))
    log_info "Deleting $EXCESS_COUNT oldest backup(s) (keeping last ${MAX_BACKUPS})"
    ls -t backup_*.sql.gz | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm
fi

# List remaining backups
echo ""
log_info "Current backups:"
ls -lht "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | head -n 5 || log_warn "No backups found"

# Calculate total backup size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "unknown")
log_info "Total backup size: $TOTAL_SIZE"

echo ""
log_info "✅ Backup complete!"
log_info "To restore this backup:"
log_info "  ./scripts/ops/restore-database-backup.sh \"$BACKUP_FILE\""

exit 0
