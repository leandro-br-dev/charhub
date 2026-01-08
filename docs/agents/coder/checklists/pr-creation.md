# PR Creation Checklist

**When to use**: Feature tested and ready for review

**Duration**: 15-30 minutes

**Output**: Professional Pull Request ready for Agent Reviewer

---

## 📋 Quick Checklist

- [ ] **Update branch with main** (CRITICAL!)
- [ ] **Re-run all tests after merge**
- [ ] **Move feature spec** (`active/` → path documented in spec)
- [ ] **Commit with proper format**
- [ ] **Push to remote**
- [ ] **Create PR with template**
- [ ] **Tag Agent Reviewer**

---

## 🚨 CRITICAL FIRST STEP: Update Branch with Main

**⚠️ DO THIS BEFORE ANYTHING ELSE!**

**Why this is critical:**
- Prevents accidental file deletions when merged
- Catches integration issues early with latest code
- Ensures tests pass with most recent changes
- Avoids wasting Agent Reviewer's time on outdated code
- Prevents losing work from other merged features

**If you skip this step, you risk deleting entire features merged to main since your branch was created!**

---

### Step 1.1: Update Main Branch

```bash
# Switch to main and pull latest changes
git checkout main
git pull origin main
```

**Expected output:**
```
Already on 'main'
Your branch is up to date with 'origin/main'.
```

---

### Step 1.2: Switch Back to Feature Branch

```bash
git checkout feature/your-feature-name
```

---

### Step 1.3: PRE-MERGE SAFETY CHECKS (CRITICAL!)

**🚨 READ [merge-safety-guide.md](../merge-safety-guide.md) if this is your first time!**

**⚠️ BEFORE running `git merge main`, you MUST complete these safety checks to prevent data loss:**

```bash
# 1. Check for unapplied stashes (dangling work)
git stash list

# Expected: Empty output (no stashes)
# ⚠️ If stashes exist: Review each stash and apply or discard them BEFORE merging
#    git stash show stash@{0}     # See what's in the stash
#    git stash apply stash@{0}    # Apply if needed
#    git stash drop stash@{0}     # Discard if not needed
```

**Why this matters:** Stashes can contain uncommitted work that might conflict with the merge. If you have stashes, they may represent work that was saved during a previous failed merge attempt. **Review and handle them BEFORE proceeding!**

```bash
# 2. Check for dangling/unreachable commits
git log --oneline --graph --all --date-order -20

# Look for:
# - Commits that don't connect to any branch
# - "git stash" commits (Author: git stash <git@stash>)
# - WIP commits that should be on HEAD but aren't
```

**What to look for:** The graph should show a clean history with your feature branch connecting to main. If you see commits that "float" disconnected from any branch, investigate them!

```bash
# 3. Create a backup branch (mandatory before merge!)
git branch feature/$(git rev-parse --abbrev-ref HEAD | sed 's/feature\///')-backup-$(date +%Y%m%d%H%M%S)

# Example: Creates "feature/my-feature-backup-20260107103045"
```

**Why backup?** If the merge goes wrong, you can recover from this point. Takes 1 second, can save hours of recovery work!

```bash
# 4. Verify working directory is clean
git status

# Expected output:
# On branch feature/your-feature
# nothing to commit, working tree clean
#
# ⚠️ If you see uncommitted changes:
#    - Review them carefully
#    - Commit them if they're part of your feature
#    - Discard them if they're temporary test changes
```

**Checklist before merge:**
- [ ] `git stash list` → No stashes (or all reviewed and handled)
- [ ] `git log --graph` → No dangling commits visible
- [ ] Backup branch created
- [ ] Working directory clean (`git status`)

**🚨 If ANY of these checks fail, STOP and investigate before merging!**

---

### Step 1.4: Merge Main into Feature Branch

```bash
git merge main
```

**Possible outcomes:**

**✅ No conflicts** (best case):
```
Merge made by the 'recursive' strategy.
 X files changed, Y insertions(+), Z deletions(-)
```

**⚠️ Conflicts detected** (need manual resolution):
```
Auto-merging file.ts
CONFLICT (content): Merge conflict in file.ts
Automatic merge failed; fix conflicts and then commit the result.
```

**If conflicts occur:**

**🚨 CRITICAL: DO NOT USE `git checkout --theirs` OR `--ours` WITHOUT INVESTIGATION!**

These commands discard one side's changes completely. Before using them:

```bash
# For EACH conflicted file, first understand what you're discarding:

# 1. See YOUR version (feature branch)
git show HEAD:path/to/conflicted/file.tsx > /tmp/ours.tsx

# 2. See THEIR version (main branch)
git show main:path/to/conflicted/file.tsx > /tmp/theirs.tsx

# 3. Compare to see what differs
diff /tmp/ours.tsx /tmp/theirs.tsx | head -50

# 4. ONLY THEN decide:
#    - For YOUR work files (code YOU wrote): Manually merge in editor
#    - For GENERATED files (translations, build artifacts): Usually safe to use --theirs
```

**Safe conflict resolution process:**

1. **Identify conflict type:**
   - **Code you wrote** → Manually merge (keep BOTH sides' changes)
   - **Generated files** (translations, `.lock` files) → `git checkout --theirs` is safe
   - **Files you didn't modify** → `git checkout --theirs` is safe

2. **For code files (manual resolution):**
   ```bash
   # Open file in editor
   vim path/to/file.tsx

   # Resolve conflicts by keeping BOTH sets of changes
   # Remove conflict markers: <<<<<<<, =======, >>>>>>>

   # Test the resolved file works
   npm run build

   # Stage it
   git add path/to/file.tsx
   ```

3. **For generated files (auto-resolution):**
   ```bash
   # Safe to accept main's version
   git checkout --theirs translations/*/characters.json
   git add translations/
   ```

4. **After resolving ALL conflicts:**
   ```bash
   git status  # Verify all conflicts resolved
   git add -A
   git commit -m "chore: merge main into feature branch"
   ```

5. **CRITICAL: Verify you didn't lose work:**
   ```bash
   # Check line counts of key files
   git diff HEAD~1 HEAD --stat | grep -E "\.tsx$|\.ts$"

   # Look for drastic line reductions in files you worked on
   # Example: "ImagesTab.tsx | 469 ----" ← ⚠️ MAJOR DATA LOSS!
   ```

---

### Step 1.4: Re-run ALL Tests After Merge

**Why**: Main may have introduced breaking changes, dependency updates, schema changes.

```bash
# Backend TypeScript compilation
cd backend
npm run build

# Frontend TypeScript compilation
cd ../frontend
npm run build

# Backend tests
cd ../backend
npm test

# Docker environment restart (preserves database data)
cd ..
docker compose down
docker compose up -d --build

# Manual testing at http://localhost:8082
```

**⚠️ If any test fails after merge:**
1. **DO NOT proceed with PR creation**
2. Fix the integration issues
3. Re-test until everything passes
4. Only then proceed to next steps

**Common post-merge issues:**
- **TypeScript errors**: Types changed in main → Update your code to match new types
- **Test failures**: Business logic changed → Update your tests or implementation
- **Schema conflicts**: Database schema changed → Regenerate Prisma client: `npm run prisma:generate`
- **Dependency conflicts**: `package.json` changed → Re-run `npm install`

---

### Step 1.4.1: Verify Prisma Migrations Were Generated (If Schema Changed)

**⚠️ CRITICAL: If you modified `backend/prisma/schema.prisma`, you MUST generate and commit the corresponding migration!**

**Why this step is mandatory:**
- Schema changes without migrations WILL BREAK production deployment
- Database will not have the new columns/tables/enums
- Application will crash with PostgreSQL errors at runtime
- **This is the #1 cause of production deployment failures**

**Check if you modified the schema:**
```bash
# Check if schema.prisma was modified in your branch
git diff origin/main...HEAD --name-only | grep schema.prisma

# If output shows "backend/prisma/schema.prisma", you MUST verify migrations!
```

**If schema was modified, verify migration exists:**
```bash
# Check if migration was created
git diff origin/main...HEAD --name-only | grep "prisma/migrations"

# Should show something like:
# backend/prisma/migrations/20260102120000_your_migration_name/migration.sql
```

**⚠️ If schema changed but NO migration found:**

**YOU FORGOT TO CREATE THE MIGRATION! Fix it now:**

```bash
cd backend

# Option 1: Generate migration (if database is running)
npx prisma migrate dev --name describe_your_changes

# Option 2: Create migration manually (if database is down)
# 1. Create migration folder
mkdir -p prisma/migrations/$(date +%Y%m%d%H%M%S)_describe_your_changes

# 2. Write migration SQL based on your schema changes
# Example: Adding a new enum value and field
vim prisma/migrations/$(date +%Y%m%d%H%M%S)_describe_your_changes/migration.sql

# 3. Add migration to git
git add prisma/migrations/
git commit -m "chore(prisma): add migration for schema changes"
git push origin HEAD
```

**Example migration scenarios:**

**Adding a new enum value:**
```sql
-- AlterEnum: Add 'NEW_VALUE' to MyEnum enum
ALTER TYPE "MyEnum" ADD VALUE 'NEW_VALUE';
```

**Adding a new field:**
```sql
-- AlterTable: Add 'myField' column to MyTable
ALTER TABLE "MyTable" ADD COLUMN "myField" TEXT;
```

**Creating a new table:**
```sql
-- CreateTable
CREATE TABLE "MyNewTable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Checklist:**
- [ ] Schema changes have corresponding migration
- [ ] Migration file committed and pushed
- [ ] Migration SQL is correct (matches schema changes)
- [ ] Re-generated Prisma Client: `npm run prisma:generate`

**If you skip this step, your PR WILL BE REJECTED by Agent Reviewer!**

---

### Step 1.5: Verify All Docker Containers Are Healthy

**⚠️ CRITICAL: Common mistake - Agent Coder creates PR without checking if backend is in restart loop!**

**Why this step is mandatory:**
- Backend may compile successfully but crash at runtime
- Containers may be in restart loop due to runtime errors
- Database connection issues may not show in build
- **User cannot test if containers are not healthy!**

```bash
# Run health check script
./scripts/health-check.sh --wait

# This will verify:
# ✓ PostgreSQL is running
# ✓ Redis is running
# ✓ Backend is healthy (NOT in restart loop!)
# ✓ Frontend is running
# ✓ No errors in backend logs
```

**Expected output:**
```
🏥 Docker Services Health Check

  postgres: ✓ Healthy (Up 2 minutes)
  redis:    ✓ Healthy (Up 2 minutes)
  backend:  ✓ Healthy (Up 2 minutes (healthy))
  frontend: ✓ Healthy (Up 2 minutes)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ All services are healthy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Safe to proceed with:
  ✓ Creating Pull Requests
  ✓ Running tests
  ✓ User acceptance testing
```

**⚠️ If health check fails:**
```
✗ Some services are not healthy

  postgres: ✓ Healthy
  redis:    ✓ Healthy
  backend:  ✗ Not healthy (Restarting)  ← PROBLEM!
  frontend: ✓ Healthy

    ⚠️  Backend is in restart loop!
    ⚠️  Errors found in backend logs
```

**DO NOT CREATE PR IF HEALTH CHECK FAILS!**

**Actions required:**
1. Check backend logs: `docker compose logs backend --tail=100`
2. Find and fix the runtime error (common: missing env vars, connection issues)
3. Restart containers: `docker compose restart backend`
4. Re-run health check: `./scripts/health-check.sh --wait`
5. Only proceed when all services are healthy

**Common issues causing unhealthy containers:**
- **Missing environment variables**: Check `.env` files
- **Database connection errors**: Verify `DATABASE_URL` in `.env`
- **Redis connection errors**: Check if Redis is running
- **Code syntax/runtime errors**: Check backend logs for stack traces
- **Port conflicts**: Another service using the same port

**Checklist:**
- [ ] Health check passed (all services healthy)
- [ ] Backend is NOT in restart loop
- [ ] No errors in backend logs
- [ ] All containers responding correctly

---

## 📝 Step 2: Move Feature Spec to Implemented

**Why**: Signals to Agent Planner that feature is ready for review and deployment.

```bash
# Check current location (should be in active/)
ls docs/05-business/planning/features/active/

# Move to implemented/ (or path specified in the spec)
git mv docs/05-business/planning/features/active/your-feature.md \
       docs/05-business/planning/features/implemented/
```

**⚠️ Note**: If feature spec specifies a different destination path, use that instead.

**Update feature spec status:**
```bash
# Edit the moved spec file
vim docs/05-business/planning/features/implemented/your-feature.md
```

**Add to bottom of spec:**
```markdown
## Status Update

**Status**: Ready for Review
**PR Created**: 2025-12-30
**Branch**: feature/your-feature-name
**Agent**: Coder

### Implementation Summary
- [x] Backend API endpoints implemented
- [x] Frontend UI components created
- [x] All tests passing
- [x] Manual testing completed
- [x] i18n implemented

**Ready for Agent Reviewer**
```

---

## 💬 Step 3: Commit Your Changes

**Why**: Professional commit messages help reviewers understand changes.

### Commit Message Format

```
<type>(<scope>): <short description>

<longer description if needed>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Commit Types

- `feat`: New feature (e.g., `feat(dashboard): add character discovery page`)
- `fix`: Bug fix (e.g., `fix(auth): resolve token expiration issue`)
- `refactor`: Code refactoring (e.g., `refactor(api): simplify error handling`)
- `docs`: Documentation only (e.g., `docs(readme): update setup instructions`)
- `test`: Adding/updating tests (e.g., `test(characters): add validation tests`)
- `chore`: Maintenance (e.g., `chore(deps): update dependencies`)
- `style`: Code style/formatting (e.g., `style(frontend): apply prettier`)
- `perf`: Performance improvement (e.g., `perf(api): optimize database queries`)

### Scope Examples

- `auth`: Authentication/authorization
- `dashboard`: Dashboard features
- `characters`: Character management
- `api`: Backend API
- `ui`: Frontend UI components
- `db`: Database/schema
- `i18n`: Internationalization

### Example Commits

**Good commits:**
```bash
git commit -m "feat(dashboard): implement infinite scroll for character discovery

- Add IntersectionObserver for scroll detection
- Fetch characters in pages of 20
- Update CharacterGrid to support pagination
- Add loading skeleton during fetch

Closes #42

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

```bash
git commit -m "fix(auth): prevent token expiration during active sessions

- Implement token refresh 5 minutes before expiry
- Add refresh logic to axios interceptor
- Handle refresh failures gracefully

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**Bad commits** (avoid these):
```bash
git commit -m "fix stuff"
git commit -m "wip"
git commit -m "update"
git commit -m "changes"
```

### Stage and Commit

```bash
# Review what will be committed
git status

# Stage all changes
git add .

# Commit with proper message
git commit -m "feat(scope): description

Details here

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 🚀 Step 4: Push to Remote

```bash
# Push feature branch to GitHub
git push origin feature/your-feature-name
```

**Expected output:**
```
Enumerating objects: X, done.
Counting objects: 100% (X/X), done.
To https://github.com/username/repo.git
 * [new branch]      feature/your-feature-name -> feature/your-feature-name
```

**⚠️ If push rejected:**
```
error: failed to push some refs to 'origin'
hint: Updates were rejected because the remote contains work that you do not have locally.
```

**Solution:**
```bash
# Pull remote changes
git pull origin feature/your-feature-name --rebase

# Resolve conflicts if any
# Re-run tests

# Push again
git push origin feature/your-feature-name
```

---

## 📋 Step 5: Create Pull Request

### Using GitHub CLI (Recommended)

```bash
gh pr create \
  --title "feat(scope): short description" \
  --body "## Summary

### What Changed
- Added X feature
- Implemented Y functionality
- Fixed Z issue

### Why
This feature enables users to [describe benefit].

### Technical Details
- **Backend**: New `/api/v1/endpoint` endpoint with Zod validation
- **Frontend**: New \`ComponentName\` component with i18n support
- **Database**: Added \`tableName\` table with migration

### Testing
- [x] TypeScript compiles (backend + frontend)
- [x] All tests pass
- [x] Manual testing completed
- [x] i18n implemented and verified
- [x] Docker environment tested

### Screenshots (if UI changes)
[Attach screenshots here]

### Related
- Feature spec: \`docs/05-business/planning/features/implemented/feature-name.md\`
- Related issue: #XX (if applicable)

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com)

@agent-reviewer Ready for review"
```

### Using GitHub Web UI (Alternative)

1. Go to GitHub repository
2. Click "Pull requests" tab
3. Click "New pull request"
4. Select base: `main`, compare: `feature/your-feature-name`
5. Click "Create pull request"
6. Fill in title and description (use format above)
7. Tag Agent Reviewer: `@agent-reviewer` at the bottom
8. Click "Create pull request"

---

## ✅ Step 6: Tag Agent Reviewer

**In PR description or comment:**
```
@agent-reviewer This is ready for review.

Summary: [One sentence describing the feature]

Testing completed:
- ✅ All TypeScript compiles
- ✅ All tests pass
- ✅ Docker environment verified
- ✅ Manual testing completed

Please review when available.
```

---

## 🚨 Common Issues & Solutions

### Merge Conflicts During Branch Update

**Problem**: Can't merge main into feature branch due to conflicts.

**Solution:**
1. Identify conflicted files: `git status`
2. Open each file and look for conflict markers
3. Resolve conflicts (keep needed changes from both)
4. Remove markers: `<<<<<<<`, `=======`, `>>>>>>>`
5. Test resolved code thoroughly
6. Stage: `git add .`
7. Commit: `git commit -m "chore: resolve merge conflicts with main"`

---

### Tests Fail After Merging Main

**Problem**: Tests passed before merge, fail after.

**Solution:**
1. Check what changed in main: `git log main --oneline -20`
2. Identify breaking changes (schema, types, APIs)
3. Update your code to work with new changes
4. Regenerate Prisma client if schema changed: `npm run prisma:generate`
5. Re-run tests until all pass

---

### Push Rejected (Remote Has Changes)

**Problem**: Someone else pushed to your branch.

**Solution:**
```bash
# Fetch and rebase
git pull origin feature/your-feature-name --rebase

# Resolve conflicts if any
# Re-test

# Force push (only if you own the branch!)
git push origin feature/your-feature-name --force-with-lease
```

**⚠️ Only use `--force-with-lease` if you're the only one working on the branch!**

---

### Forgot to Update Branch with Main

**Problem**: Already created PR without updating branch.

**Solution:**
1. Close or mark PR as draft (don't delete)
2. Checkout feature branch locally
3. Execute "Update Branch with Main" section above
4. Re-run all tests
5. Push updates: `git push origin feature/your-feature-name`
6. PR will auto-update with new commits
7. Re-request review

---

### Feature Spec Not Found

**Problem**: Can't find feature spec to move.

**Solution:**
1. Check if spec exists: `ls docs/05-business/planning/features/active/`
2. If missing, check implemented: `ls docs/05-business/planning/features/implemented/`
3. If not in implemented either, search: `find docs -name "*feature-name*.md"`
4. If truly missing, create minimal spec documenting what was implemented

---

### PR Description Template Not Found

**Problem**: Template file missing when using `gh pr create`.

**Solution:**

**Create template manually:**
```markdown
## Summary

[Describe what changed and why]

### What Changed
- [List key changes]

### Testing
- [x] TypeScript compiles
- [x] Tests pass
- [x] Manual testing completed

### Related
- Feature spec: [path]

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Or use inline body:**
```bash
gh pr create --title "..." --body "Your description here"
```

---

## 📚 See Also

- **[testing.md](testing.md)** - Previous step: testing your feature
- **[feature-implementation.md](feature-implementation.md)** - Implementation checklist
- **[code-quality.md](code-quality.md)** - Coding standards reference
- **[../CLAUDE.md](../CLAUDE.md)** - Overall Agent Coder workflow

---

## ✅ PR Creation Checklist (Final Verification)

**Before submitting PR, verify:**
- [ ] ✅ Branch updated with latest main
- [ ] ✅ All tests pass after merge
- [ ] ✅ No merge conflicts remaining
- [ ] ✅ Feature spec moved to implemented (or documented path)
- [ ] ✅ Commit message follows format (type, scope, description)
- [ ] ✅ Changes pushed to remote
- [ ] ✅ PR created with descriptive title
- [ ] ✅ PR description complete (summary, testing, related docs)
- [ ] ✅ Agent Reviewer tagged

**If all verified** → Wait for Agent Reviewer feedback

**If any unchecked** → Complete missing steps before submitting

---

## 🎯 After PR Created

**Your responsibilities:**
1. **Monitor PR** - Watch for Agent Reviewer comments
2. **Respond promptly** - Address feedback quickly
3. **Make requested changes** - Fix issues found in review
4. **Re-test after changes** - Run full testing checklist again
5. **Re-request review** - After pushing fixes

**What NOT to do:**
- ❌ Merge your own PR (Agent Reviewer merges)
- ❌ Push directly to main (work only in feature branches)
- ❌ Force push without `--force-with-lease` (can lose work)
- ❌ Ignore review feedback (address all comments)

---

**Remember**: A well-prepared PR = faster review = quicker deployment! 🚀
