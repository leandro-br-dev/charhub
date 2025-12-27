# Pull Request Review Checklist

**When to use**: When Agent Coder creates a PR

**Duration**: ~15-30 minutes depending on PR size

---

## ⚠️ CRITICAL FIRST STEP: Verify Branch is Up-to-Date

**BEFORE reviewing anything else, you MUST verify the PR branch is synchronized with main.**

### Why This is Critical

When merging a PR, Git merges the **complete file state**, not just the changed files:
- Files that exist in `main` but NOT in PR branch → **DELETED** on merge
- This can accidentally remove entire features that were added to main after the PR branch was created

### Verification Commands

```bash
# Fetch latest main
git fetch origin

# Checkout PR branch
gh pr checkout <PR-number>

# Check branch history - should show ONLY PR commits
git log --oneline --graph main...HEAD

# Check actual changes - use THREE dots, not two!
git diff main...HEAD --name-status
```

**Checklist:**
- [ ] `git log main...HEAD` shows ONLY commits from this PR
- [ ] `git diff main...HEAD --name-status` shows ONLY intentional changes
- [ ] No unexpected deletions in diff (check `grep "^D"`)
- [ ] If many commits/deletions appear → Branch is OUTDATED!

### If Branch is Outdated

```bash
# Update branch with latest main
git merge main -m "chore: merge main to update branch"

# Regenerate Prisma client if needed
cd backend && npx prisma generate

# Test builds still pass
cd backend && npm run build
cd frontend && npm run build

# Push updated branch
git push origin HEAD
```

**Then start the review from the beginning with the updated branch.**

---

## Step 1: Initial PR Analysis

```bash
# View PR details
gh pr view <PR-number>

# Check which files changed (use THREE dots!)
git diff main...HEAD --name-only
```

**Checklist:**
- [ ] PR title clearly describes the change
- [ ] PR description explains what was done and why
- [ ] PR references related issue/feature spec (if applicable)
- [ ] Changed files make sense for the feature
- [ ] No unrelated changes included
- [ ] ✅ **Branch is up-to-date with main** (verified above)

---

## Step 2: Checkout PR Branch

```bash
# Fetch latest changes
git fetch origin

# Checkout PR branch
gh pr checkout <PR-number>
# Or manually:
# git checkout -b feature/name origin/feature/name

# Verify you're on correct branch
git branch --show-current
```

**Checklist:**
- [ ] Branch checked out successfully
- [ ] No merge conflicts
- [ ] Branch is up-to-date with main (if not, may need rebase)

---

## Step 3: Code Quality Review

**Read the actual code changes:**

```bash
# View diff
gh pr diff <PR-number>

# Or review specific files
git diff main...HEAD -- path/to/file
```

**Checklist:**

### TypeScript Quality
- [ ] No `any` types (use proper types or `unknown`)
- [ ] Interfaces/types properly defined
- [ ] No `@ts-ignore` or `@ts-expect-error` without explanation
- [ ] Proper error handling with try/catch

### Code Standards
- [ ] Follows existing code patterns
- [ ] Functions are small and focused
- [ ] Variable names are clear and descriptive
- [ ] No commented-out code (unless with explanation)
- [ ] No console.log left in code (unless intentional logging)

### Security
- [ ] No SQL injection vulnerabilities (use Prisma properly)
- [ ] No XSS vulnerabilities (sanitize user input)
- [ ] No secrets/credentials in code
- [ ] User input is validated
- [ ] Authorization checks present where needed

### i18n (Internationalization)
- [ ] All frontend user-visible text uses `t('key')`
- [ ] Translation keys added to `backend/src/i18n/locales/en.json`
- [ ] Translation keys added to `backend/src/i18n/locales/pt-BR.json`
- [ ] No hardcoded strings like "Click here" or "Erro"

---

## Step 4: Database Changes Review

**If PR includes Prisma schema changes:**

```bash
# Check for migration files
ls -la backend/prisma/migrations/

# Review migration SQL
cat backend/prisma/migrations/*/migration.sql
```

**Checklist:**
- [ ] Migration file exists (not just schema.prisma change)
- [ ] Migration SQL is safe (no DROP TABLE without backup plan)
- [ ] New fields have appropriate defaults or are nullable
- [ ] Indexes added where needed for performance
- [ ] Foreign keys and relations properly defined
- [ ] Migration tested locally (see `local-testing.md`)

---

## Step 5: Documentation Review

**Checklist:**
- [ ] Code comments for complex logic
- [ ] JSDoc for public functions/APIs
- [ ] README updated if setup process changed
- [ ] Feature spec updated in `docs/05-business/planning/features/active/`
- [ ] API documentation updated if endpoints changed

**If new environment variables added:**
- [ ] Added to `backend/.env.example`
- [ ] Documented in `docs/03-reference/backend/environment-variables.md`
- [ ] Production values ready in `.env.production` (see `env-validation.md`)

---

## Step 6: Dependencies Review

**If `package.json` changed:**

```bash
# Check what was added/changed
git diff main...HEAD -- backend/package.json
git diff main...HEAD -- frontend/package.json
```

**Checklist:**
- [ ] New dependencies are necessary (not redundant)
- [ ] Dependencies are from trusted sources
- [ ] Versions are pinned (not `^` or `~` for critical deps)
- [ ] No dev dependencies in production `dependencies`
- [ ] `package-lock.json` updated (committed)

**For Dependabot PRs:**
→ See special section in main CLAUDE.md
→ MUST test locally before merge (TypeScript compilation critical)

---

## Step 7: Tests Review

**Checklist:**
- [ ] New features have tests
- [ ] Tests cover happy path
- [ ] Tests cover error cases
- [ ] Tests cover edge cases
- [ ] Test names clearly describe what is being tested
- [ ] No skipped tests (`.skip`) without explanation
- [ ] Mocks are used appropriately (don't mock everything)

**If tests are missing:**
→ Request changes in PR
→ Tag Agent Coder to add tests

---

## Step 8: Request Changes or Approve

**If issues found:**

```bash
# Comment on PR
gh pr comment <PR-number> --body "Please fix:
- [ ] Issue 1
- [ ] Issue 2
"

# Request changes
gh pr review <PR-number> --request-changes --body "See comments above"
```

**If everything looks good:**
→ Proceed to `local-testing.md` checklist
→ Do NOT approve until local tests pass

---

## Common Issues to Watch For

**Missing error handling:**
```typescript
// ❌ Bad
const data = await api.fetch();
return data.result;

// ✅ Good
try {
  const data = await api.fetch();
  return data.result;
} catch (error) {
  logger.error('API fetch failed', error);
  throw new ApiError('Failed to fetch data');
}
```

**Hardcoded strings:**
```typescript
// ❌ Bad
<button>Click here</button>

// ✅ Good
<button>{t('common.clickHere')}</button>
```

**Unsafe database queries:**
```typescript
// ❌ Bad (SQL injection risk)
await prisma.$queryRaw`SELECT * FROM users WHERE id = ${userId}`;

// ✅ Good
await prisma.user.findUnique({ where: { id: userId } });
```

---

## Next Steps

After code review passes:
→ **Execute**: `local-testing.md` checklist
→ If tests pass → **Execute**: `pre-deploy.md` checklist
→ If tests fail → Request changes in PR

---

## See Also

- `local-testing.md` - How to test PR locally
- `../../02-guides/development/git-github-actions.md` - Git workflow
- `../../02-guides/development/testing-strategy.md` - Testing guidelines
