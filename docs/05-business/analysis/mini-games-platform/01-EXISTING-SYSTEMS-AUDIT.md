# Existing Systems Audit for Mini-Games Platform

**Created**: 2026-01-30
**Purpose**: Detailed inventory of what exists and how it maps to mini-games needs

---

## 1. Character System (Fully Reusable)

**Schema**: `Character` model (schema.prisma:523-591)
**Service**: `characterService.ts`

### Current Capabilities
- Full character profiles (name, age, gender, species, personality, history)
- Visual styles (ANIME, REALISTIC, SEMI_REALISTIC, CARTOON, MANGA, etc.)
- Content themes (DARK_FANTASY, FANTASY, FURRY, SCI_FI, GENERAL)
- Image types (AVATAR, COVER, SAMPLE, STICKER, REFERENCE)
- Attire linking (`mainAttireId`)
- LoRA model linking for consistent generation
- Content classification (age rating, content tags)
- Visibility controls (PRIVATE, UNLISTED, PUBLIC)

### Game Mapping
| Current Feature | Game Use |
|----------------|----------|
| Character profile | NPC data (suspects, allies, game master) |
| Personality field | NPC behavior prompts |
| History field | NPC backstory, secrets |
| Physical characteristics | NPC visual description |
| Character images | NPC portraits, crime scene appearances |
| Stickers (emotions) | NPC emotional reactions during gameplay |
| Attire | NPC clothing, disguises |

### Gaps to Fill
- **Character-Asset linking**: Need to attach arbitrary assets (scars, objects, accessories) to characters
- **Game-specific metadata**: Role in game (suspect, witness, victim), stress level, secrets
- **Procedural generation**: Generate NPC profiles from game templates

---

## 2. Chat/Conversation System (Partially Reusable)

**Schema**: `Conversation`, `Message`, `ConversationParticipant`, `UserConversationMembership`
**Services**: `conversationService.ts`, `messageService.ts`, `membershipService.ts`, `presenceService.ts`

### Current Capabilities
- Multi-user rooms (up to 4 humans + N AI characters)
- Real-time WebSocket messaging
- Membership roles (OWNER, MODERATOR, MEMBER, VIEWER)
- Typing indicators, presence tracking
- Message translation (auto-translate per member)
- Conversation memory compression
- Invite system with JWT tokens

### Game Mapping
| Current Feature | Game Use |
|----------------|----------|
| Multi-user room | Game lobby, investigation room |
| AI characters | NPC suspects responding in-character |
| WebSocket events | Real-time game state updates |
| Membership roles | Game roles (detective, observer) |
| Presence tracking | Player online status |
| Message history | Investigation log, evidence trail |
| Memory compression | Game session summary |

### Gaps to Fill
- **Command parsing**: `/explore`, `/interrogate`, `/examine`, `/accuse` commands
- **Message routing**: Direct messages to specific NPCs vs broadcast
- **Turn management**: Action limits per round
- **Private channels**: Private accusations, DM to narrator
- **Game-aware context**: NPCs need game state (stress, discovered clues) in their context

---

## 3. Image Generation System (Partially Reusable)

**Services**: `comfyuiService.ts`, `promptEngineering.ts`, `promptAgent.ts`
**Workflows**: Avatar, Cover, Sticker, Multi-reference

### Current Capabilities
- ComfyUI integration (HTTP API, polling, image retrieval)
- SD prompt engineering (character descriptions to tags)
- Multiple workflow types (face close-up, full body, sticker)
- LoRA support for style consistency
- Background removal for stickers
- R2 storage for generated images
- BullMQ queue for async generation

### Game Mapping
| Current Feature | Game Use |
|----------------|----------|
| Character avatar generation | NPC portraits |
| Cover generation (scenes) | Location/scene images |
| Sticker generation | Object images (weapons, clues) with transparency |
| Prompt engineering | Generate game-specific prompts |
| LoRA consistency | Consistent NPC appearances |
| Async generation | Pre-generate game assets |

### Gaps to Fill
- **New workflow types**: Top-down map views, object close-ups, environment panoramas
- **Reference-based generation**: "Generate character X wearing asset Y with scar Z"
- **Scene composition**: Combine location + characters + objects into a scene
- **Batch pre-generation**: Generate all assets for a game case before it starts
- **Asset type detection**: Classify generated images (location, object, character)

---

## 4. Asset System - Attire (Needs Major Expansion)

**Schema**: `Attire` model (schema.prisma:419-456)
**Service**: `attireService.ts`

### Current Capabilities
- Clothing items with name, description, gender
- Prompt fields (head, body, full) for image generation
- Preview image
- Content classification
- Character linking (mainAttireId)

### Game Mapping
| Current Feature | Game Use |
|----------------|----------|
| Attire model structure | Template for all asset types |
| Prompt fields | Asset-to-prompt conversion |
| Preview image | Asset thumbnail |
| Character linking | Asset ownership/assignment |

### What Needs to Be Built (FEATURE-021)
The Attire model is the **seed** for a full Asset system. Need to expand to:
- **Asset Types**: clothing, scars, accessories, objects, locations, weapons, vehicles
- **Asset Categories**: wearable (on character), holdable (in hand), environmental (in scene)
- **Character-Asset binding**: Many-to-many with placement metadata (e.g., "scar on left cheek")
- **Asset composition**: Combine multiple assets into generation prompts
- **Asset inheritance**: Scene assets contain sub-assets (rooms within mansion)

---

## 5. Story System (Partially Reusable)

**Schema**: `Story`, `StoryCharacter`
**Service**: `storyService.ts`

### Current Capabilities
- Story container with title, synopsis, initial text
- Objectives stored as JSON
- Character assignments with roles (MAIN, SECONDARY)
- Cover image generation
- Content classification

### Game Mapping
| Current Feature | Game Use |
|----------------|----------|
| Story structure | Game scenario/case template |
| Objectives | Game objectives (find culprit, weapon, location, motive) |
| Character roles | NPC roles in game (suspect, victim, witness) |
| Synopsis | Case description |
| Initial text | Opening narration |

### Gaps to Fill
- **Procedural generation**: Generate cases from templates
- **Branching narrative**: Different paths based on player actions
- **State-aware narration**: Narrator adapts to discovered clues
- **Game-specific fields**: Solution, clues, red herrings

---

## 6. LLM Integration (Fully Reusable)

**Services**: `backend/src/services/llm/` (Gemini, OpenAI, Grok, OpenRouter)

### Current Capabilities
- Multi-provider routing (Gemini, OpenAI, Grok, OpenRouter)
- Model selection and fallback
- Usage tracking and cost analytics
- Tool integration (web search)
- JSON response mode
- Streaming support

### Game Mapping
| Current Feature | Game Use |
|----------------|----------|
| Multi-provider LLM | NPC dialogue generation |
| JSON response mode | Structured game responses (stress update, clue reveal) |
| Streaming | Real-time NPC responses |
| Usage tracking | Game credit consumption |
| Tool integration | NPC actions (examine evidence, recall memories) |

---

## 7. Queue System (Fully Reusable)

**Location**: `backend/src/queues/`
**Jobs**: ImageGeneration, CharacterPopulation, MemoryCompression, UsageProcessing

### Game Mapping
- Asset pre-generation jobs
- Game case generation jobs
- NPC response generation jobs
- Score calculation jobs
- Game cleanup jobs

---

## 8. Credit System (Fully Reusable)

**Schema**: `CreditTransaction`, `Plan`, `ServiceCreditCost`, `UsageLog`

### Game Mapping
- Game play costs (credits per game)
- Reward credits for achievements
- Premium game features
- Game asset generation costs

---

## Summary: Reusability Score

| System | Reusability | Effort to Adapt |
|--------|-------------|-----------------|
| Character System | 90% | Low - Add asset linking |
| Chat System | 70% | Medium - Add commands, turns, routing |
| Image Generation | 60% | Medium - New workflows, reference-based gen |
| Attire/Asset | 30% | High - Expand into full asset system |
| Story System | 50% | Medium - Add procedural, branching |
| LLM Integration | 95% | Low - Ready to use |
| Queue System | 95% | Low - Add new job types |
| Credit System | 90% | Low - Add game pricing |
| WebSocket | 85% | Low - Add game events |
| Translation | 90% | Low - Add game UI strings |
| R2 Storage | 95% | Low - Ready to use |
| Content Classification | 95% | Low - Ready to use |

**Overall**: ~70% of infrastructure exists. The main gaps are the Asset System, Game Engine, and game-specific logic.
