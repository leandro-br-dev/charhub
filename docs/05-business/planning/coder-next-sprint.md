# Agent Coder - Next Sprint Tasks

**Last Updated**: 2025-12-02
**Sprint Period**: Week of 2025-12-09 to 2025-12-15
**Status**: Ready for Agent Coder assignment
**Purpose**: Prioritized list of tasks for next development sprint

---

## 📌 Overview

This document lists the **prioritized tasks** that Agent Coder should focus on in the next sprint. Tasks are:
- ✅ Concrete and actionable
- ✅ Have clear acceptance criteria
- ✅ Estimated effort and complexity
- ✅ Ordered by business value and dependencies
- ✅ Reference detailed specifications

---

## 🎯 Sprint Goals

1. **Improve Chat System** with foundational features (Rate limiting, Spam detection)
2. **Complete Critical Auth Feature** (2FA implementation)
3. **Start Notification System** completion
4. **Begin Image Generation** advanced features

**Estimated Total Sprint Effort**: 24-32 hours

---

## 🔴 HIGH PRIORITY TASKS - This Sprint

### TASK 1: Implement Chat Rate Limiting & Spam Detection

**Effort**: 4-6 hours
**Complexity**: MEDIUM
**Impact**: HIGH (improves production stability)
**Priority**: 🔴 HIGH - FIRST

#### Description
Implement rate limiting on chat API endpoints to prevent abuse and spam. This is critical for production stability with real users.

#### What Needs to Be Done

1. **Backend Rate Limiting Middleware** (2-3 hours)
   - Create middleware in `backend/src/middleware/rateLimit.ts`
   - Use `express-rate-limit` package (already installed or add if not)
   - Implement per-user rate limiting:
     - Message endpoint: 5 requests per 10 seconds per user
     - Character list endpoint: 10 requests per minute per user
     - LLM request endpoint: 1 request per 5 seconds per user (due to API costs)
   - Return 429 Too Many Requests when limit exceeded
   - Include retry-after header
   - Log rate limit violations for monitoring

2. **Spam Detection Logic** (1-2 hours)
   - Create service in `backend/src/services/spamDetection.ts`
   - Detect patterns:
     - Repeated identical messages (3+ times in 30 seconds)
     - Rapid message sequences (10+ messages in 1 minute)
     - Messages exceeding length (>5000 characters)
   - Return spam risk score (0-100)
   - Flag suspicious messages for review

3. **Database Updates** (30-60 minutes)
   - Add columns to `ChatMessage` model:
     - `flaggedAsSpam: Boolean`
     - `spamRiskScore: Int` (0-100)
     - `rateLimitViolations: Int` (counter)
   - Create migration manually (don't use `prisma migrate dev`)
   - Update Prisma schema for new fields

4. **Frontend Notifications** (1 hour)
   - Show user-friendly message when rate limited
   - "You're sending messages too quickly. Wait X seconds."
   - Disable send button when limit reached
   - Show cooldown timer

#### Reference
- Existing rate limit examples: `backend/src/routes/`
- Specification: `docs/todo/CHAT_IMPROVEMENTS.md` (lines 50-100)

#### Acceptance Criteria
- [ ] Rate limiting middleware applied to chat endpoints
- [ ] API returns 429 when limit exceeded
- [ ] Spam detection flags suspicious patterns
- [ ] Database stores spam metadata
- [ ] Frontend shows user-friendly error messages
- [ ] Unit tests for rate limiting logic
- [ ] Integration test for concurrent requests
- [ ] No performance degradation on non-limited requests

#### Testing Plan
1. Local testing:
   ```bash
   # Test rate limiting
   for i in {1..10}; do
     curl -X POST http://localhost:3001/api/v1/chat/message \
       -H "Authorization: Bearer $TOKEN" \
       -d '{"message":"test"}'
   done
   ```
2. Load testing with 50 concurrent users
3. Verify spam detection flags patterns correctly

#### Notes
- Package `express-rate-limit` should already be in dependencies
- Use Redis for distributed rate limiting if multi-server (currently single server)
- Consider whitelisting admin users from rate limits
- Log all violations to database for analytics

#### Branch Name
```
git checkout -b feature/chat-rate-limiting
```

---

### TASK 2: Implement Two-Factor Authentication (2FA)

**Effort**: 8-10 hours
**Complexity**: HIGH
**Impact**: CRITICAL (security essential for production)
**Priority**: 🔴 HIGH - SECOND

#### Description
Complete implementation of Two-Factor Authentication using TOTP (Time-based One-Time Password). Users can enable 2FA on their account for enhanced security.

#### What Needs to Be Done

1. **Backend 2FA Service** (3-4 hours)
   - Create service in `backend/src/services/twoFactorAuth.ts`
   - Use `speakeasy` or `totp-generator` package (pick one)
   - Functions needed:
     - `generateSecret()` - Generate new TOTP secret
     - `verifyToken(secret, token)` - Verify 6-digit code
     - `generateBackupCodes()` - Generate 10 recovery codes
     - `verifyBackupCode(code)` - Verify and consume backup code

2. **Database Updates** (1 hour)
   - Add to `User` model:
     ```prisma
     totpSecret: String? // Encrypted TOTP secret
     totpEnabled: Boolean @default(false)
     backupCodes: String[] // JSON array of hashed codes
     twoFactorEnabledAt: DateTime?
     ```
   - Create manual migration
   - Encrypt TOTP secret (use `crypto` module)

3. **API Endpoints** (2-3 hours)
   - POST `/api/v1/auth/2fa/setup` - Start 2FA setup
     - Return QR code URL and secret
     - Create temporary pending 2FA state
   - POST `/api/v1/auth/2fa/verify` - Confirm 2FA setup
     - Input: 6-digit code
     - Validate code, save to database
     - Return backup codes
   - GET `/api/v1/auth/2fa/status` - Check if 2FA enabled
   - POST `/api/v1/auth/2fa/disable` - Disable 2FA
     - Require current password confirmation
   - POST `/api/v1/auth/2fa/regenerate-backup-codes` - Generate new backup codes

4. **Login Flow Update** (1-2 hours)
   - Modify login endpoint:
     - After email/password verification, check if 2FA enabled
     - If enabled, return token with limited scope (2FA pending)
     - Frontend requests 2FA code
     - Verify code on backend
     - Return full authentication token
   - Create endpoint: POST `/api/v1/auth/2fa/verify-login`
     - Input: temporary token, 6-digit code or backup code
     - Output: full authentication token

5. **Frontend 2FA UI** (2-3 hours)
   - Create component: `frontend/src/pages/(auth)/2fa/`
     - Setup page: Show QR code, secret, option to copy
     - Enable page: Input 6-digit code
     - Backup codes display: Show codes with copy/save options
   - Settings page: Add 2FA management
     - Show status (enabled/disabled)
     - Button to disable 2FA
     - Button to regenerate backup codes
   - Login flow: If 2FA enabled, show verification screen
     - Option to enter 6-digit code or backup code
     - Countdown timer

#### Reference
- TOTP standard: https://tools.ietf.org/html/rfc6238
- Similar implementations: Most apps use Google Authenticator
- Specification: `docs/todo/` (Auth enhancements section)

#### Acceptance Criteria
- [ ] User can enable 2FA from settings
- [ ] QR code generated and scannable by Authenticator apps
- [ ] Login requires 2FA code when enabled
- [ ] Backup codes work for recovery
- [ ] Backup codes are single-use only
- [ ] User can disable 2FA with password confirmation
- [ ] Database stores encrypted TOTP secret
- [ ] API rate-limited to prevent brute force (max 5 attempts per minute)
- [ ] Backup codes shown only once at setup (with save option)
- [ ] Comprehensive unit tests
- [ ] Integration test for full login flow with 2FA

#### Testing Plan
1. Local testing:
   ```bash
   # Download Authenticator app or use online tester
   # Scan generated QR code
   # Enter codes from app
   ```
2. Test backup code flow
3. Test disabling 2FA
4. Load test: Verify system under load with 2FA

#### Notes
- Use `speakeasy` npm package (industry standard)
- Encrypt secret before storing: use Node's `crypto` module with key from environment
- Backup codes should be 8-10 alphanumeric characters, single-use
- Consider 30-second window for time drift in TOTP validation
- Log 2FA events for security audit trail

#### Branch Name
```
git checkout -b feature/two-factor-auth
```

---

### TASK 3: Chat Typing Indicators

**Effort**: 3-4 hours
**Complexity**: MEDIUM
**Impact**: MEDIUM (UX improvement)
**Priority**: 🟠 MEDIUM - THIRD

#### Description
Show real-time typing indicators in chat. When a user is typing, other users in the same chat see "User is typing..." indicator.

#### What Needs to Be Done

1. **Backend WebSocket Setup** (if not exists) or REST endpoint (1-2 hours)
   - Option A: WebSocket (if already implemented)
     - Listen for `typing_start` and `typing_end` events
     - Broadcast to other users in same chat room
   - Option B: REST endpoint (simpler)
     - POST `/api/v1/chat/:chatId/typing` - Send typing indicator
     - GET `/api/v1/chat/:chatId/typing-status` - Poll for who's typing
     - Auto-clear after 3 seconds of no updates

2. **Frontend Implementation** (1-2 hours)
   - Detect when user starts typing in message input
   - Send `typing_start` event to server
   - Clear after 3 seconds of inactivity
   - Display list of users currently typing above message input
   - "User1 is typing..." or "User1 and User2 are typing..."

3. **Database** (Optional)
   - No database changes needed (ephemeral data)
   - Or store for analytics: `ChatTypingEvent` model if desired

#### Acceptance Criteria
- [ ] Typing indicator appears immediately when user types
- [ ] Clears after 3 seconds of no typing
- [ ] Supports multiple users typing simultaneously
- [ ] Works across browser tabs/windows (same user)
- [ ] Performance: doesn't spam server requests
- [ ] Works on mobile devices

#### Notes
- This is relatively simple if WebSocket infrastructure exists
- Could use debounced polling if WebSocket not available
- Consider accessibility: ensure screen readers announce typing status

---

## 🟠 MEDIUM PRIORITY TASKS - This Sprint (If Time Allows)

### TASK 4: Message Search Functionality

**Effort**: 6-8 hours
**Complexity**: MEDIUM-HIGH
**Impact**: MEDIUM (UX improvement)
**Priority**: 🟠 MEDIUM - Start if TASK 1, 2, 3 complete

#### Description
Implement full-text search across chat message history. Users can search their chats by keyword, date range, and message author.

#### What Needs to Be Done

1. **Database Indexing** (1 hour)
   - Add full-text index on `ChatMessage.content`
   - PostgreSQL full-text search setup
   - Create migration for indexing

2. **Search Service** (2-3 hours)
   - Create `backend/src/services/chatSearch.ts`
   - Implement search with filters:
     - Keyword (full-text)
     - Date range (from/to)
     - Author (user who sent message)
     - Chat room filter
   - Pagination support

3. **API Endpoint** (1 hour)
   - GET `/api/v1/chat/:chatId/search?q=keyword&from=date&to=date&author=userId`
   - Return paginated results with context (message + surrounding messages)

4. **Frontend Search UI** (2 hours)
   - Add search box in chat interface
   - Show search filters (date range, author)
   - Display results with highlight of matching text
   - Click to jump to message in conversation

#### Reference
- Specification: `docs/todo/CHAT_IMPROVEMENTS.md` (message search section)

#### Testing
- Test with 1000+ messages
- Verify performance and response times
- Test with special characters and Unicode

---

### TASK 5: Image Upload with Validation

**Effort**: 4-5 hours
**Complexity**: MEDIUM
**Impact**: MEDIUM (required for image features)
**Priority**: 🟠 MEDIUM - Start if time allows

#### Description
Improve image upload with validation, compression, and error handling.

#### What Needs to Be Done

1. **Backend Image Processing** (2-3 hours)
   - Validate image format (JPEG, PNG, WebP only)
   - Check file size (max 10MB)
   - Check dimensions (min 256x256, max 4096x4096)
   - Compress/optimize image
   - Generate thumbnail
   - Upload to Cloudflare R2

2. **Error Handling** (1 hour)
   - Return detailed error messages for validation failures
   - Log upload errors

3. **Frontend Upload UI** (1-2 hours)
   - Drag-and-drop zone
   - Progress indicator
   - Error messages
   - Preview before upload

---

## 📋 Task Summary Table

| Task | Priority | Effort | Complexity | Status |
|------|----------|--------|------------|--------|
| Chat Rate Limiting & Spam Detection | HIGH | 4-6h | MEDIUM | Not Started |
| Two-Factor Authentication | HIGH | 8-10h | HIGH | Not Started |
| Chat Typing Indicators | MEDIUM | 3-4h | MEDIUM | Not Started |
| Message Search | MEDIUM | 6-8h | MEDIUM-HIGH | Not Started |
| Image Upload Validation | MEDIUM | 4-5h | MEDIUM | Not Started |

---

## 📊 Sprint Planning

### Recommended Schedule

**Days 1-2 (Mon-Tue)**:
- TASK 1: Chat Rate Limiting (4-6 hours)
- Setup and environment prep

**Days 2-3 (Tue-Wed)**:
- TASK 2 Part 1: 2FA Backend (3-4 hours)

**Days 3-4 (Wed-Thu)**:
- TASK 2 Part 2: 2FA Frontend & Login flow (3-4 hours)

**Day 5 (Thu-Fri)**:
- Testing all tasks
- Create PR for each task
- Buffer time for fixes

**If Additional Time Available**:
- TASK 3: Typing Indicators (3-4 hours)
- Or start TASK 4 or TASK 5

### Parallel Work Possible
None - these tasks depend on each other or infrastructure. Work sequentially.

---

## 🔀 Git Workflow

For each task:

1. **Create feature branch**:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/[task-name]
   ```

2. **Make commits** (frequently, small commits):
   ```bash
   git add [files]
   git commit -m "feat([scope]): [description]"
   ```

3. **Push to GitHub**:
   ```bash
   git push origin feature/[task-name]
   ```

4. **Create Pull Request**:
   - Title: Describe what you did
   - Description: Include:
     - What was changed
     - How to test
     - Any dependencies
     - Known issues or TODOs
   - Link to this document: "Implements TASK X"

5. **Wait for Agent Reviewer approval**:
   - Don't merge yourself
   - Be available for questions
   - Make changes if requested

6. **After Approval**:
   - Agent Reviewer merges and deploys
   - GitHub Actions handles deployment
   - Monitor production logs

---

## 🧪 Testing Requirements

**For each PR submitted**:

1. **Local Testing**:
   - [ ] Feature works as designed
   - [ ] No console errors
   - [ ] Responsive design (mobile, tablet, desktop)
   - [ ] Works in Chrome, Firefox, Safari

2. **Code Quality**:
   - [ ] No TypeScript errors: `npm run build`
   - [ ] No linting issues: `npm run lint`
   - [ ] Code follows project standards
   - [ ] Comments explain non-obvious logic

3. **Tests Written**:
   - [ ] Unit tests for business logic
   - [ ] Integration tests for API endpoints
   - [ ] At least 80% test coverage

4. **Documentation**:
   - [ ] Code is self-documenting (good naming)
   - [ ] Complex logic has comments
   - [ ] PR description is detailed

---

## 📞 Communication with Agent Reviewer

**When you get stuck**:
1. Document what you tried
2. List specific questions
3. Link to relevant code
4. Post in GitHub PR comments
5. Agent Reviewer responds within 4 hours

**When you're done with task**:
1. Create comprehensive PR
2. List testing steps Agent Reviewer should follow
3. Note any deployment considerations

---

## 🎯 Success Criteria for Sprint

Sprint is successful if:
- ✅ TASK 1 (Rate Limiting) is complete and merged
- ✅ TASK 2 (2FA) is complete and merged
- ✅ All code is tested and documented
- ✅ Production deploy successful
- ✅ No critical bugs in production

---

## 📚 Reference Materials

Before starting, read:
1. `docs/BACKEND.md` - API patterns and structure
2. `docs/FRONTEND.md` - Component patterns
3. `backend/src/` - Review similar features
4. `docs/ENGINEERING_PLAYBOOK.md` - Conventions

---

## ⚠️ Important Rules

**CRITICAL - READ BEFORE STARTING**:

1. ✅ **Always work on `feature/*` branches** (never commit to main)
2. ✅ **Create comprehensive PRs** with testing instructions
3. ✅ **Don't force-push** after creating PR
4. ✅ **Don't modify .env.production**
5. ✅ **Follow naming conventions**: `feat(scope): description`
6. ✅ **Commit frequently** (small, logical commits)
7. ❌ **Don't use** `git rebase -i`, `git reset --hard` without asking
8. ❌ **Don't run** `prisma migrate dev` (use manual migrations)

---

## 📝 Next Steps

1. Agent Coder reads this document thoroughly
2. Agent Coder starts with TASK 1 (Chat Rate Limiting)
3. Creates PR with detailed description
4. Agent Reviewer reviews, tests, and provides feedback
5. After approval, Reviewer merges and deploys
6. Repeat for remaining tasks

---

**Questions?** Ask Agent Reviewer to clarify any task or requirements.

**Updated**: 2025-12-02 by Agent Reviewer
**Next Sprint Planning**: 2025-12-16
