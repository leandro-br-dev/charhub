# Incident Report: Dangling Commits Data Loss

**Date:** 2025-12-31
**Severity:** HIGH
**Status:** Resolved
**Affected Components:** Frontend (Character pages UI)
**Data Loss:** ~470 lines of code (ImagesTab.tsx)

---

## Summary

During merge of `main` branch into `feature/character-image-generation-fixes`, approximately **470 lines of code** were lost from the character pages UI. The lost code was in a dangling merge commit created by `git stash` during a previous merge attempt.

---

## Impact

**Lost Files:**
- `ImagesTab.tsx`: 805 lines → 336 lines (-469 lines)
- `[characterId]/index.tsx`: UI enhancements lost
- `IdentityTab.tsx`: Form improvements lost

**Timeline:**
- ~30 minutes to detect the loss
- ~30 minutes to recover from dangling commit
- Total incident duration: ~1 hour

**User Impact:** None (caught before deployment)

---

## Root Cause Analysis

### What Happened

The lost code was in commit `18e2049` - a **dangling merge commit** created by `git stash` during a previous merge:

```
commit 18e2049c01bfe1206dbd36527cde55023633ec6c
Merge: 7442bc2 70938aa
Author: git stash <git@stash>
```

### Why This Happened

1. A previous merge attempt created conflicts
2. Someone ran `git stash` to save work
3. Git created a merge commit with stash changes
4. The stash was never properly applied or committed
5. The merge commit became "dangling" (not reachable from HEAD)
6. When we merged `main` later, git ignored the dangling commit
7. We used `git checkout --theirs` which accepted main's version, losing our work

### Fatal Command Sequence

```bash
# Step 1: Merge with conflicts
git merge main
# CONFLICTS occurred

# Step 2: FATAL ERROR - Used --theirs for translation files
git checkout --theirs translations/hi-in/characters.json

# Step 3: Committed without checking for dangling commits
git commit -m "Merge remote-tracking branch 'main'"
```

### Why This Was Wrong

- `git checkout --theirs` tells git "accept their version, discard ours"
- This is correct for **compiled files** (translations, generated code)
- But we should have checked if "our" version contained work not yet committed
- The dangling commit `18e2049` contained work that was never integrated into HEAD

---

## Detection

### How We Found It

1. Build succeeded, tests passed
2. Manual testing revealed missing features
3. File line count check showed drastic reduction:
   ```bash
   wc -l ImagesTab.tsx
   # Expected: ~805 lines
   # Actual: 336 lines
   ```
4. Git diff showed massive deletions in merge commit

### Symptoms

- **Sudden line count decrease** in files we'd been working on
- **Missing features** we knew we implemented
- **No build errors** (code was syntactically valid, just incomplete)

---

## Resolution

### Recovery Steps

1. **Found dangling commits:**
   ```bash
   git fsck --full --no-reflogs --unreachable --lost | grep commit
   ```

2. **Identified the lost work:**
   ```bash
   git show 18e2049:frontend/src/pages/(characters)/shared/components/ImagesTab.tsx
   ```

3. **Restored the files:**
   ```bash
   git checkout 18e2049 -- frontend/src/pages/(characters)/shared/components/ImagesTab.tsx
   git checkout 18e2049 -- frontend/src/pages/(characters)/[characterId]/index.tsx
   git checkout 18e2049 -- frontend/src/pages/(characters)/shared/components/IdentityTab.tsx
   ```

4. **Committed the recovery:**
   ```bash
   git add .
   git commit -m "fix: restore lost files from dangling commit 18e2049"
   git push origin feature/character-image-generation-fixes
   ```

5. **Verified restoration:**
   ```bash
   wc -l ImagesTab.tsx  # Confirmed: 805 lines restored
   npm run build        # Confirmed: builds successfully
   ```

---

## Lessons Learned

### What Went Wrong

1. ❌ **Used `git stash` during merge conflicts** (created dangling commit)
2. ❌ **Used `git checkout --theirs` without investigation** (blindly discarded our work)
3. ❌ **Didn't verify file line counts after merge** (should have detected immediately)
4. ❌ **No backup branch created before merge** (would have made recovery easier)

### What Went Right

1. ✅ **Detected before deployment** (manual testing caught the issue)
2. ✅ **Recovery was possible** (dangling commits still in git database)
3. ✅ **Quick recovery** (found and restored within 30 minutes)

---

## Preventive Measures Implemented

### Documentation Created/Updated

1. **Created:** `docs/agents/coder/merge-safety-guide.md`
   - Safe merge procedures
   - Conflict resolution strategy
   - Recovery procedures

2. **Updated:** `docs/agents/coder/checklists/pr-creation.md`
   - Added pre-merge safety checks
   - Mandatory backup branch creation
   - File line count verification after merge

3. **Updated:** `docs/agents/reviewer/checklists/pr-merge-conflicts.md`
   - Added detection of outdated PR branches
   - Verification of unintentional deletions

### New Safety Rules

1. **NEVER** use `git checkout --theirs` without first examining what you're discarding
2. **ALWAYS** check for stashes and uncommitted changes before merging
3. **NEVER** resolve conflicts without understanding both sides
4. **ALWAYS** create a backup branch before major merges
5. **ALWAYS** verify file line counts after merging
6. **NEVER** commit a merge without verifying the diff

### Automation Opportunities

- Consider git hooks to warn about large file deletions during merge
- Add pre-commit hook to check for dangling commits
- Create script to automatically create backup branches before merge

---

## Related Incidents

- **2026-01-10:** [Git Reset Hard Data Loss](2026-01-10-git-reset-hard-data-loss.md) - Similar issue, different root cause

---

## References

- **Recovery Procedure:** [recovery-procedures.md](recovery-procedures.md)
- **PR Merge Conflicts Checklist:** [docs/agents/reviewer/checklists/pr-merge-conflicts.md](../../agents/reviewer/checklists/pr-merge-conflicts.md)
- **Git Safety Guide:** [docs/agents/coder/CLAUDE.md](../../agents/coder/CLAUDE.md#git-safety-comandos-proibidos)

---

## Action Items

- [x] Restore lost files from dangling commit
- [x] Document incident and root cause
- [x] Create merge safety guide
- [x] Update PR creation checklist
- [x] Update PR review checklist
- [x] Train agents on new procedures

---

**Report Created By:** Agent Reviewer
**Last Updated:** 2026-01-10
