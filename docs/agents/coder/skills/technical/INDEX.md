# Technical Skills - Reference

**Last Updated**: 2025-01-24
**Purpose**: Domain knowledge skills for CharHub subagents

---

## Overview

These are **technical domain knowledge skills** that contain "how to do" knowledge (patterns, conventions, best practices). Subagents reference these skills to execute their specialized tasks.

**Note**: These are separate from Agent Coder's orchestration skills. Agent Coder has its own skills in `../skills/`.

---

## Skills by Domain

### Global Skills (All Subagents)

| Skill | Used By | Purpose |
|-------|---------|---------|
| **charhub-typescript-standards** | All | TypeScript patterns, type safety, interface definitions |
| **charhub-i18n-system** | Frontend, Backend (future) | Internationalization patterns and conventions |
| **charhub-documentation-patterns** | All | Documentation file creation and standards |

### Backend Skills

| Skill | Used By | Purpose |
|-------|---------|---------|
| **charhub-express-patterns** | backend-developer | Express server setup, middleware, TypeScript |
| **charhub-express-routes-patterns** | backend-developer | Route organization, RESTful conventions, HTTP methods |
| **charhub-express-controllers-patterns** | backend-developer | Controller patterns, request handling, separation of concerns |
| **charhub-express-middleware-patterns** | backend-developer | Authentication, logging, error handling, custom middleware |
| **charhub-prisma-patterns** | backend-developer | Prisma ORM usage, migrations, database operations |

### Frontend Skills

| Skill | Used By | Purpose |
|-------|---------|---------|
| **charhub-react-patterns** | frontend-specialist | React hooks, useState, useEffect, custom hooks |
| **charhub-react-component-patterns** | frontend-specialist | Component structure, props, events, JSX |
| **charhub-react-query-patterns** | frontend-specialist | TanStack Query (React Query), useQuery, useMutation |

### Testing Skills

| Skill | Used By | Purpose |
|-------|---------|---------|
| **charhub-testing-standards** | test-writer, feature-tester | General testing standards, coverage requirements |
| **charhub-jest-patterns** | test-writer (backend) | Jest patterns for backend testing |
| **charhub-react-testing-patterns** | test-writer (frontend) | React Testing Library + Vitest patterns |

---

## Skill Details

### Global Skills

#### charhub-typescript-standards

**Location**: `global/charhub-typescript-standards/SKILL.md`

**Content**:
- Interface vs Type usage
- Function type signatures
- Avoiding `any` type
- Null/undefined handling
- Type guards
- Generic types
- Utility types
- Import/export patterns

**Key principles**:
- Type safety over convenience
- Explicit returns
- Proper interfaces for shapes

---

#### charhub-i18n-system

**Location**: `global/charhub-i18n-system/SKILL.md`

**Content**:
- Frontend i18n with react-i18next
- Translation file structure (en-US.json, pt-BR.json)
- Adding new translations
- i18n in React components (useTranslation hook)
- Backend i18n (planned - #129)
- Language switching

**Critical rules**:
- ALWAYS add to BOTH languages
- Run compilation after changes
- Verify build passes

---

#### charhub-documentation-patterns

**Location**: `global/charhub-documentation-patterns/SKILL.md`

**Content**:
- .docs.md file naming
- Service documentation template
- Controller documentation template
- React component documentation template

**File naming**: `{OriginalFileName}.docs.md`

---

### Backend Skills

#### charhub-express-patterns

**Location**: `backend/charhub-express-patterns/SKILL.md`

**Content**:
- Express server setup
- Middleware configuration
- TypeScript integration
- Error handling
- Request/response patterns

**Key conventions**:
- helmet → cors → body-parser → session → logging → auth → routes → error handler
- Use TypeScript for all handlers
- Proper error handling with status codes

---

#### charhub-express-routes-patterns

**Location**: `backend/charhub-express-routes-patterns/SKILL.md`

**Content**:
- Route organization
- RESTful conventions
- kebab-case URL patterns
- HTTP methods (CRUD)
- Response format
- Error response format

**Key patterns**:
- GET for list/detail
- POST for create
- PATCH for update (preferred)
- DELETE for delete

---

#### charhub-express-controllers-patterns

**Location**: `backend/charhub-express-controllers-patterns/SKILL.md`

**Content**:
- Controller patterns
- Request handling
- Separation of concerns (controllers vs services)
- Response patterns
- Error handling

**Key patterns**:
- Controllers handle request/response only
- Services contain business logic
- Use TypeScript for all handlers

---

#### charhub-express-middleware-patterns

**Location**: `backend/charhub-express-middleware-patterns/SKILL.md`

**Content**:
- Middleware execution order
- Authentication middleware
- Logging middleware
- Error handling middleware
- Validation middleware
- Custom middleware patterns

**Key patterns**:
- helmet → cors → body-parser → session → logging → auth → routes → error handler
- Use TypeScript for all middleware

---

#### charhub-prisma-patterns

**Location**: `backend/charhub-prisma-patterns/SKILL.md`

**Content**:
- CRUD operations
- Advanced queries
- Relations
- Pagination
- Transactions
- Error handling (Prisma error codes)
- Migration workflow
- Testing with Prisma

**Critical**:
- Run migrations before tests
- Use `expect.anything()` for Prisma selects
- Handle error codes (P2002, P2025, etc.)

---

### Frontend Skills

#### charhub-react-patterns

**Location**: `frontend/charhub-react-patterns/SKILL.md`

**Content**:
- React hooks (useState, useEffect, useContext, etc.)
- TypeScript integration
- Custom hooks patterns
- i18n integration (react-i18next)
- State management patterns
- Performance optimization
- Event handling

**Key conventions**:
- Use functional components with hooks
- Define interfaces for props
- Use custom hooks for reusable logic

---

#### charhub-react-component-patterns

**Location**: `frontend/charhub-react-component-patterns/SKILL.md`

**Content**:
- Component file structure
- Component naming (PascalCase)
- Props definition with TypeScript
- Events/callbacks patterns
- JSX patterns (conditional rendering, lists)
- Component composition
- Children prop patterns
- Styling conventions (Tailwind CSS)
- Performance patterns

**Key principles**:
- Single responsibility
- Use CSS-in-JS or utility classes
- Add i18n for user-facing text

---

### Testing Skills

#### charhub-testing-standards

**Location**: `testing/charhub-testing-standards/SKILL.md`

**Content**:
- Testing philosophy (test pyramid)
- Coverage requirements
- Test organization
- Test naming conventions
- Backend testing (Jest)
- Frontend testing (Vitest)
- Database testing
- Test utilities
- Async testing

**Coverage goals**:
- Backend: >80%
- Frontend: >70%
- Critical paths: 100%

---

#### charhub-jest-patterns

**Location**: `testing/charhub-jest-patterns/SKILL.md`

**Content**:
- Test file setup
- Mocking Prisma
- Mocking dependencies
- Express testing patterns
- Async testing
- Matchers
- Test doubles (spies, stubs)
- Parameterized tests
- Setup and teardown

**Key tools**:
- `jest-mock-extended` for mocking
- AAA pattern (Arrange, Act, Assert)
- `expect.anything()` for Prisma selects

---

#### charhub-react-testing-patterns

**Location**: `testing/charhub-react-testing-patterns/SKILL.md`

**Content**:
- Test file setup
- Component testing with React Testing Library
- Props, events, callbacks testing
- Custom hooks testing
- Mocking API calls
- Mocking React Router
- Mocking i18n (react-i18next)
- Async testing
- Test selectors (data-testid)
- Snapshot testing

**Key patterns**:
- Use `data-testid` as last resort
- Prefer user-visible text queries
- Test behavior, not implementation

---

## Usage by Subagents

### backend-developer

**Skills used**:
- charhub-typescript-standards
- charhub-express-patterns
- charhub-express-routes-patterns
- charhub-express-controllers-patterns
- charhub-express-middleware-patterns
- charhub-prisma-patterns
- charhub-i18n-system (future API i18n)
- charhub-documentation-patterns

**For**: Implementing Express APIs, services, database operations

---

### frontend-specialist

**Skills used**:
- charhub-typescript-standards
- charhub-react-patterns
- charhub-react-component-patterns
- charhub-react-query-patterns
- charhub-i18n-system
- charhub-documentation-patterns

**For**: Creating React components, React hooks, i18n implementation, UI features

---

### test-writer

**Skills used**:
- charhub-testing-standards
- charhub-jest-patterns (backend)
- charhub-react-testing-patterns (frontend)
- charhub-prisma-patterns
- charhub-typescript-standards

**For**: Writing unit, integration, and E2E tests

---

### feature-tester

**Skills used**:
- charhub-testing-standards
- charhub-jest-patterns
- charhub-react-testing-patterns

**For**: Running tests, verifying test results

---

### code-quality-enforcer

**Skills used**:
- charhub-typescript-standards
- charhub-express-patterns
- charhub-react-patterns
- charhub-testing-standards

**For**: Verifying code follows patterns and standards

---

### coder-doc-specialist

**Skills used**:
- charhub-documentation-patterns
- charhub-typescript-standards

**For**: Creating .docs.md files alongside code

---

## Skill vs Subagent Relationship

```
SKILLS (Knowledge / "How to Do")
├── Technical patterns
├── Conventions
├── Best practices
└── "Knowledge domain"
        ↓
    SUBAGENTS (Execution / "What to Do")
├── Receive skills as context
├── Execute specific tasks
├── Follow workflow instructions
└── "Action execution"
```

---

## Maintenance

**When to update technical skills**:
- New patterns emerge in codebase
- Libraries/frameworks update
- Best practices evolve
- New requirements identified

**Keep in sync with**:
- Actual codebase implementation
- Library versions
- Team coding standards
- Architecture decisions

---

## Quick Reference

**Finding a skill**:
1. Identify the domain (global, backend, frontend, testing)
2. Look in `docs/agents/coder/skills/technical/{domain}/`
3. Find the skill SKILL.md file

**Using a skill**:
- Subagents receive skills as context
- Skills contain detailed "how to" knowledge
- Refer to skill when implementing feature
- Follow patterns exactly as specified

---

## Structure

```
docs/agents/coder/skills/technical/
├── INDEX.md                           # This file
├── global/
│   ├── charhub-typescript-standards/
│   ├── charhub-i18n-system/
│   └── charhub-documentation-patterns/
├── backend/
│   ├── charhub-express-patterns/
│   ├── charhub-express-routes-patterns/
│   ├── charhub-express-controllers-patterns/
│   ├── charhub-express-middleware-patterns/
│   └── charhub-prisma-patterns/
├── frontend/
│   ├── charhub-react-patterns/
│   ├── charhub-react-component-patterns/
│   └── charhub-react-query-patterns/
└── testing/
    ├── charhub-testing-standards/
    ├── charhub-jest-patterns/
    └── charhub-react-testing-patterns/
```

---

## Related Documentation

- **Agent Coder Skills**: `../skills/` (orchestration skills)
- **Subagent Definitions**: `../sub-agents/`
- **Project Skills (future)**: `.claude/skills/`
