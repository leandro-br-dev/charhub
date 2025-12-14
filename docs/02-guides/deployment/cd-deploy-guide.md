# Continuous Deployment (CD) Guide

**Last Updated**: 2025-12-05
**Status**: ✅ Production Ready (All Issues Resolved)
**Workflow**: `.github/workflows/deploy-production.yml`

---

## Overview

The CD pipeline automatically deploys to production when code is pushed to the `main` branch. The workflow:

1. Validates branch is `main`
2. Authenticates with GCP
3. Connects to production VM via SSH
4. Pulls latest code from GitHub
5. Rebuilds Docker containers
6. Validates health checks
7. Verifies deployment

---

## Deployment Flow

```
Developer Push to main
    ↓
GitHub Actions Triggered
    ↓
Pre-Deploy Checks (✅ main branch verified)
    ↓
GCP Authentication (✅ Service account)
    ↓
SSH Setup (✅ Static SSH key)
    ↓
Code Pull (✅ git fetch + reset)
    ↓
Cloudflare Credentials Sync (✅ Ensure tunnel configs present)
    ↓
Container Rebuild (✅ docker-compose build)
    ↓
Health Check (✅ Backend validation)
    ↓
Deployment Verification (✅ Container status + git log)
    ↓
Cleanup & Notify (✅ SSH key removed)
    ↓
🚀 Production Updated
```

---

## Workflow Steps Explained

### 1. Pre-Deploy Checks
- **Purpose**: Verify push is from `main` branch only
- **Output**: Lists commits being deployed
- **Failure**: Blocks if not from main

### 2. GCP Authentication
- **Method**: Workload Identity Federation
- **Service Account**: `github-deployer@charhub-prod.iam.gserviceaccount.com`
- **Secret**: `GCP_SERVICE_ACCOUNT_KEY_PROD`

### 3. SSH Setup
- **Key Type**: RSA 4096-bit (static)
- **Secret**: `GH_DEPLOY_SSH_PRIVATE_KEY`
- **User**: `leandro_br_dev_gmail_com@34.66.66.202`
- **Pre-population**: Uses `ssh-keyscan` for known_hosts

### 4. Code Pull Latest

**Key Operations**:
```bash
# Fix all file permissions (from previous sudo operations)
sudo chown -R leandro_br_dev_gmail_com:leandro_br_dev_gmail_com "$APP_DIR"
sudo chmod -R u+w "$APP_DIR"

# Configure git for repository access
git config --global --add safe.directory "$APP_DIR"
git config --local --add safe.directory "$APP_DIR"

# Fetch and update code
git fetch origin
git reset --hard origin/main
```

**Why This Matters**:
- Permission fixes prevent `unable to unlink` and `index.lock` errors
- Git config prevents `dubious ownership` errors
- Hard reset ensures exact code match with GitHub

### 5. Cloudflare Credentials Sync

**Operations**:
```bash
# Ensure credential directory exists
sudo mkdir -p "$APP_DIR/cloudflared/config/prod"
sudo chmod 755 "$APP_DIR/cloudflared/config/prod"
```

**Required Files** (must exist on VM or in deployment):
- `64dc6dc0-b430-4d84-bc47-e2ac1838064f.json` (tunnel credentials)
- `cert.pem` (Cloudflare origin certificate)
- `config.yml` (tunnel configuration)

**Note**: Currently synced manually; future improvement: store in GitHub Secrets

### 6. Container Rebuild

**Operations**:
```bash
# Set HOME environment variable (Container-Optimized OS best practice)
export HOME="/home/leandro_br_dev_gmail_com"

# Complete cleanup of old containers
# IMPORTANT: DO NOT use -v flag to preserve database volumes (postgres_data, redis_data)
sudo -E HOME="$HOME" docker-compose down --remove-orphans

# Wait for cleanup to complete
sleep 5

# Build images (using cache for efficiency)
sudo -E HOME="$HOME" docker-compose build --pull

# Start all containers
sudo -E HOME="$HOME" docker-compose up -d

# Wait for services to stabilize
sleep 15
```

**Key Flags Explained**:
- `--remove-orphans`: Removes containers not in compose file
- `-v`: Removes unnamed volumes (prevents data conflicts)
- `--pull`: Pulls fresh base images without invalidating entire cache
- `-E`: Preserves environment variables (HOME) when using sudo
- `HOME="/home/leandro_br_dev_gmail_com"`: Writable directory for Docker config

**Why HOME Configuration Matters (Container-Optimized OS)**:
- Container-Optimized OS mounts `/` as read-only for security
- Docker tries to create `/root/.docker/` which fails
- Setting `HOME=/home/[user]/` points to writable partition
- Prevents `mkdir: read-only file system` errors during build

### 7. Health Check

**Validation Strategy**:
```bash
# Check container status (not external HTTPS)
STATUS=$(sudo docker-compose ps backend --format='{{.Status}}')

# Passes if:
# - Status contains "healthy" (definitive)
# - Status contains "Up" and attempt > 5 (giving health check time)

# Retries: 30 attempts with 5-second intervals (2.5 minutes total)
```

**Why Container Status Over External Check**:
- Independent of Cloudflare tunnel status
- Direct validation of backend readiness
- Faster feedback (no external latency)

### 8. Deployment Verification

**Operations**:
```bash
# Fix permissions for verification step
sudo chown -R leandro_br_dev_gmail_com:leandro_br_dev_gmail_com .
sudo chmod -R u+w .

# Configure git for safety
git config --global --add safe.directory "$(pwd)"
git config --local --add safe.directory "$(pwd)"

# Display status
docker-compose ps
git log -1 --oneline  # Shows deployed commit
```

---

## GitHub Secrets Required

**Two secrets must be configured in GitHub repository**:

| Secret | Value | Type |
|--------|-------|------|
| `GCP_SERVICE_ACCOUNT_KEY_PROD` | GCP service account JSON key | JSON |
| `GH_DEPLOY_SSH_PRIVATE_KEY` | RSA private key for VM access | PEM |

### How to Add Secrets

1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `GCP_SERVICE_ACCOUNT_KEY_PROD`
4. Value: (paste GCP JSON key content)
5. Click "Add secret"
6. Repeat for `GH_DEPLOY_SSH_PRIVATE_KEY`

---

## Common Issues and Solutions

### Issue: "Permission denied" on git commands

**Symptom**:
```
error: unable to unlink old '.github/workflows/deploy-production.yml': Permission denied
fatal: Unable to create '/mnt/stateful_partition/charhub/.git/index.lock': Permission denied
```

**Cause**: Files have restrictive permissions from previous sudo operations

**Solution**: Already handled in workflow with:
```bash
sudo chown -R leandro_br_dev_gmail_com:leandro_br_dev_gmail_com "$APP_DIR"
sudo chmod -R u+w "$APP_DIR"
```

**Manual Fix** (if workflow fails):
```bash
ssh leandro_br_dev_gmail_com@34.66.66.202
APP_DIR="/mnt/stateful_partition/charhub"
sudo chown -R leandro_br_dev_gmail_com:leandro_br_dev_gmail_com "$APP_DIR"
sudo chmod -R u+w "$APP_DIR"
```

### Issue: "container name already in use"

**Symptom**:
```
Error response from daemon: Conflict. The container name "/charhub-backend-1" already in use
```

**Cause**: Previous containers not fully removed

**Solution**: Already handled with `docker-compose down --remove-orphans`

**Manual Fix**:
```bash
ssh leandro_br_dev_gmail_com@34.66.66.202
COMPOSE="/var/lib/toolbox/bin/docker-compose"
cd /mnt/stateful_partition/charhub
# Remove containers but PRESERVE database volumes
sudo $COMPOSE down --remove-orphans
sleep 5
sudo $COMPOSE up -d

# ⚠️ ONLY use -v flag if you intentionally want to DELETE all data:
# sudo $COMPOSE down --remove-orphans -v  # DESTROYS DATABASE!
```

### Issue: "Cloudflare tunnel not connecting"

**Symptom**: Cloudflared container restarting, site not accessible

**Cause**: Missing credential files on VM

**Solution**: Ensure credentials exist at:
- `/mnt/stateful_partition/charhub/cloudflared/config/prod/64dc6dc0-b430-4d84-bc47-e2ac1838064f.json`
- `/mnt/stateful_partition/charhub/cloudflared/config/prod/cert.pem`
- `/mnt/stateful_partition/charhub/cloudflared/config/prod/config.yml`

**Manual Sync**:
```bash
# From local machine with credentials
scp -r cloudflared/config/prod/* \
  leandro_br_dev_gmail_com@34.66.66.202:/mnt/stateful_partition/charhub/cloudflared/config/prod/

# Restart
ssh leandro_br_dev_gmail_com@34.66.66.202
COMPOSE="/var/lib/toolbox/bin/docker-compose"
cd /mnt/stateful_partition/charhub
sudo $COMPOSE restart cloudflared
```

### Issue: "fatal: detected dubious ownership"

**Symptom**: Git commands fail with ownership error

**Cause**: Repository owned by different user or with wrong permissions

**Solution**: Already handled in workflow:
```bash
git config --global --add safe.directory "$APP_DIR"
git config --local --add safe.directory "$APP_DIR"
sudo chown -R leandro_br_dev_gmail_com:leandro_br_dev_gmail_com "$APP_DIR/.git"
sudo chmod -R u+w "$APP_DIR/.git"
```

###Issue: "client_loop: send disconnect: Broken pipe"

**Symptom**: SSH connection drops during long-running operations (e.g., `docker-compose build`)

**Cause**:
- GitHub Actions SSH has ~10 minute idle timeout
- Long builds (especially with `--no-cache`) exceed this timeout
- No keepalive packets sent during build process

**Solution**: Add SSH keepalive configuration:
```yaml
ssh -o ServerAliveInterval=60 \
    -o ServerAliveCountMax=10 \
    -i $HOME/.ssh/deploy_key \
    user@host 'bash -s' << 'SCRIPT'
# Long-running commands here
SCRIPT
```

**Configuration Explained**:
- `ServerAliveInterval=60`: Send keepalive packet every 60 seconds
- `ServerAliveCountMax=10`: Allow up to 10 minutes (10 × 60s) without response
- Together: Prevents timeout for operations up to 10 minutes

**Performance Impact**:
- Before fix: ~10 minute builds with `--no-cache` → SSH timeout
- After fix: ~2-3 minute builds with `--pull` + SSH keepalive → No timeout
- Use `--pull` instead of `--no-cache` for normal deploys (cache reuse)
- Reserve `--no-cache` for manual troubleshooting via SSH

**Resolution Timeline**:
- Issue: Commit 4f7560f identified SSH timeout on rebuild step
- Fix: Added `ServerAliveInterval` and replaced `--no-cache` with `--pull`
- Result: Deploy time reduced from 10+ minutes → 4-5 minutes total

---

## Performance Metrics

| Step | Typical Duration | Notes |
|------|-----------------|-------|
| Pre-Deploy Checks | ~10s | Quick validation |
| Auth + Setup | ~5s | GCP auth |
| SSH + Code Pull | ~20s | Git fetch + reset |
| Container Build | ~2-3 min | Depends on changes |
| Health Check | ~30-90s | Up to 30 retries |
| Verification | ~10s | Status check |
| **Total** | **~4-5 min** | End-to-end |

---

## Monitoring Deployment

### During Deployment

Watch GitHub Actions logs:
1. Go to repository → Actions
2. Click latest workflow run
3. Expand each step to see output

### After Deployment

Verify production health:

```bash
# Check if site is up
curl -I https://charhub.app

# SSH to VM and check containers
gcloud compute ssh charhub-vm --zone=us-central1-a
sudo /var/lib/toolbox/bin/docker-compose ps

# View logs
sudo /var/lib/toolbox/bin/docker-compose logs -f backend
```

### Check Specific Deployment

```bash
# See deployed commit
git log --oneline -5

# Check Cloudflare tunnel
sudo /var/lib/toolbox/bin/docker-compose logs cloudflared --tail 10
```

---

## Rollback Procedures

### Automatic Rollback (Future Enhancement)

Currently, health checks validate deployment but don't auto-rollback. If deployment fails:

### Manual Rollback

```bash
# SSH to VM
gcloud compute ssh charhub-vm --zone=us-central1-a

APP_DIR="/mnt/stateful_partition/charhub"
COMPOSE="/var/lib/toolbox/bin/docker-compose"
cd "$APP_DIR"

# Option 1: Revert to previous commit
git revert HEAD
$COMPOSE build --no-cache
$COMPOSE up -d

# Option 2: Force specific commit
git checkout <commit-hash>
$COMPOSE build --no-cache
$COMPOSE up -d

# Verify
$COMPOSE ps
curl -I https://charhub.app
```

---

## Future Improvements

### 1. Auto-Sync Cloudflare Credentials

Store credentials in GitHub Secrets and auto-sync:

```yaml
- name: Sync Cloudflare Credentials
  run: |
    echo "${{ secrets.GH_DEPLOY_CLOUDFLARE_JSON }}" | \
      sudo tee .../64dc6dc0-b430-4d84-bc47-e2ac1838064f.json
    echo "${{ secrets.GH_DEPLOY_CLOUDFLARE_CERT }}" | \
      sudo tee .../cert.pem
```

### 2. Slack Notifications

Notify Slack on deployment success/failure:

```yaml
- name: Notify Slack
  if: always()
  uses: slackapi/slack-github-action@v1.24.0
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
```

### 3. Staging Environment

Deploy to staging first, then manual approval for production

### 4. Database Migrations

Auto-run Prisma migrations during deployment

### 5. Performance Monitoring

Track deployment frequency, duration, and success rate

---

## Reference Commands

### Check Deployment Status

```bash
# View workflow runs
gh run list --repo leandro-br-dev/charhub

# Get latest run details
gh run view --repo leandro-br-dev/charhub
```

### View Live Logs (from local machine)

```bash
gcloud compute ssh charhub-vm --zone=us-central1-a
COMPOSE="/var/lib/toolbox/bin/docker-compose"
cd /mnt/stateful_partition/charhub

# Real-time logs
sudo $COMPOSE logs -f

# Backend only
sudo $COMPOSE logs -f backend

# Specific number of lines
sudo $COMPOSE logs --tail 50 backend
```

---

## Key Learnings

### 1. Permission Management

The first critical lesson during CD implementation was **permission management**:

- Containers run as different users (root from docker, nodejs, postgres, etc.)
- Files created by sudo are owned by root, not accessible by deploy user
- Git is strict about directory ownership (security feature)
- Solution: Always reset permissions before git operations

```bash
# This is now standard practice in CD workflow:
sudo chown -R <user>:<group> <directory>
sudo chmod -R u+w <directory>
```

### 2. Container-Optimized OS Read-Only Filesystem

Google's Container-Optimized OS enforces **read-only root filesystem** for security:

**The Problem**:
- `/` is mounted read-only: `/dev/mapper/vroot on / type ext2 (ro,relatime)`
- Docker tries to create `/root/.docker/` during build
- Error: `mkdir /root/.docker: read-only file system`

**The Solution**:
```bash
# Set HOME to writable user directory
export HOME="/home/leandro_br_dev_gmail_com"

# Preserve HOME when using sudo
sudo -E HOME="$HOME" docker-compose build
```

**Why This Works**:
- `/home/[user]/` is on writable partition
- Docker creates config in `$HOME/.docker/` which now works
- `-E` flag preserves environment variables through sudo

**Official Documentation**:
- [Container-Optimized OS Overview](https://cloud.google.com/container-optimized-os/docs/concepts/features-and-benefits)
- Best practice: Always set HOME to user's home directory

### 3. SSH Timeout Prevention

Long-running operations over SSH require **keepalive configuration**:

**The Problem**:
- GitHub Actions SSH times out after ~10 minutes of idle
- Docker builds can take longer than 10 minutes with `--no-cache`
- Connection drops mid-build: `client_loop: send disconnect: Broken pipe`

**The Solution**:
```yaml
ssh -o ServerAliveInterval=60 \
    -o ServerAliveCountMax=10 \
    -i $HOME/.ssh/deploy_key \
    user@host 'commands'
```

**Why This Works**:
- Sends keepalive packet every 60 seconds
- Allows up to 10 minutes of unresponsiveness
- Prevents idle timeout during long builds

**Performance Optimization**:
- Replace `--no-cache` with `--pull` for faster builds
- `--pull` updates base images but reuses cached layers
- Build time: 10+ minutes → 2-3 minutes

###4. Frontend TypeScript Type Synchronization

Frontend types must **exactly match backend Prisma schema**:

**The Problem**:
- Development Dockerfile doesn't run TypeScript compilation
- Production Dockerfile runs `tsc -b && vite build`
- Type mismatches only caught during production builds

**The Solution**:
```typescript
// Frontend types must match Prisma schema exactly
export interface ParticipantCharacter {
  id: string;
  firstName: string;
  lastName: string | null;
  avatar: string | null;
  gender: string | null;
  images?: CharacterImage[]; // Add missing fields from schema
}
```

**Best Practice**:
- Run `npm run build` locally before pushing
- Test both development and production Docker stages
- Keep frontend types synchronized with Prisma schema changes

---

## See Also

- [VM Setup and Recovery](./VM_SETUP_AND_RECOVERY.md) - Complete VM setup procedures
- [CD Status](./CD_STATUS.md) - Current deployment status and history
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Docker Compose Docs](https://docs.docker.com/compose/)
