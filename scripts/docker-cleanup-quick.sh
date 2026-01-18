#!/bin/bash
set -euo pipefail

# =============================================================================
# docker-cleanup-quick.sh - Quick Docker cleanup for daily use
# Usage: ./scripts/docker-cleanup-quick.sh
# Safe to run anytime - removes only old/unused items
#
# ENVIRONMENT: Development Only (NOT for production)
# SCOPE: Affects all Docker resources on the host (shared across all projects)
# =============================================================================

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}  Quick Docker Cleanup${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# Show current usage
echo -e "${YELLOW}Current Docker disk usage:${NC}"
docker system df
echo ""

# Prune build cache older than 24 hours
echo -e "${YELLOW}Pruning build cache older than 24h...${NC}"
docker builder prune -f --filter "until=24h" 2>/dev/null || echo "No cache to prune"

# Prune dangling images only
echo ""
echo -e "${YELLOW}Pruning dangling images...${NC}"
docker image prune -f

# Prune unused anonymous volumes
echo ""
echo -e "${YELLOW}Pruning unused anonymous volumes...${NC}"
docker volume prune -f

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}  Quick Cleanup Complete${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo -e "${YELLOW}New Docker disk usage:${NC}"
docker system df
