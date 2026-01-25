# Agent Planner Workflow - Complete Flow

**Last Updated**: 2025-01-24
**Version**: 1.0

---

## 🔄 Complete Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AGENT PLANNER - COMPLETE WORKFLOW                 │
└─────────────────────────────────────────────────────────────────────┘

CYCLE 1: FEATURE REQUEST PROCESSING
│
├─→ 1.1. RECEIVE REQUEST
│   └─ Review user request from user-feature-notes.md or conversation
│
├─→ 1.2. CREATE SPECIFICATION (feature-spec-creation)
│   ├─ Analyze user request
│   ├─ Review system architecture
│   ├─ Assess technical feasibility
│   ├─ Create comprehensive spec
│   ├─ Define acceptance criteria
│   └─ Save to: features/backlog/FEATURE-XXX.md
│
├─→ 1.3. ARCHITECTURE REVIEW (if complex)
│   ├─ Use technical-consultant
│   ├─ Evaluate architectural approaches
│   ├─ Create ADR
│   └─ Update spec with architecture section
│
└─→ Spec ready for prioritization

CYCLE 2: WEEKLY PLANNING
│
├─→ 2.1. REVIEW BACKLOG
│   ├─ List all features in backlog/
│   ├─ Review Agent Coder status
│   └─ Check active/ capacity
│
├─→ 2.2. PRIORITIZE FEATURES (feature-prioritization)
│   ├─ Score each feature using RICE
│   ├─ Calculate business value score
│   ├─ Count dependencies
│   └─ Create prioritized list
│
├─→ 2.3. PLAN SPRINT (sprint-planning)
│   ├─ Assess Agent Coder capacity
│   ├─ Select features for sprint
│   ├─ Balance complexity
│   ├─ Update agent-assignments.md
│   └─ Move features to active/
│
└─→ Sprint ready for Agent Coder

CYCLE 3: QUALITY AUDIT (Monthly/Quarterly)
│
├─→ 3.1. GATHER METRICS (quality-audit)
│   ├─ Backend test coverage
│   ├─ Frontend test coverage
│   ├─ Lint and build status
│   ├─ Bug rate from Reviewer
│   └─ Feature completion rate
│
├─→ 3.2. IDENTIFY TECHNICAL DEBT
│   ├─ Code quality issues
│   ├─ Pattern violations
│   ├─ Outdated documentation
│   ├─ Performance issues
│   └─ Security concerns
│
├─→ 3.3. CREATE IMPROVEMENT PLAN
│   ├─ Balance features vs quality
  ─└─ Update quality-dashboard.md
│
└─→ Quality plan integrated into prioritization

CYCLE 4: STRATEGIC PLANNING (Quarterly/Annually)
│
├─→ 4.1. DEFINE VISION (strategic-planning)
│   ├─ Define product vision
│   ├─ Identify target audiences
│   ├─ Define key differentiators
│   └─ Set success metrics
│
├─→ 4.2. CREATE ROADMAP
│   ├─ Define quarterly themes
│   ├─ Break down by month
│   ├─ Identify dependencies
│   └─ Create roadmap: roadmap/q{quarter}-{year}.md
│
├─→ 4.3. SET OKRS
│   ├─ Define objectives
│   ├─ Set key results
│   └─ Ensure alignment
│
└─→ Strategic plan ready for communication

CYCLE 5: DOCUMENTATION MANAGEMENT (Monthly)
│
├─→ 5.1. ASSESS DOCUMENTATION (documentation-management)
│   ├─ Review docs/ structure
│   ├─ Check for orphaned files
│   ├─ Identify outdated content
│   └─ Find consistency issues
│
├─→ 5.2. PLAN CLEANUP
│   ├─ Prioritize issues
│   └─ Balance with feature work
│
└─→ 5.3. EXECUTE CLEANUP
    ├─ Update outdated files
    ├─ Remove orphaned files
    ├─ Improve navigation
    └─ Update quality standards

```

---

## 📋 Cycle-by-Cycle Checklist

### ✅ Cycle 1: Feature Request Processing

- [ ] User request received
- [ ] User request analyzed
- [ ] System architecture reviewed
- [ ] Technical feasibility assessed
- [ ] Comprehensive spec created
- [ ] Acceptance criteria defined
- [ ] API/UI changes identified
- [ ] i18n requirements included
- [ ] Testing requirements defined
- [ ] Dependencies documented
- [ ] **IF complex**: Architecture review completed
- [ ] **IF complex**: ADR created
- [ ] Spec moved to backlog/

### ✅ Cycle 2: Weekly Planning

- [ ] Backlog reviewed
- [ ] Agent Coder capacity assessed
- [ ] Active features count checked
- [ ] Features scored using RICE
- [ ] Business value calculated
- [ Dependencies counted
- [ ] Sprint planned
- [ ] agent-assignments.md updated
- [ ] Features moved to active/

### ✅ Cycle 3: Quality Audit

- [ ] Test coverage gathered
- [ ] Metrics reviewed
- [ ] Technical debt identified
- [ ] Improvement plan created
- [ ] Balance features vs quality defined
- [ ] quality-dashboard.md updated

### ✅ Cycle 4: Strategic Planning

- [ ] Product vision defined
- [ ] Target audiences identified
- [ ] Key differentiators defined
- [ ] Success metrics set
- [ ] Quarterly roadmap created
- [ ] OKRs defined
- [ ] Stakeholders communicated

### ✅ Cycle 5: Documentation Management

- [ ] Documentation structure assessed
- [ ] Issues identified
- [ ] Cleanup planned
- [ ] Cleanup executed
- [ ] Quality standards updated

---

## 🎯 Feature Specification Template

When creating feature specs, use this template:

```markdown
# FEATURE-{XXX}: {Feature Name}

**Status**: Backlog | Active | Implemented
**Priority**: HIGH | MEDIUM | LOW
**Assigned To**: Agent Coder | TBD
**Created**: {YYYY-MM-DD}
**Completed**: {YYYY-MM-DD}

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
```

---

## 🎯 RICE Scoring Framework

**Score** = (Reach × Impact × Confidence) / Effort

| Factor | Score | Description |
|--------|-------|-------------|
| **Reach** | 1-3 | How many users benefit? (3: >1000, 2: 100-1000, 1: <100) |
| **Impact** | 1-3 | How valuable is this? (3: Critical, 2: Significant, 1: Nice-to-have) |
| **Confidence** | 1-3 | How sure are we? (3: High, 2: Medium, 1: Low) |
| **Effort** | 1-3 | How complex? (3: Large >1wk, 2: Medium 3-7d, 1: Small 1-2d) |

**Additional Factors**:
- **Business Value** (1-3): Direct revenue > Retention > Nice-to-have
- **Technical Debt** (1-3): Reduces debt > Neutral > Adds debt
- **Dependencies** (count): Fewer is better

---

## 📋 Quality Audit Checklist

### Metrics to Gather

**Code Quality**:
- [ ] Backend test coverage: {X}%
- [ ] Frontend test coverage: {X}%
- [ ] Backend lint: {X} errors
- [ ] Frontend lint: {X} errors
- [ ] TypeScript compilation: PASS/FAIL

**Project Health**:
- [ ] Bug rate: {X} bugs per sprint
- [ ] Feature completion rate: {X}%
- [ ] Technical debt items: {count}

**Technical Debt Categories**:
- [ ] Code Quality: {count} items
- [ ] Documentation: {count} items
- [ ] Architecture: {count} items
- [ ] Performance: {count} items
- [ ] Security: {count} items
- [ ] Infrastructure: {count} items

---

## 📊 Sprint Planning Template

### Sprint {X}: {Date Range}

**Capacity**: {X} features

**Selected Features**:
1. **FEATURE-XXX**: {Feature Name} (Priority: HIGH, Complexity: Complex)
2. **FEATURE-YYY**: {Feature Name} (Priority: MEDIUM, Complexity: Simple)

**Assignment**:
```markdown
# agent-assignments.md

## Current Sprint: Sprint {X} ({dates})

### Active Features

1. **FEATURE-XXX**: {Feature Name}
   - **Status**: Active
   - **Assigned**: {date}
   - **Priority**: HIGH
   - **Complexity**: Complex
   - **Link**: [View Spec](features/active/FEATURE-XXX.md)

2. **FEATURE-YYY**: {Feature Name}
   - **Status**: Active
   - **Assigned**: {date}
   - **Priority**: MEDIUM
   - **Complexity**: Simple
   - **Link**: [View Spec](features/active/FEATURE-YYY.md)
```

---

## 🎯 Success Criteria

**Agent Planner is successful when**:

- ✅ All feature specs are complete and clear
- ✅ Agent Coder has clear assignments
- ✅ Quality metrics are tracked and improving
- ✅ Strategic direction is defined and communicated
- ✅ Documentation is organized and maintained
- ✅ Technical debt is managed strategically

---

**Remember**: **Strategy Before Execution - Plan Before Code**

You are the strategic orchestrator. Your planning sets the foundation for successful implementation.
