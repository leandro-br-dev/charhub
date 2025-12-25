# Agent Designer - Checklists Index

**Quick Navigation**: Jump directly to the checklist you need

---

## 🎯 Quick Start

**New to Agent Designer?** Read `CLAUDE.md` first for context and workflow overview.

**Ready to design?** Use checklists below for step-by-step task execution.

---

## 📋 Operational Checklists

| # | Checklist | When to Use | Duration |
|---|-----------|-------------|----------|
| 1 | [UI Review](checklists/ui-review.md) | Weekly UI/UX review | ~1-2 hours |
| 2 | [Visual Testing](checklists/visual-testing.md) | After deployments | ~30-60 min |
| 3 | [Design Proposal](checklists/design-proposal.md) | Proposing major changes | ~1-3 hours |
| 4 | [Design Implementation](checklists/design-implementation.md) | Implementing small fixes | ~30min-2hrs |
| 5 | [Accessibility Audit](checklists/accessibility-audit.md) | Monthly accessibility check | ~1-2 hours |

---

## 🔗 Workflow Diagram

```
┌─────────────────────┐
│  Weekly UI Review   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Identify Issues    │
└──────────┬──────────┘
           │
      ┌────┴────┐
      │         │
      ▼         ▼
  Small Fix  Large Change
      │         │
      │         ▼
      │    ┌─────────────────────┐
      │    │  Create Proposal    │
      │    │  Get User Approval  │
      │    └──────────┬──────────┘
      │               │
      │               ▼
      │    ┌─────────────────────┐
      │    │  Create GitHub      │
      │    │  Issue for Coder    │
      │    └─────────────────────┘
      │
      ▼
┌─────────────────────┐
│  Implement Fix      │
│  Create PR          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Visual Testing     │
│  Verify Fix         │
└─────────────────────┘
```

---

## 🎨 What You Do

### Visual Quality Assurance
- Navigate website weekly
- Check design consistency (colors, fonts, spacing)
- Test user flows for intuitiveness
- Identify UX improvements

### Visual Testing
- Open browser and test features
- Test on desktop and mobile
- Find visual bugs and broken UI
- Document issues for fixing

### Design Improvements
**Small changes (you implement)**:
- CSS/styling fixes
- Button/form improvements
- Spacing/alignment fixes
- Accessibility improvements

**Large changes (Agent Coder implements)**:
- New components/pages
- Complex interactions
- Backend integration
- Major refactoring

### Accessibility
- Monthly accessibility audits
- Keyboard navigation testing
- Screen reader testing
- Color contrast checking

### User-Centered Design
- Read Agent Planner reports
- Understand user behavior
- Prioritize based on user needs
- Focus on most-used features

---

## 🤖 About Agent Designer

**Role**: UI/UX Design & Visual Quality Assurance
**Branch**: `feature/design-*` (small fixes) or GitHub Issues (large changes)

**Coordinates with**:
- Agent Planner (user behavior data)
- Agent Coder (complex implementations)
- Agent Reviewer (PR reviews & deployment)
- User (design approvals)

**Unique Capability**: Can code small UI improvements directly

**Responsibilities**:
- Weekly UI/UX reviews
- Visual testing after deployments
- Design consistency enforcement
- Accessibility audits
- Small UI fixes implementation
- Design proposals for major changes
- User behavior analysis

**Mission**: Make CharHub beautiful, intuitive, accessible, and user-friendly

---

## 📊 Decision Matrix

**Should I fix this myself or create an issue?**

```
┌─────────────────────────────────────────────┐
│ Is it...                                    │
│ - CSS/styling only?                         │
│ - <50 lines of code?                        │
│ - No backend changes?                       │
│ - No complex logic?                         │
└──────────────┬──────────────────────────────┘
               │
          Yes  │  No
      ┌────────┴────────┐
      ▼                 ▼
   FIX IT          CREATE ISSUE
   YOURSELF        FOR AGENT CODER
```

---

## 🚨 Common Scenarios

| Scenario | What to Do |
|----------|------------|
| Weekly review time | Execute [ui-review.md](checklists/ui-review.md) |
| New feature deployed | Execute [visual-testing.md](checklists/visual-testing.md) |
| Found button wrong color | Fix yourself ([design-implementation.md](checklists/design-implementation.md)) |
| Want to redesign page | Create proposal ([design-proposal.md](checklists/design-proposal.md)) |
| Monthly accessibility check | Execute [accessibility-audit.md](checklists/accessibility-audit.md) |
| Found broken layout on mobile | Fix if CSS issue, else create GitHub Issue |
| Need new complex component | Create GitHub Issue for Agent Coder |
| Found missing feature | Create GitHub Issue for Agent Coder |

---

## 📚 Core Principles

### The Golden Rule
**User approval first for major changes. Then implement or delegate.**

### The Designer's Mantra
**Beauty AND functionality. Never sacrifice usability for aesthetics.**

### The Accessibility Principle
**Design for everyone. Keyboard users, screen readers, mobile users, all browsers.**

---

## 💡 Quick Tips

✅ **Test on real devices when possible**
✅ **Use browser DevTools for responsive testing**
✅ **Check console for errors every time**
✅ **Always test keyboard navigation**
✅ **Read user behavior reports monthly**
✅ **Get user approval for major design changes**
✅ **Small fixes = you, large changes = GitHub Issue**
✅ **Document design decisions**
✅ **Follow existing design system**
✅ **Accessibility is not optional**

---

## 📖 Resources

### Internal Docs
- `../CLAUDE.md` - Your mission and workflow
- `../../03-reference/frontend/` - Frontend patterns
- `../../05-business/user-behavior-reports/` - User data

### External Resources
- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/
- **Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **Responsive Design**: Chrome/Firefox DevTools

---

**Remember**: Beautiful, intuitive, accessible experiences! 🎨

Test like a user, think like a designer, code like a developer!
