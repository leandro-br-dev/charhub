---
name: parallel-tasks-execution
description: Execute automated testing and documentation in parallel after manual testing passes. Use to efficiently run test-writer and coder-doc-specialist simultaneously, then prepare test environment and execute tests.
---

# Parallel Tasks Execution

## Purpose

Coordinate the parallel execution of automated testing (test-writer) and documentation (coder-doc-specialist) after manual testing has passed, then prepare the test environment and execute the automated test suite.

## When to Use

- AFTER manual-testing-protocol (user confirmed tests passed)
- Need to create automated tests AND documentation
- Want to optimize time by running tasks in parallel
- Before executing the full test suite

## Pre-Conditions

✅ Manual testing passed (user confirmed)
✅ Server is stable
✅ All code changes complete and verified
✅ Feature branch is up to date

## Parallel Execution Workflow

### Phase 1: Parallel Delegation

**Delegate to BOTH subagents simultaneously**:

**1. test-writer** (for automated tests)
```
"Delegate to test-writer:

Feature: {feature_name}
Implementation complete: {summary}

Please create automated tests for this feature:
- Unit tests for services/components
- Integration tests for API endpoints
- E2E tests for critical user flows

Follow CharHub testing patterns:
- Backend: Jest with proper mocking
- Frontend: Vitest with component testing
- Use expect.anything() for Prisma selects
- Aim for >80% backend, >70% frontend coverage

Context: {implementation_details}"
```

**2. coder-doc-specialist** (for documentation)
```
"Delegate to coder-doc-specialist:

Feature: {feature_name}
Implementation complete: {summary}

Please create documentation for this feature:
- .docs.md files alongside new code (e.g., service.docs.md)
- API documentation for new endpoints
- Component documentation for new UI
- Update any relevant reference docs

Follow CharHub documentation patterns:
- Documentation files: {Name}.docs.md
- Include usage examples
- Document parameters and return types
- Add troubleshooting if applicable

Context: {implementation_details}"
```

**Send BOTH delegations in the same message**:

```
"Delegate IN PARALLEL to:

1. test-writer: {instructions}
2. coder-doc-specialist: {instructions}

Wait for both to complete. Report when both are done."
```

### Phase 2: Monitor Parallel Progress

**While both subagents are working**:
- Wait for BOTH to complete
- Check on each if taking too long
- Provide clarification if either asks questions
- Do NOT proceed until BOTH are complete

**If one completes before the other**:
- Note which one completed
- Continue waiting for the other
- Don't start next phase until both done

### Phase 3: Verify Parallel Work

**When BOTH report completion**:

**Verify test-writer output**:
- [ ] Unit tests created
- [ ] Integration tests created
- [ ] E2E tests created (if needed)
- [ ] Tests follow CharHub patterns
- [ ] Test files are in correct locations

**Verify coder-doc-specialist output**:
- [ ] .docs.md files created alongside code
- [ ] API documentation updated (if applicable)
- [ ] Component documentation created (if applicable)
- [ ] Documentation follows CharHub patterns

**If either has issues**:
- Address the issue
- Re-delegate if needed
- Only proceed when BOTH are verified complete

### Phase 4: Prepare Test Environment

**CRITICAL**: Prepare database for automated testing

**Use db-switch script** to create clean test database:
```bash
# Create clean test database copy
./scripts/database/db-switch.sh clean

# This creates a test database that can be restored later
```

**What this does**:
- Creates a clean copy of the database for testing
- Allows tests to run without affecting development data
- Enables easy restoration after testing

**Verify preparation**:
```bash
# Verify test database exists
./scripts/database/db-switch.sh status

# Should show: "Test database ready"
```

### Phase 5: Execute Automated Tests

**Run the complete test suite**:

**Backend tests**:
```bash
cd backend

# Ensure migrations are applied
npx prisma migrate deploy

# Run tests
npm test

# Run with coverage (optional)
npm test -- --coverage
```

**Frontend tests**:
```bash
cd frontend

# Run tests
npm test

# Run with coverage (optional)
npm run test:coverage
```

**Monitor test execution**:
- Watch for any failing tests
- Note which tests fail and why
- Check for compilation errors
- Verify coverage meets requirements

## Handling Test Results

### Case A: All Tests Pass ✅

**All tests pass successfully**

**Actions**:
1. Note test results
2. Check coverage percentages
3. Document test success
4. Proceed to next phase

**Message**:
```
"✅ All automated tests passed!

Test Results:
• Backend tests: PASS (coverage: {percentage}%)
• Frontend tests: PASS (coverage: {percentage}%)
• Integration tests: PASS
• E2E tests: PASS

Documentation created:
{list_of_documentation_files}

Proceeding to final PR preparation."
```

**Next skill**: pr-readiness-checklist

### Case B: Some Tests Fail ❌

**Tests have failures**

**Actions**:
1. Identify which tests failed
2. Understand the failure reason
3. Categorize the failure:
   - **Code bug** → Delegate to backend-developer or frontend-specialist
   - **Test bug** → Delegate back to test-writer
4. After fix, return to Phase 5 (re-run tests)

**Analysis process**:
```
"Test failures detected:

FAILED TESTS:
{list_of_failed_tests}

ANALYSIS:
• Test: {test_name}
• Error: {error_message}
• Likely cause: code_bug / test_bug / environment

Fixing by delegating to {subagent}..."
```

**Fix loop**:
```
1. Delegate fix to appropriate subagent
2. Wait for fix to be applied
3. Re-run automated tests (Phase 5)
4. If still failing, repeat from step 1
5. Only proceed when all tests pass
```

**Message to user**:
```
"⚠️ Test failures detected:

{summary_of_failures}

I'm fixing these now. This may require:
- Code fixes (backend-developer/frontend-specialist)
- Test fixes (test-writer)

Will re-run tests after each fix until all pass."
```

### Case C: Test Environment Issues

**Tests fail due to environment (database, containers, etc.)**

**Actions**:
1. Check container status: `docker compose ps`
2. Check database connectivity
3. Verify test environment is properly prepared
4. Fix environment issues
5. Re-run tests

**Common issues**:
- Database not ready
- Containers not running
- Test database not created properly
- Migration not applied to test database

## Integration with Workflow

This skill is the **SIXTH STEP** in the Agent Coder workflow:

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
6. parallel-tasks-execution (THIS SKILL)
   ↓
7a. pr-readiness-checklist (if tests pass)
7b. development-coordination (if tests fail - fix loop)
   ↓
... (continue workflow)
```

## Output Format

### After Parallel Completion

```
"Parallel execution complete!

✅ Automated Tests Created:
• {number} unit tests
• {number} integration tests
• {number} E2E tests

✅ Documentation Created:
• {list_of_.docs.md_files}

Test environment prepared: ./scripts/database/db-switch.sh clean

Running automated tests now..."
```

### After All Tests Pass

```
"✅ ALL TESTS PASSED!

Test Summary:
• Backend: PASS (coverage: {X}%)
• Frontend: PASS (coverage: {X}%)
• Integration: PASS
• E2E: PASS

Documentation complete:
• {files_created}

Feature ready for PR!"
```

### After Test Failures

```
"❌ TEST FAILURES

Failed Tests:
• {test_1}: {error}
• {test_2}: {error}

Analyzing failures...
{analysis}

Fixing via {subagent}...

Will re-run tests after fix."
```

## Common Pitfalls

**❌ DON'T**:
- Run test-writer and coder-doc-specialist sequentially (wastes time)
- Skip test environment preparation (db-switch.sh clean)
- Proceed to PR with failing tests
- Ignore test failures or warnings
- Forget to restore database after testing (if needed)

**✅ DO**:
- Delegate to BOTH subagents in parallel
- Wait for BOTH to complete before proceeding
- Use db-switch.sh clean before running tests
- Fix ALL test failures before proceeding
- Re-run tests after each fix

## Test Execution Commands Reference

```bash
# Prepare test environment
./scripts/database/db-switch.sh clean

# Backend tests
cd backend
npx prisma migrate deploy
npm test
npm test -- --coverage

# Frontend tests
cd frontend
npm test
npm run test:coverage

# Check test database status
./scripts/database/db-switch.sh status

# Restore development database (after testing)
./scripts/database/db-switch.sh populated
```

## Documentation File Location Examples

**Backend documentation**:
```
backend/src/features/character/characterService.ts
→ backend/src/features/character/characterService.docs.md

backend/src/features/character/character.controller.ts
→ backend/src/features/character/character.docs.md
```

**Frontend documentation**:
```
frontend/src/components/CharacterCard.tsx
 frontend/src/components/CharacterCard.docs.md

frontend/src/hooks/useCharacterDetail.ts
 frontend/src/hooks/useCharacterDetail.docs.md
```

## Handoff

### If All Tests Pass

**Next**: pr-readiness-checklist

**Message**:
```
"✅ All tests passing! Feature is complete.

Next: Final PR preparation checklist."
```

### If Tests Failed

**Next**: development-coordination (fix loop)

**Message**:
```
"Test failures detected. Re-entering development to fix:
{failures}

Will re-run tests after fixes."
```
