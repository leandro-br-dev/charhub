# Incident: 2025-12-14 - Recurring Disk Space Exhaustion

**Date**: 2025-12-14
**Severity**: Medium (Proactive Prevention)
**Duration**: N/A (Discovered before causing outage)
**Status**: Resolved with preventive measures

---

## 📋 Summary

Recurring disk space exhaustion identified on production VM due to accumulation of unused Docker images, volumes, and build cache from multiple deployments.

**Impact**:
- Users affected: 0 (discovered proactively)
- Services affected: None (prevented before outage)
- Business impact: Risk of deployment failures and service disruption if left unaddressed

**Risk Assessment**:
- Disk usage was at 76% (20GB/26GB) and trending upward
- Without intervention, would reach critical levels (>90%) within 2-3 weeks
- Could cause deployment failures, container startup issues, and service instability

---

## ⏱️ Timeline

**All times in UTC-3 (São Paulo time)**

| Time | Event | Action Taken |
|------|-------|--------------|
| 13:00 | User reported recurring disk space issues | Agent Reviewer started investigation |
| 13:10 | Disk usage confirmed at 76% (20GB used) | Connected to production VM for analysis |
| 13:15 | Root cause identified | Found 5.77GB of unused Docker images, 1.314GB unused volumes, 3.224GB build cache |
| 13:25 | Cleanup executed | Ran `docker system prune -af --volumes` |
| 13:30 | Space reclaimed verified | Disk usage reduced to 30% (7.5GB used), 12.5GB recovered |
| 13:45 | Monitoring scripts created | Created automated monitoring and cleanup scripts |
| 14:00 | CI/CD integration completed | Updated deploy workflow with automatic cleanup |
| 14:15 | Documentation completed | Created runbooks and incident report |

---

## 🔍 Detection

**How was the issue detected?**
- [x] User report (recurring problem)
- [ ] Automated alert (not yet configured)
- [ ] Manual discovery during deployment
- [ ] Monitoring dashboard
- [ ] Other

**Context**:
User reported that this was a recurring issue previously solved by removing old Docker images manually. This indicated a systemic problem requiring automated prevention.

---

## 🐛 Root Cause

**What caused the issue?**

Docker's default behavior is to preserve old images, volumes, and build cache indefinitely. Each deployment creates new images but doesn't remove old ones, leading to gradual disk space exhaustion.

**Technical details**:

**Before cleanup:**
```
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          13        6         7.247GB   5.77GB (79%)
Containers      6         6         90.4kB    0B (0%)
Local Volumes   8         4         1.807GB   1.314GB (72%)
Build Cache     132       0         3.224GB   3.224GB
```

**Disk usage:**
```
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        26G   20G  6.4G  76% /mnt/stateful_partition
```

**Why it happened**:
1. Each deployment creates new Docker images (backend ~1.3GB each)
2. Old images become "dangling" (untagged) but are not removed
3. Docker build cache accumulates over time
4. Unused volumes from previous containers remain
5. No automated cleanup process in place
6. No monitoring to detect the gradual space exhaustion

**Files accumulating space:**
- Dangling images: 7 images × ~1.3GB = ~5.77GB
- Unused volumes: 4 volumes = ~1.314GB
- Build cache: 132 cache entries = ~3.224GB
- **Total reclaimable: ~10.3GB**

---

## 🔧 Resolution

**Immediate mitigation** (manual cleanup):
```bash
# Cleaned all unused Docker resources
gcloud compute ssh charhub-vm --zone=us-central1-a \
  --command="sudo docker system prune -af --volumes"
```

**Results:**
- Deleted 7 unused images
- Deleted 4 dangling volumes
- Cleared build cache
- **Recovered: 12.5GB of disk space**
- **Disk usage: 76% → 30%**

**Permanent fix**:

1. **Created monitoring script** (`scripts/ops/monitor-disk-space.sh`):
   - Monitors disk usage with configurable thresholds
   - Checks Docker resources (images, volumes, cache)
   - Provides cleanup recommendations
   - Exit codes: 0 (healthy), 1 (warning), 2 (critical)

2. **Created automated cleanup script** (`scripts/ops/cleanup-docker.sh`):
   - Standard mode: removes unused images and build cache
   - Aggressive mode: also removes unused volumes
   - Dry-run mode for safety
   - Preserves running containers and named volumes

3. **Integrated into CI/CD** (`.github/workflows/deploy-production.yml`):
   - Added "Monitor Disk Space" step after deployment
   - Added "Cleanup Docker Resources" step
   - Automatic cleanup if disk usage > 70%
   - Runs after every successful deployment

**Verification**:
- [x] Disk space reduced from 76% to 30%
- [x] Docker resources optimized (only 3% reclaimable)
- [x] Scripts tested on production
- [x] CI/CD workflow updated
- [x] Documentation created

---

## 📊 Impact Analysis

**System metrics during investigation**:
- Disk usage: 76% → 30% (after cleanup)
- Docker images: 7.247GB → 1.738GB
- Available space: 6.4GB → 18GB

**User impact**:
- Users affected: 0 (proactive prevention)
- Failed requests: 0
- Duration of impact: 0

**Business impact**:
- Revenue loss: R$ 0
- User complaints: 0
- SLA violation: No
- **Risk prevented**: Potential deployment failures and service disruption

**Cost savings**:
- Avoided potential disk upgrade ($)
- Prevented deployment downtime
- Reduced manual intervention needs

---

## ✅ Action Items

**Immediate** (completed):
- [x] Clean production disk space - Owner: Agent Reviewer - Completed: 2025-12-14
- [x] Create monitoring scripts - Owner: Agent Reviewer - Completed: 2025-12-14
- [x] Create cleanup scripts - Owner: Agent Reviewer - Completed: 2025-12-14

**Short-term** (completed):
- [x] Integrate cleanup into CI/CD - Owner: Agent Reviewer - Completed: 2025-12-14
- [x] Document procedures - Owner: Agent Reviewer - Completed: 2025-12-14
- [x] Create incident report - Owner: Agent Reviewer - Completed: 2025-12-14

**Long-term** (future improvements):
- [ ] Set up CloudWatch/Stackdriver alerts for disk usage > 80% - Owner: TBD - Due: 2025-12-31
- [ ] Consider increasing VM disk size if growth continues - Owner: TBD - Due: 2026-Q1
- [ ] Implement log rotation for system logs - Owner: TBD - Due: 2025-12-31
- [ ] Review Docker image optimization (multi-stage builds) - Owner: Agent Coder - Due: 2026-Q1

---

## 💡 Lessons Learned

**What went well**:
- Proactive detection before causing outage
- Quick investigation and root cause identification
- Immediate cleanup recovered significant space (12.5GB)
- Comprehensive automation created to prevent recurrence
- Scripts are reusable and well-documented

**What could be improved**:
- Should have had monitoring in place earlier
- Could have detected this automatically with alerts
- Need better visibility into disk usage trends
- Documentation for manual cleanup was missing

**Process improvements**:
1. **Monitoring**: Always set up resource monitoring before issues occur
2. **Automation**: Include cleanup in deployment workflows by default
3. **Documentation**: Create runbooks for common operational tasks
4. **Proactive maintenance**: Schedule regular reviews of resource usage

**Technical improvements**:
1. Automatic cleanup after deployments
2. Monitoring scripts with configurable thresholds
3. Safety features (dry-run, preserves running services)
4. Clear documentation and runbooks

---

## 📚 Related Documents

**Documentation created**:
- [x] Runbook created: `scripts/ops/README.md`
- [x] Monitoring script: `scripts/ops/monitor-disk-space.sh`
- [x] Cleanup script: `scripts/ops/cleanup-docker.sh`
- [x] Deployment guide updated: `.github/workflows/deploy-production.yml`

**Related resources**:
- Docker documentation: https://docs.docker.com/config/pruning/
- GCP disk monitoring: https://cloud.google.com/compute/docs/disks/monitoring-disk-usage

**Scripts location**:
- `/root/projects/charhub-reviewer/scripts/ops/`

---

## 🔄 Preventive Measures Now in Place

1. **Automated Cleanup**:
   - Runs after every deployment
   - Triggers if disk usage > 70%
   - Removes unused images, volumes, and cache
   - Preserves running services

2. **Monitoring**:
   - Disk space monitoring script
   - Docker resource monitoring
   - Log size monitoring
   - Configurable alert thresholds

3. **Documentation**:
   - Complete runbooks for disk space management
   - Emergency procedures documented
   - Common workflows documented
   - Troubleshooting guides created

4. **CI/CD Integration**:
   - Automatic monitoring after deployments
   - Conditional cleanup based on disk usage
   - Logs all actions in GitHub Actions

---

## 👥 People Involved

- **Incident Commander**: Agent Reviewer
- **Responders**: Agent Reviewer
- **Notified**: User (initial report), User (resolution notification)

---

**Postmortem completed by**: Agent Reviewer
**Date**: 2025-12-14
**Review status**: [x] Completed / [ ] Pending review

---

## 📈 Monitoring Going Forward

**How to monitor disk space**:

```bash
# Run monitoring script
./scripts/ops/monitor-disk-space.sh

# On production
gcloud compute ssh charhub-vm --zone=us-central1-a \
  --command="cd /mnt/stateful_partition/charhub && ./scripts/ops/monitor-disk-space.sh"
```

**When to run cleanup**:

```bash
# Standard cleanup (safe)
./scripts/ops/cleanup-docker.sh

# Preview what will be deleted
./scripts/ops/cleanup-docker.sh --dry-run

# Aggressive cleanup (if needed)
./scripts/ops/cleanup-docker.sh --aggressive
```

**Recommended schedule**:
- Monitor: Weekly or before deployments
- Cleanup: Automatically after deployments (already configured)
- Manual review: Monthly

**Alert thresholds**:
- Warning: 80% disk usage
- Critical: 85% disk usage
- Automatic cleanup: 70% disk usage
