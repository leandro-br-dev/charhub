# Character Population API Documentation

## Overview

The Character Population API provides administrative endpoints for managing the automated character population system. This system integrates with Civitai to discover, curate, and generate characters automatically.

**Base URL:** `/api/v1/character-population`
**Authentication:** Required (Admin role only)

---

## Endpoints

### GET /stats

Get system statistics for the character population pipeline.

**Authentication:** Required (Admin)

**Response:**
```json
{
  "curation": {
    "pending": 10,
    "approved": 50,
    "rejected": 20,
    "processing": 2,
    "completed": 40,
    "failed": 3,
    "total": 125
  },
  "batch": {
    "totalBatches": 5,
    "totalGenerated": 100,
    "successRate": 0.95,
    "avgDuration": 120
  },
  "civitai": {
    "used": 150,
    "limit": 1000,
    "remaining": 850,
    "resetIn": 86400000
  },
  "queue": {
    "waiting": 0,
    "active": 1,
    "completed": 42,
    "failed": 2,
    "delayed": 0
  },
  "timestamp": "2025-12-26T10:30:00.000Z"
}
```

---

### POST /trigger-curation

Manually trigger a curation job to fetch and analyze images from Civitai.

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "imageCount": 50,
  "keywords": ["anime", "fantasy", "scifi"]
}
```

**Parameters:**
- `imageCount` (number, optional): Number of images to fetch. Default: 50
- `keywords` (string[], optional): Keywords for image search

**Response:**
```json
{
  "success": true,
  "jobId": "job-123",
  "message": "Curation job started",
  "imageCount": 50
}
```

---

### POST /trigger-batch

Manually trigger a batch character generation job.

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "count": 20,
  "userId": "00000000-0000-0000-0000-000000000001"
}
```

**Parameters:**
- `count` (number, optional): Number of characters to generate. Default: 20
- `userId` (string, optional): User ID to attribute characters to. Defaults to bot user

**Response:**
```json
{
  "success": true,
  "jobId": "job-456",
  "message": "Batch generation job started",
  "count": 20
}
```

---

### POST /trigger-full

Manually trigger the full population pipeline (curation + generation).

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "targetCount": 20,
  "keywords": ["anime", "fantasy"],
  "userId": "00000000-0000-0000-0000-000000000001"
}
```

**Parameters:**
- `targetCount` (number, optional): Number of characters to generate. Default: 20
- `keywords` (string[], optional): Keywords for image search
- `userId` (string, optional): User ID to attribute characters to

**Response:**
```json
{
  "success": true,
  "jobId": "job-789",
  "message": "Full population pipeline started",
  "targetCount": 20
}
```

---

### GET /jobs

Get recent batch generation jobs and queue status.

**Authentication:** Required (Admin)

**Response:**
```json
{
  "batches": [
    {
      "id": "batch-1",
      "scheduledAt": "2025-12-26T00:00:00.000Z",
      "executedAt": "2025-12-26T00:01:00.000Z",
      "completedAt": "2025-12-26T00:15:00.000Z",
      "targetCount": 24,
      "successCount": 23,
      "failureCount": 1,
      "duration": 840,
      "selectedImages": ["img1", "img2", "..."],
      "generatedCharIds": ["char1", "char2", "..."]
    }
  ],
  "queue": {
    "waiting": [
      {
        "id": "job-1",
        "name": "hourly-generation",
        "data": { "dailyLimit": 24 }
      }
    ],
    "active": [
      {
        "id": "job-2",
        "name": "daily-curation",
        "data": { "imageCount": 48 },
        "progress": 50
      }
    ],
    "completed": [...],
    "failed": [...],
    "delayed": [...]
  }
}
```

---

### GET /curated-images

Get curated images from the queue.

**Authentication:** Required (Admin)

**Query Parameters:**
- `status` (string, optional): Filter by status (PENDING, APPROVED, REJECTED, etc.)
- `limit` (number, optional): Maximum number of results. Default: 50

**Response:**
```json
{
  "images": [
    {
      "id": "img-1",
      "sourceUrl": "https://example.com/image.jpg",
      "sourceId": "civitai-123",
      "sourcePlatform": "civitai",
      "tags": ["anime", "fantasy", "girl"],
      "sourceRating": 4.5,
      "author": "artist1",
      "status": "APPROVED",
      "ageRating": "TEN",
      "qualityScore": 4.2,
      "contentTags": ["SAFE", "ANIME"],
      "description": "An anime character...",
      "generatedCharId": "char-1",
      "createdAt": "2025-12-26T00:00:00.000Z",
      "processedAt": "2025-12-26T00:05:00.000Z"
    }
  ],
  "count": 1
}
```

---

### GET /settings

Get current system settings.

**Authentication:** Required (Admin)

**Response:**
```json
{
  "enabled": true,
  "batchSize": "24",
  "cronSchedule": null,
  "retryAttempts": "3",
  "timeout": "5",
  "autoApprovalThreshold": "4.5",
  "requireManualReview": "false",
  "nsfwFilterEnabled": "true",
  "botUserId": "00000000-0000-0000-0000-000000000001"
}
```

---

## Error Responses

All endpoints may return the following error responses:

### 403 Forbidden
```json
{
  "error": "Admin access required"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to [operation description]"
}
```

---

## Job Types

The system uses the following job types in the queue:

1. **trigger-curation**: Fetch and curate images from Civitai
2. **batch-generation**: Generate characters from approved images
3. **full-population**: Complete pipeline (curation + generation)
4. **hourly-generation**: Automated hourly job (1 character/hour)
5. **daily-curation**: Automated daily curation job

---

## Curation Pipeline

The curation pipeline consists of the following steps:

1. **Fetch**: Retrieve images from Civitai API
2. **Queue**: Add images to curation queue
3. **Analyze**: Use AI to analyze content, age rating, quality
4. **Classify**: Determine if image should be approved/rejected
5. **Approve/Reject**: Update status based on quality thresholds

Approval criteria:
- Quality score ≥ 4.0 (configurable via AUTO_APPROVAL_THRESHOLD)
- Not NSFW (nudity, sexual content)
- Not duplicate
- Age rating not EIGHTEEN (conservative approach)

---

## Generation Pipeline

The batch generation pipeline:

1. **Select**: Use diversification algorithm to select approved images
2. **Download**: Fetch image from source URL
3. **Upload**: Upload to R2 storage
4. **Analyze**: Use AI to extract character information
5. **Generate**: Create character data using LLM
6. **Create**: Insert character into database
7. **Avatar**: Queue avatar generation with ComfyUI

---

## Rate Limiting

- Civitai API: 1000 requests/day (configurable)
- Queue concurrency: 1 job at a time
- Hourly generation: 1 character/hour (respects daily limit)
- Daily curation: Once per day at configured hour

---

## Monitoring

Monitor the system using:
- `GET /stats`: Overall system health
- `GET /jobs`: Recent jobs and queue status
- `GET /curated-images`: Curation queue state
- Application logs: Detailed operation logs

---

## Configuration

See [Configuration Guide](../configuration/character-population.md) for environment variables and setup instructions.
