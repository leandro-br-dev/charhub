#!/bin/bash
set -euo pipefail

# Script: db-copy-from-env.sh
# Purpose: SAFELY copy database from another environment (agent-02, agent-03, etc.)
# Method: Uses pg_dump/pg_restore via NETWORK (never mounts volumes directly)
# Safety: Does NOT touch source data - read-only operation

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# Validate Parameters
# ============================================================================

SOURCE_ENV="${1:-}"
SOURCE_PORT="${2:-}"

if [ -z "$SOURCE_ENV" ] || [ -z "$SOURCE_PORT" ]; then
  echo -e "${RED}❌ ERROR: Missing parameters${NC}"
  echo ""
  echo "Usage: ./scripts/db-copy-from-env.sh <source-env> <source-port>"
  echo ""
  echo "Examples:"
  echo "  ./scripts/db-copy-from-env.sh agent-02 5402   # Copy from agent-02"
  echo "  ./scripts/db-copy-from-env.sh agent-03 5403   # Copy from agent-03"
  echo "  ./scripts/db-copy-from-env.sh reviewer 5404   # Copy from reviewer"
  echo ""
  echo "This script:"
  echo "  ✓ Connects to source database via NETWORK (read-only)"
  echo "  ✓ Creates dump file"
  echo "  ✓ Restores to agent-01 database"
  echo "  ✓ NEVER touches source volumes (100% safe)"
  exit 1
fi

# ============================================================================
# Safety Checks
# ============================================================================

echo -e "${BLUE}🔒 Running safety checks...${NC}"
echo ""

# Check if source PostgreSQL is accessible
echo "Checking source database at localhost:${SOURCE_PORT}..."
if ! nc -z localhost "$SOURCE_PORT" 2>/dev/null; then
  echo -e "${RED}❌ ERROR: Source database not accessible at localhost:${SOURCE_PORT}${NC}"
  echo ""
  echo "Make sure the source environment is running:"
  echo "  cd /root/projects/charhub-${SOURCE_ENV}"
  echo "  docker compose ps postgres"
  exit 1
fi

echo -e "${GREEN}✓ Source database accessible${NC}"

# Verify source has data
echo "Verifying source has data..."
USER_COUNT=$(PGPASSWORD=charhub_dev_password psql -h localhost -p "$SOURCE_PORT" -U charhub -d charhub_db -t -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | tr -d ' ')

if [ -z "$USER_COUNT" ] || [ "$USER_COUNT" -eq 0 ]; then
  echo -e "${YELLOW}⚠️  WARNING: Source database appears to be empty (0 users)${NC}"
  read -p "Continue anyway? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
  fi
else
  echo -e "${GREEN}✓ Source has ${USER_COUNT} users${NC}"
fi

echo ""

# ============================================================================
# Confirm with User
# ============================================================================

echo -e "${YELLOW}⚠️  WARNING: This will REPLACE all data in agent-01 database${NC}"
echo ""
echo "Source: ${SOURCE_ENV} (localhost:${SOURCE_PORT})"
echo "Destination: agent-01 (current environment)"
echo ""
echo "Current agent-01 data will be lost!"
echo ""
read -p "Continue? (yes/NO): " -r

if [ "$REPLY" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

echo ""

# ============================================================================
# Stop Agent-01 Backend
# ============================================================================

echo -e "${BLUE}🛑 Stopping agent-01 backend...${NC}"
cd /root/projects/charhub-agent-01
docker compose stop backend 2>/dev/null || true
sleep 2

# ============================================================================
# Create Dump from Source
# ============================================================================

echo -e "${BLUE}📦 Creating dump from ${SOURCE_ENV}...${NC}"

DUMP_FILE="/tmp/charhub_dump_${SOURCE_ENV}_$(date +%Y%m%d_%H%M%S).sql"

PGPASSWORD=charhub_dev_password pg_dump \
  -h localhost \
  -p "$SOURCE_PORT" \
  -U charhub \
  -d charhub_db \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  > "$DUMP_FILE"

DUMP_LINES=$(wc -l < "$DUMP_FILE")
echo -e "${GREEN}✓ Dump created: ${DUMP_LINES} lines${NC}"
echo "  File: ${DUMP_FILE}"

# ============================================================================
# Restore to Agent-01
# ============================================================================

echo ""
echo -e "${BLUE}📥 Restoring dump to agent-01...${NC}"

# Get agent-01 postgres port
AGENT01_PORT=$(docker compose port postgres 5432 2>/dev/null | cut -d: -f2)

if [ -z "$AGENT01_PORT" ]; then
  echo -e "${RED}❌ ERROR: Cannot find agent-01 postgres port${NC}"
  exit 1
fi

echo "Agent-01 postgres port: ${AGENT01_PORT}"

PGPASSWORD=charhub_dev_password psql \
  -h localhost \
  -p "$AGENT01_PORT" \
  -U charhub \
  -d charhub_db \
  < "$DUMP_FILE" 2>&1 | grep -v "^DROP\|^CREATE\|^ALTER\|^COPY" | tail -20

echo -e "${GREEN}✓ Restore completed${NC}"

# ============================================================================
# Verify Data
# ============================================================================

echo ""
echo -e "${BLUE}🔍 Verifying restored data...${NC}"

RESTORED_USERS=$(PGPASSWORD=charhub_dev_password psql -h localhost -p "$AGENT01_PORT" -U charhub -d charhub_db -t -c "SELECT COUNT(*) FROM \"User\";" | tr -d ' ')
RESTORED_CHARS=$(PGPASSWORD=charhub_dev_password psql -h localhost -p "$AGENT01_PORT" -U charhub -d charhub_db -t -c "SELECT COUNT(*) FROM \"Character\";" | tr -d ' ')
RESTORED_STORIES=$(PGPASSWORD=charhub_dev_password psql -h localhost -p "$AGENT01_PORT" -U charhub -d charhub_db -t -c "SELECT COUNT(*) FROM \"Story\";" | tr -d ' ')

echo "  Users:      ${RESTORED_USERS}"
echo "  Characters: ${RESTORED_CHARS}"
echo "  Stories:    ${RESTORED_STORIES}"

# ============================================================================
# Restart Backend
# ============================================================================

echo ""
echo -e "${BLUE}🚀 Restarting agent-01 backend...${NC}"
docker compose up -d backend
sleep 5

# ============================================================================
# Cleanup
# ============================================================================

echo ""
read -p "Delete dump file? (Y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
  rm "$DUMP_FILE"
  echo -e "${GREEN}✓ Dump file deleted${NC}"
else
  echo "Dump file kept: ${DUMP_FILE}"
fi

# ============================================================================
# Summary
# ============================================================================

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Database copy completed successfully${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Source: ${SOURCE_ENV} (${USER_COUNT} users)"
echo "Destination: agent-01 (${RESTORED_USERS} users, ${RESTORED_CHARS} characters, ${RESTORED_STORIES} stories)"
echo ""
echo "Agent-01 is ready for testing!"
echo ""
