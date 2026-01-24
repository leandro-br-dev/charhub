---
name: feature-spec-creation
description: Create detailed feature specifications from user requests. Use when translating user needs into technical specifications for Agent Coder to implement.
---

# Feature Specification Creation

## Purpose

Transform user requests into comprehensive, technically sound feature specifications that Agent Coder can implement successfully.

## When to Use

- User requests new feature
- Feature in backlog needs detailed spec
- User provides vague requirements that need clarification
- Existing spec is incomplete

## Pre-Conditions

✅ User request received (in user-feature-notes.md or conversation)
✅ Current system architecture understood
✅ Similar features reviewed (if applicable)

## Specification Workflow

### Phase 1: Analyze User Request

**Gather context**:

```bash
# Review user request source
cat docs/05-business/planning/user-feature-notes.md

# Understand current system
cat docs/04-architecture/system-overview.md
cat docs/04-architecture/database-schema.md
```

**Key questions to answer**:
- What problem does the user want to solve?
- Who are the users affected?
- What value does this provide?
- How do users currently solve this?
- What would be the ideal solution?

**Identify**:
- User personas affected
- Pain points addressed
- Expected outcomes
- Success metrics

### Phase 2: Technical Feasibility Assessment

**Consult technical references**:

```bash
# System architecture
cat docs/04-architecture/system-overview.md

# Database schema
cat docs/04-architecture/database-schema.md

# Existing patterns
cat docs/03-reference/backend/README.md
cat docs/03-reference/frontend/README.md
```

**Assess**:
- Does current architecture support this?
- What components need to change?
- Performance implications?
- Database changes needed?
- Security considerations?
- Dependencies on other features?

**If feature is COMPLEX**:
- Recommend using `technical-consultant` subagent for detailed architecture review
- Note this in specification for Agent Planner

### Phase 3: Create Specification Document

**Create spec file**:

```bash
# Create new feature spec in backlog
vim docs/05-business/planning/features/backlog/FEATURE-{XXX}-{feature-name}.md
```

**Use this template**:

```markdown
# FEATURE-{XXX}: {Feature Name}

**Status**: Backlog
**Priority**: {TBD}
**Assigned To**: {TBD}
**Created**: {YYYY-MM-DD}

## Problem Statement

{Clear description of the problem this feature solves}

### Current Pain Points
- {Pain point 1}
- {Pain point 2}

### Target Users
- {User persona 1}
- {User persona 2}

### Value Proposition
{What value does this provide?}

## User Stories

### Story 1: {Title}
**As a** {user persona},
**I want** {action},
**So that** {benefit}.

**Acceptance Criteria**:
- [ ] {Criterion 1}
- [ ] {Criterion 2}
- [ ] {Criterion 3}

### Story 2: {Title}
...

## Technical Approach

### Backend Changes

**API Endpoints**:
- `GET /api/v1/{resource}` - {description}
- `POST /api/v1/{resource}` - {description}

**Database Changes**:
- {Table}: {field changes}
- Migrations: {description}

**Services**:
- {Service}: {responsibilities}

### Frontend Changes

**Components**:
- {Component}: {purpose}

**Pages/Routes**:
- {Page}: {purpose}

**i18n Keys**:
- `{namespace}.{key}`: {English text}

## Dependencies

- {Feature 1}: {dependency description}
- {Feature 2}: {dependency description}

## Testing Requirements

### Manual Testing
- {Test case 1}
- {Test case 2}

### Automated Testing
- Unit tests for: {services/components}
- Integration tests for: {API endpoints}
- E2E tests for: {critical user flows}

## Success Criteria

- [ ] All user stories implemented
- [ ] All acceptance criteria met
- [ ] Manual tests pass
- [ ] Automated tests pass with >{X}% coverage
- [ ] No regressions in existing features

## Open Questions

{List any unclear requirements or decisions needed}

## Notes

{Any additional context or considerations}
```

### Phase 4: Review and Refine

**Self-verification**:
- [ ] Problem statement is clear
- [ ] User stories are actionable
- [ ] Acceptance criteria are testable
- [ ] Technical approach is sound
- [ ] Dependencies are identified
- [ ] Testing requirements are defined

**Quality checks**:
- Spec is comprehensive enough for Agent Coder to implement
- No critical information missing
- Technical feasibility is plausible
- i18n requirements are included

## Integration with Workflow

This skill is the **FIRST STEP** when processing user requests:

```
User Request
    ↓
feature-spec-creation (THIS SKILL)
    ↓
technical-feasibility (if complex)
    ↓
feature-prioritization
    ↓
Move to backlog
```

## Output Format

When spec creation is complete:

```
"Feature specification created:

File: docs/05-business/planning/features/backlog/FEATURE-XXX.md

Summary:
{brief_summary}

User Stories: {count}
Technical Approach: {summary}
Dependencies: {count}

Ready for prioritization."
```

## Common Pitfalls

**❌ DON'T**:
- Create vague specs that Agent Coder can't implement
- Skip technical feasibility assessment
- Forget to include i18n requirements
- Omit acceptance criteria
- Ignore dependencies on other features

**✅ DO**:
- Be specific and detailed
- Assess technical feasibility
- Include all i18n requirements
- Define clear acceptance criteria
- Identify all dependencies
- Consider edge cases

## Spec Quality Checklist

Before marking spec complete:

- [ ] Problem statement clear
- [ ] Target users identified
- [ ] User stories complete
- [ ] Acceptance criteria testable
- [ ] Technical approach sound
- [ ] API changes defined
- [ ] Database changes defined
- [ ] Frontend changes defined
- [ ] i18n requirements included
- [ ] Dependencies identified
- [ ] Testing requirements defined
- [ ] Success criteria clear

---

Remember: **Clear Specs = Successful Implementation**

Agent Coder can only implement what you specify clearly. Take the time to create comprehensive specifications.
