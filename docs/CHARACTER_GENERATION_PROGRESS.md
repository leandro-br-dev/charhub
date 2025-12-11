# Character Generation Real-Time Progress System

## Overview

This document describes the real-time progress feedback system for automated character generation, implemented using WebSocket (Socket.io) to provide step-by-step updates to the frontend as the character is being generated.

## Architecture

```
┌─────────────────────┐
│   Frontend          │
│   (React)           │
└──────────┬──────────┘
           │
           │ WebSocket
           │ (Socket.io)
           ▼
┌─────────────────────┐
│   Backend           │
│   (Express + WS)    │
│                     │
│   1. Receive POST   │
│   2. Return session │
│   3. Emit progress  │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │ AI Services  │
    │ - Image      │
    │ - Text       │
    │ - History    │
    └──────────────┘
```

## Flow

### 1. Client Initiates Generation

```http
POST /api/v1/characters/generate-automated
Authorization: Bearer <token>
Content-Type: multipart/form-data

description: "A brave knight..."
image: <file>
```

**Immediate Response:**
```json
{
  "sessionId": "uuid-here",
  "message": "Character generation started"
}
```

### 2. Client Joins WebSocket Room

```javascript
socket.emit('join_character_generation', {
  sessionId: 'uuid-here'
}, (response) => {
  // response.success === true
});
```

### 3. Backend Emits Progress Events

Event: `character_generation_progress`

**Progress Event Structure:**
```typescript
{
  step: CharacterGenerationStep,
  progress: number,      // 0-100
  message: string,
  data?: any            // Step-specific data
}
```

## Generation Steps

| Step | Progress | Description | Data Payload |
|------|----------|-------------|--------------|
| `UPLOADING_IMAGE` | 5% | Converting and uploading image | - |
| `ANALYZING_IMAGE` | 15% | Analyzing image with AI | - |
| `EXTRACTING_DESCRIPTION` | 30% | Image analysis completed | `{ physicalDescription, visualStyle }` |
| `GENERATING_DETAILS` | 40% | Generating character details | - |
| `GENERATING_DETAILS` | 55% | Details generated | `{ firstName, lastName, age, gender, species, personality }` |
| `GENERATING_HISTORY` | 70% | Generating character history | `{ history }` |
| `CREATING_CHARACTER` | 80% | Creating character in database | - |
| `QUEUING_AVATAR` | 90% | Queuing avatar generation job | - |
| `COMPLETED` | 100% | Character generation completed | `{ characterId, character, avatarJobId }` |
| `ERROR` | 0% | Error occurred | `{ error, details }` |

## Implementation Details

### Backend Files Modified

1. **`/backend/src/types/character-generation.ts`** (NEW)
   - Type definitions for progress events
   - `CharacterGenerationStep` enum
   - `CharacterGenerationProgress` interface

2. **`/backend/src/websocket/characterGenerationHandler.ts`** (NEW)
   - Helper functions for emitting progress
   - Room naming: `character-generation:${userId}:${sessionId}`

3. **`/backend/src/websocket/chatHandler.ts`** (MODIFIED)
   - Added `join_character_generation` event handler
   - Allows clients to join generation progress rooms

4. **`/backend/src/controllers/automatedCharacterGenerationController.ts`** (MODIFIED)
   - Generate session ID on request
   - Return session ID immediately
   - Process generation asynchronously with `setImmediate`
   - Emit progress at each major step

### WebSocket Events

#### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_character_generation` | `{ sessionId: string }` | Join room to receive progress |

#### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `character_generation_joined` | `{ sessionId: string }` | Confirmation of room join |
| `character_generation_progress` | `CharacterGenerationProgress` | Progress update |

## Testing

### Using the Test Page

1. Open `/root/projects/charhub-coder/docs/test-character-generation-progress.html`
2. Enter your JWT token (from localStorage or login)
3. Provide description and/or image
4. Click "Start Character Generation"
5. Watch real-time progress updates

### Using Browser Console

```javascript
const socket = io('http://localhost:3000', {
  path: '/api/v1/ws',
  auth: { token: 'your-jwt-token' }
});

socket.on('character_generation_progress', (progress) => {
  console.log(`[${progress.progress}%] ${progress.message}`, progress.data);
});

// Start generation via fetch
const formData = new FormData();
formData.append('description', 'A brave knight');

const response = await fetch('http://localhost:3000/api/v1/characters/generate-automated', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer your-token' },
  body: formData
});

const { sessionId } = await response.json();

// Join room
socket.emit('join_character_generation', { sessionId });
```

## Frontend Integration (TODO)

### 1. Create Progress Wizard Component

Location: `frontend/src/pages/characters/create/components/GenerationWizard.tsx`

```typescript
interface GenerationWizardProps {
  sessionId: string;
  onComplete: (character: Character) => void;
  onError: (error: string) => void;
}

export function GenerationWizard({ sessionId, onComplete, onError }: GenerationWizardProps) {
  const [progress, setProgress] = useState<CharacterGenerationProgress | null>(null);
  const { socket } = useWebSocket(); // Custom hook

  useEffect(() => {
    if (!socket || !sessionId) return;

    // Join room
    socket.emit('join_character_generation', { sessionId });

    // Listen for progress
    socket.on('character_generation_progress', (event) => {
      setProgress(event);

      if (event.step === 'completed') {
        onComplete(event.data.character);
      } else if (event.step === 'error') {
        onError(event.data.error);
      }
    });

    return () => {
      socket.off('character_generation_progress');
    };
  }, [socket, sessionId]);

  return (
    <div className="generation-wizard">
      {/* Progress bar */}
      <ProgressBar value={progress?.progress ?? 0} />

      {/* Step-by-step display */}
      <StepDisplay
        currentStep={progress?.step}
        message={progress?.message}
        data={progress?.data}
      />

      {/* Action buttons (shown on completion) */}
      {progress?.step === 'completed' && (
        <ActionButtons
          characterId={progress.data.characterId}
          onRegenerateAvatar={() => {/* ... */}}
          onViewCharacteristics={() => {/* ... */}}
          onSave={() => {/* ... */}}
          onDiscard={() => {/* ... */}}
        />
      )}
    </div>
  );
}
```

### 2. Integrate with Create Page

```typescript
// pages/characters/create/index.tsx

const [sessionId, setSessionId] = useState<string | null>(null);
const [isGenerating, setIsGenerating] = useState(false);

async function handleSubmit(formData: FormData) {
  const response = await fetch('/api/v1/characters/generate-automated', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });

  const { sessionId } = await response.json();
  setSessionId(sessionId);
  setIsGenerating(true);
}

return (
  <div>
    {!isGenerating ? (
      <CharacterForm onSubmit={handleSubmit} />
    ) : (
      <GenerationWizard
        sessionId={sessionId!}
        onComplete={(character) => {
          navigate(`/characters/${character.id}/edit`);
        }}
        onError={(error) => {
          toast.error(error);
          setIsGenerating(false);
        }}
      />
    )}
  </div>
);
```

### 3. WebSocket Hook

```typescript
// hooks/useWebSocket.ts

export function useWebSocket() {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const io = connect(API_BASE, {
      path: '/api/v1/ws',
      auth: { token }
    });

    io.on('connect', () => setConnected(true));
    io.on('disconnect', () => setConnected(false));

    setSocket(io);

    return () => {
      io.disconnect();
    };
  }, [token]);

  return { socket, connected };
}
```

## Avatar Generation Completion

The avatar generation happens asynchronously via BullMQ. To notify the user when the avatar is ready:

### Option 1: Polling (Current)

After `COMPLETED` event, poll character endpoint for avatar URL:

```typescript
useEffect(() => {
  if (progress?.step !== 'completed') return;
  if (!progress.data.avatarJobId) return;

  const interval = setInterval(async () => {
    const character = await fetchCharacter(characterId);
    if (character.avatarUrl) {
      setAvatarReady(true);
      clearInterval(interval);
    }
  }, 5000);

  return () => clearInterval(interval);
}, [progress]);
```

### Option 2: WebSocket Event (Future Enhancement)

Modify avatar generation worker to emit WebSocket event:

```typescript
// In avatar generation worker completion
io.to(`character-generation:${userId}:${sessionId}`)
  .emit('character_generation_progress', {
    step: 'GENERATING_AVATAR',
    progress: 100,
    message: 'Avatar generated!',
    data: { avatarUrl: avatar.url }
  });
```

## Action Buttons

When generation completes, show action buttons:

1. **Regenerar Avatar** - Queue new avatar generation job
2. **Ver Características** - Show detailed character sheet
3. **Salvar** - Navigate to character page
4. **Descartar** - Delete character and return to form

## Error Handling

If any step fails:
- Emit `ERROR` step with error details
- Allow user to retry or discard
- Log errors for debugging

## Performance Considerations

- Use `setImmediate()` to avoid blocking HTTP response
- Progress events are non-blocking
- Avatar generation happens in background worker
- Client can disconnect/reconnect and continue watching progress (if session maintained)

## Security

- WebSocket requires JWT authentication
- Only character owner can join generation room
- Session IDs are UUIDs (hard to guess)
- Room pattern includes user ID for access control

## Future Enhancements

1. **Persist Progress** - Store progress in Redis for reconnection
2. **Cancel Generation** - Allow user to cancel mid-generation
3. **Avatar Preview** - Show intermediate SDXL generations
4. **Retry Failed Steps** - Granular retry for specific steps
5. **Generation Templates** - Pre-configured generation workflows

## References

- WebSocket Implementation: `/backend/src/websocket/chatHandler.ts`
- Controller: `/backend/src/controllers/automatedCharacterGenerationController.ts`
- Types: `/backend/src/types/character-generation.ts`
- Test Page: `/docs/test-character-generation-progress.html`
