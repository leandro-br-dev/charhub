# Agent Coder Documentation Index

**Agent**: Coder (Orchestrator)
**Role**: Feature Development Orchestration
**Last Updated**: 2025-01-14

---

## 📖 Navigation Guide

This document helps you navigate the Agent Coder documentation and find the information you need quickly.

---

## 🗂️ Documentation Structure

```
docs/agents/coder/
├── CLAUDE.md                  # START HERE - Orchestration guide
├── INDEX.md                   # This file - Navigation
├── quick-reference.md         # Quick sub-agent selection guide
└── sub-agents/                # Specialist sub-agents
    ├── backend-developer.md
    ├── frontend-specialist.md
    ├── feature-tester.md
    ├── code-quality-enforcer.md
    ├── pr-prep-deployer.md
    └── git-safety-officer.md
```

---

## 🚀 Quick Start

### First Time Here?
1. **Read** `CLAUDE.md` - Understand your role as orchestrator
2. **Review** `quick-reference.md` - Learn when to use each sub-agent
3. **Explore** `sub-agents/` - Understand your specialist team

### Need to Delegate Now?
1. **Check** `quick-reference.md` - Identify the right sub-agent
2. **Invoke** the sub-agent via Task tool
3. **Monitor** their work and provide feedback

### About to Perform Git Operation?
1. **STOP** - Don't run the Git command yet
2. **Use** `git-safety-officer` sub-agent FIRST
3. **Proceed** only after safety checks pass

---

## 📋 Sub-Agents Overview

| Sub-Agent | Color | Purpose | When to Use |
|-----------|-------|---------|-------------|
| `backend-developer` | 🟢 green | Backend implementation | API endpoints, database, services |
| `frontend-specialist` | 🔵 blue | Frontend implementation | Vue components, i18n, UI |
| `feature-tester` | 🟠 orange | Testing & QA | Test implementations, quality gates |
| `code-quality-enforcer` | 🟣 purple | Code quality standards | Pattern verification, best practices |
| `pr-prep-deployer` | 🩷 pink | PR preparation | Branch sync, merge conflicts, PR creation |
| `git-safety-officer` | 🔴 red | Git safety | **BEFORE any Git operation** |

**Details**: See `sub-agents/[name].md` for full documentation

---

## 🔍 Finding What You Need

### "I need to implement a feature"
→ See `CLAUDE.md` - "Your Workflow" section
→ See `quick-reference.md` - "Typical Feature Workflow"

### "I need to know which sub-agent to use"
→ See `quick-reference.md` - Quick decision matrix
→ See `CLAUDE.md` - "When to Use Each Sub-Agent" section

### "I need to perform a Git operation"
→ **STOP** - Use `git-safety-officer` sub-agent FIRST
→ See `sub-agents/git-safety-officer.md`

### "I need to create a Pull Request"
→ Use `pr-prep-deployer` sub-agent
→ See `sub-agents/pr-prep-deployer.md`

### "I need to test my implementation"
→ Use `feature-tester` sub-agent
→ See `sub-agents/feature-tester.md`

### "I need to verify code quality"
→ Use `code-quality-enforcer` sub-agent
→ See `sub-agents/code-quality-enforcer.md`

---

## 📚 Project Documentation

As Agent Coder, you also work with these project-wide documentation:

### Architecture & Technical Reference
- `docs/04-architecture/system-overview.md` - System architecture (READ FIRST)
- `docs/04-architecture/database-schema.md` - Database design
- `docs/03-reference/backend/README.md` - Backend patterns (overview)
- `docs/03-reference/frontend/README.md` - Frontend patterns (overview)
- `backend/src/services/translation/.docs.md` - Translation service (distributed docs)
- `backend/src/data/tags/.docs.md` - Tag classification system (distributed docs)
- `backend/src/services/payments/.docs.md` - Payment service (distributed docs)
- `backend/src/services/.docs.md` - Credits service (distributed docs)
- `backend/src/services/llm/.docs.md` - LLM service (distributed docs)
- `backend/src/services/llm/tools/.docs.md` - LLM tools (distributed docs)

### Business & Planning
- `docs/05-business/planning/features/active/` - Your feature assignments
- `docs/05-business/planning/agent-assignments.md` - Current task assignments

### Other Agents
- `docs/agents/planner/` - Agent Planner documentation
- `docs/agents/reviewer/` - Agent Reviewer documentation
- `docs/agents/designer/` - Agent Designer documentation

---

## 🎯 Reading Order for New Agent Coders

1. **Start**: `CLAUDE.md` (15 min) - Understand your orchestration role
2. **Reference**: `quick-reference.md` (5 min) - Learn sub-agent selection
3. **Specialists**: Browse `sub-agents/*.md` (20 min) - Understand your team
4. **Project**: `docs/04-architecture/system-overview.md` (20 min) - System architecture
5. **Patterns**: `docs/03-reference/backend/README.md` + `frontend/README.md` (15 min)

**Total**: ~75 minutes to be fully onboarded

---

## 🔄 Common Workflows

### Feature Implementation Workflow
```
git-safety-officer → backend-developer → frontend-specialist
     ↓
code-quality-enforcer (during dev)
     ↓
feature-tester → git-safety-officer → pr-prep-deployer
```

### Bug Fix Workflow
```
code-quality-enforcer (assess) → backend-developer/frontend-specialist (fix)
     ↓
feature-tester (verify) → pr-prep-deployer (PR)
```

### Git Operation Workflow
```
git-safety-officer (ALWAYS FIRST) → proceed with operation
```

---

## 🆘 Quick Help

### "Which sub-agent do I use for X?"
→ Check `quick-reference.md` - "Quick Decision Matrix"

### "I'm about to run a Git command"
→ **STOP** - Use `git-safety-officer` sub-agent FIRST

### "I need to understand my role"
→ Read `CLAUDE.md` - "Your Mission" section

### "Where do I find my assignments?"
→ Check `docs/05-business/planning/features/active/`

### "How do I create a PR?"
→ Use `pr-prep-deployer` sub-agent

---

## 📞 Additional Resources

### Commands Reference
→ See `CLAUDE.md` - "Quick Command Reference" section

### Troubleshooting
→ See `CLAUDE.md` - "If You're Stuck" section

### Working with Other Agents
→ See `CLAUDE.md` - "Working with Other Agents" section

---

## 📝 Document Updates

**Last Major Update**: 2026-01-27
- Added mandatory database schema management rules
- Added mandatory migration creation after schema changes
- Added mandatory user manual testing before automated tests
- Added `database-schema-management` skill reference
- Added critical reminders section
- Added lessons learned from FEATURE-016

**Previous Major Restructuring**: 2025-01-14
- Migrated from checklist-based to sub-agent-based architecture
- Introduced 6 specialist sub-agents
- Refactored CLAUDE.md to orchestrator role
- Added quick-reference guide

**Maintainer**: Agent Planner team

---

---

## ⚠️ Critical Reminders

1. **ALWAYS** use `git-safety-officer` BEFORE any Git operation
2. **ALWAYS** create migration after modifying `schema.prisma` (see `database-schema-management` skill)
3. **ALWAYS** apply migrations after syncing with main (`npx prisma migrate deploy`)
4. **ALWAYS** request user manual testing BEFORE creating automated tests
5. **NEVER** push directly to `main`
6. **NEVER** execute SQL directly on database (ALL changes via migrations!)
7. **NEVER** create PR with schema changes but no migration (PR will be BLOCKED!)

---

**Remember**: You are the orchestrator. Delegate to specialists. Quality through expertise! 🤖

For detailed information, see individual documentation files listed above.
