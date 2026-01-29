# FEATURE-019: Image Compression Optimization Script

**Status**: Active
**Priority**: High
**Assigned To**: Agent Coder
**Created**: 2026-01-29
**Last Updated**: 2026-01-29
**Epic**: Storage Optimization

**GitHub Issue**: N/A (internal optimization)

---

## Problem Statement

Due to an error in the image processing pipeline, some images were uploaded to R2 storage without proper compression, causing rapid growth of storage space usage. The `sizeBytes` field in `CharacterImage` table shows which images are oversized.

### Current Pain Points

1. **Storage costs increasing** - Uncompressed images consuming excessive R2 storage
2. **Bandwidth waste** - Large images impact page load performance
3. **Inconsistent image sizes** - Some images properly compressed, others not
4. **No automated cleanup** - No mechanism to fix existing oversized images

### Impact Analysis

**Current State**:
- Target size per image: ~200KB (as defined in `IMAGE_PROCESSING_DEFAULTS`)
- Some images stored at 500KB-2MB+ due to missing compression
- R2 storage growing faster than expected

**Target State**:
- All images compressed to target size
- Admin can run cleanup script on-demand
- Storage growth controlled

### Target Users

- System administrators (via /admin/scripts page)
- System performance (reduced storage costs)
- End users (faster image loading)

### Value Proposition

- **Cost savings**: Reduced R2 storage costs
- **Performance**: Faster image delivery
- **Control**: Admin can run compression on-demand
- **Reusability**: Compression service extracted for future use

---

## User Stories

### US-1: Compress Oversized Images
**As an** administrator,
**I want** to run a script that compresses oversized images,
**So that** I can reclaim wasted storage space.

**Acceptance Criteria**:
- [ ] Script accessible from `/admin/scripts` page
- [ ] User can specify number of images to process (limit)
- [ ] User can specify maximum size threshold in KB
- [ ] Script fetches images from `CharacterImage` where `sizeBytes > threshold`
- [ ] Images downloaded from R2, compressed, re-uploaded
- [ ] `sizeBytes` field updated in database
- [ ] Progress/results displayed to user

### US-2: Statistics Display
**As an** administrator,
**I want** to see statistics about oversized images,
**So that** I can understand the scope of the problem.

**Acceptance Criteria**:
- [ ] Display count of images above different size thresholds
- [ ] Display total bytes that could be saved
- [ ] Display last compression job run time

### US-3: Reusable Compression Logic
**As a** developer,
**I want** the compression logic extracted into a reusable service,
**So that** it can be used in other parts of the system.

**Acceptance Criteria**:
- [ ] Compression logic in dedicated service (not inline in script)
- [ ] Service follows existing `imageProcessingService.ts` patterns
- [ ] Service can be imported by other components
- [ ] Proper error handling and logging

---

## Technical Approach

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     COMPRESSION FLOW                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Admin clicks "Compress Images" on /admin/scripts             │
│       ↓                                                       │
│  ┌─────────────────────────────────────────┐                 │
│  │ Frontend: POST /api/v1/admin/scripts/   │                 │
│  │           image-compression             │                 │
│  │   params: { limit, maxSizeKB }          │                 │
│  └────────────────┬────────────────────────┘                 │
│                   ↓                                           │
│  ┌─────────────────────────────────────────┐                 │
│  │ Backend: imageCompressionService        │                 │
│  │  1. Query CharacterImage > threshold    │                 │
│  │  2. Download from R2                    │                 │
│  │  3. Compress using imageProcessingService│                │
│  │  4. Upload to R2 (overwrite)            │                 │
│  │  5. Update sizeBytes in DB              │                 │
│  └─────────────────────────────────────────┘                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Backend Changes

#### 1. New Compression Service

**File**: `backend/src/services/imageCompressionService.ts`

```typescript
import { prisma } from '../config/database';
import { r2Service } from './r2Service';
import { processImageByType, IMAGE_PROCESSING_DEFAULTS } from './imageProcessingService';
import { logger } from '../config/logger';

interface CompressionResult {
  processed: number;
  failed: number;
  bytesReclaimed: number;
  errors: string[];
}

interface CompressionOptions {
  limit: number;
  maxSizeKB: number;  // Threshold - only compress images above this size
  targetSizeKB?: number;  // Target size after compression (default: 200)
}

export const imageCompressionService = {
  /**
   * Get statistics about oversized images
   */
  async getOversizedStats(): Promise<{
    totalImages: number;
    oversizedCount: Record<string, number>;
    totalBytesOversized: number;
  }> {
    const thresholds = [200, 300, 500, 1000]; // KB

    const totalImages = await prisma.characterImage.count();

    const oversizedCount: Record<string, number> = {};
    let totalBytesOversized = 0;

    for (const threshold of thresholds) {
      const count = await prisma.characterImage.count({
        where: {
          sizeBytes: { gt: threshold * 1024 }
        }
      });
      oversizedCount[`>${threshold}KB`] = count;
    }

    const oversizedImages = await prisma.characterImage.findMany({
      where: {
        sizeBytes: { gt: 200 * 1024 }
      },
      select: { sizeBytes: true }
    });

    totalBytesOversized = oversizedImages.reduce(
      (sum, img) => sum + ((img.sizeBytes || 0) - 200 * 1024),
      0
    );

    return { totalImages, oversizedCount, totalBytesOversized };
  },

  /**
   * Compress oversized images
   */
  async compressOversizedImages(options: CompressionOptions): Promise<CompressionResult> {
    const { limit, maxSizeKB, targetSizeKB = 200 } = options;
    const result: CompressionResult = {
      processed: 0,
      failed: 0,
      bytesReclaimed: 0,
      errors: [],
    };

    // Fetch oversized images
    const oversizedImages = await prisma.characterImage.findMany({
      where: {
        sizeBytes: { gt: maxSizeKB * 1024 },
        url: { not: null },
        key: { not: null },
      },
      take: limit,
      orderBy: { sizeBytes: 'desc' }, // Start with largest
      select: {
        id: true,
        key: true,
        url: true,
        type: true,
        sizeBytes: true,
      },
    });

    logger.info({
      found: oversizedImages.length,
      maxSizeKB,
      targetSizeKB,
    }, 'Starting image compression job');

    for (const image of oversizedImages) {
      try {
        if (!image.key) {
          result.errors.push(`Image ${image.id}: No R2 key`);
          result.failed++;
          continue;
        }

        const originalSize = image.sizeBytes || 0;

        // Download from R2
        const buffer = await r2Service.downloadBuffer(image.key);

        if (!buffer) {
          result.errors.push(`Image ${image.id}: Download failed`);
          result.failed++;
          continue;
        }

        // Determine image type for processing
        const imageType = this.mapImageType(image.type);

        // Compress using existing service
        const processed = await processImageByType(buffer, imageType, targetSizeKB);

        // Upload compressed version (overwrite)
        await r2Service.uploadBuffer(
          image.key,
          processed.buffer,
          processed.contentType
        );

        // Update database
        await prisma.characterImage.update({
          where: { id: image.id },
          data: {
            sizeBytes: processed.sizeBytes,
            width: processed.width,
            height: processed.height,
          },
        });

        result.bytesReclaimed += originalSize - processed.sizeBytes;
        result.processed++;

        logger.info({
          imageId: image.id,
          originalSize,
          newSize: processed.sizeBytes,
          saved: originalSize - processed.sizeBytes,
        }, 'Image compressed successfully');

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Image ${image.id}: ${errorMsg}`);
        result.failed++;
        logger.error({ imageId: image.id, error }, 'Failed to compress image');
      }
    }

    logger.info({
      processed: result.processed,
      failed: result.failed,
      bytesReclaimed: result.bytesReclaimed,
    }, 'Image compression job completed');

    return result;
  },

  /**
   * Map ImageType enum to processing type
   */
  mapImageType(type: string): keyof typeof IMAGE_PROCESSING_DEFAULTS {
    switch (type) {
      case 'AVATAR':
        return 'AVATAR';
      case 'COVER':
        return 'COVER';
      case 'SAMPLE':
        return 'SAMPLE';
      case 'STICKER':
        return 'STICKER';
      case 'REFERENCE':
        return 'REFERENCE';
      default:
        return 'OTHER';
    }
  },
};
```

#### 2. New Admin API Endpoint

**File**: `backend/src/routes/v1/admin/scripts.ts` (add to existing)

```typescript
// GET /api/v1/admin/scripts/image-compression/stats
router.get('/image-compression/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const stats = await imageCompressionService.getOversizedStats();
    res.json(stats);
  } catch (error) {
    logger.error({ error }, 'Failed to get image compression stats');
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// POST /api/v1/admin/scripts/image-compression
router.post('/image-compression', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { limit = 100, maxSizeKB = 200, targetSizeKB = 200 } = req.body;

    // Validate inputs
    if (limit < 1 || limit > 1000) {
      return res.status(400).json({ error: 'Limit must be between 1 and 1000' });
    }
    if (maxSizeKB < 50 || maxSizeKB > 5000) {
      return res.status(400).json({ error: 'Max size must be between 50 and 5000 KB' });
    }

    const result = await imageCompressionService.compressOversizedImages({
      limit,
      maxSizeKB,
      targetSizeKB,
    });

    res.json({
      success: true,
      message: `Processed ${result.processed} images, failed ${result.failed}. Reclaimed ${(result.bytesReclaimed / 1024 / 1024).toFixed(2)} MB`,
      ...result,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to run image compression');
    res.status(500).json({ error: 'Failed to run compression script' });
  }
});
```

### Frontend Changes

#### 1. Add to Admin Scripts Service

**File**: `frontend/src/services/adminScripts.ts` (add methods)

```typescript
export interface ImageCompressionStats {
  totalImages: number;
  oversizedCount: Record<string, number>;
  totalBytesOversized: number;
}

export const adminScriptsService = {
  // ... existing methods ...

  async getImageCompressionStats(): Promise<AxiosResponse<ImageCompressionStats>> {
    return api.get('/api/v1/admin/scripts/image-compression/stats');
  },

  async triggerImageCompression(
    limit: number,
    maxSizeKB: number,
    targetSizeKB?: number
  ): Promise<AxiosResponse<{ message: string; processed: number; failed: number; bytesReclaimed: number }>> {
    return api.post('/api/v1/admin/scripts/image-compression', {
      limit,
      maxSizeKB,
      targetSizeKB,
    });
  },
};
```

#### 2. Add to Admin Scripts Page

**File**: `frontend/src/pages/admin/scripts/index.tsx` (add section)

Add new script type `'compression'` and corresponding UI section with:
- Input for limit (number of images)
- Input for maxSizeKB (threshold)
- Optional input for targetSizeKB
- Display of compression stats
- Run button

### R2 Service Extension

Ensure `r2Service` has methods for:
- `downloadBuffer(key: string): Promise<Buffer | null>` - Download file as buffer
- `uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<void>` - Upload/overwrite file

If not already present, add to `backend/src/services/r2Service.ts`.

---

## Database Changes

No schema changes required. Uses existing `CharacterImage.sizeBytes` field.

---

## Testing Requirements

### Unit Tests

- [ ] `imageCompressionService.getOversizedStats()` returns correct counts
- [ ] `imageCompressionService.compressOversizedImages()` processes images correctly
- [ ] `imageCompressionService.mapImageType()` maps all types correctly
- [ ] Error handling for download failures
- [ ] Error handling for upload failures
- [ ] Database update after compression

### Integration Tests

- [ ] API endpoint `/api/v1/admin/scripts/image-compression/stats` returns stats
- [ ] API endpoint `/api/v1/admin/scripts/image-compression` triggers compression
- [ ] Input validation (limit, maxSizeKB)
- [ ] Admin-only access enforced

### Manual Tests

- [ ] Run script from admin UI
- [ ] Verify image quality after compression
- [ ] Verify sizeBytes updated in database
- [ ] Verify R2 file replaced with compressed version

---

## Success Criteria

### Core Functionality

- [ ] Admin can view oversized image statistics
- [ ] Admin can run compression with custom parameters
- [ ] Images compressed and replaced in R2
- [ ] Database updated with new sizes
- [ ] Results displayed to admin

### Performance Metrics

| Metric | Target |
|--------|--------|
| Processing speed | ~5-10 images/minute |
| Target image size | ≤200KB (configurable) |
| Compression ratio | 50-80% for oversized images |

### Quality

- [ ] No image corruption after compression
- [ ] Proper error handling
- [ ] Logging for debugging
- [ ] i18n for UI strings

---

## Dependencies

### Internal

- `imageProcessingService.ts` - Existing compression logic
- `r2Service.ts` - R2 storage operations
- Admin scripts page - Existing UI

### External

- `sharp` - Image processing library (already installed)

---

## Risks & Mitigations

### Risk 1: Image Quality Degradation
**Impact**: Medium
**Description**: Aggressive compression could degrade image quality
**Mitigation**:
- Use existing `processImageByType()` which has quality safeguards
- Allow configurable target size
- Keep quality minimum at 30%

### Risk 2: R2 Rate Limiting
**Impact**: Low
**Description**: Rapid download/upload could hit rate limits
**Mitigation**:
- Process images sequentially (not parallel)
- Add configurable delay between images if needed

### Risk 3: Partial Failure
**Impact**: Medium
**Description**: Script could fail mid-execution
**Mitigation**:
- Process one image at a time
- Continue on individual failures
- Report all errors to admin
- Each image is atomic (download → compress → upload → update DB)

---

## Implementation Phases

### Phase 1: Backend Service (1-2 hours)
1. Create `imageCompressionService.ts`
2. Add `downloadBuffer` to r2Service if needed
3. Test compression locally

### Phase 2: API Endpoints (30 min)
1. Add stats endpoint
2. Add compression trigger endpoint
3. Test endpoints with curl

### Phase 3: Frontend Integration (1 hour)
1. Add service methods
2. Add UI section to admin scripts page
3. Add i18n translations

### Phase 4: Testing (1 hour)
1. Unit tests for service
2. Integration tests for API
3. Manual testing in staging

---

## Notes

- The existing `processImageByType()` already has adaptive compression that reduces quality iteratively
- Start with high threshold (e.g., 500KB) for first runs to target worst offenders
- Consider running during off-peak hours for large batches
- Monitor R2 costs after cleanup

---

## References

- Existing compression service: `backend/src/services/imageProcessingService.ts`
- Image utilities: `backend/src/utils/imageUtils.ts`
- Admin scripts page: `frontend/src/pages/admin/scripts/index.tsx`
- Admin scripts service: `frontend/src/services/adminScripts.ts`
- CharacterImage schema: `backend/prisma/schema.prisma`

---

**End of FEATURE-019 Specification**
