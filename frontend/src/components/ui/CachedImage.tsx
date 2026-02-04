import { useEffect, useState, useRef } from 'react';

type CacheEntry = {
  status: 'loading' | 'loaded' | 'error';
  blobUrl?: string;
  error?: any;
  promise?: Promise<string>;
  ts: number;
  retryCount?: number;
};

const imageObjectUrlCache = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes for success
const ERROR_TTL_MS = 30 * 1000; // 30 seconds for errors
const MAX_RETRIES = 3; // Max retry attempts per URL

// Default avatar SVG (base64) for fallback
const DEFAULT_AVATAR_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239CA3AF'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

/**
 * Evicts expired entries from the cache and revokes their blob URLs to prevent memory leaks.
 * Uses different TTLs for success (5min) and error (30s) entries.
 */
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

// Set up periodic cleanup every 60 seconds
const cleanupInterval = setInterval(evictExpiredEntries, 60_000);

async function fetchAsBlobUrl(src: string): Promise<string> {
  // Never cache data URIs or blob URLs - return them directly
  if (src.startsWith('data:') || src.startsWith('blob:')) {
    return src;
  }

  const existing = imageObjectUrlCache.get(src);
  if (existing?.status === 'loaded' && existing.blobUrl) {
    return existing.blobUrl;
  }
  if (existing?.status === 'loading' && existing.promise) {
    return existing.promise;
  }

  // Always use 'cors' mode for proper CORS handling with blob cache
  // R2 CORS must be configured with allowed origins
  const promise = fetch(src, { mode: 'cors', credentials: 'omit', cache: 'force-cache' })
    .then((resp) => {
      if (!resp.ok) {
        throw new Error(`Failed to load: ${resp.status}`);
      }
      return resp.blob();
    })
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      imageObjectUrlCache.set(src, { status: 'loaded', blobUrl: url, ts: Date.now() });
      return url;
    })
    .catch((err) => {
      const existingEntry = imageObjectUrlCache.get(src);
      const retryCount = (existingEntry?.retryCount ?? 0) + 1;
      imageObjectUrlCache.set(src, {
        status: 'error',
        error: err,
        ts: Date.now(),
        retryCount,
      });
      throw err;
    });

  imageObjectUrlCache.set(src, { status: 'loading', promise, ts: Date.now() });
  return promise;
}

export function prefetchImage(src: string): Promise<string> {
  return fetchAsBlobUrl(src);
}

// Test-only export to clear cache between tests
if (import.meta.env?.VITEST ?? import.meta.env?.NODE_ENV === 'test') {
  (globalThis as any).__clearCachedImageCache__ = () => {
    imageObjectUrlCache.clear();
  };
}

export type CachedImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src?: string | null;
  ttlMs?: number;
  useBlobCache?: boolean; // when false, rely on browser cache and render src directly
  crossOrigin?: 'anonymous' | 'use-credentials'; // for CORS images
  /** Fallback SVG to show when image fails to load */
  fallbackSvg?: string;
};

export function CachedImage({
  src,
  alt = '',
  ttlMs = DEFAULT_TTL_MS,
  useBlobCache = true,
  loading = 'lazy',
  crossOrigin,
  fallbackSvg,
  ...imgProps
}: CachedImageProps): JSX.Element {
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(undefined);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!src) {
      setResolvedSrc(undefined);
      setHasError(false);
      return;
    }

    setHasError(false);

    // Use blob cache for all images unless explicitly disabled
    if (!useBlobCache) {
      setResolvedSrc(src);
      return;
    }

    const entry = imageObjectUrlCache.get(src);
    const now = Date.now();

    // If cached and still valid, use it
    if (entry && entry.status === 'loaded' && entry.blobUrl && now - entry.ts < ttlMs) {
      setResolvedSrc(entry.blobUrl);
      return;
    }

    // If previously errored, check if error TTL expired and retries remain
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

    let cancelled = false;
    fetchAsBlobUrl(src)
      .then((url) => {
        if (!cancelled) {
          setResolvedSrc(url);
          setHasError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          // Fallback to direct img src (browser doesn't need CORS for <img> tags)
          // Don't set hasError=true here - let the <img> tag try loading directly
          // Only set hasError if the <img> onError also fires
          setResolvedSrc(src);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [src, ttlMs, useBlobCache]);

  // Handle error event as additional fallback
  const handleError = () => {
    setHasError(true);
  };

  // If no src and no resolved src, show fallback or empty span
  if (!src && !resolvedSrc) {
    return <span />;
  }

  // If error occurred, show fallback SVG or original image
  if (hasError) {
    return (
      <img
        src={fallbackSvg || DEFAULT_AVATAR_SVG}
        alt={alt}
        loading={loading}
        {...imgProps}
      />
    );
  }

  return (
    <img
      ref={imgRef}
      src={resolvedSrc ?? src ?? undefined}
      alt={alt}
      loading={loading}
      crossOrigin={crossOrigin}
      onError={handleError}
      {...imgProps}
    />
  );
}

