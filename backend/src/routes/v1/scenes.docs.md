# Scenes API Routes

**Purpose**: Expose scene and area management API endpoints.

**Location**: `backend/src/routes/v1/scenes.ts`

**Base Route**: `/api/v1/scenes`

---

## Overview

The Scenes API provides full CRUD operations for scenes, areas, area connections, and asset placement. It also handles scene and area image management. All scene endpoints require authentication except those marked with `optionalAuth`.

**Authentication**:
- `requireAuth` - User must be authenticated
- `optionalAuth` - Unauthenticated users receive limited data

---

## Scene CRUD Endpoints

### `POST /api/v1/scenes`

Create a new scene.

**Authentication**: Required

**Request Body**:

```json
{
  "name": "Medieval Castle",
  "description": "An imposing stone castle on the hill",
  "shortDescription": "A grand medieval fortress",
  "genre": "Fantasy",
  "era": "Medieval",
  "mood": "Mysterious",
  "style": "REALISTIC",
  "imagePrompt": "A grand medieval castle on a hill...",
  "mapPrompt": "Overhead map of castle layout...",
  "coverImageUrl": "https://example.com/cover.jpg",
  "mapImageUrl": "https://example.com/map.jpg",
  "ageRating": "TEEN",
  "contentTags": ["FANTASY_VIOLENCE"],
  "visibility": "PUBLIC",
  "tagIds": ["tag-uuid-1", "tag-uuid-2"],
  "initialAreas": [
    {
      "name": "Throne Room",
      "description": "A grand throne room with high ceilings",
      "shortDescription": "The castle's main hall",
      "displayOrder": 0,
      "isAccessible": true
    }
  ]
}
```

**Required Fields**: `name`, `description`

**Response**: `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Medieval Castle",
    "description": "An imposing stone castle on the hill",
    "shortDescription": "A grand medieval fortress",
    "genre": "Fantasy",
    "era": "Medieval",
    "mood": "Mysterious",
    "style": "REALISTIC",
    "coverImageUrl": "https://...",
    "mapImageUrl": "https://...",
    "authorId": "user-uuid",
    "author": {
      "id": "user-uuid",
      "username": "username",
      "displayName": "Display Name",
      "avatarUrl": "https://..."
    },
    "areas": [
      {
        "id": "area-uuid",
        "name": "Throne Room",
        "description": "A grand throne room...",
        "displayOrder": 0,
        "isAccessible": true,
        "assets": [],
        "connections": [],
        "connectedFrom": []
      }
    ],
    "images": [],
    "tags": [],
    "_count": {
      "areas": 1
    },
    "createdAt": "2026-01-15T10:00:00Z"
  }
}
```

---

### `POST /api/v1/scenes/autocomplete`

Given partial scene fields, return proposed values for missing ones using AI or web search.

**Authentication**: Required

**Request Body**:

```json
{
  "mode": "ai",  // or "web"
  "payload": {
    "name": "Medieval Castle",
    "genre": "Fantasy"
  }
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "description": "An imposing stone castle on the hill...",
    "shortDescription": "A grand medieval fortress",
    "era": "Medieval",
    "mood": "Mysterious",
    "style": "REALISTIC",
    "imagePrompt": "A grand medieval castle...",
    "mapPrompt": "Overhead map of castle..."
  }
}
```

---

### `GET /api/v1/scenes`

List scenes with filters.

**Authentication**: Optional

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `genre` | string | Filter by genre |
| `mood` | string | Filter by mood |
| `era` | string | Filter by era |
| `search` | string | Search term for name/description/shortDescription |
| `visibility` | string | Filter by visibility |
| `style` | string | Filter by visual style |
| `authorId` | string | Filter by author (requires ownership if not public) |
| `skip` | number | Pagination offset (default: 0) |
| `limit` | number | Results per page (default: 20) |
| `public` | boolean | Set to `true` to get only public scenes |

**Behavior**:
- If `authorId` provided: Returns that user's scenes (if owned) or public scenes
- If authenticated and no `authorId`: Returns user's own scenes
- If `public=true`: Returns only public scenes
- Otherwise: Returns public scenes

**Response**: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Medieval Castle",
      "description": "...",
      "shortDescription": "...",
      "genre": "Fantasy",
      "era": "Medieval",
      "mood": "Mysterious",
      "coverImageUrl": "https://...",
      "author": { "id": "...", "displayName": "..." },
      "areas": [],
      "_count": { "areas": 3 }
    }
  ],
  "count": 20
}
```

---

### `GET /api/v1/scenes/favorites`

Get user's favorite scenes.

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

### `POST /api/v1/scenes/:id/favorite`

Toggle favorite status for a scene.

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

### `GET /api/v1/scenes/:id/stats`

Get scene statistics (favorite status, area count, etc.).

**Authentication**: Optional

**Must come BEFORE** `/:id` route to match `/id/stats` pattern.

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "scene-uuid",
    "isFavoritedByUser": true,
    "areaCount": 5,
    "imageCount": 3
  }
}
```

---

### `GET /api/v1/scenes/:id`

Get a specific scene by ID with areas.

**Authentication**: Optional

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Medieval Castle",
    "description": "...",
    "shortDescription": "...",
    "genre": "Fantasy",
    "era": "Medieval",
    "mood": "Mysterious",
    "coverImageUrl": "https://...",
    "mapImageUrl": "https://...",
    "author": { ... },
    "areas": [
      {
        "id": "area-uuid",
        "name": "Throne Room",
        "description": "A grand throne room...",
        "displayOrder": 0,
        "isAccessible": true,
        "assets": [
          {
            "id": "junction-uuid",
            "areaId": "area-uuid",
            "assetId": "asset-uuid",
            "position": "at the front",
            "isHidden": false,
            "isInteractable": true,
            "displayOrder": 0,
            "asset": {
              "id": "asset-uuid",
              "name": "Gold Throne",
              "type": "FURNITURE",
              "category": "ENVIRONMENTAL",
              "previewImageUrl": "https://..."
            }
          }
        ],
        "connections": [
          {
            "id": "conn-uuid",
            "fromAreaId": "area-uuid",
            "toAreaId": "area-uuid-2",
            "direction": "down the stairs",
            "description": "A dark staircase",
            "isLocked": false,
            "toArea": {
              "id": "area-uuid-2",
              "name": "Dungeon",
              "shortDescription": "Dark prison cells"
            }
          }
        ],
        "connectedFrom": []
      }
    ],
    "images": [],
    "tags": [],
    "_count": { "areas": 3 }
  }
}
```

**Response**: `403 Forbidden` - Scene is private and user is not owner

**Response**: `404 Not Found` - Scene not found

---

### `PUT /api/v1/scenes/:id`

Update a scene.

**Authentication**: Required (owner only)

**Request Body** (all optional except `name`, `description`):

```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "shortDescription": "...",
  "genre": "Fantasy",
  "era": "Medieval",
  "mood": "Mysterious",
  "style": "REALISTIC",
  "coverImageUrl": "https://...",
  "mapImageUrl": "https://...",
  "ageRating": "TEEN",
  "contentTags": ["FANTASY_VIOLENCE"],
  "visibility": "PUBLIC",
  "tagIds": ["tag-uuid-1"]
}
```

**Response**: `200 OK`

Returns updated scene object.

**Response**: `403 Forbidden` - User is not the scene owner

---

### `DELETE /api/v1/scenes/:id`

Delete a scene.

**Authentication**: Required (owner only)

**Response**: `204 No Content`

**Response**: `403 Forbidden` - User is not the scene owner

**Warning**: Cascades to delete all areas, connections, and area assets.

---

### `GET /api/v1/scenes/:id/map`

Get full scene map data with all areas, assets, and connections.

**Authentication**: Optional

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "scene": {
      "id": "scene-uuid",
      "name": "Medieval Castle",
      "description": "...",
      "shortDescription": "...",
      "genre": "Fantasy",
      "era": "Medieval",
      "mood": "Mysterious",
      "style": "REALISTIC",
      "mapImageUrl": "https://..."
    },
    "areas": [
      {
        "id": "area-uuid",
        "name": "Throne Room",
        "description": "...",
        "displayOrder": 0,
        "isAccessible": true,
        "environmentImageUrl": "https://...",
        "mapImageUrl": "https://...",
        "assets": [
          {
            "id": "asset-uuid",
            "name": "Gold Throne",
            "description": "An ornate golden throne",
            "type": "FURNITURE",
            "category": "ENVIRONMENTAL",
            "previewImageUrl": "https://...",
            "position": "at the front",
            "isHidden": false,
            "isInteractable": true,
            "discoveryHint": null,
            "displayOrder": 0
          }
        ],
        "connections": [
          {
            "toAreaId": "area-uuid-2",
            "toAreaName": "Dungeon",
            "toAreaShortDescription": "Dark prison cells",
            "direction": "down the stairs",
            "description": "A dark staircase",
            "isLocked": false,
            "lockHint": null
          }
        ]
      }
    ]
  }
}
```

---

## Area Management Endpoints

### `POST /api/v1/scenes/:id/areas`

Add an area to a scene.

**Authentication**: Required (scene owner only)

**Request Body**:

```json
{
  "name": "Dungeon",
  "description": "Dark and damp prison cells",
  "shortDescription": "The castle's dungeon",
  "imagePrompt": "A dark dungeon...",
  "mapPrompt": "Dungeon layout...",
  "environmentImageUrl": "https://...",
  "mapImageUrl": "https://...",
  "displayOrder": 1,
  "isAccessible": true,
  "metadata": {}
}
```

**Required Fields**: `name`, `description`

**Response**: `201 Created`

Returns created area with full relations.

---

### `GET /api/v1/scenes/areas/:areaId`

Get area details.

**Authentication**: Optional

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "area-uuid",
    "name": "Dungeon",
    "description": "Dark and damp prison cells",
    "sceneId": "scene-uuid",
    "scene": {
      "id": "scene-uuid",
      "name": "Medieval Castle",
      "shortDescription": "A grand medieval fortress",
      "visibility": "PUBLIC",
      "authorId": "user-uuid"
    },
    "assets": [],
    "connections": [],
    "connectedFrom": [],
    "images": []
  }
}
```

---

### `PUT /api/v1/scenes/areas/:areaId`

Update an area.

**Authentication**: Required (scene owner only)

**Request Body** (all optional):

```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "displayOrder": 2,
  "isAccessible": false,
  "metadata": {}
}
```

**Response**: `200 OK`

Returns updated area.

---

### `DELETE /api/v1/scenes/areas/:areaId`

Remove an area.

**Authentication**: Required (scene owner only)

**Response**: `204 No Content`

**Warning**: Cascades to delete area assets, connections, and images.

---

### `GET /api/v1/scenes/:id/areas`

List all areas for a scene.

**Authentication**: Optional

**Response**: `200 OK`

```json
{
  "success": true,
  "data": [...],
  "count": 5
}
```

---

### `GET /api/v1/scenes/:id/areas/:areaId`

Get area details with images (alternate route for scene context).

**Authentication**: Optional

**Response**: `200 OK`

Same as `GET /api/v1/scenes/areas/:areaId` but verifies area belongs to scene.

---

## Asset-Area Linking Endpoints

### `POST /api/v1/scenes/areas/:areaId/assets`

Place an asset in an area.

**Authentication**: Required (scene owner only)

**Request Body**:

```json
{
  "assetId": "asset-uuid",
  "position": "on the wall",
  "isHidden": false,
  "isInteractable": true,
  "discoveryHint": null,
  "metadata": {},
  "displayOrder": 0
}
```

**Required Fields**: `assetId`

**Response**: `201 Created`

```json
{
  "success": true,
  "data": {
    "areaId": "area-uuid",
    "assetId": "asset-uuid",
    "position": "on the wall",
    "isHidden": false,
    "isInteractable": true,
    "displayOrder": 0,
    "asset": {
      "id": "asset-uuid",
      "name": "Torch",
      "description": "A wall-mounted torch",
      "type": "PROP",
      "category": "ENVIRONMENTAL",
      "previewImageUrl": "https://..."
    },
    "area": {
      "id": "area-uuid",
      "name": "Dungeon",
      "sceneId": "scene-uuid"
    }
  }
}
```

---

### `GET /api/v1/scenes/areas/:areaId/assets`

Get area assets.

**Authentication**: Optional

**Response**: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "areaId": "area-uuid",
      "assetId": "asset-uuid",
      "position": "on the wall",
      "isHidden": false,
      "isInteractable": true,
      "displayOrder": 0,
      "asset": { ... }
    }
  ],
  "count": 10
}
```

---

### `PUT /api/v1/scenes/areas/:areaId/assets/:assetId`

Update area asset.

**Authentication**: Required (scene owner only)

**Request Body** (all optional):

```json
{
  "position": "hidden behind the painting",
  "isHidden": true,
  "isInteractable": true,
  "discoveryHint": "Look behind the painting",
  "displayOrder": 1
}
```

**Response**: `200 OK`

Returns updated area asset relation.

---

### `DELETE /api/v1/scenes/areas/:areaId/assets/:assetId`

Remove asset from area.

**Authentication**: Required (scene owner only)

**Response**: `204 No Content`

---

## Area Connection Endpoints

### `POST /api/v1/scenes/areas/:areaId/connections`

Connect two areas.

**Authentication**: Required (scene owner only)

**Request Body**:

```json
{
  "toAreaId": "target-area-uuid",
  "direction": "down the stairs",
  "description": "A dark spiral staircase",
  "isLocked": false,
  "lockHint": null
}
```

**Required Fields**: `toAreaId`

**Response**: `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "conn-uuid",
    "fromAreaId": "area-uuid",
    "toAreaId": "target-area-uuid",
    "direction": "down the stairs",
    "description": "A dark spiral staircase",
    "isLocked": false,
    "fromArea": {
      "id": "area-uuid",
      "name": "Throne Room",
      "shortDescription": "The castle's main hall"
    },
    "toArea": {
      "id": "target-area-uuid",
      "name": "Dungeon",
      "shortDescription": "Dark prison cells"
    }
  }
}
```

---

### `GET /api/v1/scenes/areas/:areaId/connections`

Get area connections.

**Authentication**: Optional

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "outgoing": [
      {
        "id": "conn-uuid",
        "fromAreaId": "area-uuid",
        "toAreaId": "target-area-uuid",
        "direction": "down the stairs",
        "toArea": {
          "id": "target-area-uuid",
          "name": "Dungeon",
          "shortDescription": "Dark prison cells"
        }
      }
    ],
    "incoming": [
      {
        "id": "conn-uuid-2",
        "fromAreaId": "other-area-uuid",
        "toAreaId": "area-uuid",
        "direction": "up the stairs",
        "fromArea": {
          "id": "other-area-uuid",
          "name": "Entrance",
          "shortDescription": "Castle entrance"
        }
      }
    ]
  }
}
```

---

### `PUT /api/v1/scenes/areas/:areaId/connections/:targetAreaId`

Update connection.

**Authentication**: Required (scene owner only)

**Request Body** (all optional):

```json
{
  "direction": "up the spiral staircase",
  "description": "A hidden passage",
  "isLocked": true,
  "lockHint": "Find the hidden key"
}
```

**Response**: `200 OK`

Returns updated connection.

---

### `DELETE /api/v1/scenes/areas/:areaId/connections/:targetAreaId`

Disconnect areas.

**Authentication**: Required (scene owner only)

**Response**: `204 No Content`

---

## Scene Image Endpoints

### `POST /api/v1/scenes/cover`

Upload scene cover image with compression and WebP conversion.

**Authentication**: Required

**Content-Type**: `multipart/form-data`

**Form Data**:
- `cover` - Image file (PNG, JPG, WEBP, GIF, max 10MB)
- `sceneId` - Scene UUID for ownership verification

**Image Processing**:
- Compressed and converted to WebP
- Resized to landscape 3:2 aspect ratio (1200x800 max)
- Stored in R2/S3-compatible storage

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "url": "https://...",
    "key": "scenes/scene-uuid/cover/...",
    "scene": {
      "id": "scene-uuid",
      "coverImageUrl": "https://..."
    }
  }
}
```

**Response**: `503 Service Unavailable` - Media storage not configured

---

### `GET /api/v1/scenes/:id/images`

List all scene images.

**Authentication**: Optional

**Response**: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "image-uuid",
      "sceneId": "scene-uuid",
      "imageUrl": "https://...",
      "imageType": "COVER",
      "caption": "Main castle view",
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ],
  "count": 3
}
```

---

### `POST /api/v1/scenes/:id/images`

Upload scene image.

**Authentication**: Required (scene owner only)

**Content-Type**: `multipart/form-data`

**Form Data**:
- `image` - Image file (PNG, JPG, WEBP, GIF, max 10MB)
- `imageType` - One of: `COVER`, `MAP`, `EXTERIOR`, `INTERIOR`, `DETAIL`, `PANORAMA`, `MISC` (required)
- `caption` - Optional image caption

**Response**: `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "image-uuid",
    "sceneId": "scene-uuid",
    "imageUrl": "https://...",
    "imageType": "EXTERIOR",
    "caption": "Castle exterior at sunset",
    "createdAt": "2026-01-15T10:00:00Z"
  }
}
```

---

### `DELETE /api/v1/scenes/images/:imageId`

Delete scene image.

**Authentication**: Required (scene owner only)

**Response**: `204 No Content`

---

### `PATCH /api/v1/scenes/images/:imageId`

Update scene image.

**Authentication**: Required (scene owner only)

**Request Body** (all optional):

```json
{
  "imageType": "DETAIL",
  "caption": "Updated caption"
}
```

**Response**: `200 OK`

Returns updated image.

---

## Area Image Endpoints

### `GET /api/v1/scenes/:id/areas/:areaId/images`

List area images.

**Authentication**: Optional

**Response**: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "image-uuid",
      "areaId": "area-uuid",
      "imageUrl": "https://...",
      "imageType": "ENVIRONMENT",
      "caption": "Dungeon interior",
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ],
  "count": 2
}
```

---

### `POST /api/v1/scenes/:id/areas/:areaId/images`

Upload area image.

**Authentication**: Required (scene owner only)

**Content-Type**: `multipart/form-data`

**Form Data**:
- `image` - Image file (PNG, JPG, WEBP, GIF, max 10MB)
- `imageType` - One of: `ENVIRONMENT`, `MAP`, `DETAIL`, `PANORAMA`, `MISC` (required)
- `caption` - Optional image caption

**Response**: `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "image-uuid",
    "areaId": "area-uuid",
    "imageUrl": "https://...",
    "imageType": "ENVIRONMENT",
    "caption": "Dungeon interior",
    "createdAt": "2026-01-15T10:00:00Z"
  }
}
```

---

### `DELETE /api/v1/scenes/areas/images/:imageId`

Delete area image.

**Authentication**: Required (scene owner only)

**Response**: `204 No Content`

---

### `PATCH /api/v1/scenes/areas/images/:imageId`

Update area image.

**Authentication**: Required (scene owner only)

**Request Body** (all optional):

```json
{
  "imageType": "DETAIL",
  "caption": "Updated caption"
}
```

**Response**: `200 OK`

Returns updated image.

---

## Error Responses

All endpoints may return:

**`400 Bad Request`** - Validation failed

```json
{
  "error": "Validation failed",
  "message": "name and description are required"
}
```

**`401 Unauthorized`**

```json
{ "error": "Unauthorized" }
```

**`403 Forbidden`**

```json
{ "error": "You can only update your own scenes" }
```

**`404 Not Found`**

```json
{ "error": "Scene not found" }
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

**Important**: Routes with specific path patterns must be declared BEFORE generic routes:

1. `GET /api/v1/scenes/favorites` - Must come before `/:id`
2. `POST /api/v1/scenes/:id/favorite` - Must come before `/:id`
3. `GET /api/v1/scenes/:id/stats` - Must come before `/:id`
4. `GET /api/v1/scenes/:id` - Generic scene route
5. `GET /api/v1/scenes/areas/:areaId` - Area detail route
6. `DELETE /api/v1/scenes/areas/images/:imageId` - Must come before generic area routes
7. `DELETE /api/v1/scenes/images/:imageId` - Scene image deletion

---

## Related

- `backend/src/services/sceneService.docs.md` - Business logic
- `Scene` model - Database schema
- `SceneArea` model - Area schema
- `SceneAreaAsset` model - Asset placement junction table
- `SceneAreaConnection` model - Area connections
- `SceneImage` model - Scene images
- `SceneAreaImage` model - Area images
