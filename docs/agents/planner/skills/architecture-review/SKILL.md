---
name: architecture-review
description: Review complex feature architecture and create Architecture Decision Records. Use when complex features need architectural assessment before implementation.
---

# Architecture Review

## Purpose

Review and validate the architectural approach for complex features, document decisions with trade-offs, and provide implementation guidance to Agent Coder.

## When to Use

- Complex feature needs architectural review
- Multiple architectural approaches possible
- Cross-cutting concerns (performance, security, scalability)
- Technology decisions needed

## Pre-Conditions

✅ Feature specification exists
✅ Technical-consultant subagent available
✅ Architecture documentation reviewed

## Architecture Review Workflow

### Phase 1: Review Specification

**Assess complexity**:
- Does this feature cross system boundaries?
- Are there performance implications?
- Are there security considerations?
- Does this impact scalability?
- Are there multiple valid approaches?

### Phase 2: Evaluate Approaches

**Consider options**:

| Approach | Pros | Cons | Complexity |
|----------|------|------|------------|
| Option A | {pro} | {con} | {High/Med/Low} |
| Option B | {pro} | {con} | {High/Med/Low} |

**Evaluation criteria**:
- Performance characteristics
- Implementation complexity
- Maintainability
- Scalability
- Security implications
- Development time

### Phase 3: Document Decision

**Create Architecture Decision Record (ADR)**:

```bash
# Create ADR
vim docs/04-architecture/decisions/ADR-{number}-{title}.md
```

**ADR Template**:

```markdown
# ADR-{number}: {Decision Title}

**Status**: Accepted | Proposed | Deprecated | Superseded
**Date**: {YYYY-MM-DD}
**Context**: {Feature/Issue}

## Decision

We will {chosen approach} for {feature} because {rationale}.

## Context

{Background information, problem statement, constraints}

## Considered Options

### Option 1: {Name}
**Approach**: {description}
- **Pros**: {list}
- **Cons**: {list}
- **Complexity**: {High/Med/Low}

### Option 2: {Name}
...

## Decision Makers

- {Name} ({role})

## Decision

{Chosen approach} with rationale:

**Key Factors**:
- {factor_1}: {weight}
- {factor_2}: {weight}
- {factor_3}: {weight}

## Consequences

- **Positive**: {outcomes}
- **Negative**: {trade-offs}
- **Risks**: {identified risks}

## Implementation Guidance

{Technical details for Agent Coder}

## Related Decisions

- ADR-{XXX}: {related decision}
```

### Phase 4: Provide Implementation Guidance

**Update feature spec**:

```bash
vim docs/05-business/planning/features/{backlog,active}/FEATURE-XXX.md
```

**Add section**:

```markdown
## Architecture

### Approach
{chosen approach}

### Key Decisions
- {decision_1}
- {decision_2}

### Architecture Reference
- ADR-{number}: {title}

### Implementation Notes
{guidance for Agent Coder}
```

## Output Format

```
"Architecture review complete:

Feature: {feature_name}

Decision: {chosen approach}

ADR Created: docs/04-architecture/decisions/ADR-{number}-{title}.md

Key Trade-offs:
- {tradeoff_1}
- {tradeoff_2}

Implementation guidance added to spec."
```

## Integration with Workflow

```
feature-spec-creation
    ↓
architecture-review (THIS SKILL)
    ↓
Create ADR
    ↓
Update spec with architecture section
```

---

Remember: **Architectural Decisions Have Long-Term Impact**

Take the time to thoroughly evaluate options and document decisions. Future you (and others) will thank current you.
