# Cloudflare R2 CORS Configuration

**Last Updated**: 2025-12-11

## Overview

This guide explains how to configure CORS (Cross-Origin Resource Sharing) for the Cloudflare R2 bucket to allow frontend access to uploaded images and troubleshoot common caching issues.

---

## Problem

When the frontend tries to fetch images directly from R2 (e.g., `https://media.charhub.app/`), the browser may block the request with a CORS error:

```
Access to fetch at 'https://media.charhub.app/characters/xxx/avatar.webp' from origin 'http://localhost:8082'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

Even though the HTTP response is `200 OK`, the browser prevents JavaScript from accessing the response due to missing CORS headers.

---

## Solution

CORS must be configured at the **bucket level** in Cloudflare R2. This cannot be done via the S3 SDK or application code.

### Configuration Steps

1. **Access Cloudflare Dashboard**
   - Go to [https://dash.cloudflare.com/](https://dash.cloudflare.com/)
   - Navigate to **R2** section
   - Select your bucket (e.g., `charhub-media`)

2. **Configure CORS Rules**
   - Click on **Settings** tab
   - Scroll to **CORS Policy** section
   - Click **Edit CORS Policy**

3. **Add CORS Rule**

Add the following JSON configuration:

```json
[
  {
    "AllowedOrigins": [
      "https://charhub.app",
      "https://dev.charhub.app",
      "https://www.charhub.app",
      "http://localhost",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://localhost:5175",
      "http://localhost:8082"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Length",
      "Content-Type"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

**Key Origins**:
- ✅ `http://localhost:5175` - Frontend direct (Vite dev server)
- ✅ `http://localhost:8082` - **PRIMARY** - Nginx (app access port)
- ✅ `https://charhub.app` - Production domain

4. **Save Changes**

---

## Troubleshooting: CORS Cache Issues

### Symptoms

- CORS configured correctly in R2 bucket
- Error in console: `No 'Access-Control-Allow-Origin' header is present`
- Request returns 200 OK but is blocked by browser

### Cause

Cloudflare caches R2 response headers, including CORS headers. When you update CORS in the bucket, the cache needs to be purged.

### Solution: Purge Cloudflare Cache

**Option 1: Purge by Host (Recommended)**

1. Go to **Caching** → **Configuration**
2. Click **Purge Cache** → **Custom Purge**
3. Under "Purge by Host", add: `media.charhub.app`
4. Click **Purge**

**Option 2: Purge Everything**

1. Go to **Caching** → **Configuration**
2. Click **Purge Everything**
   - ⚠️ This affects the entire domain, but is faster

### Verification Steps

After purging cache:

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Hard reload** (Ctrl+Shift+R)
3. Access application at `http://localhost:8082`
4. Open console (F12) and verify no CORS errors
5. Images should load normally

### Test Direct R2 URL

To verify if the issue is cache-related, test with the direct R2 URL (without custom domain):

```
https://bbfdfcb2cc085e47e191e51ad65b275c.r2.cloudflarestorage.com/charhub-media/[image-path]
```

If it works with the direct URL but not with `media.charhub.app`, it confirms a cache issue.

---

## Advanced: Bypass Cache Temporarily

⚠️ **For testing only - DO NOT use in production**

```typescript
// Temporary cache bypass
const imageUrl = `https://media.charhub.app/path/image.webp?t=${Date.now()}`;
```

This disables caching completely by adding a timestamp query parameter.

---

## Optional: Configure Page Rules for Better Caching

To prevent future cache issues, create a Page Rule in Cloudflare:

**URL Pattern**: `media.charhub.app/*`

**Settings**:
- Cache Level: Standard
- Browser Cache TTL: Respect Existing Headers
- Edge Cache TTL: Respect Existing Headers

This makes Cloudflare respect R2 headers, including CORS.

---

## Code Changes Required

The frontend code has been updated to use `mode: 'cors'` correctly:
- `frontend/src/components/ui/CachedImage.tsx` - Uses fetch with proper CORS
- Blob cache maintained to reduce requests
- Works automatically after CORS is configured

---

## Checklist

- [ ] CORS configured in R2 bucket
- [ ] Custom domain verified (`media.charhub.app`)
- [ ] Cloudflare cache purged
- [ ] Browser cache cleared
- [ ] Images loading without CORS errors

---

## See Also

- [Cloudflare R2 CORS Documentation](https://developers.cloudflare.com/r2/buckets/cors/)
- [VM Setup & Recovery](../deployment/vm-setup-recovery.md)
