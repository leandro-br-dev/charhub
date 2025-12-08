# Feature Specifications

**Last Updated**: 2025-12-07

---

## 📋 Overview

This folder contains all feature specifications for CharHub, organized by implementation status.

---

## 📂 Folder Structure

### 🏗️ [active/](./active/)
Features currently being developed by Agent Coder.

**Status**: Work in progress, PRs not yet merged

**When to use**: Agent Reviewer moves specs here when assigning to Agent Coder

### ✅ [implemented/](./implemented/)
Features already deployed to production.

**Status**: Live in production, may have TODOs for improvements

**Contents**:
- Detailed specs of implemented features
- TODO lists for enhancements/improvements
- Reference documentation

**Current Features**:
- Credits System
- Multi-User Chat
- Chat Improvements (TODO)
- Chat Invite Links (TODO)
- Notification System (TODO)
- Image Generation (TODO)

### 📋 [backlog/](./backlog/)
Features planned for future development.

**Status**: Not yet assigned, awaiting prioritization

**Contents**:
- Story Generation
- Game Modules
- Memory System
- Chat Improvements (future enhancements)
- CI/CD Improvements
- Deploy Improvements

---

## 🔄 Feature Lifecycle

### 1. Request Phase
User reports feature request in [`user-feature-notes.md`](../user-feature-notes.md)

### 2. Planning Phase
Agent Reviewer creates detailed spec:
- Creates `backlog/feature-name.md` with complete specification
- Adds to [`agent-assignments.md`](../agent-assignments.md) for prioritization

### 3. Development Phase
Agent Reviewer assigns to Agent Coder:
- Moves spec from `backlog/` → `active/`
- Updates agent-assignments.md with branch name
- Agent Coder creates feature branch and implements

### 4. Review & Deploy Phase
Agent Reviewer tests and deploys:
- Reviews PR from Agent Coder
- Tests locally and in staging
- Merges to main
- Monitors production deployment

### 5. Completed Phase
Feature is live:
- Moves spec from `active/` → `implemented/`
- Adds entry to [`../../CHANGELOG.md`](../../CHANGELOG.md)
- Updates [`../../roadmap/implemented-features.md`](../../roadmap/implemented-features.md)
- Deletes original request from `user-feature-notes.md`

---

## 📝 File Naming Convention

- `feature-name.md` - Detailed specification (comprehensive design doc)
- `todo-feature-name.md` - Implementation tasks (actionable checklist)

---

## 📋 Specification Structure

Each detailed spec should include:

1. **Overview** - What is this feature?
2. **User Stories** - Who benefits and how?
3. **Technical Design** - How will it work?
4. **API Contracts** - Endpoints and data structures
5. **Database Schema** - Prisma models
6. **UI/UX** - Wireframes or descriptions
7. **Testing** - How to verify it works
8. **Rollout** - Deployment strategy

---

## ✅ TODO Structure

Each TODO should include:

1. **Summary** - Quick overview
2. **Tasks** - Checkbox list of work items
3. **Dependencies** - What must be done first
4. **Acceptance Criteria** - Definition of done
5. **Estimated Effort** - Time estimate (optional)
6. **Status** - Pending / In Progress / Blocked / Done

---

## 🎯 Priority Levels

Features are prioritized based on:
- **High**: Critical user needs, revenue impact
- **Medium**: Important improvements, optimization
- **Low**: Nice-to-have, future exploration

See [Agent Assignments](../agent-assignments.md) for current priorities.

---

[← Back to Planning](../) | [← Back to Business](../../) | [← Back to Documentation Home](../../../README.md)
