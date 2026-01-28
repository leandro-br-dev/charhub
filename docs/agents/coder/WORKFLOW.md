# Agent Coder Workflow - Complete Flow

**Last Updated**: 2026-01-27
**Version**: 1.1 - Enhanced Migrations & Manual Testing First

---

## 🔄 Complete Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AGENT CODER - COMPLETE WORKFLOW                 │
└─────────────────────────────────────────────────────────────────────┘

PHASE 1: PLANNING & SETUP
│
├─→ 1.1. FEATURE ANALYSIS (feature-analysis-planning)
│   └─ Read feature spec from features/active/
│   └─ Create action plan in memory (NO file)
│   └─ Identify required subagents
│
├─→ 1.2. GIT SETUP (git-branch-management + git-safety-officer)
│   ├─ Verify working directory clean
│   ├─ Verify main branch updated
│   ├─ Create feature branch: feature/{short-name}
│   ├─ **Apply database migrations** (CRITICAL!)
│   └─ **Install new dependencies** if any
│
PHASE 2: IMPLEMENTATION
│
├─→ 2.1. DEVELOPMENT COORDINATION (development-coordination)
│   ├─ Backend needed? → delegate to backend-developer
│   ├─ Frontend needed? → delegate to frontend-specialist
│   ├─ Wait for BOTH to complete
│   └─ Verify: lint + build pass
│
├─→ 2.2. SERVER STABILITY (server-stability-verification)
│   ├─ Check all containers healthy: ./scripts/health-check.sh
│   ├─ Verify no errors in logs
│   ├─ Apply database migrations if needed
│   └─ Ensure server stable before testing
│
PHASE 3: TESTING
│
├─→ 3.1. MANUAL TESTING (manual-testing-protocol) - MUST COME FIRST!
│   ├─ **CRITICAL: User testing BEFORE automated tests!**
│   ├─ Present test checklist to user
│   ├─ **WAIT for user to perform manual testing**
│   ├─ **Receive explicit user confirmation**
│   ├─ FAILS? → Route back to Phase 2 (development)
│   └─ PASSES? → Proceed to automated test creation
│
├─→ 3.2. PARALLEL TASKS (parallel-tasks-execution) - AFTER User Confirms!
│   ├─ **PREREQUISITE: User confirmed manual testing passed!**
│   ├─ Delegate IN PARALLEL:
│   │   ├─→ test-writer (create automated tests)
│   │   └─→ coder-doc-specialist (create .docs.md files)
│   ├─ Wait for BOTH to complete
│   │
│   ├─→ 3.3. TEST ENVIRONMENT (test-environment-preparation)
│   │   └─ Prepare: ./scripts/database/db-switch.sh clean
│   │
│   ├─→ 3.4. RUN AUTOMATED TESTS
│   │   ├─ cd backend && npm test
│   │   ├─ cd frontend && npm test
│   │   │
│   │   ├─ TEST FAILURES?
│   │   │   ├─ Code bug? → Route back to Phase 2 (backend/frontend)
│   │   │   ├─ Test bug? → Delegate back to test-writer
│   │   │   └─ Re-run tests (loop until pass)
│   │   │
│   │   └─ ALL PASS? → Proceed
│   │
│   └─→ 3.5. RESTORE DATABASE
│       └─ ./scripts/database/db-switch.sh populated
│
PHASE 4: PULL REQUEST
│
├─→ 4.1. PR READINESS (pr-readiness-checklist)
│   ├─ Code quality: lint + build (backend + frontend)
│   ├─ Test coverage: >80% backend, >70% frontend
│   ├─ Documentation: .docs.md files created
│   ├─ Server health: all containers healthy
│   ├─ Database: development database active
│   ├─ Git state: working directory clean
│   └─ Feature spec: updated with completion status
│
├─→ 4.2. BRANCH SYNC (git-safety-officer + pr-prep-deployer)
│   ├─ Pre-flight safety check
│   ├─ Fetch latest main
│   ├─ Merge main into feature branch
│   └─ Resolve conflicts if any
│
└─→ 4.3. CREATE PR (pr-prep-deployer)
    ├─ Push to remote
    ├─ Create PR via gh CLI
    └─ Update feature spec with PR link

```

---

## 📋 Phase-by-Phase Checklist

### ✅ Phase 1: Planning & Setup

- [ ] Read feature spec completely
- [ ] Create action plan in memory
- [ ] Identify backend/frontend requirements
- [ ] Verify working directory clean: `git status`
- [ ] Verify main updated: `git fetch origin main && git log origin/main --oneline -5`
- [ ] Create feature branch: `feature/{short-descriptive-name}`
- [ ] **Apply database migrations**: `cd backend && npx prisma migrate deploy` (CRITICAL!)
- [ ] **Install new dependencies**: `cd backend && npm install && cd ../frontend && npm install`

### ✅ Phase 2: Implementation

- [ ] **Backend** (if needed): delegate to backend-developer
- [ ] **Frontend** (if needed): delegate to frontend-specialist
- [ ] Wait for both to complete
- [ ] Verify: `cd backend && npm run lint && npm run build`
- [ ] Verify: `cd frontend && npm run lint && npm run build`
- [ ] Check containers healthy: `./scripts/health-check.sh`
- [ ] Verify database migrations applied
- [ ] Check logs for errors

### ✅ Phase 3: Testing

**CRITICAL: Manual testing MUST happen BEFORE creating automated tests!**

- [ ] **Manual Testing**: Present checklist to user
- [ ] **WAIT for user to perform manual testing**
- [ ] **Receive explicit user confirmation** that features work
- [ ] User confirmed? → Continue to automated test creation
- [ ] User found issues? → Route back to Phase 2
- [ ] **ONLY AFTER User Confirms**: delegate to test-writer AND coder-doc-specialist
- [ ] Wait for BOTH to complete
- [ ] **Prepare Test Environment**: `./scripts/database/db-switch.sh clean`
- [ ] **Run Tests**: `npm test` (backend + frontend)
- [ ] **All tests pass?** → Continue
- [ ] **Test failures?**
  - [ ] Code bug → Route back to Phase 2
  - [ ] Test bug → Delegate back to test-writer
- [ ] **Restore Database**: `./scripts/database/db-switch.sh populated`

### ✅ Phase 4: Pull Request

- [ ] **Code Quality**:
  - [ ] Backend: `npm run lint` (0 errors)
  - [ ] Backend: `npm run build` (pass)
  - [ ] Frontend: `npm run lint` (0 errors)
  - [ ] Frontend: `npm run build` (pass)
- [ ] **Test Coverage**:
  - [ ] Backend: >80%
  - [ ] Frontend: >70%
- [ ] **Documentation**: .docs.md files created
- [ ] **Server Health**: `./scripts/health-check.sh`
- [ ] **Database**: development database active
- [ ] **Git State**: clean
- [ ] **Feature Spec**: updated
- [ ] **Branch Sync**: merge main into feature
- [ ] **Apply migrations after sync**: `cd backend && npx prisma migrate deploy` (CRITICAL!)
- [ ] **Install dependencies after sync**: `npm install` (backend + frontend)
- [ ] **Create PR**: push and create via gh CLI

---

## 🔄 Loop Handling

### Development Fix Loop

```
Test Failure
    ↓
Analyze failure type
    ↓
┌─────────────────────────────────┐
│ Code Bug?                      │
│ → Delegate to backend-developer │
│   or frontend-specialist        │
│ → Re-run tests                  │
│ → Loop until pass               │
└─────────────────────────────────┘
    │
┌─────────────────────────────────┐
│ Test Bug?                       │
│ → Delegate back to test-writer  │
│ → Re-run tests                  │
│ → Loop until pass               │
└─────────────────────────────────┘
```

### Manual Testing Fix Loop

```
User Testing Fails
    ↓
Route back to Phase 2
    ↓
Delegate to appropriate subagent
    ↓
Fix implemented
    ↓
Re-verify server stability
    ↓
Request user testing again
```

---

## 📁 Documentation Location Rule

**Documentation must be alongside code**:

```
Backend Example:
  backend/src/services/characterStatsService.ts
  backend/src/services/characterStatsService.docs.md

Frontend Example:
  frontend/src/components/CharacterStats.tsx
  frontend/src/components/CharacterStats.docs.md
```

---

## 🎯 Success Criteria

Feature is complete when ALL pass:

- ✅ Manual testing passed (user confirmed)
- ✅ Automated tests all pass
- ✅ Test coverage meets requirements
- ✅ Documentation (.docs.md) created
- ✅ Code quality verified (lint + build)
- ✅ Server health verified
- ✅ Development database restored
- ✅ Feature spec updated
- ✅ PR created and linked

---

## 🚀 Quick Start

When assigned a new feature:

```bash
# 1. Read the spec
cat docs/05-business/planning/features/active/FEATURE-XXX.md

# 2. Use feature-analysis-planning skill (in memory)

# 3. Use git-safety-officer to create branch

# 4. Follow the workflow phases above
```

---

**Remember**: Each phase has a specific skill that guides the process. Reference the appropriate skill at each step.
