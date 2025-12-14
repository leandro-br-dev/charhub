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

### 3.1 TypeScript Compilation

**⚠️ CRITICAL**: This catches type errors before runtime

```bash
cd backend

# Compile TypeScript
npm run build
```

**Checklist:**
- [ ] TypeScript compilation succeeds
- [ ] No type errors
- [ ] No missing type declarations
- [ ] Build output in `dist/` looks correct

**If compilation fails:**
→ DO NOT PROCEED
→ Request changes in PR
→ Tag Agent Coder with specific error

### 3.2 Linting

```bash
cd backend

# Run ESLint
npm run lint
```

**Checklist:**
- [ ] No linting errors
- [ ] Warnings are acceptable (document if many)
- [ ] Code follows style guide

### 3.3 Unit Tests

```bash
cd backend

# Run all tests
npm test

# Or run with coverage
npm test -- --coverage
```

**Checklist:**
- [ ] All tests pass
- [ ] No flaky tests (run twice if suspicious)
- [ ] Coverage is reasonable (>70% for new code)
- [ ] No skipped tests without explanation

**If tests fail:**
→ Read error messages carefully
→ Check if test database is clean
→ Verify test environment variables
→ Request changes if legitimate failures

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

### 4.1 TypeScript + Vite Build

**⚠️ CRITICAL**: This catches missing i18n keys and type errors

```bash
cd frontend

# Build production bundle
npm run build
```

**Checklist:**
- [ ] Build succeeds
- [ ] No TypeScript errors
- [ ] No missing i18n translation keys
- [ ] No import errors
- [ ] Bundle size is reasonable

**Common build failures:**
- Missing translation keys → Add to `backend/src/i18n/locales/`
- Type errors → Fix TypeScript issues
- Import errors → Check file paths

### 4.2 Frontend Linting

```bash
cd frontend

# Run ESLint
npm run lint
```

**Checklist:**
- [ ] No linting errors
- [ ] Warnings are acceptable

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
