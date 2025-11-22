#!/bin/bash
# ============================================
# CharHub List Backups Script
# ============================================
# Quick script to list all available backups
# Usage: ./list-backups.sh
# ============================================

BACKUP_DIR="/mnt/stateful_partition/backups/db"
GCS_BUCKET="gs://charhub-deploy-temp/backups/db"

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "============================================"
echo "         CharHub Database Backups"
echo "============================================"
echo ""

# Local backups
echo -e "${CYAN}Local Backups:${NC}"
echo "  Location: ${BACKUP_DIR}"
echo ""

if [ -d "$BACKUP_DIR" ] && ls "$BACKUP_DIR"/charhub_db_*.sql.gz 1> /dev/null 2>&1; then
    ls -lh "$BACKUP_DIR"/charhub_db_*.sql.gz | while read -r line; do
        size=$(echo "$line" | awk '{print $5}')
        date=$(echo "$line" | awk '{print $6, $7, $8}')
        file=$(echo "$line" | awk '{print $9}')
        filename=$(basename "$file")
        echo -e "  ${GREEN}$filename${NC} ($size) - $date"
    done
    echo ""
    TOTAL=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
    COUNT=$(ls -1 "$BACKUP_DIR"/charhub_db_*.sql.gz 2>/dev/null | wc -l)
    echo "  Total: $COUNT backups, $TOTAL"
else
    echo -e "  ${YELLOW}(no backups found)${NC}"
fi

echo ""

# Remote backups (GCS)
echo -e "${CYAN}Remote Backups (Google Cloud Storage):${NC}"
echo "  Bucket: ${GCS_BUCKET}"
echo ""

if command -v gsutil &> /dev/null; then
    REMOTE_FILES=$(gsutil ls -l "${GCS_BUCKET}/" 2>/dev/null | grep "charhub_db_")
    if [ -n "$REMOTE_FILES" ]; then
        echo "$REMOTE_FILES" | while read -r line; do
            size=$(echo "$line" | awk '{print $1}')
            date=$(echo "$line" | awk '{print $2}')
            file=$(echo "$line" | awk '{print $3}')
            filename=$(basename "$file")
            # Convert bytes to human readable
            if [ "$size" -gt 1048576 ]; then
                size_hr="$(echo "scale=1; $size/1048576" | bc)M"
            elif [ "$size" -gt 1024 ]; then
                size_hr="$(echo "scale=1; $size/1024" | bc)K"
            else
                size_hr="${size}B"
            fi
            echo -e "  ${GREEN}$filename${NC} ($size_hr) - $date"
        done
        echo ""
        REMOTE_COUNT=$(echo "$REMOTE_FILES" | wc -l)
        echo "  Total: $REMOTE_COUNT backups"
    else
        echo -e "  ${YELLOW}(no backups found)${NC}"
    fi
else
    echo -e "  ${YELLOW}(gsutil not available)${NC}"
fi

echo ""
echo "============================================"
echo ""
