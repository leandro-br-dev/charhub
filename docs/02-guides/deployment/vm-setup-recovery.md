# VM Setup and Recovery Guide

**Last Updated**: 2025-12-02
**Status**: ✅ Production Ready
**Scope**: Complete VM setup and recovery procedures

---

## Quick Reference

### VM Information
- **Name**: charhub-vm
- **Zone**: us-central1-a
- **OS**: Container-Optimized OS
- **Docker Compose Path**: `/var/lib/toolbox/bin/docker-compose`
- **App Directory**: `/mnt/stateful_partition/charhub`
- **IP**: 34.66.66.202

### Critical Files & Directories

```
/mnt/stateful_partition/charhub/
├── .git/                          # Git repository
├── .env                           # Production environment variables
├── frontend/.env                  # Frontend environment variables
├── cloudflared/config/prod/       # Cloudflare tunnel credentials
│   ├── 64dc6dc0-b430-4d84-bc47-e2ac1838064f.json
│   ├── cert.pem
│   └── config.yml
├── docker-compose.yml             # Docker orchestration
├── backend/                       # Backend source
├── frontend/                      # Frontend source
└── nginx/                         # Nginx configuration
```

---

## Complete VM Setup (From Scratch)

If the VM needs to be completely recreated, follow these steps:

### Step 1: Create VM Instance

```bash
gcloud compute instances create charhub-vm \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=cos-stable \
  --image-project=cos-cloud \
  --enable-display-device \
  --metadata=enable-oslogin=TRUE
```

### Step 2: Configure SSH Access

```bash
# Add your public key via OS Login
gcloud compute os-login ssh-keys add \
  --key-file=~/.ssh/id_rsa.pub

# Verify access
gcloud compute ssh charhub-vm --zone=us-central1-a
```

### Step 3: Setup Application Directory

```bash
# SSH into VM
gcloud compute ssh charhub-vm --zone=us-central1-a

# Create app directory
sudo mkdir -p /mnt/stateful_partition/charhub
sudo chown -R leandro:leandro /mnt/stateful_partition/charhub

# Clone repository
cd /mnt/stateful_partition/charhub
git clone https://github.com/leandro-br-dev/charhub.git .
```

### Step 4: Sync Critical Files

Manually sync from local or secure backup:

```bash
# From local machine:
scp -r cloudflared/ leandro_br_dev_gmail_com@34.66.66.202:/mnt/stateful_partition/charhub/
scp .env leandro_br_dev_gmail_com@34.66.66.202:/mnt/stateful_partition/charhub/
scp frontend/.env leandro_br_dev_gmail_com@34.66.66.202:/mnt/stateful_partition/charhub/frontend/
```

### Step 5: Fix File Permissions

```bash
# SSH into VM
sudo chown -R leandro:leandro /mnt/stateful_partition/charhub
sudo chmod -R u+w /mnt/stateful_partition/charhub
```

### Step 6: Start Application

```bash
cd /mnt/stateful_partition/charhub
COMPOSE="/var/lib/toolbox/bin/docker-compose"

sudo $COMPOSE build --no-cache
sudo $COMPOSE up -d
sudo $COMPOSE ps
```

### Step 7: Verify Deployment

```bash
# Check containers
sudo $COMPOSE ps

# Check logs
sudo $COMPOSE logs -f backend

# Test endpoint
curl -I https://charhub.app
```

---

## VM Recovery Procedures

### Issue: File Permission Errors

**Symptom**: `Permission denied` on `.git`, `.env`, or other files

**Solution**:

```bash
APP_DIR="/mnt/stateful_partition/charhub"

# Fix ownership
sudo chown -R leandro_br_dev_gmail_com:leandro_br_dev_gmail_com "$APP_DIR"

# Fix permissions
sudo chmod -R u+w "$APP_DIR"

# Verify
ls -la "$APP_DIR"
```

### Issue: Git Commands Failing

**Symptom**: `fatal: detected dubious ownership` or `Permission denied`

**Solution**:

```bash
# Configure git to allow directory access
git config --global --add safe.directory "$APP_DIR"
git config --local --add safe.directory "$APP_DIR"

# Fix directory permissions
sudo chown -R leandro_br_dev_gmail_com:leandro_br_dev_gmail_com "$APP_DIR/.git"
sudo chmod -R u+w "$APP_DIR/.git"
```

### Issue: Container Conflicts

**Symptom**: `container name already in use by container`

**Solution**:

```bash
COMPOSE="/var/lib/toolbox/bin/docker-compose"
cd /mnt/stateful_partition/charhub

# Remove all containers (preserves database volumes)
sudo $COMPOSE down --remove-orphans

# Wait for cleanup
sleep 5

# Restart
sudo $COMPOSE up -d

# ⚠️ WARNING: Only use -v if you want to DELETE all data:
# sudo $COMPOSE down --remove-orphans -v  # DESTROYS DATABASE!
```

### Issue: Cloudflare Tunnel Not Connecting

**Symptom**: Cloudflared container restarting with missing credentials

**Solution**:

```bash
# Verify credentials exist
ls -la /mnt/stateful_partition/charhub/cloudflared/config/prod/

# Required files:
# - 64dc6dc0-b430-4d84-bc47-e2ac1838064f.json
# - cert.pem
# - config.yml

# If missing, restore from backup or manual sync

# Restart cloudflared
sudo $COMPOSE restart cloudflared

# Check logs
sudo $COMPOSE logs cloudflared --tail 20
```

### Issue: Database Connection Errors

**Symptom**: Backend unable to connect to PostgreSQL

**Solution**:

```bash
# Check PostgreSQL is running
sudo $COMPOSE ps postgres

# Check health
sudo $COMPOSE ps postgres --format='{{.Status}}'

# View logs
sudo $COMPOSE logs postgres --tail 20

# ⚠️ CRITICAL WARNING: This will DELETE ALL DATABASE DATA!
# Only use if database is corrupted and you have backups
# If needed, reset database (DESTROYS ALL DATA):
# sudo $COMPOSE down -v
# sudo $COMPOSE up -d postgres
```

---

## Backup and Recovery

### Create Manual Backup

```bash
APP_DIR="/mnt/stateful_partition/charhub"
BACKUP_DIR="$APP_DIR/backups"

# Create backup directory
sudo mkdir -p "$BACKUP_DIR"

# Backup critical files
sudo cp "$APP_DIR/.env" "$BACKUP_DIR/.env.backup"
sudo cp "$APP_DIR/frontend/.env" "$BACKUP_DIR/frontend.env.backup"

# Backup Cloudflare credentials
sudo cp -r "$APP_DIR/cloudflared/config/prod" "$BACKUP_DIR/cloudflared_config_backup"

# Backup database (if needed)
COMPOSE="/var/lib/toolbox/bin/docker-compose"
sudo $COMPOSE exec -T postgres pg_dump -U postgres charhub > "$BACKUP_DIR/db_backup_$(date +%Y%m%d_%H%M%S).sql"
```

### Restore from Backup

```bash
BACKUP_DIR="/mnt/stateful_partition/charhub/backups"
APP_DIR="/mnt/stateful_partition/charhub"

# Restore environment files
sudo cp "$BACKUP_DIR/.env.backup" "$APP_DIR/.env"
sudo cp "$BACKUP_DIR/frontend.env.backup" "$APP_DIR/frontend/.env"

# Restore Cloudflare config
sudo cp -r "$BACKUP_DIR/cloudflared_config_backup" "$APP_DIR/cloudflared/config/prod"

# Fix permissions
sudo chown -R leandro:leandro "$APP_DIR"
sudo chmod -R u+w "$APP_DIR"

# Restart services
COMPOSE="/var/lib/toolbox/bin/docker-compose"
sudo $COMPOSE restart
```

---

## User Management

### SSH User Configuration

**Primary SSH User**: `leandro_br_dev_gmail_com`

```bash
# Add public key to authorized_keys
gcloud compute os-login ssh-keys add \
  --key-file=~/.ssh/id_rsa.pub

# Verify key is added
gcloud compute os-login ssh-keys list

# Test SSH
ssh leandro_br_dev_gmail_com@34.66.66.202
```

### GitHub Actions SSH User

**User**: `leandro_br_dev_gmail_com`
**Key Storage**: GitHub Secrets (`GH_DEPLOY_SSH_PRIVATE_KEY`)

---

## Maintenance Tasks

### Weekly

- [ ] Check disk space: `df -h`
- [ ] Review container health: `docker-compose ps`
- [ ] Check logs for errors: `docker-compose logs --tail 100`

### Monthly

- [ ] Update OS: `sudo apt update && sudo apt upgrade`
- [ ] Backup database
- [ ] Review and clean old backups
- [ ] Check GitHub Actions status

### Quarterly

- [ ] Major version updates for containers
- [ ] Security patches review
- [ ] Disaster recovery drill

---

## Emergency Recovery

### Complete Data Loss - Last Resort

```bash
# 1. Backup current state (if possible)
cd /mnt/stateful_partition/charhub
COMPOSE="/var/lib/toolbox/bin/docker-compose"
sudo $COMPOSE down

# 2. Start fresh with latest code
sudo rm -rf /mnt/stateful_partition/charhub
git clone https://github.com/leandro-br-dev/charhub.git /mnt/stateful_partition/charhub

# 3. Restore from backup
scp -r backup-location/cloudflared/ leandro@34.66.66.202:/mnt/stateful_partition/charhub/
scp backup-location/.env leandro@34.66.66.202:/mnt/stateful_partition/charhub/
scp backup-location/frontend/.env leandro@34.66.66.202:/mnt/stateful_partition/charhub/frontend/

# 4. Fix permissions and start
sudo chown -R leandro:leandro /mnt/stateful_partition/charhub
sudo $COMPOSE build --no-cache
sudo $COMPOSE up -d
```

---

## Health Check Commands

```bash
# SSH into VM
gcloud compute ssh charhub-vm --zone=us-central1-a

# Check all containers
sudo /var/lib/toolbox/bin/docker-compose ps

# Check backend health
curl http://localhost:3000/api/v1/health

# Check website
curl -I https://charhub.app

# Monitor logs in real-time
sudo /var/lib/toolbox/bin/docker-compose logs -f

# Check disk usage
df -h /mnt/stateful_partition/

# Check system resources
free -h
top
```

---

## References

- Container-Optimized OS: https://cloud.google.com/container-optimized-os/docs
- Docker Compose: https://docs.docker.com/compose/
- GCP Compute Engine: https://cloud.google.com/compute/docs
