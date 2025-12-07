# Phase 2: Documentation Reorganization Plan

**Date**: 2025-12-05
**Status**: Proposed
**Phase**: 2 of 2 (Phase 1 completed: Core structure created)

---

## 📋 Current Situation

Phase 1 successfully created the new documentation structure, but many files remain **outside** this structure:

### Files in Root `/docs/` (20 files)
```
docs/
├── ARCHITECTURE_DECISIONS.md
├── BACKEND.md
├── DATABASE_BACKUP.md
├── DATABASE_OPERATIONS.md
├── DEV_OPERATIONS.md
├── DOCKER_OVERRIDE.md
├── FRONTEND.md
├── LLM_TOOLS.md
├── PROJECT_OVERVIEW.md
├── ROADMAP.md
├── SCHEMA_ORGANIZATION.md
├── SETUP-WSL-AGENTS.md
├── STORY_GENERATION_ROADMAP.md
├── TAG_SYSTEM_SETUP.md
├── TODO.md
├── TRANSLATION_SYSTEM.md
└── USER_FEATURE_NOTES.md
```

### Folders in `/docs/` (3 folders)
```
docs/
├── coder/              # Agent Coder old structure
├── features/           # Feature documentation
└── todo/               # TODO items
```

### Root Files (2 files)
```
./
├── CLAUDE.md          # Root copy (should be ignored)
└── README.md          # Project README
```

---

## 🎯 Reorganization Strategy

### Classification by Content Type

#### 1. **Architecture & Technical Design**
Move to `docs/04-architecture/`:
- ✅ `ARCHITECTURE_DECISIONS.md` → `architecture-decisions.md`
- ✅ `SCHEMA_ORGANIZATION.md` → `database-schema.md`
- ✅ `PROJECT_OVERVIEW.md` → `system-overview.md`

#### 2. **Reference Documentation**
Move to `docs/03-reference/`:
- ✅ `BACKEND.md` → `03-reference/backend/`
- ✅ `FRONTEND.md` → `03-reference/frontend/`
- ✅ `LLM_TOOLS.md` → `03-reference/api/llm-tools.md`
- ✅ `TRANSLATION_SYSTEM.md` → `03-reference/backend/translation-system.md`

#### 3. **Operations & Guides**
Move to `docs/02-guides/` or `docs/06-operations/`:
- ✅ `DATABASE_BACKUP.md` → Already documented in `03-reference/scripts/backup-restore-guide.md` (DELETE or MERGE)
- ✅ `DATABASE_OPERATIONS.md` → `02-guides/infrastructure/database-operations.md`
- ✅ `DEV_OPERATIONS.md` → `02-guides/development/dev-operations.md`
- ✅ `DOCKER_OVERRIDE.md` → `02-guides/development/docker-override.md`

#### 4. **Business & Planning**
Move to `docs/05-business/`:
- ✅ `ROADMAP.md` → `05-business/roadmap/README.md` (MERGE with existing)
- ✅ `STORY_GENERATION_ROADMAP.md` → `05-business/roadmap/story-generation.md`
- ✅ `TODO.md` → `05-business/planning/todo.md`
- ✅ `USER_FEATURE_NOTES.md` → `05-business/planning/user-feature-notes.md`

#### 5. **Getting Started**
Move to `docs/01-getting-started/`:
- ✅ `SETUP-WSL-AGENTS.md` → `01-getting-started/wsl-multi-agent-setup.md`
- ✅ `TAG_SYSTEM_SETUP.md` → `01-getting-started/tag-system-setup.md` OR `02-guides/infrastructure/`

#### 6. **Folders to Reorganize**
- ✅ `docs/coder/` → Review and move to `docs/agents/coder/`
- ✅ `docs/features/` → Review and distribute to appropriate sections
- ✅ `docs/todo/` → Move to `docs/05-business/planning/features/` (detailed feature specs)

---

## 📊 Detailed Migration Plan

### Step 1: Architecture Documentation

```bash
# Create architecture folder structure
mkdir -p docs/04-architecture

# Move files
git mv docs/ARCHITECTURE_DECISIONS.md docs/04-architecture/architecture-decisions.md
git mv docs/SCHEMA_ORGANIZATION.md docs/04-architecture/database-schema.md
git mv docs/PROJECT_OVERVIEW.md docs/04-architecture/system-overview.md
```

**Create**: `docs/04-architecture/README.md`

---

### Step 2: Reference Documentation

```bash
# Create reference folder structure
mkdir -p docs/03-reference/{backend,frontend,api}

# Move files
git mv docs/BACKEND.md docs/03-reference/backend/README.md
git mv docs/FRONTEND.md docs/03-reference/frontend/README.md
git mv docs/LLM_TOOLS.md docs/03-reference/api/llm-tools.md
git mv docs/TRANSLATION_SYSTEM.md docs/03-reference/backend/translation-system.md
```

**Action**: Review `DATABASE_BACKUP.md`:
- If duplicate of `backup-restore-guide.md` → DELETE
- If different content → MERGE into `backup-restore-guide.md`

---

### Step 3: Operations & Development Guides

```bash
# Move to guides
git mv docs/DATABASE_OPERATIONS.md docs/02-guides/infrastructure/database-operations.md
git mv docs/DEV_OPERATIONS.md docs/02-guides/development/dev-operations.md
git mv docs/DOCKER_OVERRIDE.md docs/02-guides/development/docker-override.md
```

**Create**: `docs/02-guides/README.md` (main guides index)

---

### Step 4: Business Documentation

```bash
# Move business docs
git mv docs/STORY_GENERATION_ROADMAP.md docs/05-business/roadmap/story-generation.md
git mv docs/TODO.md docs/05-business/planning/todo.md
git mv docs/USER_FEATURE_NOTES.md docs/05-business/planning/user-feature-notes.md
```

**Action**: Review `ROADMAP.md`:
- Merge with existing `docs/05-business/roadmap/`
- Create comprehensive roadmap index

---

### Step 5: Getting Started

```bash
# Move setup guides
git mv docs/SETUP-WSL-AGENTS.md docs/01-getting-started/wsl-multi-agent-setup.md
```

**Decision needed**: `TAG_SYSTEM_SETUP.md`
- Option A: `01-getting-started/tag-system-setup.md` (if needed for initial setup)
- Option B: `02-guides/infrastructure/tag-system-setup.md` (if operational guide)

---

### Step 6: Reorganize Folders

#### `docs/coder/` Analysis
```bash
# List contents
ls -la docs/coder/

# Decision:
# - If Agent Coder instructions → move to docs/agents/coder/
# - If development guides → move to docs/02-guides/development/
# - If obsolete → archive
```

#### `docs/features/` Analysis
```bash
# List contents
ls -la docs/features/

# Decision:
# - Feature specifications → docs/05-business/roadmap/ or docs/05-business/planning/features/
# - Implemented features → Update docs/05-business/roadmap/implemented-features.md
# - Technical specs → docs/04-architecture/
```

#### `docs/todo/` Analysis
```bash
# List contents
ls -la docs/todo/

# Decision:
# - Active TODOs → docs/05-business/planning/features/ (one file per feature)
# - Completed → Archive or delete
# - General TODO → docs/05-business/planning/todo.md
```

---

## 🔍 Files Requiring Special Analysis

### 1. `DATABASE_BACKUP.md`
**Action Required**: Compare with `docs/03-reference/scripts/backup-restore-guide.md`
- If identical → DELETE
- If has unique content → MERGE
- Check creation date and comprehensiveness

### 2. `ROADMAP.md`
**Action Required**: Merge with existing roadmap structure
- Current: `docs/05-business/roadmap/` (has implemented, missing, undocumented)
- Need: Comprehensive roadmap index
- Merge content and create master `docs/05-business/roadmap/README.md`

### 3. `docs/coder/CLAUDE.md`
**Action Required**: Analyze differences with current agent structure
- Compare with `docs/agents/coder/README.md`
- Update `docs/agents/coder/CLAUDE.md` if needed
- Ensure consistency

### 4. Root `README.md`
**Action**: Keep as-is (project README, not documentation)

### 5. Root `CLAUDE.md`
**Action**: Keep as-is (local copy, in .gitignore)

---

## ✅ Success Criteria

Phase 2 is complete when:

1. ✅ All `.md` files in `docs/` root are moved to appropriate sections
2. ✅ All folders in `docs/` are reorganized (coder, features, todo)
3. ✅ No duplicate content exists
4. ✅ All sections have README.md index files
5. ✅ Navigation links are updated
6. ✅ Git history preserved (`git mv`)
7. ✅ Agent CLAUDE.md files updated with new paths

---

## 🚀 Execution Plan

### Quick Execution (Recommended)
Execute all migrations in one session:
1. Analyze special files (DATABASE_BACKUP, ROADMAP, etc.)
2. Execute Step 1-5 migrations
3. Analyze and reorganize folders (Step 6)
4. Create missing README files
5. Update navigation links
6. Single commit with comprehensive changelog

**Estimated Time**: 1-2 hours

### Incremental Execution
Execute by category:
1. Session 1: Architecture (Step 1)
2. Session 2: Reference (Step 2)
3. Session 3: Guides (Step 3)
4. Session 4: Business (Step 4)
5. Session 5: Getting Started (Step 5)
6. Session 6: Folders (Step 6)

**Estimated Time**: 3-4 hours (spread over time)

---

## 📝 Commit Strategy

### Option A: Single Comprehensive Commit
```
docs: complete Phase 2 reorganization - move all remaining files

- Moved architecture docs to 04-architecture/
- Moved reference docs to 03-reference/
- Moved guides to 02-guides/
- Moved business docs to 05-business/
- Reorganized coder, features, todo folders
- Merged duplicate content
- Created missing README files
- Updated all navigation links

Closes Phase 2 reorganization
```

### Option B: Multiple Commits by Category
```
docs(architecture): move architecture documentation to 04-architecture/
docs(reference): move technical reference to 03-reference/
docs(guides): move operational guides to 02-guides/
docs(business): move business docs to 05-business/
docs: reorganize coder, features, todo folders
```

**Recommendation**: Option A (cleaner history, one logical change)

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Duplicate content | Medium | Compare before moving, merge when needed |
| Broken links | High | Update all internal links after migration |
| Lost content | High | Use `git mv` to preserve history |
| Agent confusion | Medium | Update CLAUDE.md files immediately after |
| Merge conflicts | Low | We're only agent working on docs |

---

## 🎯 User Decision Required

**Questions**:

1. **Execution Strategy**: Quick (1-2h all at once) or Incremental (spread over time)?
2. **Folder Analysis**: Should I analyze `docs/coder/`, `docs/features/`, `docs/todo/` first before moving?
3. **Special Files**: Should I compare `DATABASE_BACKUP.md` and `ROADMAP.md` before proceeding?
4. **Commit Strategy**: Single commit or multiple commits?

**Recommendation**:
- Quick execution (get it done)
- Analyze folders first (safety)
- Compare special files (avoid duplicates)
- Single commit (cleaner)

---

## 📊 Expected Result

After Phase 2:

```
docs/
├── README.md ✅
├── 01-getting-started/ ✅ (complete with WSL setup, tag setup)
├── 02-guides/ ✅ (complete with all operational guides)
├── 03-reference/ ✅ (complete with backend, frontend, API docs)
├── 04-architecture/ ✅ (complete with all architecture docs)
├── 05-business/ ✅ (complete roadmap, planning, features)
├── 06-operations/ ⏳ (coming soon)
├── 07-contributing/ ✅
└── agents/ ✅ (complete with reviewer and coder)

# No loose files in docs/ root! ✅
```

---

**Ready to proceed?** Choose your preferred execution strategy and I'll start Phase 2 immediately!
