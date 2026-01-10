# Incident Report: Git Reset Hard Data Loss

**Date:** 2026-01-10
**Severity:** CRITICAL
**Status:** Resolved
**Affected Components:** Backend (credit system, prompts), Frontend (translations)
**Data Loss:** ~4 hours of development work (38 modified files)

---

## Summary

Agent Coder lost approximately **4 hours of development work** due to executing `git reset --hard origin/main` while on the `main` branch with uncommitted changes from the feature branch. The working directory contained modifications that were never committed, and the reset command permanently discarded them.

---

## Impact

**Lost Work:**
- `backend/src/config/credits.ts` - Credit costs changed from 50→25
- `backend/src/services/comfyui/promptAgent.ts` - Prompt improvements (removed "reference sheet style", body-only filters)
- `frontend/src/components/ui/ImageViewerModal.tsx` - New component lost
- Translation files for ImageViewerModal (11 languages)
- **Total:** 38 modified files, ~4 hours of implementation work

**Timeline:**
- Development work: ~4 hours (morning session)
- Data loss: Instant (single `git reset --hard` command)
- Detection: Immediate (user noticed)
- Recovery attempt: 15 minutes (unsuccessful - no commits existed)

**User Impact:** High (4 hours of work lost, needed reimplementation)

---

## Root Cause Analysis

### What Happened

Agent Coder was working on feature improvements with **38 modified files in working directory** (uncommitted). When attempting to create a PR, the checklist instructed to switch to `main` branch. The agent executed the following fatal sequence:

```bash
# Agent was on: feature/character-image-generation-fixes
# Working directory: 38 modified files (NOT committed!)

# Step 1: Switched to main (Git allowed it, carrying changes)
git checkout main

# Step 2: Saw modified files in main and thought "need to clean up"
git reset --hard origin/main

# 💀 RESULT: All 4 hours of work GONE permanently
```

### Why This Happened

1. **No commits during 4 hours of work** - Agent worked entire morning without committing
2. **Checklist didn't verify working directory before checkout** - pr-creation.md Step 1.1 jumped straight to `git checkout main`
3. **Agent carried uncommitted changes to main** - Git allowed checkout with dirty working directory
4. **Agent saw changes in main and "cleaned up"** - Assumed changes were mistakes, not valuable work
5. **No backup** - Changes were never committed or pushed to GitHub

### Fatal Command Sequence

```bash
# Situation: On feature branch with 38 modified files
git status  # Shows: 38 files modified

# FATAL ERROR #1: Checkout without committing first
git checkout main  # Git carries changes to main!

# FATAL ERROR #2: Reset hard without verification
git reset --hard origin/main  # DELETES ALL WORK

# Result: Working directory clean, but 4 hours of work lost
git status  # Shows: nothing to commit, working tree clean
```

### Why Git Commands Failed to Protect

- `git checkout main` **allowed** with dirty working directory (Git tries to be helpful)
- `git reset --hard` **doesn't warn** about uncommitted changes (assumes you know what you're doing)
- No git hooks configured to prevent this scenario

---

## Detection

### How We Found It

1. User noticed agent mentioned work being "lost"
2. Agent checked compiled files in Docker container - showed old values (SINGLE: 50 instead of 25)
3. Attempted recovery via reflog, dangling commits - nothing found
4. **Conclusion:** Work was never committed, therefore unrecoverable

### Symptoms

- ❌ No commits existed for the 4 hours of work
- ❌ No dangling commits (never committed in the first place)
- ❌ Reflog showed no relevant history
- ❌ Container files showed old code (never deployed new changes)

---

## Resolution

### Recovery Attempts

1. **Checked reflog:**
   ```bash
   git reflog -30
   # Nothing relevant found - work was never committed
   ```

2. **Checked dangling commits:**
   ```bash
   git fsck --full --no-reflogs --unreachable --lost | grep commit
   # No dangling commits - work was never committed
   ```

3. **Checked Docker container files:**
   ```bash
   docker exec backend cat /app/src/config/credits.ts
   # Shows: SINGLE: 50 (old value, not new 25)
   ```

4. **Checked compiled dist files:**
   ```bash
   cat backend/dist/config/credits.js
   # Shows: SINGLE: 25 (compiled from lost source!)
   ```

**Outcome:** Work was **unrecoverable** - source files were never committed, only compiled artifacts existed.

### Final Resolution

- ❌ Recovery: **FAILED** (work never committed, cannot be recovered)
- ✅ Documentation: **IMPLEMENTED** (comprehensive git safety measures)
- ✅ Prevention: **IMPLEMENTED** (new checklists and rules)
- ⚠️ User decision: Work will need to be reimplemented

---

## Lessons Learned

### What Went Wrong

1. ❌ **No commits during 4 hours of work** - Massive violation of safety protocol
2. ❌ **pr-creation.md didn't verify working directory before checkout** - Checklist flaw
3. ❌ **Agent executed `git checkout` with dirty working directory** - Should have been blocked
4. ❌ **Agent executed `git reset --hard` without verification** - Destructive command used carelessly
5. ❌ **No push to GitHub as backup** - All work stayed local (volatile)

### What Went Right

1. ✅ **Detected immediately** - User noticed right away
2. ✅ **Triggered comprehensive safety improvements** - Led to major documentation overhaul
3. ✅ **Documented as learning opportunity** - Will prevent future occurrences

---

## Preventive Measures Implemented

### Critical Documentation Updates (2026-01-10)

1. **Created:** `docs/agents/coder/checklists/git-safety-pre-flight.md`
   - 2-minute safety checklist before ANY git operation
   - Mandatory verification of working directory before checkout
   - Backup branch creation before risky operations

2. **Updated:** `docs/agents/coder/CLAUDE.md`
   - New section: "GIT SAFETY: COMANDOS PROIBIDOS"
   - Explicit prohibition of `git reset --hard` without safeguards
   - Explicit prohibition of `git checkout` without verification
   - **NEW MANDATORY RULE:** Commit every 30-60 minutes

3. **Updated:** `docs/agents/coder/checklists/pr-creation.md`
   - **CRITICAL FIX:** New Step 1.1 "PRE-CHECKOUT SAFETY CHECK"
   - Forces verification of working directory BEFORE switching branches
   - Requires commit or stash of uncommitted changes
   - Added decision point with clear instructions

4. **Updated:** `docs/agents/coder/checklists/feature-implementation.md`
   - New section: "MANDATORY: Incremental Commits"
   - Requires commit every 30-60 minutes during implementation
   - Requires push to GitHub after every commit (backup)
   - Encourages WIP commits with examples

5. **Updated:** `docs/agents/coder/merge-safety-guide.md`
   - Added prohibited commands section at top
   - Added incremental commit requirements

6. **Updated:** `docs/agents/reviewer/CLAUDE.md`
   - Added same git safety protections (Reviewer can also lose code)

### New Safety Rules

#### Prohibited Commands (Without Safeguards)

1. **`git reset --hard`** - FORBIDDEN unless:
   - ✅ Backup branch created
   - ✅ Working directory verified clean
   - ✅ Current branch verified

2. **`git checkout <branch>`** - FORBIDDEN unless:
   - ✅ `git status` executed first
   - ✅ Working directory shows "nothing to commit, working tree clean"
   - ✅ OR changes committed/stashed first

3. **`git clean -fd`** - FORBIDDEN always (no safe use case)

#### Mandatory Workflow Changes

1. **Commit every 30-60 minutes:**
   ```bash
   git add .
   git commit -m "wip: describe what you just did"
   git push origin HEAD  # ← CRITICAL: Backup to GitHub!
   ```

2. **Pre-flight checks before ANY git operation:**
   ```bash
   git branch --show-current  # Verify branch
   git status                 # Verify working directory clean
   git branch backup-$(date +%Y%m%d%H%M%S)  # Create backup if risky
   ```

### Protection Layers Implemented

**Layer 1:** Incremental commits (every 30-60min)
- Prevents loss of more than 1 hour of work
- Code in git history (recoverable)

**Layer 2:** Push to GitHub (after every commit)
- Remote backup automatic
- Safe even if local machine fails

**Layer 3:** Pre-flight verification (before checkout/merge/reset)
- Blocks dangerous operations if working directory not clean
- Forces conscious decision to commit or discard

**Layer 4:** Backup branches (before risky operations)
- Snapshot of state before merge/reset
- Easy recovery point

---

## Impact Analysis

### Before These Measures

- ⚠️ Agent could work 4+ hours without committing
- ⚠️ Agent could execute `git reset --hard` freely
- ⚠️ Agent could checkout branches with dirty working directory
- ⚠️ Maximum loss: **UNLIMITED** (entire day's work)

### After These Measures

- ✅ Agent MUST commit every 30-60 minutes
- ✅ Agent MUST verify working directory before checkout
- ✅ Agent MUST create backup before risky operations
- ✅ Maximum loss: **~1 hour** (last commit to now)

**Risk Reduction:** ~95% (from "unlimited loss" to "max 1 hour loss")

---

## Related Incidents

- **2025-12-31:** [Dangling Commits Data Loss](2025-12-31-dangling-commits-data-loss.md) - Similar data loss, different root cause

---

## References

- **Recovery Procedure:** [recovery-procedures.md](recovery-procedures.md)
- **Git Safety Pre-Flight:** [docs/agents/coder/checklists/git-safety-pre-flight.md](../../agents/coder/checklists/git-safety-pre-flight.md)
- **Git Safety Guide:** [docs/agents/coder/CLAUDE.md](../../agents/coder/CLAUDE.md#git-safety-comandos-proibidos)
- **PR Creation Checklist:** [docs/agents/coder/checklists/pr-creation.md](../../agents/coder/checklists/pr-creation.md)

---

## Action Items

- [x] Attempt recovery (FAILED - work never committed)
- [x] Document incident and root cause
- [x] Create git-safety-pre-flight.md checklist
- [x] Update CLAUDE.md with prohibited commands
- [x] Update pr-creation.md with pre-checkout safety check
- [x] Update feature-implementation.md with incremental commits
- [x] Add git safety to all agent CLAUDE.md files
- [x] Push all documentation changes to GitHub
- [ ] Monitor agent behavior to ensure compliance with new rules

---

**Report Created By:** Agent Reviewer
**Last Updated:** 2026-01-10

**Incident Classification:** CRITICAL - Led to comprehensive git safety overhaul

**This incident would be IMPOSSIBLE with the implemented measures.**
