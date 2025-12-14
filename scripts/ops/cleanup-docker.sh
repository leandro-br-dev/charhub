#!/bin/bash
# Automated Docker Cleanup Script
# Safely removes unused Docker resources while preserving running containers and named volumes
# Usage: ./cleanup-docker.sh [--dry-run] [--aggressive]

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DRY_RUN=0
AGGRESSIVE=0

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --aggressive)
      AGGRESSIVE=1
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--dry-run] [--aggressive]"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}=== CharHub Docker Cleanup ===${NC}\n"

if [ $DRY_RUN -eq 1 ]; then
  echo -e "${YELLOW}🔍 DRY RUN MODE - No changes will be made${NC}\n"
fi

# Function to show disk usage before cleanup
show_before_stats() {
  echo -e "${BLUE}📊 Docker Resources (Before Cleanup):${NC}"
  sudo docker system df
  echo ""
}

# Function to perform cleanup
perform_cleanup() {
  if [ $DRY_RUN -eq 1 ]; then
    echo -e "${YELLOW}Would run the following cleanup commands:${NC}"

    if [ $AGGRESSIVE -eq 1 ]; then
      echo "  sudo docker system prune -af --volumes"
    else
      echo "  sudo docker system prune -af"
      echo "  sudo docker volume prune -f (only dangling volumes)"
    fi
    echo ""
    return 0
  fi

  echo -e "${BLUE}🧹 Performing cleanup...${NC}\n"

  if [ $AGGRESSIVE -eq 1 ]; then
    echo -e "${YELLOW}⚠️  AGGRESSIVE MODE: Removing all unused resources including volumes${NC}"
    echo "Starting in 3 seconds... (Ctrl+C to cancel)"
    sleep 3

    # Remove all unused resources including volumes
    sudo docker system prune -af --volumes
  else
    echo -e "${GREEN}Standard cleanup: Removing unused images and build cache${NC}"

    # Remove unused images and build cache
    sudo docker system prune -af

    # Only remove truly dangling volumes (not attached to any container)
    echo ""
    echo -e "${BLUE}Checking for dangling volumes...${NC}"
    local dangling_volumes=$(sudo docker volume ls -qf dangling=true)

    if [ -n "$dangling_volumes" ]; then
      echo -e "${YELLOW}Found dangling volumes. Removing...${NC}"
      sudo docker volume prune -f
    else
      echo -e "${GREEN}No dangling volumes found.${NC}"
    fi
  fi

  echo ""
}

# Function to show disk usage after cleanup
show_after_stats() {
  if [ $DRY_RUN -eq 1 ]; then
    return 0
  fi

  echo -e "${BLUE}📊 Docker Resources (After Cleanup):${NC}"
  sudo docker system df
  echo ""
}

# Function to show space reclaimed
show_space_reclaimed() {
  if [ $DRY_RUN -eq 1 ]; then
    return 0
  fi

  echo -e "${GREEN}✅ Cleanup completed successfully!${NC}\n"

  # Show overall disk usage
  local usage=$(df -h /mnt/stateful_partition | awk 'NR==2 {print $5}' | sed 's/%//')
  local used=$(df -h /mnt/stateful_partition | awk 'NR==2 {print $3}')
  local avail=$(df -h /mnt/stateful_partition | awk 'NR==2 {print $4}')

  echo -e "${BLUE}💾 Overall Disk Usage:${NC}"
  echo "  Used: $used ($usage%)"
  echo "  Available: $avail"
  echo ""

  if [ "$usage" -lt 70 ]; then
    echo -e "${GREEN}✅ Disk usage healthy at ${usage}%.${NC}"
  elif [ "$usage" -lt 85 ]; then
    echo -e "${YELLOW}⚠️  Disk usage at ${usage}%. Monitor closely.${NC}"
  else
    echo -e "${RED}🚨 Disk usage still high at ${usage}%! Consider additional cleanup.${NC}"
  fi
}

# Function to verify running containers
verify_containers() {
  echo -e "${BLUE}🔍 Verifying running containers...${NC}"
  local running_count=$(sudo docker ps -q | wc -l)

  if [ $DRY_RUN -eq 0 ]; then
    if [ "$running_count" -eq 0 ]; then
      echo -e "${RED}⚠️  WARNING: No containers are running! This may indicate a problem.${NC}"
      return 1
    else
      echo -e "${GREEN}✅ $running_count container(s) running.${NC}"
    fi
  fi

  echo ""
  return 0
}

# Main execution
show_before_stats
perform_cleanup
show_after_stats
verify_containers
show_space_reclaimed

# Provide recommendations
echo -e "${BLUE}💡 Recommendations:${NC}"
echo "  - Run this script weekly or when disk usage > 80%"
echo "  - Monitor disk space: ./scripts/ops/monitor-disk-space.sh"
echo "  - Use --dry-run to preview changes before applying"
echo "  - Use --aggressive only if standard cleanup is insufficient"
echo ""
