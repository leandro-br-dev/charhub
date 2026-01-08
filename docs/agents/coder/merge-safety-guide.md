# Merge Safety Guide - Preventing Data Loss

**Last Updated**: 2026-01-06
**Severity**: CRITICAL

## 🚨 Critical Incident: Data Loss During Merge

### What Happened

During merge of `main` branch into `feature/character-image-generation-fixes`, approximately **470 lines of code** were lost from the character pages UI.

**Lost Files:**
- `ImagesTab.tsx`: 805 lines → 336 lines (-469 lines)
- `[characterId]/index.tsx`: UI enhancements lost
- `IdentityTab.tsx`: Form improvements lost

### Root Cause Analysis

The lost code was in commit `18e2049` - a **dangling merge commit** created by `git stash` during a previous merge:

```
commit 18e2049c01bfe1206dbd36527cde55023633ec6c
Merge: 7442bc2 70938aa
Author: git stash <git@stash>
```

**Why this happened:**

1. A previous merge attempt created conflicts
2. Someone ran `git stash` to save work
3. Git created a merge commit with stash changes
4. The stash was never properly applied or committed
5. The merge commit became "dangling" (not reachable from HEAD)
6. When we merged `main` later, git ignored the dangling commit
7. We used `git checkout --theirs` which accepted main's version, losing our work

**The fatal command sequence:**
```bash
# Step 1: Merge with conflicts
git merge main
# CONFLICTS occurred

# Step 2: FATAL ERROR - Used --theirs for translation files
git checkout --theirs translations/hi-in/characters.json

# Step 3: Committed without checking for dangling commits
git commit -m "Merge remote-tracking branch 'main'"
```

**Why this was wrong:**
- `--theirs` tells git "accept their version, discard ours"
- This is correct for **compiled files** (translations, generated code)
- But we should have checked if "our" version contained work not yet committed
- The dangling commit `18e2049` contained work that was never integrated into HEAD

---

## ✅ Correct Merge Procedure

### Before ANY Merge

```bash
# 1. Check for dangling/lost commits
git log --oneline --graph --all --date-order -20

# 2. Check for stashes
git stash list

# 3. Check for uncommitted changes
git status

# 4. Check if working directory is clean
git diff HEAD
```

### Safe Merge Process

```bash
# Step 1: Ensure your branch is up to date
git fetch origin
git checkout feature/your-feature
git pull origin feature/your-feature  # Get any remote changes

# Step 2: Update main locally
git fetch origin main
git checkout main
git pull origin main

# Step 3: Return to feature branch
git checkout feature/your-feature

# Step 4: BEFORE MERGING - create backup
git branch feature/your-feature-backup-$(date +%Y%m%d)

# Step 5: Check for any stashes
git stash list
# If stashes exist, either apply them first or note their contents

# Step 6: Perform the merge
git merge main

# Step 7: If conflicts occur, investigate BEFORE resolving
git status

# For EACH conflicted file:
```

### Conflict Resolution Strategy

```bash
# For each conflicted file, FIRST understand what's in each version:

# 1. See "our" changes (your branch)
git show HEAD:path/to/file.tsx > /tmp/ours.tsx

# 2. See "their" changes (main branch)
git show main:path/to/file.tsx > /tmp/theirs.tsx

# 3. Compare to see what you're losing
diff /tmp/ours.tsx /tmp/theirs.tsx

# 4. Then decide resolution strategy:

# A) For WORK files (code you wrote):
#    - Use vim/meld to manually merge
#    - Keep BOTH versions' changes
vim path/to/file.tsx

# B) For GENERATED files (translations, compiled code):
#    - Usually accept "theirs" (main's version)
git checkout --theirs path/to/file
git add path/to/file

# C) For files you haven't touched:
#    - Accept "theirs" (main's version)
git checkout --theirs path/to/file
git add path/to/file

# Step 8: After resolving all conflicts
git add -A

# Step 9: BEFORE COMMITTING - verify
git diff --cached --stat

# Step 10: Commit
git commit -m "Merge main into feature/your-feature"

# Step 11: CRITICAL - Check for lost work
git log --oneline -5
git diff HEAD~1 HEAD --stat

# Step 12: Run builds/tests
npm run build
npm test
```

---

## 🚨 How to Detect if Data Was Lost

### Immediately After Merge

```bash
# Check line count of key files
wc -l frontend/src/pages/**/*.tsx

# Compare with previous commit
git diff HEAD~1 HEAD --stat | grep -E "\.tsx$|\.ts$"

# Look for drastic line reductions
git log --oneline --all -30 -- 'frontend/src/pages/**' | head -20
```

### Symptoms of Data Loss

1. **Sudden line count decrease** in files you've been working on
2. **Missing features** you know you implemented
3. **Build errors** for components that should exist
4. **Test failures** for functionality you added

---

## 🛠️ Recovery Procedure (If Data Loss Occurred)

### Step 1: Don't Panic - Check for Dangling Commits

```bash
# Find all commits (including dangling)
git fsck --full --no-reflogs --unreachable --lost | grep commit

# View dangling commits
git log --oneline --graph --all --date-order -- $(git fsck --full --no-reflogs --unreachable --lost | grep commit | awk '{print $3}')

# Look for WIP or stash commits
git log --all --oneline --author="git stash"
```

### Step 2: Check the Reflog

```bash
# View your recent actions
git reflog -20

# Find the commit before the merge
git reflog show feature/your-feature | head -20
```

### Step 3: Restore Lost Files

```bash
# Option A: If you found the dangling commit
git show <dangling-commit-hash>:path/to/lost/file.tsx > path/to/lost/file.tsx

# Option B: Use git checkout to restore from specific commit
git checkout <dangling-commit-hash> -- path/to/lost/file.tsx

# Option C: If all else fails, use the backup branch
git diff feature/your-feature-backup-YYYYMMDD HEAD -- path/to/file.tsx
```

### Step 4: Verify and Commit

```bash
# Verify the files are restored
git status
git diff HEAD path/to/lost/file.tsx

# Add and commit
git add path/to/lost/file.tsx
git commit -m "fix: restore lost files from dangling commit"
```

---

## 📋 Pre-Merge Checklist

Before creating a PR or merging main, ALWAYS:

- [ ] Checked `git stash list` - no unapplied stashes
- [ ] Checked `git status` - working directory clean
- [ ] Checked `git log --oneline --graph -10` - no unexpected commits
- [ ] Created backup branch
- [ ] Fetched latest `main`
- [ ] Reviewed conflicts BEFORE accepting any resolution
- [ ] For each conflict: compared "ours" vs "theirs"
- [ ] Verified line counts after merge
- [ ] Built and tested after merge

---

## 🔍 Tools for Safer Merging

### Use a Visual Merge Tool

```bash
# Configure a visual diff tool
git config --global merge.tool meld
git config --global mergetool.meld.cmd 'meld "$LOCAL" "$BASE" "$REMOTE" --output "$MERGED"'

# Use it during conflicts
git mergetool
```

### Install git aliases for safety

```bash
# Add to ~/.gitconfig
[alias]
    # Check for stashes before merge
    pre-merge-check = "!f() { git stash list && git status && git log --oneline -5; }; f"

    # Show what will be merged
    see-merge = "!f() { git log --oneline HEAD..main }; f"

    # Find dangling commits
    find-lost = "!f() { git fsck --full --no-reflogs --unreachable --lost | grep commit }; f"
```

---

## 🎯 Golden Rules

1. **NEVER** use `git checkout --theirs` without first examining what you're discarding
2. **ALWAYS** check for stashes and uncommitted changes before merging
3. **NEVER** resolve conflicts without understanding both sides
4. **ALWAYS** create a backup branch before major merges
5. **NEVER** commit a merge without verifying the diff
6. **ALWAYS** run builds/tests after merging
7. **NEVER** push to main without reviewing the merge commit

---

## 📞 Emergency Quick Reference

```bash
# If you just realized you lost data:

# 1. STOP - don't do anything else
# 2. Check reflog
git reflog -20

# 3. Find dangling commits
git fsck --full --no-reflogs --unreachable --lost | grep commit

# 4. If found, restore
git show <commit-hash>:path/to/file > path/to/file

# 5. If not found, check if there's a backup branch
git branch -a | grep backup

# 6. Last resort - git reflog recovery
git reset --hard HEAD@{n}  # where n is the step before merge
```

---

**Remember**: A merge should NEVER result in data loss. If code disappeared, something went wrong and needs immediate investigation.
