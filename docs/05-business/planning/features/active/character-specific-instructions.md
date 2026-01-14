# Feature: Character-Specific Instructions in Conversations

**Status**: Active - Ready for Development
**Created**: 2026-01-14
**Priority**: High
**Estimated Complexity**: Medium (M)

---

## 1. Overview

### 1.1 Objective
Complete the implementation of character-specific instructions feature that allows users to inject custom behavior instructions for a character within a specific conversation. Also fix the display of character details (Visual Style, Gender) in the participant configuration modal.

### 1.2 Current State

**What's Already Implemented:**
- Database field `configOverride` exists on `ConversationParticipant` (schema.prisma:822)
- Backend service to update `configOverride` exists (`conversationService.ts:569-601`)
- Frontend modal with textarea for instructions exists (`ParticipantConfigModal.tsx:331-340`)
- Backend injects `configOverride` into AI system prompt (`responseGenerationAgent.ts:209`)
- API endpoint `PATCH /api/v1/conversations/:id/participants/:participantId` exists

**What's NOT Working:**
1. **Visual Style shows "N/A"** - Data exists in DB but not loaded in participant query
2. **Gender shows "N/A"** - Same issue, data not propagated to frontend
3. **"Promote to Assistant" button** - Shows error message (intentionally not implemented)
4. **Missing helper text/examples** for instructions textarea

### 1.3 Desired State
- Click on character avatar in conversation opens modal
- Modal shows: Avatar, Name, Visual Style, Gender (correctly loaded)
- User can write custom instructions in textarea
- Instructions are saved to `configOverride`
- AI responses follow the custom instructions
- Clear helper text explains what instructions do
- "Promote to Assistant" button hidden or clearly marked as "coming soon"

---

## 2. Technical Analysis

### 2.1 Root Cause of N/A Display

**Issue Location**: `frontend/src/pages/(chat)/shared/components/ChatContainer.tsx`

The `buildParticipantRepresentation()` function only extracts `name` and `avatar`, not `style` or `gender`:

```typescript
// Current implementation (incomplete)
return {
  id: participant.id,
  actorId: participant.actingCharacterId,
  actorType: 'CHARACTER',
  representation: {
    name,
    avatar: character?.images?.[0]?.url || null,
    // MISSING: style, gender, physicalCharacteristics, etc.
  },
  raw: participant,
};
```

**Backend Query Issue**: `backend/src/services/conversationService.ts`

The participant query includes `gender` but may be missing `style`:

```typescript
// Lines 68-86 - actingCharacter select
actingCharacter: {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    gender: true,        // ✅ Included
    // style: true,      // ❌ MISSING - needs to be added
    contentTags: true,
    personality: true,
    images: { ... },
  },
},
```

### 2.2 AI System Prompt Integration

**Current Implementation** (`responseGenerationAgent.ts:209`):

```typescript
const systemPrompt = `You are roleplaying as the character: ${characterName}.

Character Details:
- Physical Characteristics: ${character.physicalCharacteristics || 'Not specified.'}
- Personality: ${character.personality || 'Not specified.'}
- Main Attire: Not specified.
- History: ${character.history || 'No history provided.'}
${allUsersContext}

Additional Instructions for this Conversation (Override):
${respondingParticipant.configOverride || ''}

Style Guide:
${styleGuidePrompt}
...
`;
```

**Analysis**: The `configOverride` IS being injected, but:
1. Position could be more prominent (currently after Character Details)
2. No visual emphasis to signal importance to the LLM
3. May be ignored if it conflicts with base personality

---

## 3. Technical Requirements

### 3.1 Backend Changes

#### 3.1.1 Update Participant Query to Include Style

**File**: `backend/src/services/conversationService.ts`

Find the `actingCharacter` and `representingCharacter` select clauses and add `style`:

```typescript
// For actingCharacter (around line 68-86)
actingCharacter: {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    gender: true,
    style: true,           // ADD THIS
    contentTags: true,
    personality: true,
    physicalCharacteristics: true,  // ADD if missing
    history: true,         // ADD if missing
    images: {
      where: {
        type: 'AVATAR',
        isActive: true,
      },
      select: {
        url: true,
      },
      take: 1,
    },
  },
},

// Same for representingCharacter (around line 95-113)
```

#### 3.1.2 Enhance AI System Prompt (Optional Enhancement)

**File**: `backend/src/agents/responseGenerationAgent.ts`

Improve placement and emphasis of `configOverride`:

```typescript
// Move override section to be more prominent and add visual markers
const overrideSection = respondingParticipant.configOverride
  ? `\n⚠️ CRITICAL OVERRIDE INSTRUCTIONS FOR THIS CONVERSATION ⚠️\nThe following instructions take PRECEDENCE over the base character personality.\nApply these modifications to your behavior for THIS CONVERSATION ONLY:\n\n${respondingParticipant.configOverride}\n\n`
  : '';

const systemPrompt = `You are roleplaying as the character: ${characterName}.

Character Details:
- Physical Characteristics: ${character.physicalCharacteristics || 'Not specified.'}
- Personality: ${character.personality || 'Not specified.'}
- History: ${character.history || 'No history provided.'}
${allUsersContext}
${overrideSection}
Style Guide:
${styleGuidePrompt}

Roleplay Guidelines:
1. Stay true to the defined personality and history for ${characterName}.
2. If override instructions above conflict with base personality, PRIORITIZE the override instructions.
...
`;
```

### 3.2 Frontend Changes

#### 3.2.1 Update Participant Representation Builder

**File**: `frontend/src/pages/(chat)/shared/components/ChatContainer.tsx`

Extend the representation object to include all needed fields:

```typescript
// In buildParticipantRepresentation function
if (participant.actingCharacterId) {
  const character = participant.actingCharacter;
  const name = character
    ? character.lastName
      ? `${character.firstName} ${character.lastName}`
      : character.firstName
    : `Character ${participant.actingCharacterId.slice(0, 4)}`;

  return {
    id: participant.id,
    actorId: participant.actingCharacterId,
    actorType: 'CHARACTER',
    representation: {
      id: character?.id || null,
      name,
      avatar: character?.images?.[0]?.url || null,
      style: character?.style || null,           // ADD
      gender: character?.gender || null,         // ADD
      physicalCharacteristics: character?.physicalCharacteristics || null,  // ADD
      personality: character?.personality || null,  // ADD
      history: character?.history || null,       // ADD
      gallery: character?.images?.map(img => img.url) || [],  // ADD if needed
    },
    raw: participant,
  };
}
```

#### 3.2.2 Update ProcessedParticipant Type

**File**: `frontend/src/pages/(chat)/shared/types.ts` (or wherever type is defined)

```typescript
interface ParticipantRepresentation {
  id?: string | null;
  name: string;
  avatar: string | null;
  style?: string | null;
  gender?: string | null;
  physicalCharacteristics?: string | null;
  personality?: string | null;
  history?: string | null;
  gallery?: string[];
}
```

#### 3.2.3 Enhance ParticipantConfigModal UI

**File**: `frontend/src/pages/(chat)/shared/components/ParticipantConfigModal.tsx`

**Add Helper Text and Character Counter:**

```tsx
{(isCharacterBot || isAssistant) && (
  <div className="space-y-2">
    <Textarea
      label={t("chatPage.specificInstructionsLabel")}
      placeholder={t("chatPage.specificInstructionsPlaceholder")}
      value={localConfigOverride}
      onChange={(e) => setLocalConfigOverride(e.target.value)}
      rows={4}
      disabled={saving}
      maxLength={2000}
    />
    <div className="flex justify-between items-center">
      <p className="text-xs text-muted">
        {t("chatPage.specificInstructionsHelp")}
      </p>
      <span className="text-xs text-muted">
        {localConfigOverride.length}/2000
      </span>
    </div>
    <details className="text-xs">
      <summary className="cursor-pointer text-primary hover:underline">
        {t("chatPage.specificInstructionsExamples")}
      </summary>
      <ul className="mt-2 space-y-1 text-muted pl-4 list-disc">
        <li>{t("chatPage.exampleInstruction1")}</li>
        <li>{t("chatPage.exampleInstruction2")}</li>
        <li>{t("chatPage.exampleInstruction3")}</li>
      </ul>
    </details>
  </div>
)}
```

**Handle "Promote to Assistant" button:**

```tsx
{isCharacterBot && (
  <Button
    variant="secondary"
    onClick={handlePromote}
    disabled={true}  // Always disabled for now
    icon="military_tech"
    className="w-full opacity-50"
    title={t("chatPage.promoteComingSoon")}
  >
    {t("chatPage.promoteToAssistantButton")}
    <span className="text-xs ml-2">({t("common.comingSoon")})</span>
  </Button>
)}
```

#### 3.2.4 Translation Keys

**File**: `backend/translations/_source/chat.json`

```json
{
  "chatPage": {
    "specificInstructionsLabel": "Specific Instructions for This Conversation",
    "specificInstructionsPlaceholder": "Add custom behavior instructions for this character in this conversation only...",
    "specificInstructionsHelp": "These instructions modify how the character behaves ONLY in this conversation. They don't affect the character's base definition.",
    "specificInstructionsExamples": "Example Instructions",
    "exampleInstruction1": "Be more playful and teasing in this conversation",
    "exampleInstruction2": "Act nervous because this is a first date scenario",
    "exampleInstruction3": "Speak formally as if in a royal court",
    "promoteComingSoon": "This feature is coming soon",
    "promoteToAssistantButton": "Promote to Assistant"
  }
}
```

**File**: `backend/translations/pt-br/chat.json`

```json
{
  "chatPage": {
    "specificInstructionsLabel": "Instruções Específicas para Esta Conversa",
    "specificInstructionsPlaceholder": "Adicione instruções de comportamento personalizadas para este personagem apenas nesta conversa...",
    "specificInstructionsHelp": "Estas instruções modificam como o personagem se comporta APENAS nesta conversa. Não afetam a definição base do personagem.",
    "specificInstructionsExamples": "Exemplos de Instruções",
    "exampleInstruction1": "Seja mais brincalhão e provocador nesta conversa",
    "exampleInstruction2": "Aja nervoso porque é um cenário de primeiro encontro",
    "exampleInstruction3": "Fale formalmente como se estivesse em uma corte real",
    "promoteComingSoon": "Esta funcionalidade está chegando em breve",
    "promoteToAssistantButton": "Promover para Assistente"
  }
}
```

---

## 4. Implementation Plan

### Phase 1: Backend - Fix Data Loading (1 hour)
1. Add `style` field to `actingCharacter` select in conversation queries
2. Add `style` field to `representingCharacter` select
3. Verify `gender` is included and propagated
4. Test API returns correct data

### Phase 2: Frontend - Fix Data Display (2 hours)
1. Update `buildParticipantRepresentation()` in ChatContainer.tsx
2. Update ProcessedParticipant type definition
3. Verify Visual Style and Gender display correctly (no more "N/A")
4. Test avatar click → modal → correct data shown

### Phase 3: UI Enhancements (2 hours)
1. Add character counter to instructions textarea
2. Add helper text explaining instructions purpose
3. Add collapsible examples section
4. Update "Promote to Assistant" button to show "coming soon"
5. Add all translation keys (en-US and pt-BR)

### Phase 4: AI Prompt Enhancement (1 hour) - OPTIONAL
1. Relocate `configOverride` in system prompt for better visibility
2. Add visual emphasis markers (⚠️)
3. Add precedence instructions
4. Test AI follows instructions correctly

### Phase 5: Testing (2 hours)
1. Unit tests for participant data loading
2. Integration test: Set instructions → AI response follows them
3. E2E test: Click avatar → Modify instructions → Save → Verify behavior
4. Test edge cases (empty instructions, very long instructions, special characters)

---

## 5. Acceptance Criteria

### Functional Requirements
- [ ] User can click character avatar in conversation to open modal
- [ ] Modal displays Visual Style correctly (not "N/A")
- [ ] Modal displays Gender correctly (not "N/A")
- [ ] User can enter custom instructions in textarea
- [ ] Character counter shows current/max characters
- [ ] Helper text explains what instructions do
- [ ] Example instructions are available (collapsible)
- [ ] Instructions are saved to `configOverride` field
- [ ] AI responses reflect the specific instructions
- [ ] Instructions only affect the specific conversation
- [ ] "Promote to Assistant" button shows "coming soon"

### Non-Functional Requirements
- [ ] Modal opens in < 200ms
- [ ] Save operation completes in < 1s
- [ ] No performance regression in AI response time
- [ ] UI is fully responsive (mobile, tablet, desktop)
- [ ] Fully internationalized (pt-BR and en-US)

---

## 6. Files to Modify

### Backend
- `backend/src/services/conversationService.ts` - Add `style` to participant queries
- `backend/src/agents/responseGenerationAgent.ts` - (Optional) Enhance prompt
- `backend/translations/_source/chat.json` - Add translation keys
- `backend/translations/pt-br/chat.json` - Add Portuguese translations

### Frontend
- `frontend/src/pages/(chat)/shared/components/ChatContainer.tsx` - Fix representation builder
- `frontend/src/pages/(chat)/shared/components/ParticipantConfigModal.tsx` - Enhance UI
- `frontend/src/pages/(chat)/shared/types.ts` - Update type definitions

---

## 7. Testing Strategy

### Unit Tests
```typescript
describe('Participant Data Loading', () => {
  it('should include style field in actingCharacter data', async () => {
    const conversation = await getConversation(conversationId, userId);
    const characterParticipant = conversation.participants.find(
      p => p.actingCharacterId
    );
    expect(characterParticipant.actingCharacter.style).toBeDefined();
  });
});
```

### Integration Tests
```typescript
describe('Character Instructions Integration', () => {
  it('should make character respond according to override instructions', async () => {
    // Set instructions
    await updateParticipant(conversationId, participantId, userId, {
      configOverride: 'You are extremely nervous and stutter frequently'
    });

    // Generate AI response
    const response = await generateAIResponse(conversationId, participantId);

    // Verify response reflects instructions
    expect(response.content).toMatch(/\.\.\.|s-|st-/i);
  });
});
```

---

## 8. Out of Scope (Future Features)

1. **Promote Character to Assistant** - Separate feature for future implementation
2. **Instruction Templates Library** - Pre-defined instruction templates
3. **Dynamic Instructions via Memory** - AI auto-adjusts based on conversation
4. **Multi-Character Instruction Presets** - Apply same instructions to multiple characters

---

## 9. Notes

- The backend infrastructure for `configOverride` is already complete
- Main work is fixing data propagation and enhancing UI
- AI prompt integration already exists but could be improved
- "Promote to Assistant" is intentionally marked as coming soon
