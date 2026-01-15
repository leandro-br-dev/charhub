# Quick Reference - Agent Coder Sub-Agents

**Use this guide** to quickly identify which sub-agent to use for each task.

---

## 🚀 Quick Decision Matrix

| I need to... | Use this sub-agent |
|-------------|-------------------|
| Implement API endpoint | `backend-developer` |
| Add/modify database schema | `backend-developer` |
| Create migration | `backend-developer` |
| Write backend business logic | `backend-developer` |
| Create Vue component | `frontend-specialist` |
| Add i18n translations | `frontend-specialist` |
| Implement UI feature | `frontend-specialist` |
| Fix TypeScript errors | `code-quality-enforcer` |
| Verify code patterns | `code-quality-enforcer` |
| Run tests | `feature-tester` |
| Test feature manually | `feature-tester` |
| Verify all quality gates | `feature-tester` |
| Create Pull Request | `pr-prep-deployer` |
| Update branch with main | `pr-prep-deployer` |
| Resolve merge conflicts | `pr-prep-deployer` |
| **Switch Git branches** | **`git-safety-officer`** |
| **Merge branches** | **`git-safety-officer`** |
| **Any Git operation** | **`git-safety-officer`** |

---

## 🎨 Sub-Agent Colors (Visual Reference)

- 🟢 **green** - `backend-developer`
- 🔵 **blue** - `frontend-specialist`
- 🟠 **orange** - `feature-tester`
- 🟣 **purple** - `code-quality-enforcer`
- 🩷 **pink** - `pr-prep-deployer`
- 🔴 **red** - `git-safety-officer`

---

## 📋 Typical Feature Workflow

```
1. git-safety-officer    → Create feature branch safely
2. backend-developer     → Implement backend (if needed)
3. frontend-specialist   → Implement frontend (if needed)
4. code-quality-enforcer → Verify patterns during dev
5. feature-tester        → Test implementation
6. git-safety-officer    → Pre-merge safety checks
7. pr-prep-deployer      → Sync branch and create PR
```

---

## ⚠️ Critical: Git Safety First

**BEFORE ANY Git operation**, ALWAYS use `git-safety-officer`:

```bash
# ❌ WRONG - Direct Git operation
git checkout main

# ✅ CORRECT - Use git-safety-officer first
"I need to switch branches. Using git-safety-officer for safety checks."
[Invoke git-safety-officer sub-agent]
```

**Operations that REQUIRE git-safety-officer**:
- `git checkout <branch>`
- `git merge <branch>`
- `git reset --hard`
- `git rebase`
- Any branch switching
- Any operation that could lose data

---

## 🔍 Common Scenarios

### Scenario: "I need to implement a new feature"

1. **Start**: Use `git-safety-officer` to create feature branch
2. **Backend**: Use `backend-developer` for API/database
3. **Frontend**: Use `frontend-specialist` for UI/components
4. **Quality**: Use `code-quality-enforcer` during development
5. **Test**: Use `feature-tester` when implementation complete
6. **PR**: Use `git-safety-officer` then `pr-prep-deployer` to create PR

### Scenario: "I need to fix a bug"

1. **Assess**: Use `code-quality-enforcer` to understand issue
2. **Fix**: Use `backend-developer` or `frontend-specialist` depending on bug location
3. **Test**: Use `feature-tester` to verify fix
4. **PR**: Use `pr-prep-deployer` to create PR

### Scenario: "I need to switch branches"

1. **ALWAYS**: Use `git-safety-officer` FIRST
2. The officer will verify it's safe to switch
3. Then proceed with branch switch

### Scenario: "Ready to create PR"

1. **Test**: Use `feature-tester` for final verification
2. **Safety**: Use `git-safety-officer` for pre-merge checks
3. **PR**: Use `pr-prep-deployer` to sync and create PR

---

## 📞 When in Doubt

1. **Git operation?** → Use `git-safety-officer`
2. **Backend code?** → Use `backend-developer`
3. **Frontend code?** → Use `frontend-specialist`
4. **Testing?** → Use `feature-tester`
5. **Quality check?** → Use `code-quality-enforcer`
6. **Creating PR?** → Use `pr-prep-deployer`

---

**Remember**: The orchestrator's job is to delegate to the right specialist. When unsure, reference this guide!
