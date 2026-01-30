# FEATURE-025: Game Modules Library

**Status**: Backlog
**Priority**: P1 - High
**Type**: Core System
**Depends on**: FEATURE-024 (Game Engine Core)
**Blocks**: FEATURE-026, FEATURE-027

---

## Overview

Implement a library of reusable game modules that plug into the Game Engine Core. Each module encapsulates specific game functionality (chat, scoring, voting, etc.) and can be combined to create different game types. This is the "building blocks" layer that enables rapid game creation.

---

## Architecture

```
+------------------------------------------------------------------+
|                    GAME ENGINE CORE (FEATURE-024)                |
|  +----------------+  +----------------+  +---------------------+  |
|  | Session Mgr    |  | State Machine  |  | Module Interface     |  |
|  +----------------+  +----------------+  +---------------------+  |
+------------------------------------------------------------------+
                    |                   |                    |
                    v                   v                    v
+------------------------------------------------------------------+
|                      GAME MODULES LIBRARY                         |
+------------------------------------------------------------------+
|                                                                    |
|  +------------------+  +------------------+  +-----------------+  |
|  | Chat Module      |  | Scoring Module   |  | Timer Module    |  |
|  | (multiplayer     |  | (points, ranks,  |  | (round timers,  |  |
|  |  investigation)  |  |  leaderboards)   |  |  game clock)    |  |
|  +------------------+  +------------------+  +-----------------+  |
|                                                                    |
|  +------------------+  +------------------+  +-----------------+  |
|  | Voting Module    |  | Narrator Module  |  | NPC Module      |  |
|  | (accusations,    |  | (scene desc,     |  | (AI-controlled  |  |
|  |  skip round)     |  |  flow control)   |  |  characters)    |  |
|  +------------------+  +------------------+  +-----------------+  |
|                                                                    |
|  +------------------+  +------------------+  +-----------------+  |
|  | Exploration Mod  |  | Evidence Module  |  | Social Module   |  |
|  | (navigation,     |  | (clue discovery, |  | (role reveal,   |  |
|  |  area discovery) |  |  inventory)      |  |  betrayal)      |  |
|  +------------------+  +------------------+  +-----------------+  |
|                                                                    |
+------------------------------------------------------------------+
```

---

## Module Interface

All modules implement the base `GameModule` interface defined in FEATURE-024:

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

  // Events (optional)
  emit?(event: string, data: Json): Promise<void>;
  onEvent?(event: string, data: Json): Promise<void>;
}

interface GameAction {
  type: string;
  playerId: string;
  timestamp: Date;
  data: Json;
}

interface ActionResult {
  success: boolean;
  stateChanges?: Json;
  events?: GameEvent[];
  errors?: string[];
}
```

---

## Module Specifications

### 1. Chat Module

**Purpose**: Enable multiplayer communication within game sessions

**Features**:
- Links game session to existing Conversation system
- Game-specific command parsing (`/explore`, `/interrogate`, `/accuse`)
- Message filtering (players can send DMs to NPCs or broadcast to all)
- Turn-limited messaging (action points per round)
- Game context injection (current phase, available actions)

**Configuration**:
```typescript
interface ChatModuleConfig {
  maxMessagesPerRound: number;      // Action point limit
  allowPrivateMessages: boolean;    // Can whisper to other players
  allowNPCMessages: boolean;        // Can DM NPCs
  commandPrefix: string;             // Default "/"
  commands: CommandDefinition[];    // Available commands
}
```

**State**:
```typescript
interface ChatModuleState {
  conversationId: string;
  messageCounts: Map<playerId, number>;  // Messages this round
  activeCommand: string | null;
}
```

---

### 2. Scoring Module

**Purpose**: Calculate and track player scores with game-specific rules

**Features**:
- Multi-dimensional scoring (multiple criteria)
- Dynamic scoring (points decay over time)
- Bonus/penalty system
- Ranking calculation
- Score breakdown visibility

**Configuration**:
```typescript
interface ScoringModuleConfig {
  scoringCriteria: ScoringCriteria[];  // How points are awarded
  rankingMethod: 'total' | 'weighted' | 'time_bonus';
  showBreakdown: boolean;              // Players see detailed scores
  allowNegativeScores: boolean;
}
```

**State**:
```typescript
interface ScoringModuleState {
  scores: Map<playerId, PlayerScore>;
  rankings: PlayerRanking[];
  bonusMultipliers: Map<playerId, number>;
}

interface PlayerScore {
  total: number;
  breakdown: Map<criteria, number>;
  bonus: number;
  penalties: number;
}
```

**Example Scoring Criteria** (Detective Mystery):
```typescript
const detectiveScoringCriteria: ScoringCriteria[] = [
  { name: 'suspect', points: 40, weight: 1.0 },
  { name: 'weapon', points: 20, weight: 1.0 },
  { name: 'location', points: 20, weight: 1.0 },
  { name: 'motive', points: 20, weight: 1.0 },
  { name: 'speed', points: 10, weight: 0.5, decay: 'linear' }, // Decays over time
  { name: 'clues_found', points: 5, weight: 0.2, perItem: true },
];
```

---

### 3. Timer Module

**Purpose**: Manage game and round timers with automatic phase transitions

**Features**:
- Game clock (total time remaining)
- Round timers (time per round/phase)
- Pause/resume functionality
- Timer expiration actions (force phase change, end game)
- Visual countdown updates

**Configuration**:
```typescript
interface TimerModuleConfig {
  gameDuration: number;               // Total game time in seconds
  roundDuration?: number;             // Time per round (optional)
  phaseDurations?: Map<phase, number>; // Time per phase
  pauseBetweenRounds: number;         // Seconds between rounds
  expirationAction: 'force_phase' | 'end_game' | 'extend';
  updateFrequency: number;            // WebSocket update interval (seconds)
}
```

**State**:
```typescript
interface TimerModuleState {
  status: 'running' | 'paused' | 'stopped';
  gameRemaining: number;              // Seconds
  roundRemaining?: number;            // Seconds
  currentPhase?: string;
  lastUpdate: Date;
}
```

---

### 4. Voting Module

**Purpose**: Enable group decision-making (accusations, skipping, etc.)

**Features**:
- Create votes with configurable options
- Time-limited voting windows
- One-vote-per-player enforcement
- Vote result calculation (majority, unanimous, etc.)
- Vote result triggers (phase change, game end, player elimination)

**Configuration**:
```typescript
interface VotingModuleConfig {
  defaultDuration: number;            // Seconds to vote
  requiredParticipation: number;      // Min % of players must vote
  winningThreshold: number;           // % needed to win (0.5 = majority)
  allowAbstain: boolean;
  revealVotesDuring: boolean;         // Show who voted what
  revealVotesAfter: boolean;          // Reveal after voting ends
}
```

**State**:
```typescript
interface VotingModuleState {
  activeVote: ActiveVote | null;
  voteHistory: CompletedVote[];
}

interface ActiveVote {
  id: string;
  topic: string;
  options: string[];
  votes: Map<playerId, option>;
  deadline: Date;
  status: 'active' | 'completed' | 'failed';
}
```

---

### 5. Narrator Module

**Purpose**: Provide atmospheric narration and guide game flow

**Features**:
- Scene/area description generation
- Event narration (clue found, phase change)
- Round summary generation
- NPC dialogue intro
- Ending narration based on results

**Configuration**:
```typescript
interface NarratorModuleConfig {
  persona: string;                    // Narrator personality
  tone: 'dramatic' | 'mysterious' | 'humorous' | 'formal';
  language: string;
  detailLevel: 'brief' | 'normal' | 'detailed';
  autoNarrateEvents: string[];        // Events to auto-narrate
}
```

**State**:
```typescript
interface NarratorModuleState {
  currentNarrative: string;
  narrationHistory: NarrationEntry[];
}

interface NarrationEntry {
  timestamp: Date;
  event: string;
  text: string;
  audience: 'all' | 'player' | 'npc';
}
```

---

### 6. NPC Module

**Purpose**: Control AI characters within game context

**Features**:
- Game-aware system prompts (NPC knows role, stress level, secrets)
- Dynamic state updates (stress increases when interrogated)
- Knowledge management (what NPC knows vs reveals)
- Response generation based on game events
- Relationship tracking between NPCs and players

**Configuration**:
```typescript
interface NPCModuleConfig {
  npcs: NPCDefinition[];
  responseStyle: 'in_character' | 'game_master' | 'hybrid';
  memoryCapacity: number;             // How many interactions to remember
  stressEnabled: boolean;             // NPCs get stressed
  secretsEnabled: boolean;            // NPCs have hidden info
}
```

**State**:
```typescript
interface NPCModuleState {
  npcs: Map<npcId, NPCState>;
}

interface NPCState {
  characterId: string;
  role: string;                       // "suspect", "witness", "victim"
  stress: number;                     // 0-100
  secretsRevealed: string[];
  relationships: Map<playerId, number>; // Affinity scores
  knowledge: GameKnowledge;           // What NPC knows about the crime
  conversationHistory: Message[];
}
```

---

### 7. Exploration Module

**Purpose**: Handle player movement and area discovery

**Features**:
- Navigation between connected areas
- Area discovery (hidden areas unlock)
- Lock/key mechanics
- Area-specific actions (search, examine)
- Map visualization

**Configuration**:
```typescript
interface ExplorationModuleConfig {
  movementCost: number;               // Action points to move
  allowRevisit: boolean;              // Can revisit areas
  discoverOnEntry: boolean;           // Auto-discover on enter
  showMap: boolean;                   // Players see map
  mapReveal: 'full' | 'visited' | 'none';
}
```

**State**:
```typescript
interface ExplorationModuleState {
  playerLocations: Map<playerId, areaId>;
  discoveredAreas: Map<playerId, areaId[]>;
  areaStates: Map<areaId, AreaState>;
}

interface AreaState {
  isUnlocked: boolean;
  interactables: string[];            // Available actions
  playersPresent: playerId[];
}
```

---

### 8. Evidence Module

**Purpose**: Manage clue discovery, inventory, and analysis

**Features**:
- Clue discovery triggers
- Evidence inventory per player
- Evidence comparison
- Evidence linking (clue A + clue B = conclusion)
- Private vs shared evidence

**Configuration**:
```typescript
interface EvidenceModuleConfig {
  autoCollect: boolean;               // Auto-add to inventory
  shareable: boolean;                 // Can share evidence
  maxInventory: number;
  allowAnalysis: boolean;             // Can examine evidence for details
}
```

**State**:
```typescript
interface EvidenceModuleState {
  playerInventory: Map<playerId, EvidenceItem[]>;
  discoveredClues: Map<clueId, ClueState>;
  sharedEvidence: EvidenceItem[];
}

interface ClueState {
  id: string;
  discoveredBy: playerId[];
  location: areaId | null;            // Where it was found
  isHidden: boolean;
  requiredAction?: string;            // Action to discover
}
```

---

### 9. Social Module

**Purpose**: Handle player-to-player interactions (alliances, betrayals)

**Features**:
- Private messaging between players
- Alliance formation
- Role reveal mechanics
- Betrayal mechanics
- Voting manipulation

**Configuration**:
```typescript
interface SocialModuleConfig {
  maxAllianceSize: number;
  allowBetrayal: boolean;
  betrayalPenalty: number;
  privateChannels: boolean;
}
```

---

## Module Composition

Games are created by composing modules in the GameDefinition:

```typescript
interface GameModuleConfig {
  moduleType: string;
  moduleVersion: string;
  config: Json;
  isEnabled: boolean;
  priority: number;                   // Execution order
}

// Example: Detective Mystery Game
const detectiveMysteryModules: GameModuleConfig[] = [
  { moduleType: 'chat', config: { maxMessagesPerRound: 10, allowNPCMessages: true }, priority: 1 },
  { moduleType: 'scoring', config: { scoringCriteria: detectiveScoringCriteria }, priority: 2 },
  { moduleType: 'timer', config: { gameDuration: 1800, roundDuration: 300 }, priority: 3 },
  { moduleType: 'voting', config: { defaultDuration: 60, winningThreshold: 0.5 }, priority: 4 },
  { moduleType: 'narrator', config: { tone: 'mysterious', autoNarrateEvents: ['phase_change', 'clue_found'] }, priority: 5 },
  { moduleType: 'npc', config: { stressEnabled: true, secretsEnabled: true }, priority: 6 },
  { moduleType: 'exploration', config: { movementCost: 1, showMap: true }, priority: 7 },
  { moduleType: 'evidence', config: { autoCollect: true, shareable: true }, priority: 8 },
];
```

---

## Backend Implementation

### Module Registry

**File**: `backend/src/services/game/modules/moduleRegistry.ts`

```typescript
class ModuleRegistry {
  private modules: Map<string, GameModuleFactory>;

  register(type: string, factory: GameModuleFactory): void;
  create(type: string, version: string): GameModule;
  listAvailable(): ModuleInfo[];
}
```

### Base Module Class

**File**: `backend/src/services/game/modules/baseModule.ts`

```typescript
abstract class BaseModule implements GameModule {
  protected session: GameSession;
  protected config: Json;
  protected state: Json;

  constructor(session: GameSession, config: Json) {
    this.session = session;
    this.config = config;
    this.state = {};
  }

  abstract initialize(): Promise<void>;
  abstract onPhaseChange(phase: string): Promise<void>;
  abstract onRoundChange(round: number): Promise<void>;
  abstract onAction(playerId: string, action: GameAction): Promise<ActionResult>;
  abstract onGameEnd(): Promise<void>;

  getPublicState(): Json {
    // Filter state for public visibility
  }

  getPlayerState(playerId: string): Json {
    // Filter state for specific player
  }

  protected emitEvent(event: string, data: Json): Promise<void> {
    // Emit via WebSocket
  }
}
```

### Module Implementations

**Directory**: `backend/src/services/game/modules/`

```
modules/
├── baseModule.ts              # Base class
├── moduleRegistry.ts          # Module registration
├── chatModule.ts              # Chat functionality
├── scoringModule.ts           # Scoring logic
├── timerModule.ts             # Timer management
├── votingModule.ts            # Voting system
├── narratorModule.ts          # Narration generation
├── npcModule.ts               # NPC control
├── explorationModule.ts       # Navigation
├── evidenceModule.ts          # Evidence/inventory
└── socialModule.ts            # Player interactions
```

---

## Module Extension API

Third-party developers (or future "user-created games") can create custom modules:

```typescript
// Custom module example
class CustomQuizModule extends BaseModule {
  name = 'custom_quiz';
  version = '1.0.0';

  async initialize(): Promise<void> {
    // Setup quiz questions from config
  }

  async onAction(playerId: string, action: GameAction): Promise<ActionResult> {
    if (action.type === 'submit_answer') {
      return this.checkAnswer(playerId, action.data.answer);
    }
  }

  private checkAnswer(playerId: string, answer: string): ActionResult {
    // Check answer, award points
  }
}

// Register the module
registry.register('custom_quiz', (session, config) => new CustomQuizModule(session, config));
```

---

## Frontend Integration

### Module State Display

Each module provides React components for its state:

```
frontend/src/components/game/modules/
├── ChatModule.tsx              # Game chat with commands
├── ScoringModule.tsx           # Score display, rankings
├── TimerModule.tsx             # Countdown timer
├── VotingModule.tsx            # Voting interface
├── NarratorModule.tsx          # Narration display
├── NPCModule.tsx               # NPC interaction panel
├── ExplorationModule.tsx       # Map, navigation
└── EvidenceModule.tsx          # Evidence inventory
```

### Module Hooks

```typescript
// Hook for module state
function useModuleState(moduleType: string, sessionId: string): Json;

// Hook for module actions
function useModuleAction(moduleType: string, sessionId: string): (action: GameAction) => Promise<void>;

// Usage
const score = useModuleState('scoring', sessionId);
const timer = useModuleState('timer', sessionId);
const submitVote = useModuleAction('voting', sessionId);
```

---

## Testing

### Unit Tests
- [ ] Each module's lifecycle methods
- [ ] State filtering (public vs player-specific)
- [ ] Event emission
- [ ] Configuration parsing
- [ ] Module registration

### Integration Tests
- [ ] Multiple modules in same session
- [ ] Module execution order (priority)
- [ ] Inter-module communication
- [ ] Module state persistence
- [ ] Module error handling

---

## Success Criteria

- [ ] All 9 core modules implemented and tested
- [ ] Module Registry enables dynamic module loading
- [ ] Modules can be configured per GameDefinition
- [ ] Module state is properly filtered by visibility
- [ ] Module execution respects priority order
- [ ] Custom modules can be registered and used
- [ ] Frontend components display module state correctly
- [ ] Module events are emitted via WebSocket
