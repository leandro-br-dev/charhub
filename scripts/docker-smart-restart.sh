#!/bin/bash
set -euo pipefail

# =============================================================================
# docker-smart-restart.sh - Intelligent Docker restart
# Usage: ./scripts/docker-smart-restart.sh [--force-build] [--build-backend] [--build-frontend]
# Detects if rebuild is needed based on file changes
#
# ENVIRONMENT: Development Only (NOT for production)
# SCOPE: Project-specific (affects only containers in this project)
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
FORCE_BUILD=false
FORCE_BACKEND=false
FORCE_FRONTEND=false

for arg in "$@"; do
    case $arg in
        --force-build)
            FORCE_BUILD=true
            ;;
        --build-backend)
            FORCE_BACKEND=true
            ;;
        --build-frontend)
            FORCE_FRONTEND=true
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --force-build      Force rebuild of all services"
            echo "  --build-backend    Force rebuild of backend only"
            echo "  --build-frontend   Force rebuild of frontend only"
            echo "  --help, -h         Show this help message"
            echo ""
            echo "Without options, detects changes and rebuilds only when necessary."
            exit 0
            ;;
    esac
done

# Track if any service needs rebuild
BACKEND_NEEDS_BUILD=false
FRONTEND_NEEDS_BUILD=false

# =============================================================================
# Detection Functions
# =============================================================================

check_backend_changes() {
    local MARKER_FILE="$PROJECT_ROOT/.docker-build-marker-backend"

    # Files that require rebuild
    local WATCH_FILES=(
        "$PROJECT_ROOT/backend/Dockerfile"
        "$PROJECT_ROOT/backend/package.json"
        "$PROJECT_ROOT/backend/package-lock.json"
        "$PROJECT_ROOT/backend/prisma/schema.prisma"
    )

    # Check if marker exists
    if [ ! -f "$MARKER_FILE" ]; then
        echo -e "  Backend: ${YELLOW}No build marker found, rebuild needed${NC}"
        return 0  # Needs build
    fi

    # Check if any watched file is newer than marker
    for FILE in "${WATCH_FILES[@]}"; do
        if [ -f "$FILE" ] && [ "$FILE" -nt "$MARKER_FILE" ]; then
            local FILENAME=$(basename "$FILE")
            echo -e "  Backend: ${YELLOW}$FILENAME changed, rebuild needed${NC}"
            return 0  # Needs build
        fi
    done

    echo -e "  Backend: ${GREEN}No changes detected, skip rebuild${NC}"
    return 1  # No build needed
}

check_frontend_changes() {
    local MARKER_FILE="$PROJECT_ROOT/.docker-build-marker-frontend"

    # Files that require rebuild
    local WATCH_FILES=(
        "$PROJECT_ROOT/frontend/Dockerfile"
        "$PROJECT_ROOT/frontend/package.json"
        "$PROJECT_ROOT/frontend/package-lock.json"
    )

    # Check if marker exists
    if [ ! -f "$MARKER_FILE" ]; then
        echo -e "  Frontend: ${YELLOW}No build marker found, rebuild needed${NC}"
        return 0  # Needs build
    fi

    # Check if any watched file is newer than marker
    for FILE in "${WATCH_FILES[@]}"; do
        if [ -f "$FILE" ] && [ "$FILE" -nt "$MARKER_FILE" ]; then
            local FILENAME=$(basename "$FILE")
            echo -e "  Frontend: ${YELLOW}$FILENAME changed, rebuild needed${NC}"
            return 0  # Needs build
        fi
    done

    echo -e "  Frontend: ${GREEN}No changes detected, skip rebuild${NC}"
    return 1  # No build needed
}

update_build_marker() {
    local SERVICE=$1
    touch "$PROJECT_ROOT/.docker-build-marker-$SERVICE"
}

check_available_space() {
    local AVAILABLE_GB=$(df -BG /var/lib/docker 2>/dev/null | tail -1 | awk '{print $4}' | sed 's/G//' || echo "100")

    if [ "$AVAILABLE_GB" -lt 10 ]; then
        echo -e "${RED}WARNING: Only ${AVAILABLE_GB}GB available. Consider running cleanup first!${NC}"
        echo "  ./scripts/docker-cleanup-quick.sh"
        echo ""
    fi
}

# =============================================================================
# Main Logic
# =============================================================================

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}  Smart Docker Restart${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

cd "$PROJECT_ROOT"

# Check available disk space
check_available_space

# Check what needs rebuilding
echo -e "${YELLOW}Checking for changes...${NC}"
echo ""

if [ "$FORCE_BUILD" = true ]; then
    echo -e "  ${YELLOW}Force build requested - rebuilding all${NC}"
    BACKEND_NEEDS_BUILD=true
    FRONTEND_NEEDS_BUILD=true
elif [ "$FORCE_BACKEND" = true ] || [ "$FORCE_FRONTEND" = true ]; then
    if [ "$FORCE_BACKEND" = true ]; then
        echo -e "  ${YELLOW}Force backend build requested${NC}"
        BACKEND_NEEDS_BUILD=true
    fi
    if [ "$FORCE_FRONTEND" = true ]; then
        echo -e "  ${YELLOW}Force frontend build requested${NC}"
        FRONTEND_NEEDS_BUILD=true
    fi
else
    if check_backend_changes; then
        BACKEND_NEEDS_BUILD=true
    fi
    if check_frontend_changes; then
        FRONTEND_NEEDS_BUILD=true
    fi
fi

echo ""

# Stop containers
echo -e "${YELLOW}Stopping containers...${NC}"
docker compose down

echo ""

# Restart with appropriate build flags
if [ "$BACKEND_NEEDS_BUILD" = true ] && [ "$FRONTEND_NEEDS_BUILD" = true ]; then
    echo -e "${YELLOW}Rebuilding ALL services...${NC}"
    docker compose up -d --build
    update_build_marker "backend"
    update_build_marker "frontend"
elif [ "$BACKEND_NEEDS_BUILD" = true ]; then
    echo -e "${YELLOW}Rebuilding backend only...${NC}"
    docker compose up -d --build backend
    docker compose up -d
    update_build_marker "backend"
elif [ "$FRONTEND_NEEDS_BUILD" = true ]; then
    echo -e "${YELLOW}Rebuilding frontend only...${NC}"
    docker compose up -d --build frontend
    docker compose up -d
    update_build_marker "frontend"
else
    echo -e "${GREEN}No rebuild needed, simple restart...${NC}"
    docker compose up -d
fi

echo ""
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 5

# Check health
"$SCRIPT_DIR/health-check.sh" --wait || true

echo ""
echo -e "${GREEN}Done! Services status:${NC}"
docker compose ps
