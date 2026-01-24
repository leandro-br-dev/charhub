# Agent Reviewer Workflow - Complete Flow

**Last Updated**: 2025-01-24
**Version**: 2.0

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
│      └─ Prevent feature loss
│
├─→ 1.2. CODE QUALITY REVIEW
│   └─ Use pr-code-reviewer
│      ├─ Code quality verification
│      ├─ Pattern compliance checking
│      ├─ i18n compliance verification
│      ├─ TypeScript type safety review
│      ├─ Test coverage assessment
│      └─ Security review
│
├─→ 1.3. LOCAL TESTING & QA
│   └─ Use local-qa-tester
│      ├─ Automated test execution
│      ├─ Manual feature testing
│      ├─ API endpoint verification
│      └─ Regression testing
│
└─→ 1.4. DECISION
    ├─ Approve PR
    ├─ Request changes
    └─ Block PR (critical issues)

WORKFLOW 2: DEPLOYMENT COORDINATION
│
├─→ 2.1. ENVIRONMENT VALIDATION (CRITICAL!)
│   └─ Use env-guardian
│      ├─ Environment variable validation
│      ├─ New env var detection
│      ├─ Environment synchronization
│      └─ Secret validation
│
├─→ 2.2. PRE-DEPLOY VERIFICATION
│   └─ Use deploy-coordinator
│      ├─ Verify all tests passing
│      ├─ Check Docker images built
│      ├─ Verify no merge conflicts
│      └─ Document rollback plan
│
├─→ 2.3. DEPLOYMENT EXECUTION
│   └─ Use deploy-coordinator
│      ├─ Merge PR to main
│      ├─ Pull to production
│      ├─ Build and restart services
│      └─ Monitor startup logs
│
├─→ 2.4. POST-DEPLOY VERIFICATION
│   └─ Use deploy-coordinator + production-monitor
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

#### Checklist 1.2: Code Quality Review
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

#### Checklist 1.3: Local Testing & QA
- [ ] Backend tests pass
- [ ] Frontend tests pass
- [ ] Manual feature testing
- [ ] API endpoint verification
- [ ] Database validation
- [ ] Regression testing
- [ ] Docker containers healthy

#### Checklist 1.4: Decision
- [ ] All checks passed
- [ ] Approval/comment provided
- [ ] OR changes requested with specific feedback
- [ ] OR blocked with critical issues documented

---

### ✅ Workflow 2: Deployment Coordination

#### Checklist 2.1: Environment Validation
- [ ] Use env-guardian FIRST (CRITICAL!)
- [ ] Check for new environment variables
- [ ] Validate all required variables exist
- [ ] Verify secrets are set
- [ ] Document any new variables
- [ ] Synchronize environment if needed

#### Checklist 2.2: Pre-Deploy Verification
- [ ] PR approved
- [ ] All tests passing
- [ ] Docker images build successfully
- [ ] No merge conflicts
- [ ] Feature spec complete
- [ ] Rollback plan documented
- [ ] Stakeholders notified

#### Checklist 2.3: Deployment Execution
- [ ] Merge PR to main
- [ ] Pull to production server
- [ ] Build Docker images
- [ ] Restart services
- [ ] Monitor startup logs actively
- [ ] All services started successfully

#### Checklist 2.4: Post-Deploy Verification
- [ ] All containers running
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

### Before Deployment
**ALWAYS use env-guardian FIRST**
- Validates environment variables
- Prevents deployment failures
- Ensures configuration exists

### During Incident
**Stability > Speed**
- Rollback first, analyze later
- A broken deployment takes hours to fix
- A careful deployment takes 30 minutes

---

**Remember**: Quality Takes Time - Rejection is Faster Than Rollback

For detailed procedures, see [skills/](skills/) and [sub-agents/](sub-agents/).
