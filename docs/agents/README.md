# Multi-Agent System Documentation

**Last Updated**: 2025-12-05
**System**: CharHub Multi-Agent Architecture

---

## 🤖 Agent Architecture Overview

CharHub uses a **multi-agent system** where specialized AI agents handle different aspects of the development lifecycle:

```
┌─────────────────────────────────────────────────────────┐
│                     GitHub Repository                    │
│                  github.com/leandro-br-dev/charhub      │
└──────────────┬──────────────────────┬───────────────────┘
               │                      │
               │                      │
    ┌──────────▼──────────┐  ┌───────▼──────────┐
    │   Agent Coder       │  │  Agent Reviewer   │
    │  (Ubuntu 24.04)     │  │  (Ubuntu 22.04)   │
    │                     │  │                   │
    │  Branch: feature/*  │  │  Branch: main     │
    │  Role: Development  │  │  Role: Operations │
    └──────────┬──────────┘  └───────┬───────────┘
               │                      │
               │   Pull Request       │
               └──────────►───────────┘
                         Merge & Deploy
```

---

## 👥 Available Agents

### 🔨 [Agent Coder](./coder/)
**Primary Role**: Feature Development

**Responsibilities**:
- Implement new features
- Fix bugs
- Write tests
- Create documentation for features
- Work in `feature/*` branches
- Submit Pull Requests to `main`

**Environment**:
- OS: Ubuntu 24.04 LTS
- Workspace: `~/projects/charhub-coder/`
- Branch: `feature/*`

**Key Documents**:
- [CLAUDE.md](./coder/CLAUDE.md) - Agent instructions
- [Development Workflow](./coder/development-workflow.md)
- [Coding Standards](./coder/coding-standards.md)

---

### ✅ [Agent Reviewer](./reviewer/)
**Primary Role**: Operations & Quality Assurance

**Responsibilities**:
- Review Pull Requests
- Test features
- Merge to `main`
- Deploy to production
- Monitor production health
- Collect metrics
- Business intelligence
- Prioritize features

**Environment**:
- OS: Ubuntu 22.04 LTS
- Workspace: `~/projects/charhub-reviewer/`
- Branch: `main`

**Key Documents**:
- [CLAUDE.md](./reviewer/CLAUDE.md) - Agent instructions
- [Weekly Workflow](./reviewer/weekly-workflow.md)
- [Deployment Guide](../02-guides/deployment/)

---

## 🔄 Agent Workflow

### Standard Development Cycle

```
1. User Request
   │
   ├─► Agent Reviewer (Planning)
   │   └─► Analyzes request
   │       Creates task in /docs/05-business/planning/
   │       Assigns to Agent Coder
   │
   ├─► Agent Coder (Development)
   │   └─► Creates feature branch
   │       Implements feature
   │       Writes tests
   │       Creates Pull Request
   │
   ├─► Agent Reviewer (Review)
   │   └─► Reviews code
   │       Tests locally
   │       Merges to main
   │       Deploys to production
   │
   └─► Agent Reviewer (Monitoring)
       └─► Monitors production
           Collects metrics
           Reports status
```

### Communication Protocol

**Task Assignment**:
- Agent Reviewer creates task document in `/docs/05-business/planning/agent-assignments.md`
- Agent Coder reads assignment and creates feature branch
- Both agents update status as work progresses

**Pull Request Flow**:
1. Agent Coder creates PR with detailed description
2. Agent Coder tags Agent Reviewer
3. Agent Reviewer tests on local environment
4. Agent Reviewer merges if tests pass
5. GitHub Actions deploys automatically

**Incident Response**:
1. Agent Reviewer detects issue in production
2. Agent Reviewer creates incident document
3. If code change needed: assigns to Agent Coder
4. If operational issue: Agent Reviewer handles
5. Both agents update postmortem

---

## 📋 Agent-Specific Files

Each agent has its own dedicated folder with specific documentation:

### `/docs/agents/reviewer/`
```
reviewer/
├── CLAUDE.md                      # Agent instructions (CRITICAL)
├── README.md                      # Agent overview
├── weekly-workflow.md             # Weekly responsibilities
├── deployment-checklist.md        # Pre-deploy checklist
├── metrics-collection-guide.md    # How to collect metrics
└── emergency-procedures.md        # Incident response
```

### `/docs/agents/coder/`
```
coder/
├── CLAUDE.md                      # Agent instructions (CRITICAL)
├── README.md                      # Agent overview
├── development-workflow.md        # Feature development process
├── coding-standards.md            # Code style guide
├── testing-requirements.md        # Test coverage requirements
└── pr-template.md                 # Pull Request template
```

---

## 🔐 Agent Permissions

### Agent Coder Permissions

✅ **Allowed**:
- Create `feature/*` branches
- Commit to `feature/*` branches
- Create Pull Requests to `main`
- Read all documentation
- Run local development environment
- Execute tests

❌ **Prohibited**:
- Push directly to `main`
- Merge Pull Requests
- Deploy to production
- Access production environment
- Modify CI/CD workflows
- Change GitHub Actions secrets

### Agent Reviewer Permissions

✅ **Allowed**:
- All Agent Coder permissions, plus:
- Merge Pull Requests to `main`
- Push to `main` (with authorization)
- Trigger GitHub Actions manually
- Access production monitoring
- Collect production metrics
- Execute rollbacks
- Modify documentation structure

❌ **Prohibited**:
- Push to `main` without user authorization (except critical hotfixes)
- Modify production files directly via SSH
- Force-push to any branch
- Delete production data without backup

---

## 🚨 Critical Rules for All Agents

### 1. Branch Management
- **Agent Coder**: ALWAYS work in `feature/*` branches
- **Agent Reviewer**: ALWAYS work in `main` branch
- **Both**: NEVER force-push to any branch

### 2. Documentation
- Technical documentation: Write in English
- Agent communication: Portuguese (pt-BR) for Agent Reviewer
- Always update "Last Updated" date
- Follow Diátaxis framework structure

### 3. Git Commits
- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`
- Write commit messages in English
- Include co-author: `Co-Authored-By: Claude <noreply@anthropic.com>`

### 4. Deployment
- **Only Agent Reviewer** deploys to production
- Deployment via GitHub Actions (not manual SSH)
- Monitor production after every deploy
- Document all deployments

### 5. Communication
- Update `/docs/05-business/planning/agent-assignments.md` regularly
- Use Pull Request descriptions for detailed context
- Document incidents in `/docs/06-operations/incident-response/`

---

## 📖 Learning Resources

**For Agent Coder**:
1. [Development Workflow](./coder/development-workflow.md)
2. [Coding Standards](./coder/coding-standards.md)
3. [Testing Requirements](./coder/testing-requirements.md)

**For Agent Reviewer**:
1. [Weekly Workflow](./reviewer/weekly-workflow.md)
2. [Deployment Guide](../02-guides/deployment/)
3. [Metrics Collection](./reviewer/metrics-collection-guide.md)

**For Both**:
1. [Architecture Overview](../04-architecture/system-overview.md)
2. [Git Workflow](../02-guides/development/git-github-actions.md)
3. [Contributing Guidelines](../07-contributing/)

---

## 🔄 Switching Between Agents

When switching active agent, update the `CLAUDE.md` file in project root:

```bash
# Activating Agent Reviewer
cp docs/agents/reviewer/CLAUDE.md ./CLAUDE.md

# Activating Agent Coder
cp docs/agents/coder/CLAUDE.md ./CLAUDE.md
```

**Note**: The root `CLAUDE.md` is in `.gitignore` and is NOT version controlled.

---

## 📊 Agent Performance Metrics

Track agent effectiveness:

**Agent Coder**:
- Features delivered per week
- PR merge rate
- Test coverage percentage
- Code review feedback cycles

**Agent Reviewer**:
- Deployment success rate (~95% target)
- Mean time to deploy (4-5 minutes target)
- Production incidents per week
- Rollback frequency

---

## 🤝 Contributing to Agent System

Improvements to the agent system are welcome:

1. Propose changes in GitHub Discussions
2. Update relevant agent documentation
3. Test with both agents
4. Submit PR with clear rationale

---

## 📞 Support

- Agent-specific questions: See individual agent folders
- System-wide questions: [GitHub Discussions](https://github.com/leandro-br-dev/charhub/discussions)
- Bugs: [GitHub Issues](https://github.com/leandro-br-dev/charhub/issues)
