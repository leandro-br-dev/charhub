# Agent Reviewer - Checklists Index

**Quick Navigation**: Jump directly to the checklist you need

---

## 🎯 Quick Start

**New to Agent Reviewer?** Read `CLAUDE.md` first for context and workflow overview.

**Ready to work?** Use checklists below for step-by-step task execution.

---

## 📋 Operational Checklists

### Core Workflow (Execute in Order)

| # | Checklist | When to Use | Duration |
|---|-----------|-------------|----------|
| 1 | [PR Review](checklists/pr-review.md) | Agent Coder creates PR | ~15-30 min |
| 2 | [Local Testing](checklists/local-testing.md) | After code review passes | ~10-20 min |
| 3 | [Pre-Deploy](checklists/pre-deploy.md) | Before merging to main | ~10-15 min |
| 4 | [Deploy Monitoring](checklists/deploy-monitoring.md) | Immediately after push to main | ~5-10 min |
| 5 | [Post-Deploy](checklists/post-deploy.md) | After deployment succeeds | ~10-15 min |

**Total typical deployment time**: ~50-90 minutes

---

### Supporting Checklists

| Checklist | When to Use | Critical Level |
|-----------|-------------|----------------|
| [Environment Validation](checklists/env-validation.md) | Before EVERY deploy | 🔴 MANDATORY |
| [Rollback](checklists/rollback.md) | Deployment failure or critical bug | 🔴 EMERGENCY |

---

## 🔗 Checklist Flow Diagram

```
┌─────────────────┐
│  PR Created     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PR Review      │ ← checklists/pr-review.md
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Local Testing  │ ← checklists/local-testing.md
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Env Validation │ ← checklists/env-validation.md (CRITICAL)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Pre-Deploy     │ ← checklists/pre-deploy.md
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Push to Main   │ → Triggers GitHub Actions
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Monitor Deploy │ ← checklists/deploy-monitoring.md
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
  Success   Failure
    │         │
    │         └──────────┐
    ▼                    ▼
┌─────────────┐  ┌──────────────┐
│ Post-Deploy │  │   Rollback   │ ← checklists/rollback.md
└─────────────┘  └──────────────┘
         │                │
         ▼                ▼
┌─────────────────────────┐
│  Update Docs & Cleanup  │
└─────────────────────────┘
```

---

## 📖 Detailed Checklist Descriptions

### 1. PR Review (`pr-review.md`)

**Purpose**: Review code quality, security, and standards before testing

**Key checks**:
- Code quality and TypeScript standards
- Security vulnerabilities
- i18n translation keys
- Database migration safety
- Documentation completeness
- Test coverage

**Next step**: If approved → Local Testing

---

### 2. Local Testing (`local-testing.md`)

**Purpose**: Verify feature works correctly in local environment

**Key checks**:
- TypeScript compilation (backend + frontend)
- Linting
- Unit tests
- Database migrations
- Translation compilation
- Manual feature testing
- Browser console errors
- Backend logs

**Next step**: If tests pass → Pre-Deploy

---

### 3. Environment Validation (`env-validation.md`)

**Purpose**: Ensure production environment variables are correct

**⚠️ CRITICAL**: Must be executed before every deploy

**Key checks**:
- Compare `.env.example` with `.env.production`
- Validate production values (not dev values)
- Sync `.env.production` to production server
- Verify new environment variables documented

**Common issues prevented**:
- Backend crashes due to missing env vars
- Wrong database URL (connecting to dev instead of prod)
- Wrong R2 credentials (images not loading)
- OAuth issues (wrong client ID/secret)

**Next step**: If validated → Pre-Deploy

---

### 4. Pre-Deploy (`pre-deploy.md`)

**Purpose**: Final safety checks before triggering production deployment

**Key checks**:
- Environment validation completed
- Final test suite run
- Database migration safety
- Documentation complete
- No breaking changes
- Ready to monitor deployment

**⚠️ WARNING**: Every push to `main` triggers automatic deploy

**Next step**: Push to main → Deploy Monitoring

---

### 5. Deploy Monitoring (`deploy-monitoring.md`)

**Purpose**: Actively watch deployment process in real-time

**Key checks**:
- GitHub Actions workflow progress
- Each deployment step succeeds
- Container rebuild succeeds
- Health check passes
- Deployment verification succeeds

**⚠️ DO NOT walk away during deployment**

**Expected duration**: ~4-5 minutes

**Next step**:
- If successful → Post-Deploy
- If fails → Rollback

---

### 6. Post-Deploy (`post-deploy.md`)

**Purpose**: Verify production is actually working after deployment

**Key checks**:
- Production health endpoint responds
- Frontend loads correctly
- Main feature works
- No regressions in existing features
- Database migration succeeded (if applicable)
- Production logs clean
- Containers healthy
- Performance acceptable

**Monitor for**: 15 minutes after initial verification

**Next step**: Update documentation and clean up

---

### 7. Rollback (`rollback.md`)

**Purpose**: Emergency procedure to restore production to working state

**When to use**:
- Deployment fails
- Production health endpoint down
- Critical feature completely broken
- Database corruption
- Widespread user issues

**When NOT to use**:
- Minor UI bugs (hotfix instead)
- Non-critical issues (hotfix instead)
- Single user reports (investigate first)

**Key steps**:
- Git revert (preferred method)
- Monitor rollback deployment
- Verify production restored
- Database rollback (if needed)
- Document incident

**Expected duration**: ~5-10 minutes

---

## 🚨 Emergency Quick Reference

### Production is Down Right Now

1. **Execute**: `checklists/rollback.md`
2. **Don't investigate first** - rollback, then debug
3. **Monitor**: Verify rollback succeeds
4. **Document**: Create incident report

### Deployment Currently Failing

1. **Don't push again** - it will fail again
2. **Execute**: `checklists/rollback.md`
3. **Fix issue** locally and test thoroughly
4. **Re-deploy** following full workflow

### Forgot to Check Environment Variables

1. **STOP** - don't deploy yet
2. **Execute**: `checklists/env-validation.md`
3. **Fix** any missing/wrong variables
4. **Resume**: `checklists/pre-deploy.md`

### Not Sure What to Do

1. **Read**: `CLAUDE.md` for context
2. **Find** where you are in workflow (see diagram above)
3. **Execute** appropriate checklist
4. **Ask** user if still unclear

---

## 📂 File Organization

```
docs/agents/reviewer/
├── CLAUDE.md                      # Main agent instructions (read first)
├── INDEX.md                       # This file - checklist navigation
└── checklists/                    # Operational checklists
    ├── pr-review.md              # Step 1: Code review
    ├── local-testing.md          # Step 2: Test locally
    ├── env-validation.md         # Step 2.5: CRITICAL env check
    ├── pre-deploy.md             # Step 3: Pre-deploy checks
    ├── deploy-monitoring.md      # Step 4: Watch deployment
    ├── post-deploy.md            # Step 5: Verify production
    └── rollback.md               # Emergency: Restore production
```

---

## 🔍 Finding What You Need

### By Task

| I need to... | Use this checklist |
|--------------|-------------------|
| Review a PR | [pr-review.md](checklists/pr-review.md) |
| Test a feature locally | [local-testing.md](checklists/local-testing.md) |
| Check environment variables | [env-validation.md](checklists/env-validation.md) |
| Prepare for deployment | [pre-deploy.md](checklists/pre-deploy.md) |
| Watch a deployment | [deploy-monitoring.md](checklists/deploy-monitoring.md) |
| Verify production works | [post-deploy.md](checklists/post-deploy.md) |
| Fix a broken deployment | [rollback.md](checklists/rollback.md) |

### By Problem

| Problem | Likely cause | Check this |
|---------|--------------|------------|
| Backend won't start | Missing env var | [env-validation.md](checklists/env-validation.md) |
| Tests fail locally | Code issue | [local-testing.md](checklists/local-testing.md) |
| Deployment fails | Build error | [deploy-monitoring.md](checklists/deploy-monitoring.md) |
| Production broken | Bad deploy | [rollback.md](checklists/rollback.md) |
| Images not loading | R2 config wrong | [env-validation.md](checklists/env-validation.md) |
| OAuth doesn't work | OAuth credentials wrong | [env-validation.md](checklists/env-validation.md) |

---

## 💡 Tips for Using Checklists

### Do's

✅ **Execute checklists in order** - Don't skip steps
✅ **Check every checkbox** - They're there for a reason
✅ **Read the "See Also" sections** - They reference deeper docs
✅ **Document issues** - Note what you find
✅ **Ask questions** - If unclear, ask user

### Don'ts

❌ **Don't skip env-validation.md** - It catches critical issues
❌ **Don't assume tests pass** - Always verify
❌ **Don't walk away during deploy** - Monitor actively
❌ **Don't skip rollback if needed** - Stability > debugging
❌ **Don't deploy without testing** - Test locally first

---

## 📚 Additional Resources

### Core Documentation

- `CLAUDE.md` - Agent Reviewer instructions and workflow
- `../../02-guides/deployment/cd-deploy-guide.md` - Deployment process details
- `../../02-guides/deployment/vm-setup-recovery.md` - Production VM guide
- `../../04-architecture/system-overview.md` - System architecture

### Reference Guides

- `../../03-reference/workflows/workflows-analysis.md` - GitHub Actions details
- `../../03-reference/backend/environment-variables.md` - Env var documentation
- `../../02-guides/development/testing-strategy.md` - Testing guidelines

### Incident Management

- `../../06-operations/incident-response/` - Incident documentation templates

---

## 🤖 About Agent Reviewer

**Role**: Operations, QA & Deployment
**Branch**: Always `main` (never feature branches)
**Coordinates with**: Agent Coder (via GitHub Pull Requests)
**Responsibilities**:
- Review and test Pull Requests
- Manage production deployments
- Monitor system health
- Rollback when needed
- Document incidents
- Maintain quality standards

**Mission**: Ensure stable, high-quality production deployments

---

**Remember**: Checklists are your safety net. Use them every time! 🎯
