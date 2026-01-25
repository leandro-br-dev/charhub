# Subagents - Claude Code

**Last Updated**: 2025-01-24
**Source**: [Claude Code Docs - Subagents](https://code.claude.com/docs/en/sub-agents)

---

## What are Subagents?

Subagents are specialized AI assistants that handle specific types of tasks. Each subagent runs in its own context window with a custom system prompt, specific tool access, and independent permissions.

### Key Characteristics

- **Isolated Context**: Each subagent has its own conversation history
- **Custom System Prompt**: Specialized behavior per domain
- **Tool Restrictions**: Can limit which tools a subagent can use
- **Independent Permissions**: Separate permission handling from main conversation
- **Model Selection**: Can use different models (sonnet, opus, haiku)

---

## Benefits

| Benefit | Description |
|---------|-------------|
| **Preserve Context** | Keep exploration and implementation out of main conversation |
| **Enforce Constraints** | Limit which tools a subagent can use |
| **Reuse Configurations** | Share across projects with user-level subagents |
| **Specialize Behavior** | Focused system prompts for specific domains |
| **Control Costs** | Route tasks to faster/cheaper models like Haiku |

---

## Built-in Subagents

### 1. Explore

**Purpose**: Fast, read-only agent optimized for searching and analyzing codebases.

| Attribute | Value |
|-----------|-------|
| **Model** | Haiku (fast, low-latency) |
| **Tools** | Read-only (Read, Glob, Grep) - NO Write/Edit |
| **Usage** | File discovery, code search, codebase exploration |

**Thoroughness Levels**:
- `quick` - Targeted lookups
- `medium` - Balanced exploration
- `very thorough` - Comprehensive analysis

---

### 2. Plan

**Purpose**: Research agent used during plan mode to gather context before presenting a plan.

| Attribute | Value |
|-----------|-------|
| **Model** | Inherits from main conversation |
| **Tools** | Read-only tools |
| **Usage** | Codebase research for planning |

---

### 3. General-purpose

**Purpose**: Capable agent for complex, multi-step tasks requiring both exploration and action.

| Attribute | Value |
|-----------|-------|
| **Model** | Inherits from main conversation |
| **Tools** | All tools |
| **Usage** | Complex research, multi-step operations, code modifications |

---

### Other Built-in Subagents

| Agent | Model | When Claude uses it |
|-------|-------|---------------------|
| **Bash** | Inherits | Running terminal commands in separate context |
| **statusline-setup** | Sonnet | When running `/statusline` command |
| **Claude Code Guide** | Haiku | When asking questions about Claude Code features |

---

## Subagent Configuration

### File Structure

Subagents are defined in Markdown files with YAML frontmatter:

```markdown
---
name: code-reviewer
description: Expert code reviewer. Use proactively after code changes.
tools: Read, Glob, Grep, Bash
model: sonnet
---

You are a senior code reviewer. Focus on code quality, security, and best practices.
```

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier (lowercase letters and hyphens) |
| `description` | Yes | When Claude should delegate to this subagent |
| `tools` | No | Tools the subagent can use (inherits all if omitted) |
| `disallowedTools` | No | Tools to deny (removed from inherited or specified list) |
| `model` | No | Model: `sonnet`, `opus`, `haiku`, or `inherit` (default) |
| `permissionMode` | No | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan` |
| `skills` | No | Skills to load into subagent's context at startup |
| `hooks` | No | Lifecycle hooks scoped to this subagent |

---

## Scopes

| Location | Scope | Priority | How to create |
|----------|-------|----------|---------------|
| `--agents` CLI flag | Current session | 1 (highest) | Pass JSON when launching Claude Code |
| `.claude/agents/` | Current project | 2 | Interactive or manual |
| `~/.claude/agents/` | All your projects | 3 | Interactive or manual |
| Plugin's `agents/` | Where plugin is enabled | 4 (lowest) | Installed with plugins |

### Project Subagents

Store in `.claude/agents/` - ideal for codebase-specific agents. Check into version control for team collaboration.

### User Subagents

Store in `~/.claude/agents/` - personal agents available in all projects.

---

## Permission Modes

| Mode | Behavior |
|------|----------|
| `default` | Standard permission checking with prompts |
| `acceptEdits` | Auto-accept file edits |
| `dontAsk` | Auto-deny permission prompts (explicitly allowed tools still work) |
| `bypassPermissions` | Skip all permission checks |
| `plan` | Plan mode (read-only exploration) |

---

## Skills Integration

Subagents can preload skills using the `skills` field:

```yaml
---
name: api-developer
description: Implement API endpoints following team conventions
skills:
  - api-conventions
  - error-handling-patterns
---

Implement API endpoints. Follow the conventions and patterns from the preloaded skills.
```

**Important**:
- Full content of each skill is injected into subagent's context
- Subagents don't inherit skills from parent conversation
- Must list skills explicitly

---

## Hooks

Subagents can define lifecycle hooks:

### Hooks in Frontmatter

| Event | Matcher | When it fires |
|-------|---------|---------------|
| `PreToolUse` | Tool name | Before the subagent uses a tool |
| `PostToolUse` | Tool name | After the subagent uses a tool |
| `Stop` | (none) | When the subagent finishes |

**Example** - Validate bash commands and run linter after edits:

```yaml
---
name: code-reviewer
description: Review code changes with automatic linting
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-command.sh $TOOL_INPUT"
  PostToolUse:
    - matcher: "Edit|Write"
      hooks:
        - type: command
          command: "./scripts/run-linter.sh"
---
```

### Project-level Hooks

Configure in `settings.json` for subagent lifecycle events:

| Event | Matcher | When it fires |
|-------|---------|---------------|
| `SubagentStart` | Agent type name | When a subagent begins execution |
| `SubagentStop` | Agent type name | When a subagent completes |

---

## Execution Modes

### Foreground vs Background

| Aspect | Foreground | Background |
|--------|-----------|------------|
| **Blocking** | Blocks main conversation | Runs concurrently |
| **Permissions** | Prompts passed through | Inherits, auto-denies unapproved |
| **MCP Tools** | Available | NOT available |
| **Resume** | Can resume with context | Can resume to foreground |

### Running in Background

- Ask Claude to "run this in the background"
- Press `Ctrl+B` to background a running task
- Environment variable: `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` to disable

---

## Common Patterns

### 1. Isolate High-Volume Operations

Running tests, fetching docs, or processing logs produces verbose output.

```
Use a subagent to run the test suite and report only failing tests with error messages
```

### 2. Run Parallel Research

Spawn multiple subagents for independent investigations:

```
Research authentication, database, and API modules in parallel using separate subagents
```

### 3. Chain Subagents

For multi-step workflows:

```
Use code-reviewer to find performance issues, then use optimizer to fix them
```

---

## When to Use Subagents vs Main Conversation

| Use Main Conversation When... | Use Subagents When... |
|-------------------------------|----------------------|
| Task needs frequent back-and-forth | Task produces verbose output |
| Multiple phases share context | Want to enforce tool restrictions |
| Making quick, targeted changes | Work is self-contained |
| Latency matters | |

---

## Resume Subagents

Each subagent invocation creates a new instance. To continue work:

```
Use the code-reviewer subagent to review the authentication module
[Agent completes]

Continue that code review and now analyze the authorization logic
[Claude resumes subagent with full context]
```

**Storage**: Transcripts at `~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl`

---

## Disable Specific Subagents

Add to `deny` array in settings:

```json
{
  "permissions": {
    "deny": ["Task(Explore)", "Task(my-custom-agent)"]
  }
}
```

Or via CLI: `claude --disallowedTools "Task(Explore)"`

---

## Auto-Compaction

Subagents support automatic compaction (default at ~95% capacity).

**Override**: `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=50` (triggers earlier)

**Transcript cleanup**: Based on `cleanupPeriodDays` setting (default: 30 days)

---

## Examples

### Code Reviewer (Read-only)

```yaml
---
name: code-reviewer
description: Expert code review specialist. Proactively reviews code for quality, security, and maintainability.
tools: Read, Grep, Glob, Bash
model: inherit
---

You are a senior code reviewer ensuring high standards.

Review checklist:
- Code is clear and readable
- Functions and variables are well-named
- No duplicated code
- Proper error handling
- No exposed secrets
- Input validation
- Test coverage
- Performance

Provide feedback by priority:
- Critical (must fix)
- Warnings (should fix)
- Suggestions (consider improving)
```

### Debugger (Read + Write)

```yaml
---
name: debugger
description: Debugging specialist for errors, test failures, and unexpected behavior.
tools: Read, Edit, Bash, Grep, Glob
---

You are an expert debugger specializing in root cause analysis.

Debugging process:
1. Capture error message and stack trace
2. Identify reproduction steps
3. Isolate failure location
4. Implement minimal fix
5. Verify solution

Focus on fixing underlying issues, not symptoms.
```

### Database Query Validator (with Hooks)

```yaml
---
name: db-reader
description: Execute read-only database queries. Use when analyzing data.
tools: Bash
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-readonly-query.sh"
---

You are a database analyst with read-only access. Execute SELECT queries.
```

**Validation script** (`./scripts/validate-readonly-query.sh`):

```bash
#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Block write operations
if echo "$COMMAND" | grep -iE '\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)\b' > /dev/null; then
  echo "Blocked: Only SELECT queries are allowed" >&2
  exit 2
fi

exit 0
```

---

## Sources

- [Claude Code Docs - Create custom subagents](https://code.claude.com/docs/en/sub-agents)
