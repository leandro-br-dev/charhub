# Design Proposal Checklist

**When to use**: Proposing major design or layout changes

**Duration**: 1-3 hours

**Output**: Design proposal document with user approval

---

## 📋 Before Creating Proposal

- [ ] **Identify the problem**
  - What UX issue are you solving?
  - What user pain point does this address?
  - What data supports this change?

- [ ] **Research solutions**
  - Check existing design patterns
  - Review similar features on other sites
  - Consider multiple approaches

---

## 🎨 Create Design Proposal

### Written Description

- [ ] **Problem Statement**
  ```markdown
  ## Problem
  [Describe current UX issue clearly]

  **Evidence**:
  - User feedback: [Quote or summarize]
  - Usage data: [From Agent Planner reports]
  - Current pain points: [List specific issues]
  ```

- [ ] **Proposed Solution**
  ```markdown
  ## Proposed Solution

  **Overview**: [High-level description]

  **Key Changes**:
  1. [Specific change 1]
  2. [Specific change 2]
  3. [Specific change 3]

  **Benefits**:
  - [Benefit 1]
  - [Benefit 2]
  - [Benefit 3]

  **Trade-offs**:
  - [What we're giving up or risk]
  ```

### Visual Mockup (If Layout Change)

- [ ] **Create mockup**
  - Option 1: Text-based description with ASCII art
  - Option 2: Screenshot with annotations
  - Option 3: Sketch/wireframe tool (Excalidraw, Figma)

  ```markdown
  ## Visual Mockup

  **Current Layout**:
  [Screenshot or description of current state]

  **Proposed Layout**:
  [Screenshot, wireframe, or detailed description]

  **Key Differences**:
  - [Change 1]
  - [Change 2]
  ```

### Implementation Plan

- [ ] **Complexity assessment**
  ```markdown
  ## Implementation

  **Complexity**: Small / Medium / Large

  **Small** (I can implement):
  - CSS/styling changes only
  - <50 lines of code
  - No backend changes

  **Medium-Large** (GitHub Issue for Agent Coder):
  - Component restructuring
  - State management changes
  - >50 lines of code
  - Backend integration needed

  **Recommended Approach**:
  [How to implement this change]
  ```

---

## 📝 Get User Approval

- [ ] **Present proposal to user**
  - Share complete proposal document
  - Explain problem and solution clearly
  - Show mockup/description
  - Wait for approval

- [ ] **Address user feedback**
  - Revise proposal based on feedback
  - Clarify any questions
  - Get final approval

---

## ✅ After Approval

### If Small Change (You Implement)

- [ ] Execute [design-implementation.md](design-implementation.md)
- [ ] Implement the approved design
- [ ] Test thoroughly
- [ ] Create PR

### If Large Change (Agent Coder Implements)

- [ ] **Create GitHub Issue**
  ```bash
  gh issue create \
    --title "design: [Feature Name] UI Redesign" \
    --label "design,enhancement" \
    --assignee "Agent-Coder" \
    --body "$(cat proposal.md)"
  ```

- [ ] **Issue should include**:
  - Problem statement
  - Proposed solution
  - Visual mockup
  - User approval confirmation
  - Acceptance criteria
  - Implementation notes

- [ ] **Follow up with Agent Coder**
  - Answer questions
  - Provide design guidance
  - Review implementation

---

## 📚 Proposal Template

```markdown
# Design Proposal: [Feature/Page Name]

**Date**: YYYY-MM-DD
**Proposed by**: Agent Designer
**Status**: Awaiting Approval / Approved / Rejected

---

## Problem Statement

[Clear description of UX issue]

**Evidence**:
- User feedback: [Quotes/summary]
- Data: [From Agent Planner reports]
- Pain points: [Specific issues]

---

## Proposed Solution

**Overview**: [High-level description]

**Key Changes**:
1. [Change 1]
2. [Change 2]

**Benefits**:
- [Benefit 1]
- [Benefit 2]

**Trade-offs**:
- [Risk or limitation]

---

## Visual Design

**Current State**:
[Screenshot or description]

**Proposed State**:
[Mockup or detailed description]

**Key Visual Changes**:
- [Visual difference 1]
- [Visual difference 2]

---

## Implementation

**Complexity**: Small / Medium / Large

**Approach**: [Who implements and how]

**Estimated Effort**: [If known]

---

## User Approval

- [ ] User reviewed proposal
- [ ] User approved changes
- [ ] Ready to implement

**User Comments**: [Any feedback]

---

## Next Steps

1. [Step 1]
2. [Step 2]
```

---

## 🚨 Common Pitfalls

❌ **Skipping user approval** - Always get buy-in first
❌ **Vague proposals** - Be specific about what changes
❌ **No mockup** - Visual changes need visual examples
❌ **Ignoring constraints** - Consider technical feasibility

---

**Remember**: Clear communication prevents wasted work! 📋
