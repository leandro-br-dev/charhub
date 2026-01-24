---
name: charhub-documentation-patterns
description: Documentation patterns and standards for CharHub. Use when creating .docs.md files alongside code, documenting APIs, components, or services.
---

# CharHub Documentation Patterns

## Purpose

Define documentation standards for CharHub code, including `.docs.md` files, API documentation, and component documentation.

## Documentation Philosophy

**Code alongside documentation**: Every complex piece of code should have documentation next to it.

**Why `.docs.md` files**:
- Co-located with code (easier to find and maintain)
- Version controlled with code
- IDE-friendly (can open alongside code)
- Easy to update when code changes

---

## File Naming Convention

### Documentation File Location

**Place `.docs.md` file alongside the code it documents**:

```
backend/src/features/character/
├── character.service.ts
├── character.service.docs.md    # Service documentation
├── character.controller.ts
├── character.controller.docs.md # Controller documentation
└── character.dto.ts
```

**For Vue components**:
```
frontend/src/components/
├── CharacterCard.vue
├── CharacterCard.docs.md        # Component documentation
└── CharacterForm.vue
```

**For composables**:
```
frontend/src/composables/
├── useCharacterDetail.ts
└── useCharacterDetail.docs.md   # Composable documentation
```

### Naming Pattern

**Format**: `{OriginalFileName}.docs.md`

**Examples**:
- `characterService.ts` → `characterService.docs.md`
- `CharacterCard.vue` → `CharacterCard.docs.md`
- `useAuth.ts` → `useAuth.docs.md`

---

## Service Documentation Template

### Backend Service (.docs.md)

```markdown
# Character Service

**Purpose**: Manage character CRUD operations and business logic.

**Location**: `backend/src/features/character/character.service.ts`

---

## Overview

The CharacterService handles all character-related database operations including creating, reading, updating, and deleting characters. It also provides methods for character statistics and avatar correction.

## Methods

### `findById(id: string): Promise<Character | null>`

Finds a character by ID.

**Parameters**:
- `id` - Character UUID

**Returns**: Character object or null if not found

**Throws**:
- `PrismaClientKnownRequestError` (P2025) - If character not found

**Example**:
```typescript
const character = await characterService.findById('abc-123');
if (!character) {
  console.log('Character not found');
}
```

---

### `findAll(filters?: CharacterFilters): Promise<Character[]>`

Retrieves all characters with optional filtering.

**Parameters**:
- `filters` (optional) - Filter criteria
  - `isActive` - Filter by active status
  - `type` - Filter by character type

**Returns**: Array of characters

**Example**:
```typescript
const activeCharacters = await characterService.findAll({ isActive: true });
```

---

### `create(data: CreateCharacterDto): Promise<Character>`

Creates a new character.

**Parameters**:
- `data` - Character creation data
  - `firstName` (required) - Character's first name
  - `lastName` (required) - Character's last name
  - `description` (optional) - Character description
  - `type` - Character type (BASIC, PREMIUM, BOT)

**Returns**: Created character with generated ID

**Validation**:
- First name: min 1 character
- Last name: min 1 character
- Type: must be valid enum value

**Example**:
```typescript
const newCharacter = await characterService.create({
  firstName: 'John',
  lastName: 'Doe',
  type: 'BASIC'
});
```

---

## Business Logic

### Character Type Restrictions

- **BASIC**: Standard user characters, limited features
- **PREMIUM**: Enhanced features, priority processing
- **BOT**: System characters, special handling

### Active/Inactive Characters

Characters can be marked inactive instead of deleted. Inactive characters:
- Are excluded from default queries
- Can be reactivated
- Preserve historical data

---

## Dependencies

- **PrismaService** - Database operations
- **LoggerService** - Structured logging

---

## Related

- `character.controller.docs.md` - API endpoints
- `character.dto.docs.md` - Data transfer objects
- `Character` model - Database schema
```

---

## Controller Documentation Template

### Backend Controller (.docs.md)

```markdown
# Character Controller

**Purpose**: Expose character management API endpoints.

**Location**: `backend/src/features/character/character.controller.ts`

**Base Route**: `/api/characters`

---

## Endpoints

### `GET /api/characters`

Get all characters with optional filtering.

**Query Parameters**:
- `isActive` (boolean) - Filter by active status
- `type` (string) - Filter by type (BASIC, PREMIUM, BOT)
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 20)

**Response**: `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "type": "BASIC",
      "isActive": true
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

**Permissions**: Authenticated users

---

### `GET /api/characters/:id`

Get a specific character by ID.

**Parameters**:
- `id` (path) - Character UUID

**Response**: `200 OK`

```json
{
  "id": "uuid",
  "firstName": "John",
  "lastName": "Doe",
  "type": "BASIC",
  "isActive": true,
  "createdAt": "2025-01-24T10:00:00Z"
}
```

**Response**: `404 Not Found`

```json
{
  "error": "Character not found"
}
```

**Permissions**: Authenticated users

---

### `POST /api/characters`

Create a new character.

**Request Body**:

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "description": "A character description",
  "type": "BASIC"
}
```

**Response**: `201 Created`

```json
{
  "id": "uuid",
  "firstName": "John",
  "lastName": "Doe",
  "description": "A character description",
  "type": "BASIC",
  "isActive": true,
  "createdAt": "2025-01-24T10:00:00Z"
}
```

**Response**: `400 Bad Request`

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "firstName",
      "message": "First name is required"
    }
  ]
}
```

**Permissions**: Authenticated users

---

### `PATCH /api/characters/:id`

Update a character.

**Parameters**:
- `id` (path) - Character UUID

**Request Body** (all fields optional):

```json
{
  "firstName": "Jane",
  "description": "Updated description"
}
```

**Response**: `200 OK`

Returns updated character object.

**Permissions**: Character owner or admin

---

### `DELETE /api/characters/:id`

Delete a character (soft delete - sets inactive).

**Parameters**:
- `id` (path) - Character UUID

**Response**: `204 No Content`

**Permissions**: Character owner or admin

---

## Error Responses

All endpoints may return:

**`401 Unauthorized`** - Not authenticated
```json
{ "error": "Unauthorized" }
```

**`403 Forbidden`** - Insufficient permissions
```json
{ "error": "You don't have permission" }
```

**`500 Internal Server Error`** - Server error
```json
{ "error": "Internal server error" }
```

---

## Related

- `character.service.docs.md` - Business logic
- `character.dto.docs.md` - Request/response schemas
```

---

## Vue Component Documentation Template

### Vue Component (.docs.md)

```markdown
# CharacterCard

**Purpose**: Display character information in a card format.

**Location**: `frontend/src/components/CharacterCard.vue`

---

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `character` | `Character` | Yes | - | Character object to display |
| `showActions` | `boolean` | No | `true` | Show action buttons |
| `compact` | `boolean` | No | `false` | Use compact layout |

### Character Interface

```typescript
interface Character {
  id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  description: string | null;
  avatarUrl: string | null;
  type: 'BASIC' | 'PREMIUM' | 'BOT';
  isActive: boolean;
}
```

---

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `edit` | `character: Character` | Emitted when edit button clicked |
| `delete` | `characterId: string` | Emitted when delete button clicked |
| `view` | `characterId: string` | Emitted when card clicked |

---

## Slots

| Slot | Props | Description |
|------|-------|-------------|
| `default` | - | Main content area |
| `actions` | `character` | Custom action buttons |
| `avatar` | `character` | Custom avatar display |

---

## Usage Examples

### Basic Usage

```vue
<script setup lang="ts">
import CharacterCard from '@/components/CharacterCard.vue';
import type { Character } from '@/types/character';

const character: Character = {
  id: '1',
  firstName: 'John',
  lastName: 'Doe',
  description: 'A character',
  avatarUrl: null,
  type: 'BASIC',
  isActive: true
};
</script>

<template>
  <CharacterCard :character="character" />
</template>
```

### With Events

```vue
<template>
  <CharacterCard
    :character="character"
    @edit="handleEdit"
    @delete="handleDelete"
  />
</template>

<script setup lang="ts">
const handleEdit = (character: Character) => {
  router.push(`/characters/${character.id}/edit`);
};

const handleDelete = (characterId: string) => {
  // Show confirmation dialog
  confirmDelete(characterId);
};
</script>
```

### With Custom Slots

```vue
<template>
  <CharacterCard :character="character">
    <template #actions="{ character }">
      <button @click="customAction(character)">
        Custom Action
      </button>
    </template>
  </CharacterCard>
</template>
```

---

## i18n Keys Used

- `components.characterCard.viewDetails`
- `components.characterCard.edit`
- `components.characterCard.delete`
- `common.loading`

---

## Styling

Uses CSS variables for theming:
- `--character-card-bg` - Background color
- `--character-card-border` - Border color
- `--character-card-shadow` - Shadow

---

## Dependencies

- `@/types/character` - Character type definitions
- `@/composables/useCharacterAvatar` - Avatar utilities

---

## Related

- `CharacterList.docs.md` - Parent component
- `useCharacterAvatar.docs.md` - Avatar composable
```

---

## Composable Documentation Template

### Vue Composable (.docs.md)

```markdown
# useCharacterDetail

**Purpose**: Fetch and manage character detail data.

**Location**: `frontend/src/composables/useCharacterDetail.ts`

---

## Signature

```typescript
function useCharacterDetail(
  characterId: ComputedRef<string> | Ref<string> | string
): UseCharacterDetailReturn
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `characterId` | `ComputedRef<string> \| Ref<string> \| string` | Character ID (can be reactive) |

### Return Type

```typescript
interface UseCharacterDetailReturn {
  data: Ref<Character | null>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  refresh: () => Promise<void>;
}
```

---

## Usage

### Basic Usage

```vue
<script setup lang="ts">
import { useCharacterDetail } from '@/composables/useCharacterDetail';

const characterId = ref('abc-123');

const {
  data: character,
  loading,
  error,
  refresh
} = useCharacterDetail(characterId);
</script>

<template>
  <div v-if="loading">Loading...</div>
  <div v-else-if="error">{{ error.message }}</div>
  <div v-else-if="character">
    {{ character.firstName }} {{ character.lastName }}
  </div>
</template>
```

### Reactive Character ID

```vue
<script setup lang="ts">
import { useCharacterDetail } from '@/composables/useCharacterDetail';

// Computed character ID
const characterId = computed(() => route.params.id as string);

const { data: character } = useCharacterDetail(characterId);

// Automatically refetches when characterId changes
watchEffect(() => {
  console.log('Current character:', character.value);
});
</script>
```

---

## Behavior

### Fetching

- Automatically fetches when composable is created
- Re-fetches when `characterId` changes
- Uses `swr` pattern (stale-while-revalidate)

### Loading State

- `loading` is `true` during initial fetch
- `loading` is `false` during background revalidation
- Use `loading` to show initial skeleton/loading state

### Error Handling

- `error` contains fetch errors
- `error` is `null` on success
- Check `error` before displaying data

### Cache

- Data is cached by character ID
- Call `refresh()` to force refetch
- Cache invalidates after 5 minutes

---

## Error Handling

```vue
<script setup lang="ts">
const { data, error, loading } = useCharacterDetail(characterId);

watch(error, (newError) => {
  if (newError) {
    // Handle error
    toast.error('Failed to load character');
  }
});
</script>
```

---

## Related

- `useCharacterList.docs.md` - List composable
- `@/api/character` - API client
```

---

## Documentation Best Practices

### DO

✅ Write documentation as you write code
✅ Include usage examples
✅ Document parameters and return types
✅ Keep documentation up to date
✅ Use code blocks with syntax highlighting
✅ Include error scenarios
✅ Link to related documentation

### DON'T

❌ Write vague descriptions
❌ Skip documenting edge cases
❌ Use outdated examples
❌ Assume knowledge of internal implementation
❌ Document what's obvious from code
❌ Forget to update when code changes

---

## What to Document

### For Services

- Public methods and their purposes
- Parameters and return types
- Business logic and rules
- Error scenarios
- Dependencies
- Usage examples

### For Controllers

- All endpoints (method, route, purpose)
- Request/response schemas
- Query parameters
- Error responses
- Permission requirements
- Usage examples (curl, HTTP)

### For Components

- Props with types and descriptions
- Events with payloads
- Slots with props
- Usage examples
- i18n keys used
- Styling information
- Dependencies

### For Composables

- Function signature
- Parameter types
- Return type
- Usage examples
- Behavior and lifecycle
- Error handling
- Cache behavior

---

## Quick Checklist

Before considering documentation complete:

- [ ] Purpose clearly stated
- [ ] All public methods/functions documented
- [ ] Parameters and return types specified
- [ ] Usage examples provided
- [ ] Error scenarios covered
- [ ] Related documentation linked
- [ ] Examples are current and working
- [ ] Code blocks have syntax highlighting
- [ ] i18n keys listed (for components)
- [ ] Dependencies mentioned

---

## Related Skills

- `charhub-typescript-standards` - Type documentation patterns
- `charhub-api-conventions` - API documentation standards
- `charhub-vue3-patterns` - Vue component documentation
