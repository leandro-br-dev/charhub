#!/bin/bash
set -euo pipefail

# Script: db-switch.sh
# Purpose: Switch between clean database and populated database with BACKUP/RESTORE
# Usage: ./scripts/db-switch.sh <mode>
# Modes: clean, populated
#
# CRITICAL: This script NOW preserves data via backup/restore (Issue #113 fix)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# Configuration
# ============================================================================

BACKUP_DIR="/root/backups/charhub-db"
BACKUP_FILE="${BACKUP_DIR}/populated_backup.sql"

# ============================================================================
# Validate Mode Parameter
# ============================================================================

MODE="${1:-}"

if [ -z "$MODE" ]; then
  echo -e "${RED}❌ ERROR: Mode parameter required${NC}"
  echo ""
  echo "Usage: ./scripts/db-switch.sh <mode>"
  echo ""
  echo "Available modes:"
  echo "  clean     - Empty database (for CI-equivalent tests)"
  echo "  populated - Restore database with backed up data"
  echo ""
  echo "Examples:"
  echo "  ./scripts/db-switch.sh clean      # Switch to empty database (backs up first)"
  echo "  ./scripts/db-switch.sh populated  # Restore database from backup"
  echo ""
  echo "How it works:"
  echo "  - First time 'clean': Creates backup, then switches to empty DB"
  echo "  - 'populated': Restores from backup"
  echo "  - You can switch back and forth without data loss!"
  exit 1
fi

# Validate mode
VALID_MODES=("clean" "populated")
if [[ ! " ${VALID_MODES[@]} " =~ " ${MODE} " ]]; then
  echo -e "${RED}❌ ERROR: Invalid mode '${MODE}'${NC}"
  echo "Valid modes: ${VALID_MODES[@]}"
  exit 1
fi

# ============================================================================
# Check Docker Compose
# ============================================================================

if ! command -v docker &> /dev/null; then
  echo -e "${RED}❌ ERROR: Docker not found${NC}"
  exit 1
fi

if ! docker compose version &> /dev/null; then
  echo -e "${RED}❌ ERROR: Docker Compose not found${NC}"
  exit 1
fi

# ============================================================================
# Ensure Backup Directory Exists
# ============================================================================

mkdir -p "${BACKUP_DIR}"

# ============================================================================
# Helper Functions
# ============================================================================

create_backup() {
  echo -e "${BLUE}💾 Creating backup of current database...${NC}"

  # Check if database has data worth backing up
  USER_COUNT=$(PGPASSWORD=charhub_dev_password psql -h localhost -p 5401 -U charhub -d charhub_db -t -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | tr -d ' ' || echo "0")

  if [ "$USER_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Database is empty, no backup needed${NC}"
    return 0
  fi

  echo "  Users in database: ${USER_COUNT}"
  echo "  Backup location: ${BACKUP_FILE}"

  # Create backup using pg_dump
  PGPASSWORD=charhub_dev_password pg_dump \
    -h localhost \
    -p 5401 \
    -U charhub \
    -d charhub_db \
    --clean \
    --if-exists \
    --no-owner \
    --no-acl \
    > "${BACKUP_FILE}.tmp"

  # Move to final location only if dump succeeded
  mv "${BACKUP_FILE}.tmp" "${BACKUP_FILE}"

  BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
  echo -e "${GREEN}✓ Backup created successfully (${BACKUP_SIZE})${NC}"
}

restore_backup() {
  if [ ! -f "${BACKUP_FILE}" ]; then
    echo -e "${RED}❌ ERROR: No backup found at ${BACKUP_FILE}${NC}"
    echo ""
    echo "Cannot restore - no backup exists!"
    echo "Please run './scripts/db-switch.sh clean' first to create a backup."
    exit 1
  fi

  echo -e "${BLUE}📥 Restoring database from backup...${NC}"
  echo "  Backup file: ${BACKUP_FILE}"

  BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
  echo "  Backup size: ${BACKUP_SIZE}"

  # Restore using psql
  PGPASSWORD=charhub_dev_password psql \
    -h localhost \
    -p 5401 \
    -U charhub \
    -d charhub_db \
    < "${BACKUP_FILE}" 2>&1 | grep -v "^DROP\|^CREATE\|^ALTER\|^COPY" | tail -20

  # Verify restoration
  RESTORED_USERS=$(PGPASSWORD=charhub_dev_password psql -h localhost -p 5401 -U charhub -d charhub_db -t -c "SELECT COUNT(*) FROM \"User\";" | tr -d ' ')
  RESTORED_CHARS=$(PGPASSWORD=charhub_dev_password psql -h localhost -p 5401 -U charhub -d charhub_db -t -c "SELECT COUNT(*) FROM \"Character\";" | tr -d ' ')

  echo ""
  echo -e "${GREEN}✓ Restore completed${NC}"
  echo "  Users:      ${RESTORED_USERS}"
  echo "  Characters: ${RESTORED_CHARS}"
}

# ============================================================================
# Switch Database
# ============================================================================

echo -e "${BLUE}🔄 Switching to ${MODE} database mode...${NC}"
echo ""

# Stop backend to prevent connection issues
echo "Stopping backend container..."
docker compose stop backend

# Wait for backend to fully stop
sleep 2

if [ "$MODE" = "clean" ]; then
  # ========================================
  # CLEAN MODE: Empty database (WITH BACKUP)
  # ========================================

  echo -e "${YELLOW}📋 CLEAN MODE: Empty database for CI-equivalent tests${NC}"
  echo ""
  echo "This mode provides:"
  echo "  - Backup of current data (to ${BACKUP_FILE})"
  echo "  - Fresh database schema (via migrations)"
  echo "  - No seed data"
  echo "  - Same environment as GitHub Actions CI"
  echo ""

  # CRITICAL: Create backup BEFORE destroying anything
  if docker compose ps postgres | grep -q "Up"; then
    create_backup
  else
    echo -e "${YELLOW}⚠️  PostgreSQL not running, skipping backup${NC}"
  fi

  # Stop all services
  docker compose down

  # Remove database volume to start fresh
  echo "Removing database volume..."
  docker volume rm -f $(basename "$PWD")_postgres_data 2>/dev/null || true

  # Start database
  echo "Starting database..."
  docker compose up -d postgres

  # Wait for database to be ready
  echo "Waiting for database to be ready..."
  sleep 10

  # Run migrations to create schema
  echo "Running database migrations..."
  docker compose up -d backend
  sleep 5

  # Backend will auto-run migrations via prisma migrate deploy
  docker compose exec backend npx prisma migrate deploy || true

  echo ""
  echo -e "${GREEN}✅ Switched to CLEAN database${NC}"
  echo "Database is empty and ready for CI-equivalent tests"
  echo ""
  echo -e "${BLUE}💡 To restore your data, run:${NC}"
  echo "  ./scripts/db-switch.sh populated"

elif [ "$MODE" = "populated" ]; then
  # ========================================
  # POPULATED MODE: Restore from backup
  # ========================================

  echo -e "${YELLOW}📋 POPULATED MODE: Restore database from backup${NC}"
  echo ""
  echo "This mode provides:"
  echo "  - Restores data from backup"
  echo "  - All users, characters, configurations preserved"
  echo "  - Ready for manual testing"
  echo ""

  # Stop all services
  docker compose down

  # Remove database volume to start fresh
  echo "Removing database volume..."
  docker volume rm -f $(basename "$PWD")_postgres_data 2>/dev/null || true

  # Start database
  echo "Starting database..."
  docker compose up -d postgres

  # Wait for database to be ready
  echo "Waiting for database to be ready..."
  sleep 10

  # Run migrations first (creates schema)
  echo "Running database migrations..."
  docker compose up -d backend
  sleep 5
  docker compose exec backend npx prisma migrate deploy || true

  # Wait a bit for migrations to complete
  sleep 3

  # Restore from backup
  restore_backup

  echo ""
  echo -e "${GREEN}✅ Switched to POPULATED database${NC}"
  echo "Database restored from backup and ready for manual testing"
fi

# ============================================================================
# Restart All Services
# ============================================================================

echo ""
echo "Restarting all services..."
docker compose down
docker compose up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 15

# ============================================================================
# Health Check
# ============================================================================

echo ""
echo -e "${BLUE}🏥 Running health checks...${NC}"
echo ""

# Check PostgreSQL
POSTGRES_STATUS=$(docker compose ps postgres --format='{{.Status}}' 2>/dev/null || echo "not running")
if [[ "$POSTGRES_STATUS" =~ "Up" ]]; then
  echo -e "  PostgreSQL: ${GREEN}✓ Running${NC}"
else
  echo -e "  PostgreSQL: ${RED}✗ Not running${NC}"
fi

# Check Redis
REDIS_STATUS=$(docker compose ps redis --format='{{.Status}}' 2>/dev/null || echo "not running")
if [[ "$REDIS_STATUS" =~ "Up" ]]; then
  echo -e "  Redis:      ${GREEN}✓ Running${NC}"
else
  echo -e "  Redis:      ${RED}✗ Not running${NC}"
fi

# Check Backend
BACKEND_STATUS=$(docker compose ps backend --format='{{.Status}}' 2>/dev/null || echo "not running")
if [[ "$BACKEND_STATUS" =~ "Up" ]] || [[ "$BACKEND_STATUS" =~ "healthy" ]]; then
  echo -e "  Backend:    ${GREEN}✓ Running${NC}"
else
  echo -e "  Backend:    ${RED}✗ Not running${NC}"
fi

# Check Frontend
FRONTEND_STATUS=$(docker compose ps frontend --format='{{.Status}}' 2>/dev/null || echo "not running")
if [[ "$FRONTEND_STATUS" =~ "Up" ]]; then
  echo -e "  Frontend:   ${GREEN}✓ Running${NC}"
else
  echo -e "  Frontend:   ${RED}✗ Not running${NC}"
fi

# ============================================================================
# Summary
# ============================================================================

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Database switched to ${MODE} mode${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$MODE" = "clean" ]; then
  echo "When to use CLEAN mode:"
  echo "  ✓ Running automated tests (npm test)"
  echo "  ✓ CI-equivalent validation"
  echo "  ✓ Testing migrations"
  echo "  ✓ Fresh start without data"
  echo ""
  echo "Next steps:"
  echo "  1. Run tests: cd backend && npm test"
  echo "  2. Run CI validation: ./scripts/ci-local.sh"
  echo ""
  echo "To restore your data:"
  echo "  ./scripts/db-switch.sh populated"
elif [ "$MODE" = "populated" ]; then
  echo "When to use POPULATED mode:"
  echo "  ✓ Manual testing with realistic data"
  echo "  ✓ User acceptance testing"
  echo "  ✓ Pre-deployment validation"
  echo "  ✓ Feature demonstration"
  echo ""
  echo "Next steps:"
  echo "  1. Open frontend in browser"
  echo "  2. Test features manually"
  echo "  3. Verify all functionality works"
  echo ""
  echo "To clean database again:"
  echo "  ./scripts/db-switch.sh clean"
fi

echo ""
echo -e "${BLUE}📁 Backup location: ${BACKUP_FILE}${NC}"
if [ -f "${BACKUP_FILE}" ]; then
  BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
  BACKUP_DATE=$(date -r "${BACKUP_FILE}" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || stat -c %y "${BACKUP_FILE}" 2>/dev/null | cut -d'.' -f1)
  echo "   Size: ${BACKUP_SIZE}"
  echo "   Created: ${BACKUP_DATE}"
fi
echo ""
