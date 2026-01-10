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

- [ ] **Push initial branch to GitHub**
  ```bash
  git push -u origin feature/descriptive-name
  ```
  - Creates remote backup immediately
  - Allows other agents to see your work

---

## 🔄 MANDATORY: Incremental Commits (Save Your Work!)

**⚠️ CRITICAL NEW RULE: Commit every 30-60 minutes during implementation**

**Why this is mandatory:**
- **Prevents total loss**: If something goes wrong, you lose max 1 hour (not days)
- **GitHub backup**: Every push = automatic remote backup
- **Recoverable**: Code in git history can be recovered via `git reflog`
- **Visible progress**: Team can see what you're working on

**How to implement:**

```bash
# EVERY TIME you complete a unit of work, commit and push:

# Example 1: Just finished database schema changes
git add .
git commit -m "wip: add user_settings table to schema"
git push origin HEAD  # ← CRITICAL: Backup to GitHub!

# Example 2: Implemented API endpoint
git add .
git commit -m "wip: implement GET /api/v1/settings endpoint"
git push origin HEAD

# Example 3: Added validation
git add .
git commit -m "wip: add Zod validation for settings"
git push origin HEAD

# Example 4: Implemented UI component
git add .
git commit -m "wip: create SettingsPanel component"
git push origin HEAD
```

**Commit timeline example:**
```
09:00 - Create branch, push
09:30 - First commit: "wip: database schema" + push
10:15 - Second commit: "wip: API endpoint" + push
11:00 - Third commit: "wip: validation logic" + push
11:45 - Fourth commit: "wip: UI component" + push
12:30 - Fifth commit: "wip: i18n translations" + push
13:00 - Final commit: "feat(settings): implement user settings feature" + push

If anything goes wrong at 12:45, you've lost max 15 minutes of work!
```

**Commit message format for WIP commits:**
```bash
git commit -m "wip: [what you just did]"

# Good WIP commit messages:
# wip: implement credit calculation logic
# wip: add UserSettings component with form
# wip: add validation for email field
# wip: add translations for settings page
# wip: implement API endpoint for saving settings

# Bad WIP commit messages (too vague):
# wip: changes
# wip: update
# wip: fix
```

**WIP commits are ENCOURAGED:**
- ✅ "wip: ..." commits are perfectly fine during development
- ✅ Better to have 10 WIP commits than lose 4 hours of work
- ✅ Can be squashed later if desired (but NOT required!)
- ✅ Shows your progress to reviewers

**Push after EVERY commit:**
```bash
# ALWAYS push after committing
git push origin HEAD

# Why push every time:
# 1. GitHub = your backup server
# 2. If machine crashes, code is safe
# 3. If branch deleted locally, it's on remote
# 4. Other agents can see your progress
```

**Checklist for incremental commits:**
- [ ] Committing every 30-60 minutes during active development
- [ ] Pushing after every commit (`git push origin HEAD`)
- [ ] Using "wip: ..." prefix for work-in-progress commits
- [ ] Final commit uses proper format: `feat(scope): description`

**⚠️ If you work for 2+ hours without committing:**
- ❌ You're violating the safety protocol
- ⚠️ You risk losing hours of work
- ⚠️ Stop and commit NOW before continuing

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
