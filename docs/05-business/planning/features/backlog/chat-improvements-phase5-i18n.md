# FEATURE: Real-Time Multi-User Translation

**Type**: Feature Enhancement
**Priority**: LOW
**Status**: Backlog (Pending)
**Estimated Duration**: 1.5 weeks
**Sprint**: Phase 5 - Internationalization (Sprint 9)
**Original Document**: Split from `chat-improvements.md` (2026-01-21)

---

## Overview

**Problem**: In multi-user conversations, users speak different languages

**Solution**: Automatic real-time translation for each user's preferred language

**Impact**: ⭐⭐⭐ (Enables global collaboration)

---

## Requirements

**Core Capabilities**:
- Auto-translate messages to each user's preferred language
- Translation cache (1 message × N languages)
- Toggle "View original" vs "Translated"
- Badge indicating message is translated

**User Experience**:
- Messages appear in user's preferred language
- Single click to see original
- Transparent translation indicator
- Fast (cached translations)

---

## Database Schema Changes

### New Model: MessageTranslation

```prisma
model MessageTranslation {
  id              String   @id @default(uuid())
  messageId       String
  message         Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)

  targetLanguage  String   // ISO 639-1 code (e.g., 'pt-BR', 'en-US')
  translatedText  String   @db.Text

  provider        String   // 'gemini' | 'deepl'
  createdAt       DateTime @default(now())

  @@unique([messageId, targetLanguage])
  @@index([messageId])
}

model Message {
  // ... existing fields

  // Relations
  translations    MessageTranslation[]
}
```

### Migration

```bash
docker compose exec backend npx prisma migrate dev --name add_message_translations
```

---

## Backend Implementation

### 1. Translation Service Extension

**File**: `backend/src/services/translationService.ts`

**New Method**:
```typescript
async translateMessage(
  messageId: string,
  targetLanguage: string
): Promise<string> {
  // Check cache
  const cached = await prisma.messageTranslation.findUnique({
    where: {
      messageId_targetLanguage: { messageId, targetLanguage }
    }
  });

  if (cached) return cached.translatedText;

  // Fetch original message
  const message = await prisma.message.findUnique({
    where: { id: messageId }
  });

  if (!message) throw new Error('Message not found');

  // Detect source language
  const sourceLanguage = await this.detectLanguage(message.content);

  // Skip if same language
  if (sourceLanguage === targetLanguage) {
    return message.content;
  }

  // Translate via LLM
  const translated = await this.translateText(message.content, targetLanguage);

  // Cache translation
  await prisma.messageTranslation.create({
    data: {
      messageId,
      targetLanguage,
      translatedText: translated,
      provider: 'gemini'
    }
  });

  return translated;
}
```

### 2. WebSocket Translation

**File**: `backend/src/websocket/chatHandler.ts`

**Logic**: Pre-generate translations for all members when message is sent

```typescript
socket.on('send_message', async (payload) => {
  // ... save message

  // Get member languages
  const members = await conversationService.getConversationMembers(conversationId);
  const languages = new Set(members.map(m => m.user.preferredLanguage));

  // Pre-generate translations (async)
  const translations: Record<string, string> = {};
  for (const lang of languages) {
    if (lang !== sourceLanguage) {
      translations[lang] = await translationService.translateMessage(message.id, lang);
    }
  }

  // Broadcast with translations
  io.to(`conversation:${conversationId}`).emit('message_received', {
    message: messageData,
    translations // { 'pt-BR': '...', 'es-ES': '...' }
  });
});
```

---

## Frontend Implementation

### 1. Message Bubble with Toggle

**File**: `frontend/src/pages/(chat)/shared/components/MessageBubble.tsx`

**Features**:
- Show translated text by default
- Toggle button to show original
- Translation badge indicator

```tsx
function MessageBubble({ message, translations }: Props) {
  const [showOriginal, setShowOriginal] = useState(false);
  const userLanguage = useUserLanguage();

  const displayText = showOriginal
    ? message.content
    : (translations?.[userLanguage] || message.content);

  const isTranslated = !showOriginal && !!translations?.[userLanguage];

  return (
    <div className="message-bubble">
      <p>{displayText}</p>

      {isTranslated && (
        <button
          onClick={() => setShowOriginal(true)}
          className="text-xs text-muted mt-1 flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-xs">translate</span>
          {t('chat.translated')}
        </button>
      )}

      {showOriginal && translations && (
        <button
          onClick={() => setShowOriginal(false)}
          className="text-xs text-primary mt-1"
        >
          {t('chat.showTranslated')}
        </button>
      )}
    </div>
  );
}
```

---

## Translations

**i18n Keys**:
```json
{
  "chat": {
    "translated": "Translated",
    "showTranslated": "Show translated",
    "showOriginal": "Show original"
  }
}
```

---

## Testing

### Unit Tests
- [ ] Translation cache hit/miss
- [ ] Language detection
- [ ] Same language skip logic
- [ ] Translation persistence

### Integration Tests
- [ ] WebSocket translation payload
- [ ] Multi-language conversation
- [ ] Toggle original/translated

### E2E Tests
- [ ] Message in PT translated to EN
- [ ] Cache works (2nd request instant)
- [ ] Toggle original/translated works
- [ ] Translation badge appears
- [ ] Same language → no translation

---

## Performance Considerations

**Translation Caching**:
- First request: ~500ms (API call)
- Cached requests: ~10ms (database)
- Cache hit rate should be >90%

**Pre-generation Strategy**:
- Generate translations for all members when message sent
- Async processing (don't block message delivery)
- Fallback to client-side translation if not ready

**Cost Optimization**:
- Cache translations forever (don't expire)
- Batch translation requests
- Use cheaper models for translation (Gemini 1.5 Flash)

---

## Dependencies

**Required**:
- ✅ Phase 4: Multi-user chat (depends on multiple users)
- ✅ Translation service (exists)
- ✅ User preference for language (exists)

**Blocked By**: Phase 4 (Multi-user chat)

**Blocking**: None (final phase)

---

## Rollout Plan

**Week 1**:
- Database migration
- Translation service extension
- WebSocket updates

**Week 2**:
- Frontend toggle UI
- Testing and refinement
- Performance optimization

---

## Operational Costs

**LLM API Calls** (estimated monthly for 1,000 active users):

| Metric | Value |
|--------|-------|
| Messages per day | 10,000 |
| Translation requests | 100,000 |
| Cache hit rate | 90% |
| Actual API calls | 10,000 |
| Cost (Gemini 1.5 Flash) | ~$20/month |

**Infrastructure**:
- Database storage: ~1GB/month
- Redis (optional caching): ~$5/month

---

## Open Questions

1. **Language Detection**: How to detect source language reliably?
2. **Quality**: How to handle translation quality issues?
3. **Cost**: Should translation be a premium feature?
4. **Supported Languages**: Which languages to support initially?

---

## Future Enhancements

- **Profanity filtering in translations**: Detect and filter offensive content
- **Context-aware translation**: Use conversation context for better translation
- **Translation editing**: Allow users to suggest corrections
- **Translation analytics**: Track most common language pairs

---

## References

**Original Document**: `chat-improvements.md` (lines 1774-1945)
**Related Features**:
- Phase 4: Multi-user chat (dependency)
- Existing translation service

**Technical Docs**:
- Gemini API translation
- i18n best practices
- Translation caching strategies

---

**Last Updated**: 2026-01-21
**Status**: Ready for implementation
**Final Phase**: Complete chat improvements roadmap
