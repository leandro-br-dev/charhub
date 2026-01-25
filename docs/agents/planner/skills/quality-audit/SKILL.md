---
name: quality-audit
description: Analyze quality metrics and technical debt. Use during monthly/quarterly reviews to assess project health and create improvement plans.
---

# Quality Audit

## Purpose

Analyze code quality metrics, identify technical debt, and create balanced improvement plans that maintain development velocity while ensuring codebase health.

## When to Use

- Monthly quality reviews
- Quarterly technical debt planning
- Quality metrics trending poorly
- Before major releases

## Pre-Conditions

✅ Access to quality metrics
✅ Agent Coder/Reviewer feedback available
✅ Time allocated for analysis

## Quality Audit Workflow

### Phase 1: Gather Metrics

**Code quality metrics**:
```bash
# Backend test coverage
cd backend && npm test -- --coverage

# Frontend test coverage
cd frontend && npm test -- --coverage

# Lint status
cd backend && npm run lint
cd frontend && npm run lint

# TypeScript compilation
npm run build
```

**Project health metrics**:
- Bug rate (from Agent Reviewer)
- Feature completion rate
- Test coverage trends
- Technical debt inventory
- Documentation completeness

### Phase 2: Identify Technical Debt

**Categories**:
- **Code Quality**: Low test coverage, poor patterns, technical issues
- **Documentation**: Missing or outdated docs
- **Architecture**: Design inconsistencies, coupling issues
- **Performance**: Slow queries, memory leaks, bottlenecks
- **Security**: Vulnerabilities, insecure patterns
- **Infrastructure**: DevOps, monitoring, deployment issues

**Assessment**:
- Review code quality reports
- Check test coverage trends
- Identify patterns violations
- Survey outdated documentation

### Phase 3: Create Improvement Plan

**Balance new features with quality**:

```markdown
# Quality Improvement Plan - {Month/Quarter}

## Current State

**Test Coverage**:
- Backend: {X}%
- Frontend: {X}%

**Technical Debt**:
- High: {count} items
- Medium: {count} items
- Low: {count} items

## Improvement Initiatives

### Initiative 1: {Title}
- **Type**: Code Quality / Documentation / Architecture / Performance / Security
- **Effort**: {X} days
- **Impact**: {description}
- **Priority**: {HIGH/MEDIUM/LOW}
- **Assigned**: {agent/subagent}

### Initiative 2: {Title}
...

## Balance Strategy

**Sprint Allocation**:
- New Features: {X}%
- Quality Improvements: {X}%
- Bug Fixes: {X}%

**Next Sprint**:
- Feature: {feature-XXX}
- Quality: {initiative}

## Tracking

**Metrics to Track**:
- Test coverage: {target}%
- Technical debt: {target} items
- Bug rate: {target}
```

### Phase 4: Update Quality Dashboard

```bash
vim docs/06-operations/quality-dashboard.md
```

**Track**:
- Test coverage over time
- Technical debt trends
- Quality initiative completion
- Balance between features and quality

## Output Format

```
"Quality audit complete:

Current State:
- Backend coverage: {X}%
- Frontend coverage: {X}%
- Technical debt items: {count}

Improvement Plan:
- {initiative_1}: {effort} days
- {initiative_2}: {effort} days

Balance Strategy:
- New features: {X}%
- Quality: {X}%

Updated quality-dashboard.md"
```

## Integration with Workflow

```
quality-audit (THIS SKILL)
    ↓
Create improvement plan
    ↓
Update quality-dashboard.md
    ↓
feature-prioritization (includes quality initiatives)
```

---

Remember: **Quality Enables Speed**

Managed technical debt prevents future slowdowns and maintains development velocity.
