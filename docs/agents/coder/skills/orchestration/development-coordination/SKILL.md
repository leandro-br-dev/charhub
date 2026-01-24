---
name: development-coordination
description: Coordinate feature implementation by delegating to specialized subagents. Use when actively managing the development phase of a feature, ensuring backend and frontend work are completed properly.
---

# Development Coordination

## Purpose

Orchestrate the implementation phase by delegating tasks to specialized subagents (backend-developer, frontend-specialist) and monitoring their work until both backend and frontend are complete.

## When to Use

- After git-branch-management (branch is created)
- Active development phase of a feature
- Coordinating backend and frontend implementation
- Ensuring all code changes are complete

## Pre-Conditions

✅ Feature analysis complete (action plan in memory)
✅ Feature branch created and verified
✅ Clear understanding of requirements
✅ Subagent delegation plan defined

## Coordination Workflow

### Phase 1: Assess Implementation Needs

**Check action plan from feature-analysis-planning**:

```markdown
Backend needed?  [ ] Yes  [ ] No
Frontend needed? [ ] Yes  [ ] No
Database changes? [ ] Yes  [ ] No
```

### Phase 2A: Backend Implementation (if needed)

**Delegate to**: `backend-developer` subagent

**When to delegate**:
- Implementing API endpoints
- Adding database fields/migrations
- Creating or modifying services
- Backend TypeScript development
- Business logic implementation

**Delegation message template**:
```
"Delegate to backend-developer:

Feature: {feature_name}
Requirements: {brief_summary}

Please implement the backend changes following CharHub conventions:
- API endpoints using Express patterns
- Database migrations if needed
- Service layer with proper error handling
- TypeScript interfaces (no 'any' types)
- Structured logging

Context: {relevant_context_from_spec}"
```

**Monitor progress**:
- Wait for backend-developer to complete
- Verify implementation matches requirements
- Check for any issues or blockers

**If backend-developer encounters issues**:
- Review the issue
- Provide clarification if needed
- Delegate to code-quality-enforcer if pattern issues
- Re-delegate if fixes are needed

### Phase 2B: Frontend Implementation (if needed)

**Delegate to**: `frontend-specialist` subagent

**When to delegate**:
- Creating Vue 3 components
- Implementing UI features
- Adding i18n translations
- Frontend TypeScript development
- Responsive UI design

**Delegation message template**:
```
"Delegate to frontend-specialist:

Feature: {feature_name}
Requirements: {brief_summary}

Backend context: {backend_api_info_if_available}

Please implement the frontend changes following CharHub conventions:
- React 19 with TypeScript
- i18n for ALL user-facing text (add to both en-US.json and pt-BR.json)
- Component interfaces and props
- Responsive design
- Follow existing component patterns

Context: {relevant_context_from_spec}"
```

**Monitor progress**:
- Wait for frontend-specialist to complete
- Verify implementation matches requirements
- Check i18n translations were added to BOTH languages
- Verify translations were compiled

**If frontend-specialist encounters issues**:
- Review the issue
- Provide clarification if needed
- Delegate to code-quality-enforcer if pattern issues
- Re-delegate if fixes are needed

### Phase 3: Parallel Execution (when both needed)

**If both backend and frontend are needed**:
- Can delegate to BOTH in parallel (independent tasks)
- Use single message with both delegations
- Wait for BOTH to complete before proceeding

**Parallel delegation template**:
```
"Delegate in parallel to BOTH:

1. backend-developer: {backend_requirements}
2. frontend-specialist: {frontend_requirements}

Wait for both to complete before reporting back."
```

### Phase 4: Integration Verification

**After both backend and frontend are complete**:

**Verification checklist**:
- [ ] Backend code compiles: `cd backend && npm run build`
- [ ] Frontend code compiles: `cd frontend && npm run build`
- [ ] Backend lint passes: `cd backend && npm run lint`
- [ ] Frontend lint passes: `cd frontend && npm run lint`
- [ ] i18n compiled: `npm run translations:compile`
- [ ] Docker containers can start: `docker compose up -d`

**If ANY verification fails**:
- Identify the failure
- Delegate to appropriate subagent for fixes
- Re-verify until all pass

## Communication with Subagents

### When Subagent Asks Questions

**Process**:
1. Understand the question
2. Check feature spec for answer
3. Provide clear, specific guidance
4. If unclear, note the ambiguity for future spec improvements

### When Subagent Reports Completion

**Verify**:
1. Review what was implemented
2. Check against requirements
3. Run verification commands
4. Only mark complete when verification passes

### When Subagent Encounters Blocker

**Process**:
1. Understand the blocker
2. Determine if it's a technical blocker or spec ambiguity
3. Provide guidance or ask for clarification
4. Update action plan if scope changes

## Integration with Workflow

This skill is the **THIRD STEP** in the Agent Coder workflow:

```
1. feature-analysis-planning
   ↓
2. git-branch-management
   ↓
3. development-coordination (THIS SKILL)
   ↓
4. server-stability-verification
   ↓
... (continue workflow)
```

## Output Format

When development-coordination is complete, be ready to communicate:

**Implementation Summary**:
- Backend changes: {what was implemented}
- Frontend changes: {what was implemented}
- Database changes: {migrations if any}
- New files created: {list}
- Modified files: {list}

**Verification Status**:
- ✅ Backend build: PASS/FAIL
- ✅ Frontend build: PASS/FAIL
- ✅ Backend lint: PASS/FAIL
- ✅ Frontend lint: PASS/FAIL
- ✅ i18n compiled: PASS/FAIL

**Ready for next phase**: YES/NO

## Common Pitfalls

**❌ DON'T**:
- Implement code yourself (delegate to specialists)
- Skip verification commands
- Mark complete without checking
- Ignore subagent questions
- Proceed with failing builds or lint

**✅ DO**:
- Delegate ALL implementation to subagents
- Verify ALL compilation and lint passes
- Ensure i18n translations in BOTH languages
- Run verification yourself
- Only proceed when everything passes

## Handoff to Next Phase

When development-coordination is complete and verified:

**Next skill**: server-stability-verification

**Message to user**:
```
"Development phase complete!

Summary:
{implementation_summary}

All verifications passed:
✅ Backend build
✅ Frontend build
✅ Lint checks
✅ i18n compiled

Moving to server stability verification..."
```
