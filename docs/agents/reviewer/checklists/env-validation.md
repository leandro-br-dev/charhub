# Environment Variables Validation Checklist

**When to use**: Before EVERY deploy to production

**Duration**: ~5 minutes

**Critical Level**: 🔴 MANDATORY - Skipping this can break production

---

## Step 1: Compare .env.example with .env.production

```bash
# List all variables in .env.example
grep -E '^[A-Z_]+=' backend/.env.example | cut -d= -f1 | sort > /tmp/env-example.txt

# List all variables in backend/.env.production (if exists locally)
grep -E '^[A-Z_]+=' backend/.env.production | cut -d= -f1 | sort > /tmp/env-production.txt

# Find missing variables in production
comm -23 /tmp/env-example.txt /tmp/env-production.txt
```

**Checklist:**
- [ ] All variables from `.env.example` exist in `.env.production`
- [ ] No new variables introduced in code without adding to `.env.example`
- [ ] No deprecated variables lingering in `.env.production`

**If missing variables found:**
→ Add them to `.env.production` with correct production values
→ Document in `docs/03-reference/backend/environment-variables.md`

---

## Step 2: Validate Production Values

**Critical variables to verify:**

```bash
# Check database URL points to production
grep DATABASE_URL backend/.env.production
# Must be: postgresql://charhub:PASSWORD@localhost:5432/charhub_db

# Check R2 public URL
grep R2_PUBLIC_URL backend/.env.production
# Must be: https://charhub-assets.pomba.net (not localhost)

# Check session secret is strong
grep SESSION_SECRET backend/.env.production
# Must be: 32+ random characters (not "dev-secret")
```

**Checklist:**
- [ ] `DATABASE_URL` points to production database
- [ ] `R2_PUBLIC_URL` points to production CDN (not localhost)
- [ ] `SESSION_SECRET` is production-grade (32+ chars, random)
- [ ] `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are production OAuth credentials
- [ ] `CLOUDFLARE_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` are production R2 credentials
- [ ] `NODE_ENV=production`
- [ ] `PORT=3000` (backend)
- [ ] `FRONTEND_URL=https://charhub.app`

---

## Step 3: Sync .env.production to Server

**⚠️ CRITICAL**: Production server reads `.env` file, not `.env.production`

```bash
# Copy local .env.production to server as .env
gcloud compute scp backend/.env.production \
  charhub-vm:/mnt/stateful_partition/charhub/backend/.env \
  --zone=us-central1-a

# Verify file was copied
gcloud compute ssh charhub-vm --zone=us-central1-a -- \
  "cat /mnt/stateful_partition/charhub/backend/.env | grep -c '^[A-Z]'"
# Should output: number of env vars (e.g., 15)
```

**Checklist:**
- [ ] `.env.production` copied to server as `backend/.env`
- [ ] Verify file exists on server
- [ ] Verify file has correct number of variables
- [ ] Verify file permissions are correct (not world-readable if contains secrets)

**Optional: Verify permissions**
```bash
gcloud compute ssh charhub-vm --zone=us-central1-a -- \
  "ls -la /mnt/stateful_partition/charhub/backend/.env"
# Should be: -rw-r--r-- or -rw-------
```

---

## Step 4: Verify New Variables in Code

If PR added new environment variables:

```bash
# Search for new process.env usage
git diff main...feature-branch | grep -i "process.env"
```

**For each new variable found:**
- [ ] Added to `backend/.env.example` with description
- [ ] Added to `backend/.env.production` with production value
- [ ] Documented in `docs/03-reference/backend/environment-variables.md`
- [ ] Has fallback/validation in code (doesn't crash if missing)

---

## Step 5: Restart Backend After .env Changes

If you synced `.env` to production server:

```bash
# SSH to server
gcloud compute ssh charhub-vm --zone=us-central1-a

# Navigate to project
cd /mnt/stateful_partition/charhub

# Restart backend to load new env vars
docker compose restart backend

# Verify backend is healthy
docker compose ps
docker compose logs backend --tail=50

# Exit SSH
exit
```

**Checklist:**
- [ ] Backend container restarted
- [ ] Backend is in "healthy" state
- [ ] No errors in logs about missing env vars
- [ ] Health endpoint responds: `curl https://charhub.app/api/v1/health`

---

## Common Issues

**Issue: Missing variable crashes backend**
```
Error: process.env.NEW_VARIABLE is not defined
```
→ Add variable to `.env.production`
→ Sync to server
→ Restart backend

**Issue: Wrong database URL**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
→ Check `DATABASE_URL` in production `.env`
→ Verify PostgreSQL container is running: `docker compose ps`

**Issue: R2 images not loading**
```
Frontend shows broken images
```
→ Check `R2_PUBLIC_URL` is production CDN URL
→ Verify Cloudflare R2 credentials are correct

---

## See Also

- `../../03-reference/backend/environment-variables.md` - Full variable documentation
- `../../02-guides/deployment/vm-setup-recovery.md` - Server access guide
- `pre-deploy.md` - Full pre-deploy checklist
