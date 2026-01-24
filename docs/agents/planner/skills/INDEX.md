# Agent Planner Skills

**Last Updated**: 2025-01-24
**Purpose**: Specialized skills for Agent Planner orchestration workflow

---

## Overview

These are the specialized skills available to **Agent Planner** for orchestrating strategic planning, feature specification, quality assurance, and roadmap development. Each skill represents a phase in the planning workflow and provides specific guidance and procedures.

**Important**: These skills are specific to Agent Planner. Other agents will have their own specialized skill sets.

---

## Skills by Workflow Phase

### Phase 1: Feature Specification

| Skill | Purpose | When Used |
|-------|---------|-----------|
| **feature-spec-creation** | Create detailed feature specifications | User requests feature |
| **technical-feasibility** | Assess implementation feasibility | Before creating complex specs |

### Phase 2: Prioritization & Planning

| Skill | Purpose | When Used |
|-------|---------|-----------|
| **feature-prioritization** | Score and prioritize features | Weekly planning, sprint planning |
| **sprint-planning** | Plan sprint capacity and assignments | Weekly planning cycle |

### Phase 3: Quality & Architecture

| Skill | Purpose | When Used |
|-------|---------|-----------|
| **quality-audit** | Analyze quality metrics and technical debt | Monthly/quarterly reviews |
| **architecture-review** | Review complex feature architecture | Complex features need review |

### Phase 4: Strategic Planning

| Skill | Purpose | When Used |
|-------|---------|-----------|
| **strategic-planning** | Define product vision and roadmap | Quarterly/annual planning |
| **documentation-management** | Manage core documentation structure | Monthly documentation reviews |

---

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   AGENT PLANNER WORKFLOW                   │
└─────────────────────────────────────────────────────────────┘

REQUEST CYCLE
│
├─→ feature-spec-creation
│   └─ Create comprehensive feature spec
│
├─→ technical-feasibility (if complex)
│   └─ Assess feasibility and approach
│
├─→ feature-prioritization
│   └─ Score and prioritize feature
│
├─→ sprint-planning
│   └─ Assign to agent-assignments.md
│
PLANNING CYCLE
│
├─→ quality-audit
│   └─ Analyze metrics, create improvement plan
│
├─→ architecture-review (as needed)
│   └─ Review complex features, create ADRs
│
├─→ strategic-planning
│   └─ Define vision, create roadmap
│
└─→ documentation-management
    └─ Review docs/ structure, organize
```

---

## Skill Details

### 1. feature-spec-creation

**Location**: `skills/feature-spec-creation/SKILL.md`

**What it does**:
- Analyzes user requests
- Creates comprehensive feature specifications
- Defines acceptance criteria
- Identifies technical requirements

**Key outputs**:
- Feature specification document
- Technical approach
- API/UI changes identified
- Testing requirements defined

---

### 2. technical-feasibility

**Location**: `skills/technical-feasibility/SKILL.md`

**What it does**:
- Assesses technical feasibility
- Identifies architectural implications
- Evaluates performance impact
- Recommends implementation approach

**Key outputs**:
- Feasibility assessment
- Architecture recommendations
- Risk identification
- Implementation approach

---

### 3. feature-prioritization

**Location**: `skills/feature-prioritization/SKILL.md`

**What it does**:
- Scores features using RICE framework
- Balances business value with complexity
- Considers dependencies
- Creates prioritized backlog

**Key outputs**:
- Feature scores
- Prioritized list
- Capacity analysis
- Sprint recommendations

---

### 4. sprint-planning

**Location**: `skills/sprint-planning/SKILL.md`

**What it does**:
- Plans sprint capacity
- Assigns features to Agent Coder
- Updates agent-assignments.md
- Moves specs to active/

**Key outputs**:
- Sprint plan
- Updated agent-assignments.md
- Features moved to active/

---

### 5. quality-audit

**Location**: `skills/quality-audit/SKILL.md`

**What it does**:
- Analyzes quality metrics
- Identifies technical debt
- Creates improvement plan
- Balances new features with quality

**Key outputs**:
- Quality analysis
- Technical debt inventory
- Improvement initiatives
- Quality recommendations

---

### 6. architecture-review

**Location**: `skills/architecture-review/SKILL.md`

**What it does**:
- Reviews complex feature architecture
- Creates Architecture Decision Records
- Documents trade-offs
- Provides implementation guidance

**Key outputs**:
- Architecture assessment
- ADR documents
- Implementation guidance
- Risk assessment

---

### 7. strategic-planning

**Location**: `skills/strategic-planning/SKILL.md`

**What it does**:
- Defines product vision
- Creates quarterly/annual roadmaps
- Sets OKRs
- Communicates strategy

**Key outputs**:
- Product vision
- Roadmap documents
- OKR definitions
- Strategic communication

---

### 8. documentation-management

**Location**: `skills/documentation-management/SKILL.md`

**What it does**:
- Reviews docs/ structure
- Identifies cleanup opportunities
- Organizes documentation
- Maintains quality standards

**Key outputs**:
- Documentation assessment
- Cleanup recommendations
- Organized structure
- Quality standards

---

## Usage Notes

### How Agent Planner Uses These Skills

1. **Sequential execution**: Skills invoked in workflow order
2. **Conditional branching**: Route to different skills based on context
3. **Loop handling**: Re-prioritize after quality audits

### Skills vs Subagent Delegation

**Skills** (Agent Planner):
- Orchestration procedures
- Workflow management
- Documentation templates
- Quality frameworks

**Subagents** (specialists):
- Actual spec writing
- Prioritization analysis
- Quality metrics analysis
- Strategic planning execution
- Architecture assessment
- Documentation organization

### When Skills Are Invoked

- **Automatically**: As part of defined workflow
- **Conditionally**: Based on feature complexity
- **Explicitly**: When Agent Planner determines specific guidance needed

---

## Maintenance

**When to update these skills**:
- Workflow processes change
- New quality metrics added
- Prioritization frameworks evolve
- Documentation standards change

**Keep in sync with**:
- `CLAUDE.md` (Agent Planner main instructions)
- Subagent documentation in `sub-agents/`
- Project planning documentation

---

## Related Documentation

- **Agent Planner Main**: `../CLAUDE.md`
- **Subagents**: `../sub-agents/`
- **Quick Reference**: `../quick-reference.md`
- **Project Agents**: `../../README.md`
