# Testing Checklist

**When to use**: Feature implementation complete, ready to test before PR

**Duration**: 15-45 minutes (depending on feature complexity)

**Output**: Verified working feature with all tests passing

---

## 📋 Quick Checklist

- [ ] **TypeScript compilation** (backend + frontend)
- [ ] **Linting** (backend + frontend)
- [ ] **Unit tests** (backend)
- [ ] **Docker environment** (clean restart)
- [ ] **Manual testing** (happy path + edge cases)
- [ ] **Translation validation** (no missing keys)
- [ ] **Console checks** (no errors/warnings)
- [ ] **API verification** (if backend changes)

---

## 🔍 Detailed Steps

### 1. TypeScript Compilation

**Why**: Catches type errors before PR. TypeScript errors will fail GitHub Actions.

**Backend**:
```bash
cd backend
npm run build
```

**Expected output**:
```
✓ TypeScript compiled successfully
✓ No type errors found
```

**Frontend**:
```bash
cd frontend
npm run build
```

**Expected output**:
```
✓ Vite build completed
✓ All translation keys found
✓ Build output in dist/
```

**⚠️ Common Issues**:
- `Type 'X' is not assignable to 'Y'` → Check database schema, verify Prisma types
- `Property 'X' does not exist` → Run `npm run prisma:generate` if schema changed
- `Cannot find module` → Check imports, verify file paths

---

### 2. Linting

**Why**: Enforces code style consistency. Linting errors will fail GitHub Actions.

**Backend**:
```bash
cd backend
npm run lint
```

**Frontend**:
```bash
cd frontend
npm run lint
```

**Expected output**:
```
✓ No linting errors found
```

**⚠️ Common Issues**:
- `Unexpected console.log` → Remove debug logs or use proper logging
- `'X' is defined but never used` → Remove unused imports/variables
- `Missing return type` → Add explicit return types to functions

**Auto-fix**:
```bash
npm run lint -- --fix
```

---

### 3. Unit Tests (Backend)

**Why**: Validates business logic, catches regressions.

```bash
cd backend
npm test
```

**Expected output**:
```
✓ All tests passed
✓ Coverage: X%
```

**⚠️ Common Issues**:
- Tests fail after database changes → Update test fixtures, verify migrations
- `Connection refused` → Ensure PostgreSQL/Redis running in Docker
- Timeout errors → Increase test timeout or optimize slow operations

**Run specific test**:
```bash
npm test -- path/to/test.spec.ts
```

**Debug mode**:
```bash
npm test -- --verbose
```

---

### 4. Docker Environment (Clean Restart)

**Why**: Tests in production-like environment, catches environment-specific issues.

**Restart containers** (preserves database data):
```bash
# Stop containers (WITHOUT deleting database volumes)
docker compose down

# Rebuild and start
docker compose up -d --build

# Wait for services to be ready (20-30 seconds)
sleep 30
```

**⚠️ CRITICAL: Database Data Preservation**

- **ALWAYS use**: `docker compose down` (without `-v`) for restarts
- **NEVER use**: `docker compose down -v` without explicit user authorization
- **Why**: The `-v` flag deletes ALL database data, making testing difficult
- **Features need data**: Many features (infinite scroll, filters, etc.) only work properly with sufficient test data
- **Exception**: Only use `-v` if user explicitly requests database reset

**Check status**:
```bash
docker compose ps
```

**Expected output**:
```
NAME           STATUS   PORTS
backend        Up       0.0.0.0:3001->3001/tcp
frontend       Up       0.0.0.0:8082->80/tcp
postgres       Up       0.0.0.0:5432->5432/tcp
redis          Up       0.0.0.0:6379->6379/tcp
```

**⚠️ All services MUST show "Up" status**

**View logs**:
```bash
# Backend logs
docker compose logs -f backend

# Frontend logs
docker compose logs -f frontend

# All logs
docker compose logs -f
```

**⚠️ Common Issues**:

**Backend won't start**:
```bash
# Check logs for errors
docker compose logs backend | tail -50

# Common causes:
# - Missing environment variables (check .env)
# - Database migration failed (check PostgreSQL logs)
# - Port 3001 already in use (kill existing process)
```

**Frontend won't start**:
```bash
# Check logs
docker compose logs frontend | tail -50

# Common causes:
# - Backend not responding (check backend health first)
# - Build failed (check TypeScript compilation)
```

**Database connection errors**:
```bash
# Verify PostgreSQL is running
docker compose ps postgres

# Check PostgreSQL logs
docker compose logs postgres

# Test connection
docker compose exec backend npx prisma db pull
```

---

### 5. Manual Feature Testing

**Why**: Catches UX issues, validates real-world behavior.

**Access application**:
```
http://localhost:8082
```

**Test checklist**:
- [ ] **Happy path**: Feature works as expected
- [ ] **Authentication**: Test with logged-in/logged-out users
- [ ] **Permissions**: Test different user roles (if applicable)
- [ ] **Edge cases**: Empty data, long text, special characters
- [ ] **Error handling**: Test invalid inputs, network failures
- [ ] **UI responsiveness**: Test on desktop (resize browser window)
- [ ] **Loading states**: Verify spinners/skeletons appear during data fetch
- [ ] **Success feedback**: Verify toast messages, success states

**Example test scenarios**:

**For API changes**:
```bash
# Test with curl
curl -X POST http://localhost:3001/api/v1/endpoint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"field": "value"}'

# Or use Postman/Insomnia
```

**For UI changes**:
1. Open browser at http://localhost:8082
2. Navigate to affected page
3. Interact with new feature
4. Verify translations appear correctly
5. Check browser console for errors

**For background jobs**:
1. Trigger job via API or UI
2. Check backend logs: `docker compose logs -f backend`
3. Verify job appears in Redis queue
4. Wait for job completion
5. Verify expected side effects (database changes, notifications, etc.)

---

### 6. Translation Validation

**Why**: Missing translation keys break frontend build, cause runtime errors.

**Check for missing keys**:
```bash
cd frontend

# Build will fail if keys missing
npm run build
```

**If translations added**:
```bash
cd backend

# Compile translations (generates JSON for frontend)
npm run translations:compile
```

**Verify translations appear**:
1. Open http://localhost:8082
2. Navigate to feature
3. Verify all text appears (not `translation.missing` or empty)
4. Check browser console for translation warnings

**⚠️ Common Issues**:
- `Translation key 'X' not found` → Add key to `/frontend/public/locales/en/[namespace].json`
- Translations don't update → Restart Docker containers after adding keys
- Wrong namespace → Verify `useTranslation('namespace')` matches file name

---

### 7. Console Checks

**Why**: Errors in console indicate issues that may not be immediately visible.

**Backend console**:
```bash
docker compose logs backend | tail -100
```

**Look for**:
- ✅ No ERROR or WARNING messages
- ✅ API requests logging correctly
- ✅ Database queries executing
- ⚠️ Unexpected errors or stack traces

**Frontend console**:
1. Open http://localhost:8082
2. Open browser DevTools (F12)
3. Check Console tab

**Look for**:
- ✅ No red error messages
- ✅ No yellow warnings (or only expected warnings)
- ✅ API calls completing successfully (check Network tab)
- ⚠️ 404 errors, failed requests, React errors

**Common console errors**:
- `Failed to fetch` → Backend not running or wrong URL
- `Uncaught TypeError` → JavaScript/React error, check component code
- `Translation missing` → Add missing translation keys
- `401 Unauthorized` → Authentication issue, check token

---

### 8. API Verification (If Backend Changes)

**Why**: Validates API contract, ensures frontend can communicate.

**Check health endpoint**:
```bash
curl http://localhost:3001/api/v1/health
```

**Expected output**:
```json
{
  "status": "ok",
  "timestamp": "2025-12-30T..."
}
```

**Test your new endpoint**:
```bash
# Example: Test character creation
curl -X POST http://localhost:3001/api/v1/characters \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Character",
    "description": "Test"
  }'
```

**Verify**:
- [ ] Returns expected status code (200, 201, etc.)
- [ ] Response matches expected schema
- [ ] Validation errors return 400 with helpful messages
- [ ] Authentication errors return 401
- [ ] Authorization errors return 403

---

## 🚨 Common Issues & Solutions

### TypeScript Errors After Database Changes

**Problem**: Prisma types out of sync

**Solution**:
```bash
cd backend
npm run prisma:generate
npm run build
```

---

### Tests Pass Locally But Fail in Docker

**Problem**: Environment differences (paths, ports, environment variables)

**Solution**:
1. Check environment variables in `.env`
2. Verify Docker containers can communicate
3. Check port mappings in `docker-compose.yml`
4. Review container logs for specific errors

---

### Frontend Build Fails with Translation Errors

**Problem**: Missing or incorrect translation keys

**Solution**:
1. Check error message for missing key name
2. Add key to `frontend/public/locales/en/[namespace].json`
3. Restart frontend container: `docker compose restart frontend`
4. Rebuild frontend: `cd frontend && npm run build`

---

### Manual Testing Shows Broken Feature

**Problem**: Feature doesn't work as expected in browser

**Steps to diagnose**:
1. Check browser console for JavaScript errors
2. Check Network tab for failed API calls
3. Check backend logs: `docker compose logs backend | tail -100`
4. Verify database state: `docker compose exec postgres psql -U postgres -d charhub`
5. Check Redis queue (if background jobs): Use Redis CLI or backend API

---

### Docker Containers Won't Start

**Problem**: Port conflicts, resource issues, configuration errors

**Solution**:
```bash
# Stop everything (preserves database data)
docker compose down

# Check for port conflicts
lsof -i :3001  # Backend port
lsof -i :8082  # Frontend port
lsof -i :5432  # PostgreSQL port
lsof -i :6379  # Redis port

# Kill conflicting processes if found
kill -9 <PID>

# Clean restart (preserves database data)
docker compose up -d --build
```

**⚠️ Note**: If you suspect database corruption (rare), ask user for permission to reset: `docker compose down -v`

---

### Performance Issues in Local Environment

**Problem**: Slow API responses, sluggish UI

**Causes**:
- Database not indexed (check query performance)
- Resource-intensive background jobs
- Large file uploads
- Inefficient queries

**Solution**:
1. Profile slow queries (check backend logs)
2. Add database indexes if needed
3. Optimize expensive operations
4. Consider pagination for large datasets

**⚠️ Note**: DO NOT reset database to "fix" performance. Keep test data for realistic testing.

---

## 📚 See Also

- **[pr-creation.md](pr-creation.md)** - Next step: create Pull Request
- **[code-quality.md](code-quality.md)** - Coding standards reference
- **[feature-implementation.md](feature-implementation.md)** - Implementation checklist
- **[../CLAUDE.md](../CLAUDE.md)** - Overall Agent Coder workflow

---

## ✅ Ready for PR?

**Before proceeding to PR creation, verify**:
- [ ] ✅ All TypeScript compiles (backend + frontend)
- [ ] ✅ All linting passes
- [ ] ✅ All unit tests pass
- [ ] ✅ Docker environment running cleanly
- [ ] ✅ Manual testing completed successfully
- [ ] ✅ Translations working
- [ ] ✅ No console errors
- [ ] ✅ API endpoints verified (if applicable)

**If all checks pass** → Proceed to **[pr-creation.md](pr-creation.md)**

**If any check fails** → Fix issues before creating PR

---

**Remember**: Thorough testing prevents wasted review cycles! 🧪
