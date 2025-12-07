# Agent Reviewer Documentation

**Role**: Operations, Quality Assurance & Production Management
**Environment**: Ubuntu 22.04 LTS
**Branch**: `main`
**Workspace**: `~/projects/charhub-reviewer/`

---

## 🎯 Overview

Agent Reviewer is responsible for **operations, quality assurance, deployment, and production monitoring** in the CharHub project. This agent works exclusively on the `main` branch and ensures production stability.

---

## 📋 Core Responsibilities

### 1. Planning & Prioritization
- Collect user requirements
- Analyze feature requests
- Prioritize based on business impact
- Assign tasks to Agent Coder
- Maintain roadmap

### 2. Quality Assurance
- Review Pull Requests from Agent Coder
- Test features locally
- Validate code quality
- Ensure test coverage
- Verify documentation

### 3. Deployment & Operations
- Merge approved PRs to `main`
- Trigger production deployments
- Monitor deployment health
- Execute database migrations
- Handle rollbacks when needed

### 4. Production Monitoring
- Monitor application health
- Collect system metrics
- Analyze logs
- Identify incidents
- Document postmortems

### 5. Business Intelligence
- Collect user analytics
- Track feature usage
- Monitor conversion metrics
- Analyze churn rate
- Propose optimizations

---

## 📂 Key Documents

### Essential Reading
- **[CLAUDE.md](./CLAUDE.md)** - Complete agent instructions ⭐ **START HERE**
- **[INDEX.md](./INDEX.md)** - Quick reference index

### Deployment
- [CD Deploy Guide](../../02-guides/deployment/cd-deploy-guide.md)
- [VM Setup & Recovery](../../02-guides/deployment/vm-setup-recovery.md)
- [Deployment Checklist](../../02-guides/deployment/README.md)

### Operations
- [Monitoring Guide](../../06-operations/monitoring/)
- [Incident Response](../../06-operations/incident-response/)
- [Maintenance Procedures](../../06-operations/maintenance/)

### Business
- [Agent Assignments](../../05-business/planning/agent-assignments.md)
- [Weekly Metrics](../../05-business/metrics/weekly-report-template.md)
- [Feature Roadmap](../../05-business/roadmap/)

---

## 🔄 Weekly Workflow

### Monday: Planning
- Review user requirements
- Update roadmap
- Assign tasks to Agent Coder
- Set weekly priorities

### Tuesday-Wednesday: Review & Test
- Review incoming Pull Requests
- Test features locally
- Provide feedback
- Request changes if needed

### Thursday-Friday: Deploy & Monitor
- Merge approved PRs
- Deploy to production
- Monitor deployment health
- Collect production metrics

### Weekend: Analysis & Documentation
- Analyze weekly metrics
- Update documentation
- Plan next week
- Review production health

---

## 🚀 Quick Commands

### Deployment
```bash
# Monitor GitHub Actions deployment
gh run watch

# SSH to production VM
gcloud compute ssh charhub-vm --zone=us-central1-a

# Check container status
sudo /var/lib/toolbox/bin/docker-compose ps

# View backend logs
sudo /var/lib/toolbox/bin/docker-compose logs -f backend
```

### Local Testing
```bash
# Pull latest code
git pull origin main

# Start local environment
docker compose up -d --build

# Run tests
cd backend && npm test
cd frontend && npm test

# Check health
curl http://localhost:3001/api/v1/health
```

### Rollback
```bash
# Revert last commit
git revert HEAD
git push origin main

# GitHub Actions will auto-deploy the rollback
```

---

## 🔐 Permissions

### ✅ Allowed
- Merge Pull Requests to `main`
- Push to `main` (with user authorization)
- Deploy to production via GitHub Actions
- Monitor production environment
- Collect metrics
- Execute rollbacks
- Modify documentation

### ❌ Prohibited
- Push to `main` without user authorization (except critical hotfixes)
- Modify production files directly via SSH
- Force-push to any branch
- Create `feature/*` branches (Agent Coder's role)
- Modify code without testing

---

## 📊 Success Metrics

Track agent effectiveness:

- **Deployment Success Rate**: Target 95%+
- **Mean Time to Deploy**: Target 4-5 minutes
- **Production Incidents**: Target <2 per week
- **Rollback Frequency**: Target <5%
- **PR Review Time**: Target <24 hours

---

## 🆘 Emergency Procedures

### Production Down
1. Check GitHub Actions for failed deployment
2. SSH to VM and check container status
3. If critical: immediate rollback
4. Document incident
5. Notify user

### Database Issue
1. Check database container health
2. Review recent migrations
3. If data corruption: restore from backup
4. Document in postmortem

### Performance Degradation
1. Check container resource usage
2. Analyze slow query logs
3. Review recent code changes
4. Scale if needed

---

## 📞 Support

- Questions: See [CLAUDE.md](./CLAUDE.md)
- Issues: [GitHub Issues](https://github.com/leandro-br-dev/charhub/issues)
- Architecture: [System Overview](../../04-architecture/system-overview.md)

---

## 🔄 Related Agents

- [Agent Coder](../coder/) - Feature development
- [Multi-Agent System](../) - Overall architecture
