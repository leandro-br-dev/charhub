# Operations Documentation

**Last Updated**: 2025-12-08
**Owner**: Agent Reviewer
**Purpose**: Site Reliability Engineering (SRE), monitoring, and incident response

---

## 📋 Overview

This folder contains **operational documentation** for running CharHub in production.

**Target Audience**: Agent Reviewer, DevOps, SRE

**Scope**:
- Production monitoring and alerting
- Incident response and postmortems
- Maintenance procedures (backups, database maintenance)
- Runbooks for common operational tasks

---

## 📂 Folder Structure

### 🔍 [monitoring/](./monitoring/)
Production monitoring, health checks, and alerting.

**Contents**:
- Health check procedures
- Logging strategy and access
- Alert configuration
- Performance metrics dashboards
- Uptime monitoring

**When to use**:
- Setting up monitoring for new services
- Investigating performance issues
- Configuring alerting thresholds

---

### 📖 Operational Guides
Step-by-step procedures for common operational tasks.

**Contents**:
- **[Quality Dashboard](./quality-dashboard.md)** - Quality metrics dashboard and monitoring
- **[ComfyUI Setup](./comfyui-setup.md)** - ComfyUI middleware configuration and setup
- **[R2 CORS Configuration](./r2-cors-configuration.md)** - Cloudflare R2 CORS setup procedures
- **[ComfyUI Middleware Test Results](./COMFYUI_MIDDLEWARE_TEST_RESULTS.md)** - Test results and validation
- **[Middleware V2 Migration](./MIDDLEWARE_V2_MIGRATION_COMPLETE.md)** - Migration completion report

**When to use**:
- Setting up or configuring operational services
- Troubleshooting middleware and infrastructure issues
- Reviewing test results and migration status

---

### 🚨 [incident-response/](./incident-response/)
Incident management, runbooks, and postmortems.

**Contents**:
- Incident response procedures
- Runbooks for common issues (deploy failure, database issues, etc.)
- Postmortem templates and historical postmortems
- Escalation procedures

**When to use**:
- During a production incident
- After an incident (write postmortem)
- Creating runbooks for repetitive issues

**Template for incident reports:**
```
docs/06-operations/incident-response/YYYY-MM-DD-incident-title.md
```

**Example incidents to document:**
- Deployment failures
- Database connection issues
- Service outages
- Performance degradations
- Security incidents

---

### 🔧 [maintenance/](./maintenance/)
Scheduled maintenance procedures and database management.

**Contents**:
- Backup and restore procedures
- Database migration procedures
- Scheduled maintenance windows
- Cleanup scripts and routines
- Capacity planning

**When to use**:
- Planning scheduled maintenance
- Performing database backups
- Running database migrations
- Cleaning up old data

---

## 🎯 When to Use This Folder

### Monitoring
**Use when**:
- Setting up new service monitoring
- Investigating slow performance
- Configuring alerts for critical metrics
- Checking production health

**Examples**:
- "Set up alerts for high CPU usage"
- "Check backend response times"
- "Monitor database connection pool"

---

### Incident Response
**Use when**:
- Production is down or degraded
- Need to quickly resolve critical issue
- Writing postmortem after incident
- Creating runbook for recurring problem

**Examples**:
- "Deployment failed - need rollback procedure"
- "Database locked - need emergency unlock procedure"
- "High error rate - need investigation runbook"

**⚠️ CRITICAL**: Agent Reviewer MUST document incidents in this folder as mentioned in CLAUDE.md:

```bash
# If deployment fails, document immediately
vim docs/06-operations/incident-response/YYYY-MM-DD-deployment-failure.md
```

---

### Maintenance
**Use when**:
- Planning scheduled downtime
- Performing database maintenance
- Running backups
- Cleaning up old data

**Examples**:
- "Schedule weekly database backup"
- "Run migration in production"
- "Clean up old user sessions"

---

## 📝 Document Structure

### Monitoring Documents
```markdown
# Service Name - Monitoring Guide

## Health Checks
- Endpoint: /api/v1/health
- Expected response: {"status": "ok"}
- Alert threshold: 3 consecutive failures

## Key Metrics
- Response time (p95): < 200ms
- Error rate: < 1%
- CPU usage: < 80%

## Dashboards
- Production dashboard: [link]
- Performance metrics: [link]

## Alerts
- High error rate → #alerts channel
- Service down → Page on-call
```

---

### Incident Response Documents
```markdown
# Incident: [Date] - [Title]

## Summary
Brief description of what happened.

## Timeline
- HH:MM - Incident detected
- HH:MM - Investigation started
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Incident resolved

## Root Cause
What caused the incident.

## Resolution
How it was fixed.

## Action Items
- [ ] Prevent similar issue (add monitoring)
- [ ] Update runbook
- [ ] Improve alerting

## Lessons Learned
What we learned from this incident.
```

---

### Runbook Template
```markdown
# Runbook: [Issue Name]

## Symptoms
How to identify this issue:
- Error messages
- Metrics anomalies
- User reports

## Investigation
Steps to diagnose:
1. Check logs: `docker compose logs -f backend`
2. Check metrics: [dashboard link]
3. Check database: `docker compose exec postgres psql -U user -d charhub_db`

## Resolution
Steps to fix:
1. [Action 1]
2. [Action 2]
3. Verify fix: [how to verify]

## Prevention
How to prevent this in the future.
```

---

## 🔗 Integration with Other Docs

### Deployment Issues
- **Incident happens** → Document in `incident-response/`
- **Root cause identified** → Update deployment guides in `02-guides/deployment/`
- **Prevention needed** → Add monitoring in `monitoring/`

### Database Issues
- **Incident happens** → Document in `incident-response/`
- **Maintenance needed** → Document procedure in `maintenance/`
- **Backup needed** → Use backup guide in `03-reference/scripts/backup-restore-guide.md`

### Performance Issues
- **Symptoms detected** → Check `monitoring/` for metrics
- **Investigation** → Follow runbook in `incident-response/`
- **Optimization needed** → Update architecture docs in `04-architecture/`

---

## 🚨 Critical Procedures

### 1. Production Incident Response
```bash
# 1. Assess severity
# Critical (service down) → Immediate response
# High (degraded) → Respond within 1 hour
# Medium (minor issue) → Respond within 4 hours

# 2. Investigate
# Check logs, metrics, recent changes

# 3. Mitigate
# Rollback, restart services, apply hotfix

# 4. Resolve
# Fix root cause, deploy permanent solution

# 5. Document
vim docs/06-operations/incident-response/$(date +%Y-%m-%d)-incident-name.md

# 6. Follow up
# Create action items, update runbooks, improve monitoring
```

---

### 2. Deployment Rollback
```bash
# If deployment fails (documented in Agent Reviewer CLAUDE.md)
git revert HEAD
git push origin main

# Document incident
vim docs/06-operations/incident-response/$(date +%Y-%m-%d)-deployment-failure.md
```

---

### 3. Database Emergency
```bash
# 1. Assess impact
# Check connection pool, locks, slow queries

# 2. Quick mitigation
# Restart postgres if needed: docker compose restart postgres

# 3. Document
vim docs/06-operations/incident-response/$(date +%Y-%m-%d)-database-issue.md

# 4. Restore from backup if needed
# See: docs/03-reference/scripts/backup-restore-guide.md
```

---

## 📊 Folder Status

| Subfolder | Status | Priority |
|-----------|--------|----------|
| monitoring/ | 🔲 Empty - needs setup | HIGH |
| incident-response/ | 🔲 Empty - needs templates | HIGH |
| maintenance/ | 🔲 Empty - needs procedures | MEDIUM |

**Next steps**:
1. Create monitoring setup guide
2. Create incident response templates
3. Document common runbooks
4. Set up backup procedures documentation

---

## 📞 Quick Links

**During Incident**:
- [Deployment rollback procedure](../02-guides/deployment/cd-deploy-guide.md#rollback)
- [VM recovery procedures](../02-guides/deployment/vm-setup-recovery.md)
- [Backup & restore guide](../03-reference/scripts/backup-restore-guide.md)

**For Monitoring**:
- [GitHub Actions workflows](../03-reference/workflows/workflows-analysis.md)
- [Health check endpoints](../04-architecture/system-overview.md)

**For Maintenance**:
- [Database schema](../04-architecture/database-schema.md)
- [Backup procedures](../03-reference/scripts/backup-restore-guide.md)

---

[← Back to Documentation Home](../README.md)
