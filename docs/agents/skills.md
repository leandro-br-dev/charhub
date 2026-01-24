# Skills - Claude Code

**Last Updated**: 2025-01-24
**Source**: [Claude Code Docs - Agent Skills](https://code.claude.com/docs/pt/skills)

---

## What are Skills?

Skills are modular capabilities that extend Claude's functionality through organized folders containing instructions, scripts, and resources.

### Key Characteristics

- **Model-Invoked**: Claude autonomously decides when to use them based on description
- **Context-Sharing**: Run in the main conversation context (not isolated)
- **Git-Distributable**: Share expertise via version control
- **Composable**: Multiple skills can work together for complex tasks

### Skills vs Slash Commands

| Aspect | Skills | Slash Commands |
|--------|--------|----------------|
| **Invocation** | Model decides autonomously | User explicitly types `/command` |
| **Trigger** | Based on task description | Based on user command |
| **Discovery** | Automatic via description | Manual via command list |

---

## Benefits

| Benefit | Description |
|---------|-------------|
| **Extend Capabilities** | For specific workflows |
| **Share Expertise** | Via git with team |
| **Reduce Repetition** | Eliminate repetitive prompts |
| **Composable** | Multiple skills for complex tasks |

---

## Skill Structure

```
my-skill/
├── SKILL.md (required)
├── reference.md (optional documentation)
├── examples.md (optional examples)
└── scripts/
    └── helper.py (optional utilities)
```

### SKILL.md Format

```markdown
---
name: your-skill-name
description: Brief description of what this skill does and when to use it
allowed-tools: Read, Grep, Glob (optional - restricts tools)
---

# Your Skill Name

## Instructions
Provide clear, step-by-step guidance for Claude.

## Examples
Show concrete examples of using this skill.
```

### Required Fields

| Field | Requirements | Description |
|-------|--------------|-------------|
| `name` | Lowercase, numbers, hyphens only (max 64 chars) | Unique identifier |
| `description` | Max 1024 characters | What skill does + when to use it (critical for discovery) |

---

## Scopes

| Location | Scope | Use For |
|----------|-------|---------|
| `~/.claude/skills/` | **Personal** | Individual workflows, experimentation |
| `.claude/skills/` | **Project** | Team conventions, versioned in git |
| `plugins/skills/` | **Plugin** | Distributed via installed plugin |

### Personal Skills

```bash
mkdir -p ~/.claude/skills/my-skill-name
```

**Use for**:
- Personal workflows and preferences
- Experimental skills in development
- Personal productivity tools

### Project Skills

```bash
mkdir -p .claude/skills/my-skill-name
```

**Use for**:
- Team workflows and conventions
- Project-specific expertise
- Shared utilities and scripts

Project skills are git-tracked and automatically available to team members.

---

## Tool Restrictions

Use the `allowed-tools` field to limit which tools Claude can use when a skill is active:

```yaml
---
name: safe-file-reader
description: Read files without making changes
allowed-tools: Read, Grep, Glob
---

# Safe File Reader

This skill provides read-only file access.
```

**Use cases**:
- Read-only skills that shouldn't modify files
- Scoped skills (e.g., data analysis only, no file writing)
- Security-sensitive workflows

---

## Skills vs Subagents Comparison

| Aspect | Skills | Subagents |
|--------|--------|------------|
| **Invocation** | Model decides autonomously | Claude delegates explicitly |
| **Context** | Main conversation | Isolated context |
| **Tool Control** | `allowed-tools` (optional) | `tools` + `disallowedTools` |
| **Output** | Stays in main context | Returns as summary |
| **Best For** | Reusable prompts/expertise | Specialized isolated tasks |
| **Latency** | Low (already in context) | Higher (starts fresh) |

### When to Use Each

**Use Skills when**:
- You want expertise available in main conversation
- Workflow requires frequent back-and-forth
- Multiple phases share significant context
- Making quick, targeted changes
- Latency matters

**Use Subagents when**:
- Task produces verbose output
- Want to enforce specific tool restrictions
- Work is self-contained and can return summary
- Need isolated context (e.g., parallel research)

---

## Best Practices

### 1. Keep Skills Focused

One capability per skill:

**Good (Focused)**:
- "PDF form filling"
- "Excel data analysis"
- "Git commit messages"

**Avoid (Too Broad)**:
- "Document processing" (split into separate skills)
- "Data tools" (split by data type or operation)

### 2. Write Clear Descriptions

Help Claude discover skills with specific triggers:

**Good (Specific)**:
```yaml
description: Analyze Excel spreadsheets, create pivot tables, and generate charts. Use when working with Excel files, spreadsheets, or analyzing tabular data in .xlsx format.
```

**Avoid (Vague)**:
```yaml
description: Helps with documents
```

**Include**:
- What the skill does
- When to use it
- Keywords users would mention

### 3. Test with Team

Have team members use skills and provide feedback:
- Is the skill activated when expected?
- Are instructions clear?
- Missing examples or edge cases?

### 4. Document Versions

Track changes in SKILL.md:

```markdown
# My Skill

## Version History
- v2.0.0 (2025-10-01): Breaking changes to API
- v1.1.0 (2025-09-15): Added new features
- v1.0.0 (2025-09-01): Initial release
```

---

## Troubleshooting

### Claude Won't Use My Skill

**Check**: Is the description specific enough?

```yaml
# Too generic
description: Helps with data

# Specific
description: Analyze Excel spreadsheets, generate pivot tables, create charts. Use when working with Excel files, spreadsheets, or .xlsx files.
```

**Check**: Is YAML valid?

```bash
cat .claude/skills/my-skill/SKILL.md | head -n 15
```

Look for:
- Missing opening or closing `---`
- Tabs instead of spaces
- Unquoted strings with special characters

**Check**: Is skill in correct location?

```bash
# Personal skills
ls ~/.claude/skills/*/SKILL.md

# Project skills
ls .claude/skills/*/SKILL.md
```

### Conflicting Skills

**Symptom**: Claude uses wrong skill or seems confused.

**Solution**: Use distinct trigger terms in descriptions:

```yaml
# Instead of:
# Skill 1: description: For data analysis
# Skill 2: description: For analyzing data

# Use:
# Skill 1: description: Analyze sales data in Excel files and CRM exports. Use for sales reports, pipeline analysis, and revenue tracking.
# Skill 2: description: Analyze log files and system metrics. Use for performance monitoring, debugging, and system diagnostics.
```

---

## Examples

### Simple Skill (Single File)

```
commit-helper/
└── SKILL.md
```

```yaml
---
name: generating-commit-messages
description: Generates clear commit messages from git diffs. Use when writing commit messages or reviewing staged changes.
---

# Generating Commit Messages

## Instructions

1. Run `git diff --staged` to see changes
2. Suggest commit message with:
   - Summary under 50 characters
   - Detailed description
   - Affected components

## Best practices

- Use present tense
- Explain what and why, not how
```

### Skill with Tool Permissions

```
code-reviewer/
└── SKILL.md
```

```yaml
---
name: code-reviewer
description: Review code for best practices and potential issues. Use when reviewing code, checking PRs, or analyzing code quality.
allowed-tools: Read, Grep, Glob
---

# Code Reviewer

## Review checklist
1. Code organization and structure
2. Error handling
3. Performance considerations
4. Security concerns
5. Test coverage

## Instructions

1. Read target files using Read tool
2. Search for patterns using Grep
3. Find related files using Glob
4. Provide detailed feedback on code quality
```

### Multi-file Skill

```
pdf-processing/
├── SKILL.md
├── FORMS.md
├── REFERENCE.md
└── scripts/
    ├── fill_form.py
    └── validate.py
```

**SKILL.md**:

```yaml
---
name: pdf-processing
description: Extract text, fill forms, merge PDFs. Use when working with PDF files, forms, or document extraction.
---

# PDF Processing

## Quick start
Extract text:
```python
import pdfplumber
with pdfplumber.open("doc.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```

For form filling, see [FORMS.md](FORMS.md).
For detailed API reference, see [REFERENCE.md](REFERENCE.md).

## Requirements
```bash
pip install pypdf pdfplumber
```
```

---

## Synergy: Skills + Subagents

### Subagents Can Use Skills

Subagents can preload skills using the `skills` field:

```yaml
---
name: api-developer
description: Implement API endpoints following team conventions
skills:
  - api-conventions
  - error-handling-patterns
  - prisma-best-practices
---

Implement API endpoints. Follow the conventions from preloaded skills.
```

**How it works**:
- Full skill content is injected into subagent's context at startup
- Subagents don't inherit skills from parent - must be listed explicitly
- Skills give domain knowledge without discovery overhead

### Layered Architecture

```
┌─────────────────────────────────────────────────┐
│  Main Conversation (Agent Coder - Orchestrator)  │
│  - Has access to orchestration skills            │
│  - Coordinates subagents                         │
└─────────────────────────────────────────────────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
    ┌─────────┐ ┌─────────┐ ┌─────────┐
    │backend- │ │frontend-│ │  test-  │
    │developer│ │specialist│ │writer  │
    └─────────┘ └─────────┘ └─────────┘
          │           │           │
      Skills      Skills      Skills
   (nestjs,    (vue3,     (jest,
    prisma)    i18n)      vitest)
```

### Pattern: Skill as "Convention Library"

**Skill** (`api-conventions/SKILL.md`):

```yaml
---
name: charhub-api-conventions
description: API development conventions for CharHub. Use when implementing or reviewing API endpoints in NestJS.
---

# CharHub API Conventions

## Endpoint Structure
- Use kebab-case for route paths: `/user-settings`
- Return 403 for permission errors
- Use Zod for input validation

## Error Response Format
```typescript
{ error: "message" }
```

## i18n Pattern (Future)
Error messages will support internationalization via `apiT()`.
```

**Subagent** (`backend-developer.md`):

```yaml
---
name: backend-developer
skills:
  - charhub-api-conventions
  - charhub-nestjs-patterns
  - charhub-prisma-best-practices
---

Implement backend features following CharHub patterns.
```

### Pattern: Orchestration with Coordination Skills

**Skill** (`agent-orchestration/SKILL.md`):

```yaml
---
name: agent-orchestration
description: Guidelines for coordinating subagent delegation in CharHub. Use when planning feature implementation.
---

# Agent Orchestration Rules

1. Read feature spec before delegating
2. Use backend-developer for API changes
3. Use frontend-specialist for UI components
4. Use test-writer after implementation
5. Use feature-tester before PR
6. Always use git-safety-officer before Git operations
```

### Benefits of Combination

| Benefit | How Achieved |
|---------|--------------|
| **Clean Context** | Subagents isolate verbose operations |
| **Shared Expertise** | Skills distribute via git |
| **Specialization** | Focused subagents + domain skills |
| **Consistency** | Skills ensure patterns are followed |
| **Scalability** | New convention = new skill, all subagents benefit |
| **Low Latency** | Skills loaded at subagent initialization |

---

## Sources

- [Claude Code Docs - Agent Skills](https://code.claude.com/docs/pt/skills)
