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

### Bug Reports - Production (2025-12-02)

**[BUG-001]**: Profile Plans Tab Crashes with Null Reference Error
- **Date Reported**: 2025-12-02
- **Severity**: Critical
- **Environment**: Production
- **Description**: Clicking "Planos" (Plans) tab in user profile page causes JavaScript error and blank page
- **Steps to Reproduce**:
  1. Log in to https://charhub.app
  2. Click on user profile menu (top right)
  3. Select "Perfil" (Profile)
  4. Click on "Planos" tab
  5. Page crashes
- **Expected Behavior**: Plans tab displays available subscription plans
- **Actual Behavior**:
  ```
  TypeError: Cannot read properties of null (reading 'name')
      at uI (index-DrVw2j_Q.js:106:121679)
  ```
  The component tries to access `.name` property on a null subscription object.
- **Screenshots/Logs**: Error trace in browser console (minified React app)
- **Status**: New
- **Notes**: Likely cause is missing/null subscription data when user loads. May be related to new user account not having initial subscription assigned.

**[BUG-002]**: New User Missing 200 Initial Credits Bonus
- **Date Reported**: 2025-12-02
- **Severity**: High
- **Environment**: Production
- **Description**: New user account created but did not receive 200 initial signup bonus credits
- **Steps to Reproduce**:
  1. Create new account with signup form
  2. Complete OAuth/email verification
  3. Check credit balance
- **Expected Behavior**: New user should immediately receive 200 bonus credits with welcome message
- **Actual Behavior**: Credit balance shows 0, no welcome message about bonus credits
- **Status**: New
- **Notes**: Need to verify:
  - Is initial credit grant triggered in account creation flow?
  - Check if database seed includes initial credit transactions
  - Is welcome message component implemented?

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

**[BUG-004]**: Tags Not Available During User Registration
- **Date Reported**: 2025-12-02
- **Severity**: High
- **Environment**: Production
- **Description**: Tags dropdown/selection is empty or unavailable when creating new user account or character
- **Steps to Reproduce**:
  1. Create new account
  2. Try to create character or add tags
  3. Tags field shows no options
- **Expected Behavior**: Complete list of tags available from database seed
- **Actual Behavior**: Tags list is empty or fails to load
- **Status**: New
- **Notes**: Investigation needed:
  - Check if `npm run db:seed:tags` was executed on production
  - Verify tags are in database: `SELECT COUNT(*) FROM tags;`
  - Check if tags seed is part of main `db:seed` or separate script
  - May be related to migrations mentioned in package.json

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
