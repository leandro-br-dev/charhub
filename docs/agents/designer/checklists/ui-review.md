# UI/UX Review Checklist

**When to use**: Weekly review or when evaluating overall UI quality

**Duration**: 1-2 hours

**Output**: List of design improvements (prioritized)

---

## 📋 Preparation

- [ ] **Read latest user behavior reports**
  - Location: `docs/05-business/user-behavior-reports/`
  - Identify most-used features
  - Note user pain points

- [ ] **Start local environment**
  ```bash
  docker compose up -d --build
  open http://localhost:8083
  ```

---

## 🎨 Design Consistency Review

### Colors

- [ ] **Brand colors consistent throughout**
  - Primary, secondary, accent colors match
  - No random color variations
  - Proper color hierarchy

- [ ] **Color contrast sufficient** 
  - Text readable on backgrounds (WCAG AA minimum)
  - Interactive elements clearly visible
  - Error/success states distinguishable

### Typography

- [ ] **Font families consistent**
  - Headings use same font family
  - Body text uses same font family
  - Code/monospace where appropriate

- [ ] **Font sizes logical**
  - Clear hierarchy (h1 > h2 > h3 > p)
  - Readable sizes (minimum 14px for body)
  - Consistent sizing across similar elements

- [ ] **Line height and spacing**
  - Text is comfortable to read
  - Proper paragraph spacing
  - Headings have appropriate margins

### Spacing

- [ ] **Consistent padding/margins**
  - Similar elements have similar spacing
  - Follows spacing scale (8px, 16px, 24px, 32px, etc.)
  - No random spacing values

- [ ] **Proper whitespace**
  - Elements not cramped
  - Sections clearly separated
  - Breathing room around content

---

## 🧭 Navigation & User Flow

### Main Navigation

- [ ] **Navigation clear and accessible**
  - Main menu easy to find
  - Current page indicated
  - Mobile menu functional

- [ ] **Important features prominent**
  - Key features easy to access
  - Call-to-action buttons visible
  - User understands where to go

### User Flows

- [ ] **Test common flows**
  - Sign up flow smooth
  - Login flow intuitive
  - Main feature flows logical
  - No dead ends or confusing paths

- [ ] **Feedback and confirmation**
  - Actions have clear feedback (loading, success, error)
  - Destructive actions ask for confirmation
  - User always knows what's happening

---

## 📱 Responsive Design

### Test Different Screen Sizes

- [ ] **Mobile (375px, 414px)**
  - Layout works on small screens
  - Text readable without zooming
  - Buttons/links easy to tap (44px minimum)
  - No horizontal scrolling

- [ ] **Tablet (768px, 1024px)**
  - Layout adapts appropriately
  - Uses available space well
  - Touch targets appropriate size

- [ ] **Desktop (1280px+)**
  - Layout uses space effectively
  - Not overly stretched
  - Comfortable reading width

---

## 🎯 Specific Component Review

### Buttons

- [ ] **Consistent button styles**
  - Primary, secondary, tertiary clear
  - Hover/active states work
  - Disabled states clear
  - Sizes consistent

### Forms

- [ ] **Forms user-friendly**
  - Labels clear and associated with inputs
  - Placeholders helpful but not replacing labels
  - Validation messages clear
  - Error states visually distinct
  - Required fields marked

### Loading States

- [ ] **Loading feedback present**
  - Spinners or skeleton screens
  - User knows something is happening
  - No blank screens during loading

### Error States

- [ ] **Errors handled gracefully**
  - Error messages clear and helpful
  - Error styling noticeable but not alarming
  - User knows how to fix the error

---

## 📝 Document Findings

- [ ] **Create improvement list**
  ```markdown
  ## UI/UX Review Findings - [Date]

  ### Critical Issues (Fix Immediately)
  1. [Issue description] - [Small fix / GitHub Issue needed]

  ### Important Improvements  
  1. [Issue description] - [Small fix / GitHub Issue needed]

  ### Nice to Have
  1. [Issue description] - [Small fix / GitHub Issue needed]
  ```

- [ ] **Prioritize by impact**
  - Critical: Breaks usability or accessibility
  - Important: Significant UX improvement
  - Nice to have: Polish and refinement

---

## ✅ Next Steps

- [ ] **For small fixes**: Execute [design-implementation.md](design-implementation.md)
- [ ] **For large changes**: Execute [design-proposal.md](design-proposal.md)
- [ ] **Create GitHub Issues** for complex changes

---

**Remember**: Focus on user experience first, aesthetics second! 🎨
