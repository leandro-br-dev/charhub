# Agent Reviewer Skills Index

**Last Updated**: 2025-01-24
**Version**: 2.0 - Skills-Based Architecture

---

## 📚 Skills vs Sub-Agents

```
┌─────────────────────────────────────────────────────────────┐
│                  AGENT REVIEWER KNOWLEDGE                    │
└─────────────────────────────────────────────────────────────┘

SKILLS ("How to do" - Patterns & Guidance)
├─ Orchestration Skills (docs/agents/reviewer/skills/)
│  ├─ pr-review-orchestration      - Coordinate PR review workflow
│  ├─ deployment-coordination      - Manage deployment process
│  ├─ incident-response-protocol   - Handle production incidents
│  └─ production-monitoring         - Monitor production health

SUB-AGENTS ("What to do" - Execution Specialists)
├─ pr-conflict-resolver       - Merge conflict & feature loss prevention
├─ pr-code-reviewer           - Code quality review
├─ local-qa-tester            - Local testing & QA
├─ env-guardian               - Environment validation & sync
├─ deploy-coordinator         - Deployment orchestration
└─ production-monitor         - Production monitoring & incidents
```

---

## 🎯 Skills by Workflow Phase

### Phase 1: PR Review & QA

| Skill | Purpose | When Used |
|-------|---------|-----------|
| **pr-review-orchestration** | Coordinate complete PR review workflow | When Agent Coder creates PR |

**Workflow**: pr-conflict-resolver → pr-code-reviewer → local-qa-tester

### Phase 2: Deployment Management

| Skill | Purpose | When Used |
|-------|---------|-----------|
| **deployment-coordination** | Orchestrate safe deployment to production | When PR approved and ready to deploy |

**Workflow**: env-guardian → deploy-coordinator → production-monitor

### Phase 3: Incident Response

| Skill | Purpose | When Used |
|-------|---------|-----------|
| **incident-response-protocol** | Handle production emergencies | When production issue detected |

**Workflow**: production-monitor → assess → rollback (if needed) → document

### Phase 4: Ongoing Operations

| Skill | Purpose | When Used |
|-------|---------|-----------|
| **production-monitoring** | Monitor production health continuously | Ongoing operational monitoring |

**Activities**: Health checks, log analysis, performance monitoring

---

## 📋 Quick Reference Table

| Task | Use Skill | Delegate To Sub-Agent |
|------|-----------|----------------------|
| Review PR from Agent Coder | pr-review-orchestration | pr-conflict-resolver → pr-code-reviewer → local-qa-tester |
| Resolve merge conflicts | pr-review-orchestration | pr-conflict-resolver |
| Validate environment before deploy | deployment-coordination | env-guardian |
| Deploy to production | deployment-coordination | deploy-coordinator |
| Monitor production health | production-monitoring | production-monitor |
| Handle production incident | incident-response-protocol | production-monitor |

---

## 🔄 Workflow Integration

### Complete PR Review Workflow
```
pr-review-orchestration (THIS SKILL)
    ↓
Use pr-conflict-resolver (verify branch)
    ↓
Use pr-code-reviewer (quality check)
    ↓
Use local-qa-tester (test locally)
    ↓
Approve or request changes
```

### Complete Deployment Workflow
```
deployment-coordination (THIS SKILL)
    ↓
Use env-guardian (validate environment)
    ↓
Use deploy-coordinator (execute deployment)
    ↓
Use production-monitor (watch for issues)
    ↓
Verify deployment success
```

### Incident Response Workflow
```
incident-response-protocol (THIS SKILL)
    ↓
Use production-monitor (assess issue)
    ↓
Determine severity
    ↓
Rollback if critical
    ↓
Document incident
    ↓
Report to Agent Planner
```

---

## 📚 Detailed Skills Documentation

- **pr-review-orchestration**: See `skills/pr-review-orchestration/SKILL.md`
- **deployment-coordination**: See `skills/deployment-coordination/SKILL.md`
- **incident-response-protocol**: See `skills/incident-response-protocol/SKILL.md`
- **production-monitoring**: See `skills/production-monitoring/SKILL.md`

---

**Remember**: Skills guide you on "how to do" - sub-agents handle "what to do". Use skills for workflow guidance, delegate execution to sub-agents.
