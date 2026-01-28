# Agent Reviewer Documentation Index

**Agent**: Reviewer (Orchestrator)
**Role**: Operations, QA & Deployment Orchestration
**Last Updated**: 2025-01-14

---

## 📖 Navigation Guide

This document helps you navigate the Agent Reviewer documentation and find the information you need quickly.

---

## 🗂️ Documentation Structure

```
docs/agents/reviewer/
├── CLAUDE.md                      # START HERE - Orchestration guide
├── INDEX.md                       # This file - Navigation
├── quick-reference.md             # Quick sub-agent selection guide
└── sub-agents/                    # Specialist sub-agents
    ├── pr-conflict-resolver.md    # Merge conflict & feature loss prevention
    ├── pr-code-reviewer.md        # Code quality review
    ├── local-qa-tester.md         # Local testing & QA
    ├── env-guardian.md            # Environment validation & sync
    ├── deploy-coordinator.md      # Deployment orchestration
    └── production-monitor.md      # Production monitoring & incidents
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

### About to Review a PR?
1. **STOP** - Use `pr-conflict-resolver` sub-agent FIRST (CRITICAL!)
2. Then proceed with other sub-agents

### About to Deploy?
1. **STOP** - Use `env-guardian` sub-agent FIRST (CRITICAL!)
2. Then proceed with deployment

---

## 📋 Sub-Agents Overview

| Sub-Agent | Color | Purpose | When to Use |
|-----------|-------|---------|-------------|
| `pr-conflict-resolver` | 🔴 red | Merge conflict & feature loss prevention | **BEFORE reviewing ANY PR** |
| `pr-code-reviewer` | 🔵 blue | Code quality review | After branch verified up-to-date |
| `local-qa-tester` | 🟠 orange | Local testing & QA | After code review approved |
| `env-guardian` | 🟡 yellow | Environment validation & sync | **BEFORE EVERY deploy** |
| `deploy-coordinator` | 🟣 purple | Deployment orchestration | After env validation |
| `production-monitor` | 🔵 cyan | Production monitoring & incidents | Ongoing & emergencies |

**Details**: See `sub-agents/[name].md` for full documentation

---

## 🔍 Finding What You Need

### "I need to review a PR"
→ See `CLAUDE.md` - "Your Workflow" section
→ See `quick-reference.md` - "Complete PR Review Workflow"

### "I need to deploy to production"
→ See `CLAUDE.md` - "When PR Approved & Ready to Deploy" section
→ See `quick-reference.md` - "Complete Deployment Workflow"

### "Production is broken"
→ **IMMEDIATELY** use `production-monitor` sub-agent
→ See `sub-agents/production-monitor.md`

### "PR has merge conflicts"
→ Use `pr-conflict-resolver` sub-agent
→ See `sub-agents/pr-conflict-resolver.md`

### "Environment variables missing"
→ Use `env-guardian` sub-agent
→ See `sub-agents/env-guardian.md`

---

## 📚 Project Documentation

As Agent Reviewer, you also work with these project-wide documentation:

### Deployment Guides
- `docs/02-guides/deployment/cd-deploy-guide.md` - Complete deployment guide
- `docs/02-guides/deployment/vm-setup-recovery.md` - VM setup and recovery

### Technical Reference
- `docs/03-reference/backend/README.md` - Backend patterns
- `docs/03-reference/frontend/README.md` - Frontend patterns
- `docs/04-architecture/system-overview.md` - System architecture

### Business & Planning
- `docs/05-business/planning/features/active/` - Features being reviewed
- `docs/05-business/planning/features/archive/` - Deployed features (you move specs here)

### Operations
- `docs/06-operations/incident-response/` - Incident reports (you create these)

---

## 🎯 Reading Order for New Agent Reviewers

1. **Start**: `CLAUDE.md` (20 min) - Understand your orchestration role
2. **Reference**: `quick-reference.md` (5 min) - Learn sub-agent selection
3. **Specialists**: Browse `sub-agents/*.md` (30 min) - Understand your team
4. **Deployment**: `docs/02-guides/deployment/cd-deploy-guide.md` (20 min)
5. **Architecture**: `docs/04-architecture/system-overview.md` (15 min)

**Total**: ~90 minutes to be fully onboarded

---

## 🔄 Common Workflows

### PR Review Workflow
```
pr-conflict-resolver → pr-code-reviewer → local-qa-tester
```

### Deployment Workflow
```
env-guardian → deploy-coordinator → production-monitor
```

### Incident Response Workflow
```
production-monitor → assess → rollback (if needed) → document
```

---

## 🆘 Quick Help

### "Which sub-agent do I use for X?"
→ Check `quick-reference.md` - "Quick Decision Matrix"

### "I'm about to review a PR"
→ **STOP** - Use `pr-conflict-resolver` sub-agent FIRST

### "I'm about to deploy"
→ **STOP** - Use `env-guardian` sub-agent FIRST

### "Production is broken"
→ **IMMEDIATELY** use `production-monitor` sub-agent

### "I need to understand my role"
→ Read `CLAUDE.md` - "Your Mission" section

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
- Added mandatory schema verification during PR review
- Added mandatory User Acceptance Testing (UAT) before merge
- Added mandatory user confirmation before merge and deploy
- Added `database-schema-management` skill reference
- Enhanced critical reminders for database and migrations
- Added lessons learned from FEATURE-016

**Previous Major Restructuring**: 2025-01-14
- Migrated from checklist-based to sub-agent-based architecture
- Introduced 6 specialist sub-agents
- Refactored CLAUDE.md to orchestrator role
- Added quick-reference guide
- Emphasized critical sub-agents (pr-conflict-resolver, env-guardian)

**Maintainer**: Agent Planner team

---

## ⚠️ Critical Reminders

1. **ALWAYS** use `pr-conflict-resolver` BEFORE reviewing ANY PR
2. **ALWAYS** verify schema changes have migrations (see `database-schema-management` skill)
3. **ALWAYS** apply migrations after checking out PR branch (`npx prisma migrate deploy`)
4. **ALWAYS** use `env-guardian` BEFORE EVERY deployment
5. **ALWAYS** request User Acceptance Testing (UAT) BEFORE merge
6. **ALWAYS** ask user confirmation BEFORE merge and deploy
7. **NEVER** walk away during deployment (use `deploy-coordinator`)
8. **NEVER** execute SQL directly on database (ALL changes via migrations!)
9. **NEVER** approve PR with schema changes but no migration (BLOCK immediately!)
10. **ALWAYS** rollback immediately if production broken (use `production-monitor`)

---

**Remember**: You are the orchestrator. Delegate to specialists. Maintain production stability! 🛡️

For detailed information, see individual documentation files listed above.
