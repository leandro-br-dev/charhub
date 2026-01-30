---
name: deployment-coordination
description: Orchestrate safe deployment to production from environment validation to post-deploy verification. Use when PR is approved and ready to deploy.
---

# Deployment Coordination

## Purpose

Orchestrate safe deployment to production by validating environment variables, coordinating the deployment process, monitoring for issues, and verifying successful deployment.

## When to Use

- PR approved and ready to deploy to production
- Environment configuration changes needed
- Production deployment scheduled
- Post-deployment verification needed

## Pre-Conditions

✅ Pull Request approved by review
✅ All tests passing
✅ env-guardian sub-agent available
✅ deploy-coordinator sub-agent available
✅ production-monitor sub-agent available
✅ Production access credentials valid

## Auto-Deploy Architecture

> **IMPORTANT**: This project uses **automatic CI/CD deployment via GitHub Actions**.
> Every merge or push to `main` automatically triggers a pipeline that builds, tests,
> and deploys to production.
>
> **Merging a PR to main IS deploying to production.**
>
> This means:
> - Environment validation must happen **BEFORE** the merge
> - There is no separate "deploy" step — the merge triggers it
> - After merge, the role is to **monitor** the GitHub Actions pipeline
> - Post-deploy verification confirms production health

## Deployment Coordination Workflow

### Phase 1: Environment Validation (CRITICAL! — BEFORE Merge!)

**Use sub-agent**: `env-guardian`

**ALWAYS use this BEFORE EVERY deployment - No exceptions!**

```bash
# Step 1: Check current environment
# Compare local .env with production environment
# Look for new environment variables in the PR

# Step 2: Validate all required variables exist
# Check for secrets that need to be added
# Verify configuration values are correct

# Step 3: Document any new environment variables
# Create setup instructions for production
```

**What env-guardian does**:
- Environment variable validation
- New env var detection
- Environment synchronization
- Configuration verification
- Secret validation
- Preventing deployment failures

**Critical checks**:
```bash
# Check for new environment variables in PR
git diff main...<feature-branch> -- .env.example .env

# Validate all required variables are set
# For each new variable:
- Is it documented in .env.example?
- Does it have a default value?
- Is it marked as required/optional?
- Production value set?
```

**Output**: Environment validated and ready OR setup instructions provided

### Phase 2: Pre-Deploy Verification

**Use sub-agent**: `deploy-coordinator`

**Only after environment validated**

**Pre-deploy checklist**:
- [ ] Environment variables validated and synced
- [ ] All tests passing (backend + frontend)
- [ ] Docker images built successfully
- [ ] No merge conflicts with main
- [ ] Feature spec exists and is complete
- [ ] Rollback plan documented
- [ ] Stakeholders notified of deployment

**Risk assessment**:
- [ ] Database migration required? → Plan for potential rollback
- [ ] Breaking API changes? → Coordinate with dependent systems
- [ ] High-traffic period? → Consider scheduling for low-traffic time
- [ ] New dependencies added? → Verify production compatibility

**Output**: Pre-deploy checks passed OR issues identified

### Phase 3: Merge & Auto-Deploy

**Only after all pre-deploy checks and environment validation passed**

**Merge triggers automatic deployment via GitHub Actions**:

```bash
# Step 1: Merge PR to main (this triggers the CI/CD pipeline)
gh pr merge <number> --merge

# Step 2: Monitor GitHub Actions pipeline
gh run watch
# OR check status periodically:
gh run list --limit 5

# Step 3: Verify pipeline completes successfully
gh run view <run-id>
```

**The GitHub Actions pipeline automatically**:
- Builds Docker images
- Runs tests
- Deploys to production server
- Restarts services
- Runs health checks

**Active monitoring during deployment**:
- Watch GitHub Actions pipeline progress
- Monitor for any pipeline failures
- Check production health after pipeline completes

**DO NOT walk away during deployment!**

### Phase 4: Post-Deploy Verification

**Use sub-agent**: `deploy-coordinator` and `production-monitor`

**Immediately after deployment**:

**Service health checks**:
```bash
# Check all containers running
docker compose ps

# Check backend health
curl https://charhub.app/api/v1/health

# Check frontend serving
curl -I https://charhub.app

# Check logs for errors
docker compose logs --tail=100 backend | grep -i error
docker compose logs --tail=100 frontend | grep -i error
```

**Functional verification**:
- [ ] Critical user flows work
- [ ] API endpoints respond correctly
- [ ] Database queries execute
- [ ] No new errors in logs
- [ ] Performance acceptable
- [ ] Features from feature spec work

**Rollback criteria**:
- Critical errors in logs
- Services failing to start
- API returning 500 errors
- Database migration failures
- Performance severely degraded

### Phase 5: Production Monitoring

**Use sub-agent**: `production-monitor`

**Ongoing monitoring after deployment**:

**First 15 minutes**:
- Monitor error rates
- Check logs continuously
- Verify critical features work
- Watch for anomalies

**First hour**:
- Continue log monitoring
- Track performance metrics
- Monitor user reports
- Check database performance

**First 24 hours**:
- Regular health checks
- Monitor for delayed issues
- Track error trends
- Review system metrics

### Phase 6: Documentation & Cleanup

**Update feature spec**:
```bash
# Move feature from active to implemented
mv docs/05-business/planning/features/active/FEATURE-XXX.md \
   docs/05-business/planning/features/implemented/FEATURE-XXX.md

# Update feature spec with deployment info
# Add deployment date, notes, any issues
```

**Create deployment record**:
```markdown
# Deployment Record - {Date}

## Feature
FEATURE-XXX: {Feature Name}

## Deployment Details
- **Date**: {YYYY-MM-DD HH:MM}
- **PR**: #{number}
- **Commit**: {sha}
- **Environment Changes**: {description}

## Deployment Notes
- {note_1}
- {note_2}

## Issues Encountered
- {issue_1}: {resolution}
- {issue_2}: {resolution}

## Rollback Performed?
- [ ] No - Deployment successful
- [ ] Yes - See incident report
```

## Deployment Types

### Regular Deployment

**Risk Level**: Low to Medium
**Timeline**: 5-15 minutes
**Requirements**:
- Environment validation
- Pre-deploy checks
- Active monitoring
- Post-deploy verification

### Database Migration Deployment

**Risk Level**: High
**Timeline**: 15-30 minutes
**Additional Requirements**:
- Migration tested locally first
- Rollback plan documented
- Migration verified in production
- Data integrity checks performed
- Extended monitoring period

### Breaking Changes Deployment

**Risk Level**: Very High
**Timeline**: 30-60 minutes
**Additional Requirements**:
- Breaking changes documented
- Dependent systems notified
- Feature flags used if possible
- Staged rollout considered
- Extended monitoring (48 hours)
- Incident response on standby

## Output Format

```
"Deployment coordination complete:

Feature: FEATURE-XXX - {name}
PR: #<number> - {title}
Status: DEPLOYED | ROLLED BACK

Environment Validation:
- New variables: {count}
- Variables synced: PASSED
- Configuration verified: PASSED

Pre-Deploy Checks:
- All tests passing: PASSED
- Docker images built: PASSED
- No merge conflicts: PASSED
- Risk assessment: {LOW/MEDIUM/HIGH}

Deployment Execution:
- Merged to main: SUCCESS
- Production pull: SUCCESS
- Services restarted: SUCCESS
- Startup time: {X}m {Y}s

Post-Deploy Verification:
- All containers running: PASSED
- Health checks: PASSED
- Critical features: PASSED
- No new errors: PASSED

Rollback Performed: NO | YES - {reason}

Next Steps: {monitor for 24h | create incident report}"
```

## Integration with Workflow

```
deployment-coordination (THIS SKILL)
    ↓
env-guardian (validate environment)
    ↓
deploy-coordinator (pre-deploy checks)
    ↓
deploy-coordinator (execute deployment)
    ↓
production-monitor (watch for issues)
    ↓
deploy-coordinator (post-deploy verification)
    ↓
production-monitor (ongoing monitoring)
```

---

## Deployment Rollback Decision Tree

```
Issue detected during deployment?
├─ Critical errors in logs?
│  └─ YES → ROLLBACK IMMEDIATELY
├─ Services failing to start?
│  └─ YES → ROLLBACK IMMEDIATELY
├─ API returning 500 errors?
│  └─ YES → ROLLBACK IMMEDIATELY
├─ Database migration failure?
│  └─ YES → ROLLBACK IMMEDIATELY
├─ Performance severely degraded?
│  └─ YES → Assess → Rollback if critical
└─ Minor issues?
   └─ NO → Document → Monitor → Fix in follow-up
```

---

Remember: **Validate Before Deploy - Monitor During Deploy - Verify After Deploy**

Missing environment variables are the #1 cause of deployment failures. ALWAYS use env-guardian before EVERY deployment.
