# Feature: User Persona and Instructions in Conversations

**Status**: Active - Ready for Development
**Created**: 2026-01-14
**Priority**: High
**Estimated Complexity**: Large (L)

---

## 1. Overview

### 1.1 Objective
Allow users to customize their identity and behavior within a specific conversation by:
1. Adding custom instructions about themselves
2. Adjusting their gender for that conversation context
3. Assuming a persona from an existing character (public or their own)

When assuming a persona, other characters in the conversation will address the user by that persona's name and interact based on those persona characteristics.

### 1.2 Current State

**What Exists:**
- User avatar click handler in conversations opens `ParticipantConfigModal`
- `ConversationParticipant` model has `representingCharacterId` field (schema.prisma:819)
- `ConversationParticipant` model has `configOverride` field (schema.prisma:822)
- Backend service `updateParticipant` handles `representingCharacterId` updates (conversationService.ts:603-606)
- Frontend has `ComboboxSelect` for persona selection (ParticipantConfigModal.tsx:343-362)
- Placeholder character service exists for fetching personas (ParticipantConfigModal.tsx:14-22)

**What's NOT Implemented:**
1. User-specific `configOverride` not being used for user instructions
2. Per-conversation gender override not implemented
3. Persona selection doesn't affect AI context (character personas not used in prompts)
4. Character fetching for persona selection uses placeholder data
5. AI doesn't recognize when user has assumed a persona

### 1.3 Desired State
- User clicks their avatar in conversation → Modal opens
- Modal shows: Avatar, Name, User Instructions textarea, Gender selector, Persona selector
- User instructions are saved and affect how characters interact with them
- Gender override for this conversation (doesn't change profile)
- Persona selection from user's own characters OR public characters
- When persona is selected, AI characters use that persona's name and characteristics
- All changes are conversation-specific (don't affect other conversations)

---

## 2. Technical Requirements

### 2.1 Data Model

#### 2.1.1 Existing Fields (ConversationParticipant)

```prisma
model ConversationParticipant {
  id                        String        @id @default(uuid())
  conversationId            String
  userId                    String?       // For USER participants
  actingCharacterId         String?       // For CHARACTER participants
  actingAssistantId         String?       // For ASSISTANT participants
  representingCharacterId   String?       // Persona the participant assumes
  configOverride            String?       @db.Text // Instructions override
  // ...
}
```

#### 2.1.2 New Field: Gender Override

**Option A - Add to configOverride as JSON** (Recommended - no migration):
```typescript
interface UserConfigOverride {
  instructions?: string;
  genderOverride?: 'male' | 'female' | 'non-binary' | 'other' | null;
}

// Stored as JSON string in configOverride field
const configOverride = JSON.stringify({
  instructions: "I am playing as a mysterious traveler",
  genderOverride: "male"
});
```

**Option B - Add explicit field** (Requires migration):
```prisma
model ConversationParticipant {
  // ... existing fields
  genderOverride String? // Per-conversation gender override
}
```

**Recommendation**: Use Option A to avoid migration and keep flexibility.

### 2.2 Backend Changes

#### 2.2.1 Update User Context in AI Prompts

**File**: `backend/src/agents/responseGenerationAgent.ts`

Modify `formatUserContext` to include persona information:

```typescript
private formatUserContextWithPersona(
  user: User,
  userParticipant: ConversationParticipant,
  personaCharacter?: Character | null
): string {
  const contextParts: string[] = [];

  // If user has assumed a persona, use that identity
  if (personaCharacter) {
    contextParts.push(`⚠️ USER IS ROLEPLAYING AS: ${personaCharacter.firstName}${personaCharacter.lastName ? ' ' + personaCharacter.lastName : ''}`);
    contextParts.push(`- Persona Name: ${personaCharacter.firstName}${personaCharacter.lastName ? ' ' + personaCharacter.lastName : ''}`);

    if (personaCharacter.physicalCharacteristics) {
      contextParts.push(`- Persona Appearance: ${personaCharacter.physicalCharacteristics}`);
    }
    if (personaCharacter.personality) {
      contextParts.push(`- Persona Personality: ${personaCharacter.personality}`);
    }
    if (personaCharacter.gender) {
      contextParts.push(`- Persona Gender: ${personaCharacter.gender}`);
    }

    contextParts.push(`\n⚠️ IMPORTANT: Address this user as "${personaCharacter.firstName}" and treat them according to the persona characteristics above.`);
  } else {
    // Standard user info
    if (user.displayName) {
      contextParts.push(`- Name: ${user.displayName}`);
    }
  }

  // Parse configOverride for user-specific settings
  const config = parseUserConfig(userParticipant.configOverride);

  // Gender: use override if set, otherwise user's default
  const gender = config?.genderOverride || user.gender;
  if (gender) {
    contextParts.push(`- Gender: ${gender}`);
  }

  // User instructions for this conversation
  if (config?.instructions) {
    contextParts.push(`\n📝 Additional User Instructions:\n${config.instructions}`);
  }

  // Birth date and age (if not using persona)
  if (!personaCharacter && user.birthDate) {
    const birthDate = new Date(user.birthDate);
    const age = calculateAge(birthDate);
    contextParts.push(`- Age: ${age} years old`);
  }

  // Preferred language
  if (user.preferredLanguage) {
    const languageName = getLanguageName(user.preferredLanguage);
    contextParts.push(`- Preferred Language: ${languageName}`);
  }

  if (contextParts.length === 0) {
    return '- No additional information available about the user';
  }

  return contextParts.join('\n');
}

// Helper to parse user config
function parseUserConfig(configOverride?: string | null): UserConfigOverride | null {
  if (!configOverride) return null;
  try {
    return JSON.parse(configOverride);
  } catch {
    // If not JSON, treat as plain instructions string
    return { instructions: configOverride };
  }
}
```

#### 2.2.2 Load Persona Character in Response Generation

**File**: `backend/src/agents/responseGenerationAgent.ts`

Update `execute` method to load persona data:

```typescript
async execute(
  conversation: Conversation & { participants: any[]; messages: Message[] },
  user: User,
  lastMessage: Message,
  participantId?: string,
  preferredLanguageOverride?: string,
  allUsers?: Map<string, User>
): Promise<string> {
  // ... existing code ...

  // Find user's participant entry
  const userParticipant = conversation.participants.find(
    p => p.userId === user.id
  );

  // Load persona character if user has one
  let personaCharacter = null;
  if (userParticipant?.representingCharacterId) {
    personaCharacter = await prisma.character.findUnique({
      where: { id: userParticipant.representingCharacterId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        gender: true,
        physicalCharacteristics: true,
        personality: true,
      }
    });
  }

  // Use new context builder with persona
  const userContext = this.formatUserContextWithPersona(user, userParticipant, personaCharacter);

  // ... rest of existing code ...
}
```

#### 2.2.3 Character Fetching API

**File**: `backend/src/services/characterService.ts`

Add method to fetch characters available for persona selection:

```typescript
/**
 * Get characters available for user to assume as persona
 * Returns: User's own characters + Public characters
 */
async getAvailablePersonas(
  userId: string,
  options: { page?: number; limit?: number; search?: string }
): Promise<Character[]> {
  const { page = 1, limit = 20, search } = options;
  const skip = (page - 1) * limit;

  const where: Prisma.CharacterWhereInput = {
    deletedAt: null,
    OR: [
      { creatorId: userId },  // User's own characters
      { visibility: 'PUBLIC' }  // Public characters
    ],
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } }
      ]
    })
  };

  const characters = await prisma.character.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      gender: true,
      images: {
        where: { type: 'AVATAR', isActive: true },
        select: { url: true },
        take: 1,
      },
    },
    orderBy: [
      { creatorId: userId ? 'desc' : 'asc' },  // Own characters first
      { firstName: 'asc' }
    ],
    skip,
    take: limit,
  });

  return characters;
}
```

**File**: `backend/src/routes/v1/characters.ts`

Add endpoint:

```typescript
/**
 * GET /api/v1/characters/personas
 * Get characters available for persona selection
 */
router.get('/personas', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { page, limit, search } = req.query;

  const characters = await characterService.getAvailablePersonas(userId, {
    page: parseInt(page as string) || 1,
    limit: parseInt(limit as string) || 20,
    search: search as string | undefined,
  });

  res.json({ success: true, data: characters });
});
```

### 2.3 Frontend Changes

#### 2.3.1 Update ParticipantConfigModal for Users

**File**: `frontend/src/pages/(chat)/shared/components/ParticipantConfigModal.tsx`

Add user-specific sections:

```tsx
const renderUserContent = () => {
  const isUser = participant.actorType === "USER";
  if (!isUser) return null;

  return (
    <div className="space-y-4">
      {/* User Instructions */}
      <Textarea
        label={t("chatPage.userInstructionsLabel")}
        placeholder={t("chatPage.userInstructionsPlaceholder")}
        value={localConfigOverride}
        onChange={(e) => setLocalConfigOverride(e.target.value)}
        rows={3}
        disabled={saving}
        maxLength={1000}
      />
      <p className="text-xs text-muted">
        {t("chatPage.userInstructionsHelp")}
      </p>

      {/* Gender Override for this Conversation */}
      <div>
        <label className="block text-sm font-medium text-content mb-2">
          {t("chatPage.genderOverrideLabel")}
        </label>
        <select
          value={genderOverride}
          onChange={(e) => setGenderOverride(e.target.value)}
          className="w-full bg-light border border-dark rounded-lg px-3 py-2 text-content"
          disabled={saving}
        >
          <option value="">{t("chatPage.genderUseDefault")}</option>
          <option value="male">{t("dashboard:filters.genders.male")}</option>
          <option value="female">{t("dashboard:filters.genders.female")}</option>
          <option value="non-binary">{t("dashboard:filters.genders.nonBinary")}</option>
          <option value="other">{t("dashboard:filters.genders.other")}</option>
        </select>
        <p className="text-xs text-muted mt-1">
          {t("chatPage.genderOverrideHelp")}
        </p>
      </div>

      {/* Assume Persona */}
      <div>
        <ComboboxSelect
          label={t("chatPage.assumePersonaLabel")}
          options={personaOptionsWithDefault}
          value={selectedPersonaId}
          onChange={setSelectedPersonaId}
          placeholder={t("chatPage.selectCharacterPlaceholder")}
          valueKey="value"
          labelKey="label"
          disabled={saving || loadingPersonas}
          searchable
          onSearch={handlePersonaSearch}
        />
        <p className="text-xs text-muted mt-1">
          {t("chatPage.assumePersonaHelp")}
        </p>
        {loadingPersonas && (
          <p className="text-xs text-primary mt-1">
            {t("chatPage.loadingPersonas")}
          </p>
        )}
      </div>
    </div>
  );
};
```

#### 2.3.2 Replace Placeholder Character Service

**File**: `frontend/src/pages/(chat)/shared/components/ParticipantConfigModal.tsx`

Replace placeholder with real API call:

```typescript
// Remove placeholder
// const characterService = { ... };

// Import real service
import { characterApi } from '../../../../services/characterApi';

// Update fetchAvailablePersonas
const fetchAvailablePersonas = useCallback(async (search?: string) => {
  if (!userId) return;
  setLoadingPersonas(true);
  try {
    const response = await characterApi.getAvailablePersonas({
      page: 1,
      limit: 20,
      search,
    });

    if (response.success && response.data) {
      const formatted = response.data.map((char: any) => ({
        value: char.id,
        label: char.lastName
          ? `${char.firstName} ${char.lastName}`
          : char.firstName,
        avatar: char.images?.[0]?.url || null,
      }));
      setAvailablePersonas(formatted);
    }
  } catch (error) {
    console.error('Failed to fetch personas:', error);
  } finally {
    setLoadingPersonas(false);
  }
}, [userId]);

// Add search handler for persona dropdown
const handlePersonaSearch = useCallback((searchTerm: string) => {
  fetchAvailablePersonas(searchTerm);
}, [fetchAvailablePersonas]);
```

#### 2.3.3 Handle Save with User Config

```typescript
const handleSave = async () => {
  if (!participant) return;
  setSaving(true);
  setError(null);

  try {
    // Build config based on participant type
    let configData: any = {};

    if (participant.actorType === 'USER') {
      // For users: combine instructions + gender override into JSON
      const userConfig: UserConfigOverride = {};

      if (localConfigOverride.trim()) {
        userConfig.instructions = localConfigOverride.trim();
      }

      if (genderOverride) {
        userConfig.genderOverride = genderOverride;
      }

      configData.configOverride = Object.keys(userConfig).length > 0
        ? JSON.stringify(userConfig)
        : null;

      configData.representingCharacterId = selectedPersonaId || null;
    } else {
      // For characters/assistants: plain string instructions
      configData.configOverride = localConfigOverride.trim() || null;
      configData.representingCharacterId = selectedPersonaId || null;
    }

    await onSaveConfiguration(participant.id, configData);
    onClose();
  } catch (err: any) {
    setError(err.message || t("chatPage.saveError"));
  } finally {
    setSaving(false);
  }
};
```

#### 2.3.4 Translation Keys

**File**: `backend/translations/_source/chat.json`

```json
{
  "chatPage": {
    "userInstructionsLabel": "Instructions About Yourself",
    "userInstructionsPlaceholder": "Tell characters about yourself for this conversation...",
    "userInstructionsHelp": "Add details about yourself that characters should know in this conversation. Example: 'I am playing as a medieval knight' or 'I prefer formal language'.",

    "genderOverrideLabel": "Gender for This Conversation",
    "genderUseDefault": "Use my profile default",
    "genderOverrideHelp": "Override your gender for this conversation only. This doesn't change your profile.",

    "assumePersonaLabel": "Assume Character Persona",
    "assumePersonaHelp": "Select a character to roleplay as. Other characters will address you by this persona's name and traits.",
    "selectCharacterPlaceholder": "Search characters...",
    "loadingPersonas": "Loading characters...",
    "noPersonaFound": "No characters found",

    "configureUserRoleplayTitle": "Configure Your Roleplay Settings"
  }
}
```

**File**: `backend/translations/pt-br/chat.json`

```json
{
  "chatPage": {
    "userInstructionsLabel": "Instruções Sobre Você",
    "userInstructionsPlaceholder": "Conte aos personagens sobre você nesta conversa...",
    "userInstructionsHelp": "Adicione detalhes sobre você que os personagens devem saber nesta conversa. Exemplo: 'Estou interpretando um cavaleiro medieval' ou 'Prefiro linguagem formal'.",

    "genderOverrideLabel": "Gênero para Esta Conversa",
    "genderUseDefault": "Usar padrão do meu perfil",
    "genderOverrideHelp": "Substitua seu gênero apenas para esta conversa. Isso não altera seu perfil.",

    "assumePersonaLabel": "Assumir Persona de Personagem",
    "assumePersonaHelp": "Selecione um personagem para interpretar. Outros personagens irão chamá-lo pelo nome e características desta persona.",
    "selectCharacterPlaceholder": "Buscar personagens...",
    "loadingPersonas": "Carregando personagens...",
    "noPersonaFound": "Nenhum personagem encontrado",

    "configureUserRoleplayTitle": "Configure Suas Opções de Roleplay"
  }
}
```

---

## 3. Implementation Plan

### Phase 1: Backend - Persona Loading in AI Context (3 hours)
1. Create `formatUserContextWithPersona` method
2. Load persona character data when generating responses
3. Update system prompt to include persona information
4. Test AI addresses user by persona name

### Phase 2: Backend - Character API for Personas (2 hours)
1. Add `getAvailablePersonas` to characterService
2. Create `/api/v1/characters/personas` endpoint
3. Test returns user's characters + public characters
4. Add search functionality

### Phase 3: Frontend - User Modal Enhancements (3 hours)
1. Replace placeholder characterService with real API
2. Add user instructions textarea
3. Add gender override selector
4. Implement persona search/selection
5. Handle save with JSON config for users

### Phase 4: Frontend - UI Polish (2 hours)
1. Add all translation keys (en-US and pt-BR)
2. Add helper text for each field
3. Add loading states
4. Handle empty/error states
5. Mobile responsive testing

### Phase 5: Integration Testing (2 hours)
1. Test: Set persona → AI uses persona name
2. Test: Set gender override → AI uses override
3. Test: Set user instructions → AI follows instructions
4. Test: Multiple conversations maintain separate settings
5. Test: Persona search returns correct characters

---

## 4. Acceptance Criteria

### Functional Requirements
- [ ] User can click their avatar to open configuration modal
- [ ] User can add custom instructions about themselves
- [ ] User can override their gender for this conversation
- [ ] User can search and select a persona character
- [ ] Persona selection includes user's own characters
- [ ] Persona selection includes public characters
- [ ] User's own characters appear first in list
- [ ] When persona selected, AI characters address user by persona name
- [ ] AI characters treat user according to persona characteristics
- [ ] Settings are saved per-conversation (not global)
- [ ] Different conversations can have different settings

### AI Behavior
- [ ] When user has persona, AI calls them by persona name
- [ ] AI acknowledges persona characteristics in interactions
- [ ] User instructions affect AI behavior appropriately
- [ ] Gender override is used in AI context

### UI/UX
- [ ] Clear labels explain each option
- [ ] Helper text provides examples
- [ ] Loading states during persona search
- [ ] Error handling with user-friendly messages
- [ ] Mobile responsive
- [ ] Fully internationalized (pt-BR and en-US)

---

## 5. Files to Modify/Create

### Backend
- `backend/src/agents/responseGenerationAgent.ts` - Add persona context to AI
- `backend/src/services/characterService.ts` - Add `getAvailablePersonas`
- `backend/src/routes/v1/characters.ts` - Add `/personas` endpoint
- `backend/translations/_source/chat.json` - Add translation keys
- `backend/translations/pt-br/chat.json` - Add Portuguese translations

### Frontend
- `frontend/src/pages/(chat)/shared/components/ParticipantConfigModal.tsx` - Major updates
- `frontend/src/services/characterApi.ts` - Add `getAvailablePersonas` method

---

## 6. Testing Strategy

### Unit Tests
```typescript
describe('formatUserContextWithPersona', () => {
  it('should use persona name when persona is set', () => {
    const persona = { firstName: 'Aragorn', lastName: 'Elessar' };
    const context = formatUserContextWithPersona(user, participant, persona);
    expect(context).toContain('Aragorn Elessar');
    expect(context).toContain('USER IS ROLEPLAYING AS');
  });

  it('should use user name when no persona', () => {
    const context = formatUserContextWithPersona(user, participant, null);
    expect(context).toContain(user.displayName);
  });
});
```

### Integration Tests
```typescript
describe('User Persona Integration', () => {
  it('should make AI address user by persona name', async () => {
    // Set user persona
    await updateParticipant(conversationId, userParticipantId, userId, {
      representingCharacterId: aragornCharacterId
    });

    // Send message as user
    await sendMessage({ conversationId, content: 'Hello!' });

    // Generate AI response
    const response = await generateAIResponse(conversationId, characterParticipantId);

    // AI should address user as Aragorn
    expect(response.content).toMatch(/aragorn|elessar/i);
  });
});
```

---

## 7. Edge Cases

1. **User selects private character they don't own**: API should filter this out
2. **Persona character is deleted**: Should gracefully fallback to user's real name
3. **User clears persona**: Should revert to user's profile information
4. **Invalid JSON in configOverride**: Parser should handle gracefully
5. **Very long user instructions**: Limit to 1000 characters
6. **Concurrent updates**: Last-write-wins is acceptable

---

## 8. Security Considerations

1. **Character access validation**: Verify user can access the character they're selecting as persona
2. **Private characters**: Only owner should be able to use private characters as persona
3. **Public characters**: Anyone can use public characters as persona
4. **No data leakage**: Private character details shouldn't leak to other users

---

## 9. Related Features

- **Character-Specific Instructions** (separate feature) - Similar UI pattern
- **Multi-user Conversations** - Persona works per-user in multi-user chats
- **Memory System** - Persona might be remembered by AI across conversations (future)

---

## 10. Notes

- The `representingCharacterId` field already exists and is used for assistants
- Extending it to users is a natural progression
- JSON config in `configOverride` provides flexibility without migration
- Persona feature adds significant roleplay depth for users
