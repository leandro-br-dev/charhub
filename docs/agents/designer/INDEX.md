# Agent Designer - Navigation Index

**Last Updated**: 2025-01-14

Your guide to navigating Agent Designer documentation and sub-agents.

---

## 🎯 Quick Start

**New to Agent Designer?** Start here:

1. **[CLAUDE.md](CLAUDE.md)** - Your mission, orchestration role, and workflows (read first)
2. **[quick-reference.md](quick-reference.md)** - Quick decision matrix for sub-agent selection
3. **[sub-agents/](sub-agents/)** - Your specialized team of 5 sub-agents

---

## 📖 Documentation Structure

```
docs/agents/designer/
├── CLAUDE.md                      # Orchestrator guide (START HERE)
├── INDEX.md                       # This file - navigation guide
├── quick-reference.md             # Quick decision matrix
└── sub-agents/                    # Your specialized team
    ├── ux-reviewer.md             # UI/UX review and evaluation
    ├── visual-tester.md           # Visual testing and QA
    ├── design-proposer.md         # Design proposals and specifications
    ├── ui-implementer.md          # Small UI fixes implementation
    └── accessibility-specialist.md # Accessibility audits and compliance
```

---

## 🤖 Your Sub-Agents

| Sub-Agent | Color | Expertise | File |
|-----------|-------|-----------|------|
| **ux-reviewer** | Pink | UI/UX review, consistency checks, user flows | [sub-agents/ux-reviewer.md](sub-agents/ux-reviewer.md) |
| **visual-tester** | Cyan | Visual QA, cross-browser testing, responsive verification | [sub-agents/visual-tester.md](sub-agents/visual-tester.md) |
| **design-proposer** | Magenta | Design proposals, mockups, stakeholder approval | [sub-agents/design-proposer.md](sub-agents/design-proposer.md) |
| **ui-implementer** | Lime | Small UI fixes, CSS improvements, animations | [sub-agents/ui-implementer.md](sub-agents/ui-implementer.md) |
| **accessibility-specialist** | Teal | WCAG compliance, keyboard navigation, screen readers | [sub-agents/accessibility-specialist.md](sub-agents/accessibility-specialist.md) |

---

## 🔄 Workflow Diagram

```
ISSUE IDENTIFICATION
│
├─ 1. Weekly UI/UX Review
│  └─ Use ux-reviewer → Identify issues
│     └─ Small fix → Use ui-implementer
│     └─ Large change → Use design-proposer
│
├─ 2. Visual Testing (Before/After Deployments)
│  └─ Use visual-tester → Test across browsers/devices
│     └─ Quick fix → Use ui-implementer
│     └─ Complex bug → Create GitHub Issue
│
├─ 3. Design Proposals (Major Changes)
│  └─ Use design-proposer → Create proposal
│     └─ Get user approval
│     └─ Small change → Use ui-implementer
│     └─ Large change → Create GitHub Issue
│
├─ 4. UI Implementation (Small Fixes)
│  └─ Use ui-implementer → Implement fix
│     └─ Test locally
│     └─ Update branch with main (CRITICAL!)
│     └─ Submit PR
│
└─ 5. Accessibility Audit (Monthly)
   └─ Use accessibility-specialist → Full WCAG audit
      └─ Quick fixes → Use ui-implementer
      └─ Complex fixes → Create GitHub Issue
```

---

## 📋 By Task: What Sub-Agent to Use

### Design Review & Testing

| Task | Sub-Agent | Why |
|------|-----------|-----|
| Weekly UI/UX review | `ux-reviewer` | Find issues, check consistency |
| Test after deployment | `visual-tester` | Cross-browser, responsive testing |
| Monthly accessibility audit | `accessibility-specialist` | WCAG compliance checks |

### Design Changes

| Task | Sub-Agent | Why |
|------|-----------|-----|
| Propose major design change | `design-proposer` | Create proposal, get approval |
| Implement small UI fix | `ui-implementer` | Quick styling improvements |
| Fix color contrast | `accessibility-specialist` → `ui-implementer` | Audit → Quick fix |

### Issue Resolution

| Task | Sub-Agent | Why |
|------|-----------|-----|
| Found design inconsistency | `ui-implementer` (small) or `design-proposer` (large) | Assess complexity |
| Mobile layout broken | `ui-implementer` (CSS) or Create Issue (complex) | Determine fix approach |
| Accessibility issue | `accessibility-specialist` → `ui-implementer` | Audit → Fix |

---

## 📂 Working Documentation

### Files You Work With

```
docs/03-reference/frontend/       # Frontend patterns (READ THIS!)
├── README.md                      # Component patterns
├── styling-guide.md               # Design system (if exists)
└── components/                    # Component documentation

docs/05-business/
└── user-behavior-reports/         # User behavior data (READ THIS!)
    └── [month].md                 # Analytics and feedback

docs/06-operations/
└── quality-dashboard.md           # Quality metrics (you report to)
```

### Testing Resources

```
Local Environment:
- http://localhost:8083           # Local development
- Browser DevTools                 # Responsive testing, inspection

Production:
- https://charhub.app              # Production website

Accessibility Tools:
- Lighthouse (Chrome DevTools)     # Accessibility audit
- axe DevTools (Extension)         # Accessibility testing
- WAVE (Extension/Online)          # Accessibility checker
- WebAIM Contrast Checker          # Color contrast validation
```

---

## 🚨 Critical Reminders

### Before Implementing (ui-implementer)

- ✅ Assess if it's truly a small fix (<50 lines)
- ✅ Test locally on multiple screen sizes
- ✅ Test in multiple browsers (Chrome, Firefox, Safari)
- ✅ **Update branch with main BEFORE creating PR** (CRITICAL!)
- ✅ Test again after merging main
- ✅ Use i18n keys, never hardcode text

### Before Proposing (design-proposer)

- ✅ Research the problem thoroughly
- ✅ Check with Agent Planner for user data
- ✅ Create mockups or detailed descriptions
- ✅ Document rationale and benefits
- ✅ Get explicit user approval before implementing
- ✅ Consider accessibility in all proposals

### Before Auditing (ux-reviewer, visual-tester, accessibility-specialist)

- ✅ Read latest feature specs
- ✅ Understand what changed
- ✅ Document findings with screenshots
- ✅ Prioritize issues by severity
- ✅ Provide actionable recommendations

---

## 📚 Detailed Sub-Agent Descriptions

### ux-reviewer (Pink)

**Use when**: Regular UI/UX reviews, design consistency checks, user flow evaluation

**Delegates to**:
- UI consistency review (colors, fonts, spacing)
- User flow analysis and optimization
- Visual hierarchy assessment
- Interaction quality evaluation
- Improvement identification
- Competitive analysis

**Output**: UI review reports with prioritized issues

**See**: [sub-agents/ux-reviewer.md](sub-agents/ux-reviewer.md)

---

### visual-tester (Cyan)

**Use when**: Visual testing before/after deployments, cross-browser testing

**Delegates to**:
- Pre-deployment visual QA
- Post-deployment verification
- Cross-browser compatibility testing (Chrome, Firefox, Safari, Edge)
- Responsive design verification (mobile, tablet, desktop)
- Visual regression detection
- Bug documentation with screenshots

**Output**: Visual testing reports with issue documentation

**See**: [sub-agents/visual-tester.md](sub-agents/visual-tester.md)

---

### design-proposer (Magenta)

**Use when**: Major design changes, design specifications, stakeholder approval

**Delegates to**:
- Design strategy and rationale
- Visual proposals and mockups
- Stakeholder communication
- User research support
- Approval management
- Implementation briefing for Agent Coder

**Output**: Design proposals with mockups, rationale, and acceptance criteria

**See**: [sub-agents/design-proposer.md](sub-agents/design-proposer.md)

---

### ui-implementer (Lime)

**Use when**: Small UI fixes, CSS improvements, minor component updates

**Delegates to**:
- Small UI fixes (<50 lines of code)
- Visual polish and refinement
- Component styling improvements
- Accessibility quick fixes
- Responsive layout fixes
- Animation and micro-interaction enhancements

**Output**: Pull requests with small UI improvements

**See**: [sub-agents/ui-implementer.md](sub-agents/ui-implementer.md)

---

### accessibility-specialist (Teal)

**Use when**: Monthly accessibility audits, WCAG compliance checks

**Delegates to**:
- Accessibility audits (WCAG 2.1 AA)
- Keyboard navigation testing
- Screen reader compatibility (NVDA, VoiceOver, TalkBack)
- Color contrast verification
- ARIA implementation review
- Mobile accessibility testing

**Output**: Accessibility audit reports with improvement plans

**See**: [sub-agents/accessibility-specialist.md](sub-agents/accessibility-specialist.md)

---

## 💡 Common Scenarios

| Scenario | Sub-Agent | Workflow |
|----------|-----------|----------|
| Weekly UI review | `ux-reviewer` | Review → Identify issues → Fix (ui-implementer) or Propose (design-proposer) |
| Testing after deployment | `visual-tester` | Test → Document issues → Fix (ui-implementer) or Create Issue |
| Want to redesign a page | `ux-reviewer` → `design-proposer` | Analyze → Create proposal → Get approval → Implement or Create Issue |
| Found design inconsistency | `ui-implementer` (small) or `design-proposer` (large) | Assess complexity → Fix or Propose |
| Monthly accessibility check | `accessibility-specialist` | Audit → Quick fixes (ui-implementer) or Create Issue |
| Button color wrong | `ui-implementer` | Quick CSS fix → Test → PR |
| Mobile layout broken | `ui-implementer` (CSS) or Create Issue (complex) | Determine fix approach |
| Need new complex component | `design-proposer` | Create proposal → Get approval → Create GitHub Issue |

---

## 🎓 Your Weekly Cycle

### Monday: UI/UX Review
- Use `ux-reviewer` to review website
- Check design consistency
- Evaluate user flows
- Identify improvements

### Tuesday: Visual Testing
- Use `visual-tester` if recent deployment
- Test across browsers and devices
- Document any issues found

### Wednesday: Design Improvements
- Small fixes → Use `ui-implementer`
- Large changes → Use `design-proposer`
- Get approvals for major changes

### Thursday: Implementation
- Use `ui-implementer` for small fixes
- Test thoroughly
- Create PRs

### Friday: Review & Documentation
- Review week's progress
- Update quality dashboard
- Plan next week's priorities

### Monthly: Accessibility Audit
- Use `accessibility-specialist` for full audit
- Create improvement plan
- Implement quick fixes

---

## 🤝 Working with Other Agents

### Agent Planner
- **They provide**: User behavior reports, feature priorities, quality metrics
- **You provide**: Design insights, UX improvements, visual testing results
- **Communication**:
  - Read their reports in `docs/05-business/`
  - Report UX issues via quality dashboard
  - Inform them of major design initiatives

### Agent Coder
- **They provide**: Implementation of complex UI changes
- **You provide**: GitHub Issues with design requirements, mockups, acceptance criteria
- **Communication**:
  - Via GitHub Issues (you create via `design-proposer`)
  - Review their PRs for design quality
  - Provide feedback on UI implementation

### Agent Reviewer
- **They provide**: Deployment of your design changes, production feedback
- **You provide**: PRs with small design improvements (via `ui-implementer`)
- **Communication**:
  - Via Pull Requests (like Agent Coder)
  - They test and deploy your changes
  - You verify in production after deployment

---

## 🆘 Finding What You Need

### "I don't know which sub-agent to use"
→ Read [quick-reference.md](quick-reference.md) - Decision matrix and scenarios

### "I need to understand my role"
→ Read [CLAUDE.md](CLAUDE.md) - Your mission and orchestration workflow

### "I need detailed sub-agent information"
→ Browse [sub-agents/](sub-agents/) - Each agent's complete documentation

### "I need to review UI/UX"
→ Read [sub-agents/ux-reviewer.md](sub-agents/ux-reviewer.md) - Review framework

### "I need to test visual quality"
→ Read [sub-agents/visual-tester.md](sub-agents/visual-tester.md) - Testing procedures

### "I need to propose a design change"
→ Read [sub-agents/design-proposer.md](sub-agents/design-proposer.md) - Proposal templates

### "I need to implement a small fix"
→ Read [sub-agents/ui-implementer.md](sub-agents/ui-implementer.md) - Implementation workflow

### "I need to audit accessibility"
→ Read [sub-agents/accessibility-specialist.md](sub-agents/accessibility-specialist.md) - Audit framework

---

## 📝 Language Policy

- **Code & Documentation**: English (en-US) ONLY
- **User Communication**: Portuguese (pt-BR) when user is Brazilian

---

## 🎯 Remember

### The Golden Rule
**"User approval first for major changes. Then implement or delegate."**

Don't surprise users with dramatic UI changes. Get buy-in first via `design-proposer`.

### The Designer's Mantra
**"Beauty AND Functionality. Never sacrifice usability for aesthetics."**

A beautiful but unusable interface is worse than an ugly but functional one.

### The Accessibility Principle
**"Design for Everyone. Keyboard users, screen readers, mobile users, all browsers."**

Inclusive design is good design. Use `accessibility-specialist` regularly.

---

**Agent Designer**: Orchestrating beautiful, intuitive, accessible experiences through expert delegation! 🎨

For detailed procedures, see [CLAUDE.md](CLAUDE.md) and [sub-agents/](sub-agents/).
