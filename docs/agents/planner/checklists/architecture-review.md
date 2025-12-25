# Architecture Review Checklist

**When to use**: Before implementing complex features or making significant system changes

**Duration**: 1-3 hours (depends on complexity)

**Output**: Architecture Decision Record (ADR) and implementation guidelines

---

## 📋 Pre-Review

### Understand the Feature

- [ ] **Read feature spec completely**
  - Location: `docs/05-business/planning/features/backlog/` or `active/`
  - Understand requirements and constraints

- [ ] **Identify architectural scope**
  - Backend changes needed?
  - Frontend changes needed?
  - Database schema changes?
  - External integrations?
  - Infrastructure changes?

- [ ] **Gather context**
  - Review existing architecture: `docs/04-architecture/system-overview.md`
  - Review related ADRs: `docs/04-architecture/decisions/`
  - Check similar existing features

---

## 🏗️ Architecture Analysis

### Current State Assessment

- [ ] **Map current architecture**
  - What components exist today?
  - How do they interact?
  - What patterns are already in use?

- [ ] **Identify affected areas**
  ```
  Backend:
  - [ ] API routes/controllers
  - [ ] Services/business logic
  - [ ] Database models
  - [ ] Middleware
  - [ ] External integrations

  Frontend:
  - [ ] Pages/routes
  - [ ] Components
  - [ ] State management
  - [ ] API client
  - [ ] UI patterns

  Infrastructure:
  - [ ] Database schema
  - [ ] Environment variables
  - [ ] Third-party services
  - [ ] Caching layer
  - [ ] File storage
  ```

### Architectural Approaches

- [ ] **Brainstorm possible approaches**
  - List 2-4 different ways to implement
  - Don't filter yet, just generate options

- [ ] **For each approach, document:**

  **Approach 1: [Name]**
  - Description: [How it works]
  - Pros:
    - Pro 1
    - Pro 2
  - Cons:
    - Con 1
    - Con 2
  - Complexity: [Low/Medium/High]
  - Risks: [List risks]

  **Approach 2: [Name]**
  - ...

---

## 🔍 Evaluation Criteria

For each approach, evaluate against these criteria:

### Technical Criteria

- [ ] **Scalability**
  - Can it handle expected load?
  - How does it perform at scale?
  - Bottlenecks identified?
  - Score: ___/10

- [ ] **Maintainability**
  - Is code easy to understand?
  - Easy to modify in the future?
  - Follows existing patterns?
  - Score: ___/10

- [ ] **Performance**
  - Response time acceptable?
  - Database query efficiency?
  - Client-side performance?
  - Score: ___/10

- [ ] **Security**
  - Authentication/authorization handled?
  - Data validation proper?
  - Potential vulnerabilities?
  - Score: ___/10

- [ ] **Testability**
  - Easy to write unit tests?
  - Easy to write integration tests?
  - Can be tested in isolation?
  - Score: ___/10

### Architectural Fit

- [ ] **Consistency with existing architecture**
  - Follows current patterns?
  - Uses existing conventions?
  - Integrates cleanly?
  - Score: ___/10

- [ ] **Future extensibility**
  - Easy to extend later?
  - Supports future requirements?
  - Flexible design?
  - Score: ___/10

- [ ] **Complexity vs value trade-off**
  - Is complexity justified by value?
  - Could simpler approach work?
  - Over-engineering risk?
  - Score: ___/10

### Practical Criteria

- [ ] **Implementation effort**
  - How long to implement?
  - Complexity level?
  - Score (inverse): ___/10 (lower effort = higher score)

- [ ] **Risk level**
  - How many unknowns?
  - Dependency on external factors?
  - Score (inverse): ___/10 (lower risk = higher score)

---

## 📊 Decision Matrix

Create a comparison table:

| Criteria | Weight | Approach 1 | Approach 2 | Approach 3 |
|----------|--------|------------|------------|------------|
| Scalability | 2x | 8 → 16 | 6 → 12 | 9 → 18 |
| Maintainability | 2x | 7 → 14 | 9 → 18 | 6 → 12 |
| Performance | 1x | 8 → 8 | 7 → 7 | 9 → 9 |
| Security | 2x | 9 → 18 | 9 → 18 | 8 → 16 |
| Testability | 1x | 7 → 7 | 8 → 8 | 6 → 6 |
| Architectural Fit | 2x | 8 → 16 | 9 → 18 | 7 → 14 |
| Extensibility | 1x | 7 → 7 | 8 → 8 | 6 → 6 |
| Complexity/Value | 1x | 6 → 6 | 8 → 8 | 5 → 5 |
| Implementation Effort | 1x | 7 → 7 | 5 → 5 | 4 → 4 |
| Risk Level | 1x | 8 → 8 | 6 → 6 | 5 → 5 |
| **TOTAL** | | **107** | **108** | **95** |

**Recommended Approach**: Approach 2 (highest score)

---

## 🎯 Make Decision

### Select Approach

- [ ] **Choose recommended approach**
  - Based on decision matrix
  - Consider qualitative factors
  - Validate with team if needed

- [ ] **Document decision rationale**
  - Why this approach?
  - What alternatives were considered?
  - What trade-offs were accepted?

### Define Implementation Guidelines

- [ ] **Technical specifications**
  ```markdown
  ## Implementation Plan

  ### Backend Changes
  1. Create new endpoint: `POST /api/v1/resource`
  2. Add service: `ResourceService`
  3. Add database model: `Resource`
  4. Middleware: `validateResource`

  ### Frontend Changes
  1. Create page: `pages/ResourcePage.tsx`
  2. Add components: `ResourceList`, `ResourceForm`
  3. Add API client: `resourceApi.ts`
  4. State management: Use React Query

  ### Database Schema
  ```sql
  CREATE TABLE resources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

  ### Environment Variables
  - `RESOURCE_API_KEY` - API key for external service
  - `RESOURCE_CACHE_TTL` - Cache time-to-live (default: 3600)
  ```

- [ ] **Coding standards**
  - TypeScript patterns to follow
  - Error handling approach
  - Logging requirements
  - Testing requirements

- [ ] **Integration points**
  - How does this integrate with existing code?
  - What interfaces need to be defined?
  - What contracts need to be maintained?

---

## 📝 Document Decision

### Create Architecture Decision Record (ADR)

- [ ] **Create ADR file**
  - Location: `docs/04-architecture/decisions/`
  - Naming: `YYYYMMDD-feature-name.md`
  - Example: `20251225-user-notifications.md`

- [ ] **Use ADR template**
  ```markdown
  # ADR: [Feature Name] Architecture

  **Date**: YYYY-MM-DD
  **Status**: Accepted
  **Decision Makers**: Agent Planner, Agent Coder (if consulted)

  ## Context

  [What is the problem we're trying to solve?]
  [What are the constraints and requirements?]
  [What is the current situation?]

  ## Decision

  We will implement [chosen approach].

  ## Rationale

  [Why this approach over alternatives?]
  [What are the key benefits?]
  [What trade-offs are we accepting?]

  ## Alternatives Considered

  ### Alternative 1: [Name]
  - **Description**: [Brief description]
  - **Pros**: [List pros]
  - **Cons**: [List cons]
  - **Why rejected**: [Reason]

  ### Alternative 2: [Name]
  - ...

  ## Consequences

  ### Positive
  - Consequence 1
  - Consequence 2

  ### Negative
  - Trade-off 1
  - Trade-off 2

  ### Neutral
  - Other impact 1
  - Other impact 2

  ## Implementation Notes

  [Key technical details]
  [Integration points]
  [Migration strategy if applicable]

  ## Success Metrics

  - Metric 1: [How to measure success]
  - Metric 2: [Performance targets]

  ## Risks & Mitigation

  | Risk | Impact | Mitigation |
  |------|--------|------------|
  | Risk 1 | High | Strategy 1 |
  | Risk 2 | Medium | Strategy 2 |

  ## Related Documents

  - Feature spec: `features/active/feature-name.md`
  - Related ADRs: [List related decisions]

  ## Review & Approval

  - [ ] Reviewed by Agent Coder
  - [ ] Technical feasibility confirmed
  - [ ] Ready for implementation
  ```

- [ ] **Fill in all sections**
  - Be thorough but concise
  - Focus on "why" not just "what"
  - Document trade-offs clearly

---

## ✅ Validation

### Review with Agent Coder

- [ ] **Share ADR with Agent Coder**
  - Get implementation feedback
  - Validate technical approach
  - Identify implementation challenges

- [ ] **Incorporate feedback**
  - Update ADR if needed
  - Refine implementation guidelines
  - Add new risks/considerations

### Technical Feasibility Check

- [ ] **Prototype if needed**
  - For high-risk approaches
  - To validate performance
  - To test integration points

- [ ] **Research unknowns**
  - Document findings
  - Update risk assessment
  - Adjust approach if needed

---

## 📢 Communication

### Update Feature Spec

- [ ] **Link ADR in feature spec**
  - Add reference to technical approach section
  - Update complexity estimate if changed
  - Note any scope adjustments

### Provide to Agent Coder

- [ ] **Clear implementation path**
  - ADR defines "what" and "why"
  - Implementation guidelines define "how"
  - Agent Coder has everything needed to start

---

## 🚨 Common Pitfalls

### Over-Engineering
❌ "We might need this in the future, so let's build it now"
✅ "Build what we need today, make it extensible for tomorrow"

### Under-Engineering
❌ "Just hack it together quickly"
✅ "Simple but solid, following our architectural patterns"

### Analysis Paralysis
❌ "We need to consider 10 different approaches"
✅ "2-3 well-thought-out approaches are enough"

### Ignoring Existing Patterns
❌ "Let's use a completely new pattern for this"
✅ "Let's follow existing patterns unless there's a strong reason not to"

### Missing Performance Considerations
❌ "We'll optimize later if needed"
✅ "Design for expected scale from the start"

---

## 📊 When to Skip Architecture Review

You can skip formal architecture review for:

- **Simple CRUD operations** following existing patterns
- **Minor UI changes** without backend impact
- **Bug fixes** that don't change architecture
- **Documentation** updates

You MUST do architecture review for:

- **New database tables** or significant schema changes
- **New external integrations** or third-party services
- **Significant performance requirements**
- **Complex business logic** or workflows
- **Breaking changes** to existing APIs
- **Security-sensitive features**

---

## 📚 See Also

- **[feature-planning.md](feature-planning.md)** - Where architecture questions first arise
- **[../CLAUDE.md](../CLAUDE.md)** - Overall Agent Planner workflow
- **[../../04-architecture/system-overview.md](../../../04-architecture/system-overview.md)** - Current system architecture
- **[../../04-architecture/decisions/](../../../04-architecture/decisions/)** - Past architectural decisions

---

**Remember**: Good architecture is simple, maintainable, and solves the right problem! 🏗️

"Make it work, make it right, make it fast" - in that order.
