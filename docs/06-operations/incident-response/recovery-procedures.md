# Code Recovery Procedures

**Purpose:** Emergency procedures for recovering lost code from git

**When to use:** Code was accidentally deleted, reset, or lost during git operations

**Last Updated:** 2026-01-10

---

## 🚨 Emergency Quick Reference

**If you just realized code was lost:**

```bash
# 1. STOP - Don't do anything else that might overwrite git history
# 2. Check reflog (most common recovery method)
git reflog -20

# 3. Find dangling commits (if reflog doesn't help)
git fsck --full --no-reflogs --unreachable --lost | grep commit

# 4. If found, restore
git show <commit-hash>:path/to/file > path/to/file

# 5. If not found, check backup branches
git branch -a | grep backup

# 6. Last resort - reset to earlier reflog state
git reset --hard HEAD@{n}  # where n is the step before loss
```

---

## 📋 Step-by-Step Recovery Procedures

### Step 1: Don't Panic - Assess the Situation

**CRITICAL: Do NOT execute any more git commands until you understand what was lost!**

1. **Identify what was lost:**
   - Which files are missing?
   - When was the last time you saw them?
   - Were they ever committed?

2. **Stop and document:**
   ```bash
   # Take a snapshot of current state
   git status > /tmp/git-status-before-recovery.txt
   git log --oneline -20 > /tmp/git-log-before-recovery.txt
   git branch -a > /tmp/git-branches-before-recovery.txt
   ```

---

### Step 2: Check the Reflog (Most Common Solution)

**What is reflog:** Git's local history of where HEAD has been (even after resets!)

```bash
# View recent HEAD movements
git reflog -20

# Example output:
# 449316c HEAD@{0}: commit: docs(git-safety): implement comprehensive measures
# b29ce02 HEAD@{1}: reset: moving to origin/main
# 6c84c3e HEAD@{2}: commit: feat(images): complete Phase 2 fixes
# 7442bc2 HEAD@{3}: commit: feat(images): reference generation fixes
```

**Look for:**
- Commits before the loss occurred
- "reset" entries that might have discarded work
- "checkout" entries that switched branches

**To restore from reflog:**

```bash
# Option A: Restore specific files from a reflog entry
git show HEAD@{n}:path/to/file.tsx > path/to/file.tsx

# Option B: Reset entire branch to earlier state
git reset --hard HEAD@{n}

# Option C: Create new branch from reflog point (safer)
git branch recovery-branch HEAD@{n}
git checkout recovery-branch
# Verify files are there, then merge back
```

**Example:**
```bash
# You see that HEAD@{2} was before the loss
git show HEAD@{2}:frontend/src/components/Modal.tsx > frontend/src/components/Modal.tsx

# Verify file was restored
cat frontend/src/components/Modal.tsx

# Commit the recovery
git add frontend/src/components/Modal.tsx
git commit -m "recovery: restore Modal.tsx from HEAD@{2}"
```

---

### Step 3: Check for Dangling Commits

**What are dangling commits:** Commits that exist in git database but aren't reachable from any branch

**Why they exist:**
- Created by `git stash` during merge
- Orphaned by `git reset --hard`
- Lost during branch deletion

```bash
# Find all dangling commits
git fsck --full --no-reflogs --unreachable --lost | grep commit

# Example output:
# unreachable commit 18e2049c01bfe1206dbd36527cde55023633ec6c
# unreachable commit 70938aa84b2e9c7d8e1f3a5b4c6d2e8f9a0b1c3d
```

**Investigate each dangling commit:**

```bash
# View commit details
git show 18e2049

# Check commit date and author
git log --oneline --format="%h %ai %an: %s" -1 18e2049

# List files in the commit
git show --name-only 18e2049

# View specific file from dangling commit
git show 18e2049:path/to/file.tsx
```

**If you found your lost work:**

```bash
# Restore specific files
git checkout 18e2049 -- path/to/file.tsx

# Or restore entire commit to new branch
git branch recovery-from-dangling 18e2049
git checkout recovery-from-dangling

# Verify and merge back
git checkout main
git merge recovery-from-dangling
```

---

### Step 4: Check for Stashes

**What are stashes:** Saved work that was stashed with `git stash`

```bash
# List all stashes
git stash list

# Example output:
# stash@{0}: WIP on feature: 7442bc2 feat(images): fixes
# stash@{1}: On main: work in progress before merge
```

**View stash contents:**

```bash
# Show what's in a stash
git stash show stash@{0}

# Show full diff
git stash show -p stash@{0}

# List files in stash
git stash show --name-only stash@{0}
```

**Restore from stash:**

```bash
# Apply stash (keeps it in stash list)
git stash apply stash@{0}

# Or pop stash (removes from stash list)
git stash pop stash@{0}

# If conflicts occur, resolve manually
```

---

### Step 5: Check Backup Branches

**If you created backup branches before risky operations:**

```bash
# List all backup branches
git branch -a | grep backup

# Example output:
# backup-20260110143022
# backup-20260109120000
```

**Restore from backup:**

```bash
# View what's in the backup
git log backup-20260110143022 --oneline -10

# Compare with current state
git diff HEAD backup-20260110143022

# Restore specific files from backup
git checkout backup-20260110143022 -- path/to/file.tsx

# Or merge entire backup
git merge backup-20260110143022
```

---

### Step 6: Check Remote Branches (GitHub)

**If work was pushed to GitHub before loss:**

```bash
# Fetch latest from remote
git fetch origin

# List remote branches
git branch -r

# Check if feature branch exists on remote
git log origin/feature/your-feature-name --oneline -10

# Restore from remote
git checkout origin/feature/your-feature-name -- path/to/file.tsx

# Or reset local branch to remote
git reset --hard origin/feature/your-feature-name
```

---

### Step 7: Last Resort - Check Compiled Artifacts

**If source files are lost but compiled/built files exist:**

Sometimes compiled files in `dist/`, `build/`, or Docker containers may have traces of lost code.

```bash
# Check compiled backend files
cat backend/dist/config/credits.js

# Check Docker container files
docker exec <container> cat /app/src/config/credits.ts

# These won't give you exact source, but can help remember what was changed
```

**This is NOT a real recovery method, but can help:**
- Remember what changes were made
- Reimplement faster based on compiled output
- Verify if recovery from other methods is correct

---

## 🔍 How to Detect if Data Was Lost

### After a Merge

```bash
# Check line count of key files
wc -l frontend/src/pages/**/*.tsx

# Compare with previous commit
git diff HEAD~1 HEAD --stat | grep -E "\.tsx$|\.ts$"

# Look for drastic line reductions
# Example: "ImagesTab.tsx | 469 ----" ← MAJOR DATA LOSS!

# Check for deleted files
git diff HEAD~1 HEAD --name-status | grep "^D"
```

### Symptoms of Data Loss

1. **Sudden line count decrease** in files you've been working on
2. **Missing features** you know you implemented
3. **Build errors** for components that should exist
4. **Test failures** for functionality you added
5. **Merge commit shows massive deletions** unexpectedly

---

## 🛠️ Prevention is Better Than Recovery

### If Recovery Failed

**If none of the above methods found your code:**

1. ✅ **Accept the loss** - Work was never committed
2. ✅ **Learn from the incident** - Document what went wrong
3. ✅ **Implement safeguards** - Prevent future occurrences
4. ✅ **Reimplement** - Start over with lessons learned

**Future prevention:**

1. **Commit every 30-60 minutes:**
   ```bash
   git add .
   git commit -m "wip: describe what you just did"
   git push origin HEAD
   ```

2. **Create backup before risky operations:**
   ```bash
   git branch backup-$(date +%Y%m%d%H%M%S)
   ```

3. **Verify working directory before checkout:**
   ```bash
   git status  # MUST show "working tree clean"
   ```

---

## 📚 Recovery Decision Tree

```
Code was lost! What do I do?
├─ Was it ever committed?
│  ├─ YES → Check reflog (Step 2)
│  │  ├─ Found? → Restore from reflog
│  │  └─ Not found? → Check dangling commits (Step 3)
│  └─ NO → ❌ UNRECOVERABLE (was never in git)
│     └─ Can only reimplement
│
├─ Check reflog (Step 2)
│  ├─ Found commit? → Restore and DONE ✅
│  └─ Not found? → Continue to Step 3
│
├─ Check dangling commits (Step 3)
│  ├─ Found commit? → Restore and DONE ✅
│  └─ Not found? → Continue to Step 4
│
├─ Check stashes (Step 4)
│  ├─ Found stash? → Apply/pop and DONE ✅
│  └─ Not found? → Continue to Step 5
│
├─ Check backup branches (Step 5)
│  ├─ Found backup? → Restore and DONE ✅
│  └─ Not found? → Continue to Step 6
│
├─ Check remote branches (Step 6)
│  ├─ Found on GitHub? → Reset to remote and DONE ✅
│  └─ Not found? → Recovery FAILED ❌
│
└─ Recovery FAILED
   └─ Accept loss, document incident, reimplement with safeguards
```

---

## 🎯 Common Recovery Scenarios

### Scenario 1: Accidentally reset --hard

```bash
# You ran: git reset --hard HEAD~5
# And lost 5 commits

# SOLUTION: Use reflog
git reflog -10
# Find entry BEFORE the reset (e.g., HEAD@{1})
git reset --hard HEAD@{1}
# ✅ Commits restored!
```

---

### Scenario 2: Deleted branch with unmerged work

```bash
# You deleted: git branch -D feature/my-work
# And the work wasn't merged

# SOLUTION: Find last commit of deleted branch
git reflog | grep "my-work"
# Found: 7442bc2 HEAD@{15}: commit: last commit on my-work

# Recreate branch
git branch feature/my-work 7442bc2
# ✅ Branch restored!
```

---

### Scenario 3: Merge conflict resolved incorrectly

```bash
# After merge, you realize you discarded important changes

# SOLUTION: Find pre-merge state
git reflog | grep "merge"
# Found: HEAD@{2}: commit: merge main into feature

# Check what was lost
git diff HEAD HEAD@{2}

# Restore lost files
git checkout HEAD@{2} -- path/to/file.tsx
git commit -m "recovery: restore lost changes from merge"
# ✅ Changes restored!
```

---

### Scenario 4: Dangling commits from failed merge

```bash
# Previous merge left dangling commits with your work

# SOLUTION: Find and restore
git fsck --lost | grep commit
# Found: unreachable commit 18e2049

# Check if it has your work
git show 18e2049

# Restore
git checkout 18e2049 -- path/to/file.tsx
git commit -m "recovery: restore from dangling commit"
# ✅ Work restored!
```

---

## 📞 When to Give Up

**Recovery is IMPOSSIBLE if:**

1. ❌ Code was **never committed** (not in git database)
2. ❌ `.git` directory was deleted
3. ❌ Enough time passed that reflog expired (default 90 days)
4. ❌ `git gc --aggressive --prune=now` was run (purges dangling commits)

**In these cases:**
- Accept the loss
- Document the incident
- Implement prevention measures
- Reimplement the work

---

## 📚 Related Documentation

- **Git Safety Guide:** [docs/agents/coder/CLAUDE.md](../../agents/coder/CLAUDE.md#git-safety-comandos-proibidos)
- **Git Safety Pre-Flight:** [docs/agents/coder/checklists/git-safety-pre-flight.md](../../agents/coder/checklists/git-safety-pre-flight.md)
- **Incident #1:** [2025-12-31-dangling-commits-data-loss.md](2025-12-31-dangling-commits-data-loss.md)
- **Incident #2:** [2026-01-10-git-reset-hard-data-loss.md](2026-01-10-git-reset-hard-data-loss.md)

---

**Remember:** The best recovery is **prevention**. Commit often, push frequently, create backups!
