# Roadmap Planning Checklist

**When to use**: Quarterly strategic planning or when setting long-term direction

**Duration**: 3-6 hours

**Output**: Strategic roadmap with quarterly goals and long-term vision

---

## 📋 Preparation

### Gather Context

- [ ] **Review current state**
  - What features are deployed?
  - What features are in progress?
  - What's in the backlog?

- [ ] **Analyze past performance**
  - What was accomplished last quarter?
  - What took longer than expected?
  - What went well? What didn't?

- [ ] **Review user feedback**
  - What are users asking for?
  - What pain points exist?
  - What do users love?
  - Check: `docs/05-business/planning/user-feature-notes.md`

- [ ] **Check technical health**
  - Technical debt level?
  - Performance issues?
  - Security concerns?
  - Infrastructure needs?
  - Check: `docs/06-operations/quality-dashboard.md`

---

## 🎯 Define Goals

### Business Goals

- [ ] **What are the business objectives?**
  - Grow user base?
  - Increase engagement?
  - Improve retention?
  - Unlock revenue?
  - Enter new market?

- [ ] **Define success metrics**
  ```markdown
  ## Success Metrics
  - User growth: [X]% increase
  - Engagement: [X]% improvement in [metric]
  - Retention: [X]% reduction in churn
  - Performance: <[X]ms average response time
  ```

- [ ] **Set constraints**
  - Budget constraints?
  - Time constraints?
  - Resource constraints?
  - Technical constraints?

### User Goals

- [ ] **What do users need most?**
  - What problems are most painful?
  - What would delight users?
  - What would unlock new use cases?

- [ ] **Segment by user type**
  - New users: What helps onboarding?
  - Power users: What advanced features needed?
  - Casual users: What improves ease of use?

### Technical Goals

- [ ] **What technical improvements needed?**
  - Performance optimization?
  - Security hardening?
  - Scalability improvements?
  - Technical debt reduction?
  - Infrastructure upgrades?

- [ ] **Balance innovation vs stability**
  - New technologies to adopt?
  - Existing tech to modernize?
  - Stability improvements needed?

---

## 🗺️ Create Roadmap

### Quarterly Planning (Next 3 Months)

- [ ] **Define quarterly themes**
  ```markdown
  ## Q1 2026 Theme: "User Growth & Retention"
  Focus: Improve onboarding and core user experience
  ```

- [ ] **Select 3-5 major initiatives**
  For each initiative:
  ```markdown
  ### Initiative: [Name]
  - **Goal**: [What we're trying to achieve]
  - **Success Metric**: [How we'll measure success]
  - **Timeline**: [When will this be done?]
  - **Features included**:
    - Feature 1
    - Feature 2
    - Feature 3
  - **Dependencies**: [What needs to happen first?]
  - **Risk level**: Low/Medium/High
  ```

- [ ] **Allocate capacity**
  ```markdown
  ## Capacity Allocation
  - New features: 60%
  - Quality improvements: 20%
  - Technical debt: 15%
  - Bug fixes: 5%
  ```

### Mid-Term Planning (6-12 Months)

- [ ] **Define strategic bets**
  - What big features to tackle?
  - What new capabilities to build?
  - What experiments to run?

- [ ] **Sequence initiatives**
  - What should come first?
  - What dependencies exist?
  - What can be done in parallel?

- [ ] **Identify research needs**
  - What unknowns need investigation?
  - What prototypes to build?
  - What user research to conduct?

### Long-Term Vision (1-2 Years)

- [ ] **Paint the future picture**
  ```markdown
  ## Vision: CharHub 2026
  In 2 years, CharHub will be:
  - [Vision element 1]
  - [Vision element 2]
  - [Vision element 3]

  Users will be able to:
  - [Capability 1]
  - [Capability 2]
  - [Capability 3]
  ```

- [ ] **Identify major milestones**
  - Key capabilities to build
  - Major technical transformations
  - Product evolution stages

---

## 📊 Prioritization Framework

### Value vs Effort Matrix

- [ ] **Map initiatives on 2x2 matrix**
  ```
  High Value, Low Effort    │  High Value, High Effort
  (Quick Wins - DO FIRST)   │  (Major Projects - PLAN)
  ──────────────────────────┼──────────────────────────
  Low Value, Low Effort     │  Low Value, High Effort
  (Fill-Ins - DO IF TIME)   │  (Time Sinks - AVOID)
  ```

### Strategic Alignment Score

For each initiative, score 1-10:

- [ ] **User impact**: How many users benefit?
- [ ] **Business impact**: Revenue/growth/retention impact?
- [ ] **Strategic fit**: Aligns with long-term vision?
- [ ] **Feasibility**: Can we actually do this?
- [ ] **Urgency**: How time-sensitive?

**Total Score**: ___ / 50

Higher score = Higher priority

---

## 🔍 Validate Roadmap

### Feasibility Check

- [ ] **Can we deliver this?**
  - Is timeline realistic?
  - Do we have needed skills?
  - Are dependencies achievable?
  - What risks could derail?

- [ ] **Consult Agent Coder**
  - Get technical feasibility input
  - Validate effort estimates
  - Identify technical blockers

### Stakeholder Alignment

- [ ] **Review with user**
  - Does this align with their vision?
  - Any missing priorities?
  - Any concerns about direction?

- [ ] **Adjust based on feedback**
  - Reprioritize if needed
  - Add missing initiatives
  - Remove lower-priority items

---

## 📝 Document Roadmap

### Create Roadmap Document

- [ ] **Write quarterly roadmap**
  ```markdown
  # CharHub Roadmap - Q1 2026

  **Last Updated**: 2025-12-25
  **Planning Period**: Q1 2026 (Jan-Mar)

  ## Quarterly Theme
  [Theme and focus]

  ## Success Metrics
  - Metric 1: [Target]
  - Metric 2: [Target]
  - Metric 3: [Target]

  ## Major Initiatives

  ### 1. [Initiative Name] (High Priority)
  **Goal**: [What we're achieving]
  **Timeline**: [Weeks/Month]
  **Features**:
  - Feature A (Week 1-2)
  - Feature B (Week 3-4)
  - Feature C (Week 5-6)

  **Success Criteria**:
  - [ ] Criterion 1
  - [ ] Criterion 2

  **Dependencies**: None / [List dependencies]
  **Risk**: Low / Medium / High
  **Owner**: Agent Coder

  ### 2. [Initiative Name] (Medium Priority)
  ...

  ## Quality & Technical Debt
  - Improvement 1 (1 week)
  - Improvement 2 (2 days)
  - Tech debt item 1 (ongoing)

  ## Deferred to Next Quarter
  - Item 1: [Why deferred]
  - Item 2: [Why deferred]

  ## Risks & Mitigation
  | Risk | Impact | Probability | Mitigation |
  |------|--------|-------------|------------|
  | Risk 1 | High | Medium | Strategy |

  ## Monthly Milestones
  - **End of Month 1**: Milestone 1
  - **End of Month 2**: Milestone 2
  - **End of Month 3**: Milestone 3
  ```

- [ ] **Save roadmap**
  - Location: `docs/05-business/roadmap/current-quarter.md`
  - Version control: Commit with clear message

### Update Long-Term Vision

- [ ] **Update vision document**
  - Location: `docs/05-business/roadmap/long-term-vision.md`
  - Keep high-level (no specific dates)
  - Focus on capabilities and outcomes

---

## 📢 Communication

### Share Roadmap

- [ ] **Communicate to user**
  - Explain priorities and rationale
  - Set expectations on timing
  - Highlight exciting initiatives

- [ ] **Brief Agent Coder**
  - Share quarterly roadmap
  - Explain strategic context
  - Answer questions about direction

- [ ] **Align Agent Reviewer**
  - Share deployment cadence expectations
  - Highlight any infrastructure needs
  - Note quality improvement goals

---

## 🔄 Roadmap Execution

### Monthly Check-Ins

- [ ] **Review progress monthly**
  - Are we on track?
  - Any blockers or delays?
  - Need to adjust priorities?

- [ ] **Update roadmap document**
  - Mark completed items
  - Adjust timelines if needed
  - Add new learnings

### Adapt as Needed

- [ ] **Be flexible**
  - New urgent needs may arise
  - Technical challenges may require pivots
  - User feedback may shift priorities

- [ ] **Document changes**
  - Why was roadmap adjusted?
  - What was reprioritized?
  - What trade-offs were made?

### End-of-Quarter Review

- [ ] **Retrospective**
  - What did we accomplish?
  - What took longer than expected?
  - What should we do differently?

- [ ] **Archive roadmap**
  - Move `current-quarter.md` to archive
  - Create retrospective document
  - Start planning next quarter

---

## 🚨 Common Pitfalls

### Overpacking the Roadmap
❌ "Let's do 15 major initiatives this quarter!"
✅ "Let's focus on 3-5 major initiatives we can do well"

### Ignoring Technical Health
❌ "Only new features on the roadmap, no time for tech debt"
✅ "Balance features with quality and technical improvements"

### Overly Detailed Long-Term Plans
❌ "In month 18, we'll build feature X with components A, B, C..."
✅ "In year 2, we'll have capability X that enables users to..."

### No Flexibility
❌ "The roadmap is locked, no changes allowed"
✅ "The roadmap is our current best plan, we'll adapt as we learn"

### Forgetting User Input
❌ "We know what users need, no need to ask"
✅ "Let's validate our assumptions with user feedback"

---

## 📊 Roadmap Health Indicators

### Good Signs ✅

- Clear quarterly themes
- 3-5 major initiatives per quarter
- 20%+ capacity for quality/tech debt
- Initiatives tied to measurable outcomes
- Balanced mix of quick wins and strategic bets
- Regular updates and reviews

### Warning Signs ⚠️

- Too many initiatives (>7 per quarter)
- No capacity for technical improvements
- No clear success metrics
- Haven't updated roadmap in 2+ months
- Constantly shifting priorities
- No stakeholder alignment

---

## 📚 Templates & Examples

### Initiative Template

```markdown
### Initiative: [Name]

**Goal**: [One sentence describing what we're achieving]

**Why Now**: [Why is this a priority this quarter?]

**Success Metrics**:
- Metric 1: [Baseline] → [Target]
- Metric 2: [Baseline] → [Target]

**Features**:
1. Feature A - [Brief description] (Week 1-2)
2. Feature B - [Brief description] (Week 3-4)
3. Feature C - [Brief description] (Week 5-6)

**Dependencies**: [What needs to happen first?]

**Risks**:
- Risk 1: [Description + mitigation]
- Risk 2: [Description + mitigation]

**Owner**: Agent Coder
**Status**: Not Started / In Progress / Completed
```

---

## 📚 See Also

- **[feature-prioritization.md](feature-prioritization.md)** - How to prioritize features within roadmap
- **[quality-audit.md](quality-audit.md)** - Inform roadmap with quality insights
- **[../CLAUDE.md](../CLAUDE.md)** - Overall Agent Planner workflow
- **[../../05-business/roadmap/](../../../05-business/roadmap/)** - Roadmap documents

---

**Remember**: A roadmap is a plan, not a promise. Stay flexible and learn as you go! 🗺️

"Plans are worthless, but planning is everything." - Dwight D. Eisenhower
