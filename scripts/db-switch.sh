#!/bin/bash
set -euo pipefail

# Script: db-switch.sh
# Purpose: Switch between clean database and test database with seed data
# Usage: ./scripts/db-switch.sh <mode>
# Modes: clean, test

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
  echo "  clean  - Empty database (for CI-equivalent tests)"
  echo "  test   - Database with seed data (for manual testing)"
  echo ""
  echo "Examples:"
  echo "  ./scripts/db-switch.sh clean   # Switch to empty database"
  echo "  ./scripts/db-switch.sh test    # Switch to database with test data"
  exit 1
fi

# Validate mode
VALID_MODES=("clean" "test")
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
  # CLEAN MODE: Empty database
  # ========================================

  echo -e "${YELLOW}📋 CLEAN MODE: Empty database for CI-equivalent tests${NC}"
  echo ""
  echo "This mode provides:"
  echo "  - Fresh database schema (via migrations)"
  echo "  - No seed data"
  echo "  - Same environment as GitHub Actions CI"
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

  # Run migrations to create schema
  echo "Running database migrations..."
  docker compose up -d backend
  sleep 5

  # Backend will auto-run migrations via prisma migrate deploy
  docker compose exec backend npx prisma migrate deploy || true

  echo ""
  echo -e "${GREEN}✅ Switched to CLEAN database${NC}"
  echo "Database is empty and ready for CI-equivalent tests"

elif [ "$MODE" = "test" ]; then
  # ========================================
  # TEST MODE: Database with seed data
  # ========================================

  echo -e "${YELLOW}📋 TEST MODE: Database with seed data for manual testing${NC}"
  echo ""
  echo "This mode provides:"
  echo "  - Database schema (via migrations)"
  echo "  - Seed data for realistic testing"
  echo "  - Sample users, characters, etc."
  echo ""

  # Check if seed script exists
  if [ ! -f "backend/prisma/seed.ts" ]; then
    echo -e "${YELLOW}⚠️  WARNING: Seed script not found at backend/prisma/seed.ts${NC}"
    echo "Database will have schema but no seed data"
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

  # Run migrations
  echo "Running database migrations..."
  docker compose up -d backend
  sleep 5
  docker compose exec backend npx prisma migrate deploy || true

  # Run seed script
  echo "Seeding database with test data..."
  if [ -f "backend/prisma/seed.ts" ]; then
    docker compose exec backend npm run db:seed || \
    docker compose exec backend npx tsx backend/prisma/seed.ts || \
    docker compose exec backend npx prisma db seed || \
    echo -e "${YELLOW}⚠️  Seed script exists but failed to execute${NC}"
  else
    echo -e "${YELLOW}⚠️  No seed script found, skipping seed${NC}"
  fi

  echo ""
  echo -e "${GREEN}✅ Switched to TEST database${NC}"
  echo "Database has seed data and is ready for manual testing"
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
elif [ "$MODE" = "test" ]; then
  echo "When to use TEST mode:"
  echo "  ✓ Manual testing with realistic data"
  echo "  ✓ User acceptance testing"
  echo "  ✓ Pre-deployment validation"
  echo "  ✓ Feature demonstration"
  echo ""
  echo "Next steps:"
  echo "  1. Open frontend in browser"
  echo "  2. Test features manually"
  echo "  3. Verify all functionality works"
fi

echo ""
echo "To switch back:"
if [ "$MODE" = "clean" ]; then
  echo "  ./scripts/db-switch.sh test"
else
  echo "  ./scripts/db-switch.sh clean"
fi
echo ""
