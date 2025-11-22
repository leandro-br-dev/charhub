#!/bin/bash
# ============================================
# CharHub Backup Systemd Timer Setup Script
# ============================================
# Configures automated daily backups on the production VM
# Uses systemd timer (works on Container-Optimized OS)
#
# Usage: sudo ./setup-backup-cron.sh
# ============================================

set -e

# Configuration
APP_DIR="/mnt/stateful_partition/charhub"
BACKUP_SCRIPT="${APP_DIR}/scripts/backup/backup-database.sh"
LOG_FILE="/var/log/charhub-backup.log"
SYSTEMD_DIR="/etc/systemd/system"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo "============================================"
echo "     CharHub Backup Timer Setup"
echo "============================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}[!] This script should be run with sudo${NC}"
    echo "    sudo $0"
    exit 1
fi

# Create log file if not exists
touch "$LOG_FILE"
chmod 644 "$LOG_FILE"
echo "[$(date)] Backup timer setup initialized" >> "$LOG_FILE"
echo -e "${GREEN}[OK]${NC} Log file created: $LOG_FILE"

# Make backup scripts executable
chmod +x "${APP_DIR}/scripts/backup/"*.sh 2>/dev/null || true
echo -e "${GREEN}[OK]${NC} Backup scripts made executable"

# Create backup directory
mkdir -p /mnt/stateful_partition/backups/db
echo -e "${GREEN}[OK]${NC} Backup directory created"

# Copy systemd files
echo -e "${CYAN}[*]${NC} Installing systemd timer..."

cp "${APP_DIR}/scripts/backup/charhub-backup.service" "$SYSTEMD_DIR/"
cp "${APP_DIR}/scripts/backup/charhub-backup.timer" "$SYSTEMD_DIR/"
echo -e "${GREEN}[OK]${NC} Systemd files copied"

# Reload systemd daemon
systemctl daemon-reload
echo -e "${GREEN}[OK]${NC} Systemd daemon reloaded"

# Enable and start the timer
systemctl enable charhub-backup.timer
systemctl start charhub-backup.timer
echo -e "${GREEN}[OK]${NC} Timer enabled and started"

# Verify timer status
echo ""
echo -e "${CYAN}Timer Status:${NC}"
systemctl status charhub-backup.timer --no-pager | head -10

echo ""
echo -e "${CYAN}Next scheduled run:${NC}"
systemctl list-timers charhub-backup.timer --no-pager

echo ""
echo "============================================"
echo -e "${GREEN}[OK] Backup automation configured!${NC}"
echo "============================================"
echo ""
echo "Schedule: Daily at 03:00 UTC"
echo "Log file: $LOG_FILE"
echo ""
echo "Commands:"
echo "  Manual backup:    sudo bash ${BACKUP_SCRIPT}"
echo "  View logs:        tail -f ${LOG_FILE}"
echo "  List backups:     ls -la /mnt/stateful_partition/backups/db/"
echo "  Timer status:     systemctl status charhub-backup.timer"
echo "  Run now:          sudo systemctl start charhub-backup.service"
echo ""
echo "To test the backup now:"
echo "  sudo systemctl start charhub-backup.service"
echo ""
