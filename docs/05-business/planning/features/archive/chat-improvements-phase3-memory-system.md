# FEATURE: Chat Memory System (Long-Term Conversation Memory)

**Type**: Feature Enhancement
**Priority**: HIGH
**Status**: Backlog (Pending)
**Estimated Duration**: 1.5-2 weeks
**Sprint**: Phase 3 - Scalability (Sprint 4-5)
**Original Document**: Split from `chat-improvements.md` (2026-01-21)

---

## Overview

**Problem**: Long conversations (>100 messages) face:
- **Context limit**: LLMs have token limits (~32k-128k)
- **Growing costs**: Each message processes entire history
- **Degraded quality**: Old details are "forgotten"

**Solution**: Incremental summarization pipeline that:
1. Detects when conversation reaches threshold (e.g., 50 messages)
2. Generates summary of key events
3. Stores structured memory
4. Uses summary + recent messages as context

**Impact**: ⭐⭐⭐⭐⭐ (High impact - cost reduction + better UX for long conversations)

---

## Success Criteria

- [ ] Memory auto-generates at 50-message threshold
- [ ] Structured memory (summary, events, characters, plot flags)
- [ ] Assistant uses memory + recent messages for context
- [ ] UI shows memory status indicator
- [ ] Memory generation < 5 seconds
- [ ] Cost reduction of 30-50% for long conversations

---

## Database Schema Changes

### New Model: ConversationMemory

```prisma
model Conversation {
  // ... existing fields

  memoryLastUpdatedAt DateTime? // When last summary was generated

  // Relations
  memories ConversationMemory[]
}

model ConversationMemory {
  id             String   @id @default(uuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  // Memory content
  summary        String   @db.Text // Prose summary
  keyEvents      Json     // Array of structured events
  characters     Json     // Character states
  plotFlags      Json     // Narrative flags

  // Metadata
  startMessageId String?  // First message summarized
  endMessageId   String?  // Last message summarized
  messageCount   Int      // How many messages were summarized

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([conversationId])
  @@index([createdAt])
}
```

### Migration

```bash
docker compose exec backend npx prisma migrate dev --name add_conversation_memory
```

---

## Backend Implementation

### 1. Memory Service

**File**: `backend/src/services/memoryService.ts` (new)

**Key Methods**:
- `shouldGenerateMemory(conversationId)` - Check if threshold reached
- `generateMemory(params)` - Generate structured summary via LLM
- `saveMemory(...)` - Store memory in database
- `getLatestMemory(conversationId)` - Retrieve latest memory
- `buildContextWithMemory(conversationId, limit)` - Build context for LLM

**LLM Integration**:
- Provider: Gemini
- Model: `gemini-2.5-flash` (good reasoning capability)
- Response Format: JSON
- Temperature: 0.3

**Memory Structure**:
```typescript
interface GeneratedMemory {
  summary: string; // 3-5 sentences prose summary
  keyEvents: Array<{
    timestamp: string;
    description: string;
    participants: string[];
    importance: 'high' | 'medium' | 'low';
  }>;
  characters: Record<string, {
    currentState: string;
    emotionalState: string;
    relationships: Record<string, string>;
  }>;
  plotFlags: Record<string, boolean>; // Story beats
}
```

### 2. BullMQ Job

**File**: `backend/src/jobs/generateMemory.job.ts` (new)

**Job Data**:
```typescript
interface GenerateMemoryJobData {
  conversationId: string;
}
```

**Process**:
1. Generate memory via memoryService
2. Save to database
3. Update conversation timestamp
4. Emit socket event

### 3. Automatic Trigger

**File**: `backend/src/websocket/chatHandler.ts`

**Trigger Point**: After saving message in `send_message` handler

**Logic**:
```typescript
const shouldGenerate = await memoryService.shouldGenerateMemory(conversationId);
if (shouldGenerate) {
  await memoryQueue.add('generate-memory', { conversationId });
  socket.emit('memory_update_started', { conversationId });
}
```

### 4. Update Assistant Service

**File**: `backend/src/services/assistantService.ts`

**Change**: Use memory + recent messages instead of full history

```typescript
async buildConversationHistory(conversationId: string, limit = 30): Promise<string> {
  return memoryService.buildContextWithMemory(conversationId, limit);
}
```

---

## Frontend Implementation

### 1. Memory Indicator Component

**File**: `frontend/src/pages/(chat)/shared/components/MemoryIndicator.tsx` (new)

**Purpose**: Show memory status to users

**Display**:
- Icon: psychology/material-symbols-outlined
- Text: "Memory last updated {{date}}"
- Only shows if `memoryLastUpdatedAt` exists

### 2. Socket Listeners

**File**: `frontend/src/hooks/useChatSocket.ts`

**Events**:
- `memory_update_started` - Show toast "Generating conversation summary..."
- `memory_update_complete` - Invalidate query, show success toast

---

## Translations

**i18n Keys**:
```json
{
  "chat": {
    "memoryActive": "Memory last updated {{date}}",
    "memoryGenerating": "Generating conversation summary...",
    "memoryUpdated": "Conversation memory updated"
  }
}
```

---

## Testing

### Unit Tests
- [ ] Memory threshold detection (50 messages)
- [ ] Memory generation from messages
- [ ] Context building with memory
- [ ] Memory persistence

### Integration Tests
- [ ] Job execution (BullMQ)
- [ ] Socket events emission
- [ ] Assistant service uses memory

### E2E Tests
- [ ] Send 50 messages → memory generates
- [ ] Memory indicator appears
- [ ] Long conversations stay fast

### Performance Tests
- [ ] Memory generation < 5 seconds
- [ ] Context building < 500ms
- [ ] Cost reduction measured

---

## Performance Optimizations

1. **Incremental Summaries**: Only summarize new messages (delta)
2. **Cache**: Store memories in Redis (read-heavy)
3. **Batch Processing**: Generate multiple memories in parallel
4. **Compression**: gzip JSON payloads before saving

---

## Dependencies

**Required**:
- ✅ Phase 1: Chat functionality (completed)
- ✅ Phase 2: Privacy system (completed)
- ✅ BullMQ infrastructure (exists)
- ✅ LLM service (exists)

**Blocked By**: None

**Blocking**:
- Phase 4: Multi-user chat (can benefit from memory)

---

## Rollout Plan

1. **Week 1**:
   - Database migration
   - Memory service implementation
   - BullMQ job creation

2. **Week 2**:
   - Frontend components
   - Testing and refinement
   - Performance optimization

3. **Beta**:
   - Enable for test conversations
   - Monitor costs and performance
   - Gather user feedback

---

## Monitoring

**Metrics to Track**:
- Memory generation frequency
- Memory generation duration (p50, p95, p99)
- Cost per conversation (before/after)
- User engagement in long conversations

**Alerts**:
- Memory generation failures
- Generation duration > 10s
- Cost increase (unexpected)

---

## Open Questions

1. **Threshold**: 50 messages good? Should be configurable per conversation?
2. **Retention**: Keep all memories or consolidate old ones?
3. **User Control**: Allow users to view/edit memories?
4. **Multi-user**: How to handle memory in group chats? (Phase 4 concern)

---

## References

**Original Document**: `chat-improvements.md` (lines 1143-1492)
**Related Features**:
- Phase 4: Multi-user chat
- Phase 5: Real-time translation

**Technical Docs**:
- BullMQ documentation
- Gemini API documentation
- Conversation system architecture

---

**Last Updated**: 2026-01-21
**Status**: Ready for implementation
**Next Phase**: Phase 4 - Multiplayer Features
