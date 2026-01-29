# Image Compression Service

Service for compressing oversized images stored in R2 to reclaim storage space and improve performance.

## Overview

This service provides functionality to:
- Get statistics about oversized images in the database
- Compress oversized images to a target size using the existing image processing pipeline
- Update database records with new file sizes
- Operates asynchronously via BullMQ job queue to avoid blocking HTTP requests

## When to Use

Use this service when:
- Storage costs are increasing due to oversized images
- Images were uploaded without proper compression
- Periodic maintenance to optimize storage
- Image loading performance needs improvement

## Important Notes

### Processing Characteristics
- **Sequential Processing**: Images are processed one at a time (not parallel) to avoid R2 rate limiting
- **Largest First**: Images are sorted by size (descending) to maximize storage reclamation
- **Continue on Failure**: Individual image failures don't stop the entire batch
- **Overwrites in R2**: Files are overwritten with the same key - **URLs remain unchanged**

### Job Queue Pattern
The compression operation runs as an async job via BullMQ:
1. HTTP request queues the job and returns immediately with a `jobId`
2. Job processes in background
3. Results are logged but not returned to the caller

### URL Preservation
**CRITICAL**: Images are compressed and overwritten in R2 using the same key. The URL in the database is NOT modified, ensuring no broken links.

## Methods

### `getOversizedStats()`

Get statistics about oversized images across different size thresholds.

**Returns**: `Promise<OversizedStats>`

```typescript
interface OversizedStats {
  totalImages: number;           // Total images in database
  oversizedCount: Record<string, number>;  // Count by threshold (>200KB, >300KB, etc.)
  totalBytesOversized: number;    // Total bytes that could be saved
}
```

**Example**:
```typescript
const stats = await imageCompressionService.getOversizedStats();
console.log(`Total images: ${stats.totalImages}`);
console.log(`Oversized (>200KB): ${stats.oversizedCount['>200KB']}`);
console.log(`Could save: ${(stats.totalBytesOversized / 1024 / 1024).toFixed(2)} MB`);
```

### `compressOversizedImages(options)`

Compress oversized images to target size. This method is called from a BullMQ job processor.

**Parameters**: `CompressionOptions`

```typescript
interface CompressionOptions {
  limit: number;          // Max images to process (1-1000)
  targetSizeKB: number;    // Target size in KB (50-5000)
}
```

**Returns**: `Promise<CompressionResult>`

```typescript
interface CompressionResult {
  processed: number;       // Number of images successfully compressed
  failed: number;          // Number of images that failed
  bytesReclaimed: number;  // Total bytes saved
  errors: string[];        // Error messages for failed images
}
```

**Example**:
```typescript
// This is typically called from a job processor
const result = await imageCompressionService.compressOversizedImages({
  limit: 100,
  targetSizeKB: 200,
});

console.log(`Processed: ${result.processed}`);
console.log(`Failed: ${result.failed}`);
console.log(`Reclaimed: ${(result.bytesReclaimed / 1024 / 1024).toFixed(2)} MB`);
```

### `mapImageType(type)`

Maps CharacterImage type enum to IMAGE_PROCESSING_DEFAULTS key.

**Parameters**: `type: string` - Image type from database

**Returns**: `keyof typeof IMAGE_PROCESSING_DEFAULTS`

**Supported types**: `AVATAR`, `COVER`, `SAMPLE`, `STICKER`, `REFERENCE`, `OTHER` (fallback)

## Architecture

### Compression Flow

```
1. Query Database
   ├─ Find images where sizeBytes > targetSizeKB
   ├─ Order by sizeBytes DESC (largest first)
   └─ Take 'limit' images

2. For each image:
   ├─ Download from R2 (r2Service.downloadObject)
   ├─ Process with imageProcessingService
   │  ├─ Apply type-specific settings (AVATAR, COVER, etc.)
   │  ├─ Adaptive compression (reduces quality iteratively)
   │  └─ Target: ~targetSizeKB
   ├─ Upload to R2 (overwrite same key)
   └─ Update database (sizeBytes, width, height)

3. Return results
   ├─ processed: success count
   ├─ failed: failure count
   ├─ bytesReclaimed: total saved
   └─ errors: failure messages
```

### Database Schema

Uses existing `CharacterImage` model:
```prisma
model CharacterImage {
  id        String   @id
  key       String?  // R2 storage key
  type      String   // AVATAR, COVER, SAMPLE, STICKER, REFERENCE
  sizeBytes Int?     // Current file size in bytes
  width     Int?
  height    Int?
  // ... other fields
}
```

### R2 Storage

- **Download**: `r2Service.downloadObject(key)` - Returns Buffer
- **Upload**: `r2Service.uploadObject({ key, body, contentType })` - Overwrites
- **Key Format**: `{env}/characters/{characterId}/{type}/{filename}`

## API Endpoints

### GET `/api/v1/admin/scripts/image-compression/stats`

Get statistics about oversized images (admin only).

**Response**:
```json
{
  "success": true,
  "data": {
    "totalImages": 566,
    "oversizedCount": {
      ">200KB": 364,
      ">300KB": 349,
      ">500KB": 341,
      ">1000KB": 196
    },
    "totalBytesOversized": 357187822
  }
}
```

### POST `/api/v1/admin/scripts/image-compression`

Trigger image compression job (admin only).

**Request Body**:
```json
{
  "limit": 100,         // Optional, default: 100
  "targetSizeKB": 200    // Optional, default: 200
}
```

**Response**:
```json
{
  "success": true,
  "jobId": "1",
  "message": "Image compression job started",
  "limit": 100,
  "targetSizeKB": 200
}
```

## Related Files

- **Routes**: `backend/src/routes/v1/admin/scripts.ts`
- **Worker**: `backend/src/queues/workers/characterPopulationWorker.ts`
- **Job Type**: `backend/src/queues/jobs/characterPopulationJob.ts`
- **Image Processing**: `backend/src/services/imageProcessingService.ts`
- **R2 Service**: `backend/src/services/r2Service.ts`

## Example: Complete Flow

```typescript
// 1. From frontend: Trigger job
const response = await api.post('/api/v1/admin/scripts/image-compression', {
  limit: 50,
  targetSizeKB: 200,
});

console.log(`Job ID: ${response.data.jobId}`);

// 2. Job is queued and processed in background

// 3. Check stats after job completes
const stats = await api.get('/api/v1/admin/scripts/image-compression/stats');
console.log(`Oversized images remaining: ${stats.data.oversizedCount['>200KB']}`);
```

## Performance Considerations

- **Processing Speed**: ~5-10 images per minute (depends on R2 latency and image size)
- **Target Compression**: 50-80% size reduction for oversized images
- **Sequential Processing**: Prevents rate limiting but slower than parallel
- **Large Images**: 14MB images may take 10-30 seconds each to process

## Error Handling

The service handles errors gracefully:
- **Download failures**: Logged and counted in `failed`
- **Upload failures**: Logged, counted in `failed`, but original file remains intact
- **Processing failures**: Logged, counted in `failed`, continues with next image
- **Missing keys**: Skipped with error message
- **Database errors**: Propagated to caller

## Logging

All operations are logged with appropriate levels:
- `info`: Job start, job completion, per-image success
- `error`: Download failures, upload failures, processing failures
- `debug`: R2 operations, database queries

Logs include:
- `jobId`, `limit`, `targetSizeKB`
- `imageId`, `originalSize`, `newSize`, `saved`
- Error messages for debugging
