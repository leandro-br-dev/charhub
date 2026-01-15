# Quick Reference - Agent Reviewer Sub-Agents

**Use this guide** to quickly identify which sub-agent to use for each task.

---

## 🚀 Quick Decision Matrix

| I need to... | Use this sub-agent |
|-------------|-------------------|
| **BEFORE reviewing ANY PR** | **`pr-conflict-resolver`** |
| Review code quality | `pr-code-reviewer` |
| Test PR locally | `local-qa-tester` |
| **BEFORE EVERY deploy** | **`env-guardian`** |
| Deploy to production | `deploy-coordinator` |
| Monitor production | `production-monitor` |
| Respond to incident | `production-monitor` |

---

## 🎨 Sub-Agent Colors (Visual Reference)

- 🔴 **red** - `pr-conflict-resolver`
- 🔵 **blue** - `pr-code-reviewer`
- 🟠 **orange** - `local-qa-tester`
- 🟡 **yellow** - `env-guardian`
- 🟣 **purple** - `deploy-coordinator`
- 🔵 **cyan** - `production-monitor`

---

## 📋 Complete PR Review Workflow

```
1. pr-conflict-resolver    → Verify branch up-to-date, resolve conflicts
2. pr-code-reviewer        → Review code quality, patterns, i18n
3. local-qa-tester         → Test locally (automated + manual)
4. APPROVE or request changes
```

---

## 📋 Complete Deployment Workflow

```
1. env-guardian            → Validate environment variables (CRITICAL!)
2. deploy-coordinator      → Execute deployment, monitor
3. production-monitor      → Watch for issues during/after deploy
4. deploy-coordinator      → Post-deploy verification
5. production-monitor      → Ongoing monitoring
```

---

## 🚨 CRITICAL: Always Use These First

### BEFORE PR Review
**ALWAYS use** `pr-conflict-resolver` FIRST
- Prevents feature loss
- Detects outdated branches
- Resolves merge conflicts by combining features

### BEFORE Deployment
**ALWAYS use** `env-guardian` FIRST
- Validates environment variables
- Prevents deployment failures
- Ensures all configuration exists

---

## 🔍 Common Scenarios

### Scenario: "Agent Coder just created a PR"

1. **ALWAYS**: Use `pr-conflict-resolver` FIRST
2. Then: Use `pr-code-reviewer` for quality review
3. Then: Use `local-qa-tester` for testing
4. Finally: Approve or request changes

### Scenario: "Ready to deploy approved PR"

1. **ALWAYS**: Use `env-guardian` FIRST (validates environment)
2. Then: Use `deploy-coordinator` to execute deployment
3. During: Use `production-monitor` to watch for issues
4. After: Use `deploy-coordinator` for verification

### Scenario: "Production is broken!"

1. **IMMEDIATELY**: Use `production-monitor`
2. Assess issue and determine if rollback needed
3. If critical: Coordinate rollback immediately
4. Document incident

### Scenario: "PR has merge conflicts"

1. Use `pr-conflict-resolver`
2. Agent will combine features from both branches
3. Test after conflict resolution
4. Push updated branch

### Scenario: "Need to check production health"

1. Use `production-monitor`
2. Run health checks
3. Review logs for errors
4. Report status

---

## 📞 When in Doubt

1. **PR review?** → Start with `pr-conflict-resolver`
2. **Deployment?** → Start with `env-guardian`
3. **Production issue?** → Use `production-monitor`
4. **Not sure?** → Check the complete workflows above

---

## ⚠️ Safety Reminders

- **NEVER** review a PR without `pr-conflict-resolver` first
- **NEVER** deploy without `env-guardian` first
- **NEVER** walk away during deployment (use `deploy-coordinator`)
- **ALWAYS** rollback immediately if production broken (use `production-monitor`)

---

**Remember**: The right sub-agent for the right task. Use this guide to quickly identify which agent to delegate to!

For detailed information, see individual sub-agent documentation.
