# Runbook: [Issue Name]

**Last Updated**: YYYY-MM-DD
**Owner**: Agent Reviewer
**Severity**: Critical / High / Medium / Low

---

## 📋 Overview

**Purpose**: [What this runbook helps you solve]

**When to use**:
- [Symptom 1]
- [Symptom 2]
- [Symptom 3]

**Estimated time to resolve**: [XX minutes]

---

## 🚨 Symptoms

**How to identify this issue**:

### User-Visible Symptoms
- [ ] [Symptom from user perspective - e.g., "Cannot load dashboard"]
- [ ] [Symptom 2]
- [ ] [Symptom 3]

### System Symptoms
- [ ] Error messages in logs: `[paste example error]`
- [ ] High error rate in monitoring (> X%)
- [ ] Slow response times (> Xms)
- [ ] [Other system symptoms]

### Monitoring Alerts
```
[Paste example alert that triggers this runbook]
Alert: [Alert name]
Condition: [What triggered the alert]
Threshold: [What value exceeded threshold]
```

---

## 🔍 Investigation

**Step-by-step diagnostic procedures**:

### 1. Check Service Health
```bash
# Check container status
docker compose ps

# Expected output:
# backend    running (healthy)
# frontend   running (healthy)
# postgres   running (healthy)
```

### 2. Check Recent Logs
```bash
# Backend logs (last 100 lines)
docker compose logs -f backend --tail=100

# Look for errors containing:
# - "ERROR"
# - "Exception"
# - "Failed"
```

### 3. Check Database
```bash
# Connect to database
docker compose exec postgres psql -U user -d charhub_db

# Check active connections
SELECT count(*) FROM pg_stat_activity;

# Expected: < 90 (max is 100)

# Check for locks
SELECT * FROM pg_locks WHERE NOT granted;

# Expected: Empty result (no locks)
```

### 4. Check System Resources
```bash
# Check CPU and memory
docker stats --no-stream

# Expected:
# backend: CPU < 80%, Memory < 1GB
# postgres: CPU < 60%, Memory < 512MB
```

### 5. Check Recent Changes
```bash
# Check recent commits
git log --oneline -10

# Check recent deployments
# Review GitHub Actions: https://github.com/[repo]/actions
```

---

## 🔧 Resolution

**Choose the appropriate solution based on investigation**:

### Solution A: [Common Case - e.g., "Service Restart"]

**When to use**: [Conditions when this solution applies]

**Steps**:
```bash
# 1. Restart affected service
docker compose restart backend

# 2. Wait for health check
sleep 30

# 3. Verify service is healthy
docker compose ps backend

# 4. Check logs for startup errors
docker compose logs backend --tail=50
```

**Verification**:
- [ ] Service shows "healthy" status
- [ ] No errors in logs
- [ ] Health endpoint returns 200: `curl http://localhost:3001/api/v1/health`

---

### Solution B: [Less Common Case - e.g., "Database Connection Pool Reset"]

**When to use**: [Conditions when this solution applies]

**Steps**:
```bash
# 1. Check connection pool status
# [Command to check]

# 2. Reset connections
# [Command to reset]

# 3. Verify
# [Command to verify]
```

**Verification**:
- [ ] [Check 1]
- [ ] [Check 2]

---

### Solution C: [Rare Case - e.g., "Full Restart"]

**⚠️ WARNING**: This solution causes downtime. Only use if other solutions failed.

**When to use**: [Extreme conditions]

**Steps**:
```bash
# 1. Stop all services
docker compose down

# 2. Clear volumes (if needed - DESTRUCTIVE)
# docker compose down -v  # Only if database is corrupted

# 3. Restart services
docker compose up -d --build

# 4. Wait for all services to be healthy
sleep 60

# 5. Verify all services
docker compose ps
```

**Verification**:
- [ ] All containers running and healthy
- [ ] Application accessible
- [ ] No errors in logs

---

## 🔄 Rollback Procedure

**If the issue started after a recent deployment**:

```bash
# 1. Identify last working commit
git log --oneline -10

# 2. Revert to last working version
git revert HEAD
git push origin main

# 3. Monitor GitHub Actions deployment
gh run watch

# 4. Verify service is working
curl https://charhub.app/api/v1/health

# 5. Document incident
vim docs/06-operations/incident-response/$(date +%Y-%m-%d)-rollback.md
```

---

## ⏱️ Post-Resolution

**After resolving the issue**:

### 1. Verify Stability
```bash
# Monitor for 15 minutes
docker compose logs -f backend

# Check metrics dashboard
# [Link to monitoring dashboard]
```

### 2. Update Monitoring
- [ ] Check if alerts need tuning
- [ ] Add new alerts if this issue wasn't detected automatically
- [ ] Update alert thresholds if needed

### 3. Document Incident
```bash
# If this was a production incident, document it
vim docs/06-operations/incident-response/$(date +%Y-%m-%d)-[issue-name].md
```

### 4. Notify Stakeholders
- [ ] Update incident status
- [ ] Communicate resolution to affected users (if needed)
- [ ] Post in team channel

---

## 🛡️ Prevention

**How to prevent this issue in the future**:

### Short-term
- [ ] [Preventive action 1]
- [ ] [Preventive action 2]

### Long-term
- [ ] [Architectural improvement 1]
- [ ] [Monitoring improvement 1]

---

## 📚 Related Documentation

**Deployment guides**:
- [CD Deploy Guide](../../02-guides/deployment/cd-deploy-guide.md)
- [VM Setup & Recovery](../../02-guides/deployment/vm-setup-recovery.md)

**Architecture docs**:
- [System Overview](../../04-architecture/system-overview.md)
- [Database Schema](../../04-architecture/database-schema.md)

**Other runbooks**:
- [Related runbook 1]
- [Related runbook 2]

---

## 📊 Metrics to Monitor

**During incident**:
- Error rate (target: < 1%)
- Response time p95 (target: < 200ms)
- Container health status
- Database connection count

**After resolution**:
- Monitor for 24 hours
- Check same metrics
- Look for recurrence

---

## 🔗 Quick Links

**Production access**:
```bash
# SSH to VM
gcloud compute ssh charhub-vm --zone=us-central1-a

# View logs
docker compose logs -f backend

# Check health
curl https://charhub.app/api/v1/health
```

**GitHub Actions**:
- Production deployments: https://github.com/[repo]/actions

**Monitoring**:
- [Production dashboard link]
- [Metrics dashboard link]

---

**Runbook version**: 1.0
**Last tested**: YYYY-MM-DD
**Effectiveness**: [ ] Resolved issue / [ ] Needs update
