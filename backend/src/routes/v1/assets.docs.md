# Assets API Routes

**Purpose**: Expose asset management API endpoints.

**Location**: `backend/src/routes/v1/assets.ts`

**Base Route**: `/api/v1/assets`

---

## Overview

The Assets API provides full CRUD operations for assets, character-asset relationships, and image management. All asset endpoints require authentication except those marked with `optionalAuth`.

**Authentication**:
- `requireAuth` - User must be authenticated
- `optionalAuth` - Unauthenticated users receive limited data

---

## Endpoints

### `POST /api/v1/assets`

Create a new asset.

**Authentication**: Required

**Request Body**:

```json
{
  "name": "Medieval Sword",
  "description": "A well-balanced steel sword from the medieval era",
  "type": "WEAPON",
  "category": "HOLDABLE",
  "previewImageUrl": "https://example.com/sword.jpg",
  "style": "REALISTIC",
  "ageRating": "TEEN",
  "contentTags": ["VIOLENCE"],
  "visibility": "PUBLIC",
  "tagIds": ["tag-uuid-1", "tag-uuid-2"]
}
```

**Required Fields**: `name`, `description`, `type`, `category`

**Response**: `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Medieval Sword",
    "description": "A well-balanced steel sword...",
    "type": "WEAPON",
    "category": "HOLDABLE",
    "previewImageUrl": "https://example.com/sword.jpg",
    "authorId": "user-uuid",
    "author": {
      "id": "user-uuid",
      "displayName": "Username",
      "avatarUrl": "https://..."
    },
    "images": [],
    "tags": [],
    "_count": {
      "characterAssets": 0
    },
    "createdAt": "2026-01-15T10:00:00Z"
  }
}
```

**Response**: `400 Bad Request` - Validation failed

```json
{
  "error": "Validation failed",
  "details": {
    "message": "name, description, type, and category are required"
  }
}
```

---

### `POST /api/v1/assets/autocomplete`

Given partial asset fields, return proposed values for missing ones using AI or web search.

**Authentication**: Required

**Request Body**:

```json
{
  "mode": "ai",  // or "web"
  "payload": {
    "name": "Medieval Sword",
    "type": "WEAPON"
  }
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "description": "A well-balanced steel sword from the medieval era...",
    "category": "HOLDABLE",
    "style": "REALISTIC",
    "ageRating": "TEEN",
    "contentTags": ["VIOLENCE"]
  }
}
```

---

### `GET /api/v1/assets`

List assets with filters.

**Authentication**: Optional

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `types` | string | Comma-separated asset types (e.g., `CLOTHING,WEAPON`) |
| `categories` | string | Comma-separated categories (e.g., `WEARABLE,HOLDABLE`) |
| `search` | string | Search term for name/description |
| `authorId` | string | Filter by author (requires ownership if not public) |
| `visibility` | string | Filter by visibility |
| `style` | string | Filter by visual style |
| `skip` | number | Pagination offset (default: 0) |
| `limit` | number | Results per page (default: 20) |
| `public` | boolean | Set to `true` to get only public assets |

**Behavior**:
- If `authorId` provided: Returns that user's assets (if owned) or public assets
- If authenticated and no `authorId`: Returns user's own assets
- If `public=true`: Returns only public assets
- Otherwise: Returns public assets

**Response**: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Medieval Sword",
      "description": "...",
      "type": "WEAPON",
      "category": "HOLDABLE",
      "previewUrl": "https://...",
      "thumbnailUrl": "https://...",
      "format": "WEBP",
      "author": { "id": "...", "displayName": "..." },
      "images": [],
      "tags": [],
      "_count": { "characterAssets": 5 }
    }
  ],
  "count": 50
}
```

**Multi-value Filter Example**:
```
GET /api/v1/assets?types=CLOTHING,WEAPON&categories=WEARABLE,HOLDABLE
```

---

### `GET /api/v1/assets/favorites`

Get user's favorite assets.

**Authentication**: Required

**Must come BEFORE** `/:id` route to avoid "favorites" being captured as an ID.

**Query Parameters**:
- `skip` - Pagination offset (default: 0)
- `limit` - Results per page (default: 20)

**Response**: `200 OK`

```json
{
  "success": true,
  "data": [...],
  "count": 10
}
```

---

### `POST /api/v1/assets/:id/favorite`

Toggle favorite status for an asset.

**Authentication**: Required

**Must come BEFORE** `/:id` route to match `/id/favorite` pattern.

**Request Body**:

```json
{
  "isFavorite": true
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "success": true,
    "isFavorite": true
  }
}
```

---

### `GET /api/v1/assets/:id/stats`

Get asset statistics (favorite status, usage count, etc.).

**Authentication**: Optional

**Must come BEFORE** `/:id` route to match `/id/stats` pattern.

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "asset-uuid",
    "isFavoritedByUser": true,
    "characterCount": 5,
    "imageCount": 3
  }
}
```

---

### `GET /api/v1/assets/:id`

Get a specific asset by ID.

**Authentication**: Optional

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Medieval Sword",
    "description": "...",
    "type": "WEAPON",
    "category": "HOLDABLE",
    "previewUrl": "https://...",
    "thumbnailUrl": "https://...",
    "format": "WEBP",
    "author": { ... },
    "images": [
      {
        "id": "image-uuid",
        "imageUrl": "https://...",
        "imageType": "preview",
        "width": 800,
        "height": 600
      }
    ],
    "tags": [ ... ],
    "_count": { "characterAssets": 5 }
  }
}
```

**Response**: `403 Forbidden` - Asset is private and user is not owner

**Response**: `404 Not Found` - Asset not found

---

### `PUT /api/v1/assets/:id`

Update an asset.

**Authentication**: Required (owner only)

**Request Body** (all fields optional):

```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "type": "WEAPON",
  "category": "HOLDABLE",
  "previewImageUrl": "https://...",
  "style": "REALISTIC",
  "ageRating": "TEEN",
  "contentTags": ["VIOLENCE"],
  "visibility": "PUBLIC",
  "tagIds": ["tag-uuid-1", "tag-uuid-2"]
}
```

**Response**: `200 OK`

Returns updated asset object.

**Response**: `403 Forbidden` - User is not the asset owner

---

### `DELETE /api/v1/assets/:id`

Delete an asset.

**Authentication**: Required (owner only)

**Response**: `204 No Content`

**Response**: `403 Forbidden` - User is not the asset owner

**Warning**: This is a hard delete. All character-asset relationships will also be deleted.

---

### `POST /api/v1/assets/:id/images`

Upload an asset image.

**Authentication**: Required (owner only)

**Content-Type**: `multipart/form-data`

**Form Data**:
- `image` - Image file (PNG, JPG, WEBP, GIF, max 10MB)
- `imageType` - Image type: `preview`, `reference`, `transparent`, `in_context` (default: `preview`)

**Image Processing**:
- Original image is compressed and converted to WebP
- Maximum dimensions based on type
- Stored in R2/S3-compatible storage

**Response**: `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "image-uuid",
    "assetId": "asset-uuid",
    "imageUrl": "https://...",
    "imageType": "preview",
    "width": 800,
    "height": 600,
    "createdAt": "2026-01-15T10:00:00Z"
  }
}
```

**Response**: `503 Service Unavailable` - Media storage not configured

---

## Character Asset Endpoints

### `POST /api/v1/assets/characters/:id/assets`

Link an asset to a character.

**Authentication**: Required (character owner only)

**Request Body**:

```json
{
  "assetId": "asset-uuid",
  "placementZone": "right_hand",
  "placementDetail": "grip firmly",
  "contextNote": "Used for combat",
  "isVisible": true,
  "isPrimary": true,
  "displayOrder": 0
}
```

**Required Fields**: `assetId`

**Response**: `201 Created`

```json
{
  "success": true,
  "data": {
    "characterId": "character-uuid",
    "assetId": "asset-uuid",
    "placementZone": "right_hand",
    "placementDetail": "grip firmly",
    "contextNote": "Used for combat",
    "isVisible": true,
    "isPrimary": true,
    "displayOrder": 0,
    "character": { "id": "...", "firstName": "...", "lastName": "..." },
    "asset": { "id": "...", "name": "...", "type": "..." }
  }
}
```

---

### `PUT /api/v1/assets/characters/:id/assets/:assetId`

Update character asset link.

**Authentication**: Required (character owner only)

**Request Body** (all optional):

```json
{
  "placementZone": "left_hand",
  "placementDetail": "held loosely",
  "contextNote": "Not currently in use",
  "isVisible": false,
  "isPrimary": false,
  "displayOrder": 1
}
```

**Response**: `200 OK`

Returns updated character asset relation.

---

### `DELETE /api/v1/assets/characters/:id/assets/:assetId`

Unlink asset from character.

**Authentication**: Required (character owner only)

**Response**: `204 No Content`

---

### `GET /api/v1/assets/characters/:id/assets`

Get character assets.

**Authentication**: Optional

**Response**: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "characterId": "...",
      "assetId": "...",
      "placementZone": "right_hand",
      "isVisible": true,
      "displayOrder": 0,
      "asset": {
        "id": "...",
        "name": "Medieval Sword",
        "type": "WEAPON",
        "previewImageUrl": "https://..."
      }
    }
  ],
  "count": 5
}
```

---

## Error Responses

All endpoints may return:

**`401 Unauthorized`**

```json
{ "error": "Unauthorized" }
```

**`403 Forbidden`**

```json
{ "error": "You don't have permission" }
```

**`415 Unsupported Media Type`**

```json
{
  "error": "Unsupported image format. Use PNG, JPG, WEBP or GIF."
}
```

**`503 Service Unavailable`** - Media storage not configured

```json
{
  "error": "Media storage is not configured",
  "details": { "missing": ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID"] }
}
```

**`500 Internal Server Error`**

```json
{ "error": "Internal server error" }
```

---

## Route Ordering Notes

**Important**: Routes with specific path patterns must be declared BEFORE the generic `/:id` route:

1. `GET /api/v1/assets/favorites` - Must come before `/:id`
2. `POST /api/v1/assets/:id/favorite` - Must come before `/:id`
3. `GET /api/v1/assets/:id/stats` - Must come before `/:id`
4. `GET /api/v1/assets/:id` - Generic route (must be last)

---

## Related

- `backend/src/services/assetService.docs.md` - Business logic
- `Asset` model - Database schema
- `CharacterAsset` model - Character-asset junction table
