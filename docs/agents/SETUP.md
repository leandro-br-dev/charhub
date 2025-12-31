# Agent Setup Guide

**Last Updated**: 2025-12-31

This guide explains how to set up new agents in the CharHub ID-based multi-agent system.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Step-by-Step Setup](#step-by-step-setup)
4. [Port Verification](#port-verification)
5. [Common Issues](#common-issues)
6. [Examples](#examples)

---

## Prerequisites

Before setting up a new agent, ensure you have:

- **Ubuntu 24.04 LTS** (or compatible Linux environment)
- **Docker** and **Docker Compose** installed
- **Git** configured with repository access
- **Node.js 20+** and **npm** installed
- Familiarity with the CharHub codebase

---

## Quick Start

```bash
# 1. Create agent directory (use 2-digit ID: 01-99)
mkdir charhub-agent-01
cd charhub-agent-01

# 2. Clone codebase
git clone https://github.com/leandro-br-dev/charhub.git .

# 3. Run setup script with desired role
./scripts/setup-agent.sh coder

# 4. Start environment
docker compose up -d

# 5. Verify services
docker compose ps

# Done! Access services at:
# - Frontend: http://localhost:5101
# - Backend: http://localhost:8001
```

---

## Step-by-Step Setup

### Step 1: Choose Agent ID

Select an available ID between 01-99:

```bash
# Check existing agents
ls -d ~/projects/charhub-agent-*

# Example output:
# charhub-agent-01  (in use)
# charhub-agent-02  (in use)

# Choose next available ID: 03
```

**Rules**:
- Always use 2-digit format (01, not 1)
- Sequential assignment recommended (01, 02, 03, ...)
- Document your ID assignments somewhere

### Step 2: Create Directory

```bash
cd ~/projects

# Use pattern: charhub-agent-XX (where XX is your ID)
mkdir charhub-agent-03
cd charhub-agent-03
```

**Important**: Directory name MUST match pattern `charhub-agent-XX` for scripts to work!

### Step 3: Clone Repository

```bash
# Clone the CharHub repository into current directory
git clone https://github.com/leandro-br-dev/charhub.git .

# Verify structure
ls -la
# Should see: backend/, frontend/, docs/, scripts/, etc.
```

### Step 4: Choose Role

Select which role this agent will perform:

| Role | Description | Branch | Use Case |
|------|-------------|--------|----------|
| `coder` | Feature implementation | `feature/*` | Develop new features, fix bugs |
| `reviewer` | Deployment & QA | `main` | Review PRs, deploy to production |
| `planner` | Planning & architecture | `main` | Plan features, manage roadmap |

```bash
# Example: Setting up as Coder
./scripts/setup-agent.sh coder
```

### Step 5: Verify Configuration

The setup script will create:

1. **docker-compose.override.yml** - Port mappings
2. **.agentrc** - Agent metadata
3. **CLAUDE.md** - Role-specific instructions

```bash
# Verify files created
ls -la

# Check port assignments
cat .agentrc
# Should show:
# AGENT_ID=03
# AGENT_ROLE=coder
# BACKEND_PORT=8003
# FRONTEND_PORT=5103
# ...
```

### Step 6: Set Up Environment Variables

```bash
# Backend environment
cd backend
cp .env.example .env

# Edit .env and update PORT
nano .env
# Set: PORT=8003 (or your backend port from .agentrc)

# Frontend environment
cd ../frontend
cp .env.example .env

# Edit .env and update API URL
nano .env
# Set: VITE_API_URL=http://localhost:8003 (your backend port)
```

### Step 7: Install Dependencies

```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..
```

### Step 8: Start Services

```bash
# Start all services
docker compose up -d

# Wait for services to be ready (30 seconds)
sleep 30

# Check service health
docker compose ps
```

Expected output:
```
NAME                           STATUS              PORTS
charhub-agent-03-backend-1     Up About a minute   0.0.0.0:8003->3000/tcp
charhub-agent-03-frontend-1    Up About a minute   0.0.0.0:5103->5173/tcp
charhub-agent-03-postgres-1    Up About a minute   0.0.0.0:5403->5432/tcp
charhub-agent-03-redis-1       Up About a minute   0.0.0.0:6303->6379/tcp
```

### Step 9: Verify Application

```bash
# Test backend health
curl http://localhost:8003/api/v1/health

# Should return: {"status":"ok"}

# Test frontend (in browser)
open http://localhost:5103
```

### Step 10: Configure Git

```bash
# Set up appropriate branch for your role
git checkout main  # if reviewer/planner
# OR
git checkout -b feature/your-feature  # if coder
```

---

## Port Verification

### Port Allocation Formula

Each agent gets unique ports based on ID:

```
Agent ID: 03

Backend:    80 + 03 = 8003
Frontend:   51 + 03 = 5103
PostgreSQL: 54 + 03 = 5403
Redis:      63 + 03 = 6303
Nginx:      84 + 03 = 8403
```

### Verify No Conflicts

```bash
# Check if ports are already in use
lsof -i :8003  # Backend
lsof -i :5103  # Frontend
lsof -i :5403  # PostgreSQL
lsof -i :6303  # Redis
lsof -i :8403  # Nginx

# All should return empty (ports available)
```

### Check Running Agents

```bash
# See which agents are running
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep charhub-agent

# Example output:
# charhub-agent-01-backend-1    0.0.0.0:8001->3000/tcp
# charhub-agent-02-backend-1    0.0.0.0:8002->3000/tcp
# charhub-agent-03-backend-1    0.0.0.0:8003->3000/tcp
```

---

## Common Issues

### Issue 1: "Must run from inside charhub-agent-XX directory"

**Cause**: Running script from wrong directory

**Solution**:
```bash
# Check current directory
pwd
# Should be: /path/to/charhub-agent-XX

# Navigate to correct directory
cd ~/projects/charhub-agent-03
./scripts/setup-agent.sh coder
```

### Issue 2: "Port already in use"

**Cause**: Another service or agent using the same port

**Solution**:
```bash
# Find what's using the port
lsof -i :8003

# If another agent:
cd /path/to/that/agent
docker compose down

# If system service:
sudo systemctl stop <service-name>

# Or choose different agent ID
```

### Issue 3: "Template not found"

**Cause**: Missing role template file

**Solution**:
```bash
# Verify templates exist
ls docs/agents/*/CLAUDE.md

# Should show:
# docs/agents/coder/CLAUDE.md
# docs/agents/reviewer/CLAUDE.md
# docs/agents/planner/CLAUDE.md

# If missing, ensure you cloned the full repository
```

### Issue 4: Docker Compose fails to start

**Cause**: Missing .env files or incorrect configuration

**Solution**:
```bash
# Create .env files if missing
cd backend
cp .env.example .env

cd ../frontend
cp .env.example .env

# Restart services
cd ..
docker compose down
docker compose up -d
```

### Issue 5: Backend health check fails

**Cause**: Database not ready or connection issues

**Solution**:
```bash
# Check all service logs
docker compose logs

# Check specific service
docker compose logs backend

# Common fix: Wait for database to initialize
docker compose restart backend

# Wait and retry
sleep 10
curl http://localhost:8003/api/v1/health
```

---

## Examples

### Example 1: Set Up Agent 01 as Coder

```bash
# Create directory
mkdir ~/projects/charhub-agent-01
cd ~/projects/charhub-agent-01

# Clone codebase
git clone https://github.com/leandro-br-dev/charhub.git .

# Set up as Coder
./scripts/setup-agent.sh coder

# Configure environment
cd backend && cp .env.example .env
cd ../frontend && cp .env.example .env
cd ..

# Install dependencies
cd backend && npm install
cd ../frontend && npm install
cd ..

# Start services
docker compose up -d

# Create feature branch
git checkout -b feature/user-authentication

# Start coding!
open http://localhost:5101
```

### Example 2: Set Up Agent 02 as Reviewer

```bash
# Create directory
mkdir ~/projects/charhub-agent-02
cd ~/projects/charhub-agent-02

# Clone codebase
git clone https://github.com/leandro-br-dev/charhub.git .

# Set up as Reviewer
./scripts/setup-agent.sh reviewer

# Configure environment
cd backend && cp .env.example .env
# Edit .env: PORT=8002
cd ../frontend && cp .env.example .env
# Edit .env: VITE_API_URL=http://localhost:8002
cd ..

# Install dependencies
cd backend && npm install
cd ../frontend && npm install
cd ..

# Start services
docker compose up -d

# Stay on main branch (Reviewer works on main)
git checkout main

# Ready to review PRs!
open http://localhost:5102
```

### Example 3: Set Up Multiple Agents Simultaneously

```bash
# Agent 01 - Coder (Feature A)
cd ~/projects
mkdir charhub-agent-01 && cd charhub-agent-01
git clone https://github.com/leandro-br-dev/charhub.git .
./scripts/setup-agent.sh coder
docker compose up -d

# Agent 02 - Coder (Feature B)
cd ~/projects
mkdir charhub-agent-02 && cd charhub-agent-02
git clone https://github.com/leandro-br-dev/charhub.git .
./scripts/setup-agent.sh coder
docker compose up -d

# Agent 03 - Reviewer
cd ~/projects
mkdir charhub-agent-03 && cd charhub-agent-03
git clone https://github.com/leandro-br-dev/charhub.git .
./scripts/setup-agent.sh reviewer
docker compose up -d

# All three agents now running without conflicts!
# Agent 01: http://localhost:5101
# Agent 02: http://localhost:5102
# Agent 03: http://localhost:5103
```

---

## Next Steps

After successful setup:

1. **Read your role documentation**:
   ```bash
   cat CLAUDE.md
   ```

2. **Understand your workflows**:
   - Coder: See `docs/agents/coder/INDEX.md`
   - Reviewer: See `docs/agents/reviewer/INDEX.md`
   - Planner: See `docs/agents/planner/INDEX.md`

3. **Start working**:
   - Coders: Create feature branch and implement
   - Reviewers: Review PRs, test, deploy
   - Planners: Plan features, manage roadmap

4. **Switch role if needed**:
   ```bash
   ./scripts/switch-agent-role.sh reviewer
   ```

---

## Verification Checklist

Before considering setup complete, verify:

- [ ] Agent directory created with correct naming (`charhub-agent-XX`)
- [ ] Repository cloned successfully
- [ ] Setup script ran without errors
- [ ] `.agentrc` file created with correct ID and role
- [ ] `docker-compose.override.yml` created with unique ports
- [ ] `CLAUDE.md` matches selected role
- [ ] `.env` files configured in backend and frontend
- [ ] Dependencies installed (`node_modules/` exists)
- [ ] Docker services all show "Up" status
- [ ] Backend health check returns `{"status":"ok"}`
- [ ] Frontend loads in browser
- [ ] No port conflicts with other agents
- [ ] Git on appropriate branch for role

---

## Support

- **Migration from legacy**: See [MIGRATION.md](MIGRATION.md)
- **System overview**: See [README.md](README.md)
- **Role-specific help**: See respective `CLAUDE.md` templates

---

**Ready to start developing?** You're all set! 🚀
