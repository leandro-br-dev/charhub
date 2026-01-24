#!/bin/bash
set -euo pipefail

# Script: health-check.sh
# Purpose: Verify all Docker containers are healthy before critical operations
# Usage: ./scripts/health-check.sh [--wait]
# Options:
#   --wait: Wait up to 2 minutes for services to become healthy

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

WAIT_MODE=false
if [ "${1:-}" = "--wait" ]; then
  WAIT_MODE=true
fi

# ============================================================================
# Functions
# ============================================================================

check_service() {
  local SERVICE=$1
  local STATUS=$(docker compose ps "$SERVICE" --format='{{.Status}}' 2>/dev/null || echo "not running")

  if [[ "$STATUS" =~ "Up" ]] || [[ "$STATUS" =~ "healthy" ]]; then
    echo -e "  ${SERVICE}: ${GREEN}✓ Healthy${NC} ($STATUS)"
    return 0
  else
    echo -e "  ${SERVICE}: ${RED}✗ Not healthy${NC} ($STATUS)"
    return 1
  fi
}

check_backend_logs() {
  local LOGS=$(docker compose logs backend --tail=50 2>/dev/null || echo "")

  # Check for restart loops
  if echo "$LOGS" | grep -q "Restarting"; then
    echo -e "    ${RED}⚠️  Backend is in restart loop!${NC}"
    return 1
  fi

  # Check for common errors
  if echo "$LOGS" | grep -qi "error"; then
    echo -e "    ${YELLOW}⚠️  Errors found in backend logs${NC}"
    echo "$LOGS" | grep -i "error" | tail -3
    return 1
  fi

  return 0
}

# ============================================================================
# Health Check
# ============================================================================

echo -e "${BLUE}🏥 Docker Services Health Check${NC}"
echo ""

ALL_HEALTHY=true

# If wait mode, retry up to 24 times (2 minutes with 5s intervals)
MAX_ATTEMPTS=1
if [ "$WAIT_MODE" = true ]; then
  MAX_ATTEMPTS=24
  echo "Wait mode enabled - will retry for up to 2 minutes"
  echo ""
fi

for attempt in $(seq 1 $MAX_ATTEMPTS); do
  if [ "$WAIT_MODE" = true ] && [ $attempt -gt 1 ]; then
    echo "Attempt $attempt/$MAX_ATTEMPTS..."
  fi

  ALL_HEALTHY=true

  # Check PostgreSQL
  if ! check_service postgres; then
    ALL_HEALTHY=false
  fi

  # Check Redis
  if ! check_service redis; then
    ALL_HEALTHY=false
  fi

  # Check Backend
  if ! check_service backend; then
    ALL_HEALTHY=false
  else
    # Additional backend checks
    if ! check_backend_logs; then
      ALL_HEALTHY=false
    fi
  fi

  # Check Frontend
  if ! check_service frontend; then
    ALL_HEALTHY=false
  fi

  # If all healthy, break
  if [ "$ALL_HEALTHY" = true ]; then
    break
  fi

  # If not in wait mode or last attempt, exit
  if [ "$WAIT_MODE" = false ] || [ $attempt -eq $MAX_ATTEMPTS ]; then
    break
  fi

  # Wait before next attempt
  echo ""
  sleep 5
done

echo ""

# ============================================================================
# Summary
# ============================================================================

if [ "$ALL_HEALTHY" = true ]; then
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}✓ All services are healthy${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "Safe to proceed with:"
  echo "  ✓ Creating Pull Requests"
  echo "  ✓ Running tests"
  echo "  ✓ User acceptance testing"
  echo "  ✓ Deployment"
  echo ""
  exit 0
else
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}✗ Some services are not healthy${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "${RED}DO NOT proceed with:${NC}"
  echo "  ✗ Creating Pull Requests"
  echo "  ✗ User acceptance testing"
  echo "  ✗ Deployment"
  echo ""
  echo "Actions required:"
  echo "  1. Check logs: docker compose logs <service>"
  echo "  2. Fix issues causing unhealthy status"
  echo "  3. Restart services: docker compose restart <service>"
  echo "  4. Run this check again: ./scripts/health-check.sh"
  echo ""
  echo "Common issues:"
  echo "  - Backend restart loop: Check for code errors or missing env vars"
  echo "  - Database connection failed: Verify DATABASE_URL in .env"
  echo "  - Redis connection failed: Check if Redis is running"
  echo ""
  exit 1
fi
