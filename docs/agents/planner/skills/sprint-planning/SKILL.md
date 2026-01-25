---
name: sprint-planning
description: Plan sprint capacity and assign features to Agent Coder. Use during weekly planning to create sprint plan and update agent-assignments.md.
---

# Sprint Planning

## Purpose

Plan sprint capacity, select features for the upcoming sprint, and assign them to Agent Coder by updating agent-assignments.md.

## When to Use

- Weekly planning cycle
- Agent Coder capacity available
- Previous sprint completed
- Ready to assign new features

## Pre-Conditions

✅ Features prioritized (from feature-prioritization)
✅ Agent Coder current status understood
✅ Feature backlog reviewed

## Sprint Planning Workflow

### Phase 1: Assess Capacity

**Check Agent Coder status**:

```bash
# Review current assignments
cat docs/05-business/planning/agent-assignments.md

# Check active features
ls docs/05-business/planning/features/active/

# Check implemented features
ls docs/05-business/planning/features/implemented/
```

**Capacity assessment**:
- How many features are currently active?
- How many can Agent Coder handle in parallel?
- Any features blocked or delayed?

**Typical capacity**: 1-2 features per sprint

### Phase 2: Select Features

**Select from prioritized list**:
- Top RICE score features
- Balance complexity (1 complex + 1-2 simple)
- Consider dependencies
- Balance backend/frontend work

**Selection criteria**:
- Spec is complete and clear
- Technical feasibility confirmed
- Dependencies available or can be made available
- Fits sprint capacity

### Phase 3: Update agent-assignments.md

**Update assignments file**:

```bash
vim docs/05-business/planning/agent-assignments.md
```

**Template**:

```markdown
# Agent Assignments

## Current Sprint (Sprint {X}: {dates})

### Active Features

1. **FEATURE-{XXX}**: {Feature Name}
   - **Status**: In Progress
   - **Assigned**: {YYYY-MM-DD}
   - **Priority**: {HIGH/MEDIUM/LOW}
   - **Complexity**: {Complex/Simple}
   - **Link**: [View Spec](../features/active/FEATURE-XXX.md)

2. **FEATURE-{YYY}**: {Feature Name}
   - **Status**: In Progress
   - **Assigned**: {YYYY-MM-DD}
   - **Priority**: {HIGH/MEDIUM/LOW}
   - **Complexity**: {Complex/Simple}
   - **Link**: [View Spec](../features/active/FEATURE-YYY.md)

### Upcoming Features

1. **FEATURE-{ZZZ}**: {Feature Name}
   - **Status**: Backlog
   - **Priority**: {HIGH/MEDIUM/LOW}
   - **Complexity**: {Complex/Simple}
   - **Link**: [View Spec](../features/backlog/FEATURE-ZZZ.md)

## Completed This Sprint

1. **FEATURE-{WWW}**: {Feature Name}
   - **Status**: Implemented
   - **Completed**: {YYYY-MM-DD}
   - **PR**: {#PR-number}

## Notes

{Any notes about sprint progress or blocking issues}
```

### Phase 4: Move Features to Active

**Move selected features**:

```bash
# Move selected features from backlog to active
git mv docs/05-business/planning/features/backlog/FEATURE-XXX.md \
        docs/05-business/planning/features/active/

# Update status in each file
# Change **Status**: Backlog → **Status**: Active
# Add **Assigned**: {current-date}
# Add **Assigned To**: Agent Coder
```

## Output Format

```
"Sprint planning complete:

Sprint {X}: {date-range}

Features Assigned ({count}):
1. FEATURE-XXX ({name}) - {complexity}
2. FEATURE-YYY ({name}) - {complexity}

Agent Coder capacity: {count} feature(s)

Features moved to active/:
- FEATURE-XXX
- FEATURE-YYY

agent-assignments.md updated"
```

## Integration with Workflow

```
feature-prioritization
    ↓
sprint-planning (THIS SKILL)
    ↓
Update agent-assignments.md
    ↓
Move features to active/
```

---

Remember: **Clear Assignments = Successful Implementation**

Agent Coder needs clear assignments and complete specs to be successful.
