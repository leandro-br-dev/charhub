# Cloudflare R2 CORS Configuration

This document explains how to configure CORS (Cross-Origin Resource Sharing) for the Cloudflare R2 bucket to allow frontend access to uploaded images.

## Problem

When the frontend tries to fetch images directly from R2 (e.g., `https://media.charhub.app/`), the browser blocks the request with a CORS error:

```
Access to fetch at 'https://media.charhub.app/characters/xxx/avatar.webp' from origin 'http://localhost:8082'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

Even though the HTTP response is `200 OK`, the browser prevents JavaScript from accessing the response due to missing CORS headers.

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
         "http://localhost:8082",
         "http://localhost:3000",
         "http://localhost:3002",
         "https://charhub.app",
         "https://*.charhub.app"
       ],
       "AllowedMethods": [
         "GET",
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

4. **Save Configuration**
   - Click **Save** to apply the CORS policy
   - Changes take effect immediately

### CORS Rule Explanation

- **AllowedOrigins**: List of origins that can access the bucket
  - `localhost:8082` - Development frontend (Nginx proxy)
  - `localhost:3000` - Development frontend (direct Vite)
  - `localhost:3002` - Legacy development port
  - `charhub.app` - Production domain
  - `*.charhub.app` - Production subdomains

- **AllowedMethods**: HTTP methods permitted for cross-origin requests
  - `GET` - Read images
  - `HEAD` - Check image metadata

- **AllowedHeaders**: Request headers the browser can send
  - `*` - Allow all headers (for maximum compatibility)

- **ExposeHeaders**: Response headers the browser can access
  - `ETag` - Cache validation
  - `Content-Length` - File size
  - `Content-Type` - MIME type

- **MaxAgeSeconds**: How long browsers cache the CORS preflight response
  - `3600` - 1 hour (reduces preflight requests)

### Testing CORS Configuration

After applying the configuration:

1. **Clear browser cache**
   - CORS errors can be cached by browsers
   - Hard refresh with `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

2. **Test image load**
   - Open browser console
   - Navigate to a character page with images
   - Verify no CORS errors appear
   - Check Network tab shows `200 OK` with proper headers

3. **Verify CORS headers in response**

   Use curl to check headers:
   ```bash
   curl -I -H "Origin: http://localhost:8082" \
     https://media.charhub.app/characters/xxx/avatar.webp
   ```

   Expected headers in response:
   ```
   Access-Control-Allow-Origin: http://localhost:8082
   Access-Control-Allow-Methods: GET, HEAD
   Access-Control-Expose-Headers: ETag, Content-Length, Content-Type
   ```

## Alternative: Using Proxy

If direct R2 access continues to have CORS issues, an alternative is to proxy image requests through the backend:

### Backend Proxy Route (Optional)

```typescript
// backend/src/routes/v1/media.ts
router.get('/proxy/:key(*)', async (req, res) => {
  const key = req.params.key;
  const publicUrl = r2Service.getPublicUrl(key);

  // Fetch from R2 and stream to client
  const response = await fetch(publicUrl);
  const buffer = await response.arrayBuffer();

  res.set('Content-Type', response.headers.get('Content-Type'));
  res.set('Cache-Control', 'public, max-age=31536000');
  res.send(Buffer.from(buffer));
});
```

### Frontend Usage

```typescript
// Instead of direct R2 URL
const imageUrl = `${API_BASE}/media/proxy/characters/${characterId}/avatar.webp`;
```

**Note**: Proxying adds latency and backend load. Direct R2 access with proper CORS is preferred.

## Troubleshooting

### CORS Error Still Appears

1. **Verify origin matches exactly**
   - `http://localhost:8082` ≠ `http://localhost:8082/`
   - Protocol must match (`http` vs `https`)
   - Port must match

2. **Check R2 bucket name**
   - Ensure you configured CORS on the correct bucket
   - Verify `R2_BUCKET_NAME` in `.env` matches the configured bucket

3. **Wait for propagation**
   - CORS changes are usually immediate but can take up to 5 minutes
   - Try clearing browser cache and reloading

4. **Check Custom Domain CORS**
   - If using a custom R2 domain, ensure it's included in `AllowedOrigins`
   - Custom domains may require separate CORS configuration

### Images Load But Console Shows Error

If images display correctly but CORS errors appear in console:

- This happens when JavaScript tries to access image data (e.g., for canvas operations)
- The browser successfully loads the image but blocks programmatic access
- Add the `crossorigin="anonymous"` attribute to `<img>` tags:

```html
<img src="https://media.charhub.app/avatar.webp" crossorigin="anonymous" />
```

Or in React:

```tsx
<img src={avatarUrl} crossOrigin="anonymous" />
```

## Production Considerations

### Restrict Origins in Production

For production, limit `AllowedOrigins` to only trusted domains:

```json
{
  "AllowedOrigins": [
    "https://charhub.app",
    "https://www.charhub.app"
  ],
  ...
}
```

### Monitor CORS Requests

- Watch for unusual CORS preflight volume
- CORS preflight (`OPTIONS` requests) don't count against R2 egress
- But excessive preflights can impact performance

### CDN Integration

If using Cloudflare CDN in front of R2:

- CORS headers are preserved through CDN
- CDN caches include CORS headers
- Purge CDN cache after changing CORS policy

## References

- [Cloudflare R2 CORS Documentation](https://developers.cloudflare.com/r2/buckets/cors/)
- [MDN CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Cloudflare R2 Dashboard](https://dash.cloudflare.com/)
