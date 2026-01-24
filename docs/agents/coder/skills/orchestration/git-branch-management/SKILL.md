---
name: git-branch-management
description: Manage Git branches for feature development. Use when starting a new feature to verify main is updated and create a new feature branch safely. ALWAYS use git-safety-officer before any Git operations.
---

# Git Branch Management

## Purpose

Safely manage Git branches for feature development, ensuring main stays clean and feature branches follow proper naming conventions.

## When to Use

- Starting work on a new feature (AFTER feature-analysis-planning)
- Need to create a new feature branch
- Need to verify main branch is up to date
- ANY Git operation that could cause data loss

## Critical Rule

**⚠️ ALWAYS use git-safety-officer subagent BEFORE any Git operation**

Git operations that REQUIRE git-safety-officer:
- `git checkout <branch>` - Branch switching
- `git merge main` - Merging main into feature branch
- `git reset --hard` - Resetting commits
- `git rebase` - Rebasing
- Any operation that could cause data loss

## Pre-Flight Checklist

Before ANY Git operation, verify:

```bash
# 1. Check current branch
git branch --show-current

# 2. Check working directory status
git status

# 3. Check for uncommitted changes
git diff --stat

# 4. Verify we're on main (before creating feature)
git branch --show-current | grep main
```

**IF working directory is NOT clean**:
- STOP and do not proceed
- Commit or stash changes first
- Use git-safety-officer for guidance

## Workflow: Create Feature Branch

### Step 1: Verify Main is Up to Date

**Use git-safety-officer to**:
1. Checkout to main (safely)
2. Pull latest changes: `git pull origin main`
3. Verify no merge conflicts
4. Checkout back to feature branch (or create new)

**Command delegation**:
```
"Use git-safety-officer to:
1. Checkout to main
2. Pull latest changes
3. Verify main is up to date"
```

### Step 2: Create Feature Branch

**Branch Naming Convention**:
```
feature/{short-descriptive-name}

Examples:
✅ feature/user-statistics-dashboard
✅ feature/ai-agents-refactor
✅ feature/api-i18n-implementation

❌ feature-123 (use descriptive names)
❌ new-feature (too vague)
❌ main (NEVER work on main directly)
```

**Use git-safety-officer to**:
1. Create new feature branch from main
2. Verify branch was created successfully
3. Confirm we're on the new branch

**Command delegation**:
```
"Use git-safety-officer to create feature branch 'feature/{name}' from main"
```

### Step 3: Verify Branch State

After creating branch, verify:

```bash
# Confirm branch name
git branch --show-current

# Confirm tracking is set up
git branch -vv

# Confirm starting point
git log --oneline -3
```

## Git Flow Direction

**CRITICAL**: Git flow is ALWAYS **main → feature**, NEVER **feature → main**

```
┌─────────────┐         sync         ┌──────────────┐
│     main    │ ───────────────────> │  feature/*   │
│  (read-only)│                      │  (your work)  │
└─────────────┘                      └──────────────┘
       ▲                                        │
       │                                        │ create PR
       │                                        │
       └────────────────────────────────────────┘
           Agent Reviewer merges via PR
```

## Forbidden Operations

| Command | Why It's Forbidden |
|---------|-------------------|
| `git push origin main` | Only Agent Reviewer can push to main |
| `git merge feature main` | Merges feature INTO main (wrong direction) |
| `git checkout main && git merge feature` | Pushes feature code directly to main |
| ANY git push to main | EVER - for any reason |

## Correct Operations

| Command | When to Use |
|---------|-------------|
| `git checkout main && git pull` | NEVER - you don't work in main |
| `git checkout feature && git pull` | Only to update your feature branch |
| `git merge main` (while in feature) | To sync feature with latest main changes |
| `git checkout feature && git merge main` | To bring main changes INTO your feature |

## The Golden Rule

**"Main is READ-ONLY for Agent Coder. You PULL FROM main, you NEVER PUSH TO main."**

### If You Accidentally Pushed to Main

**STOP immediately** and inform Agent Reviewer:
1. Do NOT attempt to fix it yourself
2. Do NOT push more commits to "fix" it
3. Inform Agent Reviewer so they can properly revert via PR workflow

## Branch Status Verification

Regularly verify branch status during development:

```bash
# Check current branch
git branch --show-current

# Check if feature branch is behind main
git fetch origin
git log HEAD..origin/main --oneline

# Check if feature branch has unpushed commits
git log origin/HEAD..HEAD --oneline
```

## Syncing Feature Branch with Main

When main has updates that feature branch needs:

**Use git-safety-officer to**:
1. Ensure working directory is clean
2. Fetch latest from origin: `git fetch origin`
3. Merge main into feature: `git merge origin/main`
4. Resolve any conflicts if they arise
5. Verify merge was successful

**Command delegation**:
```
"Use git-safety-officer to merge latest main changes into feature branch"
```

## Integration with Workflow

This skill is the **SECOND STEP** in the Agent Coder workflow:

```
1. feature-analysis-planning
   ↓
2. git-branch-management (THIS SKILL)
   ↓
3. development-coordination
   ↓
... (continue workflow)
```

## Common Pitfalls

**❌ DON'T**:
- Skip git-safety-officer for ANY Git operation
- Work directly on main branch
- Push feature code to main
- Merge feature INTO main (wrong direction)
- Use `git reset --hard` without safety checks

**✅ DO**:
- ALWAYS use git-safety-officer first
- Work ONLY in feature/* branches
- Pull FROM main, never push TO main
- Verify branch state before operations
- Keep working directory clean

## Quick Reference Commands

```bash
# Check current status
git status

# Show current branch
git branch --show-current

# List all branches
git branch -a

# Create feature branch (via git-safety-officer)
# "Use git-safety-officer to create branch 'feature/{name}'"

# Merge main into feature (via git-safety-officer)
# "Use git-safety-officer to merge origin/main into feature branch"

# Switch branches (via git-safety-officer)
# "Use git-safety-officer to checkout to {branch}"
```

## Remember

**"Never trust, always verify"** - Before ANY Git operation, use git-safety-officer. Every time. No exceptions.
