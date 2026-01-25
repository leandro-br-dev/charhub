#!/bin/bash
set -euo pipefail

# Script: env-compare.sh
# Purpose: Compare .env keys with .env.production keys
# Usage: ./scripts/ops/env-compare.sh
#
# This script checks if .env.production has all the keys defined in .env
# It does NOT compare values, only key existence
#
# Output: Report of missing keys in .env.production

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

ENV_FILE="$PROJECT_ROOT/.env"
ENV_PROD_FILE="$PROJECT_ROOT/.env.production"
ENV_EXAMPLE_FILE="$PROJECT_ROOT/.env.example"

ENV_BACKEND_FILE="$PROJECT_ROOT/backend/.env"
ENV_BACKEND_PROD_FILE="$PROJECT_ROOT/backend/.env.production"

ENV_FRONTEND_FILE="$PROJECT_ROOT/frontend/.env"
ENV_FRONTEND_PROD_FILE="$PROJECT_ROOT/frontend/.env.production"

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

# Extract keys from .env file (ignores comments and empty lines)
extract_keys() {
  local file=$1

  if [[ ! -f "$file" ]]; then
    return 1
  fi

  # Extract keys:
  # - Ignore comments (#)
  # - Ignore empty lines
  # - Get part before =
  grep -v '^[[:space:]]*#' "$file" \
    | grep -v '^[[:space:]]*$' \
    | grep '=' \
    | cut -d'=' -f1 \
    | sort \
    | uniq
}

# Check if files exist
check_files() {
  print_header "📋 File Existence Check"

  local missing_files=()
  local optional_missing=()

  # Root .env files (required)
  if [[ ! -f "$ENV_FILE" ]]; then
    missing_files+=(".env")
  fi

  if [[ ! -f "$ENV_PROD_FILE" ]]; then
    missing_files+=(".env.production")
  fi

  # Backend .env.production (optional)
  if [[ ! -f "$ENV_BACKEND_PROD_FILE" ]]; then
    optional_missing+=("backend/.env.production (optional)")
  fi

  # Frontend .env.production (optional)
  if [[ ! -f "$ENV_FRONTEND_PROD_FILE" ]]; then
    optional_missing+=("frontend/.env.production (optional)")
  fi

  if [[ ${#missing_files[@]} -gt 0 ]]; then
    echo -e "${RED}❌ ERROR: Missing required files:${NC}"
    for file in "${missing_files[@]}"; do
      echo -e "${RED}   - $file${NC}"
    done
    echo ""

    # Suggest creating from example if available
    if [[ -f "$ENV_EXAMPLE_FILE" ]]; then
      echo -e "${YELLOW}💡 Suggestion: Create .env.production from .env.example${NC}"
      echo ""
      echo "  cp .env.example .env.production"
      echo ""
    fi

    exit 1
  fi

  echo -e "${GREEN}✅ .env found${NC}"
  echo -e "${GREEN}✅ .env.production found${NC}"

  # Optional files
  if [[ -f "$ENV_BACKEND_PROD_FILE" ]]; then
    echo -e "${GREEN}✅ backend/.env.production found${NC}"
  else
    echo -e "${YELLOW}⚠️  backend/.env.production not found (will skip)${NC}"
  fi

  if [[ -f "$ENV_FRONTEND_PROD_FILE" ]]; then
    echo -e "${GREEN}✅ frontend/.env.production found${NC}"
  else
    echo -e "${YELLOW}⚠️  frontend/.env.production not found (will skip)${NC}"
  fi
}

# Compare keys between a single pair of files
compare_pair() {
  local source_file=$1
  local target_file=$2
  local source_label=$3
  local target_label=$4

  # Check if target file exists
  if [[ ! -f "$target_file" ]]; then
    print_section "⏭️  Skipping: $source_label → $target_label"
    echo -e "${YELLOW}⚠️  Target file not found: $target_file${NC}"
    return 0
  fi

  print_header "🔍 Key Comparison: $source_label vs $target_label"

  # Extract keys from both files
  local source_keys
  local target_keys

  source_keys=$(extract_keys "$source_file")
  target_keys=$(extract_keys "$target_file")

  # Count keys
  local source_count
  local target_count

  source_count=$(echo "$source_keys" | wc -l)
  target_count=$(echo "$target_keys" | wc -l)

  echo -e "${CYAN}Key Counts:${NC}"
  echo "  $source_label:  ${GREEN}$source_count${NC} keys"
  echo "  $target_label: ${GREEN}$target_count${NC} keys"
  echo ""

  # Use temp files for comm to avoid issues with process substitution
  local temp_source
  local temp_target
  temp_source=$(mktemp)
  temp_target=$(mktemp)

  echo "$source_keys" > "$temp_source"
  echo "$target_keys" > "$temp_target"

  # Find missing keys and extra keys
  local missing_keys
  local extra_keys

  missing_keys=$(comm -23 "$temp_source" "$temp_target" 2>/dev/null || true)
  extra_keys=$(comm -13 "$temp_source" "$temp_target" 2>/dev/null || true)

  rm -f "$temp_source" "$temp_target"

  local missing_count
  local extra_count

  # Count non-empty lines (avoid issues with grep -c)
  if [[ -z "$missing_keys" ]] || ! echo "$missing_keys" | grep -q '^[^[:space:]]'; then
    missing_count=0
  else
    missing_count=$(echo "$missing_keys" | grep -c '^[^[:space:]]')
  fi

  if [[ -z "$extra_keys" ]] || ! echo "$extra_keys" | grep -q '^[^[:space:]]'; then
    extra_count=0
  else
    extra_count=$(echo "$extra_keys" | grep -c '^[^[:space:]]')
  fi

  # Display results
  if [[ $missing_count -eq 0 ]] && [[ $extra_count -eq 0 ]]; then
    echo -e "${GREEN}✅ Perfect match! All keys in $source_label exist in $target_label${NC}"
    return 0
  fi

  # Show missing keys
  if [[ $missing_count -gt 0 ]]; then
    print_section "❌ Missing Keys in $target_label ($missing_count)"
    echo -e "${RED}The following keys exist in $source_label but are MISSING from $target_label:${NC}"
    echo ""

    while IFS= read -r key; do
      # Get the value from source file (for reference)
      local value
      value=$(grep "^${key}=" "$source_file" | cut -d'=' -f2- | head -c 50)

      # Mask sensitive values
      if [[ "$key" =~ (PASSWORD|SECRET|TOKEN|KEY|PRIVATE) ]]; then
        value="[MASKED]"
      fi

      echo -e "${RED}  ✗ $key${NC}"
      if [[ -n "$value" ]]; then
        echo -e "    Current value in $source_label: ${YELLOW}${value}${NC}"
      fi
    done <<< "$missing_keys"
    echo ""
  fi

  # Show extra keys
  if [[ $extra_count -gt 0 ]]; then
    print_section "⚠️  Extra Keys in $target_label ($extra_count)"
    echo -e "${YELLOW}The following keys exist in $target_label but NOT in $source_label:${NC}"
    echo ""

    while IFS= read -r key; do
      echo -e "${YELLOW}  ⚠ $key${NC}"
    done <<< "$extra_keys"
    echo ""
  fi

  # Summary
  print_header "📊 Summary for $source_label → $target_label"

  if [[ $missing_count -gt 0 ]]; then
    echo -e "${RED}❌ $target_label is missing $missing_count key(s) from $source_label${NC}"
    echo ""
    echo -e "${YELLOW}Action required:${NC}"
    echo "  1. Add missing keys to $target_label"
    echo "  2. Or remove unused keys from $source_label"
    echo "  3. Re-run this script to verify"
  fi

  if [[ $extra_count -gt 0 ]]; then
    echo -e "${YELLOW}⚠️  $target_label has $extra_count extra key(s) not in $source_label${NC}"
    echo ""
    echo -e "${YELLOW}Note:${NC} Extra keys may be production-specific and can be kept"
  fi

  # Return error if missing keys
  if [[ $missing_count -gt 0 ]]; then
    return 1
  fi

  return 0
}

# Compare all file pairs
compare_keys() {
  local overall_result=0

  # Compare root .env files
  if ! compare_pair "$ENV_FILE" "$ENV_PROD_FILE" ".env" ".env.production"; then
    overall_result=1
  fi

  # Compare backend .env files (if backend .env.production exists)
  if [[ -f "$ENV_BACKEND_PROD_FILE" ]]; then
    # Compare backend/.env vs backend/.env.production
    if ! compare_pair "$ENV_BACKEND_FILE" "$ENV_BACKEND_PROD_FILE" "backend/.env" "backend/.env.production"; then
      overall_result=1
    fi
  fi

  # Compare frontend .env files (if frontend .env.production exists)
  if [[ -f "$ENV_FRONTEND_PROD_FILE" ]]; then
    # Compare frontend/.env vs frontend/.env.production
    if ! compare_pair "$ENV_FRONTEND_FILE" "$ENV_FRONTEND_PROD_FILE" "frontend/.env" "frontend/.env.production"; then
      overall_result=1
    fi
  fi

  return $overall_result
}

# Show detailed report with suggestions
show_suggestions() {
  print_header "💡 Suggestions for Fixing Missing Keys"

  echo -e "${CYAN}To fix missing keys, you can:${NC}"
  echo ""
  echo "  1. Manually add missing keys to the respective .env.production file"
  echo "  2. Or remove unused keys from the local .env file"
  echo "  3. Re-run this script to verify"
  echo ""
  echo -e "${YELLOW}⚠️  Note: For sensitive keys (PASSWORD, SECRET, TOKEN, KEY, PRIVATE):${NC}"
  echo "     Use production-specific values, not local development values"
  echo ""
  echo -e "${CYAN}💡 Tip: Use env-guardian sub-agent for help with environment configuration${NC}"
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
  print_header "🔑 Environment Key Comparison Tool"
  echo -e "${BLUE}Comparing local .env files with .env.production files${NC}"

  # Check if files exist
  check_files

  # Compare keys
  if compare_keys; then
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ All checks passed! All .env.production files are up to date${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
  else
    # Show suggestions
    show_suggestions

    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ Comparison failed: Missing keys detected${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
  fi
}

# Run main
main "$@"
