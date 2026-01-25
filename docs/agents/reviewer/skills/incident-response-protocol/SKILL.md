---
name: incident-response-protocol
description: Handle production incidents with rapid assessment, rollback coordination, and documentation. Use when production issue is detected.
---

# Incident Response Protocol

## Purpose

Provide structured response to production incidents with rapid assessment, immediate rollback if needed, root cause analysis, and documentation for prevention.

## When to Use

- Production errors detected
- Services failing or degraded
- User reports of broken functionality
- Performance issues impacting users
- Security incidents suspected
- Data corruption or loss detected

## Pre-Conditions

✅ Production monitoring active
✅ production-monitor sub-agent available
✅ Production access credentials valid
✅ Incident response process understood

## Incident Response Workflow

### Phase 1: Immediate Assessment

**Use sub-agent**: `production-monitor`

**Time critical: First 5 minutes**

**Assessment checklist**:
- [ ] Identify incident scope (users affected, features broken)
- [ ] Determine severity (critical, high, medium, low)
- [ ] Assess business impact
- [ ] Identify potential causes
- [ ] Check recent deployments
- [ ] Review error logs

**Severity classification**:

| Severity | Description | Response Time | Example |
|----------|-------------|---------------|---------|
| **P1 - Critical** | Complete outage, data loss, security breach | Immediate (5 min) | 500 errors for all users |
| **P2 - High** | Major feature broken, significant degradation | 15 minutes | Character creation broken |
| **P3 - Medium** | Minor feature broken, partial degradation | 1 hour | Avatar upload slow |
| **P4 - Low** | Edge case bug, minimal impact | 4 hours | Typo in error message |

**Quick diagnosis commands**:

```bash
# Check service health
docker compose ps

# Check recent logs
docker compose logs --tail=500 backend | grep -i error
docker compose logs --tail=500 frontend | grep -i error

# Check system resources
docker stats
df -h
free -h

# Check recent deployments
git log --oneline -10

# Check API health
curl https://charhub.app/api/v1/health
```

**Output**: Incident severity determined, initial assessment complete

### Phase 2: Decision - Rollback or Fix?

**Based on severity and assessment**

**Rollback immediately if**:
- P1 - Critical incident
- Complete service outage
- Data loss or corruption
- Security breach confirmed
- Recent deployment introduced issue
- Fix unknown or would take >30 minutes

**Attempt fix if**:
- P3/P4 - Medium/Low severity
- Issue isolated to minor feature
- Root cause clearly understood
- Fix can be implemented safely in <15 minutes
- Rollback would cause more disruption

**Rollback decision tree**:
```
Is issue critical?
├─ YES → ROLLBACK IMMEDIATELY
└─ NO
   ├─ Recent deployment?
   │  ├─ YES → ROLLBACK (safer)
   │  └─ NO
   │     ├─ Root cause known?
   │     │  ├─ YES → Fix if <15 min
   │     │  └─ NO → Investigate more
   │     └─ Fix >30 min?
   │        └─ YES → ROLLBACK
```

### Phase 3A: Rollback Execution (If Needed)

**Use sub-agent**: `production-monitor`

**Time critical: Complete rollback within 10 minutes**

**Rollback process**:

```bash
# Step 1: Identify last known good commit
git log --oneline -20

# Step 2: Checkout previous stable version
ssh production-server "cd /app && git checkout <commit-sha>"

# Step 3: Restart services
ssh production-server "cd /app && docker compose up -d --build"

# Step 4: Verify services started
docker compose ps
docker compose logs --tail=50

# Step 5: Verify functionality restored
curl https://charhub.app/api/v1/health
# Test critical features
```

**During rollback**:
- Communicate status to stakeholders
- Monitor error logs
- Verify services restart successfully
- Test critical functionality
- Document rollback commit

**Output**: System restored to previous state OR rollback failed

### Phase 3B: Fix Implementation (If Not Rolling Back)

**Only for P3/P4 incidents with known fix**

**Fix process**:

```bash
# Step 1: Create incident branch
git checkout -b incident/incident-{id}-{description}

# Step 2: Implement fix
# Make minimal changes to resolve issue

# Step 3: Test locally
docker compose up -d
npm test

# Step 4: Deploy fix to production
# Follow deployment-coordination skill
```

**Fix validation**:
- [ ] Fix addresses root cause
- [ ] No side effects introduced
- [ ] Tested locally
- [ ] Tests passing
- [ ] Documented changes

**Output**: Fix implemented and deployed OR fix failed (fallback to rollback)

### Phase 4: Verification & Monitoring

**Use sub-agent**: `production-monitor`

**After rollback or fix**

**Verification checklist**:
- [ ] Services running and healthy
- [ ] Errors stopped in logs
- [ ] Critical functionality working
- [ ] User reports decreased
- [ ] Performance normal
- [ ] No new issues introduced

**Extended monitoring**:
- First 30 minutes: Watch logs continuously
- First hour: Check health every 10 minutes
- First 4 hours: Monitor error rates
- First 24 hours: Track for recurrence

**Output**: Incident resolved OR ongoing issues

### Phase 5: Root Cause Analysis

**After incident resolved**

**Investigation**:

```bash
# Gather evidence
# - Error logs before/during/after incident
# - System metrics (CPU, memory, disk)
# - Database performance
# - Recent deployments
# - Configuration changes
# - User reports and timeline

# Identify root cause
# - What happened?
# - When did it happen?
# - Why did it happen?
# - How was it detected?
# - How was it resolved?
```

**Root cause analysis techniques**:
- **5 Whys**: Ask "why" 5 times to find root cause
- **Timeline**: Reconstruct exact sequence of events
- **Compare**: What changed between working and broken states
- **Reproduce**: Can the issue be reproduced reliably?

**Output**: Root cause identified

### Phase 6: Documentation & Prevention

**Create incident report**:

```markdown
# Incident Report - {INCIDENT-ID}

## Summary
{Brief description of the incident}

## Impact
- **Severity**: {P1/P2/P3/P4}
- **Users Affected**: {count/percentage}
- **Duration**: {start} to {end} ({duration})
- **Business Impact**: {revenue loss, user impact, etc.}

## Timeline
- **{time}**: Incident detected via {method}
- **{time}**: Assessment began
- **{time}**: Rollback initiated / Fix implemented
- **{time}**: Service restored
- **{time}**: Verification complete

## Root Cause
{What caused the incident}

## Resolution
- **Rollback**: {commit-sha} - YES/NO
- **Fix**: {commit-sha/PR-number} - YES/NO
- **Resolution time**: {duration}

## What Went Well
- {positive_1}
- {positive_2}

## What Could Be Improved
- {improvement_1}
- {improvement_2}

## Action Items
- [ ] {action_1} - {assigned_to} - {due_date}
- [ ] {action_2} - {assigned_to} - {due_date}

## Prevention Measures
- {measure_1}
- {measure_2}

## Related
- Feature Spec: {FEATURE-XXX}
- ADR: {ADR-XXX}
- Follow-up Issue: #{number}
```

**Save incident report**:
```bash
# Create incident file
vim docs/06-operations/incident-response/{YYYY-MM-DD}-{incident-id}.md
```

**Report to Agent Planner**:
- Quality issues discovered
- Process improvements needed
- Feature spec updates required
- Technical debt identified

## Output Format

```
"Incident response complete:

Incident: {INCIDENT-ID} - {description}
Severity: {P1/P2/P3/P4}
Duration: {start} to {end} ({duration})
Status: RESOLVED

Assessment:
- Users affected: {count/percentage}
- Services affected: {services}
- Business impact: {description}

Resolution:
- Rollback performed: YES/NO
- Rollback commit: {sha}
- Fix implemented: YES/NO
- Fix PR: #{number}
- Time to resolve: {duration}

Root Cause:
{brief description of root cause}

Action Items Created: {count}
- {action_1}
- {action_2}

Incident Report: docs/06-operations/incident-response/{file}.md
"
```

## Integration with Workflow

```
incident-response-protocol (THIS SKILL)
    ↓
production-monitor (immediate assessment)
    ↓
Decision: Rollback or Fix?
    ├─ Rollback → production-monitor (execute rollback)
    └─ Fix → Implement fix → deployment-coordination
    ↓
production-monitor (verification)
    ↓
Root cause analysis
    ↓
Create incident report
    ↓
Report to Agent Planner
```

---

## Communication Protocol

### During Incident

**Internal communication**:
- Update status every 15 minutes for P1/P2
- Document decision-making process
- Share assessment with team

**External communication**:
- P1: Immediate public notification
- P2: Notification within 30 minutes
- P3/P4: Status page update if extended

**Status update template**:
```markdown
## Incident Update - {INCIDENT-ID}

**Status**: Investigating | Identified | Monitoring | Resolved
**Started**: {time}
**Impact**: {description}

**Latest Update**: {time}
{update_text}

Next update: {time}
```

### After Incident

**Post-incident review**:
- Schedule within 1 week for P1/P2
- Include all stakeholders
- Review incident report
- Discuss action items
- Update processes

---

Remember: **Speed Over Perfection - Rollback First, Analyze Later**

In production incidents, restoring service fast is more important than understanding the root cause immediately. Rollback first, analyze later.
