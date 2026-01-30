# FEATURE-026: Detective Mystery Game ("Misterio Vivo")

**Status**: Backlog
**Priority**: P2 - Medium
**Type**: Game Implementation
**Depends on**: FEATURE-021 (Assets), FEATURE-022 (Scenes), FEATURE-023 (Generation), FEATURE-024 (Engine), FEATURE-025 (Modules)
**Blocks**: FEATURE-027 (Case Generator)

---

## Overview

Implement the first playable game: **"Misterio Vivo"** (Living Mystery), a multiplayer detective investigation game. Players collaborate to solve a murder mystery by interrogating NPCs, exploring locations, examining evidence, and making final accusations.

**Player Experience**:
- 2-4 players join a game session
- Each game is a unique procedurally-generated case
- 20-30 minutes gameplay
- Players communicate via chat, split up to explore different areas
- NPCs have personalities, secrets, and stress levels
- Players earn points for correct deductions

---

## Game Flow

```
+-------------------+
|     LOBBY         |
| Players join      |
| Assign roles      |
+---------+---------+
          |
          v
+-------------------+
|   INTRODUCTION    |
| Narrator sets     |
| the scene         |
+---------+---------+
          |
          v
+-------------------+       +---------------------+
|   INVESTIGATION   |<----->|      ROUND 1        |
| - Explore areas   |       | - Action phase     |
| - Interrogate     |       | - Time limit       |
| - Examine clues   |       +---------------------+
| - Discuss         |               |
+-------------------+               v
          |                 +------------------+
          |                 |   ROUND END      |
          |                 | - Summary        |
          |                 | - Score update   |
          |                 +------------------+
          |                         |
          v                         v
+-------------------+       +---------------------+
|   INVESTIGATION   |<----->|      ROUND 2        |
|   (continues)     |       | - More areas       |
+-------------------+       | - New clues        |
          |                 +---------------------+
          v                         |
+-------------------+               v
|   ACCUSATION      |<-------+------------------+
| PHASE             |        |    ROUND 3+      |
| Players submit    |        | - Final clues    |
| final accusations |        | - Time warning   |
+---------+---------+        +------------------+
          |
          v
+-------------------+
|     REVEAL        |
| Solution revealed |
| Scores calculated |
| Rankings shown    |
+-------------------+
```

---

## Game-Specific Schema

### Case Definition

```prisma
model CaseDefinition {
  id              String        @id @default(uuid())

  // Core
  name            String
  description     String        @db.Text
  difficulty      CaseDifficulty @default(MEDIUM)

  // Story
  crimeType       String        // "murder", "theft", "disappearance"
  victimName      String        // "Lord Thornwood"
  crimeLocation   String        // "Thornwood Manor"

  // Generation config
  era             String        @default("victorian")
  mood            String        @default("dark")
  sceneId         String?       // Associated scene

  // Solution (encrypted in DB)
  solution        Json          // { culpritId, weaponId, locationId, motive }
  solutionHash    String        // For verification

  // Content
  assets          CaseAsset[]   // Required assets for this case
  npcs            CaseNPC[]     // NPC definitions

  // Classification
  ageRating       AgeRating     @default(L)
  contentTags     ContentTag[]
  visibility      Visibility    @default(PRIVATE)

  authorId        String
  author          User          @relation(fields: [authorId], references: [id])

  // Relations
  sessions        GameSession[]

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

enum CaseDifficulty {
  TUTORIAL    // Guided, obvious clues
  EASY        // Clear clues, simple red herrings
  MEDIUM      // Balanced clues and red herrings
  HARD        // Subtle clues, many red herrings
  EXPERT      // Requires deep deduction, time pressure
}

model CaseAsset {
  id              String         @id @default(uuid())
  caseId          String
  case            CaseDefinition @relation(fields: [caseId], references: [id], onDelete: Cascade)
  assetId         String
  asset           Asset          @relation(fields: [assetId], references: [id])

  // Role in case
  role            AssetRole      // "weapon", "clue", "red_herring", "cosmetic"
  isMurderWeapon  Boolean        @default(false)
  isHidden        Boolean        @default(true)

  // Placement
  initialAreaId   String?        // Where it spawns
  discoveryHint   String?        @db.Text

  // Metadata
  metadata        Json?

  @@unique([caseId, assetId])
}

enum AssetRole {
  WEAPON           // The actual murder weapon
  CLUE             // Evidence pointing to solution
  RED_HERRING      // Misleading evidence
  COSMETIC         // Atmosphere only
  KEY              // Unlocks area/reveals info
  MOTIVE           // Reveals motive
}

model CaseNPC {
  id              String         @id @default(uuid())
  caseId          String
  case            CaseDefinition @relation(fields: [caseId], references: [id], onDelete: Cascade)
  characterId     String
  character       Character      @relation(fields: [characterId], references: [id])

  // Role in case
  npcRole         NPCRole

  // Personality
  personality     String?        @db.Text   // Custom personality override
  stressLevel     Int            @default(50)

  // Knowledge
  knowsCulprit    Boolean        @default(false)
  knowsWeapon     Boolean        @default(false)
  knowsLocation   Boolean        @default(false)
  knowsMotive     Boolean        @default(false)

  // Secrets
  secretInfo      Json?          // Information revealed under stress

  // Relationships
  relationships   Json?          // { "npcId": { type: "alliance", strength: 0.8 } }

  @@unique([caseId, characterId])
}

enum NPCRole {
  SUSPECT          // Could be the culprit
  WITNESS          // Saw something
  VICTIM           // The deceased (flashback only)
  ALLY             // Helps players
  ANTAGONIST       // Hinders players
  NEUTRAL          // Information source
}
```

---

## Solution Structure

The case solution is stored as encrypted JSON:

```typescript
interface CaseSolution {
  culprit: {
    characterId: string;
    name: string;
    motive: string;
  };
  weapon: {
    assetId: string;
    name: string;
    howUsed: string;
  };
  location: {
    areaId: string;
    name: string;
    why: string;
  };
  timeline: {
    timeOfDeath: string;
    discoveryTime: string;
    events: TimelineEvent[];
  };
  redHerrings: {
    falseSuspect?: string;    // NPC who seems guilty but isn't
    falseWeapon?: string;     // Item that seems like weapon but isn't
    falseLocation?: string;   // Location that seems important but isn't
  };
}

interface TimelineEvent {
  time: string;
  event: string;
  witnesses: string[];        // NPC IDs who saw this
  isHidden: boolean;          // Players must discover this
}
```

---

## Gameplay Mechanics

### 1. Investigation Phase

**Players can**:
- `/explore [area]` - Move to a new area (costs 1 action point)
- `/examine [object]` - Examine an object for clues (costs 1 action point)
- `/interrogate @npc [question]` - Ask an NPC a question (costs 1 action point)
- `/discuss [message]` - Talk to other players (free)
- `/status` - See current game state (free)

**Action Points**: Each player has 10 action points per round. Points reset each round.

### 2. Clue Discovery

Clues can be:
- **Visible**: Anyone in the area can examine
- **Hidden**: Must be discovered by searching area
- **Contextual**: Only revealed after certain conditions

Clue types:
- **Physical**: Found in areas (bloodstain, broken glass)
- **Testimonial**: Revealed by NPCs
- **Deductive**: Combining other clues

### 3. NPC Interrogation

NPCs have:
- **Stress level** (0-100): Increases with aggressive questioning
- **Personality**: Affects how they respond
- **Secrets**: Revealed when stress > threshold or right question asked
- **Knowledge**: What they know about the crime

Example interactions:
```
Player: /interrogate @edmund Where were you at 10 PM?
Edmund (NPC): "I was in the library, reading. Ask the maid, she brought me tea."

Player: /interrogate @edmund Why do you have blood on your cuff?
Edmund (NPC): [Stress increases] "That... that's from when I found the body! I tried to help!"
```

### 4. Final Accusation

When players are ready (or time runs out), they submit:

```typescript
interface Accusation {
  culprit: string;      // Character ID
  weapon: string;       // Asset ID
  location: string;     // Area ID
  motive: string;       // Text explanation
}
```

Each player submits their accusation. Players can discuss before final submission.

### 5. Scoring

Points awarded for:
- Correct culprit: 40 points
- Correct weapon: 20 points
- Correct location: 20 points
- Correct motive: 20 points
- Speed bonus: Up to 10 points (decays over time)
- Clues found: 5 points per unique clue

Penalties:
- Wrong culprit: -20 points
- Multiple accusations: -5 points per extra

---

## Case Generation (Manual First, Procedural Later)

### Phase 1: Manual Case Creation

Admin creates cases via web interface:
1. Define story (victim, crime type, era)
2. Select scene/areas
3. Place NPCs with roles
4. Place assets (weapons, clues, red herrings)
5. Define solution
6. Generate images for all elements

### Phase 2: Procedural Generation (FEATURE-027)

LLM generates cases from templates:
```
Input: "Victorian murder mystery with 4 suspects"
Output: Full case definition with NPCs, clues, solution
```

---

## Module Configuration

The Detective Mystery Game uses this module composition:

```typescript
const detectiveMysteryConfig: GameModuleConfig[] = [
  {
    moduleType: 'chat',
    config: {
      maxMessagesPerRound: 10,
      allowPrivateMessages: false,
      allowNPCMessages: true,
      commands: ['explore', 'interrogate', 'examine', 'accuse', 'status', 'discuss']
    },
    priority: 1
  },
  {
    moduleType: 'scoring',
    config: {
      scoringCriteria: [
        { name: 'culprit', points: 40, weight: 1.0 },
        { name: 'weapon', points: 20, weight: 1.0 },
        { name: 'location', points: 20, weight: 1.0 },
        { name: 'motive', points: 20, weight: 1.0 },
        { name: 'speed', points: 10, weight: 0.5, decay: 'linear' },
        { name: 'clues_found', points: 5, weight: 0.2, perItem: true },
      ],
      showBreakdown: true,
    },
    priority: 2
  },
  {
    moduleType: 'timer',
    config: {
      gameDuration: 1800,        // 30 minutes
      roundDuration: 600,        // 10 minutes per round
      expirationAction: 'force_phase',
    },
    priority: 3
  },
  {
    moduleType: 'voting',
    config: {
      defaultDuration: 120,      // 2 minutes to submit accusation
      requiredParticipation: 1.0, // Everyone must vote
      winningThreshold: 0.5,
    },
    priority: 4
  },
  {
    moduleType: 'narrator',
    config: {
      persona: "mysterious_narrator",
      tone: 'mysterious',
      autoNarrateEvents: ['phase_change', 'clue_found', 'accusation', 'reveal'],
    },
    priority: 5
  },
  {
    moduleType: 'npc',
    config: {
      stressEnabled: true,
      secretsEnabled: true,
      responseStyle: 'in_character',
    },
    priority: 6
  },
  {
    moduleType: 'exploration',
    config: {
      movementCost: 1,
      showMap: true,
      mapReveal: 'visited',
    },
    priority: 7
  },
  {
    moduleType: 'evidence',
    config: {
      autoCollect: true,
      shareable: true,
      maxInventory: 20,
    },
    priority: 8
  },
];
```

---

## Backend Implementation

### DetectiveGameService

**File**: `backend/src/services/game/detectiveGameService.ts`

```typescript
class DetectiveGameService {
  // Case management
  createCase(data: CaseDefinitionInput): Promise<string>;
  getCase(caseId: string): Promise<CaseDefinition>;
  listCases(filters?: CaseFilters): Promise<CaseDefinition[]>;

  // Game session setup
  initializeGameSession(sessionId: string, caseId: string): Promise<void>;
  spawnClues(sessionId: string): Promise<void>;
  initializeNPCs(sessionId: string): Promise<void>;

  // Game actions
  handleExploration(playerId: string, areaId: string): Promise<ActionResult>;
  handleExamination(playerId: string, objectId: string): Promise<ActionResult>;
  handleInterrogation(playerId: string, npcId: string, question: string): Promise<ActionResult>;

  // Accusation
  submitAccusation(playerId: string, accusation: Accusation): Promise<void>;
  calculateScore(accusation: Accusation, solution: CaseSolution): Promise<PlayerScore>;

  // Solution verification
  verifySolution(sessionId: string): Promise<GameResult>;
}
```

### Solution Encryption

**File**: `backend/src/services/game/solutionEncryption.ts`

```typescript
class SolutionEncryption {
  // Encrypt solution so it can't be easily read from DB
  encrypt(solution: CaseSolution, key: string): string;

  // Decrypt for verification
  decrypt(encrypted: string, key: string): CaseSolution;

  // Generate hash for integrity check
  hash(solution: CaseSolution): string;
}
```

---

## Frontend Implementation

### Game Screens

```
frontend/src/pages/game/detective/
├── Lobby.tsx                   # Pre-game lobby
├── GameBoard.tsx               # Main game interface
├── Investigation.tsx           # Investigation view
├── Accusation.tsx              # Final accusation screen
└── Results.tsx                 # Game over screen
```

### Game Board Layout

```
+--------------------------------------------------+
|  Thornwood Manor          Round 2/3  Time: 8:24  |
+--------------------------------------------------+  Header
|                                                  |
|  +------------+  +----------------------------+  |
|  |            |  |  Narrator:                 |  |
|  |   MAP      |  |  "A bloodstain on the      |  |
|  |            |  |   carpet tells a tale..."  |  |
|  |  [Library] |  +----------------------------+  |
|  |  [Hall   ] |                                |
|  |  [Garden ] |  +----------------------------+  |
|  |            |  |  Evidence Inventory:        |  |
|  +------------+  |  - Bloody letter            |  |
|                  |  - Bronze paperweight       |  |
|  +------------+  |  - Torn photograph          |  |
|  |            |  +----------------------------+  |
|  |   CHAT     |                                |
|  |            |  +----------------------------+  |
|  | Player 1:  |  |  NPCs in this area:         |  |
|  | "Look at   |  |  @Edmund (Stress: 30%)      |  |
|  |  the..."   |  |  @Helena (Stress: 15%)      |  |
|  |            |  +----------------------------+  |
|  +------------+                                |
|                                                  |
|  [/] Explore  [?] Examine  [@] Interrogate       |
+--------------------------------------------------+  Footer
```

---

## Example Case: "The Murder of Lord Thornwood"

### Premise
Lord Thornwood, owner of Thornwood Manor, has been found murdered in his study. Players must discover who killed him, with what weapon, in which location, and why.

### Suspects (NPCs)
1. **Lady Helena Thornwood** (Widow) - Cold, elegant, inherited everything
2. **Edmund Blackwood** (Butler) - Loyal servant, secretly in debt
3. **Dr. Arthur Vale** (Family Physician) - Old friend, treating Lord's illness
4. **Maid Clara** (Maid) - Young, recently hired, suspicious past

### Solution (Example)
- **Culprit**: Edmund Blackwood
- **Weapon**: Bronze eagle paperweight
- **Location**: Library (not study - body was moved)
- **Motive**: Lord discovered Edmund was stealing to pay gambling debts

### Clues
- Bloody paperweight in library (hidden)
- Edmund's debt letter in his room (hidden)
- Maid's testimony: "I saw Edmund coming from the library at 10 PM"
- Helena's testimony: "My husband was alive when I went to bed at 9:30 PM"
- Doctor's testimony: "The body had been dead less than an hour when I arrived"
- Bloodstain pattern: Body was moved

### Red Herrings
- Helena's secret lover (she's having affair but didn't kill him)
- Doctor's medication (could have poisoned but didn't)
- Maid's criminal record (thief, not murderer)

---

## Testing

### Unit Tests
- [ ] Case creation workflow
- [ ] Clue spawning logic
- [ ] NPC stress calculation
- [ ] Score calculation for all combinations
- [ ] Solution encryption/decryption

### Integration Tests
- [ ] Full game session (lobby → investigation → accusation → reveal)
- [ ] Multiplayer coordination
- [ ] NPC interaction responses
- [ ] Clue discovery triggers

### Play Tests
- [ ] Tutorial case (5 min)
- [ ] Easy case (15 min)
- [ ] Medium case (25 min)
- [ ] Hard case (35 min)

---

## Success Criteria

- [ ] Players can join a detective game session
- [ ] Investigation phase works (explore, examine, interrogate)
- [ ] NPCs respond with game-aware dialogue
- [ ] Clues are discoverable and collectible
- [ ] Accusation phase allows final submissions
- [ ] Scoring correctly evaluates solutions
- [ ] Results screen shows solution and rankings
- [ ] Game completes within 30 minutes
- [ ] At least 3 pre-made cases available
- [ ] Module configuration allows easy case modification

---

## Future Enhancements

- **Co-op mode**: Players share score if all agree on accusation
- **Competitive mode**: First to solve wins
- **Timed mode**: Speed matters more than accuracy
- **Hardcore mode**: Single wrong accusation = game over
- **Custom cases**: Users create and share cases
- **Case marketplace**: Community-created cases
