# DOCCLEAN-002: Phase 2 - Distribute Component Documentation

**Type**: Documentation Migration
**Priority**: High
**Status**: Active (Pending DOCCLEAN-001 completion)
**Assigned To**: Agent Coder (via coder-doc-specialist)
**Created**: 2026-01-21
**Target Completion**: 2026-01-28

---

## Overview

This is **Phase 2 of 4** in the documentation migration plan. This phase focuses on moving feature-specific documentation from `/docs/` to distributed locations alongside the code they describe.

**Goal**: Enable AI agents to find documentation immediately when accessing code folders by placing `.docs.md` files directly alongside the code they describe.

**Impact**: Medium risk, high value - significantly improves AI agent efficiency and code discoverability.

---

## Success Criteria

- [ ] Backend service docs moved to service folders (4 services)
- [ ] API docs moved to respective API route folders (2 docs)
- [ ] Frontend component docs distributed (1 doc)
- [ ] All distributed docs follow `.docs.md` naming convention
- [ ] Central `/docs/03-reference/` updated to reference distributed locations
- [ ] All cross-references updated
- [ ] coder-doc-specialist guidelines validated

---

## Task 1: Backend Service Documentation Distribution

### Current State

```
/docs/03-reference/backend/
├── tags-system.md          (3,245 bytes)
├── payments-guide.md       (8,912 bytes)
├── credits-guide.md        (6,123 bytes)
└── translation-system.md   (4,567 bytes)
```

### Target Structure

```
backend/src/services/tag-system/.docs.md
backend/src/services/payments/.docs.md
backend/src/services/credits/.docs.md
backend/src/services/translation/.docs.md
```

### Action Required

**For each service documentation**:

1. **Create service folder** (if doesn't exist):
   ```bash
   mkdir -p backend/src/services/tag-system
   mkdir -p backend/src/services/payments
   mkdir -p backend/src/services/credits
   mkdir -p backend/src/services/translation
   ```

2. **Move documentation to `.docs.md`**:
   ```bash
   mv docs/03-reference/backend/tags-system.md backend/src/services/tag-system/.docs.md
   mv docs/03-reference/backend/payments-guide.md backend/src/services/payments/.docs.md
   mv docs/03-reference/backend/credits-guide.md backend/src/services/credits/.docs.md
   mv docs/03-reference/backend/translation-system.md backend/src/services/translation/.docs.md
   ```

3. **Update `.docs.md` structure** to follow coder-doc-specialist template:
   ```markdown
   # Service Name

   ## Overview
   [Brief description of what this service does]

   ## Architecture
   [How the service is structured]

   ## API/Methods
   [List of public methods and their purposes]

   ## Dependencies
   [What this service depends on]

   ## Usage Examples
   [Code examples]

   ## Testing
   [How to test this service]
   ```

4. **Update `/docs/03-reference/backend/README.md`**:
   - Add reference to distributed documentation
   - Remove moved files from listing

### Verification

```bash
# After completion, verify:
ls backend/src/services/tag-system/.docs.md
ls backend/src/services/payments/.docs.md
ls backend/src/services/credits/.docs.md
ls backend/src/services/translation/.docs.md

# Should return: All files exist
```

---

## Task 2: API Documentation Distribution

### Current State

```
/docs/03-reference/api/
├── llm-tools.md            (2,345 bytes)
└── llm-providers.md        (3,456 bytes)
```

### Target Structure

```
backend/src/api/llm/.docs.md          (for llm-tools.md)
backend/src/services/llm/.docs.md     (for llm-providers.md)
```

### Action Required

1. **Determine correct location**:
   - `llm-tools.md` → If describes API endpoints, move to `backend/src/api/llm/.docs.md`
   - `llm-providers.md` → If describes service integration, move to `backend/src/services/llm/.docs.md`

2. **Move documentation**:
   ```bash
   # Adjust paths based on actual code structure
   mv docs/03-reference/api/llm-tools.md backend/src/api/llm/.docs.md
   mv docs/03-reference/api/llm-providers.md backend/src/services/llm/.docs.md
   ```

3. **Update documentation structure** to match coder-doc-specialist template

### Verification

```bash
# Verify files exist in code folders
ls backend/src/api/llm/.docs.md
ls backend/src/services/llm/.docs.md
```

---

## Task 3: Frontend Documentation Distribution

### Current State

```
/docs/03-reference/frontend/
└── README.md              (5,678 bytes - component overview)
```

### Target Structure

```
# Distribute content to relevant component folders
frontend/src/components/[component-name]/.docs.md
```

### Action Required

1. **Analyze frontend README.md**:
   - Identify components that need documentation
   - Determine which components are complex enough to warrant `.docs.md`

2. **Create `.docs.md` for complex components**:
   - Only for components with:
     - Complex state management
     - Multiple props/events
     - Non-obvious behavior
     - Integration with services

3. **Update `/docs/03-reference/frontend/README.md`**:
   - Transform into overview/index
   - Reference distributed component documentation
   - Keep only general frontend patterns

### Verification

```bash
# Check that complex components have .docs.md
find frontend/src/components -name ".docs.md" | wc -l
# Should return: Count of complex components
```

---

## Task 4: Update Central Reference Documentation

### Action Required

**Update `/docs/03-reference/README.md`**:

```markdown
# Reference Documentation

## Backend Reference

Backend documentation is now distributed alongside code:

- **[Tag System](../../backend/src/services/tag-system/.docs.md)** - Tag management service
- **[Payments](../../backend/src/services/payments/.docs.md)** - Payment processing
- **[Credits](../../backend/src/services/credits/.docs.md)** - Credit system
- **[Translation](../../backend/src/services/translation/.docs.md)** - Translation service

## API Reference

API documentation is distributed:

- **[LLM Tools](../../backend/src/api/llm/.docs.md)** - LLM API endpoints
- **[LLM Providers](../../backend/src/services/llm/.docs.md)** - LLM provider integrations

## Frontend Reference

Component documentation is distributed:

- See individual component folders for `.docs.md` files
- Check [Frontend README](./frontend/README.md) for patterns

## Other Reference

- **[Infrastructure](./infra/)** - Infrastructure documentation
- **[Scripts](./scripts/)** - Automation scripts
- **[Workflows](./workflows/)** - CI/CD workflows
```

---

## Task 5: Validate coder-doc-specialist Guidelines

### Action Required

1. **Test coder-doc-specialist template**:
   - Use template on one migrated documentation
   - Verify completeness
   - Adjust template if needed

2. **Create validation checklist**:
   ```markdown
   ## Documentation Validation Checklist

   For each `.docs.md` file, verify:
   - [ ] Overview section present
   - [ ] Architecture/structure described
   - [ ] API/methods documented
   - [ ] Dependencies listed
   - [ ] Usage examples provided
   - [ ] Testing instructions included
   - [ ] No broken links
   - [ ] Code examples are accurate
   ```

3. **Document lessons learned** in this feature spec

---

## Task 6: Update Cross-References

### Action Required

1. **Search for references to moved docs**:
   ```bash
   grep -r "03-reference/backend/tags-system" docs/
   grep -r "03-reference/backend/payments-guide" docs/
   grep -r "03-reference/api/llm-tools" docs/
   ```

2. **Update all references** to point to new distributed locations

3. **Verify no broken links** in documentation

---

## Execution Order

**Execute tasks in this order**:

1. Task 1 (Backend services) - 30 minutes
2. Task 2 (API docs) - 15 minutes
3. Task 3 (Frontend docs) - 20 minutes
4. Task 4 (Update central reference) - 10 minutes
5. Task 5 (Validate guidelines) - 15 minutes
6. Task 6 (Update cross-references) - 10 minutes

**Total Estimated Time**: ~100 minutes

---

## Notes

- **Commit Strategy**: Create one commit per major area (backend, API, frontend) for easy rollback
- **Branch**: Use `feature/docclean-002-phase2-distribute-component-documentation` branch
- **Dependencies**: Requires DOCCLEAN-001 to be completed first
- **Communication**: Coordinate with backend-developer and frontend-specialist sub-agents

---

## Post-Completion Actions

After completion:

1. **Update this spec** - Mark all tasks as complete
2. **Create summary** of distributed documentation locations
3. **Train agents** - Ensure backend-developer and frontend-specialist know to check `.docs.md` before modifying code
4. **Update coder-doc-specialist** guidelines if needed
5. **Move to `/docs/05-business/planning/features/implemented/`**

---

## References

- [Full Migration Analysis](/root/projects/charhub-agent-02/docs/05-business/analysis/documentation-migration-analysis-2026-01-17.md)
- [coder-doc-specialist Guidelines](/root/projects/charhub-agent-02/docs/agents/coder/sub-agents/coder-doc-specialist.md)
- [DOCCLEAN-001: Phase 1](./DOCCLEAN-001-phase1-structural-cleanup.md)

---

**Phase 2 of 4** | Previous: [DOCCLEAN-001](./DOCCLEAN-001-phase1-structural-cleanup.md) | Next: [DOCCLEAN-003: Phase 3](./DOCCLEAN-003-phase3-archive-cleanup.md) (to be created)
