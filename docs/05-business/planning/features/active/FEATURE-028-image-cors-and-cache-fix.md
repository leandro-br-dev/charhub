# FEATURE-028: Image CORS Fix & Error Cache Resilience

**Status**: Active
**Priority**: P0 - Critical (Production Bug)
**Type**: Bug Fix (Infrastructure + Frontend)
**Depends on**: None
**Blocks**: None
**Assigned To**: Agent Coder
**Created**: 2026-02-01
**Last Updated**: 2026-02-01

---

## Overview

Character images served from Cloudflare R2 (`media.charhub.app`) are intermittently blocked by CORS policy in production and local environments. When this happens, dozens of images fail simultaneously. The frontend `CachedImage` component caches these failures permanently (no TTL on error entries), causing fallback SVGs to persist until the user refreshes the page. Even after refresh, if the CORS issue is still active at the CDN layer, the problem repeats.

This feature addresses two tightly coupled problems:
1. **Infrastructure**: Cloudflare CDN caching responses without CORS headers
2. **Frontend**: Error cache with no expiration or retry logic

---

## Problem Statement

### Symptom

```
Access to fetch at 'https://media.charhub.app/prod/characters/.../avatar.webp'
from origin 'https://charhub.app' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

- Affects dozens of images at once (not individual failures)
- Occurs in both production (`charhub.app`) and local (`localhost`) environments
- Fallback SVG replaces real images and never recovers without page refresh

### Root Cause Analysis

**CORS failure (infrastructure)**:

The `media.charhub.app` custom domain uses Cloudflare proxy (orange cloud). The R2 CORS policy is correctly configured, but Cloudflare's CDN cache sits between the client and R2:

1. A request **without** `Origin` header arrives (browser `<img>` tag, crawler, prefetch, or Cloudflare bot)
2. R2 responds **without** `Access-Control-Allow-Origin` (CORS headers are only added when `Origin` is present)
3. Cloudflare CDN **caches this response** (no `Vary: Origin` to differentiate)
4. Subsequent `fetch()` requests with `mode: 'cors'` receive the cached response missing CORS headers
5. Browser blocks the response → CORS error

This explains the "dozens fail at once" pattern - the CDN cache is shared across all users.

**Error cache persistence (frontend)**:

In `CachedImage.tsx`:
- `fetchAsBlobUrl()` catches errors and stores `{ status: 'error', ts: Date.now() }` in the in-memory cache
- The `useEffect` hook checks for `status === 'error'` and immediately shows fallback without retrying
- The error TTL check is missing - success entries expire after 5 minutes, but error entries **never expire**
- All components requesting the same URL see the cached error instantly

---

## Solution

### Part 1: Cloudflare Cache Rules (Infrastructure)

Configure Cloudflare to always include CORS headers regardless of cache state. There are two approaches, and both should be implemented:

#### 1A. Cloudflare Transform Rules - Add CORS Headers

In **Cloudflare Dashboard > Rules > Transform Rules > Modify Response Header**, create a rule for `media.charhub.app`:

**Rule name**: `R2 CORS Headers`
**When**: `(http.host eq "media.charhub.app")`
**Then - Set static response headers**:

| Operation | Header Name | Value |
|-----------|-------------|-------|
| Set | `Access-Control-Allow-Origin` | `*` |
| Set | `Access-Control-Allow-Methods` | `GET, HEAD, OPTIONS` |
| Set | `Access-Control-Max-Age` | `86400` |
| Set | `Vary` | `Origin` |

**Why `*` instead of specific origins**: R2 public bucket images are already publicly accessible. Using `*` is standard for CDN-served static assets (same pattern as AWS CloudFront + S3). The R2 CORS policy with specific origins remains as a second layer for non-CDN access.

**Why `Vary: Origin`**: Forces Cloudflare to cache separate responses for requests with different `Origin` headers, preventing the stale-CORS-response issue.

#### 1B. Cloudflare Cache Rules - Cache Key with Origin

In **Cloudflare Dashboard > Rules > Cache Rules**, create a rule:

**Rule name**: `R2 Cache with Origin`
**When**: `(http.host eq "media.charhub.app")`
**Then**:
- Cache eligible: Yes
- **Cache Key > Query String**: All
- **Cache Key > Headers**: Include `Origin` header in cache key

This ensures requests with `Origin: https://charhub.app` and requests without `Origin` are cached separately.

#### 1C. Alternative: Cloudflare Worker (if Transform Rules are not available on plan)

If the Cloudflare plan does not support Transform Rules, deploy a Worker on the `media.charhub.app` route:

```javascript
// workers/cors-media.js
export default {
  async fetch(request, env) {
    const response = await fetch(request);
    const newResponse = new Response(response.body, response);

    const origin = request.headers.get('Origin');

    // Add CORS headers
    newResponse.headers.set('Access-Control-Allow-Origin', origin || '*');
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    newResponse.headers.set('Access-Control-Max-Age', '86400');
    newResponse.headers.set('Vary', 'Origin');

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: newResponse.headers,
      });
    }

    return newResponse;
  },
};
```

**Priority order**: 1A + 1B (preferred) → 1C (fallback if plan limitations).

### Part 2: Frontend - CachedImage Error Resilience

#### 2A. Add TTL to Error Cache Entries

Error entries must expire, allowing retry attempts. Add an error TTL (shorter than success TTL) so transient failures auto-recover:

**File**: `frontend/src/components/ui/CachedImage.tsx`

Changes to `fetchAsBlobUrl()` and the `useEffect` hook:

```typescript
const DEFAULT_TTL_MS = 5 * 60 * 1000;      // 5 minutes for success
const ERROR_TTL_MS = 30 * 1000;             // 30 seconds for errors
const MAX_RETRIES = 3;                       // Max retry attempts per URL
```

**Error cache entry format** - add retry counter:

```typescript
type CacheEntry = {
  status: 'loading' | 'loaded' | 'error';
  blobUrl?: string;
  error?: any;
  promise?: Promise<string>;
  ts: number;
  retryCount?: number;  // NEW: track retry attempts
};
```

**Updated error check logic** in `useEffect`:

```typescript
// If previously errored, check if error TTL expired
if (entry && entry.status === 'error') {
  const errorAge = now - entry.ts;
  const retries = entry.retryCount ?? 0;

  // If error is fresh OR max retries reached, show fallback
  if (errorAge < ERROR_TTL_MS || retries >= MAX_RETRIES) {
    setHasError(true);
    return;
  }

  // Error TTL expired and retries remaining - clear entry and retry
  imageObjectUrlCache.delete(src);
  // Fall through to fetch below
}
```

**Updated error handler** in `fetchAsBlobUrl()`:

```typescript
.catch((err) => {
  const existing = imageObjectUrlCache.get(src);
  const retryCount = (existing?.retryCount ?? 0) + 1;
  imageObjectUrlCache.set(src, {
    status: 'error',
    error: err,
    ts: Date.now(),
    retryCount,
  });
  throw err;
});
```

#### 2B. Never Cache Fallback SVG as Blob URL

Ensure the fallback SVG data URI is never stored in the blob URL cache. This is already the case (data URIs are not fetched), but add an explicit guard:

```typescript
async function fetchAsBlobUrl(src: string): Promise<string> {
  // Never cache data URIs or blob URLs
  if (src.startsWith('data:') || src.startsWith('blob:')) {
    return src;
  }
  // ... rest of function
}
```

#### 2C. Graceful Degradation - Fall Back to Direct `<img>` on CORS Failure

When the blob fetch fails due to CORS, fall back to rendering a regular `<img src="...">` tag instead of the fallback SVG. The browser's native `<img>` tag does **not** require CORS (it's an opaque request). This means the image will still display even if `fetch()` with `mode: 'cors'` is blocked:

**Updated catch handler in useEffect**:

```typescript
.catch(() => {
  if (!cancelled) {
    // Fallback to direct img src (no blob cache)
    // Browser <img> tags don't require CORS headers
    setResolvedSrc(src);
    // Do NOT set hasError=true here - let the <img> tag try loading directly
    // Only set hasError if the <img> onError fires too
  }
});
```

This is the key behavioral change: currently the code sets `hasError = true` in the catch, which triggers the SVG fallback. Instead, it should try the original URL via `<img>` first (which doesn't need CORS), and only show the SVG fallback if that also fails.

**Flow after this change**:

```
1. fetch(url, { mode: 'cors' })  →  Success? → Show blob URL ✓
                                  →  CORS error? → ↓
2. <img src={originalUrl}>        →  Loads? → Show image ✓ (no CORS needed)
                                  →  404/error? → ↓
3. <img src={fallbackSvg}>        →  Show SVG fallback
```

#### 2D. Memory Leak Prevention

Add cleanup for old blob URLs when cache entries are replaced or expire:

```typescript
function evictExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of imageObjectUrlCache) {
    const ttl = entry.status === 'error' ? ERROR_TTL_MS : DEFAULT_TTL_MS;
    if (now - entry.ts > ttl) {
      if (entry.blobUrl) {
        URL.revokeObjectURL(entry.blobUrl);
      }
      imageObjectUrlCache.delete(key);
    }
  }
}

// Run eviction periodically (every 60 seconds)
setInterval(evictExpiredEntries, 60_000);
```

---

## Implementation Phases

### Phase 1: Infrastructure Fix (Cloudflare Configuration) - COMPLETED

> **Status**: ✅ Done (2026-02-01)
> Performed manually by admin in Cloudflare Dashboard.

- [x] Transform Rule `R2 CORS Headers` deployed on `media.charhub.app`:
  - `Access-Control-Allow-Origin: *`
  - `Access-Control-Allow-Methods: GET, HEAD, OPTIONS`
  - `Access-Control-Max-Age: 86400`
  - `Vary: Origin`
- [ ] Cache Rule `R2 Cache with Origin` (pending - to be configured after verifying Transform Rule effectiveness)
- [ ] Purge Cloudflare cache for `media.charhub.app`
- [ ] Verify `Access-Control-Allow-Origin` header present on image responses

**Note for Agent Coder**: Phase 1 is NOT your responsibility. Focus on Phase 2 and Phase 3 only.

### Phase 2: Frontend CachedImage Resilience (Agent Coder)

1. Add error TTL constant (`ERROR_TTL_MS = 30_000`)
2. Add `retryCount` to `CacheEntry` type
3. Update error cache logic: expire errors after TTL, track retries, cap at `MAX_RETRIES`
4. Update CORS failure fallback: try direct `<img src>` before showing SVG
5. Add data URI / blob URL guard in `fetchAsBlobUrl()`
6. Add `evictExpiredEntries()` with periodic cleanup
7. Add `URL.revokeObjectURL()` calls when evicting entries

### Phase 3: Testing

1. Unit tests for `CachedImage` error retry logic
2. Manual test: simulate CORS failure (block `media.charhub.app` in DevTools), verify:
   - Images fall back to direct `<img>` (still visible)
   - After removing block, images recover within 30 seconds
   - Error cache doesn't persist beyond 3 retries
3. Production verification after Cloudflare rule changes

---

## Files to Modify

| File | Changes |
|------|---------|
| `frontend/src/components/ui/CachedImage.tsx` | Error TTL, retry logic, CORS fallback, memory cleanup |

**No backend changes required.** The issue is entirely in the CDN layer and the frontend cache.

---

## Testing

### Unit Tests

- [ ] Error cache entries expire after `ERROR_TTL_MS` (30s)
- [ ] Success cache entries expire after `DEFAULT_TTL_MS` (5min)
- [ ] After error TTL expiration, component retries fetch
- [ ] After `MAX_RETRIES` (3), component stops retrying and shows fallback
- [ ] `retryCount` increments on each failed attempt
- [ ] Data URIs and blob URLs bypass `fetchAsBlobUrl()`
- [ ] `URL.revokeObjectURL()` is called when entries are evicted
- [ ] CORS fetch failure falls back to direct `<img src>` before showing SVG

### Manual Tests

- [ ] In DevTools Network tab, throttle/block `media.charhub.app` → images show via `<img>` fallback or SVG
- [ ] Unblock → images recover on next retry cycle (within 30s)
- [ ] Load character list with 50+ characters → no memory leak (check DevTools Memory tab)
- [ ] After Cloudflare fix: all images load with `Access-Control-Allow-Origin` header present

### Production Verification

- [ ] CORS errors gone from browser console
- [ ] `Access-Control-Allow-Origin: *` header present on R2 responses
- [ ] `Vary: Origin` header present on R2 responses
- [ ] No fallback SVGs visible for characters that have avatar images
- [ ] Image loading performance unchanged or improved

---

## Success Criteria

- [ ] Zero CORS errors in browser console for `media.charhub.app` images
- [ ] Failed image loads auto-recover within 30 seconds when the underlying issue resolves
- [ ] Fallback SVG only appears for genuinely missing images (404), not transient CORS failures
- [ ] No memory leaks from unreleased blob URLs
- [ ] Error retry is bounded (max 3 attempts) to avoid infinite loops

---

## Risks & Mitigations

### Risk 1: Transform Rules not available on current Cloudflare plan
**Impact**: Medium
**Mitigation**: Fall back to Cloudflare Worker (approach 1C). Workers are available on all plans including Free.

### Risk 2: `Access-Control-Allow-Origin: *` may be too permissive
**Impact**: Low
**Description**: Using `*` for a public image CDN is standard practice (same as AWS CloudFront, Imgix, etc.). The images are already publicly accessible via the R2 public URL. CORS only controls browser-side JavaScript access, not actual resource security.
**Mitigation**: No action needed. This is the industry-standard approach for CDN-served static assets.

### Risk 3: Retry storms under sustained outage
**Impact**: Low
**Description**: If R2 is down, all image components will retry every 30 seconds × 3 attempts.
**Mitigation**: `MAX_RETRIES = 3` caps total attempts. After 3 failures (~90 seconds), the component gives up until page refresh. This is acceptable behavior.

---

## Notes

- The R2 CORS policy with specific origins should remain in place as-is. It serves as a second layer for direct R2 API access (uploads, deletes). The Cloudflare Transform Rule adds CORS headers at the CDN edge, which is what browsers see.
- Phase 1 (infrastructure) should be done first and can be done immediately in Cloudflare Dashboard without any code deployment.
- Phase 2 (frontend) provides defense-in-depth so the system is resilient even if the CDN-level fix is incomplete or encounters edge cases.
- The `cache: 'force-cache'` on the fetch call is fine - it uses the browser's HTTP cache, which is separate from the in-memory blob cache. This reduces network requests for recently loaded images.

---

**End of FEATURE-028 Specification**
