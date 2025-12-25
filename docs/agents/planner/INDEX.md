# Agent Planner - Checklists Index

**Quick Navigation**: Jump directly to the checklist you need

---

## 🎯 Quick Start

**New to Agent Planner?** Read `CLAUDE.md` first for context and workflow overview.

**Ready to plan?** Use checklists below for step-by-step task execution.

---

## 📋 Operational Checklists

### Core Planning Workflow

| # | Checklist | When to Use | Duration |
|---|-----------|-------------|----------|
| 1 | [Feature Planning](checklists/feature-planning.md) | User requests new feature | ~30-90 min |
| 2 | [Feature Prioritization](checklists/feature-prioritization.md) | Weekly planning cycle | ~60-90 min |
| 3 | [Architecture Review](checklists/architecture-review.md) | Before complex features | ~1-3 hours |
| 4 | [Quality Audit](checklists/quality-audit.md) | Monthly quality review | ~2-4 hours |
| 5 | [Roadmap Planning](checklists/roadmap-planning.md) | Quarterly strategic planning | ~3-6 hours |

---

## 🔗 Workflow Diagram

```
┌─────────────────────┐
│  User Request       │
│  or Opportunity     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Feature Planning   │ ← checklists/feature-planning.md
│  (Create Spec)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Add to Backlog     │ → docs/05-business/planning/features/backlog/
└──────────┬──────────┘
           │
           │  (Weekly Planning Cycle)
           ▼
┌─────────────────────┐
│  Prioritization     │ ← checklists/feature-prioritization.md
│  (Rank Features)    │
└──────────┬──────────┘
           │
      ┌────┴──────┐
      │           │
      ▼           ▼
  Simple      Complex
  Feature     Feature
      │           │
      │           ▼
      │    ┌─────────────────────┐
      │    │  Architecture       │ ← checklists/architecture-review.md
      │    │  Review (ADR)       │
      │    └──────────┬──────────┘
      │               │
      └───────┬───────┘
              │
              ▼
┌─────────────────────┐
│  Move to Active     │ → docs/05-business/planning/features/active/
│  Assign to Coder    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Agent Coder        │ → Implementation
│  Implements         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Agent Reviewer     │ → Testing & Deployment
│  Reviews & Deploys  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Move to            │ → docs/05-business/planning/features/implemented/
│  Implemented        │
└──────────┬──────────┘
           │
           │  (Monthly/Quarterly)
           ▼
┌─────────────────────┐
│  Quality Audit      │ ← checklists/quality-audit.md
│  (Review Quality)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Quality            │
│  Improvements       │ → Back to backlog
└─────────────────────┘

(Quarterly)
┌─────────────────────┐
│  Roadmap Planning   │ ← checklists/roadmap-planning.md
│  (Strategic Plan)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Quarterly Goals &  │
│  Initiative Themes  │
└─────────────────────┘
```

---

## 📖 Detailed Checklist Descriptions

### 1. Feature Planning (`feature-planning.md`)

**Purpose**: Transform user requests into clear, actionable feature specifications

**Key activities**:
- Understand user needs and pain points
- Define functional and non-functional requirements
- Assess technical complexity
- Identify risks and dependencies
- Create comprehensive feature spec document

**Output**: Feature spec in `features/backlog/`

**Next step**: Feature Prioritization (weekly)

---

### 2. Feature Prioritization (`feature-prioritization.md`)

**Purpose**: Rank backlog features and assign work to Agent Coder

**Key activities**:
- Evaluate business value (user impact, business impact, strategic alignment)
- Assess technical complexity (effort, risk, dependencies)
- Calculate priority scores
- Balance different types of work (features, tech debt, quality)
- Select top priorities for current cycle

**Output**:
- Prioritized backlog
- Features moved to `active/`
- Updated `agent-assignments.md`

**Next step**:
- If simple → Assign to Agent Coder
- If complex → Architecture Review

---

### 3. Architecture Review (`architecture-review.md`)

**Purpose**: Design robust technical approaches for complex features

**Key activities**:
- Analyze current architecture
- Brainstorm implementation approaches
- Evaluate trade-offs (scalability, maintainability, performance, security)
- Select recommended approach
- Create Architecture Decision Record (ADR)
- Define implementation guidelines

**Output**: ADR in `docs/04-architecture/decisions/`

**Next step**: Assign to Agent Coder with clear technical direction

---

### 4. Quality Audit (`quality-audit.md`)

**Purpose**: Systematically review and improve product quality

**Key activities**:
- Check test coverage (backend, frontend)
- Review code quality (linting, TypeScript, patterns)
- Audit documentation (API, user guides, technical docs)
- Test features in production
- Evaluate UX, accessibility, security
- Create improvement plan

**Output**:
- Quality report with metrics
- List of quality issues
- Improvement plan (quick wins, medium-term, long-term)

**Next step**: Add quality improvements to backlog, prioritize alongside features

---

### 5. Roadmap Planning (`roadmap-planning.md`)

**Purpose**: Define strategic direction and quarterly goals

**Key activities**:
- Review current state and past performance
- Define business, user, and technical goals
- Create quarterly initiatives (3-5 major themes)
- Plan 6-12 month strategic bets
- Define long-term vision (1-2 years)
- Validate feasibility and align stakeholders

**Output**:
- Quarterly roadmap in `docs/05-business/roadmap/current-quarter.md`
- Long-term vision in `docs/05-business/roadmap/long-term-vision.md`

**Next step**: Execute roadmap through weekly planning cycles

---

## 🚨 Quick Reference Guide

### By Task

| I need to... | Use this checklist |
|--------------|-------------------|
| Plan a new feature | [feature-planning.md](checklists/feature-planning.md) |
| Prioritize the backlog | [feature-prioritization.md](checklists/feature-prioritization.md) |
| Design complex architecture | [architecture-review.md](checklists/architecture-review.md) |
| Review product quality | [quality-audit.md](checklists/quality-audit.md) |
| Set quarterly goals | [roadmap-planning.md](checklists/roadmap-planning.md) |

### By Frequency

| When | Checklist |
|------|-----------|
| As needed | [feature-planning.md](checklists/feature-planning.md) |
| Weekly | [feature-prioritization.md](checklists/feature-prioritization.md) |
| Before complex features | [architecture-review.md](checklists/architecture-review.md) |
| Monthly | [quality-audit.md](checklists/quality-audit.md) |
| Quarterly | [roadmap-planning.md](checklists/roadmap-planning.md) |

### By Problem

| Problem | Solution | Checklist |
|---------|----------|-----------|
| User request is vague | Create clear spec | [feature-planning.md](checklists/feature-planning.md) |
| Too many feature requests | Prioritize systematically | [feature-prioritization.md](checklists/feature-prioritization.md) |
| Unclear how to implement | Design architecture | [architecture-review.md](checklists/architecture-review.md) |
| Missing tests/docs | Audit and improve | [quality-audit.md](checklists/quality-audit.md) |
| No clear direction | Plan strategically | [roadmap-planning.md](checklists/roadmap-planning.md) |

---

## 📂 File Organization

```
docs/agents/planner/
├── CLAUDE.md                          # Main agent instructions (read first)
├── INDEX.md                           # This file - checklist navigation
└── checklists/                        # Operational checklists
    ├── feature-planning.md           # How to plan features
    ├── feature-prioritization.md     # How to prioritize
    ├── architecture-review.md        # How to design architecture
    ├── quality-audit.md              # How to audit quality
    └── roadmap-planning.md           # How to plan roadmap
```

### Related Documentation

```
docs/
├── 04-architecture/                   # Architecture docs
│   ├── system-overview.md            # Current architecture
│   └── decisions/                    # ADRs (from architecture-review)
├── 05-business/                       # Business & planning
│   ├── planning/                     # Feature planning
│   │   ├── features/                # Feature specs
│   │   │   ├── backlog/            # Planned features
│   │   │   ├── active/             # In development
│   │   │   └── implemented/        # Deployed features
│   │   ├── user-feature-notes.md   # Raw user requests
│   │   └── agent-assignments.md    # Current task assignments
│   └── roadmap/                      # Strategic planning
│       ├── current-quarter.md       # Quarterly roadmap
│       └── long-term-vision.md      # Long-term vision
└── 06-operations/                     # Operational data
    └── quality-dashboard.md          # Quality metrics
```

---

## 💡 Tips for Using Checklists

### Do's

✅ **Start with feature-planning.md** - Don't skip spec creation
✅ **Prioritize weekly** - Consistent planning prevents chaos
✅ **Review architecture for complex features** - Save time later
✅ **Audit quality regularly** - Prevent technical debt accumulation
✅ **Plan roadmap quarterly** - Strategic direction matters

### Don'ts

❌ **Don't skip to implementation** - Spec first, code second
❌ **Don't prioritize arbitrarily** - Use systematic framework
❌ **Don't ignore complexity** - Complex features need architecture review
❌ **Don't neglect quality** - Technical debt compounds
❌ **Don't plan too far ahead** - Focus on next quarter, vision for beyond

---

## 🎯 Your Weekly Planning Cycle

### Monday: Feature Planning & Requests
- Review new user requests
- Create specs for new features
- Update existing specs

### Tuesday: Prioritization & Assignment
- Run feature-prioritization checklist
- Move top features to `active/`
- Update `agent-assignments.md`
- Brief Agent Coder

### Wednesday-Thursday: Architecture & Technical
- Architecture review for complex features
- Research technical solutions
- Create ADRs
- Answer Agent Coder questions

### Friday: Quality & Documentation
- Review deployed features
- Update quality metrics
- Plan quality improvements

### Monthly: Quality Audit
- Run quality-audit checklist
- Create improvement plan
- Balance with feature work

### Quarterly: Strategic Planning
- Run roadmap-planning checklist
- Set quarterly goals
- Align with stakeholders

---

## 🚨 Common Scenarios

| Scenario | What to Do |
|----------|------------|
| User requests feature | Execute [feature-planning.md](checklists/feature-planning.md) |
| Monday planning session | Execute [feature-prioritization.md](checklists/feature-prioritization.md) |
| Agent Coder asks "how should I build this?" | Execute [architecture-review.md](checklists/architecture-review.md) |
| End of month quality review | Execute [quality-audit.md](checklists/quality-audit.md) |
| End of quarter planning | Execute [roadmap-planning.md](checklists/roadmap-planning.md) |
| Agent Coder needs clarification | Review feature spec, update if needed |
| Agent Reviewer deployed feature | Move spec to `implemented/`, note in quality dashboard |
| Conflicting priorities | Re-run prioritization with latest context |

---

## 📚 Additional Resources

### Core Documentation

- `CLAUDE.md` - Agent Planner instructions and workflow
- `../../04-architecture/system-overview.md` - System architecture
- `../../05-business/planning/agent-assignments.md` - Current assignments

### Planning Documents

- `../../05-business/planning/user-feature-notes.md` - User requests
- `../../05-business/roadmap/current-quarter.md` - Quarterly roadmap
- `../../06-operations/quality-dashboard.md` - Quality metrics

---

## 🤖 About Agent Planner

**Role**: Strategic Planning, Architecture & Business Analysis

**Branch**: `main` (analysis/planning) or `feature/planning-*` (documentation)

**Coordinates with**:
- Agent Coder (implementation)
- Agent Reviewer (deployment & production)

**Responsibilities**:
- Plan and specify features
- Prioritize backlog
- Design system architecture
- Audit product quality
- Plan strategic roadmap
- Balance business value with technical feasibility

**Mission**: Ensure product development aligns with business goals and maintains high quality standards

---

**Remember**: Good planning prevents poor performance! 🎯

"Plans are nothing; planning is everything."
