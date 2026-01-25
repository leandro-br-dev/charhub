---
name: pr-review-orchestration
description: Coordinate complete Pull Request review workflow from initial verification to final approval. Use when Agent Coder creates a PR.
---

# PR Review Orchestration

## Purpose

Coordinate the complete Pull Request review workflow, ensuring code quality, preventing feature loss during merge conflicts, and verifying functionality through comprehensive testing.

## When to Use

- Agent Coder creates a new Pull Request
- PR needs to be reviewed for quality and functionality
- Merge conflicts need to be resolved before review
- PR has been updated and needs re-review

## Pre-Conditions

✅ Pull Request exists in GitHub
✅ pr-conflict-resolver sub-agent available
✅ Local development environment running

## PR Review Orchestration Workflow

### Phase 1: Pre-Flight Verification (CRITICAL!)

**Use sub-agent**: `pr-conflict-resolver`

**ALWAYS use this FIRST - No exceptions!**

```bash
# Step 1: Verify branch status
gh pr view <number>

# Step 2: Check for merge conflicts
git checkout main
git pull
git checkout feature/<branch>
git merge main
# If conflicts → pr-conflict-resolver handles them
```

**What pr-conflict-resolver does**:
- Detects outdated PR branches
- Identifies merge conflicts
- Combines features from multiple agents
- Resolves conflicts by preserving all work
- Prevents feature loss during merge

**Output**: Branch verified up-to-date or conflicts resolved

### Phase 2: Code Quality Review

**Use sub-agent**: `pr-code-reviewer`

**Only after branch verified up-to-date**

**Review checklist**:
- [ ] Code quality verification
- [ ] Pattern compliance checking
- [ ] i18n compliance verification
- [ ] TypeScript type safety review
- [ ] Test coverage assessment
- [ ] Security review
- [ ] Backend compilation verification (`npm run build`)
- [ ] Frontend compilation verification
- [ ] Lint status check
- [ ] No forgotten exports (especially interfaces)
- [ ] Migration timestamps correct (2026, not 2025)
- [ ] Test mock patterns match implementation

**Critical checks from production lessons learned**:

```bash
# 1. Check TypeScript compiles (CRITICAL!)
cd backend && npm run build
# If fails → DO NOT APPROVE → Request fix

# 2. Check for forgotten exports
grep -r "^interface " backend/src/queues/jobs/ | grep -v "^export interface"
# If found → Alert Agent Coder

# 3. Check migration timestamps
ls backend/prisma/migrations/ | grep "^2025"
# If found → WRONG YEAR! Should be 2026

# 4. Verify Prisma transaction mocks
grep -r "\$transaction.*mockImplementation" backend/src
# If found → WRONG pattern! Should be array-based

# 5. Run tests locally
cd backend && npm test
# Check for skipped tests (test.skip) → These represent technical debt
```

**Output**: Code review approved or changes requested

### Phase 3: Local Testing & QA

**Use sub-agent**: `local-qa-tester`

**Only after code review approved**

**Testing checklist**:
- [ ] Automated test execution
- [ ] Backend tests pass
- [ ] Frontend tests pass
- [ ] Manual feature testing
- [ ] API endpoint verification
- [ ] Frontend UI testing
- [ ] Database validation
- [ ] Regression testing (existing features still work)

**Docker space-aware testing**:

```bash
# Default restart (no --build)
docker compose up -d

# Rebuild only when dependencies changed
docker compose up -d --build backend
docker compose up -d --build frontend

# Check container health
docker compose ps
```

**Output**: All tests passed or issues found

### Phase 4: Decision & Communication

**Based on review and testing results**

**If approved**:
```bash
gh pr review <number> --approve
# Comment with approval summary
```

**If changes needed**:
```bash
gh pr review <number> --body "Please address the following issues..."
# Be specific about what needs fixing
```

**If critical blockers found**:
```bash
gh pr review <number> --body "BLOCKED: Critical issues found..."
# Explain what must be fixed before re-review
```

## Red Flags to Watch For

**When reviewing Agent Coder PRs**:

1. **New queue job types added** → Check interfaces are exported
2. **New migrations added** → Verify timestamp year is 2026
3. **Test files have many changes** → Review test mock patterns
4. **Tests use `test.skip()`** → Ask for follow-up issue if present
5. **Backend TypeScript files changed** → Verify local build passes
6. **Prisma transaction usage** → Verify array-based mocks, not callbacks

## Output Format

```
"PR review complete:

PR: #<number> - <title>
Status: APPROVED | CHANGES REQUESTED | BLOCKED

Pre-Flight Verification:
- Branch status: Up-to-date | Updated | Conflicts resolved
- Feature loss check: PASSED

Code Quality Review:
- TypeScript compilation: PASSED
- Pattern compliance: PASSED
- i18n compliance: PASSED
- Test coverage: X%
- Security review: PASSED

Testing Results:
- Backend tests: PASSED (X/Y)
- Frontend tests: PASSED (X/Y)
- Manual testing: PASSED

Issues Found:
- {issue_1}: {severity}
- {issue_2}: {severity}

Next Steps: {awaiting updates | ready for deployment}"
```

## Integration with Workflow

```
pr-review-orchestration (THIS SKILL)
    ↓
pr-conflict-resolver (pre-flight)
    ↓
pr-code-reviewer (quality check)
    ↓
local-qa-tester (testing)
    ↓
Decision (approve/request changes)
    ↓
deployment-coordination (when approved)
```

---

## Production Lessons Learned

### FEATURE-011: Character Generation Correction System (Jan 2026)

**Critical errors that made it through review**:

1. **TypeScript Compilation Failure (502 Error)**
   - Error: Agent Coder created interfaces but forgot to export them
   - Impact: Backend wouldn't compile, returned 502 errors
   - Prevention: Add `npm run build` verification before PR approval

2. **Duplicate Migration with Wrong Timestamp**
   - Error: Migration created with year 2025 instead of 2026
   - Impact: CI failed with database conflict error
   - Prevention: Verify all migrations have correct current year (2026)

3. **26 Tests Failing - Mock Pattern Mismatch**
   - Error: Tests used callback-based transaction mocks, implementation uses array-based
   - Impact: CI failed with 26 failing tests
   - Prevention: Review test patterns match actual implementation

4. **Test Expectations Mismatch**
   - Error: Tests expected `expect.anything()` but implementation returned specific values
   - Impact: Additional test failures
   - Prevention: Test expectations must match actual implementation

---

Remember: **Quality Takes Time - Rejection is Faster Than Rollback**

A thorough review now prevents production incidents later. If unsure, request changes rather than approve.
