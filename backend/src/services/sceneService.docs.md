# Scene Service

**Purpose**: Manage scene and area CRUD operations and business logic for the Scene System (FEATURE-022).

**Location**: `backend/src/services/sceneService.ts`

---

## Overview

The SceneService handles all scene-related database operations including scenes, areas, area connections, and asset placement. Scenes represent locations with multiple areas that can be connected. Assets can be placed in areas for interactive storytelling.

**Scene Structure**:
```
Scene (location)
  ├── Areas (rooms/sections)
  │   ├── Assets (placed items)
  │   ├── Connections (exits to other areas)
  │   └── Images (environment/map images)
  ├── Images (cover, map, detail images)
  └── Tags (categorization)
```

---

## Key Types

### CreateSceneInput

```typescript
interface CreateSceneInput {
  name: string;
  description: string;
  shortDescription?: string | null;
  genre?: string | null;
  era?: string | null;
  mood?: string | null;
  style?: VisualStyle | null;
  imagePrompt?: string | null;
  mapPrompt?: string | null;
  coverImageUrl?: string | null;
  mapImageUrl?: string | null;
  ageRating?: AgeRating;
  contentTags?: ContentTag[];
  visibility?: Visibility;
  authorId: string;
  originalLanguageCode?: string | null;
  tagIds?: string[];
  initialAreas?: CreateAreaInput[];  // Create areas with scene
}
```

### UpdateSceneInput

All fields from CreateSceneInput except `authorId` and `initialAreas`, all optional.

### ListScenesFilters

```typescript
interface ListScenesFilters {
  authorId?: string;
  genre?: string;
  mood?: string;
  era?: string;
  search?: string;
  visibility?: Visibility;
  style?: string;
  skip?: number;
  limit?: number;
}
```

### CreateAreaInput

```typescript
interface CreateAreaInput {
  name: string;
  description: string;
  shortDescription?: string | null;
  imagePrompt?: string | null;
  mapPrompt?: string | null;
  environmentImageUrl?: string | null;
  mapImageUrl?: string | null;
  displayOrder?: number;
  isAccessible?: boolean;
  originalLanguageCode?: string | null;
  metadata?: Prisma.InputJsonValue;
}
```

### LinkAssetToAreaInput

```typescript
interface LinkAssetToAreaInput {
  areaId: string;
  assetId: string;
  position?: string | null;          // e.g., "on the table", "in the corner"
  isHidden?: boolean;                // For secret/discoverable items
  isInteractable?: boolean;          // Can players interact with it
  discoveryHint?: string | null;     // Hint for finding hidden items
  metadata?: Prisma.InputJsonValue;  // Custom properties
  displayOrder?: number;
}
```

### ConnectAreasInput

```typescript
interface ConnectAreasInput {
  fromAreaId: string;
  toAreaId: string;
  direction?: string | null;        // e.g., "north", "up the stairs"
  description?: string | null;      // Travel description
  isLocked?: boolean;               // Is passage blocked
  lockHint?: string | null;         // How to unlock
}
```

---

## Scene CRUD Operations

### `createScene(data: CreateSceneInput): Promise<Scene>`

Creates a new scene with optional initial areas.

**Parameters**:
- `data` - Scene creation data (see CreateSceneInput above)

**Returns**: Created scene with full relations including areas

**Validation**:
- `name` and `description` are required
- `contentTags` defaults to empty array
- `style` defaults to null
- Tags are associated via junction table if `tagIds` provided
- Areas are created if `initialAreas` provided

**Example**:
```typescript
const newScene = await createScene({
  name: 'Medieval Castle',
  description: 'An imposing castle on the hill',
  genre: 'Fantasy',
  era: 'Medieval',
  mood: 'Mysterious',
  authorId: user.id,
  initialAreas: [
    { name: 'Throne Room', description: 'A grand throne room', displayOrder: 0 },
    { name: 'Dungeon', description: 'Dark and damp cells', displayOrder: 1 }
  ]
});
```

---

### `getSceneById(sceneId: string): Promise<Scene | null>`

Fetches a single scene by ID with all relations.

**Parameters**:
- `sceneId` - Scene UUID

**Returns**: Scene with:
- Author details
- Areas (ordered by displayOrder)
  - Area assets with placement info
  - Area connections (outgoing)
  - Incoming connections
- Images (ordered by creation date)
- Tags with tag details
- Area count (_count.areas)

---

### `listScenes(filters: ListScenesFilters): Promise<Scene[]>`

Lists scenes with filtering and pagination.

**Parameters**:
- `filters` - Filter criteria (see ListScenesFilters above)

**Features**:
- Case-insensitive search across name, description, shortDescription
- Filter by genre, mood, era, visibility, style
- Default ordering: newest first
- Returns scenes with all relations

**Example**:
```typescript
// Get user's fantasy scenes
const scenes = await listScenes({
  authorId: userId,
  genre: 'Fantasy'
});

// Search public scenes
const results = await listScenes({
  search: 'castle',
  mood: 'Mysterious',
  visibility: 'PUBLIC'
});
```

---

### `searchScenes(query: string, options?): Promise<Scene[]>`

Full-text search across scene names and descriptions.

**Parameters**:
- `query` - Search term
- `options` - Optional filters (genre, mood, authorId, skip, limit)

**Returns**: Matching scenes with full relations

---

### `updateScene(sceneId: string, data: UpdateSceneInput): Promise<Scene>`

Updates an existing scene.

**Parameters**:
- `sceneId` - Scene UUID
- `data` - Fields to update (all optional)

**Features**:
- Replaces all existing tags when `tagIds` provided
- Updates `contentTags` and `style` if provided
- Returns updated scene with relations

---

### `deleteScene(sceneId: string): Promise<Scene>`

Permanently deletes a scene and all its areas.

**Parameters**:
- `sceneId` - Scene UUID

**Warning**: Cascades to delete all:
- Areas in the scene
- Area assets (junction records)
- Area connections
- Scene images

---

## Area Management

### `addArea(sceneId: string, data: CreateAreaInput): Promise<SceneArea>`

Adds a new area to a scene.

**Parameters**:
- `sceneId` - Scene UUID
- `data` - Area creation data (see CreateAreaInput above)

**Returns**: Created area with full relations

---

### `updateArea(areaId: string, data: UpdateAreaInput): Promise<SceneArea>`

Updates an existing area.

**Parameters**:
- `areaId` - Area UUID
- `data` - Fields to update (all optional)

---

### `removeArea(areaId: string): Promise<SceneArea>`

Removes an area from its scene.

**Parameters**:
- `areaId` - Area UUID

**Warning**: Cascades to delete:
- Area assets (junction records)
- Area connections (both incoming and outgoing)
- Area images

---

### `getAreaDetail(areaId: string): Promise<SceneArea | null>`

Gets detailed area information with all relations.

**Parameters**:
- `areaId` - Area UUID

**Returns**: Area with:
- Scene reference
- Assets with placement info
- Connections (outgoing)
- Incoming connections
- Images

---

### `getSceneAreas(sceneId: string): Promise<SceneArea[]>`

Gets all areas for a scene.

**Parameters**:
- `sceneId` - Scene UUID

**Returns**: Areas ordered by `displayOrder`

---

## Asset-Area Linking

### `linkAssetToArea(areaId, assetId, data?): Promise<SceneAreaAsset>`

Places an asset in an area.

**Parameters**:
- `areaId` - Area UUID
- `assetId` - Asset UUID
- `data` - Optional placement settings:
  - `position`: Location description
  - `isHidden`: Whether asset is hidden (default: false)
  - `isInteractable`: Whether asset can be interacted with (default: true)
  - `discoveryHint`: Hint for finding hidden assets
  - `metadata`: Custom properties
  - `displayOrder`: Display order (default: 0)

**Returns**: SceneAreaAsset relation with asset and area data

---

### `unlinkAssetFromArea(areaId, assetId): Promise<SceneAreaAsset>`

Removes an asset from an area.

**Parameters**:
- `areaId` - Area UUID
- `assetId` - Asset UUID

---

### `getAreaAssets(areaId: string): Promise<SceneAreaAsset[]>`

Gets all assets placed in an area.

**Parameters**:
- `areaId` - Area UUID

**Returns**: Assets ordered by `displayOrder`

---

### `updateAreaAsset(areaId, assetId, data): Promise<SceneAreaAsset>`

Updates asset placement in an area.

**Parameters**:
- `areaId` - Area UUID
- `assetId` - Asset UUID
- `data` - Fields to update (same as linkAssetToArea data)

---

## Area Connections

### `connectAreas(fromAreaId, toAreaId, data?): Promise<SceneAreaConnection>`

Creates a connection between two areas.

**Parameters**:
- `fromAreaId` - Source area UUID
- `toAreaId` - Destination area UUID
- `data` - Optional connection details:
  - `direction`: Direction description (e.g., "north", "upstairs")
  - `description`: Travel description
  - `isLocked`: Whether passage is blocked (default: false)
  - `lockHint`: How to unlock the passage

**Returns**: Connection with both areas' details

---

### `disconnectAreas(fromAreaId, toAreaId): Promise<SceneAreaConnection>`

Removes a connection between areas.

**Parameters**:
- `fromAreaId` - Source area UUID
- `toAreaId` - Destination area UUID

---

### `getAreaConnections(areaId: string): Promise<{outgoing, incoming}>`

Gets all connections for an area.

**Parameters**:
- `areaId` - Area UUID

**Returns**:
- `outgoing`: Connections from this area to other areas
- `incoming`: Connections from other areas to this area

---

### `updateConnection(fromAreaId, toAreaId, data): Promise<SceneAreaConnection>`

Updates a connection between areas.

**Parameters**:
- `fromAreaId` - Source area UUID
- `toAreaId` - Destination area UUID
- `data` - Fields to update (same as connectAreas data)

---

## Context Building

### `buildSceneContext(sceneId): Promise<string>`

Builds a text description of a scene for LLM consumption.

**Parameters**:
- `sceneId` - Scene UUID

**Returns**: Markdown-formatted text with:
- Scene name, description, and metadata (genre, era, mood)
- All areas with descriptions
- Assets in each area (visible only)
- Area connections/exits with locked status

**Output Format**:
```markdown
# Medieval Castle

An imposing stone castle on the hill.

Genre: Fantasy | Era: Medieval | Mood: Mysterious

## Areas:

### Throne Room
A grand throne room with high ceilings.

**Items in this area:**
- Gold Throne (at the front): An ornate golden throne

**Exits:**
- Dungeon (down the stairs) - A dark staircase leading down

### Dungeon
Dark and damp prison cells.

**Items in this area:**
- Iron Bars (on the walls): Rusty iron bars
```

---

### `buildAreaContext(areaId): Promise<string>`

Builds a detailed text description of an area for LLM consumption.

**Parameters**:
- `areaId` - Area UUID

**Returns**: Markdown-formatted text with:
- Area name and description
- Scene context (location name)
- Visible items with positions
- Hidden items (for GM/debug view)
- Exits and entrances with locked status

**Output Format**:
```markdown
# Throne Room

A grand throne room with high ceilings.

**Location:** Medieval Castle

## Items:
- **Gold Throne** (at the front): An ornate golden throne
- **Red Carpet** (center): A faded red carpet

## Exits:
- **Dungeon** (down the stairs) - A dark staircase leading down

## Entrances (from other areas):
- **Castle Entrance** (through the doors) - Heavy oak doors
```

---

## Scene Images

### `addSceneImage(sceneId, data): Promise<SceneImage>`

Adds an image to a scene.

**Parameters**:
- `sceneId` - Scene UUID
- `data`:
  - `imageUrl`: URL to the image
  - `imageType`: 'COVER' | 'MAP' | 'EXTERIOR' | 'INTERIOR' | 'DETAIL' | 'PANORAMA' | 'MISC'
  - `caption`: Optional caption

---

### `updateSceneImage(imageId, data): Promise<SceneImage>`

Updates a scene image.

**Parameters**:
- `imageId` - Image UUID
- `data`:
  - `imageType`: New image type (optional)
  - `caption`: New caption (optional)

---

### `deleteSceneImage(imageId): Promise<SceneImage>`

Deletes a scene image.

**Parameters**:
- `imageId` - Image UUID

---

### `getSceneImages(sceneId): Promise<SceneImage[]>`

Gets all images for a scene.

**Parameters**:
- `sceneId` - Scene UUID

**Returns**: Images ordered by creation date

---

## Area Images

### `addAreaImage(areaId, data): Promise<SceneAreaImage>`

Adds an image to an area.

**Parameters**:
- `areaId` - Area UUID
- `data`:
  - `imageUrl`: URL to the image
  - `imageType`: 'ENVIRONMENT' | 'MAP' | 'DETAIL' | 'PANORAMA' | 'MISC'
  - `caption`: Optional caption

---

### `updateAreaImage(imageId, data): Promise<SceneAreaImage>`

Updates an area image.

**Parameters**:
- `imageId` - Image UUID
- `data`:
  - `imageType`: New image type (optional)
  - `caption`: New caption (optional)

---

### `deleteAreaImage(imageId): Promise<SceneAreaImage>`

Deletes an area image.

**Parameters**:
- `imageId` - Image UUID

---

### `getAreaImages(areaId): Promise<SceneAreaImage[]>`

Gets all images for an area.

**Parameters**:
- `areaId` - Area UUID

**Returns**: Images ordered by creation date

---

## Favorites

### `toggleFavoriteScene(userId, sceneId, isFavorite): Promise<{success, isFavorite}>`

Adds or removes a scene from user's favorites.

**Parameters**:
- `userId` - User UUID
- `sceneId` - Scene UUID
- `isFavorite` - True to add, false to remove

**Returns**: Success status and current favorite state

---

### `getFavoriteScenes(userId, options?): Promise<Scene[]>`

Gets user's favorite scenes.

**Parameters**:
- `userId` - User UUID
- `options` - Pagination (skip, limit)

**Returns**: Scenes with author details, ordered by most recently favorited

---

### `getSceneStats(sceneId, userId?): Promise<{id, isFavoritedByUser, areaCount, imageCount}>`

Gets statistics for a scene.

**Parameters**:
- `sceneId` - Scene UUID
- `userId` - Optional user UUID to check favorite status

**Returns**:
- `id` - Scene ID
- `isFavoritedByUser` - Whether the user has favorited this scene
- `areaCount` - Number of areas in the scene
- `imageCount` - Number of images for this scene

---

## Utility Functions

### `isSceneOwner(sceneId, userId): Promise<boolean>`

Checks if a user owns a scene.

**Parameters**:
- `sceneId` - Scene UUID
- `userId` - User UUID

**Returns**: True if user is the scene author

---

### `getSceneCountByUser(userId): Promise<number>`

Counts scenes created by a user.

**Parameters**:
- `userId` - User UUID

**Returns**: Number of scenes

---

### `getPublicScenes(options?): Promise<Scene[]>`

Gets only public scenes.

**Parameters**:
- `options` - Filters (genre, mood, search, skip, limit)

**Returns**: Public scenes with full relations

---

## Data Flows

### Scene Creation Flow

1. Client submits scene data
2. `createScene` creates database record
3. Tags are associated via junction table
4. Initial areas are created if provided
5. Cover/map images are uploaded separately via dedicated endpoints

### Area Connection Flow

1. Client requests to connect two areas
2. `connectAreas` creates connection record
3. Connection includes direction, description, and lock status
4. Connection appears in both areas' connection lists
5. Context builder includes exits in area descriptions

### Asset Placement Flow

1. Client places asset in area
2. `linkAssetToArea` creates SceneAreaAsset relation
3. Position, visibility, and interactability are stored
4. Asset appears in area's asset list
5. Context builder includes asset in area descriptions (if visible)

---

## Edge Cases

### Connection Management

- Connections are directional (fromArea → toArea)
- To get bidirectional connections, check both `connections` and `connectedFrom`
- Deleting an area removes all connections to/from it
- Two areas can have multiple connections (different directions/descriptions)

### Asset Visibility

- Hidden assets are included in area data but marked with `isHidden`
- Context builder separates visible and hidden assets
- Hidden assets can have `discoveryHint` for players
- `isInteractable` controls whether players can interact with an asset

### Scene vs Area Images

- Scene images: cover, map, exterior, interior, detail, panorama
- Area images: environment, map, detail, panorama
- Images are stored externally; service only manages URLs
- Multiple images of the same type are allowed

### Access Control

- `PUBLIC` scenes are accessible to all users
- `PRIVATE` scenes only accessible to author
- Area access inherits from scene visibility
- Placing assets in areas does not change asset visibility

---

## Dependencies

- **PrismaService** - Database operations via `prisma`
- **LoggerService** - Structured logging via `logger`

---

## Related

- `backend/src/routes/v1/scenes.docs.md` - API endpoints
- `Scene` model - Database schema in `schema.prisma`
- `SceneArea` model - Area schema
- `SceneAreaAsset` model - Asset placement junction table
- `SceneAreaConnection` model - Area connections
- `SceneFavorite` model - User favorites
- `SceneImage` model - Scene images
- `SceneAreaImage` model - Area images
