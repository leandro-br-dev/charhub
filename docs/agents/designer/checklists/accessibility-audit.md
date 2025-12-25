# Accessibility Audit Checklist

**When to use**: Monthly accessibility review or before major releases

**Duration**: 1-2 hours

**Output**: Accessibility improvement list

---

## 📋 Preparation

- [ ] **Start environment**
  ```bash
  docker compose up -d --build
  open http://localhost:8083
  ```

- [ ] **Prepare tools**
  - Browser DevTools
  - Screen reader (VoiceOver on Mac, NVDA on Windows)
  - Keyboard only (unplug mouse or don't use it)

---

## ⌨️ Keyboard Navigation

### Test Keyboard-Only Navigation

- [ ] **Tab through entire page**
  - Can reach all interactive elements
  - Focus indicator visible at all times
  - Tab order logical (top-to-bottom, left-to-right)

- [ ] **Test interactive elements**
  - Buttons activate with Enter/Space
  - Links activate with Enter
  - Forms submittable with Enter
  - Dropdowns/selects work with arrow keys
  - Modals/dialogs trap focus correctly

- [ ] **Test shortcuts**
  - Skip to content link (if exists)
  - ESC closes modals/dropdowns
  - Common shortcuts work (Cmd+K for search, etc.)

- [ ] **Check focus management**
  - Focus visible on all interactive elements
  - Focus not trapped unintentionally
  - Focus returns appropriately (e.g., after closing modal)

---

## 📢 Screen Reader Testing

### Test with Screen Reader

- [ ] **Enable screen reader**
  - Mac: Cmd+F5 (VoiceOver)
  - Windows: Download NVDA (free)

- [ ] **Navigate with screen reader**
  - Page title announced
  - Headings structure makes sense (h1, h2, h3...)
  - Landmarks identified (header, nav, main, footer)
  - Links have descriptive text (not "click here")

- [ ] **Test interactive elements**
  - Buttons labeled clearly
  - Form inputs have associated labels
  - Error messages announced
  - Loading states announced
  - Dynamic content changes announced

- [ ] **Test images**
  - Images have alt text
  - Decorative images use alt=""
  - Alt text descriptive and concise

---

## 🎨 Visual Accessibility

### Color Contrast

- [ ] **Check text contrast**
  - Normal text: 4.5:1 minimum (WCAG AA)
  - Large text (18pt+): 3:1 minimum
  - Use browser DevTools or online tool

- [ ] **Check UI element contrast**
  - Buttons/interactive elements: 3:1 minimum
  - Form inputs: borders visible
  - Icons: sufficient contrast

- [ ] **Color not sole indicator**
  - Error states use icon + color
  - Success states use icon + color
  - Links distinguishable (underline or other)

### Text Readability

- [ ] **Font sizes adequate**
  - Body text: minimum 14-16px
  - Small text: minimum 12px (avoid if possible)
  - Line height: 1.5x for body text

- [ ] **Text resizable**
  - Zoom to 200% without breaking layout
  - No horizontal scrolling when zoomed

---

## 📱 Responsive Accessibility

### Mobile Accessibility

- [ ] **Touch targets large enough**
  - Minimum 44x44px for tap targets
  - Adequate spacing between targets
  - Easy to tap without mis-taps

- [ ] **Mobile gestures**
  - Swipe actions have alternatives
  - Pinch-to-zoom works (if appropriate)

---

## 🏷️ Semantic HTML & ARIA

### HTML Structure

- [ ] **Proper HTML elements**
  - `<button>` for buttons (not `<div>`)
  - `<a>` for links (not `<button>`)
  - `<nav>` for navigation
  - `<main>` for main content
  - `<header>`, `<footer>` used appropriately

- [ ] **Heading hierarchy**
  - Single `<h1>` per page
  - No skipped heading levels (h1 → h3)
  - Headings describe content accurately

### ARIA Attributes

- [ ] **ARIA used appropriately**
  - `aria-label` for icon-only buttons
  - `aria-describedby` for additional context
  - `aria-live` for dynamic content
  - `role` attributes when semantic HTML insufficient

- [ ] **Form accessibility**
  - Labels associated with inputs (`<label for="id">`)
  - Required fields marked (`aria-required` or `required`)
  - Error messages associated (`aria-describedby`)
  - Field instructions clear

---

## 📝 Document Findings

- [ ] **Create accessibility report**
  ```markdown
  ## Accessibility Audit - [Date]

  ### Critical Issues (WCAG AA Failures)
  1. [Issue] - [Location] - [How to fix]

  ### Important Improvements
  1. [Issue] - [Location] - [How to fix]

  ### Minor Issues
  1. [Issue] - [Location] - [How to fix]

  ### Passed
  - ✅ [What's working well]
  ```

- [ ] **Prioritize fixes**
  - Critical: WCAG failures, keyboard traps, missing labels
  - Important: Poor contrast, missing alt text
  - Minor: Optimization, better patterns

---

## ✅ WCAG 2.1 AA Quick Checklist

**Perceivable**:
- [ ] Text alternatives for images
- [ ] Captions for videos (if applicable)
- [ ] Color not sole indicator
- [ ] Text contrast 4.5:1

**Operable**:
- [ ] Keyboard accessible
- [ ] No keyboard traps
- [ ] Enough time to read/interact
- [ ] No seizure-inducing flashes

**Understandable**:
- [ ] Language declared (`<html lang="en">`)
- [ ] Consistent navigation
- [ ] Error messages clear
- [ ] Labels and instructions

**Robust**:
- [ ] Valid HTML
- [ ] ARIA used correctly
- [ ] Name, role, value for all components

---

## 🚨 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Low contrast text | Darken text or lighten background |
| Missing alt text | Add descriptive alt attribute |
| Icon-only button | Add `aria-label="Description"` |
| No focus indicator | Add `:focus` styles with outline |
| Form input no label | Add `<label>` element |
| Skip heading level | Adjust heading hierarchy |
| Keyboard trap | Fix tab order or add ESC handler |

---

## 📚 See Also

- **[ui-review.md](ui-review.md)** - Overall UI quality
- **[design-implementation.md](design-implementation.md)** - Fix small issues
- **[design-proposal.md](design-proposal.md)** - Propose larger fixes

---

## 📖 Resources

- **WCAG 2.1 Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **WAVE Tool**: https://wave.webaim.org/

---

**Remember**: Accessible design is inclusive design! ♿
