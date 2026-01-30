# FEATURE-022: Scene & Location System

**Status**: Backlog
**Priority**: P0 - Critical
**Type**: Core System
**Depends on**: FEATURE-021 (Asset System)
**Blocks**: FEATURE-024, FEATURE-026

---

## Overview

Build a hierarchical location system where **Scenes** (top-level locations) contain **Areas** (sub-locations). Each scene and area has descriptions, generated images (environment view + top-down map), and can contain linked assets (objects, furniture, props). This system is essential for games like the Detective Mystery where players explore locations.

---

## Concept

```
Scene: "Thornwood Manor"
├── Description: "A Victorian mansion on the outskirts of London..."
├── Images: [exterior photo, floor plan map]
├── Metadata: { era: "Victorian", mood: "dark", weather: "rainy" }
│
├── Area: "Main Hall"
│   ├── Description: "Grand entrance with marble floors..."
│   ├── Images: [environment view, top-down map section]
│   ├── Assets: [chandelier, grandfather clock, portrait]
│   └── Connections: [Library, Kitchen, Garden]
│
├── Area: "Library"
│   ├── Description: "Floor-to-ceiling bookshelves..."
│   ├── Images: [environment view, top-down map section]
│   ├── Assets: [bronze paperweight, armchair, fireplace]
│   └── Connections: [Main Hall, Office]
│
├── Area: "Office"
│   ├── Description: "Meticulously organized desk..."
│   ├── Images: [environment view, top-down map section]
│   ├── Assets: [financial documents, safe, desk lamp]
│   └── Connections: [Library]
│
└── Area: "Garden"
    ├── Description: "Winter garden with dead roses..."
    ├── Images: [environment view, top-down map section]
    ├── Assets: [gloves, garden shears, bench]
    └── Connections: [Main Hall, Kitchen]
```

---

## Database Schema

### Scene (Top-level Location)

```prisma
model Scene {
  id              String        @id @default(uuid())

  // Core data
  name            String
  description     String        @db.Text
  shortDescription String?      // One-line summary for lists

  // Classification
  genre           String?       // "victorian_manor", "modern_apartment", "spaceship"
  era             String?       // "1890", "2024", "future"
  mood            String?       // "dark", "mysterious", "cheerful"
  style           VisualStyle?

  // Generation
  imagePrompt     String?       @db.Text   // Prompt for exterior/overview image
  mapPrompt       String?       @db.Text   // Prompt for top-down floor plan

  // Images
  coverImageUrl   String?       // Main scene image
  mapImageUrl     String?       // Top-down floor plan

  // Classification
  ageRating       AgeRating     @default(L)
  contentTags     ContentTag[]
  visibility      Visibility    @default(PRIVATE)

  // Ownership
  authorId        String
  author          User          @relation(fields: [authorId], references: [id])

  // Relations
  areas           SceneArea[]
  images          SceneImage[]
  tags            SceneTag[]

  // Metadata
  metadata        Json?         // Extra scene-specific data
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([authorId])
  @@index([visibility])
}

model SceneImage {
  id          String   @id @default(uuid())
  sceneId     String
  scene       Scene    @relation(fields: [sceneId], references: [id], onDelete: Cascade)

  imageUrl    String
  imageType   String   // "cover", "map", "panorama", "detail"
  caption     String?

  createdAt   DateTime @default(now())

  @@index([sceneId])
}

model SceneTag {
  id      String @id @default(uuid())
  sceneId String
  scene   Scene  @relation(fields: [sceneId], references: [id], onDelete: Cascade)
  tagId   String
  tag     Tag    @relation(fields: [tagId], references: [id])

  @@unique([sceneId, tagId])
}
```

### Area (Sub-location within Scene)

```prisma
model SceneArea {
  id              String      @id @default(uuid())
  sceneId         String
  scene           Scene       @relation(fields: [sceneId], references: [id], onDelete: Cascade)

  // Core data
  name            String      // "Library", "Main Hall", "Kitchen"
  description     String      @db.Text
  shortDescription String?    // One-line for navigation

  // Generation
  imagePrompt     String?     @db.Text   // Prompt for environment view
  mapPrompt       String?     @db.Text   // Prompt for top-down area view

  // Images
  environmentImageUrl String? // First-person/third-person view of the area
  mapImageUrl         String? // Top-down view of just this area

  // Navigation
  displayOrder    Int         @default(0)
  isAccessible    Boolean     @default(true)  // Can be locked/unlocked

  // Relations
  assets          SceneAreaAsset[]
  connections     SceneAreaConnection[] @relation("FromArea")
  connectedFrom   SceneAreaConnection[] @relation("ToArea")
  images          SceneAreaImage[]

  // Metadata
  metadata        Json?       // Extra data (light level, temperature, smell)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([sceneId])
}

model SceneAreaImage {
  id          String     @id @default(uuid())
  areaId      String
  area        SceneArea  @relation(fields: [areaId], references: [id], onDelete: Cascade)

  imageUrl    String
  imageType   String     // "environment", "map", "detail", "panorama"
  caption     String?

  createdAt   DateTime   @default(now())

  @@index([areaId])
}

model SceneAreaAsset {
  id          String     @id @default(uuid())
  areaId      String
  area        SceneArea  @relation(fields: [areaId], references: [id], onDelete: Cascade)
  assetId     String
  asset       Asset      @relation(fields: [assetId], references: [id])

  // Placement within area
  position    String?    // "on desk", "near fireplace", "hanging on wall"
  isHidden    Boolean    @default(false)  // Must be discovered
  isInteractable Boolean @default(true)   // Can be examined

  // Game-specific
  discoveryHint String?  // Hint text when examining area
  metadata     Json?     // Extra game data

  displayOrder Int       @default(0)

  @@unique([areaId, assetId])
  @@index([areaId])
}

model SceneAreaConnection {
  id          String     @id @default(uuid())
  fromAreaId  String
  fromArea    SceneArea  @relation("FromArea", fields: [fromAreaId], references: [id], onDelete: Cascade)
  toAreaId    String
  toArea      SceneArea  @relation("ToArea", fields: [toAreaId], references: [id], onDelete: Cascade)

  // Navigation
  direction   String?    // "north", "east", "upstairs", "through door"
  description String?    // "A heavy oak door leads to..."
  isLocked    Boolean    @default(false)
  lockHint    String?    // "Requires brass key"

  @@unique([fromAreaId, toAreaId])
}
```

---

## Backend Implementation

### SceneService

**File**: `backend/src/services/sceneService.ts`

**Methods**:
- `createScene(data)` - Create scene with areas
- `updateScene(id, data)` - Update scene metadata
- `deleteScene(id)` - Delete scene and all areas
- `getScene(id)` - Get scene with areas, assets, connections
- `listScenes(filters)` - List scenes with filters
- `addArea(sceneId, data)` - Add area to scene
- `updateArea(areaId, data)` - Update area
- `removeArea(areaId)` - Remove area
- `linkAssetToArea(areaId, assetId, placement)` - Place asset in area
- `unlinkAssetFromArea(areaId, assetId)` - Remove asset from area
- `connectAreas(fromId, toId, direction)` - Create area connection
- `getAreaDetail(areaId)` - Get area with all assets and connections
- `buildSceneContext(sceneId)` - Build text description for LLM
- `buildAreaContext(areaId)` - Build area description for LLM

### Routes

**File**: `backend/src/routes/v1/scenes.ts`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/scenes` | Create scene |
| GET | `/api/v1/scenes` | List scenes |
| GET | `/api/v1/scenes/:id` | Get scene with areas |
| PUT | `/api/v1/scenes/:id` | Update scene |
| DELETE | `/api/v1/scenes/:id` | Delete scene |
| POST | `/api/v1/scenes/:id/areas` | Add area |
| PUT | `/api/v1/scenes/areas/:areaId` | Update area |
| DELETE | `/api/v1/scenes/areas/:areaId` | Remove area |
| POST | `/api/v1/scenes/areas/:areaId/assets` | Place asset in area |
| DELETE | `/api/v1/scenes/areas/:areaId/assets/:assetId` | Remove asset |
| POST | `/api/v1/scenes/areas/:areaId/connections` | Connect areas |
| GET | `/api/v1/scenes/:id/map` | Get full scene map data |

---

## Frontend Implementation

### Scene Management Pages
- Scene list page with genre/mood filters
- Scene editor with area management
- Visual map editor (drag-and-drop areas, draw connections)
- Area detail editor (description, assets, connections)

### Scene Viewer Component
- Interactive map with clickable areas
- Area detail panel (description, assets, connections)
- Navigation between connected areas
- Used in both management and gameplay

---

## Image Generation Needs

### Scene-level Images
1. **Cover/Exterior**: Establishing shot of the location
   - Prompt: `{era} {genre} exterior, {mood} atmosphere, {description}`
2. **Floor Plan/Map**: Top-down architectural view
   - Prompt: `architectural floor plan, top-down view, {genre} style, rooms labeled`

### Area-level Images
1. **Environment View**: First/third-person perspective of the area
   - Prompt: `interior of {area.name}, {scene.era} style, {area.description}, atmospheric`
2. **Top-down View**: Bird's eye view of just this room
   - Prompt: `top-down view of {area.name}, floor plan detail, furniture visible`

These image types are defined but generated via FEATURE-023 (Asset Generation Pipeline).

---

## Testing

### Unit Tests
- [ ] SceneService CRUD
- [ ] Area management (add, update, remove)
- [ ] Asset-Area linking
- [ ] Area connections (bidirectional)
- [ ] Scene context builder
- [ ] Navigation graph validation

### Integration Tests
- [ ] Scene API endpoints
- [ ] Area management endpoints
- [ ] Asset placement in areas
- [ ] Scene with complex area graph

---

## Success Criteria

- [ ] Scenes can be created with multiple areas
- [ ] Areas can be connected forming navigation graphs
- [ ] Assets can be placed in areas with position metadata
- [ ] Scene and area descriptions build LLM-friendly context
- [ ] Images can be assigned to scenes and areas
- [ ] Scene data can be used by game engine for navigation
- [ ] Hidden assets support discovery mechanics
