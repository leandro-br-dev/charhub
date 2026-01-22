# CharHub Documentation Standards

**Version**: 2.0
**Last Updated**: 2026-01-21
**Status**: Active

---

## Philosophy

CharHub uses a **hybrid documentation approach** optimized for both humans and AI agents:

1. **Central Documentation** (`/docs/`) - Core project knowledge
2. **Distributed Documentation** (`.docs.md`) - Code-specific documentation

This hybrid model ensures:
- AI agents find relevant documentation immediately when accessing code
- Reduced noise in central documentation folders
- Easier maintenance (docs stay with the code they describe)
- Better discoverability for both humans and AI

---

## Documentation Structure

### Central Documentation (`/docs/`)

Contains **core project knowledge** that applies to the entire system:

```
docs/
├── 01-getting-started/     # Quick start, onboarding, installation
├── 02-guides/              # How-to guides (development, deployment)
├── 03-reference/           # Cross-cutting patterns, i18n, API patterns
├── 04-architecture/        # System architecture (primary role)
├── 05-business/            # Business rules, planning, metrics, analysis
├── 06-operations/          # SRE, monitoring, incidents
└── agents/                 # Agent configuration and guidelines
```

**What goes in `/docs/`**:
- Architecture decisions and system design
- Business rules and feature specifications
- Cross-cutting patterns (i18n, API design, testing)
- Getting started guides and onboarding
- Agent configuration and workflows
- Operational procedures and SRE practices
- Feature specifications (active, backlog)
- Analysis and planning documents

**What does NOT go in `/docs/`**:
- Service-specific documentation (use `.docs.md`)
- Component-specific documentation (use `.docs.md`)
- API endpoint documentation (use `.docs.md`)
- Implementation details (use `.docs.md`)
- Code-specific patterns (use `.docs.md`)

### Distributed Documentation (`.docs.md`)

Located **alongside the code** they describe:

```
backend/src/services/tag-system/.docs.md
backend/src/services/payments/.docs.md
backend/src/controllers/characters/.docs.md
frontend/src/components/CharacterCard/.docs.md
frontend/src/composables/useCharacterActions/.docs.md
```

**What gets `.docs.md` files**:
- Complex services (business logic, multiple methods, state management)
- API controllers (endpoints, validation, request/response formats)
- Complex components (state management, props, events, slots)
- Feature modules (multi-file features, complex interactions)
- Database models (complex relationships, validation)
- Composables with complex logic
- Utilities with non-obvious behavior

**What does NOT get `.docs.md` files**:
- Simple components (buttons, inputs, basic UI elements)
- Trivial utilities (single-purpose functions)
- Type definitions (unless complex with validation logic)
- Configuration files
- Test files
- Mock data files

---

## Documentation Standards

### 1. Naming Conventions

**Central Documentation**:
- Use kebab-case: `feature-name.md`, `how-to-guide.md`
- Be descriptive: `stripe-payment-integration.md` (not `payments.md`)
- Include context: `character-generation-correction-system.md` (not `correction-system.md`)

**Distributed Documentation**:
- Always named exactly `.docs.md`
- Located in code folder: `service-folder/.docs.md`
- One `.docs.md` per logical unit (service, component, module)

**Feature Specifications**:
- Format: `FEATURE-XXX-descriptive-name.md`
- Example: `FEATURE-011-character-generation-correction-system.md`
- Maintained in `/docs/05-business/planning/features/active/`

### 2. Structure Templates

#### For Feature Specifications

**Location**: `/docs/05-business/planning/features/active/`

```markdown
# FEATURE-XXX: Feature Name

**Type**: Feature/Refactor/Bug Fix/Documentation
**Priority**: High/Medium/Low
**Status**: Draft/Active/In Review/Implemented
**Assigned To**: Agent Name
**Created**: YYYY-MM-DD
**Target Completion**: YYYY-MM-DD

---

## Overview

[Brief description of what this feature does and why it's needed]

## Success Criteria

- [ ] Criteria 1 (measurable)
- [ ] Criteria 2 (measurable)
- [ ] Criteria 3 (measurable)

---

## Tasks

### Task 1: Title

**Status**: Pending/In Progress/Complete

**Description**:
[What needs to be done]

**Acceptance Criteria**:
- [ ] Criterion 1
- [ ] Criterion 2

**Files to Modify**:
- `path/to/file1.ts`
- `path/to/file2.vue`

---

## Execution Order

1. Task 1 (Description) - Estimated time
2. Task 2 (Description) - Estimated time
3. Task 3 (Description) - Estimated time

---

## Notes

[Important context, dependencies, risks, or considerations]

---

## References

- [Related Documentation](./path/to/docs.md)
- [Related Architecture](../../../04-architecture/system-overview.md)
- [Issue/PR Link](https://github.com/...)
```

#### For `.docs.md` Files

**Location**: Next to the code they describe

```markdown
# [Service/Component] Name

**Last Updated**: YYYY-MM-DD
**Maintainer**: [Team/Agent responsible]

---

## Overview

[Brief description of what this code does and why it exists]

**Purpose**: [What problem does it solve?]
**Responsibilities**: [What is it responsible for?]

---

## Architecture

[How it's structured]

**Key Components**:
- Component 1: [Description]
- Component 2: [Description]

**Data Flow**:
[Description of how data flows through the code]

**State Management**:
[How state is managed, if applicable]

---

## API / Interface

[Public methods, props, endpoints]

### Methods/Functions

#### `methodName(params)`

**Parameters**:
- `param1` (Type): Description
- `param2` (Type): Description

**Returns**: Type - Description

**Throws**: ErrorType - When it happens

**Example**:
```typescript
const result = methodName(param1, param2);
```

### Props (for Vue Components)

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| propName | Type | Yes/No | defaultValue | Description |

### Events (for Vue Components)

| Event | Payload | Description |
|-------|---------|-------------|
| event-name | Type | Description |

### API Endpoints (for Controllers)

#### `METHOD /path/to/endpoint`

**Description**: What this endpoint does

**Authentication**: Required/Optional

**Request**:
```json
{
  "field1": "value1",
  "field2": "value2"
}
```

**Response**: `200 OK`
```json
{
  "data": { ... }
}
```

**Errors**:
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions

---

## Dependencies

[What this code depends on]

**Internal**:
- `ServiceName` - For what purpose
- `UtilityName` - For what purpose

**External**:
- `package-name` - For what purpose
- `API Name` - For what purpose

---

## Usage Examples

[Real code examples showing common usage patterns]

### Example 1: Basic Usage

```typescript
// Code example showing basic usage
```

### Example 2: Advanced Usage

```typescript
// Code example showing advanced usage
```

---

## Testing

[How to test this code]

**Unit Tests**:
- Test file location: `path/to/test.spec.ts`
- Run command: `npm test -- test.spec.ts`
- Coverage target: 80%+

**Integration Tests**:
- Test file location: `path/to/integration.spec.ts`
- Run command: `npm run test:integration`

**Manual Testing**:
1. Step 1
2. Step 2
3. Expected result

---

## Important Notes

[Gotchas, edge cases, performance considerations, etc.]

- **Performance**: [Any performance considerations]
- **Edge Cases**: [Known edge cases and how to handle]
- **Gotchas**: [Common mistakes to avoid]
- **Future Improvements**: [Potential improvements]

---

## Related Documentation

- [Related Service](../other-service/.docs.md)
- [Architecture Overview](../../../docs/04-architecture/system-overview.md)
- [API Standards](../../../docs/03-reference/backend/api-standards.md)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| YYYY-MM-DD | Initial documentation | Agent Name |
| YYYY-MM-DD | Added new method X | Agent Name |
```

#### for Central Documentation Files

**General structure for `/docs/` files**:

```markdown
# Document Title

**Last Updated**: YYYY-MM-DD
**Version**: X.X

---

## Overview

[Brief description of what this document covers]

---

## Main Content

[Organize with clear headings and subheadings]

### Section 1

[Content]

### Section 2

[Content]

---

## Examples

[Code examples or diagrams if helpful]

---

## References

[Links to related documentation]

---

## Related Files

- [Related Doc](./related-file.md)
- [Related Service](../../backend/src/services/service/.docs.md)
```

### 3. Content Guidelines

**DO**:
- Write in English (en-US) for all documentation
- Use clear, concise language
- Include code examples for complex concepts
- Keep documentation up-to-date with code changes
- Use relative links for internal references
- Include diagrams for complex flows (using Mermaid or ASCII art)
- Add "Last Updated" dates to allow tracking freshness
- Use tables for structured data (API parameters, props, etc.)
- Include file paths when referencing specific code
- Provide context for architectural decisions

**DON'T**:
- Duplicate information across multiple docs (link instead)
- Write overly verbose documentation (be concise)
- Include obsolete information (remove or archive)
- Use absolute paths for links (use relative paths)
- Document the obvious (focus on non-obvious behavior)
- Create documentation that will immediately become outdated
- Use jargon without explanation
- Assume the reader has full context (provide background)

### 4. Link Guidelines

**Internal Links** (within `/docs/`):
```markdown
[Link text](./relative-path.md)
[Link text](../other-section/file.md)
[Link text](../../04-architecture/system-overview.md)
```

**Links to Distributed Docs** (from `/docs/`):
```markdown
[Service Name](../../backend/src/services/tag-system/.docs.md)
[Component Docs](../../frontend/src/components/CharacterCard/.docs.md)
```

**Links from Distributed Docs** (to `/docs/`):
```markdown
[Related Architecture](../../../docs/04-architecture/system-overview.md)
[API Standards](../../../docs/03-reference/backend/api-standards.md)
```

**Links Between Distributed Docs**:
```markdown
[Related Service](../other-service/.docs.md)
[Parent Component](../parent-component/.docs.md)
```

**External Links**:
```markdown
[External Documentation](https://example.com/docs)
```

**Link Best Practices**:
- Use descriptive link text (not "click here")
- Test links after creating them
- Update links when moving files
- Use reference-style links for repeated URLs

---

## Maintenance Guidelines

### When to Update Documentation

**Before** making code changes:
1. Read existing `.docs.md` file (if exists)
2. Understand current implementation and design decisions
3. Plan changes considering documentation impact

**After** making code changes:
1. Update `.docs.md` with new behavior
2. Add new methods/endpoints/components to documentation
3. Update examples if behavior changed
4. Remove obsolete information
5. Update "Last Updated" date

**When creating new code**:
1. Create `.docs.md` if code is complex (see criteria above)
2. Document the "why" not just the "what"
3. Include usage examples
4. Link to related documentation

### Documentation Review Process

**For Features** (Agent Coder workflow):
1. Agent Coder creates/updates `.docs.md` when implementing complex code
2. coder-doc-specialist validates documentation before PR creation
3. Agent Reviewer verifies documentation during PR review
4. Documentation must be complete for PR approval

**For `/docs/` Maintenance** (planner-doc-specialist workflow):
1. planner-doc-specialist reviews `/docs/` quarterly
2. Identifies outdated or redundant content
3. Creates cleanup specifications as needed (DOCCLEAN specs)
4. Archives implemented feature specs

**For Distributed Documentation**:
1. Review `.docs.md` when modifying code
2. Update documentation in same PR as code changes
3.coder-doc-specialist checks for missing documentation during PR review

### Documentation Quality Checklist

**For `.docs.md` Files**:
- [ ] Overview section explains "what" and "why"
- [ ] Architecture/structure is described clearly
- [ ] API/interface is fully documented
- [ ] Dependencies are listed
- [ ] Usage examples are provided and accurate
- [ ] Testing instructions are included
- [ ] No broken internal links
- [ ] Code examples are accurate and runnable
- [ ] "Last Updated" date is current
- [ ] File is in correct location (next to code)

**For `/docs/` Files**:
- [ ] File is in correct section (01-06 or agents)
- [ ] Content is not duplicated elsewhere (link instead)
- [ ] Links use relative paths
- [ ] File is <1,000 lines (unless necessary for completeness)
- [ ] Language is English (en-US)
- [ ] Clear headings and structure
- [ ] Examples are provided where helpful
- [ ] "Last Updated" date is current

**For Feature Specifications**:
- [ ] All required sections are complete
- [ ] Success criteria are measurable
- [ ] Tasks are clearly defined
- [ ] Execution order is logical
- [ ] Dependencies are documented
- [ ] Status is kept up-to-date

---

## Tools and Automation

### Validation Scripts

**Check for broken links**:
```bash
# From project root
grep -r "\](.*\.md)" docs/ --include="*.md" | grep -v "node_modules"
# Use markdown-link-check for automated validation
npm install -g markdown-link-check
markdown-link-check docs/**/*.md
```

**Find orphaned files** (no incoming links):
```bash
# Use tools to find files not linked from anywhere
grep -r "filename.md" docs/ --include="*.md" | wc -l
# If count is 0, file might be orphaned
```

**Find large files**:
```bash
find docs/ -name "*.md" -exec wc -l {} \; | sort -rn | head -20
```

**Count documentation files**:
```bash
# Count central docs
find docs/ -name "*.md" | wc -l

# Count distributed docs
find . -name ".docs.md" | wc -l
```

**Search for outdated documentation**:
```bash
# Find files not updated in last 90 days
find docs/ -name "*.md" -mtime +90
```

### Documentation Metrics

Track these metrics quarterly:
1. Total files in `/docs/` (target: <100)
2. Total `.docs.md` files (measure growth)
3. Files >1,000 lines (target: 0)
4. Orphaned files (target: 0)
5. Broken links (target: 0)
6. Files not updated in 90+ days (review needed)

---

## Documentation Roles and Responsibilities

### Agent Planner (planner-doc-specialist)
- **Owner** of `/docs/` structure and organization
- Creates cleanup specifications (DOCCLEAN specs)
- Reviews `/docs/` quarterly for outdated content
- Maintains documentation standards
- Archives implemented feature specifications

### Agent Coder (coder-doc-specialist)
- **Owner** of distributed documentation (`.docs.md`)
- Creates `.docs.md` for complex code
- Validates documentation completeness before PRs
- Ensures code changes include documentation updates
- Reviews agent documentation guidelines

### Agent Reviewer
- Verifies documentation is complete during PR review
- Rejects PRs with incomplete documentation
- Ensures `.docs.md` files are updated with code changes
- Validates documentation quality before merge

### Agent Designer
- Creates `.docs.md` for complex UI components
- Documents design decisions and patterns
- Provides UX context in documentation

---

## Common Documentation Patterns

### For Services

```markdown
# Service Name

## Overview
[What the service does]

## Architecture
[How it's organized]

## API
[Public methods]

## Dependencies
[What it depends on]

## Usage
[Examples]

## Testing
[How to test]
```

### For Components

```markdown
# Component Name

## Overview
[What the component does]

## Props
[Props table]

## Events
[Events table]

## Slots
[Slots documentation]

## Usage
[Examples]

## Styling
[CSS classes, theming]
```

### For API Controllers

```markdown
# Controller Name

## Overview
[What the controller handles]

## Endpoints
[Endpoint documentation]

## Authentication
[Auth requirements]

## Validation
[Validation rules]

## Error Handling
[Error responses]
```

---

## Troubleshooting Documentation Issues

### Problem: Documentation is Outdated

**Solution**:
1. Check "Last Updated" date
2. Compare with code changes
3. Update documentation in next code change
4. If critical, create dedicated documentation update PR

### Problem: Can't Find Documentation

**Solution**:
1. Check code folder for `.docs.md`
2. Check `/docs/04-architecture/` for system design
3. Check `/docs/03-reference/` for patterns
4. Use grep to search keywords: `grep -r "keyword" docs/`

### Problem: Documentation is Too Long

**Solution**:
1. Split into multiple files
2. Move details to `.docs.md`
3. Keep overview in `/docs/`
4. Use links to connect files

### Problem: Duplicate Information

**Solution**:
1. Keep information in primary location
2. Link to primary location from other docs
3. Remove duplicated content
4. Update all links to point to primary location

---

## Migration Summary

**Completed**: 2026-01-21

**Phase 1** (DOCCLEAN-001): Structural Cleanup
- Removed `/docs/technical/`
- Merged `/docs/07-contributing/` into `development/`
- Merged `/docs/02-guides/infrastructure/` into `deployment/`
- Moved `/docs/02-guides/operations/` to `/docs/06-operations/`

**Phase 2** (DOCCLEAN-002): Distributed Documentation
- Moved backend service docs to code folders
- Moved API docs to code folders
- Distributed frontend component docs

**Phase 3** (DOCCLEAN-003): Archive and Cleanup
- Archived 37 implemented feature specs
- Split large files
- Consolidated README files

**Phase 4** (DOCCLEAN-004): Standards and Validation
- Created comprehensive documentation standards
- Validated all navigation paths
- Verified AI agent effectiveness
- Created migration summary

**Results**:
- Files in `/docs/`: Reduced from 164 to ~94 (-43%)
- Distributed `.docs.md` files: 6 created (growing with new code)
- Archived specs: 37
- Large files (>1,000 lines): 0

---

## Questions?

See:
- [coder-doc-specialist](../../agents/coder/sub-agents/coder-doc-specialist.md) - Distributed documentation
- [planner-doc-specialist](../../agents/planner/sub-agents/planner-doc-specialist.md) - Central documentation
- [Documentation Migration Analysis](./analysis/documentation-migration-analysis-2026-01-17.md) - Migration details
- [Documentation Migration Summary](./analysis/documentation-migration-summary-2026-01-21.md) - Complete migration report

---

**Document Version**: 2.0
**Last Reviewed**: 2026-01-21
**Next Review**: 2026-04-21 (Quarterly)
