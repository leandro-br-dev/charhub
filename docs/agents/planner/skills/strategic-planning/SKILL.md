---
name: strategic-planning
description: Define product vision and create strategic roadmaps. Use during quarterly/annual planning to set direction and OKRs.
---

# Strategic Planning

## Purpose

Define product vision, create strategic roadmaps, and set Objectives and Key Results (OKRs) for the planning period (quarterly or annually).

## When to Use

- Quarterly strategic planning
- Annual roadmap creation
- Product direction clarification needed
- Stakeholder communication required

## Pre-Conditions

✅ Previous period performance reviewed
✅ Market analysis available
✅ Stakeholder input gathered
✅ Technical constraints understood

## Strategic Planning Workflow

### Phase 1: Define Product Vision

**Vision Statement**:

```markdown
# Product Vision - {Period}

## Vision Statement
{Compelling vision of where we want to be}

## Target Audience
- {primary_audience}
- {secondary_audience}

## Key Differentiators
- {differentiator_1}
- {differentiator_2}

## Success Metrics
- {metric_1}: {target}
- {metric_2}: {target}
```

**Questions to answer**:
- Where do we want to be in {timeframe}?
- Who are we building for?
- What makes us unique?
- What problems do we solve?

### Phase 2: Create Roadmap

**Quarterly roadmap**:

```markdown
# Roadmap - Q{quarter} {year}

## Themes
1. {theme_1}
2. {theme_2}
3. {theme_3}

## Month Breakdown

### Month 1
**Focus**: {primary_theme}
**Features**:
- FEATURE-XXX: {feature}
- FEATURE-YYY: {feature}

### Month 2
**Focus**: {primary_theme}
**Features**:
- FEATURE-ZZZ: {feature}

### Month 3
**Focus**: {primary_theme}
**Features**:
- FEATURE-WWW: {feature}

## Dependencies
- {dependency_1}: {description}
- {dependency_2}: {description}

## Risks
- {risk_1}: {mitigation}
- {risk_2}: {mitigation}
```

**Create roadmap file**:

```bash
vim docs/05-business/planning/roadmap/q{quarter}-{year}.md
```

### Phase 3: Set OKRs

**Objectives and Key Results**:

```markdown
# OKRs - Q{quarter} {year}

## Objective 1: {Objective}
**O-1**: {measurable_outcome}

**Key Results**:
- **KR-1.1**: {specific_metric} - {target}
- **KR-1.2**: {specific_metric} - {target}
- **KR-1.3**: {specific_metric} - {target}

## Objective 2: {Objective}
**O-2**: {measurable_outcome}

**Key Results**:
- **KR-2.1**: {specific_metric} - {target}
- **KR-2.2**: {specific_metric} - {target}
```

### Phase 4: Communicate Plan

**Update stakeholders**:

```markdown
# Strategic Plan Summary - {Period}

## Vision
{vision_summary}

## Key Themes
1. {theme_1}: {description}
2. {theme_2}: {description}
3. {theme_3}: {description}

## Timeline
- Month 1: {focus}
- Month 2: {focus}
- Month 3: {focus}

## OKRs
- O-1: {objective} ({progress}% complete)
- O-2: {objective} ({progress}% complete)

## Resource Allocation
- New Features: {X}%
- Quality: {X}%
- Infrastructure: {X}%
```

## Output Format

```
"Strategic plan created:

Period: Q{quarter} {year}

Vision: {vision_statement}

Themes:
1. {theme_1}
2. {theme_2}
3. {theme_3}

OKRs: {count} objectives with {count} key results

Roadmap: docs/05-business/planning/roadmap/q{quarter}-{year}.md

Ready for stakeholder communication."
```

## Integration with Workflow

```
strategic-planning (THIS SKILL)
    ↓
Create roadmap
    ↓
Set OKRs
    ↓
Communicate to stakeholders
    ↓
feature-prioritization (aligns with strategy)
```

---

Remember: **Strategy Guides Execution**

A clear strategic plan ensures Agent Coder works on the right things at the right time.
