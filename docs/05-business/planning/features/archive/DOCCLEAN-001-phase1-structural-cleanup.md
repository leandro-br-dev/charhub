# DOCCLEAN-001: Phase 1 - Structural Documentation Cleanup

**Type**: Documentation Migration
**Priority**: High (Immediate)
**Status**: In Review
**Assigned To**: coder-doc-specialist (via Agent Coder)
**Created**: 2026-01-17
**Target Completion**: 2026-01-24
**Pull Request**: [PR #144](https://github.com/leandro-br-dev/charhub/pull/144)

---

## Overview

This is **Phase 1 of 4** in the documentation migration plan. This phase focuses on structural cleanup to align the `docs/` folder with the target architecture defined in `planner-doc-specialist.md`.

**Goal**: Remove orphaned folders and merge misplaced documentation into appropriate locations.

**Impact**: Low risk, high visibility - immediate improvement in documentation structure.

---

## Success Criteria

- [x] `/docs/technical/` folder removed (file handled)
- [ ] `/docs/07-contributing/` folder removed (content merged) - **NOTE: Folder doesn't exist, already migrated**
- [x] `/docs/02-guides/infrastructure/` folder removed (content merged)
- [x] `/docs/02-guides/operations/` folder removed (content moved)
- [x] All cross-references updated
- [x] Main `docs/README.md` updated with new structure
- [x] No broken links in documentation

---

## Task 1: Remove /docs/technical/ Folder

### Current State

```
/docs/technical/
└── comfyui-api-assessment-multi-stage.md (1 file, 9,779 bytes)
```

### Analysis

The `technical/` folder is a single orphaned file containing an assessment of ComfyUI API. This appears to be analysis content that belongs in business analysis, not a standalone technical folder.

### Action Required

**Option A - Move to Analysis** (Recommended):
1. Move `comfyui-api-assessment-multi-stage.md` to `/docs/05-business/analysis/`
2. Verify file is still relevant (dated 2025-01-02)
3. Update any references to this file

**Option B - Delete if Obsolete**:
1. If content is outdated/no longer relevant, delete the file
2. Remove folder

### Verification

```bash
# After completion, verify:
ls /root/projects/charhub-agent-01/docs/technical/
# Should return: No such file or directory
```

---

## Task 2: Merge /docs/07-contributing/ into /docs/02-guides/development/

### Current State

```
/docs/07-contributing/
├── CODE_STYLE.md                 (15,169 bytes)
├── DOCUMENTATION_STANDARDS.md    (14,306 bytes)
├── GIT_WORKFLOW.md               (10,033 bytes)
└── README.md                     (8,515 bytes)
```

### Analysis

The `07-contributing/` folder contains developer guidance that should be part of the development guides. This aligns with the target structure where `02-guides/development/` contains essential development documentation.

### Action Required

1. **Move content to `/docs/02-guides/development/`**:
   ```
   CODE_STYLE.md               → 02-guides/development/code-style.md
   DOCUMENTATION_STANDARDS.md  → 02-guides/development/documentation-standards.md
   GIT_WORKFLOW.md             → 02-guides/development/git-workflow.md
   ```

2. **Consolidate README.md content**:
   - Review `/docs/07-contributing/README.md`
   - Merge relevant content into `/docs/02-guides/development/README.md`
   - Add "Contributing" section if not present

3. **Remove `/docs/07-contributing/` folder** after consolidation

4. **Update references**:
   - Search for `07-contributing` references in all docs
   - Replace with `02-guides/development/`

### File Updates Required

**Update `/docs/02-guides/development/README.md`**:
```markdown
# Development Guide

## Contributing

[Content from 07-contributing/README.md]

## Code Style

See [code-style.md](./code-style.md) for coding standards.

## Git Workflow

See [git-workflow.md](./git-workflow.md) for branch management.

## Documentation Standards

See [documentation-standards.md](./documentation-standards.md) for writing docs.
```

### Verification

```bash
# After completion, verify:
ls /root/projects/charhub-agent-01/docs/07-contributing/
# Should return: No such file or directory

ls /root/projects/charhub-agent-01/docs/02-guides/development/
# Should show: code-style.md, documentation-standards.md, git-workflow.md, README.md, and other existing files

# Check for broken references:
grep -r "07-contributing" /root/projects/charhub-agent-01/docs/
# Should return: No results (or only in this migration spec)
```

---

## Task 3: Merge /docs/02-guides/infrastructure/ into /docs/02-guides/deployment/

### Current State

```
/docs/02-guides/infrastructure/
├── database-connection.md       (11,176 bytes)
├── database-operations.md       (6,500 bytes)
├── ssh-key-setup.md             (4,606 bytes)
└── tag-system-setup.md          (9,549 bytes)
```

### Analysis

Infrastructure setup is inherently part of deployment. These files contain setup procedures that should be consolidated under deployment guides for better organization.

### Action Required

1. **Move all files to `/docs/02-guides/deployment/`**:
   ```bash
   mv docs/02-guides/infrastructure/* docs/02-guides/deployment/
   ```

2. **Update `/docs/02-guides/deployment/README.md`**:
   - Add "Infrastructure Setup" section
   - Link to moved files:
     - Database setup: `database-connection.md`, `database-operations.md`
     - Access setup: `ssh-key-setup.md`
     - Feature setup: `tag-system-setup.md`

3. **Remove `/docs/02-guides/infrastructure/` folder**

4. **Update references**:
   - Search for `02-guides/infrastructure` references
   - Replace with `02-guides/deployment/`

### File Updates Required

**Update `/docs/02-guides/deployment/README.md`**:
```markdown
# Deployment Guide

## Infrastructure Setup

Before deploying, ensure infrastructure is properly configured:

### Database
- [Database Connection](./database-connection.md) - Configure database access
- [Database Operations](./database-operations.md) - Common database operations

### Access & Security
- [SSH Key Setup](./ssh-key-setup.md) - Configure SSH access

### Feature Configuration
- [Tag System Setup](./tag-system-setup.md) - Configure tag system

## Deployment Procedures
[Existing deployment content...]
```

### Verification

```bash
# After completion, verify:
ls /root/projects/charhub-agent-01/docs/02-guides/infrastructure/
# Should return: No such file or directory

ls /root/projects/charhub-agent-01/docs/02-guides/deployment/
# Should show: all infrastructure files + existing deployment files

grep -r "02-guides/infrastructure" /root/projects/charhub-agent-01/docs/
# Should return: No results
```

---

## Task 4: Move /docs/02-guides/operations/ to /docs/06-operations/

### Current State

```
/docs/02-guides/operations/
├── COMFYUI_MIDDLEWARE_TEST_RESULTS.md     (5,889 bytes)
├── MIDDLEWARE_V2_MIGRATION_COMPLETE.md    (4,621 bytes)
├── comfyui-setup.md                       (11,152 bytes)
└── r2-cors-configuration.md               (4,781 bytes)

/docs/06-operations/
├── README.md
├── quality-dashboard.md
└── incident-response/
    ├── (7 incident-related files)
```

### Analysis

Operational procedures should be under `06-operations/`. These files contain operational documentation that belongs with the other operations content.

### Action Required

1. **Move all files to `/docs/06-operations/`**:
   ```bash
   mv docs/02-guides/operations/* docs/06-operations/
   ```

2. **Create subsections in `/docs/06-operations/`** (optional, if organization needed):
   - Create `comfyui/` subfolder for ComfyUI-related docs
   - Create `maintenance/` subfolder for R2/storage operations

3. **Update `/docs/06-operations/README.md`**:
   - Add references to moved files
   - Organize by operational category

4. **Remove `/docs/02-guides/operations/` folder**

5. **Update references**:
   - Search for `02-guides/operations` references
   - Replace with `06-operations/`

### File Updates Required

**Update `/docs/06-operations/README.md`**:
```markdown
# Operations Guide

## Operational Procedures

### ComfyUI Middleware
- [ComfyUI Setup](./comfyui-setup.md) - Initial ComfyUI configuration
- [Middleware V2 Migration](./MIDDLEWARE_V2_MIGRATION_COMPLETE.md) - Migration notes
- [Middleware Test Results](./COMFYUI_MIDDLEWARE_TEST_RESULTS.md) - Test documentation

### Storage & Infrastructure
- [R2 CORS Configuration](./r2-cors-configuration.md) - Cloudflare R2 setup

## Incident Response
[Existing incident response content...]

## Quality Dashboard
[Existing quality dashboard content...]
```

### Verification

```bash
# After completion, verify:
ls /root/projects/charhub-agent-01/docs/02-guides/operations/
# Should return: No such file or directory

ls /root/projects/charhub-agent-01/docs/06-operations/
# Should show: all operations files + existing ops files

grep -r "02-guides/operations" /root/projects/charhub-agent-01/docs/
# Should return: No results
```

---

## Task 5: Update Main Documentation Navigation

### Update /docs/README.md

After completing Tasks 1-4, update the main documentation index to reflect the new structure:

**Remove references to**:
- `/docs/technical/`
- `/docs/07-contributing/`
- `/docs/02-guides/infrastructure/`
- `/docs/02-guides/operations/`

**Update section to**:

```markdown
### 📖 [02. Guides](./02-guides/)
Step-by-step instructions for common tasks:
- **[Development](./02-guides/development/)** - Local development, code style, Git workflow
- **[Deployment](./02-guides/deployment/)** - Deploy to production, infrastructure setup

### ⚙️ [06. Operations](./06-operations/)
SRE, monitoring, and incident response:
- **[Procedures](./06-operations/)** - ComfyUI, R2, maintenance tasks
- **[Incident Response](./06-operations/incident-response/)** - Runbooks and postmortems
- **[Quality Dashboard](./06-operations/quality-dashboard.md)** - Metrics and KPIs
```

---

## Task 6: Verify All Cross-References

### Final Verification Steps

1. **Check for broken internal links**:
   ```bash
   # Search for references to removed folders
   grep -r "technical/" docs/ --exclude-dir=.git
   grep -r "07-contributing/" docs/ --exclude-dir=.git
   grep -r "02-guides/infrastructure/" docs/ --exclude-dir=.git
   grep -r "02-guides/operations/" docs/ --exclude-dir=.git
   ```

2. **Update any found references** to point to new locations

3. **Test key documentation paths**:
   - `/docs/README.md` - should load without errors
   - `/docs/02-guides/development/README.md` - should reference merged content
   - `/docs/02-guides/deployment/README.md` - should reference merged infrastructure docs
   - `/docs/06-operations/README.md` - should reference moved operations docs

---

## Execution Order

**Execute tasks in this order**:

1. Task 1 (Remove `/docs/technical/`) - 5 minutes
2. Task 2 (Merge `/docs/07-contributing/`) - 15 minutes
3. Task 3 (Merge `/docs/02-guides/infrastructure/`) - 10 minutes
4. Task 4 (Move `/docs/02-guides/operations/`) - 10 minutes
5. Task 5 (Update main README) - 10 minutes
6. Task 6 (Verify cross-references) - 15 minutes

**Total Estimated Time**: ~65 minutes

---

## Notes

- **Commit Strategy**: Create one commit per task for easy rollback if needed
- **Branch**: Use `feature/docclean-001-phase1-structural-cleanup` branch
- **Testing**: After each task, verify documentation builds/renders correctly
- **Communication**: Update team in #dev-docs channel before starting

---

## Post-Completion Actions

After completion:

1. **Update this spec** - Mark all tasks as complete
2. **Move to `/docs/05-business/planning/features/archive/`**
3. **Create Phase 2 spec** for distributing component documentation
4. **Update `/docs/05-business/analysis/documentation-migration-analysis-2026-01-17.md`** with progress

---

## References

- [Full Migration Analysis](/root/projects/charhub-agent-01/docs/05-business/analysis/documentation-migration-analysis-2026-01-17.md)
- [planner-doc-specialist.md](/root/projects/charhub-agent-01/docs/agents/planner/sub-agents/planner-doc-specialist.md)
- [Target docs/ structure](/root/projects/charhub-agent-01/docs/agents/planner/sub-agents/planner-doc-specialist.md#target-docs-structure)

---

**Phase 1 of 4** | Next: [DOCCLEAN-002: Phase 2 - Distribute Component Documentation](#) (to be created)

---

## Implementation Progress

**Started**: 2026-01-21
**Completed**: 2026-01-21
**Total Commits**: 5

### Completed Tasks

✅ **Task 1: Move /docs/technical/ files to /docs/05-business/analysis/**
- Moved 3 files:
  - `comfyui-api-assessment-multi-stage.md`
  - `docker-space-analysis.md`
  - `docker-space-management.md`
- Removed `/docs/technical/` folder
- Commit: `13e75d1`

✅ **Task 2: Merge /docs/02-guides/infrastructure/ into /docs/02-guides/deployment/**
- Moved 4 files:
  - `database-connection.md`
  - `database-operations.md`
  - `ssh-key-setup.md`
  - `tag-system-setup.md`
- Updated `deployment/README.md` with Infrastructure Setup section
- Removed `/docs/02-guides/infrastructure/` folder
- Commit: `73e7094`

✅ **Task 3: Move /docs/02-guides/operations/ to /docs/06-operations/**
- Moved 4 files:
  - `COMFYUI_MIDDLEWARE_TEST_RESULTS.md`
  - `MIDDLEWARE_V2_MIGRATION_COMPLETE.md`
  - `comfyui-setup.md`
  - `r2-cors-configuration.md`
- Updated `06-operations/README.md` with Operational Guides section
- Removed `/docs/02-guides/operations/` folder
- Commit: `89aedc7`

✅ **Task 4: Update /docs/README.md**
- Removed references to `technical/`, `infrastructure/`, and `operations/` folders
- Updated 06-operations section to include Operational Guides
- Commit: `86fe630`

✅ **Task 5: Fix Cross-References**
- Updated references in:
  - `scripts/README.md`
  - `docs/03-reference/scripts/backup-restore-guide.md`
  - `docs/03-reference/backend/README.md`
  - `docs/06-operations/MIDDLEWARE_V2_MIGRATION_COMPLETE.md`
- Commit: `6b8036e`

### Notes

- `/docs/07-contributing/` folder does not exist (already migrated previously)
- All documentation links verified and working
- No broken links found in documentation
