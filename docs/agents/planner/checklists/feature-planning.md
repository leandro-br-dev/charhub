# Feature Planning Checklist

**When to use**: User requests a new feature or you identify a product opportunity

**Duration**: 30-90 minutes (depends on complexity)

**Output**: Complete feature specification document

---

## 📋 Pre-Planning

### Understand the Request

- [ ] **Read user request completely**
  - Where: `docs/05-business/planning/user-feature-notes.md`
  - Understand: What problem they're trying to solve

- [ ] **Identify the real need**
  - What is the user actually trying to accomplish?
  - What pain point does this address?
  - Is this a common request or one-off need?

- [ ] **Check for duplicates**
  - Search existing features in `backlog/`, `active/`, `implemented/`
  - Could this be handled by extending an existing feature?

---

## 🎯 Define Feature Scope

### User Story & Goals

- [ ] **Write user story**
  ```
  As a [user type]
  I want to [action]
  So that [benefit]
  ```

- [ ] **Define success criteria**
  - How will we know this feature is successful?
  - What metrics will we track?
  - What does "done" look like?

- [ ] **Identify user personas**
  - Who will use this feature?
  - What are their skill levels?
  - What are their expectations?

### Functional Requirements

- [ ] **List core functionality**
  - What MUST the feature do? (critical)
  - What SHOULD the feature do? (important)
  - What COULD the feature do? (nice to have)

- [ ] **Define edge cases**
  - What happens when things go wrong?
  - What are the error scenarios?
  - What are the boundary conditions?

- [ ] **Specify data requirements**
  - What data does the feature need?
  - Where does that data come from?
  - How is data validated?

### Non-Functional Requirements

- [ ] **Performance expectations**
  - Response time requirements?
  - Concurrent user load?
  - Data volume expectations?

- [ ] **Security considerations**
  - Authentication/authorization needed?
  - Data privacy concerns?
  - Potential security vulnerabilities?

- [ ] **Accessibility requirements**
  - i18n (internationalization) needs?
  - Screen reader compatibility?
  - Keyboard navigation?

---

## 🏗️ Technical Planning

### Architecture Review

- [ ] **Identify affected components**
  - Backend endpoints needed?
  - Frontend components needed?
  - Database changes needed?
  - External services needed?

- [ ] **Evaluate technical approaches**
  - What are the possible implementation strategies?
  - What are the trade-offs of each approach?
  - Which approach best fits our architecture?

- [ ] **Check for breaking changes**
  - Will this affect existing functionality?
  - Do we need API versioning?
  - Migration strategy needed?

- [ ] **Database schema changes**
  - New tables/columns needed?
  - Data migration required?
  - Impact on existing queries?

### Complexity Assessment

- [ ] **Estimate complexity**
  - Simple: 1-2 days (straightforward, well-understood)
  - Medium: 3-5 days (some unknowns, moderate scope)
  - Complex: 1-2 weeks (many unknowns, large scope)
  - Very Complex: 2+ weeks (requires significant architecture changes)

- [ ] **Identify risks**
  - Technical risks (unknown technologies, complex logic)
  - Business risks (unclear requirements, changing priorities)
  - Dependency risks (external services, third-party libraries)

- [ ] **List dependencies**
  - What must be completed first?
  - What can be done in parallel?
  - Any external blockers?

---

## 📝 Documentation

### Create Feature Spec Document

- [ ] **Create spec file**
  - Location: `docs/05-business/planning/features/backlog/`
  - Naming: `feature-name.md` (use kebab-case)

- [ ] **Use feature spec template**
  ```markdown
  # Feature: [Feature Name]

  **Status**: Backlog
  **Priority**: TBD
  **Complexity**: TBD
  **Assigned to**: Unassigned
  **Created**: YYYY-MM-DD

  ## Problem Statement
  [What problem does this solve?]

  ## User Story
  As a [user type]
  I want to [action]
  So that [benefit]

  ## Success Criteria
  - [ ] Criterion 1
  - [ ] Criterion 2

  ## Functional Requirements
  ### Must Have
  - Requirement 1
  - Requirement 2

  ### Should Have
  - Requirement 3

  ### Could Have
  - Requirement 4

  ## Technical Approach
  ### Architecture
  [High-level architecture description]

  ### Components Affected
  - Backend: [endpoints, services, models]
  - Frontend: [pages, components]
  - Database: [schema changes]

  ### Implementation Strategy
  [Recommended approach and rationale]

  ## Edge Cases & Validation
  - Edge case 1
  - Edge case 2

  ## Security Considerations
  - Security concern 1
  - Security concern 2

  ## Testing Strategy
  - Unit tests: [what to test]
  - Integration tests: [what to test]
  - E2E tests: [what to test]

  ## Documentation Needs
  - [ ] API documentation
  - [ ] User guide
  - [ ] Architecture decision record

  ## Risks & Mitigation
  | Risk | Impact | Probability | Mitigation |
  |------|--------|-------------|------------|
  | Risk 1 | High/Med/Low | High/Med/Low | Strategy |

  ## Dependencies
  - Dependency 1
  - Dependency 2

  ## Open Questions
  - Question 1
  - Question 2

  ## Timeline Estimate
  - Complexity: [Simple/Medium/Complex/Very Complex]
  - Estimated effort: [X days/weeks]
  - Blocker: [Any blockers?]
  ```

- [ ] **Fill in all sections**
  - Don't leave TBD unless truly unknown
  - Ask user for clarification if needed
  - Document assumptions clearly

---

## ✅ Validation

### Review with Agent Coder (If Complex)

- [ ] **Share spec with Agent Coder**
  - Get technical feasibility feedback
  - Validate complexity estimate
  - Identify implementation challenges

- [ ] **Incorporate feedback**
  - Update spec based on technical insights
  - Adjust complexity if needed
  - Add new risks/dependencies identified

### Review with User (If Unclear Requirements)

- [ ] **Clarify ambiguities**
  - List all unclear requirements
  - Ask specific questions
  - Get concrete examples

- [ ] **Validate understanding**
  - Summarize feature back to user
  - Confirm success criteria
  - Align on scope

---

## 📊 Next Steps

### Add to Backlog

- [ ] **Save spec to backlog**
  - File location: `docs/05-business/planning/features/backlog/feature-name.md`
  - Commit message: `docs: add feature spec for [feature name]`

- [ ] **Update tracking**
  - Add to backlog tracking (if we have one)
  - Note in user-feature-notes.md that request is now spec'd

### Ready for Prioritization

- [ ] **Feature is ready to be prioritized**
  - Move to `checklists/feature-prioritization.md` during weekly planning
  - Will be ranked against other backlog items

---

## 🚨 Common Pitfalls

### Too Vague
❌ "Add user settings"
✅ "Add user profile settings page with email notifications preferences, display name editing, and account deletion"

### Too Detailed
❌ Specifying exact CSS classes and variable names
✅ Describing the UI behavior and visual requirements

### Missing Context
❌ "Users need this feature"
✅ "Users are currently using a manual workaround that takes 10 minutes per day. This feature automates it."

### Unclear Success Criteria
❌ "Feature should be good"
✅ "Feature reduces average task time from 10 minutes to <1 minute"

---

## 📚 See Also

- **[feature-prioritization.md](feature-prioritization.md)** - Next step: prioritize this feature
- **[architecture-review.md](architecture-review.md)** - For complex features requiring deep technical planning
- **[../CLAUDE.md](../CLAUDE.md)** - Overall Agent Planner workflow
- **[../../05-business/planning/user-feature-notes.md](../../../05-business/planning/user-feature-notes.md)** - Raw user requests

---

**Remember**: A good feature spec saves hours of confusion during implementation! 🎯
