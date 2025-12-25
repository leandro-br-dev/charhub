# Visual Testing Checklist

**When to use**: After deployments or when testing specific features visually

**Duration**: 30-60 minutes

**Output**: Bug reports and visual quality issues

---

## 📋 Setup

- [ ] **Start environment**
  ```bash
  # For local testing
  docker compose up -d --build
  open http://localhost:8083

  # For production testing
  open https://charhub.app
  ```

- [ ] **Prepare testing tools**
  - Browser DevTools open (F12)
  - Responsive design mode (Cmd+Opt+M / Ctrl+Shift+M)
  - Note-taking tool ready

---

## 🖥️ Desktop Testing

### Test Main User Flows

- [ ] **Homepage**
  - Loads correctly
  - All elements visible
  - No console errors
  - Images load
  - Links work

- [ ] **Sign Up / Login Flow**
  - Forms render correctly
  - Validation works
  - Success/error messages display
  - Redirects work

- [ ] **Main Features** (test each)
  - Navigate to feature
  - Execute main actions
  - Verify functionality works
  - Check for visual issues

### Visual Quality Checks

- [ ] **Layout integrity**
  - No overlapping elements
  - Proper alignment
  - Consistent spacing
  - No broken layouts

- [ ] **Interactive elements**
  - Buttons work and show hover states
  - Links are clickable
  - Forms submit correctly
  - Dropdowns/modals function

- [ ] **Console errors**
  - No JavaScript errors
  - No failed network requests
  - No missing resources (404s)

---

## 📱 Mobile Testing

### Test on Mobile Viewport

- [ ] **Switch to mobile view** (375px width)

- [ ] **Test navigation**
  - Mobile menu opens/closes
  - Navigation accessible
  - All links work

- [ ] **Test layouts**
  - Content stacks vertically
  - Text readable without zoom
  - Images scale correctly
  - No horizontal scroll

- [ ] **Test interactions**
  - Buttons tap-able (44px minimum)
  - Forms usable on touch
  - Scrolling smooth
  - Modals/dialogs work

### Test Main Flows on Mobile

- [ ] **Critical user flows work**
  - Login works
  - Main features functional
  - Forms submittable
  - Navigation usable

---

## 🐛 Bug Documentation

### When You Find Issues

**Small visual bugs** (you can fix):
- [ ] Note the issue
- [ ] Fix immediately (see [design-implementation.md](design-implementation.md))

**Functional bugs** (Agent Coder fixes):
- [ ] Document bug clearly
  ```markdown
  ## Bug: [Short Description]

  **Location**: [URL/Page/Component]
  **Severity**: Critical / High / Medium / Low
  **Device**: Desktop / Mobile / Both

  **Steps to Reproduce**:
  1. Go to [URL]
  2. Click [element]
  3. Observe [issue]

  **Expected**: [What should happen]
  **Actual**: [What actually happens]

  **Screenshots**: [If applicable]

  **Console Errors**: [If any]
  ```
- [ ] Create GitHub Issue for Agent Coder

**Missing features** (Agent Coder implements):
- [ ] Document missing functionality
- [ ] Create GitHub Issue for Agent Coder

---

## ✅ Testing Checklist Summary

Quick reference for visual testing:

**Desktop (1280px+)**:
- [ ] All pages load correctly
- [ ] No console errors
- [ ] Main user flows work
- [ ] Visual design intact

**Mobile (375px)**:
- [ ] Mobile menu works
- [ ] Layouts responsive
- [ ] Touch interactions work
- [ ] No horizontal scroll

**Both**:
- [ ] Forms function correctly
- [ ] Buttons/links work
- [ ] Images load
- [ ] No visual glitches

---

## 📚 See Also

- **[ui-review.md](ui-review.md)** - For comprehensive UI review
- **[design-implementation.md](design-implementation.md)** - For fixing small issues
- **[accessibility-audit.md](accessibility-audit.md)** - For accessibility testing

---

**Remember**: Test like a user, think like a designer! 🎯
