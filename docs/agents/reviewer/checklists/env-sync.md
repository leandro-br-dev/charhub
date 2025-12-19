# Environment Sync to Production Checklist

**When to use**: Before EVERY deploy to production (after env-validation.md)

**Duration**: ~2-3 minutes

**Critical Level**: 🔴 MANDATORY - Production won't have updated configuration without this

---

## Overview

This checklist ensures `.env.production` files (source of truth) are synchronized to the production server before deployment.

**Files synchronized**:
- `.env.production` → `/mnt/stateful_partition/charhub/.env`
- `frontend/.env.production` → `/mnt/stateful_partition/charhub/frontend/.env.production`

**⚠️ CRITICAL RULE**: NEVER edit `.env` files directly on production server. Always update `.env.production` locally and sync using the script.

**Script Location**: `scripts/ops/sync-production-env.sh`

---

## Step 1: Verify Local .env.production Files

Before syncing, ensure both local `.env.production` files have the latest configuration:

```bash
# Verify both files exist
ls -la .env.production
ls -la frontend/.env.production

# Check critical variables in root .env
grep -E "(NODE_ENV|DATABASE_URL|JWT_SECRET|COMFYUI_SERVICE_TOKEN)" .env.production

# Check frontend variables
grep -E "(VITE_API_BASE_URL|VITE_STRIPE_PUBLISHABLE_KEY)" frontend/.env.production
```

**Checklist:**
- [ ] `.env.production` file exists in project root
- [ ] `frontend/.env.production` file exists
- [ ] All critical variables have non-empty values
- [ ] No placeholder values like `your_*` or `changeme`
- [ ] Files contain production values (not development)

**If variables are missing or have placeholder values:**
→ Update `.env.production` files with correct production values
→ Commit changes if needed: `git add .env.production frontend/.env.production && git commit -m "config: update production environment"`

---

## Step 2: Preview Changes (Dry Run)

Always preview what will change before syncing:

```bash
# Run in dry-run mode to see what would happen
./scripts/ops/sync-production-env.sh --dry-run
```

**Expected Output:**
- Pre-flight checks pass
- Critical variables validated
- Diff shows changes (or "Files are identical")
- No actual changes made

**Checklist:**
- [ ] Script shows configuration summary
- [ ] Pre-flight checks pass ✅
- [ ] Critical variables all present ✅
- [ ] Diff output reviewed (if changes detected)
- [ ] Changes look correct (no accidental deletions)

**If unexpected changes appear:**
→ Review `.env.production` carefully
→ Compare with production .env: `gcloud compute ssh charhub-vm --zone=us-central1-a -- "sudo cat /mnt/stateful_partition/charhub/.env"`
→ Confirm changes are intentional before proceeding

---

## Step 3: Verify Changes Only (Optional)

If you just want to check differences without making changes:

```bash
# Verify-only mode: shows diff and stops
./scripts/ops/sync-production-env.sh --verify
```

**This is useful when:**
- You want to confirm production is already up-to-date
- You're investigating configuration drift
- You're auditing what's different between local and remote

**Checklist:**
- [ ] Diff shows expected differences (or no differences)
- [ ] No critical variables are missing
- [ ] Production values match expectations

---

## Step 4: Sync to Production

Execute the sync (with confirmation prompt):

```bash
# Run sync with confirmation
./scripts/ops/sync-production-env.sh
```

**The script will:**
1. Verify local file exists
2. Validate critical variables
3. Show diff between local and remote
4. **Ask for confirmation** (type `yes`)
5. Create timestamped backup on production server
6. Copy `.env.production` to server as `.env`
7. Verify sync with MD5 checksum

**Checklist:**
- [ ] Review the diff output carefully
- [ ] Confirm you want to proceed (type `yes`)
- [ ] Backup created successfully ✅
- [ ] File synced successfully ✅
- [ ] Verification passed (MD5 hashes match) ✅

**Skip confirmation with --force:**
```bash
# Only use in CI/CD or when you're certain
./scripts/ops/sync-production-env.sh --force
```

---

## Step 5: Restart Services (If Needed)

If you changed environment variables that affect running services:

```bash
# SSH to production
gcloud compute ssh charhub-vm --zone=us-central1-a

# Navigate to project
cd /mnt/stateful_partition/charhub

# Restart backend to load new variables
docker compose restart backend

# Verify services are healthy
docker compose ps
```

**⚠️ When to restart:**
- You changed backend configuration (DATABASE_URL, JWT_SECRET, API keys, etc.)
- You added new environment variables
- Services need to reload configuration

**When NOT to restart:**
- Files are identical (no changes)
- Changes are frontend-only
- You're about to deploy anyway (deploy will restart services)

**Checklist:**
- [ ] Backend container restarted (if needed)
- [ ] All containers show "healthy" status
- [ ] No errors in logs: `docker compose logs backend --tail=50`
- [ ] Health check passes: `curl https://charhub.app/api/v1/health`

---

## Step 6: Document Changes (If Significant)

If you made significant environment changes:

```bash
# Create incident report or note
cat > docs/06-operations/config-changes/$(date +%Y-%m-%d)-env-update.md << 'EOF'
# Environment Update - $(date +%Y-%m-%d)

## Changes Made
- Variable X updated from A to B
- New variable Y added for feature Z

## Reason
Brief explanation of why this change was needed

## Impact
Services affected: backend, frontend, etc.
Restart required: yes/no

## Verified
- [ ] Sync successful
- [ ] Services restarted
- [ ] Production health check passed
EOF
```

**Checklist:**
- [ ] Significant changes documented
- [ ] Reason for change explained
- [ ] Impact assessed

---

## Common Issues

### Issue: Script shows "Files are identical"

```
✅ Files are identical - no changes needed
✅ No sync needed - files are already identical
```

**This is GOOD!** It means production is already up-to-date.

→ No action needed, proceed with deployment

---

### Issue: Critical variable missing

```
❌ ERROR: Missing critical variables:
   - COMFYUI_SERVICE_TOKEN
```

**Fix:**
1. Add the missing variable to `.env.production`
2. Run `./scripts/ops/sync-production-env.sh --dry-run` to verify
3. Sync again

---

### Issue: MD5 verification failed

```
❌ Verification failed - files do not match
   Local MD5:  abc123...
   Remote MD5: def456...
```

**Possible causes:**
- Network error during transfer
- File was modified during sync
- Permission issues

**Fix:**
1. Run sync again: `./scripts/ops/sync-production-env.sh --force`
2. If still fails, manually verify: `gcloud compute ssh charhub-vm --zone=us-central1-a -- "sudo cat /mnt/stateful_partition/charhub/.env | head -20"`
3. Check file permissions

---

### Issue: Permission denied

```
ERROR: Permission denied (publickey)
```

**Fix:**
1. Verify gcloud authentication: `gcloud auth list`
2. Check compute zone is correct: `us-central1-a`
3. Verify VM name: `charhub-vm`
4. Re-authenticate if needed: `gcloud auth login`

---

### Issue: Backup creation failed

```
⚠️  Warning: Could not create backup (file may not exist)
```

**This can happen on first sync or if .env doesn't exist yet.**

→ Safe to continue, but verify file exists after sync:
```bash
gcloud compute ssh charhub-vm --zone=us-central1-a -- "ls -la /mnt/stateful_partition/charhub/.env"
```

---

## Script Options Reference

```bash
# Show help
./scripts/ops/sync-production-env.sh --help

# Dry run (preview only, no changes)
./scripts/ops/sync-production-env.sh --dry-run

# Verify only (show diff and stop)
./scripts/ops/sync-production-env.sh --verify

# Skip confirmation prompt
./scripts/ops/sync-production-env.sh --force

# Combine options
./scripts/ops/sync-production-env.sh --dry-run --force
```

---

## Source of Truth Principle

**GOLDEN RULE**: `.env.production` files in the repository are the source of truth.

**✅ DO:**
- Edit `.env.production` and `frontend/.env.production` locally
- Commit changes to git
- Sync to production using the script
- Document significant changes

**❌ DON'T:**
- Edit `.env` files directly on production server via SSH
- Make temporary changes in production
- Keep production-only secrets outside version control (use secret manager instead)
- Skip syncing before deployment

---

## Rollback Procedure

If you synced wrong configuration and need to rollback:

```bash
# SSH to production
gcloud compute ssh charhub-vm --zone=us-central1-a

# Navigate to project
cd /mnt/stateful_partition/charhub

# List backups
ls -la .env.backup.*

# Restore from backup (use most recent or specific timestamp)
sudo cp .env.backup.20251219_200337 .env

# Restart services
docker compose restart backend

# Verify
docker compose ps
docker compose logs backend --tail=50
```

**Checklist:**
- [ ] Backup file identified
- [ ] Backup restored as `.env`
- [ ] Services restarted
- [ ] Production health verified

---

## Integration with Deployment Workflow

This checklist is part of the pre-deployment workflow:

```
1. env-validation.md  ← Validate .env.production locally
2. env-sync.md        ← THIS CHECKLIST - Sync to production
3. pre-deploy.md      ← Other pre-deployment checks
4. [DEPLOY]           ← git push origin main
5. deploy-monitoring.md
6. post-deploy.md
```

**Always execute in this order before deployment!**

---

## See Also

- `env-validation.md` - Validate environment variables before sync
- `pre-deploy.md` - Full pre-deployment checklist
- `../../02-guides/deployment/cd-deploy-guide.md` - Deployment guide
- `../../02-guides/deployment/vm-setup-recovery.md` - Server access guide
- `../../03-reference/backend/environment-variables.md` - Variable documentation

---

## Quick Command Summary

```bash
# Most common workflow:

# 1. Validate local .env.production files
grep -E "(NODE_ENV|DATABASE_URL|JWT_SECRET|COMFYUI_SERVICE_TOKEN)" .env.production
grep -E "(VITE_STRIPE_PUBLISHABLE_KEY)" frontend/.env.production

# 2. Preview changes
./scripts/ops/sync-production-env.sh --dry-run

# 3. Sync to production (both files)
./scripts/ops/sync-production-env.sh

# 4. Restart services (if needed)
gcloud compute ssh charhub-vm --zone=us-central1-a
cd /mnt/stateful_partition/charhub
docker compose restart backend frontend
docker compose ps
exit

# 5. Verify production health
curl https://charhub.app/api/v1/health
```

---

**Remember**: `.env.production` files are your source of truth. Always sync both files before deploying! 🔒
