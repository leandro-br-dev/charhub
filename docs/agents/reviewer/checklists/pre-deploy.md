# Pre-Deploy Checklist

**When to use**: After local testing passes, before merging to main

**Duration**: ~10-15 minutes

**Critical Level**: 🔴 MANDATORY - Every push to main triggers production deploy

---

## ⚠️ CRITICAL WARNING

**Every push to `main` branch automatically deploys to production!**

This checklist ensures you don't break production. Take your time.

---

## Step 1: Final Code Verification

```bash
# Ensure you're on the feature branch
git branch --show-current

# Check git status
git status

# Review all changes one more time
git diff main...HEAD
```

**Checklist:**
- [ ] On correct feature branch (not main yet)
- [ ] No uncommitted changes
- [ ] No debug code left (console.log, debugger, etc.)
- [ ] No commented-out code without explanation
- [ ] All changes are intentional

---

## Step 2: Environment Variables Validation

**⚠️ CRITICAL**: Execute `env-validation.md` checklist

```bash
# Quick verification
cat docs/agents/reviewer/checklists/env-validation.md
```

**Checklist:**
- [ ] ✅ Completed `env-validation.md` checklist
- [ ] All new env vars added to `.env.example`
- [ ] All new env vars added to `.env.production`
- [ ] Production values are correct (not dev values)
- [ ] `.env.production` synced to server (if changed)

**If you skipped this:**
→ 🛑 STOP NOW
→ Go execute `env-validation.md`
→ Come back here after

---

## Step 3: Final Test Suite Run

**Run tests one final time on the feature branch:**

```bash
# Backend
cd backend
npm run build
npm run lint
npm test

# Frontend
cd ../frontend
npm run build
npm run lint
```

**Checklist:**
- [ ] Backend TypeScript compiles
- [ ] Backend tests pass
- [ ] Frontend TypeScript + Vite build succeeds
- [ ] No new linting errors
- [ ] Test results match previous run

**If any test fails:**
→ 🛑 DO NOT MERGE
→ Fix issues first
→ Re-run tests
→ Restart this checklist

---

## Step 4: Database Migration Safety Check

**If PR includes database migrations:**

```bash
# Check migration files
ls -la backend/prisma/migrations/

# Review migration SQL
cat backend/prisma/migrations/*/migration.sql
```

**Checklist:**
- [ ] Migration is reversible (has down migration strategy)
- [ ] Migration doesn't drop data without backup
- [ ] Migration tested locally with production-like data
- [ ] Migration is idempotent (safe to run multiple times)
- [ ] Migration has appropriate timeout (not hanging)

**Dangerous migrations:**
- `DROP TABLE` → 🛑 Requires explicit backup plan
- `ALTER TABLE ... DROP COLUMN` → 🛑 Data loss risk
- `UPDATE` without `WHERE` → 🛑 Can corrupt all data

**If migration is dangerous:**
→ Document backup/rollback plan
→ Consider running manually (not in automated deploy)

---

## Step 5: Documentation Completeness

**Checklist:**
- [ ] Feature spec updated in `docs/05-business/planning/features/active/`
- [ ] CHANGELOG entry prepared (will add after deploy)
- [ ] API documentation updated (if endpoints changed)
- [ ] README updated (if setup changed)
- [ ] Environment variables documented (if added new ones)

**If documentation is incomplete:**
→ Tag Agent Coder to update docs
→ Wait for documentation PR
→ Do NOT deploy undocumented features

---

## Step 6: Dependency Security Check

**If new dependencies added:**

```bash
# Check for vulnerabilities
cd backend
npm audit

cd ../frontend
npm audit
```

**Checklist:**
- [ ] No critical vulnerabilities
- [ ] High vulnerabilities reviewed and acceptable
- [ ] Dependencies are from official/trusted sources
- [ ] No deprecated packages

**If critical vulnerabilities found:**
→ 🛑 DO NOT MERGE
→ Fix or find alternative
→ Re-run audit

---

## Step 7: Breaking Changes Check

**Review PR for breaking changes:**

**Checklist:**
- [ ] No API endpoint removals (or deprecated properly)
- [ ] No database field removals (or migration handles it)
- [ ] No environment variable removals (or documented)
- [ ] Frontend compatible with backend changes
- [ ] No changes to session/authentication logic (high risk)

**If breaking changes exist:**
→ Document in PR
→ Plan rollback strategy
→ Consider phased rollout (feature flags)

---

## Step 8: Merge Feature to Main

**⚠️ LAST CHANCE TO STOP**

If everything above is ✅, proceed:

```bash
# Switch to main
git checkout main

# Pull latest
git pull origin main

# Merge feature branch
git merge feature/feature-name --no-ff

# Verify merge
git log --oneline -3
```

**Checklist:**
- [ ] Merged successfully (no conflicts)
- [ ] Merge commit created
- [ ] Commit message is clear
- [ ] No accidental files included

**If merge conflicts:**
→ Resolve carefully
→ Test again after resolving
→ Verify conflict resolution is correct

---

## Step 9: Pre-Push Final Verification

**⚠️ FINAL CHECKPOINT - READ CAREFULLY**

```bash
# Verify you're on main
git branch --show-current
# Must output: main

# Review what will be pushed
git log origin/main..HEAD

# Check git status
git status
# Must be clean or only showing merge commit
```

**Checklist:**
- [ ] On `main` branch
- [ ] Merge commit exists
- [ ] No unexpected commits included
- [ ] Git status is clean

---

## Step 10: Review Deployment Pipeline

**Read deployment guide:**

```bash
# Review what will happen
cat docs/02-guides/deployment/cd-deploy-guide.md
```

**Understand the pipeline:**
1. Pre-Deploy Checks (~30s)
2. GCP Authentication (~20s)
3. SSH Setup (~15s)
4. Pull Latest Code (~30s)
5. Cloudflare Credentials Sync (~10s)
6. Container Rebuild (~2-3min)
7. Health Check (~30s)
8. Deployment Verification (~15s)

**Total Duration**: ~4-5 minutes

**Checklist:**
- [ ] Understand deployment steps
- [ ] Know where to monitor (GitHub Actions)
- [ ] Ready to watch deployment in real-time
- [ ] Rollback plan ready (if needed)

---

## Step 11: Notify and Prepare

**Before pushing:**

```bash
# Ensure you can monitor deployment
gh auth status
# Must be authenticated

# Open GitHub Actions page in browser
# https://github.com/your-org/charhub-reviewer/actions
```

**Checklist:**
- [ ] GitHub CLI authenticated
- [ ] Browser ready to watch Actions
- [ ] Ready to monitor for next 10 minutes
- [ ] No other critical tasks pending (full attention needed)

---

## Step 12: Push to Main (Triggers Deploy)

**⚠️ THIS TRIGGERS PRODUCTION DEPLOYMENT**

```bash
# Push to main
git push origin main

# IMMEDIATELY start monitoring
gh run watch
```

**Checklist:**
- [ ] Push successful
- [ ] GitHub Actions workflow started
- [ ] Monitoring deployment in real-time

---

## Next Steps

After push:
→ **Execute**: `deploy-monitoring.md` checklist
→ Watch deployment actively for 5-10 minutes
→ Do NOT walk away until deployment verified

---

## Emergency Rollback

**If you realize there's a critical issue BEFORE pushing:**

```bash
# Reset main to previous state
git reset --hard origin/main

# Re-test and fix issue
```

**If you already pushed and need to rollback:**
→ Execute `rollback.md` checklist immediately

---

## Common Pre-Deploy Mistakes

**Forgot to sync .env.production:**
→ Backend will use old environment variables
→ New features may crash or behave incorrectly

**Didn't test database migration:**
→ Migration fails in production
→ Production database in inconsistent state

**Merged with failing tests:**
→ Production deployment succeeds but feature broken
→ Users encounter errors immediately

**Pushed without monitoring:**
→ Deployment fails silently
→ Production is down, you don't know

**Didn't document breaking changes:**
→ Frontend breaks with new backend
→ Difficult to diagnose and rollback

---

## See Also

- `env-validation.md` - Environment variables checklist (CRITICAL)
- `deploy-monitoring.md` - How to monitor deployment
- `rollback.md` - Emergency rollback procedure
- `../../02-guides/deployment/cd-deploy-guide.md` - Deployment details
