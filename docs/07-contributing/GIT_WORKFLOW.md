# Git Workflow Guide

**Last Updated**: 2025-12-08
**For**: Contributors and developers

---

## 📋 Overview

CharHub follows a **feature branch workflow** with strict conventions for branches, commits, and pull requests.

---

## 🌿 Branch Strategy

### Main Branches

```
main       → Production-ready code (protected)
```

**Rules**:
- ✅ `main` is **always deployable**
- ✅ All changes come via Pull Requests
- ❌ **NEVER** push directly to `main`
- ❌ **NEVER** force-push to `main`

### Feature Branches

All work happens in feature branches:

```
feature/feature-name     # New features
fix/bug-name            # Bug fixes
docs/area-name          # Documentation
refactor/component      # Code refactoring
test/area-name          # Test additions
```

---

## 🔄 Workflow Steps

### 1. Create Branch

```bash
# Always start from latest main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/rate-limiting

# Naming conventions:
# - Use lowercase
# - Use hyphens, not underscores
# - Be descriptive but concise
# - Use kebab-case
```

**Examples:**
- ✅ `feature/chat-reactions`
- ✅ `fix/auth-token-expiry`
- ✅ `docs/api-reference`
- ❌ `my_feature`
- ❌ `fix-bug`
- ❌ `feature/add_new_feature_for_users`

---

### 2. Make Changes

```bash
# Make your changes
vim backend/src/services/rateLimit.ts

# Stage changes
git add backend/src/services/rateLimit.ts

# Commit with conventional format
git commit -m "feat(backend): add rate limiting service

Implements rate limiting using Redis to prevent spam:
- Rate limit: 10 requests per minute per user
- Sliding window counter algorithm
- Configurable limits per endpoint

Related: #123"
```

---

### 3. Commit Message Format

Use **Conventional Commits** format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Types

| Type | When to Use | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(chat): add message reactions` |
| `fix` | Bug fix | `fix(auth): resolve token refresh bug` |
| `docs` | Documentation only | `docs(api): update LLM provider docs` |
| `refactor` | Code refactoring | `refactor(chat): simplify message handler` |
| `test` | Adding tests | `test(auth): add OAuth flow tests` |
| `chore` | Maintenance | `chore(deps): update dependencies` |
| `perf` | Performance improvement | `perf(chat): optimize message loading` |

#### Scope

Common scopes:
- `backend` - Backend changes
- `frontend` - Frontend changes
- `chat` - Chat feature
- `auth` - Authentication
- `api` - API changes
- `db` - Database changes

#### Subject

- Use imperative mood ("add" not "added")
- Lowercase
- No period at end
- Max 72 characters

#### Body (Optional)

- Explain WHAT and WHY, not HOW
- Wrap at 72 characters
- Separate from subject with blank line

#### Footer (Optional)

- Reference issues: `Related: #123`
- Breaking changes: `BREAKING CHANGE: ...`
- Claude Code signature (auto-added):
  ```
  🤖 Generated with [Claude Code](https://claude.com/claude-code)

  Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
  ```

#### Examples

**Simple commit:**
```bash
git commit -m "fix(auth): handle expired tokens gracefully"
```

**Detailed commit:**
```bash
git commit -m "feat(chat): add message reactions

Implements emoji reactions for chat messages:
- Users can add/remove reactions to any message
- Reaction counts displayed below messages
- Database schema updated with Reaction table
- API endpoints for add/remove reactions

Related: #456"
```

**Breaking change:**
```bash
git commit -m "feat(api): change authentication endpoint

BREAKING CHANGE: `/api/auth/login` moved to `/api/v1/auth/login`

All API endpoints now use `/api/v1/` prefix for versioning.
Clients must update endpoint URLs.

Related: #789"
```

---

### 4. Push Changes

```bash
# Push feature branch to remote
git push origin feature/rate-limiting

# If branch doesn't exist remotely, use -u flag
git push -u origin feature/rate-limiting
```

---

### 5. Create Pull Request

**Via GitHub UI:**
1. Go to GitHub repository
2. Click "Compare & pull request"
3. Fill PR template (see below)
4. Assign to Agent Reviewer
5. Add labels if applicable

**Via GitHub CLI:**
```bash
gh pr create --title "feat(backend): add rate limiting" \
             --body "$(cat <<'EOF'
## Summary
Implements rate limiting to prevent spam and abuse.

## Changes Made
- Backend: Rate limiting service using Redis
- Backend: Middleware for applying rate limits
- API: Rate limit headers in responses

## Testing Done
- [x] Unit tests for rate limit service
- [x] Integration tests for API endpoints
- [x] Load testing with 100+ req/s
- [x] TypeScript compilation successful

## How to Test
1. Check out branch: `git checkout feature/rate-limiting`
2. Start services: `docker compose up -d`
3. Send 10+ requests rapidly to `/api/v1/chat/send`
4. Verify HTTP 429 response after limit exceeded

## Migration Required
- [ ] Yes
- [x] No
EOF
)"
```

---

### 6. PR Review Process

**After creating PR:**

1. **Wait for Agent Reviewer** to review
2. **CI/CD runs** automatically (if configured)
3. **Address feedback**:
   ```bash
   # Make requested changes
   vim backend/src/services/rateLimit.ts

   # Commit changes
   git add .
   git commit -m "fix: address review feedback

   - Increased rate limit to 20 req/min
   - Added configurable limits per endpoint
   - Improved error messages"

   # Push updates
   git push origin feature/rate-limiting
   ```
4. **Re-request review** after addressing feedback
5. **PR will be merged** by Agent Reviewer

---

## 🚫 What NOT to Do

### ❌ Common Mistakes

**1. Pushing directly to main:**
```bash
git checkout main
git commit -m "quick fix"
git push origin main    # ❌ WRONG!
```

**2. Force pushing to main:**
```bash
git push --force origin main    # ❌ NEVER DO THIS!
```

**3. Poor commit messages:**
```bash
git commit -m "fix"                      # ❌ Too vague
git commit -m "fixed the bug"            # ❌ Not descriptive
git commit -m "WIP"                      # ❌ Work in progress (use stash instead)
git commit -m "asdfasdf"                 # ❌ Meaningless
```

**4. Mixing unrelated changes:**
```bash
# ❌ One commit with both feature AND unrelated fix
git add backend/newFeature.ts backend/unrelatedBugFix.ts
git commit -m "feat: add new feature and fix bug"

# ✅ Separate commits for separate concerns
git add backend/newFeature.ts
git commit -m "feat: add new feature"

git add backend/unrelatedBugFix.ts
git commit -m "fix: resolve unrelated bug"
```

**5. Committing sensitive data:**
```bash
# ❌ NEVER commit these files
.env
.env.production
credentials.json
*.pem
*.key

# ✅ These should be in .gitignore
```

---

## 🔧 Advanced Workflows

### Updating Branch with Latest Main

```bash
# Fetch latest changes
git fetch origin

# Option 1: Rebase (preferred - cleaner history)
git rebase origin/main

# Option 2: Merge (if rebase has conflicts)
git merge origin/main
```

### Squashing Commits (Before PR)

```bash
# Squash last 3 commits
git rebase -i HEAD~3

# In editor, change 'pick' to 'squash' for commits to combine
# Save and edit commit message

# Force push (only on feature branches!)
git push --force origin feature/your-branch
```

### Fixing Last Commit

```bash
# Forgot to add file
git add forgotten-file.ts
git commit --amend --no-edit

# Fix commit message
git commit --amend -m "corrected message"

# Push (force required after amend)
git push --force origin feature/your-branch
```

### Stashing Work in Progress

```bash
# Save work temporarily
git stash save "work in progress on rate limiting"

# Switch to another branch
git checkout main

# Come back and restore
git checkout feature/rate-limiting
git stash pop
```

---

## 🎯 PR Template

**Title:**
```
feat(module): brief description
```

**Description:**
```markdown
## Summary
Brief description of what this PR does.

## Changes Made
- Backend: [list backend changes]
- Frontend: [list frontend changes]
- Database: [schema changes if any]

## Testing Done
- [x] Local testing complete
- [x] TypeScript compilation successful
- [x] Translations built and tested
- [x] No console errors
- [x] Database migrations tested

## How to Test
1. Check out this branch
2. Run `docker compose up -d --build`
3. Navigate to [URL]
4. Test [specific scenarios]

## Documentation Updated
- [ ] API docs (if applicable)
- [ ] Architecture docs (if applicable)
- [ ] Feature list updated

## Migration Required
- [ ] Yes - Run: `npm run prisma:migrate:deploy`
- [x] No

## Screenshots
[If UI changes, add screenshots]

## Notes for Reviewer
[Any special considerations, known limitations, etc.]
```

---

## 📊 Multi-Agent Workflow

CharHub uses specialized agents:

### Agent Coder (Development)

**Workflow:**
1. Works in `feature/*` branches
2. Reads specs from `docs/05-business/planning/features/active/`
3. Implements feature
4. Updates TODO in feature spec file
5. Creates PR to `main`

**Branch naming:**
```bash
git checkout -b feature/chat-reactions
```

### Agent Reviewer (QA & Deployment)

**Workflow:**
1. Works in `main` branch
2. Reviews PRs from Agent Coder
3. Tests locally
4. Merges to `main`
5. Monitors production deployment

**Branch usage:**
```bash
# Always on main
git checkout main

# Reviews feature branches locally
git checkout -b feature/chat-reactions origin/feature/chat-reactions
```

---

## 🔗 Related Documents

- [Contributing Guide](./README.md) - Main contribution guide
- [Code Style](./CODE_STYLE.md) - Code style standards
- [Testing Guidelines](./README.md#testing-guidelines) - How to write tests
- [Agent Coder Guide](../agents/coder/CLAUDE.md) - Agent Coder workflow
- [Agent Reviewer Guide](../agents/reviewer/CLAUDE.md) - Agent Reviewer workflow

---

## 📞 Questions?

- Check [FAQ](../02-guides/development/) for common questions
- Open GitHub Discussion for help
- Review closed PRs for examples

---

[← Back to Contributing Guide](./README.md) | [← Back to Documentation Home](../README.md)
