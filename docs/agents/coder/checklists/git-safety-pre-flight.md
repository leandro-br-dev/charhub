# Git Safety Pre-Flight Checklist

**When to use:** BEFORE any git command that changes branches, merges, or resets

**Duration:** 2 minutes

**Purpose:** Prevent code loss from git operations

**Execute BEFORE:**
- Any `git checkout <branch>`
- Any `git merge main`
- Any `git reset`
- Any potentially destructive operation

---

## 🚨 CRITICAL: This Checklist Prevents Data Loss

**Context:**
- We've lost code TWICE due to skipping these checks
- Git operations like `checkout`, `reset`, `merge` can silently discard uncommitted work
- 2 minutes of checking can save 4+ hours of reimplementation

**Rule:** Complete ALL checks below before proceeding with git operation.

---

## ✅ Pre-Flight Checks (Complete ALL)

### 1. Verify Current Branch

```bash
git branch --show-current
```

**Expected output:**
```
feature/your-feature-name
```

**Checklist:**
- [ ] Confirmed which branch I'm on
- [ ] This is the correct branch for the operation I'm about to do
- [ ] I am NOT accidentally on `main` (unless intentionally working on main)

**⚠️ If on wrong branch:**
- STOP! Don't proceed with the operation
- Figure out why you're on the wrong branch
- Switch to correct branch first (after completing this checklist)

---

### 2. Check Working Directory Status

```bash
git status
```

**Expected output (SAFE):**
```
On branch feature/your-feature
nothing to commit, working tree clean
```

**Unexpected output (DANGEROUS):**
```
On branch feature/your-feature
Changes not staged for commit:
  modified:   backend/src/config/credits.ts
  modified:   frontend/src/components/Modal.tsx
```

**Checklist:**
- [ ] `git status` output shows "nothing to commit, working tree clean"
- [ ] OR I have consciously decided to commit/stash changes before proceeding

**⚠️ If working directory NOT clean:**
- ❌ **STOP! DO NOT PROCEED WITH GIT OPERATION!**
- ⚠️ You have uncommitted changes that WILL BE LOST!
- Go to Step 3 to handle them safely

---

### 3. If Working Directory NOT Clean: Save Your Work

**You have uncommitted changes. You MUST do ONE of these:**

#### Option A: Commit Changes (RECOMMENDED)

```bash
# Commit your work
git add .
git commit -m "wip: [describe what you're working on]"

# Push to GitHub (CRITICAL - creates backup!)
git push origin HEAD

# Verify working directory is now clean
git status
# Should show: "nothing to commit, working tree clean"
```

**Examples of good WIP commit messages:**
- `wip: implement credit calculation logic`
- `wip: add validation to settings form`
- `wip: create UserProfile component`

**Checklist:**
- [ ] Changes committed with descriptive message
- [ ] Pushed to GitHub (`git push origin HEAD`)
- [ ] `git status` now shows "working tree clean"

---

#### Option B: Stash Changes (Alternative)

```bash
# Stash your work with description
git stash push -m "[describe what you're stashing]"

# Verify working directory is now clean
git status
# Should show: "nothing to commit, working tree clean"

# NOTE: Remember to apply stash later!
# git stash list  # See your stashes
# git stash pop   # Apply most recent stash
```

**When to use stash:**
- You're in the middle of something and not ready to commit
- Changes are experimental and you're not sure if you'll keep them
- You need to quickly switch context

**⚠️ WARNING:** Stashes can be forgotten! Prefer commits + push.

**Checklist:**
- [ ] Changes stashed with descriptive message
- [ ] `git status` now shows "working tree clean"
- [ ] Made a note to apply stash later

---

### 4. Create Backup (For Risky Operations)

**Execute this step if you're about to:**
- Merge main into your branch
- Run `git reset` (even with --soft)
- Resolve merge conflicts
- Do anything that could potentially mess up your branch

```bash
# Create backup branch with timestamp
git branch backup-$(date +%Y%m%d%H%M%S)

# Verify backup was created
git branch | grep backup
```

**Expected output:**
```
  backup-20260110143022
```

**Why backup:**
- Takes 1 second to create
- Can save hours of recovery work
- If operation goes wrong, you can recover: `git checkout backup-20260110143022`

**Checklist:**
- [ ] Backup branch created (or operation is low-risk and doesn't need backup)
- [ ] Backup name includes timestamp for easy identification

---

### 5. Final Verification Before Proceeding

**Run one more time:**
```bash
git status
```

**MUST show:**
```
On branch feature/your-feature
nothing to commit, working tree clean
```

**Final checklist:**
- [ ] ✅ Working tree is clean
- [ ] ✅ On correct branch
- [ ] ✅ Backup created (if doing risky operation)
- [ ] ✅ All important work is committed or stashed

---

## 🚀 Safe to Proceed

**✅ All checks passed?**

You may now execute your git command safely.

**Example:**
```bash
# NOW safe to checkout another branch
git checkout main

# Or merge
git merge main

# Or reset (with backup!)
git reset --soft HEAD~1
```

---

## ❌ If ANY Check Failed

**DO NOT PROCEED!**

**Go back and:**
1. Commit or stash uncommitted changes
2. Verify you're on the correct branch
3. Create backup if doing risky operation
4. Re-run this checklist

**Remember:** 2 minutes of safety checks > 4 hours of code reconstruction

---

## 📚 See Also

- **[merge-safety-guide.md](../merge-safety-guide.md)** - Detailed guide on safe merging
- **[pr-creation.md](pr-creation.md)** - Includes pre-merge safety checks
- **[../CLAUDE.md](../CLAUDE.md)** - Git Safety section with prohibited commands

---

## 🎯 Common Scenarios

### Scenario: "I want to switch to main to update it"

```bash
# STEP 1: Run this checklist first!
git status  # Check if clean
git branch --show-current  # Verify current branch

# STEP 2: If not clean, commit
git add .
git commit -m "wip: save work before switching to main"
git push origin HEAD

# STEP 3: NOW safe to switch
git checkout main
git pull origin main
```

---

### Scenario: "I want to merge main into my feature branch"

```bash
# STEP 1: Run this checklist first!
git status  # Check if clean
git branch --show-current  # Verify on feature branch (NOT main!)

# STEP 2: If not clean, commit
git add .
git commit -m "wip: save work before merging main"
git push origin HEAD

# STEP 3: Create backup
git branch backup-$(date +%Y%m%d%H%M%S)

# STEP 4: NOW safe to merge
git merge main
```

---

### Scenario: "I want to reset last commit"

```bash
# STEP 1: Run this checklist first!
git status  # Check if clean
git branch --show-current  # Verify correct branch

# STEP 2: Create backup (CRITICAL for reset!)
git branch backup-$(date +%Y%m%d%H%M%S)

# STEP 3: NOW safe to reset
git reset --soft HEAD~1  # Undo last commit, keep changes
```

---

**Remember: This checklist has saved us from data loss. Don't skip it!** 🛡️
