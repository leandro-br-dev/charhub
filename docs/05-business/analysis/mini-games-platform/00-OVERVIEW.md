# Mini-Games Platform - Master Plan

**Created**: 2026-01-30
**Status**: Planning
**Author**: Agent Planner

---

## Vision

Transform CharHub from a character interaction platform into a **modular interactive experience platform** where characters, assets, stories, and chat become reusable modules that can be composed into mini-games and, eventually, user-created games.

### Short-term Goal
Build a **Detective Mystery mini-game** ("Misterio Vivo") that leverages existing systems and validates the modular architecture.

### Long-term Goal
Enable users to create custom games by combining modules (characters, chat, story, assets, scoring, etc.) through a visual builder.

---

## Strategic Architecture

```
+------------------------------------------------------------------+
|                   MINI-GAMES PLATFORM                              |
+------------------------------------------------------------------+
|                                                                    |
|  +--------------+  +--------------+  +--------------+             |
|  | Game Engine  |  | Module       |  | Game Builder |             |
|  | (Runtime)    |  | Registry     |  | (Future)     |             |
|  +--------------+  +--------------+  +--------------+             |
|         |                |                 |                       |
|  +------v-----------+   |   +-------------v-----------+           |
|  | Core Modules     |   |   | Pre-built Games         |           |
|  | (Reusable)       |<--+   | (Templates)             |           |
|  +------------------+       +-------------------------+           |
|  | Chat Module      |       | Detective Mystery       |           |
|  | Character Module |       | Trivia Challenge        |           |
|  | Story Module     |       | RPG Adventure (future)  |           |
|  | Asset Module     |       | Visual Novel (future)   |           |
|  | Scoring Module   |       +-------------------------+           |
|  | Timer Module     |                                             |
|  | Voting Module    |                                             |
|  +------------------+                                             |
|         |                                                         |
|  +------v----------------------------------------------+          |
|  | EXISTING FOUNDATION                                  |          |
|  | Characters | Chat | Images | Stories | Credits      |          |
|  | WebSocket  | LLM  | R2     | BullMQ | Translation  |          |
|  +------------------------------------------------------+         |
+------------------------------------------------------------------+
```

---

## Feature Breakdown

### Layer 1: Asset Foundation (Prerequisites)
| Feature | Description | Priority |
|---------|-------------|----------|
| [FEATURE-021](./FEATURE-021-asset-system.md) | Asset Management System | P0 - Critical |
| [FEATURE-022](./FEATURE-022-scene-location-system.md) | Scene & Location System | P0 - Critical |
| [FEATURE-023](./FEATURE-023-asset-generation-pipeline.md) | Asset Generation Pipeline | P0 - Critical |

### Layer 2: Game Engine Core
| Feature | Description | Priority |
|---------|-------------|----------|
| [FEATURE-024](./FEATURE-024-game-engine-core.md) | Game Engine Core (Runtime, State, Modules) | P0 - Critical |
| [FEATURE-025](./FEATURE-025-game-modules-library.md) | Reusable Game Modules Library | P1 - High |

### Layer 3: First Game
| Feature | Description | Priority |
|---------|-------------|----------|
| [FEATURE-026](./FEATURE-026-detective-mystery-game.md) | Detective Mystery Game ("Misterio Vivo") | P1 - High |

### Layer 4: Platform Evolution (Future)
| Feature | Description | Priority |
|---------|-------------|----------|
| FEATURE-027 | Game Builder (User-created games) | P2 - Medium |
| FEATURE-028 | Game Marketplace | P3 - Low |

---

## Dependency Graph

```
FEATURE-021 (Asset System)
    |
    +---> FEATURE-022 (Scenes & Locations) [depends on 021]
    |         |
    +---> FEATURE-023 (Asset Generation) [depends on 021]
    |         |
    +---------+--> FEATURE-024 (Game Engine Core) [depends on 021, 022, 023]
                       |
                       +--> FEATURE-025 (Game Modules) [depends on 024]
                       |        |
                       +--------+--> FEATURE-026 (Detective Game) [depends on 024, 025]
                                         |
                                         +--> FEATURE-027 (Game Builder) [future]
                                                  |
                                                  +--> FEATURE-028 (Marketplace) [future]
```

---

## Existing Systems Inventory

### Can be reused directly
| System | Current Use | Game Use |
|--------|-------------|----------|
| Character System | Character CRUD, profiles | NPCs, suspects, game characters |
| Multi-user Chat | Real-time conversations | Game communication, interrogation |
| WebSocket | Chat events | Game state sync, real-time updates |
| Image Generation (ComfyUI) | Character avatars/covers | Scene images, object images, NPC portraits |
| Story System | Interactive stories | Game narratives, case generation |
| Memory/Context | Conversation compression | Game history, NPC memory |
| Credit System | Service payments | Game credits, rewards |
| Translation | Chat messages | Game UI, NPC dialogue |
| BullMQ Queues | Async jobs | Asset generation, game events |
| R2 Storage | Image storage | All game assets |
| Content Classification | Age rating, tags | Game content rating |
| Tag System | Content tags (has GAME type) | Game categorization |

### Needs expansion
| System | Current State | Needed For Games |
|--------|--------------|------------------|
| Attire (clothing) | Basic model with prompts | Expand into full Asset system (objects, scars, locations) |
| Character images | Avatar, cover, sticker | Add game-specific types (NPC portrait, crime scene) |
| Conversation | Chat-focused | Add game session, turns, commands |
| Story | Linear narrative | Add branching, procedural generation |

### Needs to be built
| System | Description |
|--------|-------------|
| Asset System | Generic asset management (objects, locations, clothing, scars, etc.) |
| Scene/Location System | Hierarchical locations with areas, maps, descriptions |
| Game Engine | State machine, turn management, scoring, timer |
| Game Modules | Reusable components (chat, voting, scoring, timer) |
| Game Session | Multiplayer game state, persistence, replay |

---

## Implementation Order & Estimated Scope

| Phase | Features | Description |
|-------|----------|-------------|
| **Phase 1** | FEATURE-021 | Asset System - foundation for all game content |
| **Phase 2** | FEATURE-022 + 023 | Scenes/Locations + Asset Generation (parallel) |
| **Phase 3** | FEATURE-024 | Game Engine Core |
| **Phase 4** | FEATURE-025 + 026 | Game Modules + Detective Game (parallel) |

---

## Documents in this folder

| File | Description |
|------|-------------|
| `00-OVERVIEW.md` | This file - Master plan and architecture |
| `01-EXISTING-SYSTEMS-AUDIT.md` | Detailed audit of reusable systems |
| `FEATURE-021-asset-system.md` | Asset Management System spec |
| `FEATURE-022-scene-location-system.md` | Scene & Location System spec |
| `FEATURE-023-asset-generation-pipeline.md` | Asset Generation Pipeline spec |
| `FEATURE-024-game-engine-core.md` | Game Engine Core spec |
| `FEATURE-025-game-modules-library.md` | Reusable Game Modules Library |
| `FEATURE-026-detective-mystery-game.md` | Detective Mystery Game spec |

---

**Next Step**: Review this overview, then dive into individual feature specs.
