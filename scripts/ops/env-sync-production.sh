#!/bin/bash
set -euo pipefail

# Script: env-sync-production.sh
# Purpose: Sync .env.production from local to production server via SSH
# Usage: ./scripts/ops/env-sync-production.sh [options]
#
# This script OVERWRITES the production .env file with the local .env.production
# It creates a backup on the remote server before overwriting
#
# Options:
#   --dry-run    Show what would be done without making changes
#   --force      Skip confirmation prompt
#   --backup-only Create backup only, don't sync
#
# Author: Agent Reviewer
# Last Updated: 2025-01-24

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Local files
LOCAL_ENV_PROD="$PROJECT_ROOT/.env.production"
LOCAL_BACKEND_ENV_PROD="$PROJECT_ROOT/backend/.env.production"
LOCAL_FRONTEND_ENV_PROD="$PROJECT_ROOT/frontend/.env.production"

# Remote configuration
REMOTE_USER="${REMOTE_USER:-leandro_br_dev_gmail_com}"
REMOTE_HOST="${REMOTE_HOST:-charhub-vm}"
REMOTE_ZONE="${REMOTE_ZONE:-us-central1-a}"
REMOTE_DIR="${REMOTE_DIR:-/mnt/stateful_partition/charhub}"

# Remote file paths
REMOTE_ENV="$REMOTE_DIR/.env"
REMOTE_BACKEND_ENV="$REMOTE_DIR/backend/.env"
REMOTE_FRONTEND_ENV="$REMOTE_DIR/frontend/.env.production"

# Parse arguments
DRY_RUN=false
FORCE=false
BACKUP_ONLY=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    --backup-only)
      BACKUP_ONLY=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --dry-run      Show what would be done without making changes"
      echo "  --force        Skip confirmation prompt"
      echo "  --backup-only  Create backup only, don't sync"
      echo "  -h, --help     Show this help message"
      echo ""
      echo "Files synced:"
      echo "  - .env.production → \$REMOTE_DIR/.env"
      echo "  - backend/.env.production → \$REMOTE_DIR/backend/.env (optional)"
      echo "  - frontend/.env.production → \$REMOTE_DIR/frontend/.env.production (optional)"
      echo ""
      echo "Environment variables:"
      echo "  REMOTE_USER (default: leandro_br_dev_gmail_com)"
      echo "  REMOTE_HOST (default: charhub-vm)"
      echo "  REMOTE_ZONE (default: us-central1-a)"
      echo "  REMOTE_DIR (default: /mnt/stateful_partition/charhub)"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# ============================================================================
# Functions
# ============================================================================

print_header() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

print_section() {
  echo ""
  echo -e "${CYAN}▶ $1${NC}"
  echo ""
}

# Check if local file exists
check_local_file() {
  local file=$1

  if [[ ! -f "$file" ]]; then
    echo -e "${RED}❌ ERROR: File not found: $file${NC}"
    return 1
  fi

  return 0
}

# Create backup on remote server
create_remote_backup() {
  local remote_file=$1
  local backup_name="${remote_file}.backup.$(date +%Y%m%d_%H%M%S)"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "${YELLOW}[DRY RUN] Would create backup: $backup_name${NC}"
    return 0
  fi

  echo -e "${BLUE}📦 Creating backup: $(basename "$backup_name")${NC}"

  gcloud compute ssh "$REMOTE_HOST" \
    --zone="$REMOTE_ZONE" \
    --command="sudo cp $remote_file $backup_name 2>/dev/null && echo 'Backup created' || echo 'File does not exist yet, skipping backup'" \
    2>/dev/null

  echo -e "${GREEN}✅ Backup created${NC}"
}

# Sync file to production via SCP
sync_file() {
  local local_file=$1
  local remote_file=$2
  local label=$3

  print_section "Syncing $label"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "${YELLOW}[DRY RUN] Would sync:${NC}"
    echo "  Local:  $local_file"
    echo "  Remote: $remote_file"
    return 0
  fi

  echo -e "${BLUE}📤 Copying $label to production...${NC}"

  # Copy to /tmp first
  local tmp_name="/tmp/$(basename "$local_file").tmp.$$"

  gcloud compute scp "$local_file" \
    "${REMOTE_HOST}:${tmp_name}" \
    --zone="$REMOTE_ZONE" \
    >/dev/null 2>&1

  # Move to final location with proper permissions
  gcloud compute ssh "$REMOTE_HOST" \
    --zone="$REMOTE_ZONE" \
    --command="sudo mkdir -p $(dirname "$remote_file") && \
               sudo mv $tmp_name $remote_file && \
               sudo chown ${REMOTE_USER}:${REMOTE_USER} $remote_file && \
               sudo chmod 644 $remote_file" \
    >/dev/null 2>&1

  echo -e "${GREEN}✅ $label synced successfully${NC}"
}

# Verify sync by comparing MD5 hashes
verify_sync() {
  local local_file=$1
  local remote_file=$2
  local label=$3

  print_section "Verifying $label"

  local local_hash
  local remote_hash

  local_hash=$(md5sum "$local_file" | cut -d' ' -f1)

  remote_hash=$(gcloud compute ssh "$REMOTE_HOST" \
    --zone="$REMOTE_ZONE" \
    --command="sudo md5sum $remote_file 2>/dev/null | cut -d' ' -f1" \
    2>/dev/null || echo "")

  if [[ "$local_hash" == "$remote_hash" ]]; then
    echo -e "${GREEN}✅ Verification successful - files match${NC}"
    echo "  MD5: $local_hash"
    return 0
  else
    echo -e "${RED}❌ Verification failed - files do not match${NC}"
    echo "  Local MD5:  $local_hash"
    echo "  Remote MD5: $remote_hash"
    return 1
  fi
}

# Show what would change
show_changes() {
  local local_file=$1
  local remote_file=$2
  local label=$3

  echo -e "${CYAN}🔍 Checking for changes in $label...${NC}"

  # Get remote content
  local remote_content
  remote_content=$(gcloud compute ssh "$REMOTE_HOST" \
    --zone="$REMOTE_ZONE" \
    --command="sudo cat $remote_file 2>/dev/null" \
    2>/dev/null || echo "")

  if [[ -z "$remote_content" ]]; then
    echo -e "${YELLOW}⚠️  Remote file does not exist yet (will be created)${NC}"
    return 0
  fi

  # Check if files are identical
  local local_hash
  local remote_hash

  local_hash=$(md5sum "$local_file" | cut -d' ' -f1)
  remote_hash=$(echo "$remote_content" | md5sum | cut -d' ' -f1)

  if [[ "$local_hash" == "$remote_hash" ]]; then
    echo -e "${GREEN}✅ No changes needed - files are identical${NC}"
    return 1
  fi

  echo -e "${YELLOW}⚠️  Changes detected${NC}"

  # Show diff summary
  local local_lines
  local remote_lines

  local_lines=$(wc -l < "$local_file")
  remote_lines=$(echo "$remote_content" | wc -l)

  echo "  Local:  $local_lines lines"
  echo "  Remote: $remote_lines lines"

  return 0
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
  print_header "🚀 Environment Sync to Production"

  # Display configuration
  echo -e "${CYAN}Configuration:${NC}"
  echo "  Remote Host:  $REMOTE_HOST"
  echo "  Remote Zone:  $REMOTE_ZONE"
  echo "  Remote Dir:   $REMOTE_DIR"
  echo "  Mode:         $([ "$DRY_RUN" == "true" ] && echo "DRY RUN" || echo "LIVE")"
  echo ""

  # Check local files exist
  print_section "Pre-flight Checks"

  local files_ok=true

  if check_local_file "$LOCAL_ENV_PROD"; then
    echo -e "${GREEN}✅ .env.production found${NC}"
  else
    echo -e "${RED}❌ .env.production not found${NC}"
    files_ok=false
  fi

  # Backend .env.production is optional
  if [[ -f "$LOCAL_BACKEND_ENV_PROD" ]]; then
    echo -e "${GREEN}✅ backend/.env.production found${NC}"
    SYNC_BACKEND=true
  else
    echo -e "${YELLOW}⚠️  backend/.env.production not found (skipping)${NC}"
    SYNC_BACKEND=false
  fi

  # Frontend .env.production is optional
  if [[ -f "$LOCAL_FRONTEND_ENV_PROD" ]]; then
    echo -e "${GREEN}✅ frontend/.env.production found${NC}"
    SYNC_FRONTEND=true
  else
    echo -e "${YELLOW}⚠️  frontend/.env.production not found (skipping)${NC}"
    SYNC_FRONTEND=false
  fi

  if [[ "$files_ok" != "true" ]]; then
    echo ""
    echo -e "${RED}❌ Required files missing. Aborting.${NC}"
    exit 1
  fi

  # Array of files to sync
  declare -a FILES_TO_SYNC
  FILES_TO_SYNC=("$LOCAL_ENV_PROD:$REMOTE_ENV:.env")

  if [[ "$SYNC_BACKEND" == "true" ]]; then
    FILES_TO_SYNC+=("$LOCAL_BACKEND_ENV_PROD:$REMOTE_BACKEND_ENV:backend/.env")
  fi

  if [[ "$SYNC_FRONTEND" == "true" ]]; then
    FILES_TO_SYNC+=("$LOCAL_FRONTEND_ENV_PROD:$REMOTE_FRONTEND_ENV:frontend/.env.production")
  fi

  # Check for changes
  print_header "🔍 Change Detection"

  local has_changes=false

  for file_entry in "${FILES_TO_SYNC[@]}"; do
    IFS=':' read -r local_file remote_file label <<< "$file_entry"

    if show_changes "$local_file" "$remote_file" "$label"; then
      has_changes=true
    fi
  done

  if [[ "$has_changes" != "true" ]]; then
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ No sync needed - all files are up to date${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
  fi

  # If backup-only, stop here
  if [[ "$BACKUP_ONLY" == "true" ]]; then
    print_header "📦 Backup Only Mode"
    for file_entry in "${FILES_TO_SYNC[@]}"; do
      IFS=':' read -r local_file remote_file label <<< "$file_entry"
      create_remote_backup "$remote_file"
    done
    echo ""
    echo -e "${GREEN}✅ Backup complete (no sync performed)${NC}"
    exit 0
  fi

  # Confirmation prompt
  if [[ "$FORCE" != "true" ]] && [[ "$DRY_RUN" != "true" ]]; then
    print_header "⚠️  Confirmation Required"
    echo -e "${YELLOW}This will OVERWRITE environment files in PRODUCTION${NC}"
    echo -e "${YELLOW}Backups will be created automatically${NC}"
    echo ""
    echo -e "${RED}Files to be overwritten:${NC}"
    for file_entry in "${FILES_TO_SYNC[@]}"; do
      IFS=':' read -r local_file remote_file label <<< "$file_entry"
      echo -e "${RED}  - $remote_file${NC}"
    done
    echo ""
    read -p "$(echo -e "${YELLOW}Do you want to continue? (yes/no): ${NC}")" -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
      echo -e "${RED}❌ Sync cancelled by user${NC}"
      exit 0
    fi
  fi

  # Create backups
  print_header "📦 Creating Backups"

  for file_entry in "${FILES_TO_SYNC[@]}"; do
    IFS=':' read -r local_file remote_file label <<< "$file_entry"
    create_remote_backup "$remote_file"
  done

  if [[ "$DRY_RUN" == "true" ]]; then
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Dry run completed - no changes were made${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
  fi

  # Sync files
  print_header "📤 Syncing Files"

  for file_entry in "${FILES_TO_SYNC[@]}"; do
    IFS=':' read -r local_file remote_file label <<< "$file_entry"
    sync_file "$local_file" "$remote_file" "$label"
  done

  # Verify sync
  print_header "🔍 Verifying Sync"

  local all_verified=true

  for file_entry in "${FILES_TO_SYNC[@]}"; do
    IFS=':' read -r local_file remote_file label <<< "$file_entry"
    if ! verify_sync "$local_file" "$remote_file" "$label"; then
      all_verified=false
    fi
  done

  if [[ "$all_verified" == "true" ]]; then
    print_header "✅ Sync Complete"
    echo -e "${GREEN}All files synced successfully to production!${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Next steps:${NC}"
    echo "  1. Review the synced files on the production server"
    echo "  2. Restart services if needed:"
    echo "     gcloud compute ssh $REMOTE_HOST --zone=$REMOTE_ZONE --command='sudo systemctl restart charhub-backend charhub-frontend'"
    echo "  3. Verify services are healthy"
    exit 0
  else
    print_header "❌ Sync Failed"
    echo -e "${RED}Some files failed verification!${NC}"
    echo ""
    echo -e "${YELLOW}Actions required:${NC}"
    echo "  1. Check which files failed verification above"
    echo "  2. Manually verify the remote files"
    echo "  3. Restore from backup if needed"
    exit 1
  fi
}

# Run main
main "$@"
