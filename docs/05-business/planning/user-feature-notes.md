# User Feature & Bug Notes

**Purpose**: Document your feature requests, bug reports, and observations about the CharHub platform

**How to Use**:
1. Add new entries at the TOP of each section (most recent first)
2. Use the template format provided
3. Delete entries once they've been addressed and assigned to Agent Coder
4. Agent Reviewer reads this weekly (Mondays) to prioritize work

---

## 🐛 Bug Reports

### Format
```markdown
**[Bug ID]**: Brief title
- **Date Reported**: YYYY-MM-DD
- **Severity**: Critical | High | Medium | Low
- **Environment**: Production | Development | Both
- **Description**: What's happening (be specific)
- **Steps to Reproduce**:
  1. First step
  2. Second step
  3. Third step
- **Expected Behavior**: What should happen
- **Actual Behavior**: What's happening instead
- **Screenshots/Logs**: If applicable
- **Status**: New | Assigned to [name] | Fixed
- **Notes**: Any additional context
```

---

### Bug Reports - Production (2025-12-07)

**[BUG-003]**: User Sidebar Credit Balance Not Auto-Updating
- **Date Reported**: 2025-12-02
- **Severity**: High
- **Environment**: Production
- **Description**: Sidebar shows stale credit balance. Must refresh browser page to see updated credit amount
- **Steps to Reproduce**:
  1. User in sidebar shows current credits: "200 créditos"
  2. User claims daily reward (credits increase to 220)
  3. Sidebar still shows "200 créditos"
  4. Refresh page → shows "220 créditos"
- **Expected Behavior**: Sidebar credit counter updates automatically whenever user gains/spends credits
- **Actual Behavior**: Sidebar stays static, only updates on page refresh
- **Status**: New
- **Notes**: Affects user experience across multiple features:
  - Claiming daily rewards
  - First chat reward
  - Purchasing credits
  - Spending credits on features

  Needs real-time update mechanism (context/hook/state management)

---

### Recently Resolved (2025-12-07)

**[BUG-001]**: ~~Profile Plans Tab Crashes~~ ✅ **RESOLVED**
- **Resolution**: Fixed by correcting database seed loading
- **Status**: Fixed in production

**[BUG-002]**: ~~New User Missing 200 Initial Credits~~ ✅ **RESOLVED**
- **Resolution**: Fixed by correcting database seed loading
- **Status**: Fixed in production

**[BUG-004]**: ~~Tags Not Available~~ ✅ **RESOLVED**
- **Resolution**: Fixed by correcting database seed loading (npm run db:seed:tags)
- **Status**: Fixed in production

---

## ✨ Feature Requests

### Format
```markdown
**[Feature ID]**: Feature name
- **Date Requested**: YYYY-MM-DD
- **Priority**: Critical | High | Medium | Low
- **Category**: Chat | Characters | Auth | Notifications | Other
- **Description**: What feature do you want?
- **Why Important**: How does this help users?
- **Use Case**: Specific scenario where this helps
- **Acceptance Criteria**:
  - [ ] What needs to be true for this to be "done"
  - [ ] What needs to be true for this to be "done"
- **Dependencies**: Does this depend on other features?
- **Status**: New | Under Review | Assigned | In Progress | Done
- **Notes**: Additional thoughts
```

---

## 📝 Examples (Delete after understanding format)

### Bug Report Example

**[BUG-001]**: Chat message not saving to database
- **Date Reported**: 2025-12-02
- **Severity**: High
- **Environment**: Production
- **Description**: Sometimes when I send a message in a group chat, it appears on my screen but doesn't show up for other users
- **Steps to Reproduce**:
  1. Create a group chat with 2+ users
  2. User A sends a message
  3. Wait 5 seconds
  4. User B refreshes page
  5. User A's message is not visible to User B
- **Expected Behavior**: Message appears for all users immediately
- **Actual Behavior**: Message appears locally but doesn't sync to database
- **Screenshots/Logs**:
  ```
  Error in backend logs: "Transaction timeout on insert"
  ```
- **Status**: Assigned to Agent Coder
- **Notes**: Happens most often with images in messages; might be related to file upload processing

---

### Feature Request Example

**[FEAT-001]**: Dark Mode Toggle in Settings
- **Date Requested**: 2025-12-01
- **Priority**: Low
- **Category**: UX
- **Description**: Add a toggle in user settings to switch between light and dark mode
- **Why Important**: Many users prefer dark mode for evening use
- **Use Case**: User opens app at night, theme is too bright, wants dark mode
- **Acceptance Criteria**:
  - [ ] Toggle button in settings page
  - [ ] Preference persists across sessions
  - [ ] All pages respect dark mode setting
  - [ ] Keyboard accessible (accessibility)
- **Dependencies**: Requires Tailwind dark mode setup (should already exist)
- **Status**: Assigned to Agent Coder
- **Notes**: Frontend may already have dark mode infrastructure; check `frontend/src/` for existing Tailwind dark: classes

---

## 🆕 Your Entries Start Here

---

## 📊 Status Reference

| Status | Meaning | What Happens Next |
|--------|---------|-------------------|
| **New** | Just reported | Agent Reviewer analyzes and prioritizes |
| **Under Review** | Reviewer is investigating | Wait for assignment |
| **Assigned to [Name]** | Assigned to an agent | Agent starts work on this |
| **In Progress** | Active work happening | Agent provides updates |
| **Done** | Complete and deployed | Feature is in production |
| **Wontfix** | Not planned | Entry can be archived |

---

## 📋 Severity Levels

| Severity | Criteria | Response Time |
|----------|----------|----------------|
| **Critical** | System down, data loss, security breach | Immediate (same day) |
| **High** | Core feature broken, poor UX, payment issues | 24-48 hours |
| **Medium** | Minor feature issue, cosmetic problems | 1 week |
| **Low** | Enhancement request, nice-to-have | 2-4 weeks |

---

## 🎯 Priority Levels

| Priority | Criteria | When to Do |
|----------|----------|-----------|
| **Critical** | Breaks core functionality, prevents use | Now |
| **High** | Significant impact on user experience | This week |
| **Medium** | Nice improvement, but not urgent | This month |
| **Low** | Polish feature, long-term goal | Backlog |

---

## 💡 Tips for Good Bug Reports

✅ **DO**:
- Be specific: "I can't log in" → "Login page shows 'Invalid credentials' error when I use Gmail OAuth"
- Include exact steps to reproduce
- Mention environment and when it happens
- Include error messages or logs
- Be factual and neutral

❌ **DON'T**:
- Vague reports: "Something is broken"
- Blame the developer
- Report features that work as designed
- Assume cause (describe what you observe, not why)

---

## 💡 Tips for Good Feature Requests

✅ **DO**:
- Describe the user problem, not the solution
- Explain why this matters
- Provide acceptance criteria (how to know it's done)
- Think about edge cases
- Consider impact on other features

❌ **DON'T**:
- Request very complex features without breaking into steps
- Assume technical implementation details
- Request features already in the product
- Demand features without context

---

## 🔄 Weekly Review Process

**Every Monday, Agent Reviewer will**:
1. Read all "New" entries in this file
2. Categorize by priority and impact
3. Move entries to "Under Review"
4. Discuss with Agent Coder
5. Update entries with assignment status

**Expected Timeline**:
- Reported → Reviewed: 2-3 days
- Assigned → In Progress: 3-5 days
- In Progress → Done: Varies by complexity

---

## 📞 Questions?

If you're unsure about format or severity:
1. Check the examples at the top of this file
2. Ask Agent Reviewer to clarify
3. It's better to report with incomplete info than not report at all

---

## 🏷️ Tag Reference (Optional)

Use these tags to categorize:
- `#chat` - Chat system and messaging
- `#characters` - Character profiles and management
- `#auth` - Login, OAuth, authentication
- `#notifications` - In-app, email, push notifications
- `#payments` - Credits, billing, purchases
- `#performance` - Speed, optimization, load times
- `#security` - Data protection, access control
- `#ui` - User interface and layout
- `#mobile` - Mobile app or responsive design
- `#api` - Backend API issues
- `#database` - Data storage and queries

---

**Last reviewed**: [Date Agent Reviewer last checked this file]
**Next review**: [Expected date of next review]
