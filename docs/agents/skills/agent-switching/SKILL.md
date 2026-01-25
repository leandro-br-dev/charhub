---
name: switch-agent
description: Switch active agent profile (coder, reviewer, planner). Loads agent profile, skills, and sub-agents to .claude/. Available to all agents.
---

# Agent Switching

## Purpose

Switch the active agent profile, loading the appropriate CLAUDE.md, skills, and sub-agents to the `.claude/` directory.

## When to Use

- Switching between agent roles (coder → reviewer → planner)
- Setting up a new agent profile
- Reloading agent profile after documentation updates

## Available Agents

| Agent | Role | Description |
|-------|------|-------------|
| **coder** | Agent Coder | Feature implementation orchestration |
| **reviewer** | Agent Reviewer | Deployment & QA orchestration |
| **planner** | Agent Planner | Planning & architecture orchestration |

## Usage

### From Project Root

```bash
# Switch to Agent Coder
./scripts/agents/setup-agent.sh coder

# Switch to Agent Reviewer
./scripts/agents/setup-agent.sh reviewer

# Switch to Agent Planner
./scripts/agents/setup-agent.sh planner
```

## What the Script Does

### 1. Creates `.claude/` Directory Structure

```
.claude/
├── skills/         # Agent skills + global skills
└── agents/         # Agent-specific sub-agents
```

### 2. Loads Agent Profile (CLAUDE.md)

Copies the agent's main instruction file from `docs/agents/{agent}/CLAUDE.md` to `CLAUDE.md` in the project root.

This contains:
- Agent identity and philosophy
- Workflow procedures
- Critical rules and checklists
- Decision trees

### 3. Loads Agent Skills

Copies agent-specific skills from `docs/agents/{agent}/skills/` to `.claude/skills/`.

Agent skills include:
- **Orchestration skills**: Workflow management procedures
- **Technical skills**: Domain knowledge patterns

Examples:
- Agent Coder: `feature-analysis-planning`, `git-branch-management`, `development-coordination`
- Agent Planner: `feature-spec-creation`, `feature-prioritization`, `sprint-planning`
- Agent Reviewer: `pr-review-orchestration`, `deployment-coordination`, `incident-response-protocol`

### 4. Loads Global Skills

Copies global skills from `docs/agents/skills/` to `.claude/skills/`.

Global skills are available to all agents, such as:
- `agent-switching` - This skill (how to switch agents)

### 5. Loads Sub-Agents

Copies sub-agent definitions from `docs/agents/{agent}/sub-agents/` to `.claude/agents/`.

Sub-agents are specialist executors that the main agent delegates to.

Examples:
- Agent Coder: `backend-developer`, `frontend-specialist`, `test-writer`, `feature-tester`, etc.
- Agent Planner: `feature-architect`, `feature-prioritizer`, `quality-strategist`, etc.
- Agent Reviewer: `pr-conflict-resolver`, `pr-code-reviewer`, `local-qa-tester`, etc.

## Output Example

```
╔══════════════════════════════════════════════════════════════╗
║           Agent Profile Setup & Switching                     ║
╚══════════════════════════════════════════════════════════════╝

Agent: coder

Preparing .claude directory structure...
✓ Created .claude directory structure

[1/4] Loading agent profile (CLAUDE.md)...
✓ Loaded CLAUDE.md from docs/agents/coder/CLAUDE.md

[2/4] Loading agent skills...
✓ Loaded 23 agent skill(s)

[3/4] Loading global skills...
✓ Loaded global skills
  Total skills available: 24

[4/4] Loading sub-agents...
✓ Loaded 8 sub-agent(s)

  Sub-agents loaded:
    - backend-developer
    - frontend-specialist
    - test-writer
    - feature-tester
    - code-quality-enforcer
    - coder-doc-specialist
    - pr-prep-deployer
    - git-safety-officer

╔══════════════════════════════════════════════════════════════╗
║              Agent Setup Complete!                            ║
╚══════════════════════════════════════════════════════════════╝

Active Agent: coder

Files loaded:
  ✓ CLAUDE.md (agent profile)
  ✓ .claude/skills/ (24 skills)
  ✓ .claude/agents/ (sub-agents)

Next steps:
  1. Review your agent profile: cat CLAUDE.md
  2. Check available skills: find .claude/skills -name SKILL.md
  3. Check sub-agents: ls .claude/agents/
  4. To switch to another agent: ./scripts/agents/setup-agent.sh <agent-name>

Happy coding! 🚀
```

## Verification

After switching agents, verify the setup:

```bash
# Check agent profile
head -20 CLAUDE.md

# Check loaded skills
find .claude/skills -name "SKILL.md" | head -10

# Check loaded sub-agents
ls .claude/agents/
```

## Tips

1. **Always switch from project root** - The script expects to be run from the project root directory

2. **Review the new agent profile** - After switching, read the new `CLAUDE.md` to understand your new role

3. **Skills are cumulative** - Agent-specific skills are loaded first, then global skills are merged in

4. **Sub-agents are exclusive** - Each agent has its own set of sub-agents that replace the previous ones

5. **Git safety** - If you have uncommitted changes when switching agents, they are preserved (the script only touches `.claude/` and `CLAUDE.md`)

## Related Scripts

Other agent-related scripts in `scripts/agents/`:
- `setup-agent.sh` - This script (unified setup and switching)
- Legacy scripts (kept for reference but not recommended):
  - `switch-agent-role.sh` - Old switching script (multi-environment)
  - `setup-agent.sh` (old version) - Old setup script (multi-environment)
