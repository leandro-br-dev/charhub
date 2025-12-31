# Checklist: PR Review - Handling Merge Conflicts & Outdated Branches

**Critical**: This checklist MUST be executed for EVERY PR review BEFORE approval.

---

## 🎯 Purpose

When multiple agents work in parallel on the same codebase, PRs can become outdated or have merge conflicts. As the **Guardian of the Code**, you must ensure that merging PRs never causes loss of features or functionality.

**Your Role**: Combine features from multiple agents, NOT choose one over the other.

---

## 📋 Pre-Review Verification

### Step 1: Check if PR Branch is Up-to-Date

```bash
# Checkout the PR branch
gh pr checkout <PR-number>

# Check the merge base (where branch diverged from main)
git merge-base HEAD origin/main

# Check how many commits behind main
git log --oneline $(git merge-base HEAD origin/main)..origin/main
```

**Decision**:
- ✅ If 0-2 commits behind: PR is recent, proceed with normal review
- ⚠️ If 3-10 commits behind: PR is moderately outdated, check for conflicts
- 🚨 If 10+ commits behind: PR is severely outdated, MUST update before review

### Step 2: Identify Files Modified in BOTH Main and PR

```bash
# Files changed in PR branch
git diff origin/main...HEAD --name-only > /tmp/pr-files.txt

# Files changed in main since PR was created
git diff $(git merge-base HEAD origin/main)..origin/main --name-only > /tmp/main-files.txt

# Find overlapping files
comm -12 <(sort /tmp/pr-files.txt) <(sort /tmp/main-files.txt)
```

**If overlapping files exist**: HIGH RISK of feature loss during merge.

### Step 3: Check for Unintentional Deletions

```bash
# Compare PR branch to main (NOT main to PR!)
git diff origin/main...HEAD --name-status | grep "^D"
```

**Expected Output**: Empty (no deletions) OR only files intentionally removed by the PR.

**If deletions found**:
1. Review EACH deleted file
2. Verify deletion is intentional (mentioned in PR description)
3. If NOT intentional → PR is outdated, features will be lost

---

## 🚨 CRITICAL: When PR is Outdated

### Symptoms of Outdated PR

- [ ] PR branch is 10+ commits behind main
- [ ] PR modifies files that were also modified in main
- [ ] `git diff origin/main...HEAD` shows deletions of files/code that PR didn't intend to remove
- [ ] PR has merge conflicts

### ❌ WRONG Approach (What I Did Before)

```
1. Tell Agent Coder: "Your branch is outdated, please update"
2. Agent Coder runs: git merge main
3. Agent Coder resolves conflicts (may discard features accidentally)
4. I approve PR without verifying conflict resolution
→ RESULT: Features lost
```

### ✅ CORRECT Approach (What I Must Do)

**YOU are responsible for updating the PR and resolving conflicts correctly.**

```bash
# 1. Checkout PR branch
gh pr checkout <PR-number>

# 2. Update branch with latest main
git fetch origin
git merge origin/main

# 3. IF CONFLICTS OCCUR:
#    a. Identify conflicting files
git status | grep "both modified"

#    b. For EACH conflicting file:
#       - Understand what main added (new feature)
#       - Understand what PR added (new feature)
#       - COMBINE both features (don't choose one)

#    c. Example: dashboard.tsx conflict
#       - Main added: infinite scroll hooks
#       - PR added: filter hooks
#       - SOLUTION: Keep BOTH hooks

#    d. Mark conflict as resolved
git add <file>

# 4. Complete the merge
git commit -m "chore: merge main to update PR branch with latest features

Combined features:
- Feature from main: [describe]
- Feature from PR: [describe]

Resolved conflicts by preserving both implementations."

# 5. Verify combined features work
#    Run tests, build, check manually if needed

# 6. Push updated branch
git push origin HEAD

# 7. Re-test the PR (CI should re-run)
# 8. THEN approve
```

---

## 📋 Checklist: Resolve Merge Conflicts

When conflicts occur, use this process:

### For EACH Conflicting File:

- [ ] **Read the ENTIRE main version** of the file
  ```bash
  git show origin/main:<file-path>
  ```

- [ ] **Read the ENTIRE PR version** of the file
  ```bash
  git show HEAD:<file-path>
  ```

- [ ] **Identify what main added** since PR was created
  ```bash
  git diff $(git merge-base HEAD origin/main):path/to/file origin/main:path/to/file
  ```

- [ ] **Identify what PR added**
  ```bash
  git diff $(git merge-base HEAD origin/main):path/to/file HEAD:path/to/file
  ```

- [ ] **Combine BOTH changes** in the merged version
  - If main added function A, keep it
  - If PR added function B, keep it
  - If both modified function C, combine the modifications
  - NEVER discard working code unless explicitly replacing it

- [ ] **Test the combined version**
  ```bash
  # If TypeScript
  npm run build

  # If tests exist for this file
  npm test -- path/to/file.test.ts
  ```

- [ ] **Verify imports and dependencies**
  - If main added new imports, keep them
  - If PR added new imports, keep them
  - Remove only duplicate imports

---

## 🎯 Real Example: Infinite Scroll Loss

### What Happened (WRONG)

```typescript
// MAIN (954ace0) - Had infinite scroll
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useCardsPerRow } from '../../hooks/useCardsPerRow';

// PR (db7e7b7) - Based on old commit, added filters
import { useCharacterFilters } from '../../hooks/useCharacterFilters';
import { FilterPanel } from '../../components/filters';

// CONFLICT RESOLUTION (WRONG - Agent Coder kept only PR version)
import { useCharacterFilters } from '../../hooks/useCharacterFilters';
import { FilterPanel } from '../../components/filters';
// ❌ LOST: useInfiniteScroll, useCardsPerRow
```

### What Should Have Happened (CORRECT)

```typescript
// CONFLICT RESOLUTION (CORRECT - Agent Reviewer combines both)
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useCardsPerRow } from '../../hooks/useCardsPerRow';
import { useCharacterFilters } from '../../hooks/useCharacterFilters';
import { FilterPanel } from '../../components/filters';
// ✅ KEPT: All features from both main and PR
```

---

## 🚨 Red Flags That Require Immediate Action

If ANY of these occur, STOP and investigate before approving:

- [ ] PR shows 100+ lines deleted that weren't mentioned in PR description
- [ ] PR deletes entire functions/components that are still in use
- [ ] PR deletes imports for features that should still exist
- [ ] `git diff main...HEAD --stat` shows many more deletions than additions
- [ ] PR branch is 20+ commits behind main
- [ ] Multiple files have merge conflicts

**Action**: Update PR branch yourself and resolve conflicts correctly.

---

## 📊 Post-Merge Verification

After merging a PR with conflicts:

- [ ] Verify all features from main still work
  ```bash
  # Example: If main had infinite scroll
  curl -s https://charhub.app | grep "useInfiniteScroll"
  ```

- [ ] Run smoke tests for BOTH the PR feature AND main features
- [ ] Check for console errors in browser (frontend)
- [ ] Monitor first 15 minutes after deployment

---

## 🎓 Key Principles

1. **You are the Guardian of the Code** - NOT just an approver
2. **Multiple agents working in parallel is NORMAL** - handle it gracefully
3. **Merge conflicts are YOUR responsibility** - not Agent Coder's
4. **COMBINE features, never discard** - unless explicitly replacing
5. **Outdated PR = YOUR job to update** - verify conflict resolution yourself
6. **When in doubt, preserve code** - deleting is easy, recovering is hard

---

## 📝 Summary

| Scenario | Agent Coder Role | Agent Reviewer Role |
|----------|------------------|---------------------|
| PR is up-to-date | Implement feature ✅ | Review & approve ✅ |
| PR is outdated | Implement feature ✅ | Update PR branch ✅<br>Resolve conflicts ✅ |
| Merge conflicts | N/A (not their job) | Combine features ✅<br>Test combined code ✅ |
| Features lost | N/A | **PREVENT THIS** ✅ |

**Remember**: Agent Coder implemented their feature correctly. If the merge causes feature loss, **that's on YOU**, not them.

---

## ✅ Final Checklist Before Approving ANY PR

- [ ] PR branch is up-to-date with main (or I updated it)
- [ ] No unintentional deletions detected
- [ ] Merge conflicts resolved by COMBINING features
- [ ] All features from main are preserved
- [ ] All features from PR work correctly
- [ ] Tests pass
- [ ] Build succeeds
- [ ] Manual verification of combined features

**If you can't check all boxes → DO NOT APPROVE**
