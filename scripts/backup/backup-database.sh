#!/bin/bash
# ============================================
# CharHub Database Backup Script
# ============================================
# Performs PostgreSQL backup and uploads to Google Cloud Storage
# Usage: ./backup-database.sh [--local-only] [--no-rotate]
#
# Options:
#   --local-only   Skip upload to GCS
#   --no-rotate    Skip deletion of old backups
# ============================================

set -e

# Configuration
BACKUP_DIR="/mnt/stateful_partition/backups/db"
GCS_BUCKET="gs://charhub-deploy-temp/backups/db"
LOCAL_RETENTION_DAYS=7
REMOTE_RETENTION_DAYS=30
CONTAINER_NAME="charhub-postgres-1"
DB_USER="charhub"
DB_NAME="charhub_db"
LOG_FILE="/var/log/charhub-backup.log"

# Parse arguments
LOCAL_ONLY=false
NO_ROTATE=false
for arg in "$@"; do
    case $arg in
        --local-only) LOCAL_ONLY=true ;;
        --no-rotate) NO_ROTATE=true ;;
    esac
done

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Error handler
error_exit() {
    log "ERROR" "$1"
    exit 1
}

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

log "INFO" "========== Starting database backup =========="

# Generate filename with timestamp
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILE="charhub_db_${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# Check if PostgreSQL container is running
if ! docker ps --format '{{.Names}}' | grep -q "$CONTAINER_NAME"; then
    error_exit "PostgreSQL container '$CONTAINER_NAME' is not running"
fi

# Perform backup
log "INFO" "Creating backup: $BACKUP_FILE"
docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" 2>/dev/null | gzip > "$BACKUP_PATH"

if [ ! -f "$BACKUP_PATH" ]; then
    error_exit "Backup file was not created"
fi

# Get file size
BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
log "INFO" "Backup created successfully: $BACKUP_SIZE"

# Upload to GCS (unless --local-only)
if [ "$LOCAL_ONLY" = false ]; then
    log "INFO" "Uploading to Google Cloud Storage..."

    if command -v gsutil &> /dev/null; then
        gsutil -q cp "$BACKUP_PATH" "${GCS_BUCKET}/${BACKUP_FILE}"

        if [ $? -eq 0 ]; then
            log "INFO" "Upload successful: ${GCS_BUCKET}/${BACKUP_FILE}"
        else
            log "WARN" "Upload to GCS failed, backup saved locally only"
        fi
    else
        log "WARN" "gsutil not found, skipping GCS upload"
    fi
fi

# Rotate old backups (unless --no-rotate)
if [ "$NO_ROTATE" = false ]; then
    log "INFO" "Rotating old backups..."

    # Delete local backups older than retention period
    find "$BACKUP_DIR" -name "charhub_db_*.sql.gz" -type f -mtime +$LOCAL_RETENTION_DAYS -delete 2>/dev/null
    LOCAL_COUNT=$(ls -1 "$BACKUP_DIR"/charhub_db_*.sql.gz 2>/dev/null | wc -l)
    log "INFO" "Local backups retained: $LOCAL_COUNT (max age: ${LOCAL_RETENTION_DAYS} days)"

    # Delete remote backups older than retention period
    if [ "$LOCAL_ONLY" = false ] && command -v gsutil &> /dev/null; then
        # List files older than retention and delete them
        CUTOFF_DATE=$(date -d "-${REMOTE_RETENTION_DAYS} days" '+%Y%m%d')

        gsutil ls "${GCS_BUCKET}/" 2>/dev/null | while read -r file; do
            # Extract date from filename (charhub_db_YYYYMMDD_HHMMSS.sql.gz)
            FILE_DATE=$(basename "$file" | grep -oP '\d{8}' | head -1)
            if [ -n "$FILE_DATE" ] && [ "$FILE_DATE" -lt "$CUTOFF_DATE" ]; then
                gsutil -q rm "$file" 2>/dev/null && log "INFO" "Deleted old remote backup: $(basename $file)"
            fi
        done
    fi
fi

# Verify backup integrity
log "INFO" "Verifying backup integrity..."
if gunzip -t "$BACKUP_PATH" 2>/dev/null; then
    log "INFO" "Backup integrity verified: OK"
else
    error_exit "Backup integrity check failed!"
fi

log "INFO" "========== Backup completed successfully =========="
log "INFO" "Local: $BACKUP_PATH ($BACKUP_SIZE)"
[ "$LOCAL_ONLY" = false ] && log "INFO" "Remote: ${GCS_BUCKET}/${BACKUP_FILE}"

exit 0
