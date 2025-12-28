# Design Implementation Checklist

**When to use**: Implementing small UI/UX fixes yourself

**Duration**: 30 minutes - 2 hours

**Output**: PR with design improvements

---

## ⚠️ Before You Start

**Only use this for SMALL changes**:
- ✅ CSS/styling adjustments
- ✅ Component prop changes
- ✅ Simple UI tweaks
- ✅ <50 lines of code

**Create GitHub Issue instead if**:
- 🔴 Complex logic required
- 🔴 Backend changes needed
- 🔴 >50-100 lines of code
- 🔴 New components/pages

---

## 📋 Implementation Steps

### 1. Create Branch

- [ ] **Create design branch**
  ```bash
  git checkout main
  git pull origin main
  git checkout -b feature/design-[description]
  ```

### 🚨 CRITICAL: Update Branch with Main Before Creating PR

**BEFORE creating the Pull Request (step 4), you MUST update your branch with latest main:**

```bash
# 1. Update main
git checkout main
git pull origin main

# 2. Merge main into feature branch
git checkout feature/design-[description]
git merge main

# 3. Resolve conflicts if any
# 4. Re-run ALL tests after merge
cd frontend && npm run build
```

**Why this is critical:**
- Prevents accidental file deletions
- Catches integration issues early
- Ensures tests pass with latest code
- Avoids wasting Agent Reviewer's time

**When to do this:** Right before step 4 (Create PR)

### 2. Make Changes

- [ ] **Edit frontend files**
  ```bash
  cd frontend
  vim src/components/[Component].tsx
  ```

- [ ] **Follow existing patterns**
  - Use Tailwind CSS classes
  - Follow component structure
  - **Use i18n for any text** (no hardcoded strings)

### 3. Test Changes

- [ ] **Build frontend**
  ```bash
  cd frontend
  npm run build  # Check for TypeScript errors
  ```

- [ ] **Restart frontend container**
  ```bash
  docker compose restart frontend
  ```

- [ ] **Test in browser**
  ```bash
  open http://localhost:8083
  ```

- [ ] **Test on different screen sizes**
  - Mobile (375px)
  - Tablet (768px)
  - Desktop (1280px+)

- [ ] **Check console for errors**

### 4. Create PR

- [ ] **Commit changes**
  ```bash
  git add .
  git commit -m "design: [brief description]

  - [Change 1]
  - [Change 2]

  🤖 Generated with [Claude Code](https://claude.com/claude-code)

  Co-Authored-By: Claude <noreply@anthropic.com>"
  ```

- [ ] **Push to remote**
  ```bash
  git push origin feature/design-[description]
  ```

- [ ] **Create Pull Request**
  ```bash
  gh pr create --title "design: [description]" --body "
  ## Summary
  [What did you change and why?]

  ## Changes Made
  - [List specific changes]

  ## Screenshots
  **Before**: [If applicable]
  **After**: [Screenshot of improvement]

  ## Testing Done
  - [x] Tested on desktop
  - [x] Tested on mobile
  - [x] No console errors
  - [x] TypeScript compiles

  ## Reviewers
  @Agent-Reviewer
  "
  ```

---

## 🚨 Common Pitfalls

❌ **Hardcoding text** - Use i18n keys
❌ **Breaking existing functionality** - Test thoroughly
❌ **Ignoring mobile** - Always test responsive
❌ **Scope creep** - Keep changes small and focused

---

## ✅ Quick Reference

**Files you'll commonly edit**:
- `frontend/src/components/**/*.tsx` - Components
- `frontend/src/pages/**/*.tsx` - Pages
- `frontend/src/styles/**/*.css` - Global styles (rarely needed with Tailwind)

**Don't edit**:
- Backend files (create issue for Agent Coder)
- Database schemas (create issue)
- API routes (create issue)

---

**Remember**: Small, focused changes. Test on all screen sizes! 🎨
