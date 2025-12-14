# Deploy Monitoring Checklist

**When to use**: Immediately after pushing to main

**Duration**: ~5-10 minutes (active monitoring)

**Critical Level**: 🔴 MANDATORY - Do NOT walk away during deployment

---

## ⚠️ CRITICAL RULE

**You MUST actively monitor deployment from start to finish.**

**Do NOT:**
- Walk away during deployment
- Assume "no news is good news"
- Wait to check later

**Why?** If deployment fails, you need to rollback immediately before users are affected.

---

## Step 1: Start Monitoring Immediately

**As soon as you push:**

```bash
# Watch deployment in real-time
gh run watch

# Or view specific run
gh run list
gh run view <run-id>
```

**Checklist:**
- [ ] GitHub Actions workflow started
- [ ] Workflow name is "Deploy to GCP"
- [ ] Run status shows "In Progress"
- [ ] Started within 30s of your push

**If workflow doesn't start:**
→ Check GitHub Actions page manually
→ Verify push succeeded: `git log origin/main`
→ Check for GitHub service issues

---

## Step 2: Monitor Pre-Deploy Checks

**Expected duration: ~30 seconds**

**Watch for:**
- Checkout code
- Setup Node.js
- Install dependencies

**Checklist:**
- [ ] ✅ Code checkout successful
- [ ] ✅ Node.js setup successful
- [ ] ✅ Dependencies installed

**If this step fails:**
→ Usually GitHub infrastructure issue
→ Check error message
→ May need to re-run workflow

---

## Step 3: Monitor GCP Authentication

**Expected duration: ~20 seconds**

**Watch for:**
- Authenticate to GCP
- Setup gcloud CLI

**Checklist:**
- [ ] ✅ GCP authentication successful
- [ ] ✅ gcloud configured correctly

**If this step fails:**
→ Check GCP service account credentials
→ May be temporary GCP issue
→ Check secrets in GitHub repository settings

---

## Step 4: Monitor SSH Setup

**Expected duration: ~15 seconds**

**Watch for:**
- Generate SSH key
- Add SSH key to OS Login
- Configure SSH config

**Checklist:**
- [ ] ✅ SSH key generated
- [ ] ✅ SSH key added to GCP
- [ ] ✅ SSH config created

**If this step fails:**
→ GCP OS Login issue
→ Check VM metadata
→ May need manual SSH key cleanup

---

## Step 5: Monitor Code Pull

**Expected duration: ~30 seconds**

**Watch for:**
- SSH to VM
- Navigate to project directory
- Git pull latest code

**Checklist:**
- [ ] ✅ SSH connection successful
- [ ] ✅ Project directory accessed
- [ ] ✅ Git pull successful
- [ ] ✅ Correct branch (main) pulled

**If this step fails:**
→ SSH connection issue
→ Git repository issue on VM
→ May need manual intervention

---

## Step 6: Monitor Cloudflare Credentials Sync

**Expected duration: ~10 seconds**

**Watch for:**
- Copy R2 credentials to VM
- Update .env file

**Checklist:**
- [ ] ✅ Credentials copied successfully
- [ ] ✅ .env file updated on VM

**If this step fails:**
→ GitHub secrets issue
→ File permissions on VM
→ Check secrets are set correctly

---

## Step 7: Monitor Container Rebuild

**Expected duration: ~2-3 minutes (longest step)**

**Watch for:**
- Pull latest images
- Build backend image
- Build frontend image
- Start containers

**Checklist:**
- [ ] ✅ Docker images pulled
- [ ] ✅ Backend build successful
- [ ] ✅ Frontend build successful
- [ ] ✅ Containers started

**⚠️ CRITICAL STEP - Most likely to fail**

**Common failures:**
- TypeScript compilation errors
- Missing dependencies
- Out of memory
- Docker build context issues

**If this step fails:**
→ Read error message carefully
→ Likely need to rollback immediately
→ Execute `rollback.md` checklist

---

## Step 8: Monitor Health Check

**Expected duration: ~30 seconds**

**Watch for:**
- Wait for containers to stabilize
- Check backend health endpoint
- Verify services responding

**Checklist:**
- [ ] ✅ Containers healthy
- [ ] ✅ Backend responds to health check
- [ ] ✅ All services running

**If this step fails:**
→ Containers started but not healthy
→ Check container logs
→ May be startup issue
→ Likely need to rollback

---

## Step 9: Monitor Deployment Verification

**Expected duration: ~15 seconds**

**Watch for:**
- Verify production URL responds
- Check API endpoints
- Confirm deployment complete

**Checklist:**
- [ ] ✅ Production URL accessible
- [ ] ✅ API endpoints responding
- [ ] ✅ Deployment marked successful

---

## Step 10: Verify Deployment Success

**Total expected duration: ~4-5 minutes**

```bash
# Check final status
gh run list --limit 1

# Should show: ✓ Deploy to GCP (completed)
```

**Checklist:**
- [ ] Workflow status: ✅ Success (green checkmark)
- [ ] All steps passed
- [ ] Total duration reasonable (~4-5 min)
- [ ] No warnings in output

**If deployment succeeded:**
→ Proceed to `post-deploy.md` checklist

**If deployment failed:**
→ Execute `rollback.md` IMMEDIATELY
→ Do NOT wait to investigate

---

## Step 11: Real-Time Logs Monitoring (Optional)

**While deployment runs, you can also monitor production logs:**

```bash
# SSH to production
gcloud compute ssh charhub-vm --zone=us-central1-a

# Watch backend logs
docker compose logs -f backend

# In another terminal, watch all containers
docker compose ps
```

**Watch for:**
- Containers restarting
- Error messages
- Unusual warnings
- Database connection issues

**Exit SSH:**
```bash
exit
```

---

## Common Deployment Issues

### Issue: "Cannot connect to VM"
```
Error: ssh: connect to host failed
```

**Likely cause:** GCP networking or SSH issue

**Action:**
- Check VM is running: `gcloud compute instances list`
- Try manual SSH: `gcloud compute ssh charhub-vm`
- If persistent, check VPC firewall rules

---

### Issue: "Docker build failed"
```
Error: failed to build backend
npm ERR! code 1
```

**Likely cause:** TypeScript compilation error or missing dependency

**Action:**
- Read build output carefully
- Likely introduced in PR (should have been caught in local testing)
- **ROLLBACK IMMEDIATELY**

---

### Issue: "Container unhealthy"
```
Error: backend is unhealthy
```

**Likely cause:** Backend crashes on startup or can't connect to database

**Action:**
- Check logs: `docker compose logs backend`
- Common causes:
  - Missing environment variable
  - Database migration needed
  - Database connection failed
- **ROLLBACK IMMEDIATELY**, investigate later

---

### Issue: "Health check timeout"
```
Error: Health check timed out after 60s
```

**Likely cause:** Backend taking too long to start or crashed

**Action:**
- Backend may be starting slowly (rare)
- More likely: backend crashed
- Check logs to confirm
- **ROLLBACK** if backend is not running

---

### Issue: "Git pull failed"
```
Error: Your local changes would be overwritten
```

**Likely cause:** Manual changes on production VM (bad practice)

**Action:**
- SSH to VM
- Check: `git status`
- Stash or commit changes: `git stash`
- Re-run deployment workflow

---

## Deployment Timeline Expectations

Normal deployment timeline:

```
[00:00] Workflow starts
[00:30] Pre-deploy checks complete
[00:50] GCP authentication complete
[01:05] SSH setup complete
[01:35] Code pulled to VM
[01:45] Cloudflare credentials synced
[04:30] Container rebuild complete ← Longest step
[05:00] Health check complete
[05:15] Deployment verification complete
[05:20] Workflow marked successful ✅
```

**If deployment takes >10 minutes:**
→ Something is wrong
→ Check workflow logs for hanging step
→ May need to cancel and investigate

---

## Next Steps

**If deployment successful:**
→ **Execute**: `post-deploy.md` checklist
→ Verify production health
→ Monitor for 15 minutes

**If deployment failed:**
→ **Execute**: `rollback.md` checklist IMMEDIATELY
→ Do NOT investigate before rolling back
→ Rollback first, debug later

---

## See Also

- `post-deploy.md` - Post-deployment verification
- `rollback.md` - Emergency rollback procedure
- `../../02-guides/deployment/cd-deploy-guide.md` - Deployment details
- `../../03-reference/workflows/workflows-analysis.md` - GitHub Actions workflows
