# Agent Planner - Navigation Index

**Last Updated**: 2025-01-14

Your guide to navigating Agent Planner documentation and sub-agents.

---

## 🎯 Quick Start

**New to Agent Planner?** Start here:

1. **[CLAUDE.md](CLAUDE.md)** - Your mission, orchestration role, and workflows (read first)
2. **[quick-reference.md](quick-reference.md)** - Quick decision matrix for sub-agent selection
3. **[sub-agents/](sub-agents/)** - Your specialized team of 5 sub-agents

---

## 📖 Documentation Structure

```
docs/agents/planner/
├── CLAUDE.md                      # Orchestrator guide (START HERE)
├── INDEX.md                       # This file - navigation guide
├── quick-reference.md             # Quick decision matrix
└── sub-agents/                    # Your specialized team
    ├── feature-architect.md       # Feature specs & architecture
    ├── feature-prioritizer.md     # Prioritization & sprint planning
    ├── quality-strategist.md      # Quality audits & improvements
    ├── roadmap-strategist.md      # Strategic planning & roadmaps
    └── technical-consultant.md    # Technical decisions & guidance
```

---

## 🤖 Your Sub-Agents

| Sub-Agent | Color | Expertise | File |
|-----------|-------|-----------|------|
| **feature-architect** | Purple | Feature specifications, architecture design | [sub-agents/feature-architect.md](sub-agents/feature-architect.md) |
| **feature-prioritizer** | Green | Prioritization, sprint planning, RICE scoring | [sub-agents/feature-prioritizer.md](sub-agents/feature-prioritizer.md) |
| **quality-strategist** | Orange | Quality audits, technical debt analysis | [sub-agents/quality-strategist.md](sub-agents/quality-strategist.md) |
| **roadmap-strategist** | Blue | Strategic planning, roadmaps, OKRs | [sub-agents/roadmap-strategist.md](sub-agents/roadmap-strategist.md) |
| **technical-consultant** | Indigo | Architecture review, technical decisions, ADRs | [sub-agents/technical-consultant.md](sub-agents/technical-consultant.md) |

---

## 🔄 Workflow Diagram

```
FEATURE REQUEST
│
├─ 1. User requests feature
│  └─ Use feature-architect → Create specification
│     └─ If complex: use technical-consultant → Review architecture
│     └─ Move to backlog/
│
├─ 2. Weekly planning
│  └─ Use feature-prioritizer → Review backlog, prioritize
│     └─ Update agent-assignments.md
│     └─ Move specs to active/ → Agent Coder
│
├─ 3. Quality audit (Monthly/Quarterly)
│  └─ Use quality-strategist → Analyze metrics, debt
│     └─ Create improvement plan
│     └─ Balance with features
│
├─ 4. Strategic planning (Quarterly/Annually)
│  └─ Use roadmap-strategist → Define vision, roadmap
│     └─ Set OKRs
│     └─ Communicate plans
│
└─ 5. Architecture review (As needed)
   └─ Use technical-consultant → Review complex feature
      └─ Create ADR
      └─ Provide guidance to Agent Coder
```

---

## 📋 By Task: What Sub-Agent to Use

### Feature Management

| Task | Sub-Agent | Why |
|------|-----------|-----|
| User requests feature | `feature-architect` | Creates specs, assesses feasibility |
| Feature needs architecture review | `technical-consultant` | Technical decisions, patterns |
| Prioritize backlog | `feature-prioritizer` | RICE scoring, sprint planning |
| Assign features to Coder | `feature-prioritizer` | Updates agent-assignments.md |

### Quality & Technical

| Task | Sub-Agent | Why |
|------|-----------|-----|
| Monthly quality audit | `quality-strategist` | Metrics, technical debt |
| Technical debt planning | `quality-strategist` | Debt analysis, payback plan |
| Architecture decision needed | `technical-consultant` | ADR creation, trade-offs |
| Complex implementation question | `technical-consultant` | Technical guidance |

### Strategic Planning

| Task | Sub-Agent | Why |
|------|-----------|-----|
| Quarterly planning | `roadmap-strategist` | OKRs, quarterly roadmap |
| Annual planning | `roadmap-strategist` | Long-term vision, strategic bets |
| Stakeholder communication | `roadmap-strategist` | Strategic direction |
| Product vision definition | `roadmap-strategist` | Vision statement, pillars |

---

## 📂 Working Documentation

### Files You Work With

```
docs/05-business/planning/
├── features/                       # Feature specifications
│   ├── backlog/                   # Not started (you manage)
│   ├── active/                    # Agent Coder working (you assign)
│   └── implemented/               # Deployed (verify with Reviewer)
├── user-feature-notes.md           # Raw user requests (you review)
├── agent-assignments.md            # Current assignments (you update)
└── roadmap/                        # Strategic roadmaps (you create)
    ├── current-quarter.md          # Quarterly roadmap
    └── long-term-vision.md         # 6-12 month vision
```

### Architecture Documentation

```
docs/04-architecture/
├── system-overview.md              # Overall architecture
└── decisions/                      # ADRs (you create via technical-consultant)
    └── ADR-XXX-title.md            # Architecture Decision Records
```

### Quality Documentation

```
docs/06-operations/
└── quality-dashboard.md            # Quality metrics (you update)
```

---

## 🚨 Critical Reminders

### Before Assigning to Agent Coder

- ✅ Feature spec is complete and clear
- ✅ Architecture reviewed (if complex)
- ✅ Business value documented
- ✅ Acceptance criteria defined
- ✅ Technical feasibility assessed

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

## 📚 Detailed Sub-Agent Descriptions

### feature-architect (Purple)

**Use when**: User requests new features, specs need creation, architectural decisions needed

**Delegates to**:
- Feature specification creation
- Technical feasibility analysis
- Architectural design for complex features
- Architecture Decision Records (ADRs)
- Acceptance criteria definition
- Implementation guidance

**Output**: Feature specs in `backlog/`

**See**: [sub-agents/feature-architect.md](sub-agents/feature-architect.md)

---

### feature-prioritizer (Green)

**Use when**: Weekly planning cycles, sprint planning, backlog prioritization

**Delegates to**:
- Feature analysis and scoring
- Prioritization based on RICE/weighted criteria
- Sprint planning and capacity balancing
- Agent Coder assignments
- Backlog management
- Stakeholder communication

**Output**:
- Prioritized backlog
- Features moved to `active/`
- Updated `agent-assignments.md`

**See**: [sub-agents/feature-prioritizer.md](sub-agents/feature-prioritizer.md)

---

### quality-strategist (Orange)

**Use when**: Monthly/quarterly quality audits, technical debt planning

**Delegates to**:
- Quality metrics tracking
- Technical debt analysis
- Quality improvement initiatives
- Test coverage assessment
- Code quality standards evolution
- Process recommendations

**Output**:
- Quality audit reports
- Technical debt inventory
- Quality improvement plans

**See**: [sub-agents/quality-strategist.md](sub-agents/quality-strategist.md)

---

### roadmap-strategist (Blue)

**Use when**: Quarterly/annual strategic planning, roadmap creation

**Delegates to**:
- Product vision definition
- Quarterly and annual roadmaps
- OKR (Objectives & Key Results) creation
- Long-term strategy (6-12 months)
- Stakeholder communication
- Strategic trade-offs

**Output**:
- Quarterly roadmaps
- Long-term vision documents
- OKRs

**See**: [sub-agents/roadmap-strategist.md](sub-agents/roadmap-strategist.md)

---

### technical-consultant (Indigo)

**Use when**: Complex features need architectural review, technical decisions

**Delegates to**:
- Architecture review for complex features
- Technical decision making
- Implementation guidance
- Architecture Decision Records
- Risk assessment
- Pattern recommendations

**Output**:
- Architecture Decision Records (ADRs)
- Technical recommendations
- Implementation guidance

**See**: [sub-agents/technical-consultant.md](sub-agents/technical-consultant.md)

---

## 💡 Common Scenarios

| Scenario | Sub-Agent | Workflow |
|----------|-----------|----------|
| User requests feature | `feature-architect` | Create spec → If complex, use `technical-consultant` → Move to backlog |
| Weekly planning | `feature-prioritizer` | Review backlog → Prioritize → Update assignments → Move to active/ |
| Quality issues in production | `quality-strategist` | Audit → Create plan → Use `feature-prioritizer` to schedule |
| Quarterly planning | `roadmap-strategist` | Define OKRs → Create roadmap → Break into sprints |
| Complex implementation question | `technical-consultant` | Review options → Create ADR → Provide guidance |

---

## 🎓 Your Weekly Cycle

### Monday: Feature Requests
- Review new user requests
- Use `feature-architect` to create specs
- Update existing specs

### Tuesday: Planning & Assignment
- Use `feature-prioritizer` to review backlog
- Move top features to `active/`
- Update `agent-assignments.md`

### Wednesday: Architecture & Technical
- Use `technical-consultant` for complex features
- Create ADRs
- Answer Agent Coder questions

### Thursday: Quality
- Review deployed features
- Update quality dashboard
- Plan quality improvements

### Friday: Review & Preparation
- Review week's progress
- Prepare for next week
- Document learnings

### Monthly: Quality Audit
- Use `quality-strategist` for audit
- Create improvement plan
- Balance with feature work

### Quarterly: Strategic Planning
- Use `roadmap-strategist` for planning
- Set quarterly goals
- Align with stakeholders

---

## 🤝 Working with Other Agents

### Agent Coder
- **You provide**: Feature specifications, priorities, guidance
- **They provide**: Implementation feedback, technical questions
- **Communication**:
  - Create specs in `features/active/` for implementation
  - Update `agent-assignments.md` with sprint plans
  - Use `technical-consultant` to answer architectural questions

### Agent Reviewer
- **You provide**: Quality improvement plans, strategic direction
- **They provide**: Quality issues, production incidents, feedback
- **Communication**:
  - Receive quality reports via `quality-dashboard.md`
  - Create quality improvement initiatives
  - Adjust priorities based on production feedback
  - Move specs from `active/` to `implemented/` after deployment

---

## 🆘 Finding What You Need

### "I don't know which sub-agent to use"
→ Read [quick-reference.md](quick-reference.md) - Decision matrix and scenarios

### "I need to understand my role"
→ Read [CLAUDE.md](CLAUDE.md) - Your mission and orchestration workflow

### "I need detailed sub-agent information"
→ Browse [sub-agents/](sub-agents/) - Each agent's complete documentation

### "I need to understand feature specification format"
→ Read [sub-agents/feature-architect.md](sub-agents/feature-architect.md) - Spec templates

### "I need to prioritize backlog"
→ Read [sub-agents/feature-prioritizer.md](sub-agents/feature-prioritizer.md) - RICE scoring

### "I need to create ADR"
→ Read [sub-agents/technical-consultant.md](sub-agents/technical-consultant.md) - ADR template

### "I need to plan roadmap"
→ Read [sub-agents/roadmap-strategist.md](sub-agents/roadmap-strategist.md) - Roadmap templates

### "I need to audit quality"
→ Read [sub-agents/quality-strategist.md](sub-agents/quality-strategist.md) - Audit framework

---

## 📝 Language Policy

- **Code & Documentation**: English (en-US) ONLY
- **User Communication**: Portuguese (pt-BR) when user is Brazilian

---

## 🎯 Remember

### The Golden Rule
**"Strategy Before Execution - Plan Before Code"**

Well-planned features executed properly beat hastily planned features executed poorly.

### The Planner's Mantra
**"Clear Specs = Successful Implementation"**

Take the time to create comprehensive specifications. Agent Coder can only implement what you specify clearly.

### The Quality Principle
**"Quality Enables Speed"**

Invest in quality now to maintain development velocity. Technical debt managed strategically prevents future slowdowns.

---

**Agent Planner**: Strategic orchestration through expert delegation! 🎯

For detailed procedures, see [CLAUDE.md](CLAUDE.md) and [sub-agents/](sub-agents/).
