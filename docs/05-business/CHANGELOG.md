# Changelog

**Purpose**: Historical record of all features implemented and bugs fixed in production.

**Format**: Organized by date (newest first), following [Keep a Changelog](https://keepachangelog.com/) format.

---

## [Unreleased]

### 🐛 Known Issues
- **BUG-003**: Credit Balance Not Auto-Updating - Sidebar requires page refresh to show updated credits

---

## [2025-12-07]

### 🐛 Bugs Fixed
- **BUG-001**: Profile Plans Tab Crashes - Fixed null reference error by correcting database seed loading
- **BUG-002**: New User Missing 200 Initial Credits - Fixed by ensuring initial credit grant in account creation flow
- **BUG-004**: Tags Not Available During Registration - Fixed by executing `npm run db:seed:tags` in production

### 📚 Documentation
- Consolidated backend documentation from `backend/docs/` to centralized `docs/` structure
- Created comprehensive CLAUDE.md workflow guides for Agent Coder and Agent Reviewer
- Completed Phase 2 documentation reorganization (42 files moved)

---

## [2025-12-05]

### 📚 Documentation
- Completed Phase 1 documentation restructure following Diátaxis framework
- Created organized structure: Getting Started, Guides, Reference, Architecture, Business, Operations, Contributing
- Added comprehensive deployment guides and VM recovery procedures

---

## [2025-12-02]

### ✨ Features Added
- **Credits System**: Complete implementation with transaction logging
- **Notification System**: In-app and email notifications with user preferences
- **Image Generation**: AI-powered image generation with Cloudflare R2 storage

### 📚 Documentation
- Created `implemented-features.md` documenting 13 major features in production
- Updated backend documentation with LLM providers guide
- Added translation system comprehensive guide

---

## [2025-12-01]

### ✨ Features Added
- **Multi-User Conversations**: Support for group chats with multiple participants
- **Invite Links**: Shareable invite links for chat conversations with expiration

### 🔧 Infrastructure
- Implemented GitHub Actions CI/CD pipeline for automated deployments
- Added Cloudflare Tunnel for zero-trust HTTPS access

---

## [2025-11-30]

### ✨ Features Added
- **Chat System**: Real-time chat with WebSocket support, message history, and persistence
- **Character System**: Complete CRUD for character profiles with image support
- **LLM Integration**: Multi-provider support (Gemini, OpenAI, Grok) with streaming responses

### 🔧 Infrastructure
- Deployed production environment on GCP Compute Engine (e2-medium)
- Configured PostgreSQL 16 database with Prisma ORM
- Set up Docker Compose orchestration for all services

---

## [2025-11-29]

### ✨ Features Added
- **Translation System**: Multi-language support with 11 languages using AI-powered translations
- **OAuth Authentication**: Google OAuth 2.0 integration with JWT session management

### 🎨 UI/UX
- Implemented React 18 frontend with TypeScript and Tailwind CSS
- Added dark mode support with theme switching
- Responsive design for mobile, tablet, and desktop

---

## Format Guide

### Categories
- 🐛 **Bugs Fixed** - Bug fixes deployed to production
- ✨ **Features Added** - New features or enhancements
- 🔧 **Infrastructure** - Infrastructure, deployment, or DevOps changes
- 📚 **Documentation** - Documentation updates
- 🎨 **UI/UX** - User interface or user experience improvements
- 🔒 **Security** - Security fixes or improvements
- ⚡ **Performance** - Performance optimizations
- 🗑️ **Deprecated** - Features marked for removal
- ❌ **Removed** - Features removed from production

### Entry Format
```markdown
- **Feature/Bug Name**: Brief description of what changed
```

---

## Versioning

Currently following date-based versioning (YYYY-MM-DD). May switch to semantic versioning (MAJOR.MINOR.PATCH) when stable v1.0.0 is reached.

---

**Last Updated**: 2025-12-07
