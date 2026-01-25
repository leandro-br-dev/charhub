# FEATURE-018: Real-Time Multi-User Chat Translation

**Status**: Backlog
**Priority**: Medium
**Assigned To**: TBD
**Created**: 2026-01-25
**Last Updated**: 2026-01-25
**Epic**: Chat Improvements - Phase 5 (Internationalization)

**GitHub Issue**: TBD
**Related Features**: Phase 4 (Multi-user chat dependency)
**Original Document**: `chat-improvements-phase5-i18n.md`

---

## Problem Statement

In multi-user conversations, users speak different languages, creating a barrier to effective collaboration. Users currently see messages in the sender's original language, requiring manual translation or excluding non-native speakers from participating.

### Current Pain Points

1. **Language Barrier**: Users cannot participate if they don't understand the sender's language
2. **Manual Translation**: Users must copy-paste into external translation tools
3. **Exclusion**: Multi-language groups cannot collaborate effectively
4. **No Translation History**: Translations are not cached, wasting API calls

### Target Users

- International user communities
- Multi-language roleplay groups
- Global collaboration teams
- Users with limited language proficiency

### Value Proposition

- **Inclusive Communication**: All users participate in their preferred language
- **Real-Time Translation**: Messages appear instantly translated
- **Cost Efficient**: Translations cached forever, reused across users
- **Transparent UX**: Clear indication of translated vs original content

---

## User Stories

### US-1: Automatic Message Translation
**As a** user in a multi-user conversation,
**I want** messages to appear in my preferred language automatically,
**So that** I can understand all participants without manual translation.

**Acceptance Criteria**:
- [ ] Messages display in user's preferred language by default
- [ ] Translation happens automatically when message is received
- [ ] Translation badge indicates message is translated
- [ ] Toggle button to view original message
- [ ] If same language as original, no translation occurs

### US-2: Translation Caching
**As a** system administrator,
**I want** translations to be cached indefinitely,
**So that** API costs are minimized and performance is optimized.

**Acceptance Criteria**:
- [ ] Each message translation stored in database with message + language key
- [ ] Cached translations reused for all users needing that language
- [ ] Cache hit rate > 90% for repeated translations
- [ ] No expiration on translation cache

### US-3: Toggle Original/Translated
**As a** user reading a translated message,
**I want** to easily switch between original and translated text,
**So that** I can verify accuracy or learn the original language.

**Acceptance Criteria**:
- [ ] "View original" button on translated messages
- [ ] "Show translated" button when viewing original
- [ ] Toggle state persists during session
- [ ] Translation badge hidden when viewing original

### US-4: Pre-Generation for Efficiency
**As a** system optimizing performance,
**I want** translations to be pre-generated for all conversation members,
**So that** messages appear instantly for everyone.

**Acceptance Criteria**:
- [ ] When message sent, translations generated for all member languages
- [ ] Translations sent via WebSocket with original message
- [ ] Async processing doesn't block message delivery
- [ ] Fallback to on-demand translation if pre-generation fails

---

## Technical Approach

### Architecture Overview

```
User A (pt-BR) sends message "Olá, tudo bem?"
        ↓
WebSocket receives message
        ↓
Save to database (original language detected)
        ↓
Get conversation members: [pt-BR, en-US, es-ES]
        ↓
Pre-generate translations (async):
  ├─ en-US: "Hello, how are you?"
  ├─ es-ES: "¿Hola, cómo estás?"
  └─ pt-BR: skip (same as original)
        ↓
Broadcast via WebSocket:
  {
    message: { id, content: "Olá, tudo bem?" },
    translations: {
      "en-US": "Hello, how are you?",
      "es-ES": "¿Hola, cómo estás?"
    }
  }
        ↓
Each client displays in their preferred language
```

### Database Schema Changes

**File**: `backend/prisma/schema.prisma`

#### New Model: MessageTranslation

```prisma
model MessageTranslation {
  id              String   @id @default(uuid())
  messageId       String
  message         Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)

  targetLanguage  String   // ISO 639-1 code (e.g., 'pt-BR', 'en-US')
  translatedText  String   @db.Text

  provider        String   @default("gemini") // 'gemini' | 'deepl'
  createdAt       DateTime @default(now())

  @@unique([messageId, targetLanguage])
  @@index([messageId])
  @@index([targetLanguage])
  @@map("MessageTranslation")
}

// Update Message model
model Message {
  // ... existing fields ...

  translations    MessageTranslation[]

  // ... rest of model ...
}
```

#### Migration File

**File**: `backend/prisma/migrations/20260125120000_add_message_translations/migration.sql`

```sql
-- Create MessageTranslation table
CREATE TABLE "MessageTranslation" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "translatedText" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'gemini',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageTranslation_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint
CREATE UNIQUE INDEX "MessageTranslation_messageId_targetLanguage_key"
ON "MessageTranslation"("messageId", "targetLanguage");

-- Create indexes
CREATE INDEX "MessageTranslation_messageId_idx" ON "MessageTranslation"("messageId");
CREATE INDEX "MessageTranslation_targetLanguage_idx" ON "MessageTranslation"("targetLanguage");

-- Add foreign key
ALTER TABLE "MessageTranslation" ADD CONSTRAINT "MessageTranslation_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

### Backend Implementation

#### 1. Translation Service Extension

**File**: `backend/src/services/translationService.ts`

```typescript
/**
 * Translate a single message to target language with caching
 */
async translateMessage(
  messageId: string,
  targetLanguage: string
): Promise<string> {
  // Check cache first
  const cached = await prisma.messageTranslation.findUnique({
    where: {
      messageId_targetLanguage: { messageId, targetLanguage }
    }
  });

  if (cached) {
    logger.debug({ messageId, targetLanguage }, 'Translation cache hit');
    return cached.translatedText;
  }

  // Fetch original message
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, content: true, senderId: true }
  });

  if (!message) {
    throw new Error(`Message not found: ${messageId}`);
  }

  // Detect source language
  const sourceLanguage = await this.detectLanguage(message.content);

  // Skip if same language
  if (sourceLanguage === targetLanguage) {
    return message.content;
  }

  // Translate via LLM
  const translated = await this.translateText(
    message.content,
    targetLanguage,
    sourceLanguage
  );

  // Cache translation
  await prisma.messageTranslation.create({
    data: {
      messageId,
      targetLanguage,
      translatedText: translated,
      provider: 'gemini'
    }
  });

  logger.info({ messageId, sourceLanguage, targetLanguage }, 'Translation cached');

  return translated;
}

/**
 * Batch translate message for multiple languages
 */
async translateMessageBatch(
  messageId: string,
  targetLanguages: string[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  // Check which translations already exist
  const existing = await prisma.messageTranslation.findMany({
    where: {
      messageId,
      targetLanguage: { in: targetLanguages }
    }
  });

  const cachedLanguages = new Set(existing.map(t => t.targetLanguage));
  existing.forEach(t => results.set(t.targetLanguage, t.translatedText));

  // Translate missing languages
  const missingLanguages = targetLanguages.filter(lang => !cachedLanguages.has(lang));

  if (missingLanguages.length > 0) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { content: true }
    });

    if (!message) {
      throw new Error(`Message not found: ${messageId}`);
    }

    for (const lang of missingLanguages) {
      try {
        const translated = await this.translateText(message.content, lang);
        results.set(lang, translated);

        // Cache result
        await prisma.messageTranslation.create({
          data: {
            messageId,
            targetLanguage: lang,
            translatedText: translated,
            provider: 'gemini'
          }
        });
      } catch (error) {
        logger.error({ messageId, lang, error }, 'Translation failed');
        // Don't fail entire batch if one translation fails
      }
    }
  }

  return results;
}
```

#### 2. WebSocket Handler Updates

**File**: `backend/src/websocket/chatHandler.ts`

```typescript
socket.on('send_message', async (payload: SendMessagePayload) => {
  const { conversationId, content, attachments } = payload;
  const userId = socket.data.userId;

  try {
    // Save message
    const message = await messageService.createMessage({
      conversationId,
      senderId: userId,
      content,
      attachments
    });

    // Get all conversation members with their preferred languages
    const members = await conversationService.getConversationMembers(conversationId);
    const uniqueLanguages = [
      ...new Set(
        members
          .map(m => m.user.preferredLanguage)
          .filter(lang => lang !== null) as string[]
      )
    ];

    // Pre-generate translations (async, don't block)
    const translationsPromise = translationService.translateMessageBatch(
      message.id,
      uniqueLanguages
    );

    // Send original message immediately
    io.to(`conversation:${conversationId}`).emit('message_received', {
      message: serializeMessage(message),
      translations: {} // Will be updated when ready
    });

    // Then send translations when ready
    translationsPromise.then(translations => {
      const translationsMap: Record<string, string> = {};
      translations.forEach((value, key) => {
        translationsMap[key] = value;
      });

      io.to(`conversation:${conversationId}`).emit('message_translations', {
        messageId: message.id,
        translations: translationsMap
      });
    }).catch(error => {
      logger.error({ messageId: message.id, error }, 'Translation batch failed');
    });

  } catch (error) {
    socket.emit('error', { message: 'Failed to send message' });
  }
});
```

#### 3. API Endpoint for On-Demand Translation

**File**: `backend/src/routes/v1/messages.ts`

```typescript
/**
 * GET /api/v1/messages/:id/translations
 * Get all available translations for a message
 */
router.get('/messages/:id/translations',
  authenticateToken,
  async (req, res) => {
    const messageId = req.params.id;
    const userId = req.user!.id;

    try {
      // Verify user has access to this message
      const message = await messageService.getUserMessage(messageId, userId);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      const translations = await prisma.messageTranslation.findMany({
        where: { messageId },
        select: {
          targetLanguage: true,
          translatedText: true,
          provider: true
        }
      });

      res.json({
        success: true,
        data: translations
      });
    } catch (error) {
      logger.error({ error, messageId }, 'Failed to fetch translations');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/v1/messages/:id/translate
 * Request translation for a specific language
 */
router.post('/messages/:id/translate',
  authenticateToken,
  validateBody(z.object({
    targetLanguage: z.string()
  })),
  async (req, res) => {
    const messageId = req.params.id;
    const { targetLanguage } = req.body;

    try {
      const translated = await translationService.translateMessage(
        messageId,
        targetLanguage
      );

      res.json({
        success: true,
        data: {
          messageId,
          targetLanguage,
          translatedText: translated
        }
      });
    } catch (error) {
      logger.error({ error, messageId, targetLanguage }, 'Translation failed');
      res.status(500).json({ error: 'Translation failed' });
    }
  }
);
```

### Frontend Implementation

#### 1. Message Bubble Component

**File**: `frontend/src/pages/(chat)/shared/components/MessageBubble.tsx`

```typescript
import { useState, useEffect } from 'react';
import { useUserLanguage } from '@/hooks/useUserLanguage';
import { useTranslation } from 'next-i18next';

interface MessageBubbleProps {
  message: {
    id: string;
    content: string;
    senderId: string;
    sender: { username: string };
  };
  translations?: Record<string, string>;
  isOwnMessage: boolean;
}

export function MessageBubble({
  message,
  translations = {},
  isOwnMessage
}: MessageBubbleProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const userLanguage = useUserLanguage(); // e.g., 'pt-BR'
  const { t } = useTranslation('chat');

  const translatedText = translations[userLanguage];
  const hasTranslation = !!translatedText;
  const displayText = (hasTranslation && !showOriginal)
    ? translatedText
    : message.content;

  return (
    <div className={cn(
      "flex gap-3 mb-4",
      isOwnMessage ? "flex-row-reverse" : "flex-row"
    )}>
      {/* Avatar */}
      <UserAvatar userId={message.senderId} size="sm" />

      {/* Message content */}
      <div className={cn(
        "max-w-[70%] rounded-2xl px-4 py-2",
        isOwnMessage
          ? "bg-primary text-primary-foreground"
          : "bg-muted"
      )}>
        {/* Sender name for group chats */}
        <div className="text-xs font-semibold mb-1 opacity-70">
          {message.sender.username}
        </div>

        {/* Message text */}
        <p className="whitespace-pre-wrap break-words">
          {displayText}
        </p>

        {/* Translation toggle */}
        {hasTranslation && (
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            className="mt-1 text-xs opacity-70 hover:opacity-100 flex items-center gap-1 transition-opacity"
          >
            <span className="material-symbols-outlined text-[14px]">
              translate
            </span>
            {showOriginal
              ? t('showTranslated')
              : t('showOriginal')
            }
          </button>
        )}

        {/* Timestamp */}
        <div className="text-[10px] opacity-50 mt-1">
          {formatTimestamp(message.createdAt)}
        </div>
      </div>
    </div>
  );
}
```

#### 2. WebSocket Translation Handler

**File**: `frontend/src/websocket/chatSocket.ts`

```typescript
interface MessageTranslationsPayload {
  messageId: string;
  translations: Record<string, string>;
}

interface MessageReceivedPayload {
  message: SerializedMessage;
  translations: Record<string, string>;
}

export function useChatSocket(conversationId: string) {
  const [messages, setMessages] = useState<Map<string, ChatMessage>>(new Map());
  const [translations, setTranslations] = useState<Map<string, Record<string, string>>>(new Map());

  useEffect(() => {
    const socket = io('/chat');

    socket.on('message_received', (payload: MessageReceivedPayload) => {
      const { message, translations: msgTranslations } = payload;

      setMessages(prev => new Map(prev).set(message.id, message));

      if (Object.keys(msgTranslations).length > 0) {
        setTranslations(prev => new Map(prev).set(message.id, msgTranslations));
      }
    });

    socket.on('message_translations', (payload: MessageTranslationsPayload) => {
      const { messageId, translations: msgTranslations } = payload;

      setTranslations(prev => {
        const updated = new Map(prev);
        updated.set(messageId, {
          ...updated.get(messageId),
          ...msgTranslations
        });
        return updated;
      });
    });

    return () => socket.disconnect();
  }, [conversationId]);

  return { messages, translations };
}
```

#### 3. i18n Keys

**File**: `frontend/src/locales/pt-BR/chat.json`

```json
{
  "translated": "Traduzido",
  "showTranslated": "Ver tradução",
  "showOriginal": "Ver original",
  "translationFailed": "Tradução falhou"
}
```

**File**: `frontend/src/locales/en-US/chat.json`

```json
{
  "translated": "Translated",
  "showTranslated": "Show translated",
  "showOriginal": "Show original",
  "translationFailed": "Translation failed"
}
```

---

## Database Changes

See Database Schema Changes section above.

**Migration Command**:
```bash
cd backend
npx prisma migrate dev --name add_message_translations
```

---

## Testing Requirements

### Unit Tests

- [ ] `translateMessage()` returns cached translation on second call
- [ ] `translateMessage()` skips translation if same language
- [ ] `translateMessageBatch()` handles partial cache hits
- [ ] `translateMessageBatch()` continues if one translation fails
- [ ] Translation persistence in database

### Integration Tests

- [ ] WebSocket emits `message_received` with original message
- [ ] WebSocket emits `message_translations` when ready
- [ ] GET `/messages/:id/translations` returns all cached translations
- [ ] POST `/messages/:id/translate` creates and returns new translation

### E2E Tests

- [ ] Message in PT-BR appears translated for EN-US user
- [ ] Translation cache works (2nd request instant)
- [ ] Toggle original/translated switches text correctly
- [ ] Translation badge appears on translated messages
- [ ] Same language message has no translation badge
- [ ] Multi-user conversation shows correct translations per user

---

## Success Criteria

### Core Functionality

- [ ] Messages auto-translate to user's preferred language
- [ ] Translations are cached and reused
- [ ] Toggle original/translated works smoothly
- [ ] Pre-generation happens via WebSocket
- [ ] Fallback to on-demand translation if needed

### Performance Metrics

| Metric | Target |
|--------|--------|
| First translation (API call) | <500ms |
| Cached translation retrieval | <50ms |
| Pre-generation for 3 languages | <1s |
| Translation cache hit rate | >90% |

### Quality

- [ ] All tests passing
- [ ] No regressions in existing chat functionality
- [ ] Translation quality acceptable (user feedback)

---

## Dependencies

### Internal

| Feature | Status | Description |
|---------|--------|-------------|
| Phase 4: Multi-user chat | ✅ Required | Multiple users in conversation |
| Translation service | ✅ Exists | `translateText()` method |
| User language preference | ✅ Exists | `user.preferredLanguage` |
| WebSocket infrastructure | ✅ Exists | Chat handler |

### External

- Gemini API (or alternative) for translation
- Database storage for translation cache

---

## Risks & Mitigations

### Risk 1: Translation Quality
**Impact**: Medium
**Description**: AI translations may have errors or cultural nuances lost
**Mitigation**:
- Allow users to view original easily
- Add feedback mechanism for poor translations
- Consider premium human translation option

### Risk 2: API Costs
**Impact**: Medium
**Description**: High volume of messages could increase LLM costs
**Mitigation**:
- Aggressive caching (translations never expire)
- Use cheaper models (Gemini 1.5 Flash)
- Batch translation requests
- Monitor usage and set limits if needed

### Risk 3: Pre-Generation Delays
**Impact**: Low
**Description**: Pre-generating translations might slow message delivery
**Mitigation**:
- Async processing - don't block message send
- Send original immediately, translations follow
- Client-side fallback translation if needed

### Risk 4: Language Detection Accuracy
**Impact**: Low
**Description**: Source language may be detected incorrectly
**Mitigation**:
- Use sender's language preference as hint
- Allow manual language override
- Log detection accuracy for monitoring

---

## Implementation Phases

### Phase 1: Database & Backend Core (3 days)
1. Create `MessageTranslation` model
2. Run migration
3. Implement `translateMessage()` with caching
4. Implement `translateMessageBatch()`
5. Add API endpoints for translation
6. Unit tests for translation service

### Phase 2: WebSocket Integration (2 days)
1. Update chat handler to pre-generate translations
2. Emit `message_translations` event
3. Test multi-language message flow
4. Integration tests for WebSocket

### Phase 3: Frontend UI (3 days)
1. Update MessageBubble component
2. Add translation toggle functionality
3. Implement WebSocket translation handler
4. Add i18n keys
5. E2E tests for translation UI

### Phase 4: Testing & Polish (2 days)
1. Performance testing (cache hit rates)
2. Load testing with multiple users
3. Translation quality assessment
4. Bug fixes and refinement

**Total Estimated Time**: ~10 business days

---

## Operational Costs

**Estimated Monthly Costs** (1,000 active users, 10,000 messages/day):

| Metric | Value |
|--------|-------|
| Messages per day | 10,000 |
| Unique translations needed | 1,000 (90% cache hit) |
| API calls per day | 1,000 |
| Gemini 1.5 Flash cost | ~$0.002 per 1K chars |
| Estimated monthly cost | ~$20-30 |

**Infrastructure**:
- Database storage: ~1GB/month (translations)
- Optional Redis cache: ~$5/month

---

## Notes

- This is the final phase of chat improvements
- Translations should be cached forever - no expiration
- Consider adding translation analytics in future iteration
- Supported languages initially: pt-BR, en-US, es-ES
- Future: Add more languages based on user demand

---

## References

- Original document: `chat-improvements-phase5-i18n.md`
- Related features:
  - Phase 4: Multi-user chat (dependency)
- Technical docs:
  - Gemini API translation
  - WebSocket best practices
  - i18n implementation patterns

---

**End of FEATURE-018 Specification**
