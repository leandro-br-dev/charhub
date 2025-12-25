# Quality Audit Checklist

**When to use**: Monthly or quarterly review of product quality

**Duration**: 2-4 hours

**Output**: Quality report with improvement plan

---

## 📋 Preparation

### Define Audit Scope

- [ ] **Select audit period**
  - Last month's deployed features?
  - Specific product area?
  - Entire product?

- [ ] **List features to audit**
  ```bash
  ls docs/05-business/planning/features/implemented/
  ```

- [ ] **Review recent deployments**
  - Check `docs/06-operations/incident-response/` for issues
  - Review production logs for errors
  - Check user feedback

---

## 🔍 Code Quality Audit

### Test Coverage

- [ ] **Check backend test coverage**
  ```bash
  cd backend
  npm test -- --coverage
  ```
  - Target: >80% coverage
  - Identify files with low coverage
  - Check critical paths are tested

- [ ] **Check frontend test coverage**
  ```bash
  cd frontend
  npm test -- --coverage
  ```
  - Target: >70% coverage
  - Identify components without tests
  - Check user flows are tested

- [ ] **Evaluate test quality**
  - Are tests meaningful?
  - Do they test behavior, not implementation?
  - Are edge cases covered?
  - Are error scenarios tested?

### Code Standards

- [ ] **Run linting**
  ```bash
  cd backend && npm run lint
  cd frontend && npm run lint
  ```
  - Any linting errors?
  - Are standards consistently applied?

- [ ] **Check TypeScript usage**
  - Any `any` types that should be specific?
  - Are interfaces properly defined?
  - Are types exported for reuse?

- [ ] **Review code patterns**
  - Consistent error handling?
  - Proper logging in place?
  - Security best practices followed?

---

## 📚 Documentation Audit

### Code Documentation

- [ ] **Check API documentation**
  - Are all endpoints documented?
  - Are request/response schemas clear?
  - Are error codes documented?
  - Location: `docs/03-reference/backend/`

- [ ] **Check component documentation**
  - Are complex components documented?
  - Are props/interfaces documented?
  - Are usage examples provided?
  - Location: `docs/03-reference/frontend/`

### User Documentation

- [ ] **Review user guides**
  - Does each feature have a user guide?
  - Are guides up-to-date?
  - Are screenshots current?
  - Location: `docs/02-guides/`

- [ ] **Check feature completeness**
  - Every implemented feature documented?
  - Clear usage instructions?
  - Common questions answered?

### Technical Documentation

- [ ] **Architecture documentation**
  - Is system-overview.md current?
  - Are ADRs up-to-date?
  - Are new patterns documented?
  - Location: `docs/04-architecture/`

- [ ] **Deployment documentation**
  - Are deployment guides accurate?
  - Are environment variables documented?
  - Are troubleshooting guides helpful?
  - Location: `docs/02-guides/deployment/`

---

## 🎯 Feature Quality Audit

For each recently deployed feature:

### Functionality

- [ ] **Test feature in production**
  - Does it work as specified?
  - Are edge cases handled?
  - Any bugs or issues?

- [ ] **Check error handling**
  - What happens when things go wrong?
  - Are errors user-friendly?
  - Are errors logged properly?

- [ ] **Validate data integrity**
  - Is data validated on input?
  - Is data stored correctly?
  - Are database constraints in place?

### User Experience

- [ ] **UI/UX quality**
  - Is UI intuitive?
  - Is design consistent?
  - Are loading states clear?
  - Are error states helpful?

- [ ] **Accessibility**
  - Keyboard navigation works?
  - Screen reader compatible?
  - Color contrast sufficient?
  - i18n keys all translated?

- [ ] **Performance**
  - Load time acceptable?
  - No unnecessary re-renders?
  - API responses fast enough?

### Security

- [ ] **Authentication/Authorization**
  - Properly protected endpoints?
  - User permissions enforced?
  - No unauthorized access possible?

- [ ] **Data validation**
  - Input sanitized?
  - SQL injection prevented?
  - XSS vulnerabilities checked?

- [ ] **Sensitive data handling**
  - Passwords hashed?
  - Sensitive data not logged?
  - API keys secure?

---

## 📊 Create Quality Report

### Summary Metrics

- [ ] **Calculate metrics**
  ```markdown
  ## Quality Metrics Report
  **Period**: [Date range]
  **Features Audited**: [Number]

  ### Test Coverage
  - Backend: [X]% (Target: >80%)
  - Frontend: [X]% (Target: >70%)

  ### Documentation Coverage
  - API docs: [X]% endpoints documented
  - User guides: [X]% features have guides
  - Technical docs: [X]% ADRs for major decisions

  ### Code Quality
  - Linting errors: [X]
  - TypeScript `any` usage: [X] instances
  - Security issues: [X]

  ### Production Health
  - Incidents this period: [X]
  - Average resolution time: [X] hours
  - User-reported bugs: [X]
  ```

### Findings

- [ ] **List quality issues**
  For each issue:
  ```markdown
  ### Issue: [Title]
  - **Severity**: High/Medium/Low
  - **Area**: Backend/Frontend/Docs/Infrastructure
  - **Description**: [What's wrong?]
  - **Impact**: [What's the effect?]
  - **Recommendation**: [How to fix?]
  - **Effort**: [Time estimate]
  ```

### Prioritize Issues

- [ ] **Categorize by severity**
  - **High**: Security issues, data integrity, user-blocking bugs
  - **Medium**: Missing tests, incomplete docs, minor bugs
  - **Low**: Code style, refactoring opportunities, nice-to-haves

- [ ] **Estimate effort**
  - Quick fixes: <1 day
  - Medium tasks: 1-3 days
  - Large improvements: 1-2 weeks

---

## 📋 Create Improvement Plan

### Quick Wins (Complete This Month)

- [ ] **List high-impact, low-effort fixes**
  ```markdown
  ## Quick Wins
  1. Add tests for `UserService.createUser()` (2 hours)
  2. Document `/api/v1/characters` endpoint (1 hour)
  3. Fix accessibility issue in login form (3 hours)
  ```

### Medium-Term Improvements (Next Quarter)

- [ ] **List important but larger tasks**
  ```markdown
  ## Medium-Term
  1. Increase backend test coverage to 85% (1 week)
  2. Create user guides for all recent features (3 days)
  3. Refactor authentication middleware (1 week)
  ```

### Long-Term Initiatives (6-12 months)

- [ ] **List strategic improvements**
  ```markdown
  ## Long-Term
  1. Implement E2E testing framework (3 weeks)
  2. Performance optimization initiative (ongoing)
  3. Security audit and hardening (2 weeks)
  ```

---

## 📝 Document & Track

### Update Quality Dashboard

- [ ] **Update quality dashboard**
  - File: `docs/06-operations/quality-dashboard.md`
  - Add latest metrics
  - Track trends over time
  - Note improvements

### Create Action Items

- [ ] **Convert issues to tasks**
  - Create feature specs for larger improvements
  - Add quick fixes to backlog
  - Assign to Agent Coder when appropriate

- [ ] **Balance with new features**
  - Don't let quality work block all new features
  - Aim for ~20% capacity on quality improvements
  - Mix quick wins with feature development

---

## 📢 Communication

### Share Report

- [ ] **Share with stakeholders**
  - User: Overall quality status
  - Agent Coder: Specific tasks to address
  - Agent Reviewer: Production health insights

### Celebrate Wins

- [ ] **Highlight improvements**
  - What got better since last audit?
  - What good practices are being followed?
  - What team should keep doing?

---

## 🚨 Common Pitfalls

### Perfectionism
❌ "Everything must be 100% perfect before we can ship anything"
✅ "Good enough for now, track improvements for later"

### Ignoring Quality
❌ "We're too busy with features to write tests"
✅ "Quality is part of development, not separate"

### Vague Issues
❌ "Code could be better"
✅ "UserService has 40% test coverage, should be >80%"

### No Follow-Through
❌ Creating audit report but never acting on it
✅ Converting findings to tracked tasks with owners

---

## 📊 Quality Metrics Guidelines

### Test Coverage Targets

- **Backend**: >80% (critical paths: 100%)
- **Frontend**: >70% (key user flows: 90%)
- **E2E**: Major user journeys covered

### Documentation Targets

- **API docs**: 100% of public endpoints
- **User guides**: 100% of user-facing features
- **Technical docs**: Major decisions documented (ADRs)

### Code Quality Targets

- **Linting**: 0 errors (warnings OK if justified)
- **TypeScript**: Minimize `any` usage (<5% of type declarations)
- **Security**: 0 high-severity vulnerabilities

### Production Health Targets

- **Uptime**: >99.9%
- **Error rate**: <0.1% of requests
- **Incident response**: <1 hour to mitigation

---

## 📚 See Also

- **[feature-planning.md](feature-planning.md)** - Include quality requirements in specs
- **[feature-prioritization.md](feature-prioritization.md)** - Balance features with quality work
- **[../CLAUDE.md](../CLAUDE.md)** - Overall Agent Planner workflow
- **[../../06-operations/quality-dashboard.md](../../../06-operations/quality-dashboard.md)** - Quality metrics tracking

---

**Remember**: Quality is not a phase, it's a continuous practice! ✨

"It's easier to maintain quality than to fix it later."
