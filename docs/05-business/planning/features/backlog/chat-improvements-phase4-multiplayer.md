# FEATURE: Chat Multiplayer & Discovery

**Type**: Feature Enhancement
**Priority**: MEDIUM
**Status**: Backlog (Pending)
**Estimated Duration**: 4-5 weeks
**Sprint**: Phase 4 - Multiplayer (Sprint 6-8)
**Original Document**: Split from `chat-improvements.md` (2026-01-21)

---

## Overview

This phase includes two major features:

1. **Multi-User Chat** - Allow multiple humans in conversations
2. **Public Chat Discovery** - Browse and join public conversations

**Impact**: ⭐⭐⭐⭐ (Game-changer feature for community engagement)

---

## Feature 1: Multi-User Chat

### Problem/Opportunity

Current limitation: 1 human + N AI characters per conversation

**Opportunity**: Enable collaborative roleplay with:
- Multiple human users (up to 4)
- Real-time collaboration
- Social engagement

### Requirements

**Core Capabilities**:
- Multiple human users in one conversation (limit: 4)
- AI responds based on context/mentions
- Presence indicators (online/offline/typing)
- Role-based permissions (Owner, Moderator, Member, Viewer)

**User Experience**:
- Invite other users to conversations
- See who's online
- Message attribution (which user sent what)
- Typing indicators per user

---

## Database Schema Changes

### Conversation Model Updates

```prisma
model Conversation {
  // ... existing fields

  // Multi-user settings
  maxUsers       Int      @default(1)  // Max human users
  isMultiUser    Boolean  @default(false)
  ownerUserId    String?  // Creator of conversation
  owner          User?    @relation("ConversationOwner", fields: [ownerUserId], references: [id])

  // Permissions
  permissions    Json?    // { allowUserInvites: bool, requireApproval: bool }

  // Relations
  memberships    UserConversationMembership[]
}

// New model: UserConversationMembership
model UserConversationMembership {
  id             String       @id @default(uuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Role
  role           MembershipRole @default(MEMBER)

  // Join metadata
  joinedAt       DateTime     @default(now())
  invitedBy      String?
  inviter        User?        @relation("Invites", fields: [invitedBy], references: [id])

  // Permissions
  canWrite       Boolean      @default(true)
  canInvite      Boolean      @default(false)

  @@unique([conversationId, userId])
  @@index([userId])
}

enum MembershipRole {
  OWNER
  MODERATOR
  MEMBER
  VIEWER
}
```

### Migration

```bash
docker compose exec backend npx prisma migrate dev --name add_multi_user_chat
```

---

## Backend Implementation

### 1. Membership Service

**File**: `backend/src/services/membershipService.ts` (new)

**Methods**:
- `joinConversation(conversationId, userId)` - Add user to conversation
- `leaveConversation(conversationId, userId)` - Remove user
- `inviteUser(conversationId, invitedUserId, inviterId)` - Send invite
- `kickUser(conversationId, userId, kickerId)` - Remove user (requires permission)
- `transferOwnership(conversationId, newOwnerId)` - Change owner

**Validation**:
- Check max users limit
- Verify permissions
- Check ban/block status

### 2. Presence Service

**File**: `backend/src/services/presenceService.ts` (new)

**Methods**:
- `userOnline(conversationId, userId)` - Mark user as online
- `userOffline(conversationId, userId)` - Mark user as offline
- `userTyping(conversationId, userId)` - Broadcast typing status
- `getUsersOnline(conversationId)` - Get list of online users

**Socket Events**:
- `user_joined` - User joined conversation
- `user_left` - User left conversation
- `user_typing` - User is typing
- `presence_update` - Online users list

### 3. AI Orchestration Service

**File**: `backend/src/services/aiOrchestrationService.ts` (new)

**Logic**: Decide when AI character should respond

```typescript
function shouldAssistantRespond(message: Message, context: Context): boolean {
  // Was the character mentioned?
  if (message.content.includes(`@${context.character.name}`)) return true;

  // Is message directed to character? (NLP)
  const intent = analyzeIntent(message.content, context);
  if (intent.targetCharacter === context.character.id) return true;

  // Is this user-to-user message? (don't respond)
  if (message.senderType === 'USER' && context.lastSender === 'USER') return false;

  // Default: don't respond (let users talk)
  return false;
}
```

### 4. WebSocket Updates

**File**: `backend/src/websocket/chatHandler.ts`

**Changes**:
- Broadcast to all members (not just owner)
- Typing indicators with userId
- Message ACKs from all users
- Room management per conversation

---

## Frontend Implementation

### 1. Members List Component

**File**: `frontend/src/pages/(chat)/shared/components/MembersList.tsx` (new)

**Features**:
- List of online users (avatars)
- Role badges (owner/mod/member)
- Invite button (if permitted)

### 2. Message Attribution

**Changes to Message Component**:
- Show username (in addition to character)
- User avatar vs character avatar
- Different colors per user

### 3. Invite Flow

**File**: `frontend/src/pages/(chat)/shared/components/InviteModal.tsx` (new)

**Features**:
- Search users
- Send invite
- Accept/reject invites
- Notifications

---

## Feature 2: Public Chat Discovery

### Requirements

**Dashboard Tab**: "Active Conversations"

**Features**:
- Grid of public conversations
- Preview of recent messages
- Online user count
- Filters: genre, tags, popularity
- "Watch" button (view-only mode)
- "Join" button (become member)

---

## Implementation

### Backend

**API Endpoint** (already implemented in Phase 2 #6):
- `GET /api/v1/conversations/public/list`

**Response**:
```typescript
interface PublicConversation {
  id: string;
  title: string;
  coverImage: string;
  memberCount: number;
  messageCount: number;
  characters: Array<{
    id: string;
    name: string;
    avatar: string;
  }>;
  lastMessage?: {
    content: string;
    timestamp: Date;
  };
  maxUsers: number;
}
```

### Frontend

**File**: `frontend/src/pages/(dashboard)/discover-chats/index.tsx` (new)

**Components**:

1. **DiscoverChatsPage** - Main page with grid
2. **ConversationCard** - Card for each conversation
3. **Filters** - Tag, genre, popularity filters

**ConversationCard Features**:
- Cover image
- Title and metadata
- Online count & message count
- Character avatars
- Last message preview
- Watch/Join buttons

---

## Translations

**i18n Keys**:
```json
{
  "multiuser": {
    "inviteUser": "Invite User",
    "membersOnline": "{{count}} online",
    "role": {
      "owner": "Owner",
      "moderator": "Mod",
      "member": "Member",
      "viewer": "Viewer"
    },
    "typing": "{{user}} is typing..."
  },
  "discover": {
    "title": "Discover Conversations",
    "sort": {
      "recent": "Recent",
      "popular": "Popular"
    },
    "watch": "Watch",
    "join": "Join",
    "full": "Full"
  }
}
```

---

## Testing

### Multi-User Chat Tests

**Unit Tests**:
- [ ] Membership service operations
- [ ] Presence tracking
- [ ] AI orchestration logic
- [ ] Permission checks

**Integration Tests**:
- [ ] Join/leave conversation
- [ ] Invite flow
- [ ] Socket events
- [ ] Real-time updates

**E2E Tests**:
- [ ] 4 users in conversation
- [ ] Typing indicators work
- [ ] AI responds correctly
- [ ] Permissions enforced

### Discovery Tests

**Unit Tests**:
- [ ] Public conversations list API
- [ ] Filter logic

**Integration Tests**:
- [ ] Watch mode (view-only)
- [ ] Join conversation
- [ ] Max users limit

---

## Dependencies

**Required**:
- ✅ Phase 2: Privacy system (completed)
- ✅ WebSocket infrastructure (exists)
- ✅ Authentication system (exists)

**Blocked By**: None

**Blocking**:
- Phase 5: Real-time translation (depends on multi-user)

---

## Rollout Plan

1. **Week 1-2**: Multi-user chat backend
2. **Week 3**: Multi-user chat frontend
3. **Week 4**: Discovery feature
4. **Week 5**: Testing and refinement

---

## Complexity Warning

⚠️ **This is the most complex feature in the roadmap**

**Challenges**:
- Significant schema changes
- Granular permission system
- Advanced WebSocket room management
- Multi-context AI orchestration
- Multiplayer UI (avatars, turns, attribution)

**Recommendation**:
- Create detailed technical spec before implementation
- Consider phased rollout (beta → public)
- Extensive testing required

---

## Open Questions

1. **Scalability**: How many concurrent users per conversation?
2. **Moderation**: How to handle abusive users in public chats?
3. **Memory**: How does memory system work with multi-user? (Phase 3 integration)
4. **Monetization**: Should multi-user chat be premium?

---

## References

**Original Document**: `chat-improvements.md` (lines 1493-1773)
**Related Features**:
- Phase 2: Privacy/Visibility (completed)
- Phase 3: Memory system
- Phase 5: Real-time translation

**Technical Docs**:
- Socket.IO room management
- WebSocket authentication
- Real-time presence patterns

---

**Last Updated**: 2026-01-21
**Status**: Ready for detailed planning
**Next Phase**: Phase 5 - Real-time Translation
