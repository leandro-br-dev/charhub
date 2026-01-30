# FEATURE-023: Asset Generation Pipeline

**Status**: Backlog
**Priority**: P0 - Critical
**Type**: Infrastructure
**Depends on**: FEATURE-021 (Asset System)
**Blocks**: FEATURE-024, FEATURE-026

---

## Overview

Extend the existing ComfyUI image generation pipeline to support new asset types: objects, scenes, locations, maps, and reference-based character generation (character + assets like scars, clothing). This builds on the existing avatar/cover/sticker workflows.

---

## Current State

### Existing Workflows
| Workflow | Input | Output | Status |
|----------|-------|--------|--------|
| Avatar | Character description + style | Face close-up | Working |
| Cover | Character + scene description | Full body scene | Working |
| Sticker | Character + emotion/action | Transparent emotion image | Working |
| Multi-reference | Character description | Multiple angles (face, front, side, back) | Working |

### Existing Infrastructure
- ComfyUI HTTP API integration (`comfyuiService.ts`)
- Prompt engineering pipeline (`promptEngineering.ts`)
- AI-powered prompt generation (`promptAgent.ts`)
- BullMQ async job processing
- R2 storage for generated images
- LoRA model support for style consistency

---

## New Workflows Needed

### 1. Object Generation
**Purpose**: Generate transparent images of objects (weapons, tools, items, clues)

```
Input:
  - Asset description: "Bronze paperweight shaped like an eagle"
  - Style: REALISTIC
  - Background: transparent (PNG)
  - View: front, 3/4 angle

Output:
  - Transparent PNG of the object
  - Clean edges, no background
```

**ComfyUI Approach**: Similar to sticker workflow but for objects instead of characters. Use inpainting or rembg for background removal.

### 2. Environment/Scene Generation
**Purpose**: Generate atmospheric images of locations

```
Input:
  - Scene/Area description: "Victorian library with floor-to-ceiling bookshelves, fireplace, dim lighting"
  - Era: "1890"
  - Mood: "dark, mysterious"
  - Style: REALISTIC
  - View type: "interior first-person" | "exterior establishing"

Output:
  - High-quality environment image
  - Consistent style across areas of same scene
```

### 3. Top-Down Map Generation
**Purpose**: Generate floor plan / map views of locations

```
Input:
  - Scene description: "Victorian manor with 5 rooms"
  - Area names and connections
  - Style: "architectural blueprint" | "illustrated map" | "game map"

Output:
  - Top-down view of the location
  - Rooms labeled or clearly distinguishable
```

**Note**: This is one of the hardest generation tasks. May need:
- Specialized ControlNet models for floor plans
- Post-processing to add labels
- Template-based approach with generated fills

### 4. Reference-Based Character Generation
**Purpose**: Generate character images that incorporate linked assets

```
Input:
  - Character: "Helena Thornwood, 34, elegant, cold demeanor"
  - Assets:
    - Clothing: "Black mourning dress with silver brooch"
    - Scar: "Small scar on right temple"
    - Accessory: "Diamond necklace"
  - Style: REALISTIC
  - View: portrait / full body

Output:
  - Character image incorporating all specified assets
  - Consistent with character's existing visual identity (LoRA if available)
```

**ComfyUI Approach**: Extend existing avatar/cover workflows with additional prompt elements from asset descriptions. Use IP-Adapter or reference images for asset consistency.

### 5. Scene Composition (Future)
**Purpose**: Combine location + characters + objects into a single scene

```
Input:
  - Scene: "Library at night"
  - Characters: ["Helena standing by fireplace", "Edmund sitting in armchair"]
  - Objects: ["Bloody paperweight on desk", "Overturned chair"]

Output:
  - Composed scene with all elements
```

**Note**: This is a complex compositing task. Phase 1 will generate elements separately. Phase 2 may attempt inpainting-based composition.

---

## Implementation

### Prompt Engineering Extensions

**File**: `backend/src/services/comfyui/promptEngineering.ts` (extend)

```typescript
// New functions to add:

function buildObjectPrompt(asset: Asset): string {
  // Convert asset description to SD tags
  // Add quality/style tags
  // Ensure "transparent background, white background, no background"
}

function buildEnvironmentPrompt(area: SceneArea, scene: Scene): string {
  // Combine scene era/mood with area description
  // Add atmospheric tags
  // Specify perspective (first-person, establishing shot)
}

function buildMapPrompt(scene: Scene, areas: SceneArea[]): string {
  // Generate top-down map prompt
  // Include room names, connections
  // Specify map style
}

function buildCharacterWithAssetsPrompt(
  character: Character,
  assets: CharacterAsset[]
): string {
  // Base character prompt
  // Inject asset descriptions into appropriate positions
  // Clothing assets → body description
  // Scar assets → face/body detail
  // Accessory assets → additional detail
}
```

### New Job Types

**File**: `backend/src/queues/jobs/` (new files)

```typescript
// assetImageGenerationJob.ts
interface AssetImageGenerationJobData {
  assetId: string;
  imageType: 'preview' | 'transparent' | 'reference';
  style: VisualStyle;
}

// sceneImageGenerationJob.ts
interface SceneImageGenerationJobData {
  sceneId?: string;
  areaId?: string;
  imageType: 'cover' | 'environment' | 'map' | 'panorama';
  style: VisualStyle;
}

// characterWithAssetsGenerationJob.ts
interface CharacterWithAssetsGenerationJobData {
  characterId: string;
  includeAssets: boolean;  // Include linked assets in prompt
  imageType: 'avatar' | 'cover' | 'scene';
  style: VisualStyle;
}
```

### Generation Service

**File**: `backend/src/services/assetGenerationService.ts` (new)

```typescript
class AssetGenerationService {
  // Generate asset preview image
  async generateAssetImage(assetId: string, options: GenerationOptions): Promise<string>;

  // Generate scene/area environment image
  async generateSceneImage(sceneId: string, options: SceneGenerationOptions): Promise<string>;

  // Generate area image
  async generateAreaImage(areaId: string, options: AreaGenerationOptions): Promise<string>;

  // Generate top-down map
  async generateMapImage(sceneId: string, options: MapGenerationOptions): Promise<string>;

  // Generate character incorporating linked assets
  async generateCharacterWithAssets(characterId: string, options: GenerationOptions): Promise<string>;

  // Batch generate all assets for a game case
  async batchGenerateGameAssets(gameConfig: GameAssetConfig): Promise<BatchResult>;
}
```

### Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/assets/:id/generate` | Generate asset image |
| POST | `/api/v1/scenes/:id/generate` | Generate scene cover |
| POST | `/api/v1/scenes/areas/:areaId/generate` | Generate area image |
| POST | `/api/v1/scenes/:id/generate-map` | Generate scene map |
| POST | `/api/v1/characters/:id/generate-with-assets` | Generate character with assets |
| POST | `/api/v1/generation/batch` | Batch generate multiple assets |

---

## Phased Implementation

### Phase 1: Object & Environment Generation
- Object generation (transparent PNGs)
- Environment/interior generation
- Extend existing prompt engineering

### Phase 2: Reference-Based Character Generation
- Character + assets prompt building
- LoRA + asset description integration
- Consistent multi-asset rendering

### Phase 3: Map Generation
- Top-down map generation
- Template-based approach with ControlNet
- Post-processing for labels and legend

### Phase 4: Batch & Composition
- Batch pre-generation for game cases
- Scene composition (multiple elements)
- Quality validation pipeline

---

## Testing

### Unit Tests
- [ ] Object prompt building
- [ ] Environment prompt building
- [ ] Character + assets prompt building
- [ ] Map prompt building
- [ ] Batch job orchestration

### Integration Tests
- [ ] End-to-end object generation
- [ ] End-to-end environment generation
- [ ] Character with assets generation
- [ ] Batch generation pipeline

---

## Success Criteria

- [ ] Objects can be generated as transparent PNGs
- [ ] Scene/area environment images can be generated
- [ ] Characters can be generated incorporating their linked assets
- [ ] Batch generation can pre-generate all assets for a game
- [ ] All generated images are stored in R2 and linked to their entities
- [ ] Generation costs are tracked via credit system
