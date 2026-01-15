# Quick Reference - Agent Planner

**Last Updated**: 2025-01-14

This guide helps you quickly select the right sub-agent for any task.

---

## Decision Matrix

### What Do You Need To Do?

| Task | Sub-Agent | Why |
|------|-----------|-----|
| **User requests new feature** | `feature-architect` | Creates specs, assesses feasibility |
| **Complex feature needs architecture review** | `technical-consultant` | Technical decisions, ADRs |
| **Weekly planning / sprint** | `feature-prioritizer` | Prioritize backlog, assign to Coder |
| **Quality audit needed** | `quality-strategist` | Analyze metrics, technical debt |
| **Quarterly/annual planning** | `roadmap-strategist` | OKRs, roadmaps, vision |
| **Architecture decision needed** | `technical-consultant` | Trade-off analysis, patterns |

---

## Quick Decision Tree

```
START: What do you need to do?
│
├─ User requested feature?
│  └─ Use feature-architect
│     └─ Is feature complex/technical?
│        ├─ YES → Use technical-consultant also
│        └─ NO → Feature spec sufficient
│
├─ Weekly planning time?
│  └─ Use feature-prioritizer
│
├─ Monthly/quarterly quality review?
│  └─ Use quality-strategist
│
├─ Quarterly/annual strategic planning?
│  └─ Use roadmap-strategist
│
└─ Complex feature needs architecture review?
   └─ Use technical-consultant
```

---

## Sub-Agent Overview

| Sub-Agent | Color | Expertise | When to Use |
|-----------|-------|-----------|-------------|
| **feature-architect** | Purple | Feature specs, architecture design | User requests feature |
| **feature-prioritizer** | Green | Prioritization, sprint planning | Weekly planning, backlog management |
| **quality-strategist** | Orange | Quality audits, technical debt | Monthly/quarterly reviews |
| **roadmap-strategist** | Blue | Strategic planning, roadmaps | Quarterly/annual planning |
| **technical-consultant** | Indigo | Architecture review, decisions | Complex features, technical questions |

---

## Common Scenarios

### Scenario 1: User Requests Feature

**Example**: "I want a character search feature"

1. Use `feature-architect` → Create specification
2. Use `technical-consultant` (if complex) → Review architecture
3. Move spec to `backlog/`
4. Use `feature-prioritizer` (during planning) → Schedule sprint

---

### Scenario 2: Weekly Planning

**Example**: "It's Monday, what should we work on this week?"

1. Use `feature-prioritizer` → Review backlog, prioritize
2. Update `agent-assignments.md`
3. Move specs to `active/`

---

### Scenario 3: Quality Issues

**Example**: "We've had several bugs in production"

1. Use `quality-strategist` → Analyze root causes
2. Create improvement plan
3. Use `feature-prioritizer` → Schedule quality initiatives

---

### Scenario 4: Quarterly Planning

**Example**: "Q1 is ending, what's our plan for Q2?"

1. Use `roadmap-strategist` → Create quarterly roadmap
2. Define OKRs
3. Use `feature-prioritizer` → Break down into sprints

---

### Scenario 5: Complex Architecture Question

**Example**: "Should we use WebSocket or SSE for real-time notifications?"

1. Use `technical-consultant` → Evaluate options
2. Create ADR with trade-offs
3. Provide implementation guidance

---

## Workflow Sequences

### Feature Request → Sprint Assignment

```
feature-architect
    ↓ (create spec)
technical-consultant (if complex)
    ↓ (review architecture)
backlog/
    ↓ (wait for planning)
feature-prioritizer
    ↓ (prioritize & assign)
active/ → Agent Coder
```

### Quality Audit → Improvement

```
quality-strategist
    ↓ (audit & analyze)
quality improvement plan
    ↓
feature-prioritizer
    ↓ (schedule initiatives)
Agent Coder implements
```

### Strategic Planning → Execution

```
roadmap-strategist
    ↓ (define vision & OKRs)
quarterly roadmap
    ↓
feature-prioritizer
    ↓ (break into sprints)
weekly sprints → Agent Coder
```

---

## Critical Reminders

### Before Assigning to Agent Coder
- ✅ Feature spec is complete and clear
- ✅ Architecture reviewed (if complex)
- ✅ Business value documented
- ✅ Acceptance criteria defined

### Before Moving to `active/`
- ✅ Agent Coder has capacity
- ✅ Dependencies identified
- ✅ Priority score calculated
- ✅ `agent-assignments.md` updated

### After Agent Reviewer Deploys
- ✅ Move spec from `active/` to `implemented/`
- ✅ Update quality dashboard
- ✅ Note any quality issues for next audit

---

## File Locations

### For Agent Planner
```
docs/agents/planner/
├── CLAUDE.md              # Orchestrator guide (read this first)
├── INDEX.md               # Detailed navigation
├── quick-reference.md     # This file
└── sub-agents/            # Your specialized team
    ├── feature-architect.md
    ├── feature-prioritizer.md
    ├── quality-strategist.md
    ├── roadmap-strategist.md
    └── technical-consultant.md
```

### Key Working Files
```
docs/05-business/planning/
├── features/
│   ├── backlog/         # Specs you manage
│   ├── active/          # Specs you assign to Coder
│   └── implemented/     # Deployed features
├── user-feature-notes.md    # Raw user requests
├── agent-assignments.md     # Current assignments (you update)
└── roadmap/             # Strategic roadmaps (you create)
```

---

## Mantras

### Planner's Mantra
**"Strategy Before Execution - Plan Before Code"**

### Feature Architect
**"Clear Specs = Successful Implementation"**

### Feature Prioritizer
**"Data Over Opinions, Value Over Volume"**

### Quality Strategist
**"Quality Enables Speed"**

### Roadmap Strategist
**"Strategy is About Saying No"**

### Technical Consultant
**"Architectural Decisions are Expensive"**

---

**Need more detail?** See [INDEX.md](INDEX.md) or [CLAUDE.md](CLAUDE.md)
