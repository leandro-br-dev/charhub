# PR Creation Checklist

**When to use**: Feature tested and ready for review

**See**: Full details in `CLAUDE-old-backup.md` Phase 4-5

## Quick PR Steps

### 🚨 CRITICAL: Update Branch with Main FIRST

**BEFORE doing anything else:**

```bash
# 1. Update main
git checkout main
git pull origin main

# 2. Merge main into feature branch
git checkout feature/your-feature
git merge main

# 3. Resolve conflicts if any
# 4. Re-run ALL tests after merge
cd backend && npm run build
cd frontend && npm run build && npm test
```

**Why this is critical:**
- Prevents accidental file deletions
- Catches integration issues early
- Ensures tests pass with latest code
- Avoids wasting Agent Reviewer's time

### ✅ Then Proceed with PR

- [ ] **Branch updated with latest main** (see above) 🚨 CRITICAL!
- [ ] All tests pass locally (after merge!)
- [ ] TypeScript compiles (backend + frontend)
- [ ] Feature spec updated with "Ready for PR"
- [ ] Commit with proper format
- [ ] Push to remote
- [ ] Create PR with template
- [ ] Tag Agent Reviewer

**Next**: Wait for Agent Reviewer feedback
