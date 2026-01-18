#!/bin/bash
set -euo pipefail

# =============================================================================
# docker-maintenance-setup.sh - Setup Docker maintenance automation
# Usage: ./scripts/docker-maintenance-setup.sh
#
# ENVIRONMENT: Development Only (NOT for production)
# PURPOSE: Configures cron jobs for automated Docker cleanup
#
# IMPORTANT: Only ONE cron entry is needed per host, as Docker resources
#            are shared across all projects. This script checks if cron
#            is already configured before adding entries.
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}  Docker Maintenance Setup${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# Check if running in development environment
if [ "${NODE_ENV:-development}" = "production" ]; then
    echo -e "${RED}ERROR: This script is for DEVELOPMENT environments only.${NC}"
    echo "Do not run in production."
    exit 1
fi

# Check if cron job already exists (from any project)
EXISTING_CRON=$(crontab -l 2>/dev/null | grep "docker-maintenance-cron.sh" || true)

if [ -n "$EXISTING_CRON" ]; then
    echo -e "${GREEN}Docker maintenance cron is already configured:${NC}"
    echo "$EXISTING_CRON"
    echo ""
    echo -e "${YELLOW}No changes needed. Cron is shared across all projects.${NC}"
    exit 0
fi

# Create log file if it doesn't exist
if [ ! -f /var/log/docker-maintenance.log ]; then
    echo "Creating log file..."
    sudo touch /var/log/docker-maintenance.log 2>/dev/null || touch /var/log/docker-maintenance.log
    sudo chmod 644 /var/log/docker-maintenance.log 2>/dev/null || chmod 644 /var/log/docker-maintenance.log
fi

# Add cron entries
echo "Adding Docker maintenance cron jobs..."

(crontab -l 2>/dev/null || true; cat << EOF
# Docker Maintenance Automation (Development Only)
# Added: $(date '+%Y-%m-%d') by docker-maintenance-setup.sh
# Affects ALL Docker resources on host (shared across all agent projects)

# Daily quick cleanup at 3 AM
0 3 * * * ${SCRIPT_DIR}/docker-maintenance-cron.sh quick

# Weekly deep cleanup on Sunday at 4 AM
0 4 * * 0 ${SCRIPT_DIR}/docker-maintenance-cron.sh deep
EOF
) | crontab -

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}  Setup Complete${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo "Cron jobs configured:"
crontab -l | grep -A1 "docker-maintenance"
echo ""
echo -e "${YELLOW}Notes:${NC}"
echo "  - Cron is shared across all projects on this host"
echo "  - Daily cleanup runs at 3 AM (removes cache older than 48h)"
echo "  - Weekly deep cleanup runs Sunday at 4 AM"
echo "  - Logs are written to /var/log/docker-maintenance.log"
echo ""
echo "To verify cron is running:"
echo "  tail -f /var/log/docker-maintenance.log"
echo ""
echo "To manually run cleanup now:"
echo "  ./scripts/docker-cleanup-quick.sh"
