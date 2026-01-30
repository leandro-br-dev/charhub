# Agent Reviewer Workflow - Complete Flow

**Last Updated**: 2026-01-30
**Version**: 2.3 - Auto-Deploy via GitHub Actions

---

## 🔄 Complete Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                  AGENT REVIEWER - COMPLETE WORKFLOW                 │
└─────────────────────────────────────────────────────────────────────┘

WORKFLOW 1: PULL REQUEST REVIEW
│
├─→ 1.1. PRE-FLIGHT VERIFICATION (CRITICAL!)
│   └─ Use pr-conflict-resolver
│      ├─ Detect outdated PR branches
│      ├─ Identify merge conflicts
│      ├─ Combine features from multiple agents
│      ├─ Prevent feature loss
│      ├─ **Checkout PR branch locally**
│      ├─ **Apply database migrations** (CRITICAL!)
│      └─ **Install new dependencies** if needed
│
├─→ 1.2. SCHEMA VERIFICATION (CRITICAL!)
│   └─ Use database-schema-management skill
│      ├─ Check if schema.prisma was modified in PR
│      ├─ If YES → Verify migration file exists
│      ├─ Verify migration SQL matches schema changes
│      ├─ Verify migration timestamp is 2026
│      ├─ **If schema changed but NO migration → BLOCK PR!**
│      └─ **NEVER execute SQL directly to "fix" issues!**
│
├─→ 1.3. CODE QUALITY REVIEW
│   └─ Use pr-code-reviewer
│      ├─ Code quality verification
│      ├─ Pattern compliance checking
│      ├─ i18n compliance verification
│      ├─ TypeScript type safety review
│      ├─ Test coverage assessment
│      └─ Security review
│
├─→ 1.4. LOCAL TESTING & QA (Automated)
│   └─ Use local-qa-tester
│      ├─ Automated test execution
│      ├─ API endpoint verification
│      └─ Regression testing
│
├─→ 1.5. USER ACCEPTANCE TESTING (UAT) - CRITICAL!
│   └─ **MANDATORY - Cannot be skipped!**
│      ├─ Switch to populated database mode
│      ├─ Present test checklist to user
│      ├─ **WAIT for user to perform manual testing**
│      ├─ **Receive explicit user confirmation**
│      └─ If user finds issues → Route back to Agent Coder
│
├─→ 1.6. USER CONFIRMATION FOR MERGE - CRITICAL!
│   └─ **MANDATORY - Cannot be skipped!**
│      ├─ Ask user: "Posso prosseguir com o merge?"
│      └─ **WAIT for explicit user approval**
│
└─→ 1.7. DECISION
    ├─ User approved + All checks passed → Merge PR
    ├─ Request changes
    └─ Block PR (critical issues)

WORKFLOW 2: DEPLOYMENT COORDINATION
│   ⚡ AUTO-DEPLOY: Merge/push to main triggers GitHub Actions CI/CD
│   Merging a PR to main IS deploying to production!
│
├─→ 2.1. ENVIRONMENT VALIDATION (BEFORE MERGE! - CRITICAL!)
│   └─ Use env-guardian
│      ├─ Environment variable validation
│      ├─ New env var detection
│      ├─ Environment synchronization
│      └─ Secret validation
│      └─ Must complete BEFORE merge (merge = deploy)
│
├─→ 2.2. PRE-DEPLOY VERIFICATION
│   └─ Verify all tests passing
│      ├─ No merge conflicts
│      ├─ Environment validated
│      └─ Feature spec complete
│
├─→ 2.3. MERGE PR (TRIGGERS AUTO-DEPLOY)
│   └─ gh pr merge → GitHub Actions pipeline starts automatically
│      ├─ Monitor: gh run watch / gh run list
│      └─ Pipeline builds, tests, and deploys to production
│
├─→ 2.4. POST-DEPLOY VERIFICATION
│   └─ Use production-monitor
│      ├─ GitHub Actions pipeline succeeded
│      ├─ Service health checks
│      ├─ Functional verification
│      └─ Check for new errors
│
└─→ 2.5. DOCUMENTATION
    └─ Move feature spec to implemented
       └─ Create deployment record

WORKFLOW 3: INCIDENT RESPONSE
│
├─→ 3.1. IMMEDIATE ASSESSMENT
│   └─ Use production-monitor
│      ├─ Identify incident scope
│      ├─ Determine severity (P1-P4)
│      ├─ Assess business impact
│      └─ Check recent deployments
│
├─→ 3.2. DECISION: ROLLBACK OR FIX?
│   ├─ P1/Critical → ROLLBACK IMMEDIATELY
│   ├─ Recent deployment → ROLLBACK
│   ├─ Fix >30 min → ROLLBACK
│   └─ Known quick fix → ATTEMPT FIX
│
├─→ 3.3A. ROLLBACK EXECUTION (if needed)
│   └─ Use production-monitor
│      ├─ Checkout previous stable commit
│      ├─ Restart services
│      └─ Verify restoration
│
├─→ 3.3B. FIX IMPLEMENTATION (if not rolling back)
│   └─ Create incident branch
│      ├─ Implement minimal fix
│      ├─ Test locally
│      └─ Deploy fix
│
├─→ 3.4. VERIFICATION
│   └─ Use production-monitor
│      ├─ Verify services healthy
│      ├─ Confirm errors stopped
│      └─ Test critical functionality
│
└─→ 3.5. DOCUMENTATION
    ├─ Root cause analysis
    ├─ Create incident report
    └─ Report to Agent Planner

WORKFLOW 4: PRODUCTION MONITORING
│
├─→ 4.1. HEALTH STATUS CHECK
│   └─ Use production-monitor
│      ├─ Container status
│      ├─ Health checks
│      ├─ API responsiveness
│      └─ Database connectivity
│
├─→ 4.2. LOG ANALYSIS
│   └─ Review error logs
│      ├─ Identify new errors
│      ├─ Track recurring errors
│      └─ Detect error patterns
│
├─→ 4.3. PERFORMANCE MONITORING
│   └─ Track metrics
│      ├─ API response times
│      ├─ Database query times
│      ├─ Resource usage
│      └─ Error rates
│
└─→ 4.4. CAPACITY PLANNING
    └─ Analyze trends
       ├─ Disk usage
       ├─ Memory usage
       └─ Database growth
```

---

## 📋 Workflow-by-Workflow Checklist

### ✅ Workflow 1: Pull Request Review

#### Checklist 1.1: Pre-Flight Verification
- [ ] Use pr-conflict-resolver FIRST (CRITICAL!)
- [ ] Check if branch is up-to-date with main
- [ ] Identify merge conflicts
- [ ] Check for feature loss risk
- [ ] Verify no unintentional deletions
- [ ] Combine features if multiple agents working
- [ ] Update branch if needed
- [ ] **Checkout PR branch locally**
- [ ] **Apply database migrations** (`cd backend && npx prisma migrate deploy`) (CRITICAL!)
- [ ] **Install new dependencies** if package.json changed (`npm install`)

#### Checklist 1.2: Schema Verification (CRITICAL!)
**Use skill**: `database-schema-management`

```bash
# 1. Check if schema.prisma was modified in PR
git diff origin/main...HEAD --name-only | grep schema.prisma

# 2. If YES → Check for corresponding migration
git diff origin/main...HEAD --name-only | grep "prisma/migrations"

# 3. Verify migration content matches schema changes
```

- [ ] Check if `schema.prisma` was modified in PR
- [ ] If YES → Verify migration file exists in PR
- [ ] Verify migration timestamp is 2026 (not 2025)
- [ ] Verify migration SQL matches schema changes
- [ ] `npx prisma migrate status` shows "up to date"
- [ ] **If schema changed but NO migration → BLOCK PR immediately!**

**FORBIDDEN ACTIONS** (NEVER do these!):
| Action | Why Forbidden |
|--------|---------------|
| Execute ALTER TABLE directly | Not reproducible in production |
| Execute CREATE INDEX directly | Not tracked in version control |
| "Fix" drift with manual SQL | Creates permanent inconsistencies |
| Approve PR without migration | Deployment will fail |

#### Checklist 1.3: Code Quality Review
- [ ] Backend TypeScript compiles (`npm run build`)
- [ ] Frontend TypeScript compiles
- [ ] Lint checks pass
- [ ] All interfaces exported (check queues/jobs/)
- [ ] Migration timestamps correct (2026, not 2025)
- [ ] Test mock patterns match implementation
- [ ] No `test.skip()` without follow-up issue
- [ ] i18n compliance verified
- [ ] Pattern compliance checked
- [ ] Security review passed

#### Checklist 1.4: Local Testing & QA (Automated)
- [ ] Backend tests pass
- [ ] Frontend tests pass
- [ ] API endpoint verification
- [ ] Database validation
- [ ] Regression testing
- [ ] Docker containers healthy

#### Checklist 1.5: User Acceptance Testing (UAT) - CRITICAL!
**MANDATORY - This step cannot be skipped!**
- [ ] Switch database to populated mode: `./scripts/database/db-switch.sh populated`
- [ ] **Present test checklist to user** with specific features to test
- [ ] **WAIT for user to perform manual testing**
- [ ] **Receive explicit user confirmation** that features work correctly
- [ ] If user finds issues → Request changes, route back to Agent Coder
- [ ] If user confirms → Proceed to next step

#### Checklist 1.6: User Confirmation for Merge - CRITICAL!
**MANDATORY - This step cannot be skipped!**
- [ ] All automated checks passed
- [ ] User confirmed UAT passed
- [ ] **Ask user: "Posso prosseguir com o merge da PR?"**
- [ ] **WAIT for explicit user approval**
- [ ] Only proceed after user says yes

#### Checklist 1.7: Decision
- [ ] User approved merge
- [ ] All checks passed
- [ ] → Merge PR
- [ ] OR changes requested with specific feedback
- [ ] OR blocked with critical issues documented

---

### ✅ Workflow 2: Deployment Coordination

> **AUTO-DEPLOY**: Every merge/push to `main` automatically triggers a GitHub Actions
> CI/CD pipeline that builds, tests, and deploys to production. **Merging a PR = Deploying.**

#### Checklist 2.1: Environment Validation (BEFORE Merge!)
- [ ] Use env-guardian FIRST (CRITICAL!)
- [ ] Check for new environment variables in the PR
- [ ] Validate all required variables exist in production
- [ ] Verify secrets are set
- [ ] Document any new variables
- [ ] Synchronize environment if needed
- [ ] **Complete this BEFORE merging** (merge triggers deploy!)

#### Checklist 2.2: Pre-Deploy Verification
- [ ] PR approved
- [ ] All tests passing
- [ ] No merge conflicts
- [ ] Feature spec complete
- [ ] Environment validated (Checklist 2.1 passed)

#### Checklist 2.3: Merge & Auto-Deploy
- [ ] Merge PR to main (`gh pr merge`) — this automatically triggers GitHub Actions
- [ ] Monitor GitHub Actions pipeline: `gh run watch` or `gh run list`
- [ ] Verify pipeline completes successfully

#### Checklist 2.4: Post-Deploy Verification
- [ ] GitHub Actions pipeline completed successfully
- [ ] All containers running in production
- [ ] Health checks passing
- [ ] API responding correctly
- [ ] No new errors in logs
- [ ] Critical features working
- [ ] Performance acceptable

#### Checklist 2.5: Documentation
- [ ] Feature spec moved to implemented/
- [ ] Deployment record created
- [ ] Deployment notes documented
- [ ] Any issues logged

---

### ✅ Workflow 3: Incident Response

#### Checklist 3.1: Immediate Assessment
- [ ] Incident detected
- [ ] Scope identified (users/features affected)
- [ ] Severity determined (P1-P4)
- [ ] Business impact assessed
- [ ] Recent deployments checked
- [ ] Error logs reviewed
- [ ] Root cause hypothesized

#### Checklist 3.2: Decision: Rollback or Fix?
- [ ] Severity assessment complete
- [ ] Rollback decision made
- [ ] OR fix decision made with estimated time

#### Checklist 3.3A: Rollback Execution
- [ ] Last known good commit identified
- [ ] Rollback executed
- [ ] Services restarted
- [ ] Functionality verified
- [ ] System restored

#### Checklist 3.3B: Fix Implementation
- [ ] Incident branch created
- [ ] Minimal fix implemented
- [ ] Fix tested locally
- [ ] Fix deployed
- [ ] Fix verified

#### Checklist 3.4: Verification
- [ ] Services running healthy
- [ ] Errors stopped
- [ ] Critical functionality working
- [ ] User reports decreased
- [ ] Extended monitoring started

#### Checklist 3.5: Documentation
- [ ] Root cause identified
- [ ] Incident report created
- [ ] Timeline documented
- [ ] Action items created
- [ ] Report to Agent Planner
- [ ] Prevention measures identified

---

### ✅ Workflow 4: Production Monitoring

#### Checklist 4.1: Health Status Check
- [ ] Container status checked
- [ ] Health checks verified
- [ ] API responding
- [ ] Database connectivity OK
- [ ] No critical errors

#### Checklist 4.2: Log Analysis
- [ ] Error logs reviewed
- [ ] New errors identified
- [ ] Recurring errors tracked
- [ ] Error patterns analyzed
- [ ] Error frequency documented

#### Checklist 4.3: Performance Monitoring
- [ ] API response times tracked
- [ ] Database query times monitored
- [ ] Resource usage checked
- [ ] Error rates calculated
- [ ] Performance compared to baseline

#### Checklist 4.4: Capacity Planning
- [ ] Disk usage reviewed
- [ ] Memory usage analyzed
- [ ] Database growth tracked
- [ ] Capacity trends identified
- [ ] Recommendations made

---

## 🎯 Production Lessons Learned

### FEATURE-011: Character Generation Correction System (Jan 2026)

#### Critical Errors That Made It Through Review

**1. TypeScript Compilation Failure (502 Error)**
- Error: Interfaces created but not exported
- Impact: Backend wouldn't compile
- Prevention: Add `npm run build` verification before PR approval

**2. Duplicate Migration with Wrong Timestamp**
- Error: Migration with year 2025 instead of 2026
- Impact: CI failed with database conflict
- Prevention: Verify migration year is 2026

**3. 26 Tests Failing - Mock Pattern Mismatch**
- Error: Callback-based mocks vs array-based implementation
- Impact: 26 tests failed
- Prevention: Review test patterns match implementation

**4. Test Expectations Mismatch**
- Error: Tests expected `expect.anything()` vs actual values
- Impact: Additional test failures
- Prevention: Test expectations must match implementation

### Prevention Checklist for Future Reviews

Before approving ANY PR:

```bash
# 1. Check TypeScript compiles (CRITICAL!)
cd backend && npm run build

# 2. Check for forgotten exports
grep -r "^interface " backend/src/queues/jobs/ | grep -v "^export interface"

# 3. Check migration timestamps
ls backend/prisma/migrations/ | grep "^2025"

# 4. Verify Prisma transaction mocks
grep -r "\$transaction.*mockImplementation" backend/src

# 5. Run tests locally
cd backend && npm test
```

---

## 📊 Severity Classification

| Severity | Description | Response Time | Rollback? |
|----------|-------------|---------------|-----------|
| **P1 - Critical** | Complete outage, data loss, security breach | 5 minutes | YES - Immediately |
| **P2 - High** | Major feature broken, significant degradation | 15 minutes | YES - Likely |
| **P3 - Medium** | Minor feature broken, partial degradation | 1 hour | Case by case |
| **P4 - Low** | Edge case bug, minimal impact | 4 hours | NO |

---

## 🚨 Critical Reminders

### Before PR Review
**ALWAYS use pr-conflict-resolver FIRST**
- Prevents feature loss
- Detects outdated branches
- Resolves merge conflicts

### After Checking Out PR Branch
**ALWAYS apply database migrations**
```bash
cd backend && npx prisma migrate deploy
cd backend && npm install  # if new dependencies
```
- PR may include new migrations
- Schema must match code being tested
- Missing migrations = potential test failures

### Schema Verification (CRITICAL!)
**ALWAYS verify schema changes have migrations**
```bash
# 1. Check if schema.prisma was modified
git diff origin/main...HEAD --name-only | grep schema.prisma

# 2. If YES → Check for corresponding migration
git diff origin/main...HEAD --name-only | grep "prisma/migrations"

# 3. If schema changed but NO migration → BLOCK PR!
```
- Schema changed? → Migration MUST exist
- **NEVER** execute SQL directly to "fix" missing columns!
- **NEVER** approve PR with schema changes but no migration!
- Request Agent Coder to create proper migration

**FORBIDDEN ACTIONS**:
- ALTER TABLE directly
- CREATE INDEX directly
- "Fix" drift with manual SQL
- Approve PR without migration

### Before Merge
**ALWAYS request User Acceptance Testing (UAT)**
- Present test checklist to user
- WAIT for user to perform manual testing
- WAIT for explicit user confirmation
- **NEVER merge without user approval**

### Before Deployment
**ALWAYS use env-guardian FIRST**
- Validates environment variables
- Prevents deployment failures
- Ensures configuration exists

**ALWAYS request user confirmation**
- Ask: "Posso prosseguir com o deploy para produção?"
- WAIT for explicit user approval
- **NEVER deploy without user approval**

### During Incident
**Stability > Speed**
- Rollback first, analyze later
- A broken deployment takes hours to fix
- A careful deployment takes 30 minutes

---

**Remember**: Quality Takes Time - Rejection is Faster Than Rollback

For detailed procedures, see [skills/](skills/) and [sub-agents/](sub-agents/).
