# Documentation Post-Maintenance Guidelines

**Version**: 1.0
**Last Updated**: 2026-01-21
**Status**: Active
**Next Review**: 2026-04-21

---

## Overview

This document establishes ongoing maintenance processes to ensure documentation remains healthy, organized, and effective after the DOCCLEAN migration (2026-01-21).

**Purpose**: Prevent documentation clutter, maintain high quality, and ensure AI agents can efficiently find and use documentation.

---

## Maintenance Schedule

### Quarterly Reviews (Every 3 Months)

**Responsible**: planner-doc-specialist (Agent Planner)

**Schedule**: April, July, October, January

**Duration**: ~2 hours per quarter

---

## Quarterly Review Checklist

### 1. Documentation Health Metrics

**Files in `/docs/`**:
- [ ] Count total files: `find docs/ -name "*.md" | wc -l`
- [ ] Target: <100 files (currently 94)
- [ ] If >100: Identify candidates for distribution or archival

**Distributed `.docs.md` Files**:
- [ ] Count total: `find . -name ".docs.md" | wc -l`
- [ ] Track growth rate
- [ ] Identify complex services without `.docs.md`

**Large Files**:
- [ ] Find files >1,000 lines: `find docs/ -name "*.md" -exec wc -l {} \; | sort -rn | head -20`
- [ ] Target: 0 files >1,000 lines
- [ ] If found: Split or move to distributed docs

**Broken Links**:
- [ ] Run link checker: `markdown-link-check docs/**/*.md`
- [ ] Fix any broken links
- [ ] Update references after file moves

**Outdated Content**:
- [ ] Find files not updated in 90+ days: `find docs/ -name "*.md" -mtime +90`
- [ ] Review each file for relevance
- [ ] Update or archive as needed

---

### 2. Feature Spec Management

**Active Specs** (`features/active/`):
- [ ] Review all active specs
- [ ] Move implemented specs to `features/archive/`
- [ ] Update spec statuses
- [ ] Remove stale specs (no progress in 90+ days)

**Archive** (`features/archive/`):
- [ ] Verify archive index is current
- [ ] Update README with newly archived specs
- [ ] Ensure all archived specs are indexed

**Backlog** (`features/backlog/`):
- [ ] Review backlog specs
- [ ] Update priorities based on business needs
- [ ] Remove obsolete items

---

### 3. Distributed Documentation Coverage

**Services Without `.docs.md`**:
- [ ] List all services: `find backend/src/services -type d -mindepth 1 -maxdepth 1`
- [ ] Identify which have `.docs.md`
- [ ] Prioritize complex services (>5 methods or complex logic)
- [ ] Create `.docs.md` for top 5 priority services

**Components Without `.docs.md`**:
- [ ] List complex components: `find frontend/src/components -type d -mindepth 1 -maxdepth 1`
- [ ] Identify which have `.docs.md`
- [ ] Prioritize complex components (state management, multiple props)
- [ ] Create `.docs.md` as needed

**Quality Validation**:
- [ ] Use coder-doc-specialist validation checklist
- [ ] Verify all `.docs.md` have required sections
- [ ] Check for language compliance (English only)
- [ ] Validate code examples

---

### 4. Navigation Validation

**Main Navigation** (`docs/README.md`):
- [ ] Test all section links
- [ ] Verify all referenced directories exist
- [ ] Update any broken references
- [ ] Check for clarity and organization

**Section READMEs**:
- [ ] Verify each section has README
- [ ] Test links within section READMEs
- [ ] Update table of contents if needed

**Cross-References**:
- [ ] Test links between `/docs/` and `.docs.md`
- [ ] Test links between `.docs.md` files
- [ ] Fix any broken references

---

### 5. Standards Compliance

**Documentation Standards**:
- [ ] Review `/docs/05-business/documentation-standards.md`
- [ ] Update based on lessons learned
- [ ] Add new patterns if identified
- [ ] Improve templates based on usage

**Agent Guidelines**:
- [ ] Review agent documentation for `.docs.md` references
- [ ] Update coder-doc-specialist guidelines
- [ ] Update planner-doc-specialist guidelines
- [ ] Ensure all agents emphasize `.docs.md` check

---

### 6. Improvement Opportunities

**Identify Issues**:
- [ ] Search for duplicate content
- [ ] Identify unclear documentation
- [ ] Find missing documentation (from agent feedback)
- [ ] Note pain points from recent development

**Create Action Items**:
- [ ] Document findings in quarterly review summary
- [ ] Create DOCCLEAN specs if major cleanup needed
- [ ] Update standards to prevent recurrence
- [ ] Track metrics for next quarter

---

## Code-Change Documentation Guidelines

### When Modifying Existing Code

**Before Making Changes**:
1. Check for `.docs.md` file in code directory
2. Read existing documentation to understand current implementation
3. Plan changes considering documentation impact

**After Making Changes**:
1. Update `.docs.md` with new behavior
2. Add new methods/endpoints to documentation
3. Update code examples if behavior changed
4. Remove obsolete information
5. Update "Last Updated" date

**Commit Requirements**:
- Documentation updates in same commit as code changes
- Commit message should reference documentation updates
- PR description should mention documentation changes

---

### When Creating New Complex Code

**Determine if `.docs.md` is Needed**:

**Create `.docs.md` for**:
- Services with >5 public methods
- Services with complex business logic
- API controllers with >3 endpoints
- Components with complex state management
- Components with >7 props
- Database models with complex relationships
- Utilities with non-obvious behavior

**Skip `.docs.md` for**:
- Simple components (buttons, inputs)
- Trivial utilities (<10 lines)
- Type definitions
- Configuration files
- Test files

**Documentation Creation Process**:
1. Use template from `documentation-standards.md`
2. Include all required sections
3. Provide code examples
4. Link to related documentation
5. Validate with coder-doc-specialist

---

## PR Validation Workflow

### Automated Checks (Future)

**Recommended**: Add these checks to PR workflow:

```yaml
# .github/workflows/doc-validation.yml
name: Documentation Validation

on:
  pull_request:
    paths:
      - 'backend/src/**/*.ts'
      - 'frontend/src/**/*.vue'
      - '**/.docs.md'

jobs:
  validate-docs:
    runs-on: ubuntu-latest
    steps:
      - name: Check for .docs.md on complex code
        run: |
          # Check if complex code has .docs.md
          # Warn if missing
```

---

### Manual Validation (Current)

**coder-doc-specialist Validation**:
1. Review PR changes
2. Identify modified code that should have `.docs.md`
3. Verify `.docs.md` exists and was updated
4. Check documentation quality (required sections)
5. Validate code examples are accurate
6. Approve PR only when documentation is complete

**Agent Reviewer Validation**:
1. Verify `.docs.md` was updated with code changes
2. Check documentation quality during review
3. Request documentation updates if incomplete
4. Reject PRs missing required documentation

---

## Annual Comprehensive Review

**Schedule**: January (start of year)

**Responsible**: planner-doc-specialist + Agent Planner team

**Duration**: ~4 hours

---

### Annual Review Checklist

**1. Structure Evaluation**:
- [ ] Evaluate overall `/docs/` structure
- [ ] Consider reorganization if needed
- [ ] Assess hybrid model effectiveness
- [ ] Review agent feedback on documentation

**2. Standards Evolution**:
- [ ] Review documentation standards
- [ ] Update templates based on usage patterns
- [ ] Incorporate lessons learned
- [ ] Improve examples and guidelines

**3. Metrics Analysis**:
- [ ] Compare metrics year-over-year
- [ ] Track `.docs.md` coverage growth
- [ ] Measure agent satisfaction with documentation
- [ ] Identify trends in documentation issues

**4. Technology Updates**:
- [ ] Review new documentation tools
- [ ] Evaluate automation opportunities
- [ ] Consider AI-powered documentation tools
- [ ] Update processes if beneficial

**5. Archive Management**:
- [ ] Review archive organization
- [ ] Consider sub-archives for very old specs
- [ ] Update archive index
- [ ] Ensure archive is searchable

**6. Planning for Next Year**:
- [ ] Set documentation goals for next year
- [ ] Plan major documentation projects
- [ ] Schedule quarterly reviews
- [ ] Assign maintenance responsibilities

---

## Documentation Metrics Dashboard

### Metrics to Track

**Quarterly Metrics**:
```markdown
| Metric | Q1 2026 | Q2 2026 | Q3 2026 | Q4 2026 | Target |
|--------|---------|---------|---------|---------|--------|
| Files in /docs/ | 94 | ? | ? | ? | <100 |
| .docs.md files | 6 | ? | ? | ? | Growing |
| Large files (>1K lines) | 0 | 0 | 0 | 0 | 0 |
| Broken links | 0 | 0 | 0 | 0 | 0 |
| Outdated files (>90 days) | X | ? | ? | ? | <10 |
| Archived specs | 44 | ? | ? | ? | Current |
```

**Annual Metrics**:
```markdown
| Metric | 2025 | 2026 | Trend |
|--------|------|------|-------|
| Total /docs/ files | 164 | 94 | ↓ 43% |
| .docs.md coverage | 0% | X% | ↑ |
| Agent satisfaction | ? | ? | ? |
| Documentation issues | ? | ? | ↓ |
```

---

## Roles and Responsibilities

### planner-doc-specialist (Agent Planner)

**Quarterly Responsibilities**:
- Conduct `/docs/` review
- Create cleanup specifications if needed
- Archive implemented feature specs
- Update documentation standards
- Report findings to Agent Planner

**Annual Responsibilities**:
- Lead comprehensive review
- Evaluate documentation structure
- Update standards based on learnings
- Set documentation goals for next year

---

### coder-doc-specialist (Agent Coder)

**Ongoing Responsibilities**:
- Validate `.docs.md` completeness in PRs
- Create `.docs.md` for complex new code
- Update `.docs.md` with code changes
- Validate documentation quality
- Train developers on documentation standards

**Quarterly Responsibilities**:
- Validate `.docs.md` quality across codebase
- Identify services needing documentation
- Create priority list for `.docs.md` creation

---

### Agent Reviewer

**PR Review Responsibilities**:
- Verify `.docs.md` was updated with code changes
- Check documentation quality
- Request documentation updates if incomplete
- Reject PRs missing required documentation

**Feedback Responsibilities**:
- Report documentation issues to planner-doc-specialist
- Suggest documentation improvements
- Validate agent documentation usage

---

## Issue Escalation

### When to Create DOCCLEAN Specs

Create new DOCCLEAN specification when:

1. **`/docs/` exceeds 100 files** - Need to distribute or archive
2. **Found >5 large files (>1,000 lines)** - Need splitting
3. **Major reorganization needed** - Structural issues
4. **Navigation problems identified** - Broken links, confusion
5. **Standards not working** - Need guideline updates

**DOCCLEAN Spec Template**:
```markdown
# DOCCLEAN-XXX: [Title]

**Type**: Documentation Cleanup
**Priority**: Medium
**Status**: Active
**Assigned To**: planner-doc-specialist

## Problem
[Description of issue]

## Scope
[What needs to be done]

## Success Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Execution Order
1. Step 1
2. Step 2
```

---

## Continuous Improvement

### Feedback Loops

**From Agents**:
- Agent Coder: "Can't find documentation for X"
- Agent Reviewer: "Documentation is missing for Y"
- Agent Planner: "Structure is confusing"

**From Developers**:
- "Where should I document this?"
- "This template doesn't work for X"
- "Need guidance on Y"

**Process**:
1. Collect feedback during quarterly reviews
2. Categorize feedback (structure, standards, navigation)
3. Create improvement specifications
4. Implement improvements
5. Measure impact

---

### Experimentation

**Pilot New Approaches**:
- Test new documentation tools
- Experiment with automated validation
- Try new templates or structures
- Measure impact on agent efficiency

**Experiment Framework**:
1. Define hypothesis (e.g., "Automated validation will reduce missing docs")
2. Design experiment (e.g., Add validation script to PR workflow)
3. Run pilot (e.g., Test for 1 month)
4. Measure results (e.g., Did missing docs decrease?)
5. Decide: Adopt, adapt, or abandon

---

## Compliance and Enforcement

### Documentation Must-Haves

**For PRs**:
- [ ] `.docs.md` updated if code is complex
- [ ] New complex code includes `.docs.md`
- [ ] Documentation in English (en-US)
- [ ] Code examples are accurate
- [ ] No broken links in documentation

**For `/docs/` Files**:
- [ ] File in correct location
- [ ] Content not duplicated (link instead)
- [ ] Relative links used
- [ ] "Last Updated" date current
- [ ] File <1,000 lines

**Consequences**:
- PRs rejected if documentation incomplete
- DOCCLEAN spec created if `/docs/` clutter accumulates
- Quarterly review identifies responsibility gaps

---

## Success Indicators

### Positive Indicators

✅ **Documentation is Effective**:
- Agents find docs in <5 seconds
- No complaints about missing docs
- `.docs.md` coverage increases
- Zero broken links
- PRs include documentation updates

✅ **Maintenance is Sustainable**:
- Quarterly reviews completed on schedule
- `/docs/` stays under 100 files
- No accumulation of outdated content
- Standards followed consistently

---

### Warning Signs

⚠️ **Action Needed**:
- Agents can't find documentation
- PRs frequently missing documentation
- `/docs/` growing beyond 100 files
- Broken links accumulating
- Outdated content not archived

**Response**:
- Schedule special review
- Create DOCCLEAN spec
- Reinforce standards
- Provide additional training

---

## Resources

### Documentation
- [Documentation Standards](./documentation-standards.md)
- [Migration Summary](./analysis/documentation-migration-summary-2026-01-21.md)
- [coder-doc-specialist](../agents/coder/sub-agents/coder-doc-specialist.md)
- [planner-doc-specialist](../agents/planner/sub-agents/planner-doc-specialist.md)

### Tools
- [markdown-link-check](https://github.com/gaurav-nelson/github-action-markdown-link-check) - Link validation
- [markdownlint](https://github.com/igorshubovych/markdownlint-cli) - Linting

### Templates
- Feature Spec Template (see documentation-standards.md)
- `.docs.md` Template (see documentation-standards.md)
- DOCCLEAN Spec Template (see this document)

---

## Document Control

**Version**: 1.0
**Created**: 2026-01-21
**Last Updated**: 2026-01-21
**Next Review**: 2026-04-21
**Owner**: planner-doc-specialist (Agent Planner)

---

**Remember**: Good documentation requires ongoing maintenance. These guidelines ensure documentation remains healthy and effective for the long term.

**"Documentation is not a one-time project, it's a continuous process."**
