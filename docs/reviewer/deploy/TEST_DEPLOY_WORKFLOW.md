# Testing the Production Deployment Workflow

This guide explains how to test the GitHub Actions deployment workflow after the osLogin SSH fix.

## Quick Start: Test the Workflow Now

### Step 1: Go to GitHub Actions
```
https://github.com/leandro-br-dev/charhub/actions
```

### Step 2: Select "Deploy to Production" Workflow
- Find "Deploy to Production" in the left sidebar
- Click on it

### Step 3: Run the Workflow Manually
1. Click the **"Run workflow"** button
2. Select branch: **main** (default)
3. Click **"Run workflow"** button

### Step 4: Monitor the Execution
The workflow will execute the following steps:

```
✅ Pre-Deploy Checks
   └─ Verify main branch
   └─ List commits to deploy

✅ Deploy
   ├─ Checkout code
   ├─ Authenticate to Google Cloud
   ├─ Set up gcloud
   ├─ Configure gcloud SSH to use osLogin  ← NEW FIX
   ├─ Test SSH connection                    ← THIS SHOULD NOW PASS
   ├─ Create deployment backup
   ├─ Fetch latest code
   ├─ Stop running containers
   ├─ Build and start containers
   ├─ Wait for services to be ready
   ├─ Run database migrations
   ├─ Health check
   └─ Verify deployment

✅ Send Notifications
   └─ Print deployment result
```

### Step 5: Check for Success

**Success Indicators**:
- ✅ All steps show green checkmarks
- ✅ "Test SSH connection" step shows: `SSH connection successful`
- ✅ "Health check" step shows: `Health check passed!`
- ✅ Final step shows: `Deployment successful!`

**If It Fails**:
- ❌ SSH connection fails → See troubleshooting section below
- ❌ Health check fails → See DEPLOYMENT_GUIDE.md
- ❌ Docker build fails → Check code changes in latest commit

## Understanding the Workflow Output

### Test SSH Connection (Critical)

This is the first step that uses the osLogin fix:

```yaml
- name: Configure gcloud SSH to use osLogin
  run: |
    gcloud config set compute/use_os_login true

- name: Test SSH connection
  run: |
    gcloud compute ssh ${{ env.VM_NAME }} \
      --zone=${{ env.GCP_ZONE }} \
      --command="echo '✅ SSH connection successful'"
```

**Expected Log Output**:
```
🔌 Testing SSH connection to VM...
✅ SSH connection successful
```

If this step fails, the entire workflow stops → SSH authentication issue.

### Health Check

After deployment, the workflow verifies the app is working:

```
for i in {1..30}; do
  echo "Attempt $i/30..."
  if curl -sf https://charhub.app/api/v1/health > /dev/null; then
    echo "✅ Health check passed!"
    exit 0
  fi
  sleep 5
done
```

This tries 30 times with 5-second intervals (up to 2.5 minutes).

**Expected Behavior**:
- First few attempts may fail while services start
- By attempt 3-5, health check should pass
- ✅ Final result: "Health check passed!"

### Deployment Verification

Last step confirms deployment was successful:

```
✅ Deployment verification...
📋 Running containers:
docker-compose ps

📝 Current commit:
git log -1 --oneline

✅ Deployment verification complete
```

## Troubleshooting

### Issue: "Test SSH connection" fails with osLogin error

**Error Message**: `Required 'compute.instances.setMetadata' permission`

**Solution**: The osLogin configuration isn't working. Options:
1. Verify service account has `compute.osLogin` role (see DEPLOYMENT_GUIDE.md)
2. Regenerate GCP_SERVICE_ACCOUNT_KEY_PROD secret
3. Wait a few minutes (IAM role changes can take time to propagate)

### Issue: "Health check failed after 30 attempts"

**Error Message**: `❌ Health check failed after 30 attempts`

**Causes**:
- Backend crashed or has errors
- Migrations failed
- Database connection issue

**Solution**:
1. Check container logs manually:
   ```bash
   gcloud compute ssh charhub-vm --zone=us-central1-a --command="cd /mnt/stateful_partition/charhub && docker-compose logs backend | tail -50"
   ```
2. If recent code change caused it, workflow will auto-rollback
3. Fix the issue in code and try again

### Issue: "Rollback on failure" was triggered

**What It Does**:
- Stops containers
- Reverts to previous commit
- Rebuilds with previous version
- Restarts containers

**Recovery**:
1. Fix the issue in your code
2. Commit and push the fix to main
3. Manually trigger deployment again
4. Workflow will deploy the fixed code

## Deployment Timing

Total time for deployment:

| Stage | Time |
|-------|------|
| Pre-deploy checks | ~30 seconds |
| Setup (auth, checkout) | ~1 minute |
| Docker build | ~3-5 minutes |
| Start containers | ~30 seconds |
| Database migrations | ~30 seconds |
| Health checks | ~30 seconds to 2 minutes |
| **Total** | **~5-10 minutes** |

## Post-Deployment Verification

After workflow completes successfully:

### 1. Verify Frontend is Working
```
https://charhub.app
```
- Should load the CharHub interface
- No browser console errors

### 2. Verify API is Healthy
```bash
curl https://charhub.app/api/v1/health
```
- Should return: `{"status":"ok"}`

### 3. Check Current Deployment
```bash
gcloud compute ssh charhub-vm --zone=us-central1-a --command="cd /mnt/stateful_partition/charhub && git log -1 --oneline"
```
- Should show your latest commit from main

### 4. Monitor for Issues (Next 24h)
- Check error logs
- Monitor database performance
- Track user-reported issues
- Verify analytics data is being collected

## Automated Deployment (Future)

Once this is tested and working, GitHub Actions will automatically deploy whenever you merge to main:

```
Developer PR → CI Checks → Merge to main → GitHub Actions Deploy → Production ✅
```

No manual workflow trigger needed!

## Rollback Procedure (If Needed)

If something breaks and auto-rollback didn't work:

### Option 1: Manual Rollback via GitHub Actions
1. Go to Actions page
2. Run workflow with specific commit hash (before the broken change)
3. Workflow deploys that version

### Option 2: Manual SSH Rollback
```bash
gcloud compute ssh charhub-vm --zone=us-central1-a --command="
  cd /mnt/stateful_partition/charhub
  git log --oneline | head -5
  git reset --hard <GOOD_COMMIT_HASH>
  docker-compose down
  docker-compose build
  docker-compose up -d
"
```

---

**Last Updated**: 2025-12-01
**Status**: Ready for testing
**osLogin Fix**: ✅ Deployed in commit fbb442f
