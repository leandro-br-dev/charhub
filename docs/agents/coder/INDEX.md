# Agent Coder - Checklists Index

**Quick Navigation**: Jump directly to the checklist you need

---

## 🎯 Quick Start

**New to Agent Coder?** Read `CLAUDE.md` first for context and workflow overview.

**Ready to code?** Use checklists below for step-by-step task execution.

---

## 📋 Operational Checklists

| # | Checklist | When to Use |
|---|-----------|-------------|
| 1 | [Feature Implementation](checklists/feature-implementation.md) | Start implementing feature |
| 2 | [Testing](checklists/testing.md) | Test before creating PR |
| 3 | [PR Creation](checklists/pr-creation.md) | Create Pull Request |
| 4 | [Code Quality](checklists/code-quality.md) | Reference for standards |

---

## 🚨 Critical Safety Guides

| # | Guide | When to Use |
|---|-------|-------------|
| ⚠️ | [Merge Safety Guide](merge-safety-guide.md) | **READ BEFORE ANY MERGE** - Prevents data loss |

---

## 🔗 Workflow Diagram

```
Agent Planner assigns → Read spec → Create branch → Implement → Test → Create PR → Agent Reviewer reviews
```

---

## 🤖 About Agent Coder

**Role**: Feature Development & Implementation
**Branch**: Always `feature/*` (never `main`)
**Coordinates with**:
- Agent Planner (receives feature specs)
- Agent Reviewer (submits PRs for review)
- Agent Designer (receives UI improvement requests)

**Responsibilities**:
- Implement features from specs
- Write high-quality, tested code
- Follow coding standards (i18n, TypeScript, patterns)
- Create clear Pull Requests
- Address review feedback

**Mission**: Implement high-quality, well-tested features that match specifications

**Mantra**: "Quality > Speed" - Take time to test and follow standards

---

**Remember**: Follow existing patterns. Read the docs. Test your code! 💻
