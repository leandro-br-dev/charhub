---
name: manual-testing-protocol
description: Protocol for requesting and managing manual testing from the user. Use after server is stable to request user testing of new features before proceeding to automated testing and documentation.
---

# Manual Testing Protocol

## Purpose

Request and manage manual testing from the user, ensuring new features work correctly before proceeding to automated testing and documentation phases.

## When to Use

- AFTER server-stability-verification (server is stable)
- BEFORE automated testing and documentation phases
- When user needs to manually verify feature functionality
- After bug fixes that need verification

## Pre-Conditions

✅ Server is stable and verified
✅ Backend and frontend services running
✅ Database migrations applied
✅ All new features implemented

## Manual Testing Request

### Step 1: Prepare Testing Information

**Gather from action plan**:
- Feature name and description
- New functionality implemented
- Backend changes (API endpoints, services)
- Frontend changes (components, pages)
- Any configuration changes

### Step 2: Create Clear Testing Instructions

**Include in testing request**:

**Feature Summary**:
```
Feature: {feature_name}
Description: {brief_description}
```

**What Was Implemented**:
```
Backend:
• {backend_changes}
• New endpoints: {list_endpoints}
• Database changes: {if_any}

Frontend:
• {frontend_changes}
• New components: {list_components}
• New pages: {list_pages}
```

**Testing Instructions**:
```
Please test the following:

1. {specific_test_case_1}
   • Go to: {url_or_navigation}
   • Expected: {expected_behavior}

2. {specific_test_case_2}
   • Go to: {url_or_navigation}
   • Expected: {expected_behavior}

3. {specific_test_case_3}
   • Go to: {url_or_navigation}
   • Expected: {expected_behavior}
```

**Access URLs**:
```
Frontend: http://localhost:3000
Backend API: http://localhost:3001
```

### Step 3: Present Testing Request to User

**Use clear, structured message**:

```
🧪 MANUAL TESTING REQUIRED

Feature: {feature_name}

The following changes have been implemented and the server is ready for testing.

IMPLEMENTATION SUMMARY:
{implementation_summary}

TESTING CHECKLIST:
{testing_checklist}

Please test each item and report back with:
✅ PASS - if everything works as expected
❌ FAIL - if you encounter any issues (with details)

Take your time testing. When done, let me know the results.
```

### Step 4: Wait for User Response

**DO NOT proceed to next phase** until user responds.

**While waiting**:
- Stay available for questions
- Be ready to clarify testing instructions
- Don't start automated testing yet

## Handling User Feedback

### Case A: All Tests Passed ✅

**User reports**: "All tests passed" or checklist with all ✅

**Response**:
```
"Excellent! All manual tests passed. ✅

Moving to the next phase:
- Automated testing (test-writer)
- Documentation (coder-doc-specialist)

These will run in parallel."
```

**Next skill**: parallel-tasks-execution

### Case B: Some Tests Failed ❌

**User reports**: Failures with details

**Process**:
1. **Understand the failure**
   - What functionality failed?
   - What was the expected vs actual behavior?
   - Any error messages or screenshots?

2. **Categorize the failure**
   - Backend bug (API issue, data problem)
   - Frontend bug (UI issue, behavior problem)
   - Configuration issue
   - User error (misunderstanding)

3. **Delegate fix to appropriate subagent**
   - Backend issues → `backend-developer`
   - Frontend issues → `frontend-specialist`
   - Quality/pattern issues → `code-quality-enforcer`

4. **After fix is applied**
   - Go back to `server-stability-verification`
   - Re-verify server is stable
   - Request manual testing again (only failed items)

**Response template**:
```
"Thank you for testing! I see {number} issue(s):

ISSUE 1: {description}
• Type: Backend/Frontend
• Expected: {expected}
• Actual: {actual}

I'll fix this now. Delegating to {subagent}...

[After fix]
Fix applied! Please re-test:
• {re_test_instructions}

Let me know the results."
```

### Case C: User Has Questions

**User asks**: Questions about how to test or what something means

**Process**:
1. Answer the question clearly
2. Provide additional context if needed
3. Offer alternative testing approach if helpful
4. Continue waiting for testing results

**Response**:
```
"Good question!

{answer_to_question}

{additional_context_if_needed}

Please continue testing when ready and let me know the results."
```

## Testing Best Practices

### For Backend Changes

**Test**:
- API endpoints return correct data
- Error handling works (try invalid inputs)
- Authentication/authorization if applicable
- Database operations (create, read, update, delete)
- Edge cases (empty data, large data, special characters)

### For Frontend Changes

**Test**:
- UI renders correctly
- Interactions work (buttons, forms, navigation)
- i18n translations display properly
- Responsive design (different screen sizes)
- Error messages display appropriately
- Loading states work

### For Database Changes

**Test**:
- New tables/columns are created
- Data can be saved and retrieved
- Migrations don't break existing data
- Constraints work (if any added)

## Integration with Workflow

This skill is the **FIFTH STEP** in the Agent Coder workflow:

```
1. feature-analysis-planning
   ↓
2. git-branch-management
   ↓
3. development-coordination
   ↓
4. server-stability-verification
   ↓
5. manual-testing-protocol (THIS SKILL)
   ↓
6a. parallel-tasks-execution (if tests passed)
6b. development-coordination (if tests failed - fix loop)
   ↓
... (continue workflow)
```

## Output Format

### When Requesting Testing

**Structure**:
```
🧪 MANUAL TESTING REQUIRED

[Feature Summary]
[What Changed]
[Testing Instructions]
[Access Information]

Please test and report back.
```

### After Testing Passed

**Message**:
```
"✅ Manual testing passed!

All features verified and working.
Proceeding to automated testing and documentation phases."
```

### After Testing Failed

**Message**:
```
"Issues found during testing:

{issue_summary}

Fixing now...
{fix_actions}

Please re-test: {re_test_instructions}
```

## Common Pitfalls

**❌ DON'T**:
- Proceed to next phase without user confirmation
- Skip manual testing even if "code looks good"
- Ignore user feedback or issues reported
- Assume user knows how to test without instructions
- Start automated testing while user is still manual testing

**✅ DO**:
- Provide clear testing instructions
- List specific test cases
- Wait for explicit user confirmation
- Address all reported issues
- Re-test after fixes

## Testing Request Templates

### Template 1: Simple Feature

```
🧪 MANUAL TESTING REQUIRED

Feature: User Profile Page

IMPLEMENTED:
• New user profile page at /profile/:id
• Displays user information
• Shows user's characters

TESTING:
1. Go to http://localhost:3000/profile/1
2. Verify user information displays
3. Verify character list shows

Expected: Profile page loads with user info and characters.

Please test and report back! ✅ or ❌
```

### Template 2: API Endpoint

```
🧪 MANUAL TESTING REQUIRED

Feature: Character Statistics API

IMPLEMENTED:
• GET /api/characters/:id/statistics
• Returns character stats (total interactions, etc.)

TESTING:
1. Visit: http://localhost:3001/api/characters/1/statistics
2. Verify JSON response with stats
3. Try with non-existent character ID

Expected: Stats for valid character, 404 for invalid.

Please test and report back! ✅ or ❌
```

### Template 3: Complex Feature

```
🧪 MANUAL TESTING REQUIRED

Feature: Character Avatar Correction

IMPLEMENTED:
Backend:
• POST /api/characters/:id/correct-avatar
• Queue system for async processing
• WebSocket updates on completion

Frontend:
• "Correct Avatar" button on character page
• Progress indicator during correction
• Success/error notifications

TESTING:
1. Go to character page: http://localhost:3000/characters/1
2. Click "Correct Avatar" button
3. Verify progress indicator shows
4. Wait for completion (may take 30-60 seconds)
5. Verify success notification appears
6. Verify avatar was updated
7. Try again immediately (should see "in progress" message)

Expected: Avatar correction completes successfully with progress updates.

Please test thoroughly and report back with results! ✅ or ❌
```

## Handoff

### If Tests Passed

**Next**: parallel-tasks-execution

**Message**:
```
"✅ All manual tests passed!

Starting next phase (parallel execution):
1. Automated testing (test-writer)
2. Documentation (coder-doc-specialist)

These will run simultaneously to save time."
```

### If Tests Failed

**Next**: development-coordination (fix loop)

**Message**:
```
"Issues found. Re-entering development phase to fix:

{issues_list}

Fixing now via {subagent}..."
```
