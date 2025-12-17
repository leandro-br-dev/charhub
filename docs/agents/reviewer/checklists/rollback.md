# Emergency Rollback Checklist

**When to use**: When deployment fails or introduces critical bugs

**Duration**: ~5-10 minutes

**Critical Level**: 🔴 EMERGENCY - Execute immediately when needed

---

## ⚠️ WHEN TO ROLLBACK

**Execute this checklist immediately if:**

### During Deployment
- [ ] GitHub Actions workflow fails on critical step
- [ ] Container build fails
- [ ] Health check fails
- [ ] Deployment verification fails

### After Deployment
- [ ] Production health endpoint returns errors
- [ ] Frontend shows blank screen or critical errors
- [ ] Backend logs show repeated crashes
- [ ] Database corruption detected
- [ ] Critical feature completely broken
- [ ] User reports of widespread issues

### Do NOT Rollback For
- Minor UI bugs (can hotfix)
- Non-critical feature issues (can hotfix)
- Performance issues (can optimize later)
- Single user reports (investigate first)

---

## 🚨 EMERGENCY ROLLBACK PROCEDURE

### Step 1: STOP - Assess Situation

**Take 30 seconds to assess:**

**Checklist:**
- [ ] What exactly is broken?
- [ ] Is production completely down or partially working?
- [ ] Are users currently affected?
- [ ] Can this be hotfixed in <10 minutes?

**If you can hotfix quickly:**
→ Consider hotfix instead of rollback
→ Only if fix is obvious and simple

**If unsure or complex issue:**
→ ROLLBACK FIRST
→ Investigate and fix later
→ **Stability > Speed**

---

### Step 2: Git Revert (Fastest Method)

**⚠️ RECOMMENDED: Use git revert, NOT git reset**

```bash
# Ensure you're on main branch
git checkout main
git pull origin main

# Revert the last commit (the bad deploy)
git revert HEAD --no-edit

# Verify revert commit created
git log --oneline -3
# Should show: "Revert [commit message]"

# Push immediately
git push origin main
```

**Checklist:**
- [ ] Revert commit created
- [ ] Revert commit pushed to main
- [ ] GitHub Actions workflow started

**Why revert instead of reset?**
- Preserves history (easier to diagnose later)
- Safer (doesn't force-push)
- Allows re-applying fix later

---

### Step 3: Monitor Rollback Deployment

**Rollback triggers same deployment process:**

```bash
# Watch rollback deployment
gh run watch

# Or view on GitHub
# https://github.com/your-org/charhub-reviewer/actions
```

**Expected duration: ~4-5 minutes (same as normal deploy)**

**Checklist:**
- [ ] Rollback workflow started
- [ ] Workflow is deploying
- [ ] No errors in workflow
- [ ] Workflow completes successfully

**If rollback deployment fails:**
→ See Step 7: Manual VM Rollback

---

### Step 4: Verify Production After Rollback

**As soon as rollback deployment completes:**

```bash
# Check health endpoint
curl https://charhub.app/api/v1/health

# Should return: {"status":"ok",...}
```

**Checklist:**
- [ ] Health endpoint responds
- [ ] Frontend loads (https://charhub.app)
- [ ] No errors in browser console
- [ ] Core features work (login, chat, etc.)

**If production still broken after rollback:**
→ Previous version may also have issues
→ May need to revert multiple commits
→ See Step 6: Multiple Commit Rollback

---

### Step 5: Verify Containers Healthy

```bash
# SSH to production
gcloud compute ssh charhub-vm --zone=us-central1-a

# Check container status
docker compose ps

# Check logs for errors
docker compose logs backend --tail=100

# Exit SSH
exit
```

**Checklist:**
- [ ] All containers show "Up (healthy)"
- [ ] No errors in backend logs
- [ ] No repeated restarts

**If containers unhealthy:**
→ Try manual restart: `docker compose restart`
→ If still failing: See Step 7: Manual VM Rollback

---

### Step 6: Multiple Commit Rollback (If Needed)

**If you need to rollback more than one commit:**

```bash
# Revert last 2 commits
git revert HEAD~1..HEAD --no-edit

# Or revert specific commit
git revert <commit-hash> --no-edit

# Push
git push origin main
```

**Checklist:**
- [ ] Identified how many commits to revert
- [ ] Reverted all bad commits
- [ ] Pushed to main
- [ ] Deployment triggered

---

### Step 7: Manual VM Rollback (Last Resort)

**⚠️ ONLY if git revert fails or is too slow**

**This is a nuclear option - use only in emergencies.**

```bash
# SSH to production
gcloud compute ssh charhub-vm --zone=us-central1-a

# Navigate to project
cd /mnt/stateful_partition/charhub

# Check current git status
git status
git log --oneline -5

# Reset to previous commit (DANGEROUS)
git reset --hard HEAD~1

# Rebuild containers
docker compose down
docker compose up -d --build

# Wait for health
sleep 30
docker compose ps

# Verify backend is healthy
docker compose logs backend --tail=50

# Exit SSH
exit
```

**⚠️ WARNING:**
- This bypasses GitHub Actions
- Doesn't update GitHub repository
- Can cause state mismatch
- ONLY use in true emergency

**After manual rollback:**
→ Sync GitHub with VM state:
```bash
# Force push to match VM (CAREFUL)
git push origin main --force
```

---

### Step 8: Database Rollback (If Migration Was Run)

**⚠️ CRITICAL: If bad deployment ran database migrations**

---

#### Check if Migration Was Applied

```bash
# SSH to production
gcloud compute ssh charhub-vm --zone=us-central1-a

# Check migration status
cd /mnt/stateful_partition/charhub
docker compose exec backend npm run prisma:migrate:status
```

**Checklist:**
- [ ] Migration status checked
- [ ] Identified if new migration was applied
- [ ] Determined migration risk level (safe/unsafe to revert)

---

#### Option A: Restore from Automatic Backup (RECOMMENDED)

**⚠️ Use this option if:**
- Migration deleted or modified data
- Migration is complex or has dependencies
- You want guaranteed full restore to pre-deploy state

**Step 1: List Available Backups**

```bash
# SSH to production (if not already connected)
gcloud compute ssh charhub-vm --zone=us-central1-a

# List available backups
cd /mnt/stateful_partition/charhub
ls -lht backups/database/backup_*.sql.gz | head -10
```

**Expected output:**
```
backup_20251217_143022_abc1234.sql.gz  (5.2M) - Dec 17 14:30
backup_20251217_100015_def5678.sql.gz  (5.1M) - Dec 17 10:00
...
```

**Checklist:**
- [ ] Found backups in `backups/database/`
- [ ] Identified backup taken BEFORE failed deployment
- [ ] Verified backup timestamp and commit SHA

**Step 2: Restore Using Script**

```bash
# Navigate to project directory
cd /mnt/stateful_partition/charhub

# Run restore script with backup file
./scripts/ops/restore-database-backup.sh backups/database/backup_20251217_143022_abc1234.sql.gz

# Script will:
# 1. Stop backend container
# 2. Drop and recreate database
# 3. Restore from backup
# 4. Restart backend
# 5. Verify health

# Expected duration: 5-10 minutes
```

**Checklist:**
- [ ] Restore script executed successfully
- [ ] Backend restarted and healthy
- [ ] Database tables verified
- [ ] No errors in restore output

**Step 3: Verify Database Restore**

```bash
# Check backend status
docker compose ps backend

# Verify backend health
docker compose logs backend --tail=50

# Test database connectivity
docker compose exec postgres psql -U charhub -d charhub_db -c "\dt"

# Exit SSH
exit
```

**Checklist:**
- [ ] Backend shows "Up (healthy)"
- [ ] Database contains expected tables
- [ ] No errors in backend logs
- [ ] Application is functional

---

#### Option B: Manual Database Restore (If Script Unavailable)

**Only use if restore script is not available:**

```bash
# SSH to production
gcloud compute ssh charhub-vm --zone=us-central1-a
cd /mnt/stateful_partition/charhub

# Set variables
BACKUP_FILE="backups/database/backup_20251217_143022_abc1234.sql.gz"
COMPOSE="/var/lib/toolbox/bin/docker-compose"

# Stop backend
sudo $COMPOSE stop backend
sleep 2

# Terminate connections
sudo $COMPOSE exec -T postgres psql -U charhub -d postgres << SQL
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'charhub_db' AND pid <> pg_backend_pid();
SQL

# Drop and recreate database
sudo $COMPOSE exec -T postgres psql -U charhub -d postgres << SQL
DROP DATABASE IF EXISTS charhub_db;
CREATE DATABASE charhub_db;
GRANT ALL PRIVILEGES ON DATABASE charhub_db TO charhub;
SQL

# Restore from backup
gunzip -c "$BACKUP_FILE" | sudo $COMPOSE exec -T postgres psql \
  -U charhub -d charhub_db --set ON_ERROR_STOP=on

# Restart backend
sudo $COMPOSE start backend
sleep 10

# Verify
sudo $COMPOSE ps backend
```

**Checklist:**
- [ ] Database dropped and recreated
- [ ] Backup restored successfully
- [ ] Backend restarted
- [ ] System is healthy

---

#### Option C: Revert Migration Manually (ONLY for Simple Migrations)

**⚠️ Use this option ONLY if:**
- Migration only added new columns/tables (no data modification)
- You're confident you can manually revert the changes
- Backup restore is not available or practical

**Step 1: Mark Migration as Rolled Back**

```bash
# SSH to production
gcloud compute ssh charhub-vm --zone=us-central1-a
cd /mnt/stateful_partition/charhub

# Mark migration as rolled back in Prisma
docker compose exec backend npx prisma migrate resolve \
  --rolled-back "20251217_migration_name"
```

**Step 2: Manually Revert Schema Changes**

```bash
# Connect to database
docker compose exec postgres psql -U charhub -d charhub_db

# Example: Drop added column
ALTER TABLE users DROP COLUMN IF EXISTS new_field;

# Example: Drop added table
DROP TABLE IF EXISTS new_table;

# Exit psql
\q
```

**Step 3: Verify and Restart**

```bash
# Restart backend
docker compose restart backend

# Verify health
docker compose ps backend
docker compose logs backend --tail=50

# Exit SSH
exit
```

**Checklist:**
- [ ] Migration marked as rolled back
- [ ] Schema changes reverted manually
- [ ] Backend restarted successfully
- [ ] No errors in logs

---

#### Database Rollback Decision Matrix

| Migration Type | Recommended Option | Risk Level |
|----------------|-------------------|------------|
| Added data, modified data | ✅ Option A (Restore Backup) | 🔴 High |
| Deleted data | ✅ Option A (Restore Backup) | 🔴 Critical |
| Complex schema changes | ✅ Option A (Restore Backup) | 🔴 High |
| Only added columns | ⚠️ Option C (Manual Revert) | 🟡 Medium |
| Only added tables | ⚠️ Option C (Manual Revert) | 🟡 Medium |
| No migration was run | ℹ️ Skip this step | 🟢 None |

**⚠️ CRITICAL NOTES:**
- **Always prefer Option A (Backup Restore)** - safest and fastest
- Automatic backups are created before every deployment (if implemented)
- Backup restore guarantees full return to pre-deploy state
- Manual reversion is error-prone - use only as last resort

---

### Step 9: Document Incident

**Create incident report:**

```bash
# Create incident report
vim docs/06-operations/incident-response/YYYY-MM-DD-deployment-failure.md
```

**Template:**
```markdown
# Incident Report: Deployment Failure

**Date**: YYYY-MM-DD
**Time**: HH:MM UTC
**Severity**: Critical / High / Medium
**Status**: Resolved

## Summary
Brief description of what went wrong.

## Timeline
- HH:MM - Deployment started
- HH:MM - Issue detected
- HH:MM - Rollback initiated
- HH:MM - Production restored

## Root Cause
What caused the deployment to fail.

## Impact
- Users affected: X
- Downtime: X minutes
- Features broken: [list]

## Resolution
How the issue was resolved (rollback, hotfix, etc.)

## Action Items
- [ ] Fix underlying issue
- [ ] Add test to prevent recurrence
- [ ] Update deployment checklist (if process issue)

## Lessons Learned
What we learned and how to prevent this in future.
```

**Checklist:**
- [ ] Incident documented
- [ ] Timeline recorded
- [ ] Root cause identified (or "investigating")
- [ ] Action items created

---

### Step 10: Notify Stakeholders

**If users were affected:**

**Checklist:**
- [ ] Notify user (if internal project)
- [ ] Post status update (if public project)
- [ ] Explain what happened (brief)
- [ ] Explain when fix will deploy

**Example notification:**
```
Production deployment at [time] encountered an issue and was rolled back.
Service is now restored. We're investigating the root cause and will deploy
a fix within [timeframe].
```

---

### Step 11: Post-Rollback Verification

**Final checks after rollback:**

```bash
# Health check
curl https://charhub.app/api/v1/health

# Frontend check
curl -I https://charhub.app

# Test critical paths
# - Login works
# - Core features work
# - No errors in logs
```

**Monitor for 15-30 minutes:**

```bash
# Watch production logs
gcloud compute ssh charhub-vm --zone=us-central1-a
docker compose logs -f backend
```

**Checklist:**
- [ ] Production fully operational
- [ ] No errors in logs
- [ ] Users can access application
- [ ] Core features working
- [ ] System stable for 15+ minutes

---

## Post-Rollback Actions

### Immediate (Next Hour)

**Checklist:**
- [ ] Investigate root cause
- [ ] Create fix branch
- [ ] Write tests to catch the issue
- [ ] Test fix thoroughly locally

### Short-term (Next Day)

**Checklist:**
- [ ] Deploy fix (after thorough testing)
- [ ] Verify fix works in production
- [ ] Update documentation (if process issue)
- [ ] Review deployment checklist (add missing checks)

### Long-term (Next Week)

**Checklist:**
- [ ] Conduct post-mortem (if major incident)
- [ ] Update deployment automation (if applicable)
- [ ] Add monitoring/alerts (to catch issue faster)
- [ ] Share lessons learned with team

---

## Common Rollback Scenarios

### Scenario 1: TypeScript Compilation Error in Production

**Symptoms:**
- Container build fails
- Backend won't start

**Rollback:**
```bash
git revert HEAD --no-edit
git push origin main
```

**Prevent:**
- Always run `npm run build` locally before deploy
- Add TypeScript check to PR CI

---

### Scenario 2: Missing Environment Variable

**Symptoms:**
- Backend crashes on startup
- Logs show: `process.env.X is not defined`

**Quick Fix (Without Rollback):**
```bash
# SSH to VM
gcloud compute ssh charhub-vm --zone=us-central1-a

# Add missing variable to .env
echo "MISSING_VAR=value" >> /mnt/stateful_partition/charhub/backend/.env

# Restart backend
docker compose restart backend
```

**Prevent:**
- Always execute `env-validation.md` checklist

---

### Scenario 3: Database Migration Failed

**Symptoms:**
- Migration fails during deploy
- Database in inconsistent state

**Rollback:**
```bash
# Rollback code
git revert HEAD --no-edit
git push origin main

# Rollback migration (see Step 8)
```

**Prevent:**
- Test migrations locally with production-like data
- Make migrations reversible
- Use Prisma's migration preview feature

---

### Scenario 4: Frontend Breaking Change

**Symptoms:**
- Frontend loads but features broken
- Console shows API errors

**Cause:**
- Frontend/backend version mismatch
- Breaking API change

**Rollback:**
```bash
git revert HEAD --no-edit
git push origin main
```

**Prevent:**
- Never deploy backend breaking changes without frontend update
- Version APIs properly
- Use feature flags for gradual rollout

---

## Rollback Decision Matrix

| Issue | Severity | Action |
|-------|----------|--------|
| Health endpoint down | 🔴 Critical | Rollback immediately |
| Backend crashes on startup | 🔴 Critical | Rollback immediately |
| Database migration fails | 🔴 Critical | Rollback + restore DB |
| Frontend blank screen | 🔴 Critical | Rollback immediately |
| Feature broken, rest works | 🟡 High | Hotfix if quick, else rollback |
| Minor UI bug | 🟢 Medium | Hotfix, no rollback |
| Performance degradation | 🟡 High | Monitor, consider rollback |
| Single user report | 🟢 Low | Investigate, don't rollback |

---

## See Also

- `deploy-monitoring.md` - How to catch issues during deploy
- `post-deploy.md` - Verification after deploy
- `../../02-guides/deployment/vm-setup-recovery.md` - VM recovery procedures
- `../../06-operations/incident-response/` - Incident documentation
