---
name: pr-readiness-checklist
description: Final verification checklist before creating a Pull Request. Use after all tests pass to ensure the feature branch is ready for PR creation, including code quality, documentation, and server health verification.
---

# PR Readiness Checklist

## Purpose

Perform final verification that the feature is ready for Pull Request creation, including code quality checks, documentation verification, server health confirmation, and data restoration.

## When to Use

- AFTER parallel-tasks-execution (all tests passed, database restored)
- BEFORE delegating to pr-prep-deployer
- As the final gate before PR creation
- To ensure nothing is forgotten before PR

## Pre-Conditions

✅ Manual testing passed (user confirmed)
✅ Automated tests all pass
✅ Documentation created
✅ Development database restored
✅ All implementation complete

## PR Readiness Checklist

### 1. Code Quality Verification

**Backend quality checks**:
```bash
cd backend

# Lint check
npm run lint
# Expected: No lint errors

# Build check
npm run build
# Expected: Builds successfully

# TypeScript check
npm run type-check  # if available
# Expected: No type errors
```

**Frontend quality checks**:
```bash
cd frontend

# Lint check
npm run lint
# Expected: No lint errors

# Build check
npm run build
# Expected: Builds successfully

# i18n compilation check
npm run translations:compile
# Expected: Compiles successfully (no missing keys)
```

**Verify all pass**:
- [ ] Backend lint: PASS
- [ ] Backend build: PASS
- [ ] Frontend lint: PASS
- [ ] Frontend build: PASS
- [ ] i18n compile: PASS

**If ANY fail**:
- Fix the issue
- Re-run the check
- Don't proceed until all pass

### 2. Test Coverage Verification

**Check test coverage meets requirements**:
```bash
cd backend
npm test -- --coverage
# Expected: >80% coverage

cd frontend
npm run test:coverage
# Expected: >70% coverage
```

**Verify**:
- [ ] Backend coverage: >80%
- [ ] Frontend coverage: >70%

**If coverage too low**:
- Note which areas need coverage
- Consider adding more tests (optional)
- Document why coverage is lower if acceptable

### 3. Documentation Verification

**Verify all documentation is created**:

**Backend documentation**:
```bash
# Check for .docs.md files alongside new code
find backend/src -name "*.docs.md" -newer .git/index
```

**Frontend documentation**:
```bash
# Check for .docs.md files alongside new code
find frontend/src -name "*.docs.md" -newer .git/index
```

**Verify**:
- [ ] All new services have .docs.md files
- [ ] All new controllers have .docs.md files
- [ ] All new components have .docs.md files
- [ ] API changes documented
- [ ] Database schema changes documented (if any)

**If documentation missing**:
- Delegate to coder-doc-specialist to create
- Verify created files are in place
- Re-check this section

### 4. Server Health Verification

**Verify all services are healthy**:
```bash
# Check container status
docker compose ps

# All should be "Up" and healthy

# Check for recent errors
docker compose logs backend | tail -50 | grep -i error
docker compose logs frontend | tail -50 | grep -i error
```

**Verify**:
- [ ] All containers running: PASS
- [ ] No errors in logs: PASS
- [ ] Backend responding: PASS
- [ ] Frontend serving: PASS

**Quick health check**:
```bash
# Backend health
curl http://localhost:3001/health
# Or: curl http://localhost:3001/

# Frontend serving
curl -I http://localhost:3000/
```

**If any service unhealthy**:
- Identify the issue
- Fix or restart the service
- Re-verify all services
- Don't proceed until all healthy

### 5. Database State Verification

**Verify development database is active**:
```bash
./scripts/db-switch.sh status
# Expected: "Current database: development"
```

**Verify**:
- [ ] Development database active: YES
- [ ] Test database preserved: YES (for future use)

**If wrong database is active**:
- Run: `./scripts/db-switch.sh restore`
- Verify status again

### 6. Git State Verification

**Check git status**:
```bash
# Check current branch
git branch --show-current
# Expected: feature/{name}

# Check for uncommitted changes
git status

# Check for untracked files that should be committed
git status --short
```

**Verify**:
- [ ] On feature branch: YES
- [ ] All changes committed: YES
- [ ] No untracked files that should be included: YES

**Expected files committed**:
- [ ] Backend code changes
- [ ] Frontend code changes
- [ ] Test files
- [ ] Documentation files (.docs.md)
- [ ] Migration files (if any)

**If uncommitted changes exist**:
- Review what's not committed
- Commit if should be included
- Gitignore if shouldn't be included
- Re-check status

### 7. Feature Spec Update

**Update feature spec with completion status**:
```bash
# Edit the feature spec
nano docs/05-business/planning/features/active/{feature-name}.md
```

**Add to spec**:
```markdown
## Implementation Status

✅ COMPLETED - {date}

### What Was Implemented
- Backend: {summary}
- Frontend: {summary}
- Tests: {summary}
- Documentation: {summary}

### Test Results
- Manual tests: PASSED
- Automated tests: PASSED (backend: {coverage}%, frontend: {coverage}%)

### Ready for PR: YES
```

**Verify**:
- [ ] Feature spec updated: YES
- [ ] Status marked complete: YES
- [ ] Test results documented: YES

### 8. Branch Sync Readiness

**Prepare for branch sync with main**:

**Check if feature branch is behind main**:
```bash
git fetch origin
git log HEAD..origin/main --oneline
```

**If commits appear**:
- Feature branch is behind main
- Will need to merge main before PR
- Note this for pr-prep-deployer

**Verify**:
- [ ] Feature branch sync status noted: YES

## Final Go/No-Go Decision

**After ALL checklist items pass**:

**GO for PR** if:
- ✅ All code quality checks pass
- ✅ All tests pass with adequate coverage
- ✅ All documentation created
- ✅ All services healthy
- ✅ Development database active
- ✅ All changes committed
- ✅ Feature spec updated

**NO-GO** if:
- ❌ ANY quality check fails
- ❌ ANY test fails
- ❌ Documentation incomplete
- ❌ Services unhealthy
- ❌ Uncommitted changes
- ❌ Feature spec not updated

**If NO-GO**:
- Identify what's failing
- Fix the issue
- Re-run affected checks
- Only proceed when ALL pass

## Integration with Workflow

This skill is the **FINAL STEP** before PR creation:

```
1. feature-analysis-planning
   ↓
2. git-branch-management
   ↓
3. development-coordination
   ↓
4. server-stability-verification
   ↓
5. manual-testing-protocol
   ↓
6. parallel-tasks-execution
   ↓
7. pr-readiness-checklist (THIS SKILL)
   ↓
8. Delegate to pr-prep-deployer
```

## Output Format

### Starting Checklist

```
"Running PR readiness checklist...

Checking {number} categories:
1. Code quality
2. Test coverage
3. Documentation
4. Server health
5. Database state
6. Git state
7. Feature spec
8. Branch sync

Verifying..."
```

### Checklist Pass (Ready for PR)

```
"✅ PR READINESS CHECKLIST PASSED!

All checks passed:

CODE QUALITY:
✅ Backend lint: PASS
✅ Backend build: PASS
✅ Frontend lint: PASS
✅ Frontend build: PASS
✅ i18n compile: PASS

TESTS:
✅ Backend tests: PASS (coverage: {X}%)
✅ Frontend tests: PASS (coverage: {X}%)

DOCUMENTATION:
✅ {count} .docs.md files created

SERVER HEALTH:
✅ All containers healthy
✅ No errors in logs

DATABASE:
✅ Development database active

GIT STATE:
✅ On feature branch: {branch_name}
✅ All changes committed
✅ Feature spec updated

READY FOR PR: YES ✅

Delegating to pr-prep-deployer for PR creation..."
```

### Checklist Fail (Not Ready)

```
"❌ PR READINESS CHECKLIST FAILED

Issues found:

{list_of_failures}

Fixing now:
{actions_taken}

Re-checking...
{re_verification_results}

Waiting for all checks to pass before PR."
```

## Common Pitfalls

**❌ DON'T**:
- Skip checklist items to save time
- Proceed with failing checks
- Forget to update feature spec
- Create PR with uncommitted changes
- Leave test database active
- Ignore lint or build errors

**✅ DO**:
- Run EVERY checklist item
- Fix ALL failures before proceeding
- Update feature spec with completion
- Verify git state is clean
- Ensure development database is active
- Double-check everything before PR

## Quick Reference Commands

```bash
# Code quality checks
cd backend && npm run lint && npm run build
cd frontend && npm run lint && npm run build && npm run translations:compile

# Test coverage
cd backend && npm test -- --coverage
cd frontend && npm run test:coverage

# Documentation check
find backend/src -name "*.docs.md"
find frontend/src -name "*.docs.md"

# Server health
docker compose ps
docker compose logs backend | tail -20
curl http://localhost:3001/

# Database state
./scripts/db-switch.sh status

# Git state
git branch --show-current
git status

# Feature spec location
docs/05-business/planning/features/active/{feature-name}.md
```

## Handoff

### When Checklist Passes

**Next**: Delegate to pr-prep-deployer

**Message**:
```
"✅ PR readiness verified!

All checks passed. Feature is ready for PR.

Delegating to pr-prep-deployer to:
1. Sync feature branch with main
2. Resolve any conflicts
3. Verify environment
4. Create professional PR

Please wait for PR creation to complete..."
```

**Then delegate to pr-prep-deployer**:
```
"Delegate to pr-prep-deployer:

Feature: {feature_name}
Branch: {feature_branch}
Ready for PR: YES

Please:
1. Use git-safety-officer to sync with main
2. Resolve any merge conflicts
3. Verify environment health
4. Create Pull Request with:
   - Clear description of changes
   - Test results summary
   - Documentation links
   - Screenshots if applicable

Context:
{implementation_summary}
{test_results}
"
```

### Summary for PR Description

**Provide to pr-prep-deployer for PR description**:

```markdown
## Feature: {Feature Name}

### Summary
{brief_description}

### Implementation
- **Backend**: {backend_summary}
- **Frontend**: {frontend_summary}
- **Database**: {database_changes}

### Testing
- ✅ Manual tests: PASSED
- ✅ Automated tests: PASSED
  - Backend: {coverage}% coverage
  - Frontend: {coverage}% coverage

### Documentation
- {documentation_links}

### Checklist
- [x] Code follows CharHub patterns
- [x] All tests passing
- [x] i18n translations complete (both languages)
- [x] Documentation created
- [x] Server health verified
```
