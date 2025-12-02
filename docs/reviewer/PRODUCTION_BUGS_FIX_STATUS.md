# Production Bugs - Current Fix Status

**Date**: 2025-12-02
**Time**: ~10:30 UTC
**Status**: Fixing BUG-004 (Tags Missing in Database)

---

## Summary

Working to resolve **BUG-004: Tags Not Available in Database** (PRIORITY: HIGH).

The issue is that the `db:seed` script cannot run in the Docker container due to Prisma Query Engine binary permission errors: `Error loading shared library ... Operation not permitted`.

---

## What Was Done

### 1. Dockerfile Fix Applied (3 Iterations)

**Commit 1 (8c6752b)**:
- Added simple `chmod +x` commands for Prisma binaries
- Issue: Files didn't exist at that path yet
- Status: ❌ Failed to resolve the issue

**Commit 2 (612a98e)**:
- Moved chmod commands AFTER copying Prisma generated files
- Used `find` + `exec` to locate and fix permissions across three directories
- Issue: Permissions were set at build time, but runtime issue persisted
- Status: ❌ Still getting "Operation not permitted"

**Commit 3 (c9bbb54 - CURRENT)**:
- Added comprehensive approach:
  - Find + chmod all `libquery_engine*.so*` files in src/generated, dist/generated, and generated
  - Find + chmod all binaries in node_modules
  - **Regenerate Prisma Client** with `npx prisma generate`
- Rationale: The regeneration ensures Prisma Client is properly set up with correct binary paths
- Status: ⏳ Awaiting deployment and testing

### 2. SSH Key Documentation Updated

Created comprehensive guide: `docs/reviewer/SSH_KEY_SETUP.md`
- Methods to copy SSH key from WSL to Windows
- Troubleshooting section added for "cp: cannot stat" error
- Permission setup instructions for Windows

### 3. GitHub Commits Pushed

Three improvements pushed to `main` branch:
```
8c6752b fix(docker): ensure prisma query engine binaries have execute permissions for db:seed
612a98e fix(docker): move prisma binary permissions fix after copying generated files
c9bbb54 fix(docker): regenerate prisma client and ensure execute permissions on binaries
```

GitHub Actions will automatically:
1. Build new Docker image with the latest fixes
2. Deploy to production VM
3. Run startup migration + db:seed

---

## Current Issue: Prisma Binary Permissions in Docker

The error occurring during `db:seed`:
```
Error loading shared library /app/src/generated/prisma/libquery_engine-linux-musl-openssl-3.0.x.so.node: Operation not permitted
```

### Why This Happens

1. Prisma needs to load binary Query Engine at runtime
2. The binary file exists but cannot be executed (permission issue)
3. This prevents ANY database operations (migrations, seed, etc.)

### Why chmod +x Alone Didn't Work

1. Binaries might be in a location that's locked down
2. Docker filesystem might have restrictions
3. File might need to be regenerated/extracted properly

### Why We're Trying npx prisma generate

The `prisma generate` command:
1. Re-extracts the Prisma Client
2. Ensures binaries are properly placed
3. Sets correct permissions during extraction
4. Is safer than manual file operations

---

## Next Steps

### Immediate (Once Deployment Completes)

1. **Wait for GitHub Actions** to rebuild containers (~5 minutes)
2. **SSH to production VM** and check backend logs
3. **Try db:seed again**:
   ```bash
   ssh -i ~/.ssh/google_compute_engine leandro_br_dev_gmail_com@34.66.66.202
   cd /mnt/stateful_partition/charhub
   sudo /var/lib/toolbox/bin/docker-compose exec -T backend npm run db:seed
   ```

4. **Verify results**:
   ```bash
   # Check tag count
   sudo /var/lib/toolbox/bin/docker-compose exec -T postgres psql -U postgres -h postgres -d charhub -c "SELECT COUNT(*) FROM \"Tag\";"

   # Check plan count
   sudo /var/lib/toolbox/bin/docker-compose exec -T postgres psql -U postgres -h postgres -d charhub -c "SELECT COUNT(*) FROM \"Plan\";"
   ```

### If This Still Doesn't Work

Alternative approach (last resort):
- Skip Prisma seed for now
- Manually populate tags via SQL script
- Or use `db:seed:tags` specific seed if that works

### For User (Windows Setup)

1. **Copy SSH Key from WSL to Windows**:
   ```powershell
   wsl ls -la /root/.ssh/
   # If files exist, then:
   wsl cp /root/.ssh/google_compute_engine "/mnt/c/Users/Leandro/.ssh/google_compute_engine"
   wsl cp /root/.ssh/google_compute_engine.pub "/mnt/c/Users/Leandro/.ssh/google_compute_engine.pub"
   ```

2. **Set file permissions** (Windows PowerShell as admin):
   ```powershell
   $path = "C:\Users\Leandro\.ssh\google_compute_engine"
   $acl = Get-Acl $path
   $acl.SetAccessRuleProtection($true, $false)
   $rule = New-Object System.Security.AccessControl.FileSystemAccessRule("$env:USERNAME", "FullControl", "Allow")
   $acl.SetAccessRule($rule)
   Set-Acl -Path $path -AclObject $acl
   ```

3. **Connect in DBeaver** using the guide: `docs/reviewer/DATABASE_CONNECTION_GUIDE.md`

---

## Outstanding Production Bugs

| Bug | Severity | Status | Assigned To |
|-----|----------|--------|-------------|
| BUG-001: Plans Tab Crash | 🔴 CRITICAL | Documented | Agent Coder |
| BUG-002: Missing Initial Credits | 🟠 HIGH | Documented | Agent Coder |
| BUG-003: Sidebar Credit Updates | 🟠 HIGH | Documented | Agent Coder |
| BUG-004: Tags Missing in DB | 🟠 HIGH | **IN PROGRESS** | **Agent Reviewer** |

---

## Timeline

- **2025-12-02 10:05**: First Dockerfile fix pushed (commit 8c6752b)
- **2025-12-02 10:12**: Deployment completed, seed failed with binary permission error
- **2025-12-02 10:15**: Second fix pushed (commit 612a98e)
- **2025-12-02 10:20**: Deployment completed, seed still failed
- **2025-12-02 10:25**: Third fix with Prisma regeneration pushed (commit c9bbb54)
- **2025-12-02 10:30+**: Awaiting deployment and testing

---

## Documentation References

- **Production Issues**: `docs/reviewer/PRODUCTION_ISSUES_STATUS.md`
- **SSH Key Setup**: `docs/reviewer/SSH_KEY_SETUP.md`
- **Database Connection**: `docs/reviewer/DATABASE_CONNECTION_GUIDE.md`
- **User Notes**: `docs/USER_FEATURE_NOTES.md`
- **Agent Tasks**: `docs/reviewer/AGENT_CODER_NEXT_SPRINT.md`

---

## Troubleshooting Notes

If db:seed fails again, the issue might be:

1. **Docker filesystem permissions** - Need to verify with `docker inspect` command
2. **Alpine Linux incompatibility** - Prisma binaries might not work on musl
3. **Missing library dependencies** - Might need additional Alpine packages
4. **Filesystem mounting issues** - Volume permissions in docker-compose

In that case, an alternative would be to:
- Create a custom SQL seed script instead of using npm run db:seed
- Or skip seeding tags and populate them manually via SQL
- Or investigate if there's a different Prisma build needed for Alpine Linux
