# Agent Coder Skills

**Last Updated**: 2025-01-24
**Purpose**: Specialized skills for Agent Coder orchestration workflow

---

## Overview

These are the specialized skills available to **Agent Coder** for orchestrating feature development from start to finish.

**Important**: These skills are specific to Agent Coder. Other agents have their own specialized skill sets.

---

## Skills Structure

```
SKILLS ("How to do" - Patterns & Guidance)
├─ Orchestration Skills (docs/agents/coder/skills/orchestration/)
│  ├─ feature-analysis-planning     - Analyze specs, create plans
│  ├─ git-branch-management         - Safe Git operations
│  ├─ development-coordination      - Coordinate implementation
│  ├─ server-stability-verification - Verify service health
│  ├─ manual-testing-protocol       - User testing workflow
│  ├─ parallel-tasks-execution      - Run tests + docs in parallel
│  ├─ test-environment-preparation  - Database management
│  └─ pr-readiness-checklist        - Final verification
│
└─ Technical Skills (docs/agents/coder/skills/technical/)
   ├─ Global
   │  ├─ charhub-typescript-standards     - TypeScript patterns
   │  ├─ charhub-i18n-system              - Internationalization
   │  └─ charhub-documentation-patterns   - Documentation standards
   ├─ Backend
   │  ├─ charhub-express-patterns             - Express server setup
   │  ├─ charhub-express-routes-patterns      - Route organization
   │  ├─ charhub-express-controllers-patterns - Controller patterns
   │  ├─ charhub-express-middleware-patterns  - Middleware patterns
   │  └─ charhub-prisma-patterns              - Database operations
   ├─ Frontend
   │  ├─ charhub-react-patterns              - React hooks
   │  ├─ charhub-react-component-patterns    - Component structure
   │  └─ charhub-react-query-patterns        - TanStack Query
   └─ Testing
      ├─ charhub-jest-patterns              - Backend testing
      ├─ charhub-react-testing-patterns     - Frontend testing
      └─ charhub-testing-standards          - General testing standards
```

---

## Skills by Workflow Phase

### Phase 1: Planning & Setup

| Skill | Type | Purpose | When Used |
|-------|------|---------|-----------|
| **feature-analysis-planning** | Orchestration | Analyze feature specs and create action plans | Starting a new feature |
| **git-branch-management** | Orchestration | Manage Git branches safely | Creating feature branch |

### Phase 2: Implementation

| Skill | Type | Purpose | When Used |
|-------|------|---------|-----------|
| **development-coordination** | Orchestration | Coordinate backend/frontend subagents | Active development phase |
| **charhub-express-patterns** | Technical | Express server setup patterns | Backend implementation |
| **charhub-prisma-patterns** | Technical | Database operation patterns | Backend implementation |
| **charhub-react-patterns** | Technical | React hooks and patterns | Frontend implementation |
| **charhub-i18n-system** | Technical | Internationalization system | Frontend implementation |
| **server-stability-verification** | Orchestration | Verify server health after development | After code complete |

### Phase 3: Testing & Quality

| Skill | Type | Purpose | When Used |
|-------|------|---------|-----------|
| **manual-testing-protocol** | Orchestration | Request and manage user manual testing | Server stable, ready for testing |
| **parallel-tasks-execution** | Orchestration | Run tests and documentation in parallel | Manual testing passed |
| **test-environment-preparation** | Orchestration | Prepare clean database for testing | Before running automated tests |
| **charhub-jest-patterns** | Technical | Jest testing patterns | Test creation |
| **charhub-react-testing-patterns** | Technical | React testing patterns | Test creation |

### Phase 4: PR Preparation

| Skill | Type | Purpose | When Used |
|-------|------|---------|-----------|
| **pr-readiness-checklist** | Orchestration | Final verification before PR | All tests passed, ready for PR |

---

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENT CODER WORKFLOW                     │
└─────────────────────────────────────────────────────────────┘

Phase 1: PLANNING & SETUP
│
├─→ feature-analysis-planning (orchestration)
│   └─ Analyze spec, create action plan (in memory)
│
├─→ git-branch-management (orchestration)
│   └─ Verify main updated, create feature branch
│
Phase 2: IMPLEMENTATION
│
├─→ development-coordination (orchestration)
│   ├─→ backend-developer (refer to technical skills)
│   │   └─ charhub-express-patterns
│   │   └─ charhub-prisma-patterns
│   └─→ frontend-specialist (refer to technical skills)
│       └─ charhub-react-patterns
│       └─ charhub-i18n-system
│
├─→ server-stability-verification (orchestration)
│   └─ Verify all services healthy and stable
│
Phase 3: TESTING & QUALITY
│
├─→ manual-testing-protocol (orchestration)
│   └─ Request user manual testing
│
├─→ parallel-tasks-execution (orchestration)
│   ├─→ test-writer (refer to technical skills)
│   │   └─ charhub-jest-patterns
│   │   └─ charhub-react-testing-patterns
│   └─→ coder-doc-specialist
│
│   ├─→ test-environment-preparation (orchestration)
│   │   └─ db-switch.sh clean
│   │
│   ├─→ Run automated tests
│   └─→ ./scripts/database/db-switch.sh populated
│
Phase 4: PR PREPARATION
│
└─→ pr-readiness-checklist (orchestration)
    └─ Final verification
    └─→ Delegate to pr-prep-deployer
        └─ Create PR
```

---

## Orchestration Skills

### 1. feature-analysis-planning

**Location**: `skills/orchestration/feature-analysis-planning/SKILL.md`

**What it does**:
- Reads feature specification from `features/active/`
- Creates comprehensive action plan in memory
- Identifies required subagents
- Validates feasibility

---

### 2. git-branch-management

**Location**: `skills/orchestration/git-branch-management/SKILL.md`

**What it does**:
- Verifies main branch is up to date
- Creates feature branch with proper naming
- Manages Git operations safely

**Critical rule**: ALWAYS uses `git-safety-officer` before any Git operation

---

### 3. development-coordination

**Location**: `skills/orchestration/development-coordination/SKILL.md`

**What it does**:
- Delegates to backend-developer for backend changes
- Delegates to frontend-specialist for frontend changes
- Coordinates parallel execution when both needed
- Verifies implementation completion

---

### 4. server-stability-verification

**Location**: `skills/orchestration/server-stability-verification/SKILL.md`

**What it does**:
- Verifies Docker container health
- Checks service connectivity
- Runs database migrations
- Performs smoke tests

---

### 5. manual-testing-protocol

**Location**: `skills/orchestration/manual-testing-protocol/SKILL.md`

**What it does**:
- Creates clear testing instructions for user
- Presents testing checklist
- Waits for user confirmation
- Handles test failures

---

### 6. parallel-tasks-execution

**Location**: `skills/orchestration/parallel-tasks-execution/SKILL.md`

**What it does**:
- Delegates to test-writer AND coder-doc-specialist in parallel
- Waits for BOTH to complete
- Prepares test environment
- Runs automated test suite

---

### 7. test-environment-preparation

**Location**: `skills/orchestration/test-environment-preparation/SKILL.md`

**What it does**:
- Manages database state for testing
- Uses `db-switch.sh` script for clean test database
- Backs up and restores development data

---

### 8. pr-readiness-checklist

**Location**: `skills/orchestration/pr-readiness-checklist/SKILL.md`

**What it does**:
- Final verification before PR creation
- Checks code quality (lint, build)
- Verifies test coverage
- Confirms documentation complete
- Validates server health

---

## Technical Skills

### Global Skills

**charhub-typescript-standards** - TypeScript patterns and standards
**charhub-i18n-system** - Internationalization system
**charhub-documentation-patterns** - Documentation standards

### Backend Skills

**charhub-express-patterns** - Express server setup
**charhub-express-routes-patterns** - Route organization
**charhub-express-controllers-patterns** - Controller patterns
**charhub-express-middleware-patterns** - Middleware patterns
**charhub-prisma-patterns** - Database operations

### Frontend Skills

**charhub-react-patterns** - React hooks
**charhub-react-component-patterns** - Component structure
**charhub-react-query-patterns** - TanStack Query

### Testing Skills

**charhub-jest-patterns** - Backend testing
**charhub-react-testing-patterns** - Frontend testing
**charhub-testing-standards** - General testing standards

---

## Usage Notes

### How Agent Coder Uses These Skills

1. **Orchestration skills** guide the workflow phases
2. **Technical skills** provide domain knowledge for implementation
3. Skills are invoked sequentially by workflow phase
4. Technical skills are referenced by sub-agents during implementation

### Skills vs Subagent Delegation

**Skills** (Agent Coder):
- Orchestration procedures
- Workflow management
- Domain knowledge patterns
- Verification protocols

**Subagents** (specialists):
- Actual implementation work
- Domain-specific expertise
- Code writing and testing
- Detailed execution

---

## Related Documentation

- **Agent Coder Main**: `../CLAUDE.md`
- **Subagents**: `../sub-agents/`
- **Quick Reference**: `../quick-reference.md`
- **Project Agents**: `../../README.md`
