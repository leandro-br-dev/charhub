#!/bin/bash
set -euo pipefail

# =============================================================================
# docker-cleanup-full.sh - Full Docker cleanup (preserves named volumes)
# Usage: ./scripts/docker-cleanup-full.sh
# WARNING: This will remove ALL build cache and unused images
#
# ENVIRONMENT: Development Only (NOT for production)
# SCOPE: Affects all Docker resources on the host (shared across all projects)
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}  Docker Full Cleanup (Cache + Images)${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# Show current usage
echo -e "${YELLOW}Current Docker disk usage:${NC}"
docker system df
echo ""

# Confirm action
echo -e "${RED}WARNING: This will remove ALL build cache and unused images.${NC}"
echo "Named volumes (postgres_data, redis_data) will be PRESERVED."
echo ""
read -p "Continue? [y/N] " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo -e "${YELLOW}Step 1/4: Pruning build cache...${NC}"
docker builder prune -af

echo ""
echo -e "${YELLOW}Step 2/4: Pruning unused images...${NC}"
docker image prune -af

echo ""
echo -e "${YELLOW}Step 3/4: Pruning unused volumes (except named)...${NC}"
# This only removes anonymous volumes, NOT named ones like postgres_data
docker volume prune -f

echo ""
echo -e "${YELLOW}Step 4/4: Pruning unused networks...${NC}"
docker network prune -f

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}  Cleanup Complete${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo -e "${YELLOW}New Docker disk usage:${NC}"
docker system df
echo ""
echo -e "${GREEN}Named volumes preserved:${NC}"
docker volume ls --filter "name=postgres_data" --filter "name=redis_data" 2>/dev/null || echo "(no matching volumes found)"
