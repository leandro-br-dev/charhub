# FEATURE-024: Game Engine Core

**Status**: Backlog
**Priority**: P0 - Critical
**Type**: Core System
**Depends on**: FEATURE-021 (Assets), FEATURE-022 (Scenes), FEATURE-023 (Generation)
**Blocks**: FEATURE-025, FEATURE-026

---

## Overview

Build a modular game engine that manages game sessions, state machines, turns, timers, scoring, and integrates with existing CharHub systems (chat, characters, assets, LLM). The engine is designed to be **game-agnostic** so different game types can be built on top of it.

---

## Architecture

```
+------------------------------------------------------------------+
|                       GAME ENGINE CORE                             |
+------------------------------------------------------------------+
|                                                                    |
|  +------------------+  +------------------+  +-----------------+  |
|  | Session Manager  |  | State Machine    |  | Event Bus       |  |
|  | (create, join,   |  | (phases, turns,  |  | (game events,   |  |
|  |  leave, end)     |  |  transitions)    |  |  WebSocket)     |  |
|  +------------------+  +------------------+  +-----------------+  |
|                                                                    |
|  +------------------+  +------------------+  +-----------------+  |
|  | Timer System     |  | Scoring System   |  | Command Parser  |  |
|  | (round timers,   |  | (points, ranks,  |  | (structured &   |  |
|  |  game clock)     |  |  leaderboard)    |  |  natural lang)  |  |
|  +------------------+  +------------------+  +-----------------+  |
|                                                                    |
|  +------------------+  +------------------+  +-----------------+  |
|  | Module Interface |  | NPC Controller   |  | Narrator        |  |
|  | (plugin system   |  | (AI characters   |  | (game master,   |  |
|  |  for game types) |  |  with game ctx)  |  |  scene desc)    |  |
|  +------------------+  +------------------+  +-----------------+  |
|                                                                    |
+------------------------------------------------------------------+
         |              |              |              |
    Characters       Chat          Assets         LLM
    (existing)     (existing)    (FEAT-021)    (existing)
```

---

## Database Schema

### Game Definition (Template)

```prisma
enum GameType {
  DETECTIVE_MYSTERY
  TRIVIA
  RPG_ADVENTURE
  VISUAL_NOVEL
  CUSTOM
}

enum GameStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

model GameDefinition {
  id              String       @id @default(uuid())

  // Core
  name            String
  description     String       @db.Text
  type            GameType
  status          GameStatus   @default(DRAFT)

  // Configuration
  minPlayers      Int          @default(1)
  maxPlayers      Int          @default(4)
  defaultDuration Int          // Duration in seconds
  rules           Json         // Game-specific rules config

  // Content
  coverImageUrl   String?
  authorId        String
  author          User         @relation(fields: [authorId], references: [id])

  // Classification
  ageRating       AgeRating    @default(L)
  contentTags     ContentTag[]
  visibility      Visibility   @default(PRIVATE)

  // Relations
  sessions        GameSession[]
  modules         GameModuleConfig[]
  tags            GameDefinitionTag[]

  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  @@index([type])
  @@index([authorId])
  @@index([visibility])
}
```

### Game Session (Active Instance)

```prisma
enum SessionStatus {
  LOBBY         // Waiting for players
  STARTING      // Initializing game
  IN_PROGRESS   // Game active
  PAUSED        // Game paused
  VOTING        // Vote in progress
  ENDED         // Game complete
  ABANDONED     // Game abandoned
}

model GameSession {
  id               String        @id @default(uuid())
  gameDefinitionId String
  gameDefinition   GameDefinition @relation(fields: [gameDefinitionId], references: [id])

  // Status
  status           SessionStatus @default(LOBBY)
  currentPhase     String?       // Game-specific phase name
  currentRound     Int           @default(0)
  startedAt        DateTime?
  endedAt          DateTime?

  // Timer
  totalDuration    Int           // Total game duration in seconds
  remainingTime    Int?          // Remaining seconds

  // State
  gameState        Json          // Full game state (game-specific)
  sharedState      Json?         // State visible to all players

  // Conversation link
  conversationId   String?       @unique
  conversation     Conversation? @relation(fields: [conversationId], references: [id])

  // Scene link
  sceneId          String?
  scene            Scene?        @relation(fields: [sceneId], references: [id])

  // Relations
  players          GamePlayer[]
  npcs             GameNPC[]
  scores           GameScore[]
  events           GameEvent[]
  votes            GameVote[]

  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  @@index([status])
  @@index([gameDefinitionId])
}
```

### Game Player

```prisma
enum PlayerRole {
  HOST           // Game creator
  PLAYER         // Active player
  SPECTATOR      // Watch only
}

model GamePlayer {
  id            String       @id @default(uuid())
  sessionId     String
  session       GameSession  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  userId        String
  user          User         @relation(fields: [userId], references: [id])

  // Role
  role          PlayerRole   @default(PLAYER)

  // State
  isActive      Boolean      @default(true)
  actionsThisRound Int       @default(0)
  totalActions  Int          @default(0)
  privateState  Json?        // State only this player sees

  joinedAt      DateTime     @default(now())

  @@unique([sessionId, userId])
  @@index([sessionId])
}
```

### Game NPC (AI Characters in Game)

```prisma
model GameNPC {
  id            String       @id @default(uuid())
  sessionId     String
  session       GameSession  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  characterId   String
  character     Character    @relation(fields: [characterId], references: [id])

  // Game role
  npcRole       String       // "suspect", "witness", "narrator", "game_master"
  systemPrompt  String       @db.Text   // Full system prompt with game context

  // Dynamic state
  state         Json         // NPC-specific state (stress level, revealed info, etc.)

  @@unique([sessionId, characterId])
  @@index([sessionId])
}
```

### Game Score & Events

```prisma
model GameScore {
  id            String       @id @default(uuid())
  sessionId     String
  session       GameSession  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  userId        String
  user          User         @relation(fields: [userId], references: [id])

  // Scoring
  totalScore    Int          @default(0)
  breakdown     Json         // { suspect: 40, location: 20, weapon: 20, motive: 20, bonus: 20 }
  rank          Int?         // Final rank (1st, 2nd, etc.)
  rankTitle     String?      // "Legendary Detective"

  // Submission
  submission    Json?        // Player's final answer/accusation

  createdAt     DateTime     @default(now())

  @@unique([sessionId, userId])
  @@index([sessionId])
}

model GameEvent {
  id            String       @id @default(uuid())
  sessionId     String
  session       GameSession  @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  // Event data
  eventType     String       // "phase_change", "clue_found", "npc_interrogated", "vote_started"
  eventData     Json         // Event-specific payload
  triggeredBy   String?      // userId or "system"

  createdAt     DateTime     @default(now())

  @@index([sessionId])
  @@index([eventType])
}

model GameVote {
  id            String       @id @default(uuid())
  sessionId     String
  session       GameSession  @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  // Vote config
  topic         String       // "accusation", "skip_round", "end_game"
  options       Json         // Available options
  deadline      DateTime     // Vote deadline

  // Status
  isActive      Boolean      @default(true)
  result        Json?        // Vote result

  // Votes cast
  votes         Json         // { userId: "option", ... }

  createdAt     DateTime     @default(now())

  @@index([sessionId])
}
```

### Module Configuration

```prisma
model GameModuleConfig {
  id                 String          @id @default(uuid())
  gameDefinitionId   String
  gameDefinition     GameDefinition  @relation(fields: [gameDefinitionId], references: [id], onDelete: Cascade)

  // Module identity
  moduleType         String          // "chat", "scoring", "timer", "voting", "narrator", "npc_controller"
  moduleVersion      String          @default("1.0.0")

  // Configuration
  config             Json            // Module-specific configuration
  isEnabled          Boolean         @default(true)
  priority           Int             @default(0) // Execution order

  @@index([gameDefinitionId])
}
```

---

## Backend Implementation

### GameEngineService

**File**: `backend/src/services/game/gameEngineService.ts`

Core game lifecycle management:
- `createSession(gameDefinitionId, hostUserId)` - Create new game session
- `joinSession(sessionId, userId)` - Player joins
- `leaveSession(sessionId, userId)` - Player leaves
- `startGame(sessionId)` - Initialize and start
- `endGame(sessionId)` - End game, calculate scores
- `getSessionState(sessionId, userId)` - Get state (filtered by player visibility)
- `processAction(sessionId, userId, action)` - Process player action
- `advancePhase(sessionId)` - Move to next phase
- `advanceRound(sessionId)` - Move to next round

### GameTimerService

**File**: `backend/src/services/game/gameTimerService.ts`

- `startTimer(sessionId, duration)` - Start game clock
- `pauseTimer(sessionId)` - Pause
- `resumeTimer(sessionId)` - Resume
- `getRemainingTime(sessionId)` - Get remaining time
- `onTimerExpired(sessionId)` - Handle timeout (force phase change)

Implementation: Redis-based timers with BullMQ delayed jobs for expiration events.

### GameScoringService

**File**: `backend/src/services/game/gameScoringService.ts`

- `submitAnswer(sessionId, userId, submission)` - Submit final answer
- `calculateScore(sessionId, userId, submission, solution)` - Calculate points
- `getRanking(sessionId)` - Get player rankings
- `awardBonus(sessionId, userId, bonusType)` - Award bonus points

### GameCommandParser

**File**: `backend/src/services/game/gameCommandParser.ts`

Parse both structured commands and natural language:
- `/explore [location]` → `{ type: "explore", target: location }`
- `/interrogate @name [question]` → `{ type: "interrogate", target: name, content: question }`
- `/examine [object]` → `{ type: "examine", target: object }`
- `/accuse` → `{ type: "accuse" }`
- `/vote [option]` → `{ type: "vote", option: option }`
- `/status` → `{ type: "status" }`
- Natural: "I want to look at the library" → `{ type: "explore", target: "library" }`

### GameNPCController

**File**: `backend/src/services/game/gameNPCController.ts`

Manages AI-controlled NPCs within game context:
- `initializeNPCs(sessionId, npcConfigs)` - Create NPCs with game-aware system prompts
- `processInteraction(sessionId, npcId, playerMessage, context)` - Generate NPC response
- `updateNPCState(sessionId, npcId, stateUpdate)` - Update NPC dynamic state
- `getNPCContext(sessionId, npcId)` - Build full NPC context (personality + game state + stress)

### GameNarratorService

**File**: `backend/src/services/game/gameNarratorService.ts`

Game master that describes scenes and manages flow:
- `describeScene(sessionId, areaId)` - Narrate area description
- `describeClue(sessionId, clueData)` - Describe discovered clue
- `announcePhaseChange(sessionId, newPhase)` - Announce phase transitions
- `generateRoundSummary(sessionId)` - Summarize round events
- `announceResults(sessionId, scores)` - Announce final results

### WebSocket Events

Extend existing chatHandler or create new gameHandler:

| Event | Direction | Description |
|-------|-----------|-------------|
| `game:state_update` | Server→Client | Game state changed |
| `game:phase_change` | Server→Client | Phase transition |
| `game:round_change` | Server→Client | New round |
| `game:timer_update` | Server→Client | Timer tick (every 10s) |
| `game:clue_found` | Server→Client | Clue discovered |
| `game:npc_response` | Server→Client | NPC replied |
| `game:narrator` | Server→Client | Narrator message |
| `game:vote_started` | Server→Client | Vote initiated |
| `game:vote_result` | Server→Client | Vote concluded |
| `game:score_update` | Server→Client | Score changed |
| `game:ended` | Server→Client | Game over |
| `game:action` | Client→Server | Player action |
| `game:vote` | Client→Server | Player vote |
| `game:submit` | Client→Server | Final submission |

### Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/games` | Create game definition |
| GET | `/api/v1/games` | List games |
| GET | `/api/v1/games/:id` | Get game details |
| POST | `/api/v1/games/:id/sessions` | Create session |
| POST | `/api/v1/games/sessions/:id/join` | Join session |
| POST | `/api/v1/games/sessions/:id/leave` | Leave session |
| POST | `/api/v1/games/sessions/:id/start` | Start game |
| GET | `/api/v1/games/sessions/:id/state` | Get session state |
| POST | `/api/v1/games/sessions/:id/action` | Submit action |
| POST | `/api/v1/games/sessions/:id/vote` | Cast vote |
| POST | `/api/v1/games/sessions/:id/submit` | Final submission |
| GET | `/api/v1/games/sessions/:id/scores` | Get scores |

---

## Module Interface

Games are built by composing modules. Each module implements:

```typescript
interface GameModule {
  name: string;
  version: string;

  // Lifecycle
  initialize(session: GameSession, config: Json): Promise<void>;
  onPhaseChange(phase: string): Promise<void>;
  onRoundChange(round: number): Promise<void>;
  onAction(playerId: string, action: GameAction): Promise<ActionResult>;
  onGameEnd(): Promise<void>;

  // State
  getPublicState(): Json;
  getPlayerState(playerId: string): Json;
}
```

This interface is implemented in FEATURE-025 (Game Modules Library).

---

## Testing

### Unit Tests
- [ ] Session lifecycle (create → join → start → play → end)
- [ ] State machine transitions
- [ ] Timer management
- [ ] Score calculation
- [ ] Command parsing (structured + natural language)
- [ ] NPC context building
- [ ] WebSocket event emission

### Integration Tests
- [ ] Full game session flow
- [ ] Multi-player session
- [ ] Timer expiration handling
- [ ] Vote system
- [ ] NPC interaction within game

---

## Success Criteria

- [ ] Game sessions can be created, joined, played, and ended
- [ ] State machine supports arbitrary phases and transitions
- [ ] Timer system works with WebSocket notifications
- [ ] Scoring system calculates points and rankings
- [ ] Command parser handles both structured and natural language
- [ ] NPC controller integrates game state into LLM prompts
- [ ] Narrator generates contextual descriptions
- [ ] Module interface allows pluggable game components
- [ ] WebSocket delivers real-time game events
