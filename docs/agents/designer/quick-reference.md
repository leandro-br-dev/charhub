# Quick Reference - Agent Designer

**Last Updated**: 2025-01-14

This guide helps you quickly select the right sub-agent for any task.

---

## Decision Matrix

### What Do You Need To Do?

| Task | Sub-Agent | Why |
|------|-----------|-----|
| **Review UI/UX** | `ux-reviewer` | Find issues, check consistency |
| **Test visual quality** | `visual-tester` | Cross-browser, responsive testing |
| **Propose major design change** | `design-proposer` | Get approval, create specs |
| **Implement small UI fix** | `ui-implementer` | Quick styling fixes (<50 lines) |
| **Audit accessibility** | `accessibility-specialist` | WCAG compliance, keyboard nav |

---

## Quick Decision Tree

```
START: What do you need to do?
│
├─ Review UI/UX and find issues?
│  └─ Use ux-reviewer
│     └─ Issue found?
│        ├─ Small fix? → Use ui-implementer
│        └─ Large change? → Use design-proposer
│
├─ Test visual quality (before/after deploy)?
│  └─ Use visual-tester
│     └─ Issues found?
│        ├─ Quick fix? → Use ui-implementer
│        └─ Complex bug? → Create GitHub Issue
│
├─ Propose major design change?
│  └─ Use design-proposer
│     └─ Get user approval
│     └─ Small change → Use ui-implementer
│     └─ Large change → Create GitHub Issue
│
├─ Implement small UI fix?
│  └─ Use ui-implementer
│
└─ Audit accessibility?
   └─ Use accessibility-specialist
```

---

## Sub-Agent Overview

| Sub-Agent | Color | Expertise | When to Use |
|-----------|-------|-----------|-------------|
| **ux-reviewer** | Pink | UI/UX review, consistency checks | Weekly reviews, finding issues |
| **visual-tester** | Cyan | Visual QA, cross-browser testing | Before/after deployments |
| **design-proposer** | Magenta | Design proposals, mockups | Major design changes |
| **ui-implementer** | Lime | Small UI fixes, CSS | Quick styling improvements |
| **accessibility-specialist** | Teal | WCAG compliance, keyboard nav | Monthly accessibility audits |

---

## Common Scenarios

### Scenario 1: Weekly UI/UX Review

**Example**: "It's time for our weekly UI review."

1. Use `ux-reviewer` → Review UI/UX, identify issues
2. Small fixes → Use `ui-implementer`
3. Large changes → Use `design-proposer`

---

### Scenario 2: Testing After Deployment

**Example**: "Agent Coder just deployed a new feature."

1. Use `visual-tester` → Test across browsers/devices
2. Document issues found
3. Small fixes → Use `ui-implementer`
4. Large bugs → Create GitHub Issue

---

### Scenario 3: Found Design Issue

**Example**: "The button color doesn't have enough contrast."

1. **Is it a small fix?** (CSS, <50 lines)
   - Yes → Use `ui-implementer`
2. **Is it a large change?** (complex logic, backend)
   - Yes → Use `design-proposer` → Create GitHub Issue

---

### Scenario 4: Want to Redesign a Page

**Example**: "The character creation flow is too complex."

1. Use `ux-reviewer` → Analyze current flow, identify pain points
2. Use `design-proposer` → Create redesign proposal with mockups
3. Get user approval
4. If approved:
   - Small change → Use `ui-implementer`
   - Large change → Create GitHub Issue for Agent Coder

---

### Scenario 5: Monthly Accessibility Audit

**Example**: "It's time for our monthly accessibility check."

1. Use `accessibility-specialist` → Full WCAG audit
2. Test keyboard navigation
3. Test with screen reader
4. Check color contrast
5. Create improvement plan
6. Quick fixes → Use `ui-implementer`
7. Complex fixes → Create GitHub Issue

---

## Workflow Sequences

### Issue Discovery → Fix

```
ux-reviewer (finds issue)
    ↓
Assess complexity
    ├─ Small fix → ui-implementer → PR
    └─ Large change → design-proposer → GitHub Issue
```

### Design Change → Implementation

```
design-proposer (creates proposal)
    ↓
Get user approval
    ├─ Small change → ui-implementer → PR
    └─ Large change → GitHub Issue → Agent Coder
```

### Deployment → Verification

```
Agent Coder deploys
    ↓
visual-tester (tests)
    ├─ Issues found → ui-implementer (fixes) → PR
    └─ All good → Mark as verified
```

### Accessibility Audit → Improvement

```
accessibility-specialist (audits)
    ↓
Identify issues
    ├─ Quick fixes → ui-implementer → PR
    └─ Complex fixes → GitHub Issue → Agent Coder
```

---

## Critical Reminders

### Before Implementing (ui-implementer)
- ✅ Assess if it's truly a small fix (<50 lines)
- ✅ Test locally on multiple screen sizes
- ✅ Test in multiple browsers
- ✅ Update branch with main BEFORE creating PR
- ✅ Test again after merging main

### Before Proposing (design-proposer)
- ✅ Research the problem thoroughly
- ✅ Check with Agent Planner for user data
- ✅ Create mockups or detailed descriptions
- ✅ Document rationale and benefits
- ✅ Get explicit user approval before implementing

### Before Auditing (ux-reviewer, visual-tester, accessibility-specialist)
- ✅ Read latest feature specs
- ✅ Understand what changed
- ✅ Document findings with screenshots
- ✅ Prioritize issues by severity
- ✅ Provide actionable recommendations

---

## Small vs Large Changes

### Small Changes (ui-implementer)
- Color/font adjustments
- Spacing/alignment fixes
- Button style improvements
- Form validation messages
- Loading states
- Error message improvements
- Icons and tooltips
- Responsive CSS fixes
- Accessibility quick fixes (ARIA labels, focus states)

**Criteria**: CSS/styling only, <50 lines of code, no backend changes

### Large Changes (design-proposer → GitHub Issue)
- New pages/routes
- Complex components
- Backend integration
- State management changes
- Authentication/permissions
- Database schema changes
- Major refactoring

**Criteria**: Backend changes, complex logic, >100 lines of code

---

## File Locations

### For Agent Designer (You)
```
docs/agents/designer/
├── CLAUDE.md              # Orchestrator guide (read this first)
├── INDEX.md               # Detailed navigation
├── quick-reference.md     # This file
└── sub-agents/            # Your specialized team
    ├── ux-reviewer.md
    ├── visual-tester.md
    ├── design-proposer.md
    ├── ui-implementer.md
    └── accessibility-specialist.md
```

### Key Working Files
```
docs/
├── 03-reference/frontend/     # Frontend patterns (READ THIS!)
├── 05-business/
│   └── user-behavior-reports/ # User behavior data
└── 06-operations/
    └── quality-dashboard.md   # Quality metrics
```

---

## Mantras

### Designer's Mantra
**"Beauty AND Functionality. Never sacrifice usability for aesthetics."**

### ux-reviewer
**"Design is not just what it looks like. Design is how it works."**

### visual-tester
**"Test Everything, Assume Nothing"**

### design-proposer
**"Good Design is Obvious. Great Design is Transparent"**

### ui-implementer
**"Small Fixes, Big Impact"**

### accessibility-specialist
**"Accessibility is not a feature, it's a fundamental right"**

---

## Quick Commands

### Start Local Environment
```bash
docker compose up -d --build
open http://localhost:8083
```

### Create Design Branch
```bash
git checkout -b feature/design/[description]
```

### Update Branch with Main (CRITICAL!)
```bash
git checkout main
git pull origin main
git checkout feature/design/[your-branch]
git merge main
```

### Test Build
```bash
cd frontend
npm run build
npm run lint
```

---

**Need more detail?** See [INDEX.md](INDEX.md) or [CLAUDE.md](CLAUDE.md)
