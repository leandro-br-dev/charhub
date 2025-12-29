# Local Testing Checklist

**When to use**: After PR code review passes

**Duration**: ~10-20 minutes

**Critical Level**: 🔴 MANDATORY - Never merge without local testing

---

## Step 1: Install Dependencies

**If `package.json` changed, install dependencies:**

```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..
```

**Checklist:**
- [ ] Backend dependencies installed without errors
- [ ] Frontend dependencies installed without errors
- [ ] No peer dependency warnings (or acceptable)
- [ ] `node_modules/` size is reasonable (not bloated)

---

## Step 2: Clean Environment Setup

**Stop and remove all containers:**

```bash
# Stop all containers and remove volumes
docker compose down -v

# Remove dangling images (optional, saves disk space)
docker image prune -f

# Start fresh
docker compose up -d --build

# Wait for containers to be healthy
sleep 30
```

**Checklist:**
- [ ] All containers started successfully
- [ ] No errors in `docker compose up` output
- [ ] Postgres is healthy
- [ ] Backend is healthy
- [ ] Frontend is healthy (if in compose)

**Verify container health:**
```bash
docker compose ps
# All should show "healthy" or "running"
```

---

## Step 3: Backend Tests

**⚠️ CRITICAL: Use CI-equivalent validation scripts**

### 3.1 Run CI Local Validation Script

**This replicates EXACTLY the GitHub Actions CI environment:**

```bash
cd backend

# Run the same checks as GitHub Actions
./scripts/ci-local.sh
```

**This script runs in order:**
1. `npm ci` (deterministic install like CI)
2. ESLint
3. TypeScript type checking (`tsc --noEmit`)
4. Unit tests
5. Production build

**Checklist:**
- [ ] Script completes with "✓ ALL CHECKS PASSED"
- [ ] No errors in any of the 5 steps
- [ ] Test database is running (`docker compose up -d`)

**If script fails:**
→ DO NOT PROCEED
→ Fix the specific failing step
→ Re-run `./scripts/ci-local.sh` until all pass
→ Request changes in PR if issues persist

**Why use this script?**
- Prevents "works locally but fails in CI" issues
- Uses `npm ci` instead of `npm install` (same as CI)
- Runs checks in same order as GitHub Actions
- Catches issues before they block deployment

### 3.2 Alternative: Run Individual Commands

**Only if you need to debug a specific failure:**

```bash
cd backend

# TypeScript compilation
npm run build

# Linting
npm run lint

# Tests
npm test
```

**But ALWAYS run the full CI script before approving the PR.**

### 3.4 Database Migration (If Applicable)

**If PR includes schema changes:**

```bash
cd backend

# Check pending migrations
npm run prisma:migrate:status

# Apply migrations
npm run prisma:migrate:dev

# Verify schema
npm run prisma:studio
# Open http://localhost:5555
# Check tables/fields exist
```

**Checklist:**
- [ ] Migration applied successfully
- [ ] Database schema matches `schema.prisma`
- [ ] Seed data works (if applicable)
- [ ] No data loss in migration (test with sample data)

---

## Step 4: Frontend Tests

**⚠️ CRITICAL: Use CI-equivalent validation script**

### 4.1 Run CI Local Validation Script

**This replicates EXACTLY the GitHub Actions CI environment:**

```bash
cd frontend

# Run the same checks as GitHub Actions
./scripts/ci-local.sh
```

**This script runs in order:**
1. `npm ci` (deterministic install like CI)
2. ESLint (if configured)
3. TypeScript type checking (`tsc --noEmit`)
4. Unit tests with **`CI=true`** (stricter than local tests)
5. Production build with production env vars

**Checklist:**
- [ ] Script completes with "✓ ALL CHECKS PASSED"
- [ ] No errors in any of the 5 steps
- [ ] No missing i18n translation keys in build
- [ ] Tests pass with `CI=true` (stricter mode)

**If script fails:**
→ DO NOT PROCEED
→ Fix the specific failing step
→ Re-run `./scripts/ci-local.sh` until all pass
→ Request changes in PR if issues persist

**Why use this script?**
- **`CI=true`** makes tests stricter (same as GitHub Actions)
- Prevents warnings from becoming errors in CI
- Uses production environment variables for build
- Catches missing i18n keys before deployment

**Common build failures:**
- Missing translation keys → Add to `backend/src/i18n/locales/`
- Type errors → Fix TypeScript issues
- Import errors → Check file paths
- Tests pass locally but fail with `CI=true` → Fix console warnings

### 4.2 Alternative: Run Individual Commands

**Only if you need to debug a specific failure:**

```bash
cd frontend

# Build
npm run build

# Linting
npm run lint

# Tests (NOTE: Use CI=true to match GitHub Actions!)
CI=true npm test
```

**But ALWAYS run the full CI script before approving the PR.**

---

## Step 5: Translation Compilation

**If PR adds new user-facing text:**

```bash
cd backend

# Compile translation files
npm run translations:compile

# Restart backend to load new translations
docker compose restart backend

# Wait for backend to be healthy
sleep 10
docker compose logs backend --tail=50
```

**Checklist:**
- [ ] Translations compiled without errors
- [ ] New translation keys exist in both `en.json` and `pt-BR.json`
- [ ] Backend restarted successfully
- [ ] No warnings about missing translations in logs

**Verify in browser:**
- [ ] English text displays correctly
- [ ] Portuguese text displays correctly (change language in app)
- [ ] No translation key placeholders visible (like `t('some.key')`)

---

## Step 6: Manual Feature Testing

**Open http://localhost:8081 in browser**

### 6.1 Test Happy Path

**Checklist:**
- [ ] Feature works as described in PR
- [ ] UI renders correctly
- [ ] Buttons/forms are functional
- [ ] Data persists correctly
- [ ] Navigation works

### 6.2 Test Error Cases

**Checklist:**
- [ ] Invalid form input shows error messages
- [ ] Network errors handled gracefully
- [ ] 404/403/500 errors show user-friendly messages
- [ ] Required fields validated

### 6.3 Browser Console Check

**Open DevTools (F12) → Console**

**Checklist:**
- [ ] No JavaScript errors
- [ ] No React warnings
- [ ] No i18n missing key warnings
- [ ] Network requests succeed (check Network tab)

### 6.4 Backend Logs Check

```bash
# Watch backend logs while testing
docker compose logs -f backend
```

**Checklist:**
- [ ] No errors in backend logs
- [ ] API requests logged correctly
- [ ] No unexpected warnings
- [ ] Database queries execute successfully

---

## Step 7: Cross-Feature Testing

**Test that existing features still work:**

**Checklist:**
- [ ] Login/OAuth still works
- [ ] Character chat still works
- [ ] File uploads still work (if applicable)
- [ ] Credits system still works (if applicable)
- [ ] Other core features not broken by changes

**Why?** Ensure no regressions introduced

---

## Step 8: Database State Verification

**If PR modifies database:**

```bash
# Open Prisma Studio
cd backend
npm run prisma:studio
# Opens http://localhost:5555
```

**Checklist:**
- [ ] New tables/fields exist
- [ ] Sample data created correctly
- [ ] Relations work (foreign keys)
- [ ] Data types are correct
- [ ] Constraints enforced (unique, not null, etc.)

---

## Step 9: Performance Check (Optional)

**For performance-critical features:**

```bash
# Check backend response times
docker compose logs backend | grep -i "request"

# Check memory usage
docker stats --no-stream
```

**Checklist:**
- [ ] Response times < 500ms for typical requests
- [ ] Memory usage reasonable (not growing indefinitely)
- [ ] No N+1 query problems (check logs)

---

## Step 10: Document Test Results

**If tests pass:**
→ Proceed to `pre-deploy.md` checklist

**If tests fail:**
→ Request changes in PR:

```bash
gh pr comment <PR-number> --body "Local testing failed:

**TypeScript**: ✅ Pass / ❌ Fail
**Linting**: ✅ Pass / ❌ Fail
**Unit Tests**: ✅ Pass / ❌ Fail
**Build**: ✅ Pass / ❌ Fail
**Manual Testing**: ✅ Pass / ❌ Fail

**Issues found:**
- Issue 1
- Issue 2

**Logs:**
\`\`\`
[paste relevant error logs]
\`\`\`
"

gh pr review <PR-number> --request-changes
```

---

## Common Issues

### TypeScript compilation fails
```
Error: Cannot find module 'X'
```
→ Missing import or type definition
→ Check `tsconfig.json` paths
→ Run `npm install` again

### Tests fail with database errors
```
Error: relation "table_name" does not exist
```
→ Run migrations: `npm run prisma:migrate:dev`
→ Reset test database if needed

### Frontend build fails with i18n errors
```
Error: Missing translation key 'some.key'
```
→ Add key to `backend/src/i18n/locales/en.json`
→ Add key to `backend/src/i18n/locales/pt-BR.json`
→ Rebuild translations: `npm run translations:compile`

### Docker containers unhealthy
```
backend | Error: ECONNREFUSED 127.0.0.1:5432
```
→ PostgreSQL not ready yet, wait longer
→ Check: `docker compose logs postgres`
→ Restart if needed: `docker compose restart backend`

---

## See Also

- `pr-review.md` - Code review before testing
- `pre-deploy.md` - Next step after tests pass
- `../../02-guides/development/testing-strategy.md` - Testing philosophy
