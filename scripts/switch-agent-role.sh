#!/bin/bash
set -euo pipefail

# Script: switch-agent-role.sh
# Purpose: Switch agent role by copying new CLAUDE.md template
# Usage: cd charhub-agent-XX && ./scripts/switch-agent-role.sh <new-role>
# Example: cd charhub-agent-01 && ./scripts/switch-agent-role.sh reviewer

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# Auto-detect Agent ID from current directory
# ============================================================================

CURRENT_DIR=$(basename "$PWD")

if [[ $CURRENT_DIR =~ ^charhub-agent-([0-9]{2})$ ]]; then
  AGENT_ID="${BASH_REMATCH[1]}"
  echo -e "${GREEN}✓ Detected Agent ID: ${AGENT_ID}${NC}"
else
  echo -e "${RED}❌ ERROR: Must run from inside charhub-agent-XX directory${NC}"
  echo -e "${YELLOW}Current directory: ${CURRENT_DIR}${NC}"
  echo -e "${YELLOW}Expected pattern: charhub-agent-01, charhub-agent-02, etc.${NC}"
  exit 1
fi

# ============================================================================
# Read current role from .agentrc
# ============================================================================

if [ ! -f ".agentrc" ]; then
  echo -e "${RED}❌ ERROR: .agentrc not found${NC}"
  echo -e "${YELLOW}Have you run setup-agent.sh first?${NC}"
  exit 1
fi

# shellcheck disable=SC1091
source .agentrc

CURRENT_ROLE="${AGENT_ROLE}"

echo -e "${BLUE}Current role: ${CURRENT_ROLE}${NC}"

# ============================================================================
# Validate New Role Parameter
# ============================================================================

NEW_ROLE="${1:-}"

if [ -z "$NEW_ROLE" ]; then
  echo -e "${RED}❌ ERROR: New role parameter required${NC}"
  echo ""
  echo "Usage: ./scripts/switch-agent-role.sh <new-role>"
  echo ""
  echo "Available roles:"
  echo "  - coder     (Agent Coder - implementation)"
  echo "  - reviewer  (Agent Reviewer - deployment & QA)"
  echo "  - planner   (Agent Planner - planning & architecture)"
  echo ""
  echo "Example:"
  echo "  cd charhub-agent-01"
  echo "  ./scripts/switch-agent-role.sh reviewer"
  exit 1
fi

# Validate role exists
VALID_ROLES=("coder" "reviewer" "planner")
if [[ ! " ${VALID_ROLES[@]} " =~ " ${NEW_ROLE} " ]]; then
  echo -e "${RED}❌ ERROR: Invalid role '${NEW_ROLE}'${NC}"
  echo "Valid roles: ${VALID_ROLES[@]}"
  exit 1
fi

# Check if already in this role
if [ "$NEW_ROLE" == "$CURRENT_ROLE" ]; then
  echo -e "${YELLOW}⚠ Agent ${AGENT_ID} is already configured as '${CURRENT_ROLE}'${NC}"
  echo "Nothing to do."
  exit 0
fi

# ============================================================================
# Backup current CLAUDE.md
# ============================================================================

if [ -f "CLAUDE.md" ]; then
  BACKUP_FILE="CLAUDE.md.backup-${CURRENT_ROLE}-$(date +%Y%m%d-%H%M%S)"
  echo -e "${YELLOW}Backing up current CLAUDE.md to ${BACKUP_FILE}...${NC}"
  cp CLAUDE.md "$BACKUP_FILE"
  echo -e "${GREEN}✓ Backup created${NC}"
fi

# ============================================================================
# Copy new CLAUDE.md template
# ============================================================================

echo -e "${YELLOW}Switching role from '${CURRENT_ROLE}' to '${NEW_ROLE}'...${NC}"

TEMPLATE_SOURCE="docs/agents/${NEW_ROLE}/CLAUDE.md"

if [ ! -f "$TEMPLATE_SOURCE" ]; then
  echo -e "${RED}❌ ERROR: Template not found: ${TEMPLATE_SOURCE}${NC}"
  echo "Available templates:"
  ls -1 docs/agents/*/CLAUDE.md 2>/dev/null || echo "  (none found)"
  exit 1
fi

cp "$TEMPLATE_SOURCE" CLAUDE.md
echo -e "${GREEN}✓ Copied new CLAUDE.md from ${TEMPLATE_SOURCE}${NC}"

# ============================================================================
# Update .agentrc
# ============================================================================

echo -e "${YELLOW}Updating .agentrc...${NC}"

# Update role and timestamp
sed -i "s/^AGENT_ROLE=.*/AGENT_ROLE=${NEW_ROLE}/" .agentrc
sed -i "s/^CREATED_AT=.*/UPDATED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")/" .agentrc

# Add history entry
echo "" >> .agentrc
echo "# Role Change History" >> .agentrc
echo "# $(date -u +"%Y-%m-%dT%H:%M:%SZ"): ${CURRENT_ROLE} → ${NEW_ROLE}" >> .agentrc

echo -e "${GREEN}✓ Updated .agentrc${NC}"

# ============================================================================
# Summary
# ============================================================================

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Agent ${AGENT_ID} role switched: ${CURRENT_ROLE} → ${NEW_ROLE}${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Files updated:"
echo "  - CLAUDE.md (new role instructions)"
echo "  - .agentrc (updated metadata)"
echo ""
echo "Backup created:"
echo "  - ${BACKUP_FILE}"
echo ""
echo -e "${BLUE}Agent Configuration:${NC}"
echo "  ID:           ${AGENT_ID}"
echo "  Role:         ${NEW_ROLE} (was: ${CURRENT_ROLE})"
echo "  Backend:      ${BACKEND_PORT}"
echo "  Frontend:     ${FRONTEND_PORT}"
echo "  PostgreSQL:   ${POSTGRES_PORT}"
echo "  Redis:        ${REDIS_PORT}"
echo "  Nginx:        ${NGINX_PORT}"
echo ""
echo "Next steps:"
echo ""
echo "1. Review the new CLAUDE.md to understand your new role"
echo ""
echo "2. Restart your environment if running:"
echo "   docker compose down"
echo "   docker compose up -d"
echo ""
