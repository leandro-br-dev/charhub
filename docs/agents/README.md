# Multi-Agent System Documentation

**Last Updated**: 2025-12-25
**System**: CharHub Multi-Agent Architecture
**Environment**: Single Ubuntu 24.04 LTS with 4 Workspaces

---

## 🤖 Agent Architecture Overview

CharHub uses a **4-agent system** where specialized AI agents handle different aspects of the product lifecycle:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GitHub Repository                             │
│                   github.com/leandro-br-dev/charhub                 │
└──────────┬──────────────┬──────────────┬──────────────┬─────────────┘
           │              │              │              │
    ┌──────▼──────┐  ┌───▼────┐  ┌──────▼──────┐  ┌───▼──────┐
    │  Planner    │  │Reviewer│  │   Coder     │  │ Designer │
    │   (Plan)    │  │ (Ops)  │  │   (Dev)     │  │  (UI/UX) │
    │             │  │        │  │             │  │          │
    │ Branch:main │  │  main  │  │ feature/*   │  │feature/* │
    │ Port: xxx0  │  │  xxx1  │  │ Port: xxx2  │  │Port: xxx3│
    └─────────────┘  └────────┘  └─────────────┘  └──────────┘
         │                │              │              │
         └────────────────┴──────────────┴──────────────┘
                   Coordinate via GitHub
```

---

## 🖥️ Development Environment

### Single Ubuntu Setup

All agents share **one Ubuntu 24.04 LTS** environment with **4 separate workspaces**:

```bash
~/projects/
├── charhub-planner/      # Agent Planner workspace (Port: xxx0)
├── charhub-reviewer/     # Agent Reviewer workspace (Port: xxx1)
├── charhub-coder/        # Agent Coder workspace (Port: xxx2)
└── charhub-designer/     # Agent Designer workspace (Port: xxx3)
```

Each workspace has its own:
- Git clone of the repository
- Docker Compose environment
- `docker-compose.override.yml` with unique ports
- Independent development/test environment

### Port Allocation Schema

Each agent uses ports ending in their agent number:

| Service    | Planner (0) | Reviewer (1) | Coder (2) | Designer (3) |
|------------|-------------|--------------|-----------|--------------|
| Frontend   | **8080**    | **8081**     | **8082**  | **8083**     |
| Backend    | **3000**    | **3001**     | **3002**  | **3003**     |
| PostgreSQL | **5430**    | **5431**     | **5432**  | **5433**     |
| Redis      | **6370**    | **6371**     | **6372**  | **6373**     |

**Example `docker-compose.override.yml` for Agent Coder (Port: xxx2)**:
```yaml
version: '3.8'
services:
  frontend:
    ports:
      - "8082:80"
  backend:
    ports:
      - "3002:3000"
  postgres:
    ports:
      - "5432:5432"
  redis:
    ports:
      - "6372:6379"
```

---

## 👥 The 4 Agents

### 📋 [Agent Planner](./planner/)
**Primary Role**: Strategic Planning & Architecture

**Responsibilities**:
- 📝 Plan features (create detailed specs)
- 🎯 Prioritize backlog (Business Value × Technical Complexity)
- 🏗️ Review architecture (create ADRs for complex features)
- ✨ Audit quality (tests, docs, code quality)
- 🗺️ Plan roadmap (quarterly + long-term vision)
- 📊 Analyze user behavior and business metrics

**Environment**:
- Workspace: `~/projects/charhub-planner/`
- Branch: `main` (analysis) or `feature/planning-*` (docs)
- Ports: **8080** (frontend), **3000** (backend), **5430** (postgres), **6370** (redis)

**Key Documents**:
- [CLAUDE.md](./planner/CLAUDE.md) - Agent instructions
- [INDEX.md](./planner/INDEX.md) - Checklists navigation
- [Checklists](./planner/checklists/) - Step-by-step procedures

**Mantra**: *"Business Value × Technical Feasibility = Priority"*

---

### 🚀 [Agent Reviewer](./reviewer/)
**Primary Role**: Deployment & Production Operations

**Responsibilities**:
- ✅ Review Pull Requests (code quality, security, tests)
- 🧪 Test features locally before deployment
- 🔐 Validate + sync environment variables
- 🚀 Deploy to production
- 👀 Monitor deployments actively
- 💚 Verify production health
- ⚡ Execute rollbacks when needed
- 📝 Document incidents
- 📊 Report quality issues to Agent Planner

**Environment**:
- Workspace: `~/projects/charhub-reviewer/`
- Branch: **ALWAYS `main`** (NEVER `feature/*`)
- Ports: **8081** (frontend), **3001** (backend), **5431** (postgres), **6371** (redis)

**Key Documents**:
- [CLAUDE.md](./reviewer/CLAUDE.md) - Agent instructions
- [INDEX.md](./reviewer/INDEX.md) - Checklists navigation
- [Checklists](./reviewer/checklists/) - Deployment procedures

**Mantra**: *"Stability > Speed"*

---

### 💻 [Agent Coder](./coder/)
**Primary Role**: Feature Development & Implementation

**Responsibilities**:
- 💻 Implement features from specs
- 🔧 Backend development (API, database, services)
- 🎨 Frontend development (UI, components, **i18n mandatory**)
- 🧪 Write tests (unit, integration)
- 📝 Create well-documented PRs
- 🔄 Address review feedback
- 🎯 Implement complex UI changes (from Designer issues)

**Environment**:
- Workspace: `~/projects/charhub-coder/`
- Branch: **ALWAYS `feature/*`** (NEVER `main`)
- Ports: **8082** (frontend), **3002** (backend), **5432** (postgres), **6372** (redis)

**Key Documents**:
- [CLAUDE.md](./coder/CLAUDE.md) - Agent instructions
- [INDEX.md](./coder/INDEX.md) - Checklists navigation
- [Checklists](./coder/checklists/) - Implementation procedures

**Mantra**: *"Quality > Speed"*

---

### 🎨 [Agent Designer](./designer/)
**Primary Role**: UI/UX Design & Visual Quality Assurance

**Responsibilities**:
- 🔍 Weekly UI/UX reviews (navigation, design consistency)
- 👀 Visual testing (browser testing on desktop/mobile)
- 💡 Design proposals (with user approval)
- ✨ Implement small UI improvements (<50 lines)
- 📋 Create GitHub Issues for complex changes (for Agent Coder)
- ♿ Accessibility audits (keyboard, screen reader, contrast)
- 📊 Analyze user behavior (read Planner reports)
- 🎨 Ensure design consistency (colors, fonts, spacing)

**Unique Capability**: Can CODE small UI improvements directly!

**Environment**:
- Workspace: `~/projects/charhub-designer/`
- Branch: `feature/design-*` (small fixes) or GitHub Issues (large changes)
- Ports: **8083** (frontend), **3003** (backend), **5433** (postgres), **6373** (redis)

**Key Documents**:
- [CLAUDE.md](./designer/CLAUDE.md) - Agent instructions
- [INDEX.md](./designer/INDEX.md) - Checklists navigation
- [Checklists](./designer/checklists/) - UI/UX procedures

**Mantra**: *"Beauty AND Functionality"*

---

## 🔄 Complete Workflow

### From Idea to Production

```
1. USER REQUEST
   │
   ▼
2. AGENT PLANNER
   ├─ Creates feature spec
   ├─ Prioritizes in backlog
   ├─ Reviews architecture (if complex)
   └─ Assigns to Agent Coder
   │
   ▼
3. AGENT CODER
   ├─ Implements feature (backend + frontend)
   ├─ Writes tests
   ├─ Creates Pull Request
   └─ Addresses review feedback
   │
   ▼
4. AGENT REVIEWER
   ├─ Reviews code quality
   ├─ Tests locally (Port 8081)
   ├─ Validates environment
   ├─ Deploys to production
   ├─ Monitors deployment
   └─ Verifies production health
   │
   ▼
5. AGENT DESIGNER
   ├─ Tests visually (Port 8083)
   ├─ Checks UI/UX quality
   ├─ Verifies accessibility
   ├─ Proposes improvements (small: fixes / large: issues)
   └─ Implements small UI fixes
   │
   ▼
6. AGENT PLANNER
   ├─ Moves spec to implemented/
   ├─ Updates quality dashboard
   ├─ Collects user feedback
   └─ Plans next iteration
```

---

## 🤝 Agent Coordination

### Communication Channels

| Communication | Method | Example |
|---------------|--------|---------|
| Planner → Coder | Feature specs in `features/active/` | Assigns implementation tasks |
| Coder → Reviewer | Pull Requests on GitHub | Submits code for review |
| Reviewer → Planner | Quality dashboard, incident reports | Reports production issues |
| Designer → Coder | GitHub Issues | Requests complex UI changes |
| Designer → Planner | Quality dashboard | Reports UX insights |
| Planner → Designer | User behavior reports | Shares usage data |

### Shared Documentation

All agents read/write to:
- `docs/05-business/planning/` - Feature specs and assignments
- `docs/04-architecture/` - System architecture and ADRs
- `docs/06-operations/` - Incident reports and quality metrics
- `docs/03-reference/` - Technical documentation

---

## 🚨 Critical Rules for All Agents

### 1. Branch Management

| Agent | Allowed Branches | Never Touch |
|-------|------------------|-------------|
| Planner | `main`, `feature/planning-*` | Other `feature/*` |
| Reviewer | `main` **ONLY** | Any `feature/*` |
| Coder | `feature/*` **ONLY** | `main` |
| Designer | `feature/design-*` | `main`, other `feature/*` |

### 2. Port Usage

- **Always use your designated ports** (see table above)
- Configure `docker-compose.override.yml` in your workspace
- Never use another agent's ports
- This prevents conflicts when multiple agents test simultaneously

### 3. Deployment

- **ONLY Agent Reviewer deploys to production**
- All other agents submit PRs for review
- No direct SSH to production (except emergency hotfix by Reviewer)
- Monitor GitHub Actions after every deployment

### 4. Documentation

- Technical docs: English
- User communication: Portuguese (if Brazilian user)
- Always update "Last Updated" dates
- Follow consistent structure across agents

### 5. Code Quality

- **i18n mandatory** for ALL frontend text
- TypeScript strict mode (no `any` types)
- Follow existing patterns and conventions
- Test locally before creating PR

---

## 🎯 Agent Responsibilities Matrix

| Responsibility | Planner | Reviewer | Coder | Designer |
|----------------|---------|----------|-------|----------|
| Plan features | ✅ | ❌ | ❌ | ❌ |
| Prioritize backlog | ✅ | ❌ | ❌ | ❌ |
| Architecture decisions | ✅ | ❌ | ❌ | ❌ |
| Quality audits | ✅ | ✅ | ❌ | ✅ |
| Review PRs | ❌ | ✅ | ❌ | ❌ |
| Deploy to production | ❌ | ✅ | ❌ | ❌ |
| Monitor production | ❌ | ✅ | ❌ | ❌ |
| Implement features | ❌ | ❌ | ✅ | ❌ |
| Write backend code | ❌ | ❌ | ✅ | ❌ |
| Write frontend code | ❌ | ❌ | ✅ | ✅ (small) |
| UI/UX review | ❌ | ❌ | ❌ | ✅ |
| Visual testing | ❌ | ❌ | ❌ | ✅ |
| Accessibility | ❌ | ❌ | ❌ | ✅ |

---

## 📂 Workspace Setup

### Setting Up All 4 Workspaces

```bash
# Create workspace directories
cd ~/projects
git clone https://github.com/leandro-br-dev/charhub.git charhub-planner
git clone https://github.com/leandro-br-dev/charhub.git charhub-reviewer
git clone https://github.com/leandro-br-dev/charhub.git charhub-coder
git clone https://github.com/leandro-br-dev/charhub.git charhub-designer

# Configure each workspace with unique ports
cd charhub-planner && cat > docker-compose.override.yml << 'EOF'
version: '3.8'
services:
  frontend:
    ports:
      - "8080:80"
  backend:
    ports:
      - "3000:3000"
  postgres:
    ports:
      - "5430:5432"
  redis:
    ports:
      - "6370:6379"
EOF

cd ../charhub-reviewer && cat > docker-compose.override.yml << 'EOF'
version: '3.8'
services:
  frontend:
    ports:
      - "8081:80"
  backend:
    ports:
      - "3001:3000"
  postgres:
    ports:
      - "5431:5432"
  redis:
    ports:
      - "6371:6379"
EOF

cd ../charhub-coder && cat > docker-compose.override.yml << 'EOF'
version: '3.8'
services:
  frontend:
    ports:
      - "8082:80"
  backend:
    ports:
      - "3002:3000"
  postgres:
    ports:
      - "5432:5432"
  redis:
    ports:
      - "6372:6379"
EOF

cd ../charhub-designer && cat > docker-compose.override.yml << 'EOF'
version: '3.8'
services:
  frontend:
    ports:
      - "8083:80"
  backend:
    ports:
      - "3003:3000"
  postgres:
    ports:
      - "5433:5432"
  redis:
    ports:
      - "6373:6379"
EOF
```

### Switching Between Agents

```bash
# Switch to Agent Planner
cd ~/projects/charhub-planner
cp docs/agents/planner/CLAUDE.md ./CLAUDE.md

# Switch to Agent Reviewer
cd ~/projects/charhub-reviewer
cp docs/agents/reviewer/CLAUDE.md ./CLAUDE.md

# Switch to Agent Coder
cd ~/projects/charhub-coder
cp docs/agents/coder/CLAUDE.md ./CLAUDE.md

# Switch to Agent Designer
cd ~/projects/charhub-designer
cp docs/agents/designer/CLAUDE.md ./CLAUDE.md
```

---

## 🧪 Testing Environments

Each agent can test independently:

```bash
# Agent Planner tests at http://localhost:8080
cd ~/projects/charhub-planner
docker compose up -d
open http://localhost:8080

# Agent Reviewer tests at http://localhost:8081
cd ~/projects/charhub-reviewer
docker compose up -d
open http://localhost:8081

# Agent Coder tests at http://localhost:8082
cd ~/projects/charhub-coder
docker compose up -d
open http://localhost:8082

# Agent Designer tests at http://localhost:8083
cd ~/projects/charhub-designer
docker compose up -d
open http://localhost:8083
```

**All 4 agents can run simultaneously without port conflicts!** 🎉

---

## 📊 Agent Performance Metrics

| Metric | Planner | Reviewer | Coder | Designer |
|--------|---------|----------|-------|----------|
| Primary KPI | Features planned/week | Deployment success rate | PRs merged/week | UI issues found/fixed |
| Quality Metric | Spec clarity score | Production uptime % | Test coverage % | Accessibility score |
| Efficiency | Planning→Delivery time | Deploy time (target: <5min) | PR review cycles | Fix turnaround time |

---

## 🆘 Getting Help

### Agent-Specific Help

- **Planner**: See [planner/CLAUDE.md](./planner/CLAUDE.md)
- **Reviewer**: See [reviewer/CLAUDE.md](./reviewer/CLAUDE.md)
- **Coder**: See [coder/CLAUDE.md](./coder/CLAUDE.md)
- **Designer**: See [designer/CLAUDE.md](./designer/CLAUDE.md)

### General Documentation

- [System Architecture](../04-architecture/system-overview.md)
- [Development Guides](../02-guides/development/)
- [Deployment Guides](../02-guides/deployment/)

---

## 🎯 Quick Reference

### Port Mnemonics

Remember: **Last digit = Agent number**

- **Planner** = 0 → 808**0**, 300**0**, 543**0**, 637**0**
- **Reviewer** = 1 → 808**1**, 300**1**, 543**1**, 637**1**
- **Coder** = 2 → 808**2**, 300**2**, 543**2**, 637**2**
- **Designer** = 3 → 808**3**, 300**3**, 543**3**, 637**3**

### When to Use Which Agent

| Task | Use This Agent |
|------|----------------|
| Plan a new feature | **Planner** |
| Implement a feature | **Coder** |
| Review and deploy PR | **Reviewer** |
| Improve UI/UX | **Designer** (small) or **Coder** (large) |
| Fix production bug | **Reviewer** (triage) → **Coder** (fix) |
| Design proposal | **Designer** |
| Architecture decision | **Planner** |
| Quality audit | **Planner** + **Designer** |

---

**CharHub Multi-Agent System**: Specialized roles, coordinated excellence! 🚀

*Last Updated: 2025-12-25*
