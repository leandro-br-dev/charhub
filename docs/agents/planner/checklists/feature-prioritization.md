# Feature Prioritization Checklist

**When to use**: Weekly planning cycle, or when multiple features compete for attention

**Duration**: 60-90 minutes

**Output**: Prioritized backlog with clear assignments to Agent Coder

---

## 📋 Preparation

### Gather Information

- [ ] **List all backlog features**
  ```bash
  ls docs/05-business/planning/features/backlog/
  ```

- [ ] **Check currently active features**
  ```bash
  ls docs/05-business/planning/features/active/
  ```

- [ ] **Review Agent Coder capacity**
  - How many features are they currently working on?
  - Are any features blocked or waiting for clarification?
  - When will current features be ready for review?

- [ ] **Review recent user feedback**
  - Any urgent issues reported?
  - Common feature requests?
  - User pain points?

---

## 🎯 Evaluation Framework

For each feature in backlog, evaluate using this framework:

### Business Value (1-10)

- [ ] **User impact**
  - How many users does this affect?
  - 10 = All users, critical workflow
  - 5 = Many users, useful feature
  - 1 = Few users, nice to have

- [ ] **Business impact**
  - Does this unlock revenue?
  - Does this reduce churn?
  - Does this improve key metrics?
  - 10 = Direct business impact
  - 5 = Indirect business benefit
  - 1 = No business impact

- [ ] **Strategic alignment**
  - Does this align with roadmap?
  - Does this support long-term vision?
  - 10 = Core strategic priority
  - 5 = Aligned but not critical
  - 1 = Not aligned

- [ ] **Urgency**
  - Is there a deadline?
  - Are users blocked without this?
  - 10 = Urgent, users are blocked
  - 5 = Important but not blocking
  - 1 = Can wait indefinitely

**Total Business Value Score**: _____ / 40

### Technical Complexity (1-10)

- [ ] **Implementation effort**
  - 1 = Simple (1-2 days)
  - 3 = Medium (3-5 days)
  - 7 = Complex (1-2 weeks)
  - 10 = Very Complex (2+ weeks)

- [ ] **Technical risk**
  - 1 = Low risk, well-understood
  - 5 = Medium risk, some unknowns
  - 10 = High risk, many unknowns

- [ ] **Dependencies**
  - 1 = No dependencies
  - 5 = Some dependencies, manageable
  - 10 = Many dependencies, complex

- [ ] **Maintenance burden**
  - 1 = Easy to maintain
  - 5 = Moderate maintenance
  - 10 = High maintenance overhead

**Total Technical Complexity Score**: _____ / 40

---

## 📊 Priority Calculation

### Calculate Priority Score

For each feature:

```
Priority Score = Business Value / Technical Complexity

Example:
- Business Value: 32/40 = 0.8
- Technical Complexity: 15/40 = 0.375
- Priority Score: 0.8 / 0.375 = 2.13
```

**Higher score = Higher priority**

### Priority Matrix

Create a matrix of all features:

| Feature | Business Value | Tech Complexity | Priority Score | Rank |
|---------|---------------|-----------------|----------------|------|
| Feature A | 32 | 15 | 2.13 | 1 |
| Feature B | 28 | 20 | 1.40 | 2 |
| Feature C | 20 | 10 | 2.00 | 3 |

---

## 🔍 Strategic Considerations

### Balance Different Types of Work

- [ ] **Quick wins vs long-term investments**
  - Are we doing some quick wins for momentum?
  - Are we investing in strategic features?
  - Balance: ~30% quick wins, ~70% strategic

- [ ] **New features vs technical debt**
  - Are we addressing technical debt?
  - Are we maintaining existing code?
  - Balance: ~80% new features, ~20% tech debt/improvements

- [ ] **User-facing vs infrastructure**
  - Are we improving user experience?
  - Are we improving system quality?
  - Balance: ~70% user-facing, ~30% infrastructure

### Consider Resource Constraints

- [ ] **Agent Coder bandwidth**
  - Don't overload with too many features
  - Prefer 1-2 features at a time in `active/`
  - Allow focus over multitasking

- [ ] **Agent Reviewer capacity**
  - Can they test and deploy this pace?
  - Are deployment resources available?

- [ ] **External dependencies**
  - Are external services ready?
  - Are third-party integrations stable?

---

## ✅ Make Decisions

### Select Top Priorities

- [ ] **Choose top 3-5 features for next cycle**
  - Based on priority scores
  - Balanced by strategic considerations
  - Feasible given resource constraints

- [ ] **Document rationale**
  - Why these features now?
  - Why not the others?
  - What trade-offs were made?

### Handle Special Cases

- [ ] **Critical bugs or urgent fixes**
  - Always prioritize over new features
  - Move to top of queue immediately

- [ ] **User-requested features with low priority**
  - Explain decision to user
  - Offer alternatives or workarounds
  - Keep in backlog for future consideration

- [ ] **High-value but high-complexity features**
  - Consider breaking into smaller phases
  - Identify MVP (Minimum Viable Product)
  - Plan incremental delivery

---

## 📝 Update Documentation

### Move Features to Active

- [ ] **Move selected features to active/**
  ```bash
  mv docs/05-business/planning/features/backlog/feature-name.md \
     docs/05-business/planning/features/active/feature-name.md
  ```

- [ ] **Update feature status in spec**
  - Change status from "Backlog" to "Active"
  - Add "Assigned to: Agent Coder"
  - Add priority and timeline

### Update Agent Assignments

- [ ] **Update agent-assignments.md**
  - File: `docs/05-business/planning/agent-assignments.md`
  - List features assigned to Agent Coder
  - Include priority order
  - Add any special notes or context

Example:
```markdown
# Agent Assignments

**Last Updated**: 2025-12-25

## Agent Coder - Active Features

### High Priority
1. **Feature A** (Priority Score: 2.13)
   - Spec: `features/active/feature-a.md`
   - Timeline: 1 week
   - Note: User-facing, high business value

2. **Feature B** (Priority Score: 1.40)
   - Spec: `features/active/feature-b.md`
   - Timeline: 3-5 days
   - Note: Quick win, good for momentum

## Backlog (Next Up)
- Feature C (Priority Score: 2.00) - Awaiting Feature A completion
- Feature D (Priority Score: 1.80) - Next quarter candidate
```

---

## 📢 Communication

### Notify Agent Coder

- [ ] **Communicate new assignments**
  - What features to work on
  - Priority order
  - Any special considerations

- [ ] **Provide context**
  - Why these features?
  - What's the business priority?
  - Any deadlines or urgency?

- [ ] **Answer questions**
  - Be available for clarifications
  - Update specs if needed
  - Coordinate on technical approach

### Update User (If Needed)

- [ ] **Confirm priorities align with expectations**
  - Especially for user-requested features
  - Explain timeline and rationale
  - Manage expectations

---

## 🔄 Ongoing Management

### Track Progress

- [ ] **Monitor active features**
  - Are they progressing on schedule?
  - Any blockers or issues?
  - Need to re-prioritize?

- [ ] **Adjust as needed**
  - New urgent requests may change priorities
  - Technical challenges may require scope changes
  - Business needs may shift

### Weekly Review

- [ ] **Review priorities weekly**
  - Are we still on track?
  - Any changes needed?
  - Should we reprioritize?

---

## 🚨 Common Pitfalls

### Analysis Paralysis
❌ Spending hours calculating exact scores
✅ Use framework as guide, trust judgment

### Ignoring Quick Wins
❌ Only working on complex, long-term features
✅ Balance with some quick wins for momentum

### Overloading Agent Coder
❌ Assigning 10 features at once
✅ Keep 1-2 features active, queue the rest

### Forgetting Technical Debt
❌ Only prioritizing new features
✅ Allocate ~20% capacity to improvements

### Changing Priorities Constantly
❌ Switching priorities every day
✅ Set weekly/bi-weekly cycles and stick to them

---

## 📊 Priority Score Guidelines

**Score > 2.0**: Excellent candidates - high value, reasonable effort
**Score 1.5-2.0**: Good candidates - solid value, moderate effort
**Score 1.0-1.5**: Consider carefully - may need scope reduction or defer
**Score < 1.0**: Low priority - likely defer or reject

---

## 📚 See Also

- **[feature-planning.md](feature-planning.md)** - How to create feature specs
- **[architecture-review.md](architecture-review.md)** - For complex features
- **[../CLAUDE.md](../CLAUDE.md)** - Overall Agent Planner workflow
- **[../../05-business/planning/agent-assignments.md](../../../05-business/planning/agent-assignments.md)** - Current assignments

---

**Remember**: Business Value × Technical Feasibility = Priority 🎯

Good prioritization means saying "no" (or "not now") to many good ideas to focus on the best ones!
