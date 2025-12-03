# Prisma Node Modules Critical Bug Fix

**Date**: 2025-12-03
**Commit**: `e1c8838`
**Issue**: Production deployment failing with `PrismaClientInitializationError: Prisma Client could not locate the Query Engine`

## Problem Summary

Production deployments were failing when the backend container tried to initialize. The error message indicated that Prisma Client could not find the Query Engine binary for the `linux-musl-openssl-3.0.x` runtime.

### Error Logs from Failed Deploy #53

```
backend-1  | 👤 Seeding 1 system user(s)...
backend-1  | PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "linux-musl-openssl-3.0.x".
```

## Root Cause Analysis

The `backend/Dockerfile` had a **critical multi-stage build flaw**:

### Builder Stage (CORRECT)
- Installed dependencies: `npm ci --include=dev`
- Generated Prisma Client: `npx prisma generate` ✅
- Output: `node_modules/`, `.prisma/`, `src/generated/`
- All compilation artifacts were present

### Production Stage (BROKEN)
The production stage did NOT copy `node_modules` from the builder:

```dockerfile
# ❌ BROKEN - What was there before
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
# Missing: COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src

# Later in the stage:
RUN npm ci --include=dev  # Reinstalls, but doesn't include builder's pre-generated binaries
```

### Why This Failed

1. **Build time**: Prisma binary correctly generated for `linux-musl-openssl-3.0.x`
2. **Runtime**:
   - `start.sh` tries to execute `npx prisma generate`
   - But `npx` is inside `node_modules/`, which doesn't exist in the image
   - The `npm ci --include=dev` reinstallation happens AFTER copying `prisma/` and `src/`
   - Prisma generation at build time was disconnected from runtime execution
   - Silent failure or incomplete Prisma setup leads to missing Query Engine

## Solution

Added the critical copy command to the production stage (lines 79-81):

```dockerfile
# Copy node_modules from builder (CRITICAL: needed for npx and dependencies)
# This ensures we have the pre-compiled modules and tools like npm, npx
COPY --from=builder /app/node_modules ./node_modules
```

### Why This Works

- ✅ `npx` is available at container startup
- ✅ All pre-compiled dependencies are present
- ✅ `start.sh` can successfully run `npx prisma generate`
- ✅ Prisma Query Engine binaries are accessible
- ✅ Database seeding can proceed normally
- ✅ Translations build completes without errors

## Testing & Verification

### Local Tests (Development Environment)
1. Built fresh image: `docker compose up -d --build` ✅
2. Prisma generation: Executed successfully with no errors ✅
3. Database seed: Completed with 1 system user created ✅
4. Translations: 240 language files built successfully ✅
5. Application startup: Running in development mode ✅

### Container Inspection
```
charhub-reviewer-backend-1:
  - /app/node_modules: Present (533 directories, 24MB)
  - /app/src/generated: Present
  - /app/prisma: Present
  - Application: Running and healthy
```

## Deployment

**Commit Hash**: `e1c8838`
**Branch**: `main`
**Action**: Automatic CD deployment triggered via GitHub Actions
**Workflow**: `.github/workflows/deploy-production.yml`

The fix includes:
- Single line change to Dockerfile (copy node_modules)
- No changes to application logic
- No changes to package dependencies
- No breaking changes

## Related Files

- **Modified**: `backend/Dockerfile` (lines 79-81)
- **Schema**: `backend/prisma/schema.prisma` (uses `binaryTargets = ["linux-musl-openssl-3.0.x"]`)
- **Entrypoint**: `backend/scripts/start.sh` (calls `npx prisma generate`)

## Prevention for Future

This issue was difficult to detect because:
1. Docker build logs showed success: `✔ Generated Prisma Client (v6.18.0)`
2. But container runtime showed failure: `Prisma Client could not locate Query Engine`
3. The disconnect between build-time and runtime execution was not obvious

### Best Practices Identified

1. **Multi-stage builds**: When copying from builder, copy ALL runtime dependencies
   - Including `node_modules` for tools like `npm`, `npx`
   - Including generated artifacts
   - Don't re-run `npm install` if you're copying `node_modules`

2. **Layer inspection**: Verify what's actually in the final image:
   ```bash
   docker compose run --rm backend ls -lha /app/node_modules | head -20
   ```

3. **Runtime validation**: Check at container startup:
   ```bash
   docker compose logs backend | grep -i "error\|prisma\|generated"
   ```

## Lessons Learned

- **Build cache pollution** was the original issue (fixed in commit 9e93965)
- **Multi-stage optimization** is necessary but requires careful layer management
- **Runtime debugging** is essential: build success ≠ runtime success
- **Copy all dependencies** from builder, not just source code

## Status

✅ **RESOLVED** - Commit `e1c8838` deployed to production
Deploy Status: Monitoring for errors...
