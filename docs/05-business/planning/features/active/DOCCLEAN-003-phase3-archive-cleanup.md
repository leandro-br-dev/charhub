# DOCCLEAN-003: Phase 3 - Archive and Cleanup

**Type**: Documentation Cleanup
**Priority**: Medium
**Status**: Active (Pending DOCCLEAN-002 completion)
**Assigned To**: Agent Planner (via planner-doc-specialist)
**Created**: 2026-01-21
**Target Completion**: 2026-02-04

---

## Overview

This is **Phase 3 of 4** in the documentation migration plan. This phase focuses on archiving historical feature specifications and cleaning up large files that need splitting.

**Goal**: Reduce `/docs/` folder size by ~40% through archiving implemented features and splitting overly large documentation files.

**Impact**: Low risk, medium visibility - improves documentation maintainability and reduces clutter.

---

## Success Criteria

- [ ] All 37 implemented feature specs moved to archive
- [ ] Archive index created with searchable summaries
- [ ] All large files (>1,000 lines) split or summarized
- [ ] Redundant README files consolidated
- [ ] Central navigation updated
- [ ] No broken links remain

---

## Task 1: Archive Implemented Feature Specifications

### Current State

```
/docs/05-business/planning/features/implemented/  (37 files, ~50,000 lines)
├── credits-system.md                          (1,945 lines)
├── welcome-flow-and-content-restrictions.md   (1,627 lines)
├── automated-story-generation.md             (1,593 lines)
├── roleplay-message-formatting.md            (1,392 lines)
├── prisma-7-migration.md                     (1,282 lines)
├── stripe-payment-integration.md            (1,242 lines)
├── multi-user-chat.md                        (1,236 lines)
├── mobile-hamburger-menu.md                  (1,227 lines)
├── discovery-enhanced-filters.md             (1,196 lines)
... and 28 more files
```

### Analysis

These 37 files represent **historical records** of completed features. They are:
- No longer actively referenced in development
- Valuable for historical context and postmortems
- Taking up significant space in the active documentation area
- Making it harder to find active specifications

### Action Required

**Option A: Internal Archive** (Recommended for Phase 3)

1. **Create archive folder structure**:
   ```bash
   mkdir -p /root/projects/charhub-agent-02/docs/05-business/planning/features/archive
   ```

2. **Move all implemented specs to archive**:
   ```bash
   mv docs/05-business/planning/features/implemented/* docs/05-business/planning/features/archive/
   ```

3. **Create archive index** (`docs/05-business/planning/features/archive/README.md`):
   ```markdown
   # Feature Implementation Archive

   This archive contains 37 feature specifications that have been implemented and deployed to production.

   ## Purpose

   These documents are preserved for:
   - Historical context
   - Technical reference
   - Postmortem analysis
   - Onboarding material

   ## Archived Features

   ### Payment & Credits
   - **[Credits System](credits-system.md)** - Credit-based messaging system
   - **[Stripe Payment Integration](stripe-payment-integration.md)** - Payment processing

   ### Chat & Messaging
   - **[Multi-User Chat](multi-user-chat.md)** - Group chat functionality
   - **[Roleplay Message Formatting](roleplay-message-formatting.md)** - Message formatting
   - **[Automated Story Generation](automated-story-generation.md)** - AI story features

   ### Content Management
   - **[Welcome Flow and Content Restrictions](welcome-flow-and-content-restrictions.md)** - User onboarding
   - **[Discovery Enhanced Filters](discovery-enhanced-filters.md)** - Search improvements

   ### Infrastructure
   - **[Prisma 7 Migration](prisma-7-migration.md)** - Database migration

   ### UI/UX
   - **[Mobile Hamburger Menu](mobile-hamburger-menu.md)** - Mobile navigation

   ... (continue for all features)

   ## Accessing Archive

   These documents are read-only. For current active features, see [../active/](../active/).

   ## Archive Date

   Features archived: 2026-01-21
   Total features: 37
   ```

4. **Remove empty `implemented/` folder**:
   ```bash
   rmdir docs/05-business/planning/features/implemented
   ```

**Option B: External Repository** (Future consideration)

- Move archive to separate `charhub-docs-archive` repository
- Reduces repository size significantly
- Better for long-term storage

### Verification

```bash
# After completion, verify:
ls docs/05-business/planning/features/implemented/
# Should return: No such file or directory

ls docs/05-business/planning/features/archive/ | wc -l
# Should return: 38 files (37 specs + README.md)
```

---

## Task 2: Split Large Files

### Files Requiring Action

| File | Lines | Action Required |
|------|-------|-----------------|
| `backlog/chat-improvements.md` | 2,074 | Split into 5 separate features |
| `implemented/credits-system.md` | 1,945 | Summarize, move details to code docs |
| `implemented/welcome-flow...` | 1,627 | Move to code documentation |
| `implemented/automated-story...` | 1,593 | Move to code documentation |
| `implemented/roleplay-message...` | 1,392 | Move to code documentation |
| `implemented/prisma-7-migration.md` | 1,282 | Create migration guide, archive details |
| `implemented/stripe-payment...` | 1,242 | Move to code documentation |
| `implemented/multi-user-chat.md` | 1,236 | Move to code documentation |
| `implemented/mobile-hamburger...` | 1,227 | Move to code documentation |
| `implemented/discovery-enhanced...` | 1,196 | Move to code documentation |

### Action Required

**For each large file >1,000 lines**:

1. **Assess content type**:
   - Is it a feature spec? → Split into focused features
   - Is it implementation details? → Move to `.docs.md` in code
   - Is it historical? → Summarize and archive

2. **Split strategy for `backlog/chat-improvements.md`** (2,074 lines):
   ```markdown
   # Create separate focused features:

   chat-improvements-part1-message-queue.md
   chat-improvements-part2-realtime-sync.md
   chat-improvements-part3-performance.md
   chat-improvements-part4-ui-enhancements.md
   chat-improvements-part5-error-handling.md

   # Each should be:
   - <500 lines
   - Focused on one aspect
   - Independently implementable
   ```

3. **For implemented features >1,000 lines**:
   - Create **summary spec** (~200 lines) with:
     - Problem statement
     - Solution overview
     - Key decisions
     - Link to code documentation for details
   - Move implementation details to `.docs.md` in code

4. **For backlog items >1,000 lines**:
   - Split into multiple focused features
   - Each feature should be independently implementable
   - Add dependencies between related features

### Verification

```bash
# After completion, verify:
find docs/05-business/planning/features -name "*.md" -exec wc -l {} \; | sort -n
# Should return: No files >1,000 lines
```

---

## Task 3: Consolidate README Files

### Current State

**15 README.md files** found across documentation structure:
```
docs/README.md
docs/01-getting-started/README.md
docs/02-guides/README.md
docs/02-guides/deployment/README.md
docs/02-guides/development/README.md
docs/03-reference/README.md
docs/03-reference/api/README.md
docs/03-reference/backend/README.md
docs/03-reference/frontend/README.md
docs/04-architecture/README.md
docs/05-business/README.md
docs/06-operations/README.md
docs/agents/README.md
... and more
```

### Analysis

Many README files are **redundant** or add **little value**:
- Some just list files (can be seen with `ls`)
- Some duplicate information from parent README
- Some are outdated

### Action Required

**Keep only high-value READMEs**:

1. **Essential READMEs** (Keep):
   - `/docs/README.md` - Main documentation hub
   - `/docs/agents/README.md` - Agent overview
   - `/docs/04-architecture/README.md` - Architecture overview
   - Section-level READMEs (`02-guides/`, `03-reference/`)

2. **Remove redundant READMEs**:
   - Individual subfolder READMEs that just list files
   - READMEs that duplicate parent information
   - Outdated READMEs

3. **Consolidate content**:
   - Merge valuable content into parent README
   - Add clear navigation from main README
   - Ensure no information is lost

**Decision matrix for README removal**:

| README | Keep? | Reason |
|--------|-------|--------|
| `docs/02-guides/deployment/README.md` | ✅ Keep | Contains deployment procedures |
| `docs/02-guides/development/README.md` | ✅ Keep | Contains dev guidelines |
| `docs/03-reference/backend/README.md` | ❌ Remove | Just lists files, use index instead |
| `docs/03-reference/frontend/README.md` | ❌ Remove | Just lists files, use index instead |
| `docs/03-reference/api/README.md` | ❌ Remove | Only had 2 files, now distributed |

### Verification

```bash
# After completion, verify:
find docs -name "README.md" | wc -l
# Should return: ~8-10 (only essential READMEs)
```

---

## Task 4: Update Central Navigation

### Action Required

**Update `/docs/README.md`** to reflect archive and cleanup:

```markdown
# CharHub Documentation

## 📚 Documentation Structure

This documentation follows the **Diátaxis Framework**...

---

## 🗂️ Quick Navigation

### 🚀 [01. Getting Started](./01-getting-started/)
Start here if you're new to the project

### 📖 [02. Guides](./02-guides/)
- **[Development](./02-guides/development/)** - Local development, code style, Git workflow
- **[Deployment](./02-guides/deployment/)** - Deploy to production, infrastructure setup

### 📚 [03. Reference](./03-reference/)
- **Backend** - Service documentation is distributed in code folders
- **Frontend** - Component documentation is distributed in code folders
- **API** - API documentation is distributed with endpoints
- See individual code folders for `.docs.md` files

### 🏛️ [04. Architecture](./04-architecture/)
System design and technical decisions

### 💼 [05. Business](./05-business/)
- **[Active Features](./05-business/planning/features/active/)** - Currently being implemented
- **[Backlog](./05-business/planning/features/backlog/)** - Planned features
- **[Archive](./05-business/planning/features/archive/)** - Historical implementation records (37 specs)
- **[Analysis](./05-business/analysis/)** - Business analysis

### ⚙️ [06. Operations](./06-operations/)
SRE, monitoring, and incident response

---

## 🔍 Find What You Need

**I want to...**

- ✅ **Understand a service** → Check the service folder for `.docs.md`
- ✅ **Deploy to production** → [02. Guides / Deployment](./02-guides/deployment/)
- ✅ **Check active features** → [05. Business / Active Features](./05-business/planning/features/active/)
- ✅ **Research implemented features** → [05. Business / Archive](./05-business/planning/features/archive/)
...
```

---

## Task 5: Update Cross-References

### Action Required

1. **Search for references to archived files**:
   ```bash
   grep -r "features/implemented/" docs/
   ```

2. **Update all references** to point to archive:
   - `features/implemented/` → `features/archive/`

3. **Verify no broken links** in documentation

---

## Execution Order

**Execute tasks in this order**:

1. Task 1 (Archive implemented specs) - 30 minutes
2. Task 2 (Split large files) - 60 minutes
3. Task 3 (Consolidate READMEs) - 20 minutes
4. Task 4 (Update navigation) - 15 minutes
5. Task 5 (Update cross-references) - 15 minutes

**Total Estimated Time**: ~140 minutes

---

## Notes

- **Commit Strategy**: Create one commit per major task
- **Branch**: Use `feature/docclean-003-phase3-archive-cleanup` branch
- **Dependencies**: Requires DOCCLEAN-002 to be completed first
- **Caution**: Large file splitting requires careful content analysis

---

## Post-Completion Actions

After completion:

1. **Update this spec** - Mark all tasks as complete
2. **Measure success**:
   - Count total files in `/docs/` (should be ~94, down from 164)
   - Verify no files >1,000 lines
   - Check archive is accessible
3. **Create summary** of what was archived/split
4. **Move to `/docs/05-business/planning/features/implemented/`**

---

## References

- [Full Migration Analysis](/root/projects/charhub-agent-02/docs/05-business/analysis/documentation-migration-analysis-2026-01-17.md)
- [planner-doc-specialist Guidelines](/root/projects/charhub-agent-02/docs/agents/planner/sub-agents/planner-doc-specialist.md)
- [DOCCLEAN-001: Phase 1](./DOCCLEAN-001-phase1-structural-cleanup.md)
- [DOCCLEAN-002: Phase 2](./DOCCLEAN-002-phase2-distribute-component-documentation.md)

---

**Phase 3 of 4** | Previous: [DOCCLEAN-002](./DOCCLEAN-002-phase2-distribute-component-documentation.md) | Next: [DOCCLEAN-004: Phase 4](./DOCCLEAN-004-phase4-final-navigation.md) (to be created)
