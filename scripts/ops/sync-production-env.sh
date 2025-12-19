#!/bin/bash
#
# Sync Production Environment Script
#
# Purpose: Synchronize .env.production files from local to production server
# This script ensures the production server always has the latest environment configuration
#
# Syncs:
#   - .env.production → /mnt/stateful_partition/charhub/.env
#   - frontend/.env.production → /mnt/stateful_partition/charhub/frontend/.env.production
#
# Usage: ./sync-production-env.sh [options]
# Options:
#   --dry-run    Show what would be done without making changes
#   --verify     Verify sync without making changes
#   --force      Skip confirmation prompt
#
# Author: Agent Reviewer
# Last Updated: 2025-12-19

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REMOTE_USER="leandro_br_dev_gmail_com"
REMOTE_HOST="charhub-vm"
REMOTE_ZONE="us-central1-a"
REMOTE_PROJECT_DIR="/mnt/stateful_partition/charhub"

# Define files to sync (local_path:remote_path)
declare -a ENV_FILES=(
  "$PROJECT_ROOT/.env.production:$REMOTE_PROJECT_DIR/.env"
  "$PROJECT_ROOT/frontend/.env.production:$REMOTE_PROJECT_DIR/frontend/.env.production"
)

# Critical variables to validate (for root .env only)
CRITICAL_VARS=(
  "NODE_ENV"
  "DATABASE_URL"
  "JWT_SECRET"
  "COMFYUI_SERVICE_TOKEN"
)

# Parse arguments
DRY_RUN=false
VERIFY_ONLY=false
FORCE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --verify)
      VERIFY_ONLY=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --dry-run    Show what would be done without making changes"
      echo "  --verify     Verify sync without making changes"
      echo "  --force      Skip confirmation prompt"
      echo "  -h, --help   Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Function: Print colored message
print_msg() {
  local color=$1
  shift
  echo -e "${color}$*${NC}"
}

# Function: Print section header
print_header() {
  echo ""
  print_msg "$BLUE" "========================================="
  print_msg "$BLUE" "$1"
  print_msg "$BLUE" "========================================="
}

# Function: Check if file exists
check_file_exists() {
  local file=$1
  if [[ ! -f "$file" ]]; then
    print_msg "$RED" "❌ ERROR: File not found: $file"
    return 1
  fi
  return 0
}

# Function: Create backup on remote server
create_remote_backup() {
  local remote_path=$1
  local backup_name="$(basename "$remote_path").backup.$(date +%Y%m%d_%H%M%S)"
  local backup_dir="$(dirname "$remote_path")"

  if [[ "$DRY_RUN" == "true" ]]; then
    print_msg "$YELLOW" "[DRY RUN] Would create backup: $backup_name"
    return 0
  fi

  print_msg "$BLUE" "📦 Creating backup: $backup_name"
  gcloud compute ssh "$REMOTE_HOST" --zone="$REMOTE_ZONE" \
    --command="sudo cp $remote_path $backup_dir/$backup_name 2>/dev/null || true" \
    2>/dev/null || {
      print_msg "$YELLOW" "⚠️  Warning: Could not create backup (file may not exist yet)"
    }
}

# Function: Show diff between local and remote
show_diff() {
  local local_file=$1
  local remote_path=$2
  local file_label=$3

  print_msg "$BLUE" "🔍 Comparing $file_label..."

  # Get remote file content
  local remote_content
  remote_content=$(gcloud compute ssh "$REMOTE_HOST" --zone="$REMOTE_ZONE" \
    --command="sudo cat $remote_path 2>/dev/null" || echo "")

  if [[ -z "$remote_content" ]]; then
    print_msg "$YELLOW" "⚠️  Remote file not found or empty: $remote_path"
    print_msg "$BLUE" "📝 All lines will be NEW"
    return 0
  fi

  # Create temp files for diff
  local tmp_local="/tmp/env_local_$$_$(basename "$local_file")"
  local tmp_remote="/tmp/env_remote_$$_$(basename "$local_file")"

  cp "$local_file" "$tmp_local"
  echo "$remote_content" > "$tmp_remote"

  # Show diff
  if diff -u "$tmp_remote" "$tmp_local" > /dev/null 2>&1; then
    print_msg "$GREEN" "✅ Files are identical - no changes needed"
    rm -f "$tmp_local" "$tmp_remote"
    return 1
  else
    print_msg "$YELLOW" "📊 Differences found in $file_label:"
    echo ""
    diff -u "$tmp_remote" "$tmp_local" || true
    echo ""
  fi

  rm -f "$tmp_local" "$tmp_remote"
  return 0
}

# Function: Verify critical variables (root .env only)
verify_critical_vars() {
  local env_file="$PROJECT_ROOT/.env.production"

  print_msg "$BLUE" "🔐 Verifying critical environment variables in root .env..."

  local missing_vars=()

  for var in "${CRITICAL_VARS[@]}"; do
    if ! grep -q "^${var}=" "$env_file"; then
      missing_vars+=("$var")
    else
      local value=$(grep "^${var}=" "$env_file" | cut -d'=' -f2-)
      if [[ -z "$value" ]] || [[ "$value" == "your_"* ]]; then
        print_msg "$YELLOW" "⚠️  Warning: $var appears to have placeholder value"
      else
        print_msg "$GREEN" "✅ $var is set"
      fi
    fi
  done

  if [[ ${#missing_vars[@]} -gt 0 ]]; then
    print_msg "$RED" "❌ ERROR: Missing critical variables:"
    for var in "${missing_vars[@]}"; do
      print_msg "$RED" "   - $var"
    done
    exit 1
  fi

  print_msg "$GREEN" "✅ All critical variables present"
}

# Function: Sync file to production
sync_to_production() {
  local local_file=$1
  local remote_path=$2
  local file_label=$3

  print_msg "$BLUE" "🚀 Syncing $file_label to production server..."

  # Copy to /tmp first
  local tmp_name="$(basename "$local_file").tmp"
  gcloud compute scp "$local_file" \
    "${REMOTE_HOST}:/tmp/$tmp_name" \
    --zone="$REMOTE_ZONE" >/dev/null 2>&1

  # Ensure remote directory exists and move to final location
  local remote_dir="$(dirname "$remote_path")"
  gcloud compute ssh "$REMOTE_HOST" --zone="$REMOTE_ZONE" \
    --command="sudo mkdir -p $remote_dir && \
               sudo mv /tmp/$tmp_name $remote_path && \
               sudo chown ${REMOTE_USER}:${REMOTE_USER} $remote_path && \
               sudo chmod 644 $remote_path" >/dev/null 2>&1

  print_msg "$GREEN" "✅ $file_label synced successfully"
}

# Function: Verify sync
verify_sync() {
  local local_file=$1
  local remote_path=$2
  local file_label=$3

  print_msg "$BLUE" "🔍 Verifying $file_label..."

  local local_hash
  local remote_hash

  local_hash=$(md5sum "$local_file" | cut -d' ' -f1)
  remote_hash=$(gcloud compute ssh "$REMOTE_HOST" --zone="$REMOTE_ZONE" \
    --command="sudo md5sum $remote_path 2>/dev/null | cut -d' ' -f1" || echo "")

  if [[ "$local_hash" == "$remote_hash" ]]; then
    print_msg "$GREEN" "✅ Verification successful - files match"
    print_msg "$GREEN" "   MD5: $local_hash"
    return 0
  else
    print_msg "$RED" "❌ Verification failed - files do not match"
    print_msg "$RED" "   Local MD5:  $local_hash"
    print_msg "$RED" "   Remote MD5: $remote_hash"
    return 1
  fi
}

# Main execution
main() {
  print_header "🔄 Environment Sync to Production"

  print_msg "$BLUE" "Configuration:"
  print_msg "$BLUE" "  Remote: $REMOTE_HOST:$REMOTE_PROJECT_DIR"
  print_msg "$BLUE" "  Mode:   $([ "$DRY_RUN" == "true" ] && echo "DRY RUN" || echo "LIVE")"
  print_msg "$BLUE" "  Files to sync:"
  for env_entry in "${ENV_FILES[@]}"; do
    local local_path="${env_entry%%:*}"
    local remote_path="${env_entry##*:}"
    print_msg "$BLUE" "    - $(basename "$local_path") → $remote_path"
  done

  # Step 1: Check local files exist
  print_header "Step 1: Pre-flight Checks"
  local all_files_exist=true
  for env_entry in "${ENV_FILES[@]}"; do
    local local_path="${env_entry%%:*}"
    if check_file_exists "$local_path"; then
      print_msg "$GREEN" "✅ Found: $(basename "$local_path")"
    else
      all_files_exist=false
    fi
  done

  if [[ "$all_files_exist" != "true" ]]; then
    print_msg "$RED" "❌ Some files are missing. Aborting."
    exit 1
  fi

  # Step 2: Verify critical variables (root .env only)
  print_header "Step 2: Variable Verification"
  verify_critical_vars

  # Step 3: Show differences
  print_header "Step 3: Change Detection"
  local has_changes=false
  for env_entry in "${ENV_FILES[@]}"; do
    local local_path="${env_entry%%:*}"
    local remote_path="${env_entry##*:}"
    local file_label="$(basename "$local_path")"

    if show_diff "$local_path" "$remote_path" "$file_label"; then
      has_changes=true
    fi
  done

  if [[ "$has_changes" != "true" ]]; then
    print_msg "$GREEN" "✅ No sync needed - all files are already identical"
    exit 0
  fi

  # If verify only, stop here
  if [[ "$VERIFY_ONLY" == "true" ]]; then
    print_msg "$BLUE" "ℹ️  Verify-only mode - stopping before sync"
    exit 0
  fi

  # Step 4: Confirmation (unless forced)
  if [[ "$FORCE" != "true" ]] && [[ "$DRY_RUN" != "true" ]]; then
    print_header "Step 4: Confirmation"
    print_msg "$YELLOW" "⚠️  This will replace environment files in PRODUCTION"
    print_msg "$YELLOW" "    Backups will be created first"
    echo ""
    read -p "$(echo -e "${YELLOW}Do you want to continue? (yes/no): ${NC}")" -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
      print_msg "$RED" "❌ Sync cancelled by user"
      exit 0
    fi
  fi

  # Step 5: Create backups
  if [[ "$DRY_RUN" != "true" ]]; then
    print_header "Step 5: Backup Creation"
    for env_entry in "${ENV_FILES[@]}"; do
      local remote_path="${env_entry##*:}"
      create_remote_backup "$remote_path"
    done
  fi

  # Step 6: Sync files
  print_header "Step 6: File Sync"
  if [[ "$DRY_RUN" == "true" ]]; then
    for env_entry in "${ENV_FILES[@]}"; do
      local local_path="${env_entry%%:*}"
      local remote_path="${env_entry##*:}"
      print_msg "$YELLOW" "[DRY RUN] Would sync: $local_path → $remote_path"
    done
  else
    for env_entry in "${ENV_FILES[@]}"; do
      local local_path="${env_entry%%:*}"
      local remote_path="${env_entry##*:}"
      local file_label="$(basename "$local_path")"
      sync_to_production "$local_path" "$remote_path" "$file_label"
    done
  fi

  # Step 7: Verify
  if [[ "$DRY_RUN" != "true" ]]; then
    print_header "Step 7: Verification"
    local all_verified=true
    for env_entry in "${ENV_FILES[@]}"; do
      local local_path="${env_entry%%:*}"
      local remote_path="${env_entry##*:}"
      local file_label="$(basename "$local_path")"

      if ! verify_sync "$local_path" "$remote_path" "$file_label"; then
        all_verified=false
      fi
    done

    if [[ "$all_verified" == "true" ]]; then
      print_msg "$GREEN" "✅ All files synced successfully!"
    else
      print_msg "$RED" "❌ Some files failed verification!"
      exit 1
    fi
  fi

  # Final message
  print_header "✅ Sync Complete"
  if [[ "$DRY_RUN" != "true" ]]; then
    print_msg "$GREEN" "Production server environment is now up to date"
    print_msg "$YELLOW" "⚠️  Remember: Restart services if needed to apply changes"
    print_msg "$BLUE" "    Run: docker compose restart backend frontend"
  else
    print_msg "$BLUE" "Dry run completed - no changes were made"
  fi
}

# Run main function
main
