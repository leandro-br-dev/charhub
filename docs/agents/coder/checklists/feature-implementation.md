# Feature Implementation Checklist

**When to use**: When starting to implement a new feature

**Duration**: Varies by feature complexity (1-10 days)

**Output**: Working feature ready for testing

---

## 📋 Preparation

- [ ] **Read your assignment**
  ```bash
  cat docs/05-business/planning/agent-assignments.md
  ls docs/05-business/planning/features/active/
  ```

- [ ] **Read feature spec completely**
  - Location: `docs/05-business/planning/features/active/[feature-name].md`
  - Understand requirements, success criteria, technical approach

- [ ] **Read architecture docs**
  - `docs/04-architecture/system-overview.md`
  - `docs/04-architecture/database-schema.md`
  - Related ADRs in `docs/04-architecture/decisions/`

- [ ] **Read reference docs**
  - Backend: `docs/03-reference/backend/README.md`
  - Frontend: `docs/03-reference/frontend/README.md`
  - **CRITICAL**: `docs/03-reference/backend/translation-system.md`

---

## 🌿 Create Feature Branch

- [ ] **Switch to main and update**
  ```bash
  git checkout main
  git pull origin main
  ```

- [ ] **Create feature branch**
  ```bash
  git checkout -b feature/descriptive-name
  ```
  - Naming: `feature/[short-description]`
  - Examples: `feature/user-settings`, `feature/fix-auth-bug`

---

## 💻 Backend Implementation

### Database Changes (if needed)

- [ ] **Update Prisma schema**
  ```bash
  vim backend/prisma/schema.prisma
  ```

- [ ] **Create migration**
  ```bash
  cd backend
  npm run prisma:migrate:dev
  ```

- [ ] **Generate Prisma client**
  ```bash
  npm run prisma:generate
  ```

### API Development

- [ ] **Create/update routes**
  - Follow REST conventions: `/api/v1/resource`
  - Use existing middleware: `authenticateJWT`, `handleAsync`

- [ ] **Implement services/business logic**
  - Keep controllers thin
  - Business logic in services

- [ ] **Add input validation**
  - Use Zod schemas
  - Validate all user input

- [ ] **Add proper TypeScript types**
  - No `any` types
  - Export interfaces for reuse

- [ ] **Use i18n for messages**
  - Keys in `backend/translations/[lang]/[namespace].json`
  - See translation system docs

---

## 🎨 Frontend Implementation

### **CRITICAL: Internationalization**

⚠️ **ALL frontend text MUST use i18n from the start**

- [ ] **Use i18n hook**
  ```typescript
  import { useTranslation } from 'react-i18next';
  
  function MyComponent() {
    const { t } = useTranslation('namespace');
    return <button>{t('save_changes')}</button>;
  }
  ```

- [ ] **Create translation keys**
  - File: `frontend/public/locales/en/[namespace].json`
  - Use descriptive keys: `user_settings.save_button`

### Component Development

- [ ] **Follow existing patterns**
  - Check similar components
  - Use consistent structure

- [ ] **Use TypeScript strict mode**
  - Define interfaces for props
  - Type all state and functions

- [ ] **Use Tailwind CSS for styling**
  - Follow existing design patterns
  - Check with Agent Designer if unsure

- [ ] **Use TanStack Query for data fetching**
  - Consistent API calls
  - Automatic caching and revalidation

### Error Handling

- [ ] **Handle API errors gracefully**
  ```typescript
  try {
    await apiCall();
  } catch (error) {
    toast.error(t('errors.generic'));
    console.error('API Error:', error);
  }
  ```

---

## 📝 Track Progress

- [ ] **Update feature spec regularly**
  - File: `docs/05-business/planning/features/active/[feature-name].md`
  - Mark completed tasks
  - Note blockers or questions
  - Add implementation notes

---

## 🚨 Common Pitfalls

❌ **Hardcoding text** - Use i18n
❌ **Skipping TypeScript** - Build will fail in PR
❌ **Not following patterns** - Check existing code first
❌ **Large commits** - Commit frequently

---

## 📚 See Also

- **[testing.md](testing.md)** - Next step: test your feature
- **[code-quality.md](code-quality.md)** - Coding standards reference
- **[../CLAUDE.md](../CLAUDE.md)** - Overall Agent Coder workflow

---

**Remember**: Follow existing patterns. Consistency > cleverness! 💻
