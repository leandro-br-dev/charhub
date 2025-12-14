# Post-Deploy Verification Checklist

**When to use**: Immediately after successful deployment

**Duration**: ~10-15 minutes

**Critical Level**: 🟡 HIGH - Verify production actually works

---

## ⚠️ IMPORTANT

Even if GitHub Actions shows ✅ success, you MUST verify production is actually working.

**Why?** Deployment can succeed but feature may be broken due to:
- Environment variable mismatch
- Database migration not run
- Frontend/backend version mismatch
- External service issues (R2, OAuth, etc.)

---

## Step 1: Production Health Endpoint

**Verify backend is responding:**

```bash
# Check health endpoint
curl https://charhub.app/api/v1/health

# Expected response:
# {"status":"ok","timestamp":"2025-XX-XXTXX:XX:XX.XXXZ"}
```

**Checklist:**
- [ ] Health endpoint responds
- [ ] Response status is 200 OK
- [ ] Response JSON is valid
- [ ] `status` field is `"ok"`
- [ ] Timestamp is recent

**If health check fails:**
→ Backend is down or crashing
→ Execute `rollback.md` immediately

---

## Step 2: Frontend Loads

**Open production URL in browser:**

```bash
# Check frontend HTTP status
curl -I https://charhub.app

# Expected: HTTP/2 200
```

**Manual check:**
- Open https://charhub.app in browser (incognito mode)

**Checklist:**
- [ ] Page loads (not 404 or 502)
- [ ] No blank white screen
- [ ] Content renders correctly
- [ ] No obvious visual glitches
- [ ] Styles loaded (not unstyled HTML)

**If frontend doesn't load:**
→ Check browser console for errors
→ May be frontend build issue
→ Execute `rollback.md`

---

## Step 3: Browser Console Check

**Open DevTools (F12) → Console tab**

**Checklist:**
- [ ] No JavaScript errors
- [ ] No React warnings
- [ ] No 404 errors for assets
- [ ] No CORS errors
- [ ] API requests succeed (check Network tab)

**Common issues:**
- Missing i18n keys → Translation compilation issue
- 404 for assets → Frontend build issue
- CORS errors → Backend CORS configuration issue

---

## Step 4: Test Core User Flows

**Critical paths to verify:**

### 4.1 Login/Authentication

```
Test OAuth login:
1. Click "Login with Google"
2. Complete OAuth flow
3. Verify redirected back to app
4. Verify user is logged in
```

**Checklist:**
- [ ] OAuth login works
- [ ] User session persists
- [ ] User profile displays correctly
- [ ] Logout works

**If login fails:**
→ Check `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
→ Check OAuth redirect URLs configured correctly
→ May need to rollback and fix env vars

---

### 4.2 Main Feature (Deployed in This PR)

**Test the specific feature that was just deployed:**

**Checklist:**
- [ ] Feature is accessible
- [ ] Feature works as expected
- [ ] No errors in browser console
- [ ] No errors in backend logs
- [ ] Data persists correctly

**If feature doesn't work:**
→ Check backend logs (Step 7)
→ Check database (Step 9)
→ May need to run migration (Step 10)
→ Consider rollback if critical

---

### 4.3 Existing Features (Regression Test)

**Verify existing features still work:**

**Checklist:**
- [ ] Character chat works
- [ ] File uploads work (if applicable)
- [ ] Credits system works (if applicable)
- [ ] Navigation works
- [ ] User settings work

**Why?** Ensure deployment didn't break existing functionality

**If regression found:**
→ Document the regression
→ Decide: rollback or hotfix?
→ Critical regressions = immediate rollback

---

## Step 5: Database Migration (If Applicable)

**If PR included database schema changes:**

### 5.1 Check Migration Status

```bash
# SSH to production
gcloud compute ssh charhub-vm --zone=us-central1-a

# Check migration status
cd /mnt/stateful_partition/charhub
docker compose exec backend npm run prisma:migrate:status
```

**Expected output:**
```
Database schema is up to date!
```

**If migrations are pending:**
→ See Step 10: Execute Migration

---

### 5.2 Verify Schema Changes

```bash
# Open Prisma Studio (on production)
docker compose exec backend npm run prisma:studio

# Forward port to access locally
# (or access via port forwarding setup)
```

**Checklist:**
- [ ] New tables exist (if applicable)
- [ ] New fields exist (if applicable)
- [ ] Sample data structure correct
- [ ] Relations work (foreign keys)

**⚠️ WARNING**: Be careful browsing production database. Do NOT modify data manually.

---

## Step 6: Test API Endpoints (If Changed)

**If PR added/modified API endpoints:**

```bash
# Test new endpoint
curl -X GET https://charhub.app/api/v1/new-endpoint \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check response
```

**Checklist:**
- [ ] Endpoint returns expected status code
- [ ] Response format is correct
- [ ] Authentication works (if required)
- [ ] Validation works (test invalid input)
- [ ] Error responses are user-friendly

---

## Step 7: Monitor Production Logs

**SSH to production and watch logs:**

```bash
# SSH to VM
gcloud compute ssh charhub-vm --zone=us-central1-a

# Watch backend logs
docker compose logs -f backend --tail=100
```

**Watch for 5-10 minutes while testing features**

**Checklist:**
- [ ] No errors or exceptions
- [ ] No unusual warnings
- [ ] API requests logged correctly
- [ ] Response times reasonable
- [ ] No database connection errors

**Common issues to watch for:**
- `Error: Cannot find module` → Missing dependency
- `Error: process.env.X is not defined` → Missing env var
- `ECONNREFUSED` → Service connection issue
- Repeated errors → Likely bug introduced

**Exit SSH when done:**
```bash
exit
```

---

## Step 8: Container Health Status

**Verify all containers are healthy:**

```bash
# SSH to production (if not already)
gcloud compute ssh charhub-vm --zone=us-central1-a

# Check container status
docker compose ps

# Expected output:
# NAME       STATUS         PORTS
# backend    Up (healthy)   0.0.0.0:3000->3000/tcp
# frontend   Up (healthy)   0.0.0.0:8080->80/tcp
# postgres   Up (healthy)   5432/tcp
```

**Checklist:**
- [ ] All containers show "Up"
- [ ] Backend shows "(healthy)"
- [ ] Postgres shows "(healthy)"
- [ ] No containers restarting repeatedly

**If any container is unhealthy:**
→ Check logs: `docker compose logs <service-name>`
→ May need to restart: `docker compose restart <service-name>`
→ If persists: rollback and investigate

---

## Step 9: Database Connection Test

**Verify backend can connect to database:**

```bash
# Still on production VM
cd /mnt/stateful_partition/charhub

# Test database connection
docker compose exec backend npm run prisma:db:pull
# This should complete without errors (won't change anything)
```

**Checklist:**
- [ ] Prisma can connect to database
- [ ] No connection errors
- [ ] No authentication errors

---

## Step 10: Execute Database Migration (If Needed)

**⚠️ ONLY if PR included migrations AND they haven't run yet**

```bash
# Still on production VM
cd /mnt/stateful_partition/charhub

# Run migrations
docker compose exec backend npm run prisma:migrate:deploy

# Verify migration succeeded
docker compose exec backend npm run prisma:migrate:status
# Should show: Database schema is up to date!
```

**Checklist:**
- [ ] Migration executed successfully
- [ ] No errors during migration
- [ ] Database schema updated
- [ ] Application still works after migration

**⚠️ If migration fails:**
→ DO NOT try again without investigation
→ Check migration SQL for issues
→ May need to restore from backup
→ Document incident in `docs/06-operations/incident-response/`

---

## Step 11: Performance Spot Check

**Quick performance verification:**

```bash
# Still on production VM

# Check container resource usage
docker stats --no-stream

# Check response times in logs
docker compose logs backend | grep "GET\|POST" | tail -20
```

**Checklist:**
- [ ] Memory usage reasonable (not growing)
- [ ] CPU usage reasonable (<50% idle)
- [ ] Response times < 500ms for typical requests
- [ ] No N+1 query warnings in logs

**If performance issues:**
→ Document for later optimization
→ Not urgent unless severe (>2s response times)

---

## Step 12: External Services Check

**If feature uses external services:**

### R2/Cloudflare (Image uploads)
```bash
# Test image upload (if applicable)
# Upload test image in production
# Verify image displays correctly
```

**Checklist:**
- [ ] R2 uploads work
- [ ] Images display correctly
- [ ] CDN URLs correct (not localhost)

### OAuth (Google Login)
**Already tested in Step 4.1**

### Payment (If applicable)
⚠️ **DO NOT test with real payments**
→ Verify test mode works (if implemented)

---

## Step 13: Monitor for 15 Minutes

**After initial verification passes:**

**Keep monitoring:**
- Production logs (via SSH)
- Error tracking (if you have monitoring tools)
- GitHub Actions (in case of automatic retries)

**Checklist:**
- [ ] No errors appearing in logs
- [ ] No user reports of issues
- [ ] No unusual traffic patterns
- [ ] System remains stable

**After 15 minutes of stability:**
→ Deployment is likely successful
→ Proceed to documentation updates

---

## Step 14: Final Verification Summary

**Document deployment results:**

**Checklist:**
- [ ] ✅ Health endpoint working
- [ ] ✅ Frontend loads correctly
- [ ] ✅ Main feature works
- [ ] ✅ No regressions in existing features
- [ ] ✅ Database migration successful (if applicable)
- [ ] ✅ Logs clean (no errors)
- [ ] ✅ Containers healthy
- [ ] ✅ Performance acceptable

**If all above are ✅:**
→ Deployment SUCCESSFUL
→ Proceed to documentation cleanup

**If any are ❌:**
→ Investigate severity
→ Critical issues → Rollback
→ Minor issues → Create hotfix task

---

## Common Post-Deploy Issues

### Issue: Feature works locally but not in production
**Likely causes:**
- Environment variable mismatch
- Database migration not run
- Different data in production database

**Action:**
- Compare local vs production `.env`
- Check migration status
- Check database state

---

### Issue: Images not loading (broken R2)
**Likely causes:**
- Wrong `R2_PUBLIC_URL` in production
- Wrong R2 credentials
- CORS not configured on R2 bucket

**Action:**
- Verify `R2_PUBLIC_URL` in production `.env`
- Verify R2 credentials correct
- Check Cloudflare R2 bucket settings

---

### Issue: OAuth login fails
**Likely causes:**
- Wrong `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- OAuth redirect URL not whitelisted
- Session secret changed (invalidated sessions)

**Action:**
- Verify OAuth credentials in production `.env`
- Check Google Cloud Console → OAuth redirect URLs
- May need users to re-login

---

### Issue: Database migration hangs
**Likely causes:**
- Migration is too large (timeout)
- Database locked by other process
- Migration SQL has syntax error

**Action:**
- Cancel migration (Ctrl+C)
- Check database connections
- Review migration SQL manually
- May need to run migration in parts

---

## Next Steps

**If deployment successful:**
→ Update documentation (README, CHANGELOG)
→ Move feature spec to `implemented/`
→ Clean up branches
→ Close related issues/PRs

**If deployment has issues:**
→ Decide: rollback or hotfix?
→ Document issues
→ Create follow-up tasks

---

## See Also

- `rollback.md` - If you need to rollback
- `env-validation.md` - Environment variable issues
- `../../02-guides/deployment/vm-setup-recovery.md` - Production VM guide
- `../../06-operations/incident-response/` - Incident documentation
