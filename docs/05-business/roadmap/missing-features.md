# Missing Features & Not Yet Implemented

**Last Updated**: 2025-12-02
**Status**: 25% of planned features still pending
**Purpose**: Summary of features listed in documentation that have NOT been implemented yet

---

## 📋 Overview

This document lists all features that are planned, documented in `docs/todo/`, but **not yet implemented in code**. Features are organized by:
- **Priority**: High → Medium → Low
- **Category**: Infrastructure → Core Features → UX/Advanced Features
- **Complexity**: Simple → Medium → Complex
- **Dependencies**: What other features must be done first

For detailed specifications and technical requirements, refer to the files in `docs/todo/`.

---

## 🔴 HIGH PRIORITY FEATURES

### 1. Staging Environment & CD Pipeline Extension

**Priority**: HIGH (Production requirement)
**Status**: 🔲 NOT IMPLEMENTED
**Complexity**: HIGH (Medium effort, High infrastructure knowledge)

**Description**:
- Create separate staging VM (e2-micro on GCP)
- Deploy staging automatically after main branch push
- Cloudflare tunnel for staging.charhub.app
- Manual approval gate before production deploy
- Health checks and rollback capability for staging

**Reference**: `docs/todo/CI_CD.md` (lines 52-122)

**Why Important**:
- Test releases without affecting production users
- Catch integration issues early (APIs, Cloudflare, databases)
- Safe testing of database migrations
- Training ground for new features

**Current Blocker**:
- Cost: ~R$90/month additional for staging VM
- Business metric condition: When users > 100 or revenue > R$1000/month
- Current state: 7 users, no revenue

**Tasks**:
1. Create staging VM instance (GCP)
2. Configure Cloudflare tunnel for staging.charhub.app
3. Implement deploy-staging.yml GitHub Actions workflow
4. Add manual approval step between staging and production
5. Document staging environment procedures
6. Set up monitoring and alerting for staging

**Dependencies**: None (can be done anytime)

**Estimated Effort**: 4-6 hours

---

### 2. Chat Improvements & Advanced Features

**Priority**: HIGH (User engagement)
**Status**: 🔲 PARTIAL (Base implemented, enhancements missing)
**Complexity**: HIGH (Many features, various complexities)

**Reference**: `docs/todo/CHAT_IMPROVEMENTS.md` (~368 lines)

**Missing Features**:

#### 2.1 Rate Limiting & Spam Detection
- Rate limit API requests per user per minute
- Spam detection for repeated messages
- Cooldown periods for certain actions
- Blocklist/mute functionality

**Importance**: Security and quality of service
**Effort**: Medium (4-6 hours)

#### 2.2 Message Reactions & Emojis
- Add reactions to messages (thumbs up, laugh, etc.)
- Emoji picker component
- Reaction counter display
- Database schema for reactions

**Importance**: User engagement
**Effort**: Medium (4-6 hours)

#### 2.3 Pinned Messages
- Pin important messages to top of chat
- Pinned message list sidebar
- Pin/unpin permissions (author + admin)
- Database tracking of pins

**Importance**: UX improvement
**Effort**: Medium (4-6 hours)

#### 2.4 Typing Indicators
- Show when other users are typing
- Real-time WebSocket updates
- Timeout after 3 seconds of inactivity

**Importance**: UX improvement
**Effort**: Medium (3-4 hours)

#### 2.5 Message Search & Filtering
- Full-text search in chat history
- Filter by date range, user, message type
- Pagination of search results
- Highlighted search matches

**Importance**: UX improvement
**Effort**: Medium-High (6-8 hours)

**Dependencies**:
- Must complete before advanced conversation features
- Requires database indexing for performance

**Total Effort for Chat Improvements**: 20-30 hours

---

### 3. Authentication Enhancements

**Priority**: HIGH (Security critical)
**Status**: 🔲 PARTIAL (OAuth implemented, 2FA partial)
**Complexity**: HIGH

**Missing/Incomplete Features**:

#### 3.1 Two-Factor Authentication (2FA) - Complete Implementation
- Currently: Structure exists, needs validation
- SMS-based 2FA (OTP via text)
- App-based 2FA (TOTP - Google Authenticator, Authy)
- Backup codes generation and storage
- Recovery procedures if user loses 2FA device

**Importance**: Security critical for accounts
**Effort**: High (8-10 hours)

#### 3.2 Session Management Improvements
- Session listing (all active sessions per user)
- Remote logout capability (kill specific sessions)
- Device/browser identification
- Last activity timestamp
- Session timeout policies

**Importance**: Security and UX
**Effort**: Medium (6-8 hours)

#### 3.3 Additional OAuth Providers
- Currently working: Google
- Needs testing: Facebook, Discord
- Missing: Apple, GitHub, Microsoft
- Provider selection UI

**Importance**: User acquisition (lower friction signup)
**Effort**: Medium (4-5 hours per new provider)

#### 3.4 Account Security Features
- Change password flow
- Email verification for critical changes
- Login attempt history and alerts
- Suspicious activity detection
- Account recovery procedures

**Importance**: Security and trust
**Effort**: High (10-12 hours)

#### 3.5 Permission & Role Management - Complete RBAC
- Currently: Basic structure
- Admin role with full permissions
- Moderator role for community management
- Custom role creation
- Permission matrix documentation

**Importance**: Scalability for team growth
**Effort**: Medium-High (8-10 hours)

**Total Effort for Auth Enhancements**: 36-45 hours

---

### 4. Notification System - Complete Implementation

**Priority**: HIGH (User experience)
**Status**: ⚠️ PARTIAL (Base exists, many features missing)
**Complexity**: HIGH

**Reference**: `docs/todo/NOTIFICATION_SYSTEM.md` (~542 lines)

**Missing Features**:

#### 4.1 Notification Types - Full Implementation
- Message notifications (new chat message)
- System notifications (credits added, subscription updated)
- Marketing notifications (new features, events)
- Reminder notifications (follow-up on inactive chats)
- Alert notifications (security events, payment failures)

**Status**: Partially implemented
**Effort**: Medium (6-8 hours for full wiring)

#### 4.2 Delivery Channels
- In-app notifications (✅ exists)
- Email notifications (⚠️ structure exists)
- Push notifications (❌ NOT implemented)
- SMS notifications (❌ NOT implemented)
- Discord webhook integration (❌ NOT implemented)

**Importance**: Reach users effectively
**Effort**: High (15-20 hours)

#### 4.3 Notification Preferences & Customization
- User can enable/disable notification types
- Frequency settings (immediate, daily digest, weekly)
- Quiet hours (do not disturb)
- Channel preference per notification type
- Unsubscribe management

**Status**: Partially implemented
**Effort**: Medium (6-8 hours)

#### 4.4 Notification History & Analytics
- Notification delivery status tracking
- User engagement metrics (open rate, click rate)
- Notification effectiveness analysis
- Archive and retrieve old notifications

**Status**: ❌ NOT implemented
**Effort**: Medium (6-8 hours)

#### 4.5 Transactional Email Templates
- Purchase receipt
- Welcome email
- Password reset
- Email verification
- Subscription confirmations
- Payment failure alerts

**Status**: ⚠️ Partial (only password reset exists)
**Effort**: Medium (6-8 hours)

**Total Effort for Notifications**: 39-52 hours

---

## 🟡 MEDIUM PRIORITY FEATURES

### 5. Credits System - Advanced Features

**Priority**: MEDIUM (Revenue generation)
**Status**: ⚠️ PARTIAL (Basic implementation exists)
**Complexity**: MEDIUM

**Reference**: `docs/todo/CREDITS_SYSTEM.md` (~158 lines)

**Missing Features**:

#### 5.1 Dynamic Credit Pricing
- Currently: Fixed prices per action
- Implement: Variable pricing based on:
  - User subscription level (free vs premium)
  - Usage patterns (bulk discounts)
  - Seasonal promotions
  - A/B testing different prices

**Effort**: Medium (6-8 hours)

#### 5.2 Credit Packages & Bundles
- Pre-made packages (10, 50, 100, 500 credits)
- Volume discounts for larger packages
- Special bundles with time limits
- Subscription-based credit allowances

**Effort**: Medium (6-8 hours)

#### 5.3 Payment Integration & Processing
- PayPal integration (⚠️ exists, needs testing)
- Stripe integration (❌ NOT implemented)
- Credit card processing with encryption
- Payment retry logic for failed transactions
- Webhook handling for payment confirmations

**Effort**: High (10-12 hours per provider)

#### 5.4 Refund & Dispute Management
- User-initiated refunds
- Chargeback handling
- Partial credit refunds
- Refund timing and policies
- Dispute resolution workflow

**Effort**: Medium (6-8 hours)

#### 5.5 Revenue Analytics & Reporting
- Daily/monthly revenue tracking
- Payment method breakdown
- Refund rate analysis
- Customer lifetime value
- Churn analysis by cohort

**Effort**: Medium (6-8 hours)

**Total Effort for Credits System**: 34-44 hours

---

### 6. Image Generation & Management - Advanced

**Priority**: MEDIUM (Core feature extension)
**Status**: ⚠️ PARTIAL (Basic implementation exists)
**Complexity**: HIGH

**Reference**: `docs/todo/IMAGE_GENERATION.md` (~567 lines)

**Missing Features**:

#### 6.1 Advanced Image Generation Options
- Image style parameters (realistic, anime, cartoon, etc.)
- Image composition control (pose, background)
- Batch generation (generate 5 variations at once)
- Prompt engineering UI (let users refine prompts)
- Generation history and versioning

**Status**: ❌ NOT implemented
**Effort**: High (10-12 hours)

#### 6.2 Image Editing Tools
- Built-in image editor (crop, rotate, resize)
- Filter applications (color correction, effects)
- Canvas/background removal
- Upscaling and enhancement
- Drawing/annotation tools

**Status**: ❌ NOT implemented (browser-based tools missing)
**Effort**: High (12-15 hours)

#### 6.3 Image Moderation & Safety
- NSFW content detection
- Copyright/trademark detection
- Automated flagging for review
- Human review queue
- Appeal process for incorrect flags

**Status**: ❌ NOT implemented
**Effort**: High (8-10 hours)

#### 6.4 Image Analytics & Insights
- Popular images per character
- Generation cost per image
- User preference analysis
- A/B testing image styles

**Status**: ❌ NOT implemented
**Effort**: Medium (6-8 hours)

#### 6.5 Image Sharing & Licensing
- Share image with custom permissions
- Commercial vs non-commercial use flags
- Watermarking
- License agreement enforcement

**Status**: ❌ NOT implemented
**Effort**: Medium (6-8 hours)

**Total Effort for Image Generation**: 42-53 hours

---

### 7. Story Generation & Publishing

**Priority**: MEDIUM (Content creation)
**Status**: ⚠️ PARTIAL (Basic generation exists)
**Complexity**: MEDIUM-HIGH

**Reference**: `docs/todo/STORY_GENERATION.md` (~172 lines)

**Missing Features**:

#### 7.1 Advanced Story Generation
- Multi-chapter stories (sequential generation)
- Story branching (different plot paths)
- User-guided story generation (interactive prompts)
- Story continuation from previous sessions
- Style selection (short story, novel, screenplay, etc.)

**Status**: ❌ NOT implemented
**Effort**: High (12-15 hours)

#### 7.2 Story Publishing & Distribution
- Story publication to platform (timeline/feed)
- Community comments and ratings
- Author earnings from story views
- Story categories and discovery
- Featured stories selection

**Status**: ❌ NOT implemented
**Effort**: High (12-15 hours)

#### 7.3 Story Monetization
- Revenue sharing for authors
- Premium stories (paid access)
- Tier-based access (free chapters, premium chapters)
- Subscription to author's stories

**Status**: ❌ NOT implemented
**Effort**: High (10-12 hours)

#### 7.4 Story Analytics
- View counts and engagement metrics
- Reader retention analysis
- Comment and rating statistics
- Earnings tracking per story

**Status**: ❌ NOT implemented
**Effort**: Medium (6-8 hours)

**Total Effort for Story Generation**: 40-50 hours

---

### 8. Game Modules System - Specific Modules

**Priority**: MEDIUM (Platform expansion)
**Status**: ⚠️ PARTIAL (Framework exists, no modules)
**Complexity**: VARIES

**Reference**: `docs/todo/GAME_MODULES_SYSTEM.md` (~222 lines)

**Missing Modules**:

#### 8.1 Trivia Game Module
- Question generation from LLM
- Multiple choice or true/false questions
- Scoring and leaderboard
- Category selection

**Effort**: Medium (6-8 hours)

#### 8.2 Story Matching Game Module
- Match story excerpts to characters
- Difficulty levels
- Time-based challenges
- Scoring system

**Effort**: Medium (6-8 hours)

#### 8.3 Character Guessing Game Module
- AI generates clues about character
- User guesses character
- Points for correct guesses
- Hint system

**Effort**: Medium (6-8 hours)

#### 8.4 Chat Challenge Game Module
- Users compete in chat with AI character
- Prompts/challenges provided by LLM
- Scoring based on creativity/quality
- Leaderboard and rewards

**Effort**: Medium-High (8-10 hours)

#### 8.5 Game Module Infrastructure Enhancements
- Module marketplace/discovery
- User-created game modules
- Module rating and reviews
- Revenue sharing for module creators

**Effort**: High (12-15 hours)

**Total Effort for Game Modules**: 38-49 hours

---

## 🟢 LOW PRIORITY FEATURES

### 9. Deployment Infrastructure Improvements

**Priority**: LOW (Operational nice-to-have)
**Status**: 🔲 NOT IMPLEMENTED
**Complexity**: MEDIUM

**Missing Features**:

#### 9.1 Automated Health Monitoring & Alerting
- Uptime monitoring (Pingdom, Datadog, etc.)
- Alert on service degradation
- Performance metric alerts
- Email/Slack notifications
- Dashboard for status overview

**Effort**: Medium (6-8 hours)

#### 9.2 Automated Backup & Recovery
- Daily encrypted backups to cloud storage
- Test restore procedures
- Disaster recovery documentation
- Automated cleanup of old backups

**Effort**: Medium (6-8 hours)

#### 9.3 Load Balancing & Auto-Scaling
- Horizontal scaling for more VMs
- Load balancer configuration
- Auto-scale policies (based on CPU/memory)
- Database connection pooling

**Effort**: High (12-15 hours)

#### 9.4 Logging & Observability Improvements
- Centralized logging (ELK, Splunk, etc.)
- Performance tracing (APM)
- Error tracking (Sentry, etc.)
- Custom dashboards for key metrics

**Effort**: High (10-12 hours)

**Total Effort for Deploy Improvements**: 34-43 hours

---

### 10. Advanced UX/UI Features

**Priority**: LOW (Polish and delight)
**Status**: 🔲 NOT IMPLEMENTED
**Complexity**: VARIES

**Missing Features**:

#### 10.1 Advanced Search & Discovery
- Full-text search across all content
- Faceted search (filter by multiple criteria)
- Search suggestions and autocomplete
- Saved searches
- Search analytics

**Effort**: High (10-12 hours)

#### 10.2 Personalization Engine
- Content recommendations (characters, stories)
- Personalized homepage
- User preference learning
- A/B testing framework for features

**Effort**: High (12-15 hours)

#### 10.3 Social Features
- Follow other users
- User profiles with public activity
- Social feed/timeline
- User messaging (DMs)
- Blocking and reporting abuse

**Effort**: High (15-20 hours)

#### 10.4 Gamification & Achievements
- Achievement/badge system
- User leveling system
- Daily challenges and streaks
- Leaderboards (global, friends, weekly)
- Rewards for achievements

**Effort**: High (12-15 hours)

#### 10.5 Analytics Dashboard for Users
- Usage statistics (time spent, features used)
- Content consumption patterns
- Spending analysis
- Goal setting and tracking

**Effort**: Medium (8-10 hours)

**Total Effort for Advanced UX**: 57-72 hours

---

### 11. API & Integration Features

**Priority**: LOW (Extensibility)
**Status**: 🔲 NOT IMPLEMENTED
**Complexity**: MEDIUM-HIGH

**Missing Features**:

#### 11.1 Public API for Third Parties
- RESTful API with proper versioning
- API documentation (OpenAPI/Swagger)
- Rate limiting per API key
- Usage analytics per key
- API key management dashboard

**Effort**: High (12-15 hours)

#### 11.2 Webhooks for External Services
- Event webhooks (new story, character created, etc.)
- Webhook delivery retry logic
- Webhook signature verification
- Webhook testing tools

**Effort**: Medium (6-8 hours)

#### 11.3 Third-Party Integrations
- Discord bot integration
- Telegram bot integration
- Slack integration
- RSS feed generation

**Effort**: Medium-High (8-12 hours per integration)

**Total Effort for API Features**: 26-35 hours

---

## 📊 Summary Table - All Missing Features

| Feature | Category | Priority | Complexity | Effort | Blockers |
|---------|----------|----------|------------|--------|----------|
| Staging Environment | Infra | HIGH | HIGH | 4-6h | Cost |
| Chat Improvements | Core | HIGH | HIGH | 20-30h | None |
| Auth Enhancements | Security | HIGH | HIGH | 36-45h | None |
| Notifications | Core | HIGH | HIGH | 39-52h | Email config |
| Credits System | Revenue | MEDIUM | MEDIUM | 34-44h | None |
| Image Generation | Core | MEDIUM | HIGH | 42-53h | Moderation API |
| Story Generation | Content | MEDIUM | HIGH | 40-50h | None |
| Game Modules | Platform | MEDIUM | VARIES | 38-49h | Framework done |
| Deploy Improvements | Infra | LOW | MEDIUM | 34-43h | None |
| Advanced UX | UX | LOW | VARIES | 57-72h | None |
| API/Integrations | Platform | LOW | MEDIUM | 26-35h | None |

---

## 🎯 Implementation Roadmap Suggestion

### Phase 1 (Next Sprint) - HIGH Priority
1. **Staging Environment** (4-6h) - Essential for safe testing
2. **Chat Improvements - Core Features** (12-15h from 20-30h total)
   - Rate limiting & spam detection
   - Typing indicators
   - Message search
3. **Auth Enhancements - 2FA** (8-10h) - Security critical

**Estimated**: ~24-31 hours

### Phase 2 (Following Sprint) - HIGH Priority Continuation
1. **Chat Improvements - Remaining** (8-15h)
   - Message reactions
   - Pinned messages
   - Additional features
2. **Auth Enhancements - Additional Providers** (8-10h)
3. **Notification Delivery Channels** (10-15h)

**Estimated**: ~26-40 hours

### Phase 3 (Month 2) - MEDIUM Priority
1. **Credits System - Payment Integration** (10-12h)
2. **Image Generation - Advanced Features** (10-15h)
3. **Notifications - Complete** (remaining hours)

**Estimated**: ~30-45 hours

### Phase 4 (Month 3) - MEDIUM Priority Continuation
1. **Story Generation** (40-50h - can be split)
2. **Game Modules - First Module** (6-10h)

**Estimated**: ~46-60 hours

### Phase 5+ (Months 4+) - LOW Priority
- Deploy improvements
- Advanced UX features
- API/Integrations

---

## 📝 Dependencies & Constraints

### Technical Dependencies
- **Chat Improvements** → No dependencies, can start anytime
- **Auth Enhancements** → No dependencies, parallel to other work
- **Notifications** → Requires email provider setup
- **Credits System** → Requires payment gateway setup
- **Image Generation** → Requires Cloudflare R2 configuration
- **Story Publishing** → Requires community features (comments, ratings)
- **Game Modules** → Framework exists, modules independent

### Business Constraints
- **Staging Environment** → Blocked until: users > 100 OR revenue > R$1000/month
- **Advanced Monetization** → Blocked until: revenue model validated
- **Social Features** → Blocked until: minimum user base (TBD)

### Resource Constraints
- **Effort estimates** based on single developer
- **Parallel work** possible with multiple developers
- **Testing required** for all features before production

---

## 🔍 How to Start Implementation

For each feature, Agent Coder should:

1. **Read the specification** in `docs/todo/[feature].md`
2. **Identify dependencies** from this document
3. **Create feature branch**: `git checkout -b feature/[name]`
4. **Create test plan** (before coding)
5. **Implement incrementally** (small PRs are better)
6. **Create PR with detailed description** (what was done, how to test)
7. **Agent Reviewer** tests, approves, merges to main

---

**See Also**:
- `docs/IMPLEMENTED_AND_NEEDS_TESTING.md` - What's already done
- `docs/todo/` - Detailed feature specifications
- `docs/ROADMAP.md` - Strategic priorities
- `docs/TODO.md` - Overall progress summary
