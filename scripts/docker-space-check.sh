#!/bin/bash
set -euo pipefail

# =============================================================================
# docker-space-check.sh - Check Docker space and alert if threshold exceeded
# Usage: ./scripts/docker-space-check.sh
# Exit codes: 0 = OK, 1 = Warning, 2 = Critical
#
# ENVIRONMENT: Development Only (NOT for production)
# SCOPE: Reports on all Docker resources on the host
# =============================================================================

# Thresholds in GB
WARNING_THRESHOLD_GB=50
CRITICAL_THRESHOLD_GB=100

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}  Docker Space Check${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""
docker system df
echo ""

# Get build cache info from docker system df
# Format: "Build Cache  X  Y  Z  W"
CACHE_LINE=$(docker system df 2>/dev/null | grep "Build cache" || echo "Build cache 0B 0 0B 0%")

# Extract the first size value (Total size column)
# Try to parse different formats: 148.2GB, 10.5MB, 500KB, etc.
CACHE_SIZE_RAW=$(echo "$CACHE_LINE" | awk '{print $3}')

# Function to convert size to GB
convert_to_gb() {
    local SIZE=$1
    local VALUE=$(echo "$SIZE" | sed 's/[^0-9.]//g')
    local UNIT=$(echo "$SIZE" | sed 's/[0-9.]//g' | tr '[:lower:]' '[:upper:]')

    case "$UNIT" in
        "TB")
            echo "$VALUE * 1024" | bc -l 2>/dev/null || echo "0"
            ;;
        "GB")
            echo "$VALUE"
            ;;
        "MB")
            echo "$VALUE / 1024" | bc -l 2>/dev/null || echo "0"
            ;;
        "KB"|"K")
            echo "$VALUE / 1024 / 1024" | bc -l 2>/dev/null || echo "0"
            ;;
        "B")
            echo "0"
            ;;
        *)
            echo "0"
            ;;
    esac
}

CACHE_SIZE_GB=$(convert_to_gb "$CACHE_SIZE_RAW")

# Round to integer for comparison
CACHE_SIZE_INT=$(printf "%.0f" "$CACHE_SIZE_GB" 2>/dev/null || echo "0")

# Also get disk space available
DISK_LINE=$(df -h /var/lib/docker 2>/dev/null | tail -1 || echo "- - - - - -")
DISK_AVAILABLE=$(echo "$DISK_LINE" | awk '{print $4}')
DISK_USED_PERCENT=$(echo "$DISK_LINE" | awk '{print $5}')

echo "Build cache size: ${CACHE_SIZE_RAW} (~${CACHE_SIZE_INT}GB)"
echo "Disk available: ${DISK_AVAILABLE}"
echo "Disk used: ${DISK_USED_PERCENT}"
echo ""

# Check thresholds
if [ "$CACHE_SIZE_INT" -ge "$CRITICAL_THRESHOLD_GB" ]; then
    echo -e "${RED}==========================================${NC}"
    echo -e "${RED}CRITICAL: Build cache is ${CACHE_SIZE_INT}GB${NC}"
    echo -e "${RED}Threshold: ${CRITICAL_THRESHOLD_GB}GB${NC}"
    echo -e "${RED}==========================================${NC}"
    echo ""
    echo -e "${RED}IMMEDIATE ACTION REQUIRED:${NC}"
    echo "  Run: ./scripts/docker-cleanup-full.sh"
    echo ""
    echo "After cleanup, compact WSL disk from PowerShell:"
    echo "  wsl --shutdown"
    echo "  Optimize-VHD -Path <path-to-ext4.vhdx> -Mode Full"
    exit 2
elif [ "$CACHE_SIZE_INT" -ge "$WARNING_THRESHOLD_GB" ]; then
    echo -e "${YELLOW}==========================================${NC}"
    echo -e "${YELLOW}WARNING: Build cache is ${CACHE_SIZE_INT}GB${NC}"
    echo -e "${YELLOW}Threshold: ${WARNING_THRESHOLD_GB}GB${NC}"
    echo -e "${YELLOW}==========================================${NC}"
    echo ""
    echo -e "${YELLOW}RECOMMENDED ACTION:${NC}"
    echo "  Run: ./scripts/docker-cleanup-quick.sh"
    exit 1
else
    echo -e "${GREEN}==========================================${NC}"
    echo -e "${GREEN}OK: Build cache is ${CACHE_SIZE_INT}GB${NC}"
    echo -e "${GREEN}Warning threshold: ${WARNING_THRESHOLD_GB}GB${NC}"
    echo -e "${GREEN}==========================================${NC}"
    exit 0
fi
