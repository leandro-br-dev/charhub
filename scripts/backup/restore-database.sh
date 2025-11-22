#!/bin/bash
# ============================================
# CharHub Database Restore Script
# ============================================
# Restores PostgreSQL database from backup
# Usage: ./restore-database.sh [backup_file]
#
# If no backup file is specified, lists available backups
# ============================================

set -e

# Configuration
BACKUP_DIR="/mnt/stateful_partition/backups/db"
GCS_BUCKET="gs://charhub-deploy-temp/backups/db"
CONTAINER_NAME="charhub-postgres-1"
DB_USER="charhub"
DB_NAME="charhub_db"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log() {
    echo -e "${CYAN}[$(date '+%H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# List available backups
list_backups() {
    echo ""
    echo "============================================"
    echo "         Available Backups"
    echo "============================================"
    echo ""

    echo -e "${CYAN}Local backups (${BACKUP_DIR}):${NC}"
    if [ -d "$BACKUP_DIR" ] && ls "$BACKUP_DIR"/charhub_db_*.sql.gz 1> /dev/null 2>&1; then
        ls -lh "$BACKUP_DIR"/charhub_db_*.sql.gz | awk '{print "  " $9 " (" $5 ")"}'
    else
        echo "  (none)"
    fi

    echo ""
    echo -e "${CYAN}Remote backups (GCS):${NC}"
    if command -v gsutil &> /dev/null; then
        gsutil ls -l "${GCS_BUCKET}/" 2>/dev/null | grep "charhub_db_" | awk '{print "  " $3 " (" $1 " bytes)"}' || echo "  (none or error accessing GCS)"
    else
        echo "  (gsutil not available)"
    fi

    echo ""
    echo "============================================"
    echo "Usage: $0 <backup_file>"
    echo ""
    echo "Examples:"
    echo "  $0 ${BACKUP_DIR}/charhub_db_20251122_030000.sql.gz"
    echo "  $0 gs://charhub-deploy-temp/backups/db/charhub_db_20251122_030000.sql.gz"
    echo "============================================"
}

# Main restore function
restore_backup() {
    local BACKUP_FILE=$1
    local TEMP_FILE=""
    local IS_REMOTE=false

    # Check if it's a GCS path
    if [[ "$BACKUP_FILE" == gs://* ]]; then
        IS_REMOTE=true
        log "Downloading backup from GCS..."
        TEMP_FILE="/tmp/restore_$(date +%s).sql.gz"
        gsutil cp "$BACKUP_FILE" "$TEMP_FILE" || error "Failed to download backup from GCS"
        BACKUP_FILE="$TEMP_FILE"
    fi

    # Verify file exists
    if [ ! -f "$BACKUP_FILE" ]; then
        error "Backup file not found: $BACKUP_FILE"
    fi

    # Verify file is a valid gzip
    if ! gunzip -t "$BACKUP_FILE" 2>/dev/null; then
        error "Backup file is corrupted or not a valid gzip file"
    fi

    # Get file info
    local FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    local FILE_NAME=$(basename "$BACKUP_FILE")

    echo ""
    echo "============================================"
    echo -e "${YELLOW}         WARNING: DATABASE RESTORE${NC}"
    echo "============================================"
    echo ""
    echo "This will REPLACE ALL DATA in the database!"
    echo ""
    echo "  Backup file: $FILE_NAME"
    echo "  Size: $FILE_SIZE"
    echo "  Database: $DB_NAME"
    echo ""
    echo "============================================"
    echo ""

    read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm

    if [ "$confirm" != "yes" ]; then
        log "Restore cancelled by user"
        [ -n "$TEMP_FILE" ] && rm -f "$TEMP_FILE"
        exit 0
    fi

    # Check if PostgreSQL container is running
    if ! docker ps --format '{{.Names}}' | grep -q "$CONTAINER_NAME"; then
        error "PostgreSQL container '$CONTAINER_NAME' is not running"
    fi

    # Create a backup before restore (safety measure)
    log "Creating safety backup before restore..."
    SAFETY_BACKUP="${BACKUP_DIR}/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
    mkdir -p "$BACKUP_DIR"
    docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" 2>/dev/null | gzip > "$SAFETY_BACKUP"
    log "Safety backup created: $SAFETY_BACKUP"

    # Drop and recreate database
    log "Dropping existing database..."
    docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null
    docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null

    # Restore backup
    log "Restoring database from backup..."
    gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" 2>/dev/null

    if [ $? -eq 0 ]; then
        success "Database restored successfully!"
    else
        warn "Restore completed with warnings (this may be normal)"
    fi

    # Cleanup temp file if downloaded from GCS
    [ -n "$TEMP_FILE" ] && rm -f "$TEMP_FILE"

    # Show table counts
    echo ""
    log "Verifying restored data..."
    docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT schemaname, relname as table_name, n_tup_ins as row_count
        FROM pg_stat_user_tables
        ORDER BY relname;
    " 2>/dev/null

    echo ""
    success "Restore completed!"
    echo ""
    echo "Next steps:"
    echo "  1. Restart the backend: docker compose restart backend"
    echo "  2. Verify application functionality"
    echo "  3. If issues, restore from safety backup: $SAFETY_BACKUP"
}

# Main
if [ $# -eq 0 ]; then
    list_backups
else
    restore_backup "$1"
fi
