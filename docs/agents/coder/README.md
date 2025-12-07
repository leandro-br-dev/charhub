# Agent Coder Documentation

**Role**: Feature Development & Bug Fixes
**Environment**: Ubuntu 24.04 LTS
**Branch**: `feature/*`
**Workspace**: `~/projects/charhub-coder/`

---

## 🎯 Overview

Agent Coder is responsible for **feature development, bug fixes, and code implementation** in the CharHub project. This agent works in `feature/*` branches and submits Pull Requests to `main` for review by Agent Reviewer.

---

## 📋 Core Responsibilities

### 1. Feature Development
- Implement new features assigned by Agent Reviewer
- Follow coding standards
- Write comprehensive tests
- Document code and features
- Create clean, maintainable code

### 2. Bug Fixes
- Fix bugs identified in production
- Write regression tests
- Document root cause
- Prevent similar issues

### 3. Code Quality
- Follow project coding standards
- Maintain high test coverage
- Write clear documentation
- Optimize performance
- Ensure security best practices

### 4. Collaboration
- Submit detailed Pull Requests
- Respond to review feedback
- Update code based on comments
- Communicate technical decisions

---

## 📂 Key Documents

### Essential Reading
- **[CLAUDE.md](./CLAUDE.md)** - Complete agent instructions ⭐ **START HERE**
- [Development Workflow](./development-workflow.md)
- [Coding Standards](./coding-standards.md)
- [Testing Requirements](./testing-requirements.md)

### Development Guides
- [Git Workflow](../../02-guides/development/git-github-actions.md)
- [Local Development Setup](../../01-getting-started/quick-start.md)
- [Architecture Overview](../../04-architecture/system-overview.md)

---

## 🔄 Development Workflow

### 1. Receive Assignment
- Check [Agent Assignments](../../05-business/planning/agent-assignments.md)
- Read feature specification
- Clarify requirements if needed

### 2. Create Feature Branch
```bash
git checkout main
git pull origin main
git checkout -b feature/feature-name
```

### 3. Implement Feature
- Write code following standards
- Add tests (unit + integration)
- Document new features
- Test locally

### 4. Submit Pull Request
- Push feature branch
- Create detailed PR
- Tag Agent Reviewer
- Wait for review

### 5. Address Feedback
- Make requested changes
- Push updates
- Re-request review

---

## 🚀 Quick Commands

### Development
```bash
# Start local environment
docker compose up -d --build

# Run backend tests
cd backend && npm test

# Run frontend tests
cd frontend && npm test

# Type checking
cd backend && npm run build
cd frontend && npm run build

# Linting
cd backend && npm run lint
```

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/new-feature

# Commit changes
git add .
git commit -m "feat(module): description"

# Push to remote
git push origin feature/new-feature

# Create PR
gh pr create --title "feat: Feature Title" --body "Description"
```

---

## 🔐 Permissions

### ✅ Allowed
- Create `feature/*` branches
- Commit to feature branches
- Create Pull Requests to `main`
- Run local development environment
- Execute tests
- Read all documentation

### ❌ Prohibited
- Push directly to `main`
- Merge Pull Requests
- Deploy to production
- Access production environment
- Modify CI/CD workflows
- Change GitHub secrets

---

## 📊 Success Metrics

Track agent effectiveness:

- **Features Delivered**: Per week
- **PR Merge Rate**: Target >90%
- **Test Coverage**: Target >80%
- **Review Cycles**: Target <3 per PR
- **Bug Introduction Rate**: Target <5%

---

## 📞 Support

- Questions: See [CLAUDE.md](./CLAUDE.md)
- Issues: [GitHub Issues](https://github.com/leandro-br-dev/charhub/issues)
- Architecture: [System Overview](../../04-architecture/system-overview.md)

---

## 🔄 Related Agents

- [Agent Reviewer](../reviewer/) - Code review & deployment
- [Multi-Agent System](../) - Overall architecture

---

## 📝 Note

This agent's detailed documentation (CLAUDE.md, coding standards, etc.) will be created when Agent Coder is activated. The folder structure is prepared for future use.
