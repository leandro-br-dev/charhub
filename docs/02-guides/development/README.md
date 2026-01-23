# Development Guide

This guide covers local development, code style, Git workflow, and contributing to CharHub.

---

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Git Workflow](#git-workflow)
- [Documentation Standards](#documentation-standards)
- [Testing Guidelines](#testing-guidelines)
- [Submitting Changes](#submitting-changes)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Docker** and Docker Compose
- **Git** for version control
- **Google Cloud SDK** (for production deployment)

### Local Setup

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Start development environment
docker compose up -d

# Access application
# Frontend: http://localhost:8082
# Backend: http://localhost:8002
```

For detailed setup instructions, see:
- [Credit Verification](./credit-verification.md)
- [Development Operations](./dev-operations.md)
- [Docker Override](./docker-override.md)
- [Stripe Integration](./stripe-integration.md)

---

## 🔄 Development Workflow

CharHub uses a **multi-agent development workflow**:

- **Agent Coder**: Implements features in `feature/*` branches
- **Agent Reviewer**: Reviews PRs, tests, and deploys to production

### For Contributors

1. **Pick an issue** or propose a new feature
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Implement** your changes
4. **Test** locally (see [Testing Guidelines](#testing-guidelines))
5. **Submit** a Pull Request

### Branch Naming Convention

```
feature/feature-name     # New features
fix/bug-description      # Bug fixes
docs/documentation-area  # Documentation updates
refactor/component-name  # Code refactoring
test/test-area          # Test additions
```

---

## 📝 Code Style

### General Principles

- **Clarity over cleverness** - Write code that is easy to understand
- **Consistency** - Follow existing patterns in the codebase
- **Documentation** - Comment complex logic, not obvious code
- **Types** - Use TypeScript strict mode, avoid `any`

### TypeScript/JavaScript

```typescript
// ✅ Good
interface UserProfile {
  id: string;
  name: string;
  email: string;
}

function getUserProfile(userId: string): Promise<UserProfile> {
  // Implementation
}

// ❌ Bad
function getUser(id: any): any {
  // Implementation
}
```

### React Components

```typescript
// ✅ Good - Functional component with TypeScript
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function Button({ label, onClick, disabled = false }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}

// ❌ Bad - No types, class component
export class Button extends React.Component {
  render() {
    return <button>{this.props.label}</button>;
  }
}
```

For complete style guide, see [code-style.md](./code-style.md).

---

## 🔀 Git Workflow

### Multi-Agent System

CharHub uses a specialized multi-agent workflow:

- **Agent Coder** works in `feature/*` branches
- **Agent Reviewer** reviews PRs and deploys to `main`
- **Agent Planner** creates feature specifications

### Branch Rules

- **NEVER** push directly to `main` (only Agent Reviewer)
- **ALWAYS** work in `feature/*` branches
- **USE** `git-safety-officer` before any Git operations

For complete Git workflow, see [git-workflow.md](./git-workflow.md).

Also see:
- [Git Best Practices](./git-best-practices.md)
- [Git & GitHub Actions](./git-github-actions.md)

---

## 📚 Documentation Standards

### When to Document

- **New features**: Update relevant guides in `docs/03-reference/`
- **API changes**: Update API documentation
- **Breaking changes**: Add migration guide
- **Complex logic**: Add inline comments

### Documentation Structure

Follow the **Diátaxis Framework**:

- **Tutorials** (learning-oriented) → `docs/01-getting-started/`
- **How-To Guides** (problem-oriented) → `docs/02-guides/`
- **Reference** (information-oriented) → `docs/03-reference/`
- **Explanation** (understanding-oriented) → `docs/04-architecture/`

### Markdown Style

```markdown
# Use ATX-style headers (not Setext)

## Good heading structure

- Use lists for multiple items
- Keep lines under 120 characters
- Use code blocks with language specification

\```typescript
// Code example
\```

**Bold** for emphasis, *italic* for slight emphasis.

[Links](./relative-path.md) use relative paths.
```

For complete documentation standards, see [documentation-standards.md](./documentation-standards.md).

---

## 🧪 Testing Guidelines

### Test Requirements

- ✅ **Unit tests** for business logic
- ✅ **Integration tests** for API endpoints
- ✅ **Type checking** must pass (`npm run build`)
- ✅ **Linting** must pass (`npm run lint`)

### Running Tests

```bash
# Backend tests
cd backend
npm test
npm run build    # Type checking
npm run lint     # Code quality

# Frontend tests
cd frontend
npm run build    # Type checking (includes i18n validation)
npm run lint     # Code quality
```

### Writing Tests

```typescript
// backend/src/services/__tests__/userService.test.ts
import { createUser, getUserById } from '../userService';

describe('UserService', () => {
  it('should create a new user', async () => {
    const user = await createUser({
      name: 'Test User',
      email: 'test@example.com'
    });

    expect(user.id).toBeDefined();
    expect(user.name).toBe('Test User');
  });

  it('should retrieve user by ID', async () => {
    const user = await getUserById('user_123');
    expect(user).toBeDefined();
  });
});
```

---

## 🔀 Submitting Changes

### Before Submitting

**Checklist:**
- [ ] Code follows style guidelines
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] No TypeScript errors (`npm run build`)
- [ ] No linting errors (`npm run lint`)
- [ ] Translations built (if frontend changes): `npm run translations:compile`

### Pull Request Process

1. **Create PR** from your feature branch to `main`
2. **Fill PR template** with:
   - Summary of changes
   - Testing done
   - Migration requirements (if any)
   - Screenshots (if UI changes)
3. **Wait for review** from Agent Reviewer
4. **Address feedback** if requested
5. **PR will be merged** after approval

### PR Title Format

```
feat(module): brief description
fix(module): brief description
docs(module): brief description
```

**Examples:**
- `feat(chat): add message reactions`
- `fix(auth): resolve OAuth token refresh issue`
- `docs(api): update LLM provider documentation`

---

## 🤝 Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. Please:

- ✅ Be respectful and inclusive
- ✅ Welcome diverse perspectives
- ✅ Accept constructive criticism gracefully
- ✅ Focus on what is best for the community
- ❌ Do not harass, discriminate, or be disrespectful

---

## 📞 Getting Help

- **Documentation**: Start with [README.md](../../README.md)
- **Architecture**: See [System Overview](../../04-architecture/system-overview.md)
- **Development Guides**: Check [other guides](../)
- **Questions**: Open a GitHub Discussion

---

## 🎯 Key Documents

| Document | Purpose |
|----------|---------|
| [code-style.md](./code-style.md) | Code style standards |
| [git-workflow.md](./git-workflow.md) | Git and PR workflow |
| [documentation-standards.md](./documentation-standards.md) | How to write docs |
| [System Overview](../../04-architecture/system-overview.md) | Architecture |
| [Development Setup](../../01-getting-started/) | Setup instructions |

---

## 🙏 Thank You

Your contributions make CharHub better for everyone. Whether it's:

- 🐛 Reporting a bug
- 💡 Suggesting a feature
- 📝 Improving documentation
- 🛠️ Submitting code

**Every contribution matters!**

---

[← Back to Guides](../README.md) | [Back to Documentation Home](../../README.md)
