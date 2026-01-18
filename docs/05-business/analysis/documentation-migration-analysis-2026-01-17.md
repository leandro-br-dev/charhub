# Documentation Migration Analysis

**Date**: 2026-01-17
**Agent**: planner-doc-specialist (via Agent Planner)
**Status**: Analysis Complete - Awaiting Execution Plan

---

## Executive Summary

The current documentation structure contains **164 markdown files** across 38 directories, with significant structural issues that impede maintainability and clarity.

**Key Findings:**
- **42% of files (69 docs)** are feature specifications in `/docs/05-business/planning/features/`
- **10 files exceed 1,000 lines** - urgently need splitting
- **3 folders outside target structure** (`technical/`, `07-contributing/`, `02-guides/infrastructure/`, `02-guides/operations/`)
- **15 README.md files** scattered throughout - need consolidation
- **70+ files should migrate** to distributed code locations

**Target Reduction**: ~70 files (40% reduction) through strategic migration and cleanup

---

## Current vs Target Structure

### Current Structure (Problematic)

```
docs/ (164 files, 38 folders)
├── 01-getting-started/          # 4 files
├── 02-guides/                   # 17 files
│   ├── deployment/              # 3 files
│   ├── development/             # 6 files
│   ├── infrastructure/          # 4 files  ❌ NOT in target
│   └── operations/              # 4 files  ❌ NOT in target
├── 03-reference/                # 11 files
│   ├── api/                     # 2 files
│   ├── backend/                 # 5 files  ❌ Should be distributed
│   ├── frontend/                # 1 file   ❌ Should be distributed
│   ├── infra/                   # 1 file
│   ├── scripts/                 # 1 file
│   └── workflows/               # 1 file
├── 04-architecture/             # 4 files  ✅ Good
├── 05-business/                 # 69+ files
│   ├── analysis/                # 5 files
│   ├── planning/
│   │   └── features/
│   │       ├── active/          # 3 files
│   │       ├── backlog/         # 7 files
│   │       └── implemented/     # 37 files  ❌ Should be archived
│   ├── metrics/                 # 1 file
│   └── roadmap/                 # 3 files
├── 06-operations/               # 3 files
│   └── incident-response/       # 7 files
├── 07-contributing/             # 4 files  ❌ NOT in target
├── agents/                      # 30+ files ✅ Keep
└── technical/                   # 1 file   ❌ NOT in target
```

### Target Structure (Simplified)

```
docs/ (~94 files, focused)
├── 01-getting-started/          # Quick start only
├── 02-guides/                   # Streamlined essential guides
│   ├── development/
│   └── deployment/
├── 03-reference/                # Cross-cutting patterns only
│   ├── backend/
│   ├── frontend/
│   └── api/
├── 04-architecture/             # Core architecture (primary role)
├── 05-business/                 # Business rules (primary role)
├── 06-operations/               # Streamlined operational docs
└── agents/                      # Agent configuration (primary role)
```

---

## Critical Issues by Priority

### Priority 1: Structural Issues (Fix Immediately)

#### 1. Folders Outside Target Structure

| Folder | Files | Action Required |
|--------|-------|-----------------|
| `/docs/technical/` | 1 file | **REMOVE** - Single orphaned file, move to appropriate location or delete |
| `/docs/07-contributing/` | 4 files | **MERGE** - Move essential content to `/docs/02-guides/development/` |
| `/docs/02-guides/infrastructure/` | 4 files | **MERGE** - Move to `/docs/02-guides/deployment/` |
| `/docs/02-guides/operations/` | 4 files | **MERGE** - Move to `/docs/06-operations/` |

#### 2. Large Files Requiring Split

| File | Lines | Action |
|------|-------|--------|
| `backlog/chat-improvements.md` | 2,074 | Split into separate features |
| `implemented/credits-system.md` | 1,945 | Consider summarizing, move details to code |
| `implemented/welcome-flow-and-content-restrictions.md` | 1,627 | Move to code documentation |
| `implemented/automated-story-generation.md` | 1,593 | Move to code documentation |
| `implemented/roleplay-message-formatting.md` | 1,392 | Move to code documentation |
| `implemented/prisma-7-migration.md` | 1,282 | Create migration guide, archive details |
| `implemented/stripe-payment-integration.md` | 1,242 | Move to code documentation |
| `implemented/multi-user-chat.md` | 1,236 | Move to code documentation |
| `implemented/mobile-hamburger-menu.md` | 1,227 | Move to code documentation |
| `implemented/discovery-enhanced-filters.md` | 1,196 | Move to code documentation |

### Priority 2: Migration Candidates (Feature-Specific Docs)

#### Backend Documentation → Code Folders

These docs in `/docs/03-reference/backend/` should move to respective service locations:

| File | Target Location |
|------|-----------------|
| `tags-system.md` | `backend/services/tag-system/.docs.md` |
| `payments-guide.md` | `backend/services/payments/.docs.md` |
| `credits-guide.md` | `backend/services/credits/.docs.md` |
| `translation-system.md` | `backend/services/translation/.docs.md` |

#### Frontend Documentation → Code Folders

| File | Target Location |
|------|-----------------|
| `03-reference/frontend/README.md` | Distribute to component folders |

#### API Documentation → Code Folders

| File | Target Location |
|------|-----------------|
| `03-reference/api/llm-tools.md` | `backend/api/llm/.docs.md` |
| `03-reference/api/llm-providers.md` | `backend/services/llm/.docs.md` |

### Priority 3: Archive Implemented Features

The `/docs/05-business/planning/features/implemented/` folder contains **37 files** that are historical records.

**Options:**
1. **Create archive folder**: Move to `/docs/05-business/planning/features/archive/`
2. **External repository**: Move to separate `charhub-docs-archive` repo
3. **Summarize and delete**: Create summary document, remove individual specs

**Recommended**: Option 1 - Create internal archive first, consider Option 2 for long-term.

### Priority 4: Consolidate README Files

**15 README.md files** found across various folders. Many are redundant.

**Action Plan:**
1. Keep only top-level READMEs in each major section
2. Remove intermediate READMEs that add no value
3. Create clear navigation from main `docs/README.md`

---

## Migration Roadmap

### Phase 1: Structural Cleanup (Week 1)

**Goal**: Align folder structure with target

1. **Remove `/docs/technical/`**
   - Move `comfyui-api-assessment-multi-stage.md` to `/docs/05-business/analysis/` or delete if obsolete

2. **Merge `/docs/07-contributing/` into `/docs/02-guides/development/`**
   - Move `CODE_STYLE.md` → `02-guides/development/code-style.md`
   - Move `DOCUMENTATION_STANDARDS.md` → `02-guides/development/documentation-standards.md`
   - Move `GIT_WORKFLOW.md` → `02-guides/development/git-workflow.md`
   - Consolidate `README.md` content into `02-guides/development/README.md`

3. **Merge `/docs/02-guides/infrastructure/` into `/docs/02-guides/deployment/`**
   - Infrastructure setup is deployment-related
   - Update cross-references

4. **Move `/docs/02-guides/operations/` to `/docs/06-operations/`**
   - ComfyUI setup docs → operational procedures
   - R2 CORS docs → operational procedures

### Phase 2: Distribute Component Documentation (Week 2-3)

**Goal**: Move feature-specific docs to code folders

1. **Backend documentation** → Create `.docs.md` files in service folders
2. **API documentation** → Move to respective API route folders
3. **Frontend documentation** → Distribute to component folders
4. **Update central docs** → Reference distributed documentation

### Phase 3: Archive and Cleanup (Week 4)

**Goal**: Remove historical clutter

1. **Archive implemented features**
   - Create `/docs/05-business/planning/features/archive/`
   - Move all 37 implemented specs
   - Create index document

2. **Split large files**
   - Break down files >1,000 lines
   - Create separate focused documents

3. **Consolidate READMEs**
   - Remove redundant READMEs
   - Update main navigation

### Phase 4: Update Navigation (Week 4)

**Goal**: Ensure discoverability

1. Update `/docs/README.md` with new structure
2. Add clear navigation to distributed docs
3. Update all cross-references

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Total markdown files | 164 | ~94 (-43%) |
| Files in docs/ (core) | 164 | ~94 |
| Large files (>1000 lines) | 10 | 0 |
| Orphaned folders | 3 | 0 |
| Distributed docs | 0 | ~70 |
| Archive specs | 0 | 37 |

---

## Next Steps

1. **Review this analysis** with Agent Planner and stakeholders
2. **Prioritize phases** based on team capacity
3. **Create execution specifications** for coder-doc-specialist
4. **Begin Phase 1** - Structural cleanup
5. **Monitor progress** and adjust plan as needed

---

## Appendix: File Inventory

### Files by Directory

```
01-getting-started/         4 files
02-guides/                  17 files
  ├─ deployment/            3 files
  ├─ development/           6 files
  ├─ infrastructure/        4 files  [MERGE]
  └─ operations/            4 files  [MOVE]
03-reference/               11 files
  ├─ api/                   2 files  [DISTRIBUTE]
  ├─ backend/               5 files  [DISTRIBUTE]
  ├─ frontend/              1 file   [DISTRIBUTE]
  ├─ infra/                 1 file
  ├─ scripts/               1 file
  └─ workflows/             1 file
04-architecture/            4 files  [KEEP]
05-business/                90+ files
  ├─ analysis/              5 files
  ├─ planning/
  │   └─ features/
  │       ├─ active/        3 files
  │       ├─ backlog/       7 files
  │       └─ implemented/   37 files [ARCHIVE]
  ├─ metrics/               1 file
  └─ roadmap/               3 files
06-operations/              10 files
  └─ incident-response/     7 files  [KEEP]
07-contributing/            4 files  [MERGE]
agents/                     30+ files [KEEP]
technical/                  1 file   [REMOVE]
```

---

**Analysis Complete** - Ready for execution planning phase.
