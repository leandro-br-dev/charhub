#!/bin/bash
# Monitor Disk Space and Docker Resources
# Usage: ./monitor-disk-space.sh [--alert-threshold 80] [--cleanup-threshold 85]

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default thresholds
ALERT_THRESHOLD=${ALERT_THRESHOLD:-80}
CLEANUP_THRESHOLD=${CLEANUP_THRESHOLD:-85}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --alert-threshold)
      ALERT_THRESHOLD="$2"
      shift 2
      ;;
    --cleanup-threshold)
      CLEANUP_THRESHOLD="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}=== CharHub Disk Space Monitor ===${NC}\n"

# Function to check disk usage
check_disk_usage() {
  local usage=$(df -h /mnt/stateful_partition | awk 'NR==2 {print $5}' | sed 's/%//')
  local used=$(df -h /mnt/stateful_partition | awk 'NR==2 {print $3}')
  local avail=$(df -h /mnt/stateful_partition | awk 'NR==2 {print $4}')
  local total=$(df -h /mnt/stateful_partition | awk 'NR==2 {print $2}')

  echo -e "${BLUE}📊 Disk Usage:${NC}"
  echo "  Total: $total"
  echo "  Used: $used ($usage%)"
  echo "  Available: $avail"
  echo ""

  if [ "$usage" -ge "$CLEANUP_THRESHOLD" ]; then
    echo -e "${RED}🚨 CRITICAL: Disk usage at ${usage}%! Automatic cleanup recommended.${NC}"
    return 2
  elif [ "$usage" -ge "$ALERT_THRESHOLD" ]; then
    echo -e "${YELLOW}⚠️  WARNING: Disk usage at ${usage}%! Consider cleanup.${NC}"
    return 1
  else
    echo -e "${GREEN}✅ Disk usage healthy at ${usage}%.${NC}"
    return 0
  fi
}

# Function to check Docker resources
check_docker_resources() {
  echo -e "${BLUE}🐋 Docker Resources:${NC}"

  # Get Docker disk usage - simpler approach
  sudo docker system df | tail -n +2 | while read -r type total active size reclaimable rest; do
    echo "  $type: $size total, $reclaimable reclaimable"
  done

  echo ""

  # Check if there's significant reclaimable space (>= 1GB in any category)
  # Look specifically at the RECLAIMABLE column (5th field)
  local has_significant_reclaimable=0

  while read -r line; do
    # Get the 5th column (RECLAIMABLE) which has format like "53.75MB (3%)" or "5.77GB (79%)"
    reclaimable=$(echo "$line" | awk '{print $5}')

    # Check if it contains GB and extract the number
    if [[ "$reclaimable" == *"GB"* ]]; then
      # Extract number before GB
      size=$(echo "$reclaimable" | sed 's/GB.*//' | sed 's/[^0-9.]//g')

      # Check if >= 1.0 GB (using awk for float comparison)
      if awk -v size="$size" 'BEGIN { exit (size >= 1.0) ? 0 : 1 }'; then
        has_significant_reclaimable=1
        break
      fi
    fi
  done < <(sudo docker system df | tail -n +2)

  if [ $has_significant_reclaimable -eq 1 ]; then
    echo -e "${YELLOW}💡 Significant Docker resources can be reclaimed.${NC}"
    return 1
  else
    echo -e "${GREEN}✅ Docker resources optimized.${NC}"
    return 0
  fi
}

# Function to check system logs
check_system_logs() {
  echo -e "${BLUE}📝 System Logs:${NC}"

  local journal_size=$(sudo du -sh /var/log/journal 2>/dev/null | awk '{print $1}')

  if [ -n "$journal_size" ]; then
    echo "  Journal logs: $journal_size"

    # Check if journal is over 1GB
    if [[ "$journal_size" =~ G$ ]]; then
      local size_gb=$(echo "$journal_size" | grep -oP '\d+')
      if [ "$size_gb" -ge 1 ]; then
        echo -e "${YELLOW}💡 Journal logs over 1GB. Consider cleanup: sudo journalctl --vacuum-time=7d${NC}"
      fi
    fi
  fi

  echo ""
}

# Function to provide cleanup recommendations
provide_recommendations() {
  local disk_status=$1
  local docker_status=$2

  echo -e "${BLUE}📋 Recommendations:${NC}"

  if [ "$disk_status" -ge 1 ] || [ "$docker_status" -ge 1 ]; then
    echo ""
    echo "Run automatic cleanup:"
    echo -e "  ${GREEN}./scripts/ops/cleanup-docker.sh${NC}"
    echo ""
    echo "Or manual cleanup:"
    echo "  Docker: sudo docker system prune -af --volumes"
    echo "  Logs: sudo journalctl --vacuum-time=7d"
    echo ""
  else
    echo -e "  ${GREEN}No cleanup needed at this time.${NC}"
  fi
}

# Main execution
check_disk_usage
disk_exit_code=$?

check_docker_resources
docker_exit_code=$?

check_system_logs

provide_recommendations $disk_exit_code $docker_exit_code

# Return appropriate exit code
if [ "$disk_exit_code" -eq 2 ]; then
  exit 2  # Critical
elif [ "$disk_exit_code" -eq 1 ] || [ "$docker_exit_code" -eq 1 ]; then
  exit 1  # Warning
else
  exit 0  # OK
fi
