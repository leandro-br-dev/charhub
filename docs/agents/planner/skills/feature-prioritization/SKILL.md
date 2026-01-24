---
name: feature-prioritization
description: Score and prioritize features using RICE framework. Use during weekly planning cycles, sprint planning, or backlog management.
---

# Feature Prioritization

## Purpose

Score and prioritize features objectively using the RICE framework, balancing business value with implementation complexity and effort.

## When to Use

- Weekly planning cycles
- Sprint planning
- New feature added to backlog
- Re-prioritization needed
- Agent capacity available

## Pre-Conditions

✅ Features to prioritize exist (specs created)
✅ Agent Coder capacity understood
✅ Business priorities known

## Prioritization Framework

### RICE Scoring

Score each feature using **RICE**:

**R**each - How many users will this benefit?
- 3: >1000 users
- 2: 100-1000 users
- 1: <100 users

**I**mpact - How much value does this provide?
- 3: Critical impact / transformational
- 2: Significant improvement
- 1: Nice to have

**C**onfidence - How confident are we in the estimates?
- 3: High confidence (done similar before)
- 2: Medium confidence (some uncertainty)
- 1: Low confidence (many unknowns)

**E**ffort - How much work is this?
- 3: Large effort (>1 week)
- 2: Medium effort (3-7 days)
- 1: Small effort (1-2 days)

**RICE Score**: (Reach × Impact × Confidence) / Effort

### Additional Factors

**Business Value** (1-3):
- 3: Direct revenue impact
- 2: User retention / engagement
- 1: Nice to have

**Technical Debt** (1-3):
- 3: Reduces significant technical debt
- 2: Minor debt reduction
- 1: Neutral or adds debt

**Dependencies** (count):
- Number of unimplemented dependencies
- Higher count = lower priority (enables more features)

## Prioritization Workflow

### Phase 1: Gather Features

```bash
# List all features in backlog
ls docs/05-business/planning/features/backlog/

# Review agent-assignments for context
cat docs/05-business/planning/agent-assignments.md
```

### Phase 2: Score Features

**Create scoring matrix**:

| Feature | Reach | Impact | Confidence | Effort | RICE | Business | Debt | Deps |
|---------|--------|--------|------------|--------|------|----------|------|------|
| Feature A | 3 | 3 | 3 | 2 | 13.5 | 3 | - | 0 |
| Feature B | 2 | 2 | 2 | 1 | 8 | 2 | - | 1 |
| Feature C | 3 | 1 | 3 | 3 | 3 | 1 | - | 0 |

### Phase 3: Apply Adjustments

**Complexity Adjustment**:
- If score is close, consider complexity
- Prefer simpler features first (quick wins)
- Balance high-effort with low-effort

**Strategic Factors**:
- User-facing features typically prioritized
- Infrastructure features balance with features
- Quality improvements weighted with business value

### Phase 4: Create Sprint Plan

**Agent Coder Capacity** (typical):
- 1-2 features per sprint
- Or 1 complex + 1-2 simple features

**Sprint composition**:
- 1 "anchor" feature (main business value)
- 1-2 "filler" features (lower complexity)
- Balance backend and frontend work

## Output Format

**Prioritized feature list**:

```
"Features prioritized for sprint:

HIGH PRIORITY (RICE > 10):
1. FEATURE-XXX ({score}) - {name}
2. FEATURE-YYY ({score}) - {name}

MEDIUM PRIORITY (RICE 5-10):
3. FEATURE-ZZZ ({score}) - {name}

LOWER PRIORITY (RICE < 5):
4. FEATURE-WWW ({score}) - {name}

Sprint recommendation:
{feature_1} + {feature_2} (if capacity allows)"
```

## Integration with Workflow

This skill is used during planning cycles:

```
feature-spec-creation
    ↓
feature-prioritization (THIS SKILL)
    ↓
sprint-planning
```

---

Remember: **Prioritize for Impact, Implement for Velocity**

High-impact features that can be delivered quickly beat high-impact features that take forever.
