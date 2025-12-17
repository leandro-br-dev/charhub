#!/bin/bash
# Restore PostgreSQL database from backup
#
# Usage:
#   ./restore-database-backup.sh <backup-file>
#
# Examples:
#   ./restore-database-backup.sh backups/database/backup_20251217_143022_abc1234.sql.gz
#   ./restore-database-backup.sh /mnt/stateful_partition/charhub/backups/database/backup_20251217_143022_abc1234.sql.gz
#
# Environment Variables:
#   APP_DIR             - Application directory (default: /mnt/stateful_partition/charhub)
#   COMPOSE             - Docker compose command (default: /var/lib/toolbox/bin/docker-compose)
#   POSTGRES_USER       - Database user (default: charhub)
#   POSTGRES_DB         - Database name (default: charhub_db)
#   SKIP_CONFIRMATION   - Skip confirmation prompt (default: false)

set -e  # Exit on error
set -u  # Exit on undefined variable

# Configuration
APP_DIR="${APP_DIR:-/mnt/stateful_partition/charhub}"
COMPOSE="${COMPOSE:-/var/lib/toolbox/bin/docker-compose}"
POSTGRES_USER="${POSTGRES_USER:-charhub}"
POSTGRES_DB="${POSTGRES_DB:-charhub_db}"
SKIP_CONFIRMATION="${SKIP_CONFIRMATION:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check arguments
if [ $# -eq 0 ]; then
    log_error "Usage: $0 <backup-file>"
    echo ""
    echo "Available backups:"
    ls -lht "$APP_DIR/backups/database/"backup_*.sql.gz 2>/dev/null || log_warn "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Resolve relative paths
if [[ ! "$BACKUP_FILE" =~ ^/ ]]; then
    BACKUP_FILE="$APP_DIR/$BACKUP_FILE"
fi

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    echo ""
    echo "Available backups:"
    ls -lht "$APP_DIR/backups/database/"backup_*.sql.gz 2>/dev/null || log_warn "No backups found"
    exit 1
fi

# Get backup info
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
BACKUP_DATE=$(stat -c%y "$BACKUP_FILE" 2>/dev/null | cut -d' ' -f1,2 | cut -d'.' -f1 || stat -f%Sm "$BACKUP_FILE" 2>/dev/null)

# Display restore information
echo ""
log_info "=========================================="
log_info "DATABASE RESTORE"
log_info "=========================================="
log_info "Backup file: $(basename "$BACKUP_FILE")"
log_info "Backup size: $BACKUP_SIZE"
log_info "Backup date: $BACKUP_DATE"
log_info "Target database: $POSTGRES_DB"
log_info "Target user: $POSTGRES_USER"
echo ""

# Warning
log_warn "⚠️  WARNING: This will OVERWRITE the current database!"
log_warn "⚠️  All current data will be LOST!"
log_warn "⚠️  Make sure you have a backup of the current state if needed!"
echo ""

# Confirmation
if [ "$SKIP_CONFIRMATION" != "true" ]; then
    read -p "Type 'yes' to continue with restore: " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        log_info "Restore cancelled"
        exit 0
    fi
    echo ""
fi

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

# Change to app directory
cd "$APP_DIR"

# Check if postgres container is running
POSTGRES_STATUS=$(sudo $COMPOSE ps postgres --format='{{.Status}}' 2>/dev/null || echo "not found")
if [[ ! "$POSTGRES_STATUS" =~ "Up" ]]; then
    log_error "PostgreSQL container is not running"
    log_error "Status: $POSTGRES_STATUS"
    exit 1
fi

log_info "PostgreSQL container status: $POSTGRES_STATUS"
echo ""

# Start restore process
START_TIME=$(date +%s)

# Step 1: Stop backend to prevent connections
log_step "1/6 Stopping backend container..."
sudo $COMPOSE stop backend
sleep 2
log_info "✅ Backend stopped"
echo ""

# Step 2: Terminate existing connections
log_step "2/6 Terminating existing database connections..."
sudo $COMPOSE exec -T postgres psql -U "$POSTGRES_USER" -d postgres << SQL
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();
SQL
log_info "✅ Connections terminated"
echo ""

# Step 3: Drop and recreate database
log_step "3/6 Dropping and recreating database..."
sudo $COMPOSE exec -T postgres psql -U "$POSTGRES_USER" -d postgres << SQL
DROP DATABASE IF EXISTS ${POSTGRES_DB};
CREATE DATABASE ${POSTGRES_DB};
GRANT ALL PRIVILEGES ON DATABASE ${POSTGRES_DB} TO ${POSTGRES_USER};
SQL
log_info "✅ Database recreated"
echo ""

# Step 4: Restore from backup
log_step "4/6 Restoring from backup (this may take several minutes)..."
gunzip -c "$BACKUP_FILE" | sudo $COMPOSE exec -T postgres psql \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --set ON_ERROR_STOP=on \
  2>&1 | grep -v "^CREATE\|^ALTER\|^COMMENT" || true

RESTORE_EXIT_CODE=${PIPESTATUS[0]}

if [ $RESTORE_EXIT_CODE -ne 0 ]; then
    log_error "Restore failed with exit code: $RESTORE_EXIT_CODE"
    log_error "Database may be in inconsistent state!"
    exit 1
fi

log_info "✅ Backup restored"
echo ""

# Step 5: Verify database
log_step "5/6 Verifying database..."
TABLE_COUNT=$(sudo $COMPOSE exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$TABLE_COUNT" -eq 0 ]; then
    log_warn "No tables found in database - restore may have failed"
else
    log_info "✅ Database verified: $TABLE_COUNT tables found"
fi
echo ""

# Step 6: Restart backend
log_step "6/6 Restarting backend container..."
sudo $COMPOSE start backend
sleep 10

# Wait for backend to be healthy
log_info "Waiting for backend to become healthy..."
for i in {1..30}; do
    STATUS=$(sudo $COMPOSE ps backend --format='{{.Status}}' 2>/dev/null)
    if [[ "$STATUS" =~ "healthy" ]]; then
        log_info "✅ Backend is healthy"
        break
    elif [[ "$STATUS" =~ "Up" ]]; then
        echo -n "."
        sleep 2
    else
        log_warn "Backend status: $STATUS"
        sleep 2
    fi
done
echo ""

FINAL_STATUS=$(sudo $COMPOSE ps backend --format='{{.Status}}' 2>/dev/null)
if [[ "$FINAL_STATUS" =~ "Up" ]] || [[ "$FINAL_STATUS" =~ "healthy" ]]; then
    log_info "✅ Backend restarted successfully"
else
    log_warn "⚠️  Backend may not be healthy: $FINAL_STATUS"
    log_warn "Check logs: sudo $COMPOSE logs backend"
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Summary
echo ""
log_info "=========================================="
log_info "RESTORE COMPLETE"
log_info "=========================================="
log_info "Restored from: $(basename "$BACKUP_FILE")"
log_info "Duration: ${DURATION}s"
log_info "Tables restored: $TABLE_COUNT"
log_info "Backend status: $FINAL_STATUS"
echo ""
log_info "Next steps:"
log_info "1. Verify application is working: curl http://localhost:3000/api/v1/health"
log_info "2. Check backend logs: sudo $COMPOSE logs -f backend"
log_info "3. Test critical functionality"
echo ""

exit 0
