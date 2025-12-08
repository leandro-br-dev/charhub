# CharHub Roadmap

**Last Updated**: 2025-12-08
**Purpose**: Strategic planning and feature prioritization for CharHub

---

## 📋 Overview

This folder contains **strategic business-level** documentation for planning and tracking CharHub's feature development. It provides high-level visibility into what's implemented, what's missing, and what needs attention.

**Key Difference from `../planning/features/`**:
- **Roadmap** = Strategic business view (WHAT to do, WHY, WHEN)
- **Features** = Tactical technical specs (HOW to implement)

---

## 📂 What's in this folder?

### 📊 [Implemented Features](./implemented-features.md)
**Quality dashboard** for features already in production.

**Shows**:
- Documentation status (✅⚠️❌)
- Test coverage status (✅⚠️❌)
- QA validation status (✅⚠️❌)
- Priority for testing/documentation work

**For**: Agent Reviewer (prioritize QA and documentation work)

**Use when**:
- "Which features need urgent testing?"
- "What documentation is missing?"
- "What's the overall quality status?"

---

### 🎯 [Missing Features](./missing-features.md)
**Prioritized index** of planned features NOT yet implemented.

**Shows**:
- Priority level (HIGH/MEDIUM/LOW)
- Effort estimation (hours)
- Technical dependencies
- Business constraints (cost, user threshold)
- Suggested implementation roadmap by phase

**For**: Product owner, Agent Reviewer (strategic decisions)

**Use when**:
- "What should we build next?"
- "How much effort will this take?"
- "What are the blockers?"
- "What's the implementation order?"

**Important**: This is a **high-level index**. Detailed technical specs are in `../planning/features/backlog/`

---

### 🔍 [Undocumented Features](./undocumented-features.md)
**Audit report** (2025-12-02) identifying 25+ features implemented in code but missing documentation.

**Status**: Historical reference - will be archived after all features are documented

**Shows**:
- Features discovered in codebase
- API endpoints without docs
- Frontend pages without specs
- Priority for documentation work

**For**: Agent Reviewer (documentation gap analysis)

**Use when**:
- "What features exist but aren't documented?"
- "What API endpoints are available?"
- "What's the documentation coverage gap?"

---

## 🔄 How to Use the Roadmap

### For Strategic Planning
1. **Decide what to build next**:
   - Check `missing-features.md` for prioritized list
   - Review effort estimates and dependencies
   - Consider business constraints

2. **Create detailed spec**:
   - Create `../planning/features/backlog/[feature-name].md`
   - Include technical design, API contracts, database schema

3. **Update roadmap**:
   - Add reference to spec in `missing-features.md`

### For Quality Assurance
1. **Check what needs testing**:
   - Open `implemented-features.md`
   - Find features with ⚠️ or ❌ in Tests column
   - Prioritize by Priority column

2. **Check what needs documentation**:
   - Open `implemented-features.md`
   - Find features with ⚠️ or ❌ in Docs column
   - Create usage guides in `../../03-reference/`

### For Development
1. **Find technical specs**:
   - Go to `../planning/features/backlog/[feature-name].md`
   - NOT in roadmap/ (roadmap is strategic only)

2. **Find usage guides**:
   - Go to `../../03-reference/[area]/[feature]-guide.md`
   - NOT in roadmap/ (roadmap is strategic only)

---

## 📊 Quick Links

**Strategic View**:
- [What's implemented?](./implemented-features.md) - Quality dashboard
- [What's missing?](./missing-features.md) - Prioritized index
- [What's undocumented?](./undocumented-features.md) - Gap analysis

**Tactical View**:
- [Backlog specs](../planning/features/backlog/) - Features to implement
- [Active specs](../planning/features/active/) - Features in development
- [Implemented specs](../planning/features/implemented/) - Technical details

**Usage Guides**:
- [Backend guides](../../03-reference/backend/) - How to use backend features
- [Frontend guides](../../03-reference/frontend/) - How to use frontend features
- [API guides](../../03-reference/api/) - How to use APIs

---

## 🎯 Workflow Integration

### Phase 1: Strategic Planning (Agent Reviewer)
1. Update `missing-features.md` with business priorities
2. Select high-priority feature
3. Create detailed spec in `../planning/features/backlog/[name].md`
4. Reference spec in `missing-features.md`

### Phase 2: Development (Agent Coder)
1. Agent Reviewer moves: `backlog/` → `active/`
2. Agent Coder implements following spec in `active/`
3. Agent Coder updates TODO inside spec

### Phase 3: Deployment (Agent Reviewer)
1. Agent Reviewer tests and merges
2. Moves spec: `active/` → `implemented/`
3. **Updates** `implemented-features.md` (adds row to table)
4. **Creates** usage guide in `../../03-reference/`
5. **Removes** entry from `missing-features.md`

---

## 📝 Maintenance

**Agent Reviewer responsibilities**:
- Keep `implemented-features.md` updated after each deployment
- Update `missing-features.md` when priorities change
- Archive `undocumented-features.md` after gap is closed
- Ensure roadmap stays synchronized with `../planning/features/`

**When to update**:
- After merging PR: Update `implemented-features.md`
- After strategic planning: Update `missing-features.md`
- Monthly: Review and sync all roadmap files

---

[← Back to Business](../) | [← Back to Documentation Home](../../README.md)
