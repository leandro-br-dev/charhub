import { useEffect, useState } from 'react';

type CacheEntry = {
  status: 'loading' | 'loaded' | 'error';
  blobUrl?: string;
  error?: any;
  promise?: Promise<string>;
  ts: number;
};

const imageObjectUrlCache = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchAsBlobUrl(src: string): Promise<string> {
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
      imageObjectUrlCache.set(src, { status: 'error', error: err, ts: Date.now() });
      throw err;
    });

  imageObjectUrlCache.set(src, { status: 'loading', promise, ts: Date.now() });
  return promise;
}

export function prefetchImage(src: string): Promise<string> {
  return fetchAsBlobUrl(src);
}

export type CachedImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src?: string | null;
  ttlMs?: number;
  useBlobCache?: boolean; // when false, rely on browser cache and render src directly
  crossOrigin?: 'anonymous' | 'use-credentials'; // for CORS images
};

export function CachedImage({
  src,
  alt = '',
  ttlMs = DEFAULT_TTL_MS,
  useBlobCache = true,
  loading = 'lazy',
  crossOrigin,
  ...imgProps
}: CachedImageProps): JSX.Element {
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!src) {
      setResolvedSrc(undefined);
      return;
    }

    // Use blob cache for all images unless explicitly disabled
    if (!useBlobCache) {
      setResolvedSrc(src);
      return;
    }

    const entry = imageObjectUrlCache.get(src);
    const now = Date.now();
    if (entry && entry.status === 'loaded' && entry.blobUrl && now - entry.ts < ttlMs) {
      setResolvedSrc(entry.blobUrl);
      return;
    }

    let cancelled = false;
    fetchAsBlobUrl(src)
      .then((url) => {
        if (!cancelled) setResolvedSrc(url);
      })
      .catch(() => {
        if (!cancelled) setResolvedSrc(src);
      });

    return () => {
      cancelled = true;
    };
  }, [src, ttlMs, useBlobCache]);

  // If no src, render empty span to avoid broken image icon
  if (!src && !resolvedSrc) {
    return <span />;
  }

  return (
    <img
      src={resolvedSrc ?? src ?? undefined}
      alt={alt}
      loading={loading}
      crossOrigin={crossOrigin}
      {...imgProps}
    />
  );
}

