#!/bin/bash
set -euo pipefail

# Script: setup-agent.sh
# Purpose: Unified agent setup and role switching
#          Loads agent profile, skills, and sub-agents
# Usage: ./scripts/agents/setup-agent.sh <agent-name>
# Example: ./scripts/agents/setup-agent.sh coder

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ============================================================================
# Check if running from project root
# ============================================================================

if [ ! -f "docs/agents/coder/CLAUDE.md" ]; then
  echo -e "${RED}❌ ERROR: Must run from project root directory${NC}"
  echo -e "${YELLOW}Current directory: $(pwd)${NC}"
  exit 1
fi

# ============================================================================
# Parse Agent Name Parameter
# ============================================================================

AGENT_NAME="${1:-}"

if [ -z "$AGENT_NAME" ]; then
  echo -e "${RED}❌ ERROR: Agent name parameter required${NC}"
  echo ""
  echo "Usage: ./scripts/agents/setup-agent.sh <agent-name>"
  echo ""
  echo "Available agents:"
  echo "  - coder     (Agent Coder - implementation)"
  echo "  - reviewer  (Agent Reviewer - deployment & QA)"
  echo "  - planner   (Agent Planner - planning & architecture)"
  echo ""
  echo "Example:"
  echo "  ./scripts/agents/setup-agent.sh coder"
  echo ""
  echo "This script will:"
  echo "  1. Load agent profile (CLAUDE.md)"
  echo "  2. Load agent skills to .claude/skills/"
  echo "  3. Load agent sub-agents to .claude/agents/"
  echo "  4. Load global skills to .claude/skills/"
  echo ""
  exit 1
fi

# Validate agent exists
VALID_AGENTS=("coder" "reviewer" "planner")
if [[ ! " ${VALID_AGENTS[@]} " =~ " ${AGENT_NAME} " ]]; then
  echo -e "${RED}❌ ERROR: Invalid agent '${AGENT_NAME}'${NC}"
  echo "Valid agents: ${VALID_AGENTS[@]}"
  exit 1
fi

# ============================================================================
# Display Header
# ============================================================================

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║           Agent Profile Setup & Switching                     ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Agent: ${AGENT_NAME}${NC}"
echo ""

# ============================================================================
# Create .claude directory structure
# ============================================================================

echo -e "${YELLOW}Preparing .claude directory structure...${NC}"

mkdir -p .claude/skills
mkdir -p .claude/agents

echo -e "${GREEN}✓ Created .claude directory structure${NC}"

# ============================================================================
# Step 1: Load Agent Profile (CLAUDE.md)
# ============================================================================

echo ""
echo -e "${YELLOW}[1/4] Loading agent profile (CLAUDE.md)...${NC}"

CLAUDE_SOURCE="docs/agents/${AGENT_NAME}/CLAUDE.md"

if [ ! -f "$CLAUDE_SOURCE" ]; then
  echo -e "${RED}❌ ERROR: Agent profile not found: ${CLAUDE_SOURCE}${NC}"
  exit 1
fi

cp "$CLAUDE_SOURCE" CLAUDE.md
echo -e "${GREEN}✓ Loaded CLAUDE.md from ${CLAUDE_SOURCE}${NC}"

# ============================================================================
# Step 2: Load Agent Skills
# ============================================================================

echo ""
echo -e "${YELLOW}[2/4] Loading agent skills...${NC}"

AGENT_SKILLS_SOURCE="docs/agents/${AGENT_NAME}/skills/"

if [ ! -d "$AGENT_SKILLS_SOURCE" ]; then
  echo -e "${YELLOW}⚠ No agent-specific skills directory found${NC}"
  echo "  Expected: ${AGENT_SKILLS_SOURCE}"
else
  # Clear existing agent skills (but keep global skills)
  rm -rf .claude/skills/* 2>/dev/null || true

  # Copy agent skills (preserve subdirectory structure)
  if [ "$(ls -A $AGENT_SKILLS_SOURCE 2>/dev/null)" ]; then
    cp -r "$AGENT_SKILLS_SOURCE"/* .claude/skills/

    SKILL_COUNT=$(find .claude/skills -name "SKILL.md" | wc -l)
    echo -e "${GREEN}✓ Loaded ${SKILL_COUNT} agent skill(s)${NC}"
  else
    echo -e "${YELLOW}⚠ Agent skills directory is empty${NC}"
  fi
fi

# ============================================================================
# Step 3: Load Global Skills
# ============================================================================

echo ""
echo -e "${YELLOW}[3/4] Loading global skills...${NC}"

GLOBAL_SKILLS_SOURCE="docs/agents/skills/"

if [ ! -d "$GLOBAL_SKILLS_SOURCE" ]; then
  echo -e "${YELLOW}⚠ No global skills directory found (will be created)${NC}"
  mkdir -p "$GLOBAL_SKILLS_SOURCE"
else
  # Copy global skills (merge with agent skills)
  if [ "$(ls -A $GLOBAL_SKILLS_SOURCE 2>/dev/null)" ]; then
    cp -r "$GLOBAL_SKILLS_SOURCE"/* .claude/skills/
    echo -e "${GREEN}✓ Loaded global skills${NC}"
  fi
fi

# Count total skills
TOTAL_SKILLS=$(find .claude/skills -name "SKILL.md" 2>/dev/null | wc -l)
echo -e "${CYAN}  Total skills available: ${TOTAL_SKILLS}${NC}"

# ============================================================================
# Step 4: Load Sub-Agents
# ============================================================================

echo ""
echo -e "${YELLOW}[4/4] Loading sub-agents...${NC}"

SUB_AGENTS_SOURCE="docs/agents/${AGENT_NAME}/sub-agents/"
SUB_AGENTS_DEST=".claude/agents"

# Clear existing sub-agents
rm -rf "${SUB_AGENTS_DEST:?}"/* 2>/dev/null || true

if [ ! -d "$SUB_AGENTS_SOURCE" ]; then
  echo -e "${YELLOW}⚠ No sub-agents directory found for '${AGENT_NAME}'${NC}"
  echo "  Expected: ${SUB_AGENTS_SOURCE}"
else
  # Copy sub-agent files
  if [ "$(ls -A $SUB_AGENTS_SOURCE 2>/dev/null)" ]; then
    SUB_AGENT_COUNT=$(find "$SUB_AGENTS_SOURCE" -name "*.md" | wc -l)
    cp "$SUB_AGENTS_SOURCE"/*.md "$SUB_AGENTS_DEST/" 2>/dev/null || true
    echo -e "${GREEN}✓ Loaded ${SUB_AGENT_COUNT} sub-agent(s)${NC}"

    # List loaded sub-agents
    echo ""
    echo -e "${CYAN}  Sub-agents loaded:${NC}"
    find "$SUB_AGENTS_SOURCE" -name "*.md" -exec basename {} \; | sort | while read -r filename; do
      echo -e "${CYAN}    - ${filename%.md}${NC}"
    done
  else
    echo -e "${YELLOW}⚠ Sub-agents directory is empty${NC}"
  fi
fi

# ============================================================================
# Summary
# ============================================================================

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Agent Setup Complete!                            ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Active Agent: ${AGENT_NAME}${NC}"
echo ""
echo "Files loaded:"
echo "  ✓ CLAUDE.md (agent profile)"
echo "  ✓ .claude/skills/ (${TOTAL_SKILLS} skills)"
echo "  ✓ .claude/agents/ (sub-agents)"
echo ""
echo -e "${YELLOW}Directory Structure:${NC}"
echo "  .claude/"
echo "    ├── skills/         (agent skills + global skills)"
echo "    │   ├── orchestration/"
echo "    │   └── technical/"
echo "    └── agents/         (sub-agents)"
echo ""
echo "Next steps:"
echo ""
echo "1. Review your agent profile:"
echo -e "   ${CYAN}cat CLAUDE.md${NC}"
echo ""
echo "2. Check available skills:"
echo -e "   ${CYAN}find .claude/skills -name SKILL.md${NC}"
echo ""
echo "3. Check sub-agents:"
echo -e "   ${CYAN}ls .claude/agents/${NC}"
echo ""
echo "4. To switch to another agent:"
echo -e "   ${CYAN}./scripts/agents/setup-agent.sh <agent-name>${NC}"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
echo ""
