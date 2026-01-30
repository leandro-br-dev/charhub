# FEATURE-021: Asset Management System

**Status**: Backlog
**Priority**: P0 - Critical (Foundation)
**Type**: Core System
**Depends on**: None (foundational)
**Blocks**: FEATURE-022, FEATURE-023, FEATURE-024

---

## Overview

Expand the existing Attire model into a comprehensive Asset Management System that supports multiple asset types: clothing, scars, accessories, objects, weapons, and scenarios/locations. Assets can be linked to characters and used as context in chats, image generation, and games.

---

## Problem

Currently, only clothing (Attire) exists as a standalone asset type. To build games, we need:
- Objects (knife, poison, gun, key, letter)
- Physical traits (scars, tattoos, birthmarks)
- Accessories (jewelry, glasses, hats)
- Scenarios/Locations (mansion, room, garden) - handled in FEATURE-022
- Vehicles, furniture, and other environmental assets

Each asset needs visual representation (generated images), descriptive data, and the ability to be linked to characters or locations.

---

## Database Schema

### New Model: Asset

```prisma
enum AssetType {
  CLOTHING      // Existing attire functionality
  ACCESSORY     // Jewelry, glasses, hats, bags
  SCAR          // Scars, tattoos, birthmarks, wounds
  HAIRSTYLE     // Hair styles, colors, accessories
  OBJECT        // General objects (weapons, tools, items)
  VEHICLE       // Cars, horses, ships
  FURNITURE     // Tables, chairs, beds
  PROP          // Stage props, decorative items
}

enum AssetCategory {
  WEARABLE      // On character body (clothing, scars, accessories, hairstyles)
  HOLDABLE      // In character hands (weapons, tools, items)
  ENVIRONMENTAL // In scene (furniture, vehicles, props)
}

model Asset {
  id              String        @id @default(uuid())

  // Core data
  name            String
  description     String        @db.Text
  type            AssetType
  category        AssetCategory

  // Generation prompts
  promptPrimary   String        @db.Text   // Main prompt for generating this asset
  promptContext   String?       @db.Text   // Additional context for when used with characters
  negativePrompt  String?       @db.Text   // Negative prompt for generation

  // Placement info (for wearable/holdable)
  placementZone   String?       // "face", "torso", "left_hand", "right_hand", "head", "feet"
  placementDetail String?       // "left cheek", "across nose", "forehead"

  // Visual
  previewImageUrl String?

  // Classification
  style           VisualStyle?
  ageRating       AgeRating     @default(L)
  contentTags     ContentTag[]
  visibility      Visibility    @default(PRIVATE)

  // Ownership
  authorId        String
  author          User          @relation(fields: [authorId], references: [id])

  // Relations
  characterAssets CharacterAsset[]
  images          AssetImage[]
  tags            AssetTag[]

  // Metadata
  metadata        Json?         // Flexible extra data
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([type])
  @@index([category])
  @@index([authorId])
  @@index([visibility])
}

model AssetImage {
  id          String   @id @default(uuid())
  assetId     String
  asset       Asset    @relation(fields: [assetId], references: [id], onDelete: Cascade)

  imageUrl    String
  imageType   String   // "preview", "reference", "transparent", "in_context"
  width       Int?
  height      Int?

  createdAt   DateTime @default(now())

  @@index([assetId])
}

model AssetTag {
  id      String @id @default(uuid())
  assetId String
  asset   Asset  @relation(fields: [assetId], references: [id], onDelete: Cascade)
  tagId   String
  tag     Tag    @relation(fields: [tagId], references: [id])

  @@unique([assetId, tagId])
}
```

### Character-Asset Linking

```prisma
model CharacterAsset {
  id              String    @id @default(uuid())
  characterId     String
  character       Character @relation(fields: [characterId], references: [id], onDelete: Cascade)
  assetId         String
  asset           Asset     @relation(fields: [assetId], references: [id], onDelete: Cascade)

  // Placement override (can differ from asset default)
  placementZone   String?   // Override asset's default placement
  placementDetail String?   // Specific placement on this character

  // Context
  contextNote     String?   @db.Text  // "Helena always wears this ring on her left hand"
  isVisible       Boolean   @default(true)  // Can be hidden (secret scar)
  isPrimary       Boolean   @default(false) // Primary asset of this type

  // Order
  displayOrder    Int       @default(0)

  createdAt       DateTime  @default(now())

  @@unique([characterId, assetId])
  @@index([characterId])
  @@index([assetId])
}
```

### Migration from Attire

The existing `Attire` model will be preserved for backward compatibility but new features should use the `Asset` model. A migration path:
1. Create Asset model alongside Attire
2. Create migration script to copy Attire data into Asset (type: CLOTHING)
3. Update character linking to support both
4. Deprecate Attire in favor of Asset over time

---

## Backend Implementation

### AssetService

**File**: `backend/src/services/assetService.ts`

**Methods**:
- `createAsset(data)` - Create new asset
- `updateAsset(id, data)` - Update asset
- `deleteAsset(id)` - Delete asset
- `getAsset(id)` - Get single asset with images
- `listAssets(filters)` - List with pagination, type/category filters
- `searchAssets(query)` - Full-text search
- `linkAssetToCharacter(characterId, assetId, placement)` - Link asset to character
- `unlinkAssetFromCharacter(characterId, assetId)` - Unlink
- `getCharacterAssets(characterId)` - Get all assets for a character
- `getAssetCharacters(assetId)` - Get all characters using an asset
- `buildCharacterAssetContext(characterId)` - Build text context of all character assets for LLM

### Asset Context Builder

When generating LLM prompts for a character, include their assets:

```typescript
async function buildCharacterAssetContext(characterId: string): Promise<string> {
  const assets = await getCharacterAssets(characterId);

  if (assets.length === 0) return '';

  const lines = assets
    .filter(ca => ca.isVisible)
    .map(ca => {
      const placement = ca.placementDetail || ca.asset.placementDetail || '';
      const note = ca.contextNote || '';
      return `- ${ca.asset.name} (${ca.asset.type}): ${ca.asset.description}${placement ? ` [${placement}]` : ''}${note ? ` - ${note}` : ''}`;
    });

  return `\n[CHARACTER ASSETS]\n${lines.join('\n')}\n`;
}
```

### Routes

**File**: `backend/src/routes/v1/assets.ts`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/assets` | Create asset |
| GET | `/api/v1/assets` | List assets (with filters) |
| GET | `/api/v1/assets/:id` | Get asset details |
| PUT | `/api/v1/assets/:id` | Update asset |
| DELETE | `/api/v1/assets/:id` | Delete asset |
| POST | `/api/v1/assets/:id/images` | Upload/generate asset image |
| POST | `/api/v1/characters/:id/assets` | Link asset to character |
| DELETE | `/api/v1/characters/:id/assets/:assetId` | Unlink asset |
| GET | `/api/v1/characters/:id/assets` | Get character assets |

---

## Frontend Implementation

### Asset Management Pages
- Asset list page with type/category filters
- Asset creation form (type, description, prompts, classification)
- Asset detail page with images, linked characters
- Character profile: "Assets" tab showing linked assets

### Asset Picker Component
Reusable component for selecting assets in:
- Character editor (link assets to character)
- Game builder (select game objects)
- Scene editor (place assets in locations)

---

## Testing

### Unit Tests
- [ ] AssetService CRUD operations
- [ ] Character-Asset linking/unlinking
- [ ] Asset context builder output
- [ ] Asset search and filtering
- [ ] Migration from Attire

### Integration Tests
- [ ] Asset API endpoints
- [ ] Image upload for assets
- [ ] Character-Asset relationship integrity

---

## Success Criteria

- [ ] All asset types can be created, edited, deleted
- [ ] Assets can be linked to characters with placement data
- [ ] Asset context is included in LLM prompts for characters
- [ ] Asset images can be generated or uploaded
- [ ] Existing Attire data can be migrated
- [ ] Assets are searchable by type, category, tags
