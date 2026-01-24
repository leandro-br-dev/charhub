---
name: feature-analysis-planning
description: Analyze feature specifications and create action plans in memory. Use when starting work on a new feature or when Agent Coder needs to understand requirements and plan implementation steps.
---

# Feature Analysis and Planning

## Purpose

Analyze feature specifications from `docs/05-business/planning/features/active/` and create a comprehensive action plan in memory to guide the development workflow.

## When to Use

- Starting work on a new feature
- Agent Coder receives assignment from Agent Planner
- Need to understand requirements before delegation
- Feature specification is unclear or complex

## Analysis Steps

### 1. Read Feature Specification

**Location**: `docs/05-business/planning/features/active/{feature-name}.md`

**Extract**:
- Feature title and description
- Requirements (functional and non-functional)
- Acceptance criteria
- Technical considerations
- Dependencies
- Priority level

### 2. Create Action Plan (In Memory)

**DO NOT create a file** - store in memory for reference during workflow.

**Action Plan Structure**:

```markdown
## Feature: [Feature Name]

### Requirements Breakdown
- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

### Technical Tasks
- [ ] Backend changes needed (if applicable)
- [ ] Frontend changes needed (if applicable)
- [ ] Database migrations needed (if applicable)
- [ ] API endpoints to implement (if applicable)
- [ ] UI components to create (if applicable)

### Subagent Delegation Plan
- Phase 1 (Implementation): [backend-developer/frontend-specialist]
- Phase 2 (Testing): [test-writer]
- Phase 3 (Quality): [feature-tester]
- Phase 4 (Documentation): [coder-doc-specialist]
- Phase 5 (PR): [pr-prep-deployer]

### Risk Factors
- [ ] Identified risk 1
- [ ] Identified risk 2
```

### 3. Identify Required Subagents

Based on analysis, determine which subagents will be needed:

| Subagent | Purpose | When to Delegate |
|----------|---------|------------------|
| `backend-developer` | API, database, services | Backend changes required |
| `frontend-specialist` | UI components, i18n | Frontend changes required |
| `test-writer` | Automated tests | After implementation |
| `feature-tester` | Test execution | Before PR |
| `coder-doc-specialist` | Documentation | After implementation |
| `pr-prep-deployer` | PR creation | All tests passing |

### 4. Validate Feasibility

**Check**:
- Are requirements clear?
- Are dependencies available?
- Is technical approach feasible?
- Any blockers identified?

**If unclear**:
- Ask Agent Planner for clarification
- Comment on feature spec file
- DO NOT proceed until clarified

## Decision Points

### If Feature is Unclear
```
1. Stop and read spec again carefully
2. Identify specific unclear points
3. Ask Agent Planner via comment on spec file
4. Wait for clarification before proceeding
```

### If Feature Has Dependencies
```
1. Check if dependencies are implemented
2. If not, check if they're in active features
3. Coordinate with Agent Planner if blocked
4. Document dependency status in action plan
```

### If Feature Spans Multiple Domains
```
1. Plan parallel subagent execution
2. Backend and frontend can work in parallel
3. Coordinate integration points
4. Plan for integration testing
```

## Output Format

After analysis, be ready to communicate:

**Feature Summary**: One-sentence description of what will be built

**Implementation Approach**: Brief technical strategy

**Subagent Plan**: Which subagents will be used and in what order

**Estimated Phases**: How many phases of delegation are needed

## Integration with Workflow

This skill is the **FIRST STEP** in the Agent Coder workflow:

```
1. feature-analysis-planning (THIS SKILL)
   ↓
2. git-branch-management
   ↓
3. development-coordination
   ↓
... (continue workflow)
```

## Common Pitfalls

**❌ DON'T**:
- Skip reading the full feature spec
- Assume requirements without clarification
- Start implementation without clear understanding
- Create files for the action plan (keep in memory)

**✅ DO**:
- Read entire spec before planning
- Ask questions when unclear
- Identify all required subagents upfront
- Consider dependencies and risks

## Example Internal Monologue

```
"Analyzing feature spec for 'user-statistics-dashboard'...

Requirements:
- Display user activity statistics
- Show character interaction metrics
- Filterable by date range
- Export to CSV functionality

Technical breakdown:
- Backend: New API endpoints for stats aggregation
- Frontend: New dashboard component with charts
- Database: May need new aggregate queries

Subagent plan:
1. backend-developer - Implement stats API
2. frontend-specialist - Create dashboard UI
3. test-writer - Write tests for both
4. coder-doc-specialist - Document new endpoints
5. feature-tester - Verify everything works
6. pr-prep-deployer - Create PR

Risk: Stats queries might be slow - need to consider optimization.

Ready to proceed with git-branch-management skill."
```
