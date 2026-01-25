---
name: documentation-management
description: Manage core documentation structure and organization. Use during monthly reviews to assess docs/ folder and maintain quality standards.
---

# Documentation Management

## Purpose

Review and maintain the core documentation structure (`docs/` folder), identify cleanup opportunities, and ensure documentation quality standards are met.

## When to Use

- Monthly documentation reviews
- Documentation structure cleanup needed
- New architecture decisions to document
- Documentation standards evolution

## Pre-Conditions

✅ Access to docs/ folder
✅ Understanding of project documentation standards
✅ Time allocated for review

## Documentation Management Workflow

### Phase 1: Assess Documentation Structure

**Review current state**:

```bash
# Review documentation structure
find docs/ -type f -name "*.md" | head -30

# Check for orphaned files
find docs/ -type f -name "*.md" -not -path "*/node_modules/*"

# Review architecture decisions
ls docs/04-architecture/decisions/

# Check feature specs
ls docs/05-business/planning/features/
```

**Assess**:
- Documentation organization
- Outdated or orphaned files
- Missing critical documentation
- Consistency issues
- Navigation problems

### Phase 2: Identify Issues

**Common issues**:
- **Orphaned files**: Docs not referenced anywhere
- **Outdated content**: Old information not updated
- **Inconsistent structure**: Different formatting/styles
- **Missing navigation**: No clear path to find information
- **Duplicate content**: Same info in multiple places

**Create issue list**:

```markdown
# Documentation Issues - {Month}

## Critical Issues
- {issue_1}: {location}
- {issue_2}: {location}

## Improvement Opportunities
- {opportunity_1}: {location}
- {opportunity_2}: {location}

## Cleanup Tasks
- {task_1}: {file}
- {task_2}: {file}
```

### Phase 3: Plan Cleanup

**Prioritize**:
- High: Critical navigation issues, outdated critical docs
- Medium: Structure inconsistencies, minor outdated info
- Low: Nice-to-have improvements, cosmetic changes

**Capacity**:
- Budget: {X}% of planning time for documentation
- Balance: Documentation improvements with feature work

### Phase 4: Execute Cleanup

**Update documentation**:

```bash
# Review and update files
vim {file_to_update}

# Remove orphaned files
rm {orphaned_file}

# Reorganize structure
mv {old_location} {new_location}
```

**Updates to make**:
- Fix broken links
- Update outdated information
- Improve navigation
- Standardize formatting
- Add missing sections

### Phase 5: Update Quality Standards

**Review and update standards**:

```bash
# Review documentation standards
cat docs/01-introduction/documentation-standards.md
```

**Identify**:
- New patterns to document
- Standards that need updating
- Templates that need improvement

**Create/update**:
- Documentation templates
- Style guides
- Quality checklists

## Output Format

```
"Documentation management complete:

Assessment:
- Total files: {count}
- Issues found: {count}
- Cleanup completed: {count}

Files Updated:
- {file_1}: {update}
- {file_2}: {update}

Quality Standards Updated:
- {standard_1}: {update}

Documentation Health: {GOOD/FAIR/POOR}"
```

## Integration with Workflow

```
documentation-management (THIS SKILL)
    ↓
Review docs/ structure
    ↓
Identify issues
    ↓
Plan and execute cleanup
    ↓
Update quality standards
```

---

Remember: **Good Documentation Enables Self-Sufficiency**

Clear, organized documentation allows stakeholders to find answers independently and reduces repetitive questions.
