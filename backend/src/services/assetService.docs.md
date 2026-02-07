# Asset Service

**Purpose**: Manage asset CRUD operations and business logic for the Asset System (FEATURE-021).

**Location**: `backend/src/services/assetService.ts`

---

## Overview

The AssetService handles all asset-related database operations including creating, reading, updating, and deleting assets. Assets represent items that characters can wear, hold, or interact with. The service also manages character-asset relationships, favorites, and provides context building for LLM integration.

Assets are organized by:
- **Type**: CLOTHING, ACCESSORY, SCAR, HAIRSTYLE, OBJECT, WEAPON, VEHICLE, FURNITURE, PROP
- **Category**: WEARABLE, HOLDABLE, ENVIRONMENTAL

---

## Key Types

### AssetWithComputedFields

Extends the base Asset type with computed fields for frontend compatibility:

```typescript
interface AssetWithComputedFields {
  // ... all Asset fields
  previewUrl: string | null;      // Alias for previewImageUrl
  thumbnailUrl: string | null;    // First preview-type image or first image overall
  format: string | null;          // Derived from image URL (WEBP, PNG, JPG, GIF)
}
```

### CreateAssetInput

```typescript
interface CreateAssetInput {
  name: string;
  description: string;
  type: AssetType;
  category: AssetCategory;
  previewImageUrl?: string | null;
  style?: VisualStyle | null;
  ageRating?: string;
  contentTags?: ContentTag[];
  visibility?: Visibility;
  authorId: string;
  originalLanguageCode?: string | null;
  tagIds?: string[];
}
```

### UpdateAssetInput

All fields from CreateAssetInput except `authorId`, all optional.

### ListAssetsFilters

```typescript
interface ListAssetsFilters {
  authorId?: string;
  type?: AssetType | AssetType[];      // Supports single or array
  category?: AssetCategory | AssetCategory[];  // Supports single or array
  search?: string;
  visibility?: Visibility;
  style?: string;
  skip?: number;
  limit?: number;
}
```

---

## CRUD Operations

### `createAsset(data: CreateAssetInput): Promise<Asset>`

Creates a new asset with optional tag associations.

**Parameters**:
- `data` - Asset creation data (see CreateAssetInput above)

**Returns**: Created asset with full relations

**Validation**:
- `name`, `description`, `type`, `category` are required
- `contentTags` defaults to empty array
- `style` defaults to null
- Tags are associated via junction table if `tagIds` provided

**Example**:
```typescript
const newAsset = await createAsset({
  name: 'Medieval Sword',
  description: 'A steel sword from the medieval era',
  type: 'WEAPON',
  category: 'HOLDABLE',
  authorId: user.id,
  tagIds: ['weapon-tag-id', 'medieval-tag-id']
});
```

---

### `getAssetById(assetId: string): Promise<AssetWithComputedFields | null>`

Fetches a single asset by ID with all relations.

**Parameters**:
- `assetId` - Asset UUID

**Returns**: Asset with computed fields or null if not found

**Includes**:
- Author (id, username, displayName, avatarUrl)
- Images (ordered by creation date)
- Tags with tag details
- Usage count (_count.characterAssets)

---

### `listAssets(filters: ListAssetsFilters): Promise<AssetWithComputedFields[]>`

Lists assets with filtering and pagination.

**Parameters**:
- `filters` - Filter criteria (see ListAssetsFilters above)

**Features**:
- Multi-value type and category filtering (array or single value)
- Case-insensitive search across name and description
- Default ordering: newest first
- Returns assets with computed fields

**Example**:
```typescript
// Get user's wearable and holdable assets
const assets = await listAssets({
  authorId: userId,
  category: ['WEARABLE', 'HOLDABLE'],
  limit: 50
});

// Search public assets
const results = await listAssets({
  search: 'sword',
  type: 'WEAPON'
});
```

---

### `searchAssets(query: string, options?): Promise<AssetWithComputedFields[]>`

Full-text search across asset names and descriptions.

**Parameters**:
- `query` - Search term
- `options` - Optional filters (type, category, authorId, skip, limit)

**Returns**: Matching assets with computed fields

---

### `updateAsset(assetId: string, data: UpdateAssetInput): Promise<Asset>`

Updates an existing asset.

**Parameters**:
- `assetId` - Asset UUID
- `data` - Fields to update (all optional)

**Features**:
- Replaces all existing tags when `tagIds` provided
- Updates `contentTags` and `style` if provided
- Returns updated asset with relations

---

### `deleteAsset(assetId: string): Promise<Asset>`

Permanently deletes an asset.

**Parameters**:
- `assetId` - Asset UUID

**Warning**: This is a hard delete. All character-asset relationships will also be deleted due to cascade.

---

## Character-Asset Relationships

### `linkAssetToCharacter(characterId, assetId, data?): Promise<CharacterAsset>`

Associates an asset with a character.

**Parameters**:
- `characterId` - Character UUID
- `assetId` - Asset UUID
- `data` - Optional placement and visibility settings:
  - `placementZone`: Body location (e.g., "head", "chest")
  - `placementDetail`: Specific position (e.g., "left hand")
  - `contextNote`: Usage notes for LLM context
  - `isVisible`: Whether asset is visible (default: true)
  - `isPrimary`: Whether this is the primary asset of this type (default: false)
  - `displayOrder`: Display order (default: 0)

**Returns**: CharacterAsset relation with both asset and character data

---

### `unlinkAssetFromCharacter(characterId, assetId): Promise<CharacterAsset>`

Removes an asset from a character.

**Parameters**:
- `characterId` - Character UUID
- `assetId` - Asset UUID

---

### `getCharacterAssets(characterId): Promise<CharacterAsset[]>`

Gets all assets associated with a character.

**Parameters**:
- `characterId` - Character UUID

**Returns**: Array of CharacterAsset relations ordered by `displayOrder`

---

### `getAssetCharacters(assetId): Promise<CharacterAsset[]>`

Gets all characters that use an asset.

**Parameters**:
- `assetId` - Asset UUID

**Returns**: Array of CharacterAsset relations with character details

---

### `updateCharacterAsset(characterId, assetId, data): Promise<CharacterAsset>`

Updates the relationship between a character and asset.

**Parameters**:
- `characterId` - Character UUID
- `assetId` - Asset UUID
- `data` - Fields to update (same as linkAssetToCharacter data)

---

## Context Building

### `buildCharacterAssetContext(characterId): Promise<string>`

Builds a text description of all character assets for LLM consumption.

**Parameters**:
- `characterId` - Character UUID

**Returns**: Markdown-formatted text with:
- Worn items (WEARABLE category) with placement info
- Held items (HOLDABLE category) with position
- Environmental items (ENVIRONMENTAL category)
- Visibility indicators for hidden items
- Context notes for each asset

**Output Format**:
```markdown
## Worn Items:
- Leather Armor (on torso): Basic leather armor protection
- Steel Helmet (on head): Heavy steel helmet [Damaged in battle]

## Held Items:
- Longsword (in right hand): A well-balanced steel sword

## Environmental Items:
- Camp Tent: A simple canvas tent for shelter
```

---

## Favorites

### `toggleFavoriteAsset(userId, assetId, isFavorite): Promise<{success, isFavorite}>`

Adds or removes an asset from user's favorites.

**Parameters**:
- `userId` - User UUID
- `assetId` - Asset UUID
- `isFavorite` - True to add, false to remove

**Returns**: Success status and current favorite state

---

### `getFavoriteAssets(userId, options?): Promise<AssetWithComputedFields[]>`

Gets user's favorite assets.

**Parameters**:
- `userId` - User UUID
- `options` - Pagination (skip, limit)

**Returns**: Assets ordered by most recently favorited

---

### `getAssetStats(assetId, userId?): Promise<{id, isFavoritedByUser, characterCount, imageCount}>`

Gets statistics for an asset.

**Parameters**:
- `assetId` - Asset UUID
- `userId` - Optional user UUID to check favorite status

**Returns**:
- `id` - Asset ID
- `isFavoritedByUser` - Whether the user has favorited this asset
- `characterCount` - Number of characters using this asset
- `imageCount` - Number of images for this asset

---

## Utility Functions

### `isAssetOwner(assetId, userId): Promise<boolean>`

Checks if a user owns an asset.

**Parameters**:
- `assetId` - Asset UUID
- `userId` - User UUID

**Returns**: True if user is the asset author

---

### `getAssetCountByUser(userId): Promise<number>`

Counts assets created by a user.

**Parameters**:
- `userId` - User UUID

**Returns**: Number of assets

---

### `getPublicAssets(options?): Promise<AssetWithComputedFields[]>`

Gets only public assets.

**Parameters**:
- `options` - Filters (type, category, search, skip, limit)

**Returns**: Public assets with computed fields

---

## Data Flows

### Asset Creation Flow

1. Client submits asset data
2. `createAsset` creates database record
3. Tags are associated via junction table
4. Image uploads happen separately via `/api/v1/assets/:id/images`
5. Preview image updates `previewImageUrl` field

### Character Asset Linking Flow

1. Client calls link endpoint with character and asset IDs
2. `linkAssetToCharacter` creates CharacterAsset relation
3. Placement and visibility settings are stored
4. Asset appears in character's asset list
5. Context builder includes asset in character's LLM context

### Asset Search Flow

1. Client provides search term and filters
2. `searchAssets` or `listAssets` queries database
3. Results are transformed with computed fields
4. Assets include author, images, tags, and usage counts

---

## Edge Cases

### Image Handling

- Images are stored externally (R2/S3)
- `previewImageUrl` is a direct URL
- `thumbnailUrl` is computed from images array
- `format` is derived from image URL extension
- Image processing happens in separate service

### Tag Management

- Tags are associated via junction table
- Updating tags replaces all existing associations
- Empty `tagIds` array does not clear existing tags
- Omit `tagIds` entirely to keep existing tags unchanged

### Character Asset Relationships

- Multiple characters can use the same asset
- The same asset can be linked multiple times to one character (different placements)
- Deleting an asset cascades to CharacterAsset relations
- Deleting a character cascades to CharacterAsset relations

### Visibility

- `PUBLIC` assets are visible to all users
- `PRIVATE` assets only visible to author
- Linking private assets to characters does not make them public

---

## Dependencies

- **PrismaService** - Database operations via `prisma`
- **LoggerService** - Structured logging via `logger`

---

## Related

- `backend/src/routes/v1/assets.docs.md` - API endpoints
- `Asset` model - Database schema in `schema.prisma`
- `CharacterAsset` model - Junction table for character-asset relationships
- `AssetFavorite` model - User favorites
- `AssetImage` model - Asset images
