#!/bin/bash
set -euo pipefail

# =============================================================================
# docker-maintenance-cron.sh - Automated Docker maintenance for cron
# Usage: Run via cron, logs to /var/log/docker-maintenance.log
#
# ENVIRONMENT: Development Only (NOT for production)
# SCOPE: Affects all Docker resources on the host (shared across all projects)
#
# SETUP: Each agent project should run ./scripts/docker-maintenance-setup.sh
#        to configure cron. Only ONE cron entry is needed per host.
#
# Add to crontab (done automatically by setup script):
#   # Daily quick cleanup at 3 AM
#   0 3 * * * /path/to/scripts/docker-maintenance-cron.sh quick
#
#   # Weekly deep cleanup on Sunday at 4 AM
#   0 4 * * 0 /path/to/scripts/docker-maintenance-cron.sh deep
# =============================================================================

LOG_FILE="/var/log/docker-maintenance.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
MODE="${1:-quick}"

log() {
    echo "[$TIMESTAMP] $1" >> "$LOG_FILE"
}

log "=== Docker Maintenance Started (mode: $MODE) ==="

# Get current disk usage
BEFORE_CACHE=$(docker system df --format '{{.Type}}\t{{.Size}}' 2>/dev/null | grep "Build cache" | awk '{print $2}' || echo "unknown")
log "Build cache before: $BEFORE_CACHE"

case "$MODE" in
    quick)
        # Quick cleanup - only old cache
        log "Running quick cleanup (cache older than 48h)..."
        docker builder prune -f --filter "until=48h" >> "$LOG_FILE" 2>&1 || log "Builder prune failed"
        docker image prune -f >> "$LOG_FILE" 2>&1 || log "Image prune failed"
        docker volume prune -f >> "$LOG_FILE" 2>&1 || log "Volume prune failed"
        ;;
    deep)
        # Deep cleanup - aggressive
        log "Running deep cleanup (all unused cache and images)..."
        docker builder prune -af >> "$LOG_FILE" 2>&1 || log "Builder prune failed"
        docker image prune -af --filter "until=168h" >> "$LOG_FILE" 2>&1 || log "Image prune failed"
        docker volume prune -f >> "$LOG_FILE" 2>&1 || log "Volume prune failed"
        docker network prune -f >> "$LOG_FILE" 2>&1 || log "Network prune failed"
        ;;
    *)
        log "Unknown mode: $MODE (use 'quick' or 'deep')"
        exit 1
        ;;
esac

# Get new disk usage
AFTER_CACHE=$(docker system df --format '{{.Type}}\t{{.Size}}' 2>/dev/null | grep "Build cache" | awk '{print $2}' || echo "unknown")
log "Build cache after: $AFTER_CACHE"

log "=== Docker Maintenance Complete ==="
