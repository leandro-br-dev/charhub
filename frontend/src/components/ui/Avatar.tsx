import { type ImgHTMLAttributes, useEffect, useMemo, useState } from 'react';

export interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'size' | 'alt' | 'src'> {
  src?: string | null;
  alt?: string;
  size?: 'mini' | 'small' | 'medium' | 'large';
}

const avatarObjectUrlCache = new Map<string, string>();
const avatarInFlightCache = new Map<string, Promise<string>>();

async function loadAvatar(src: string): Promise<string> {
  if (avatarObjectUrlCache.has(src)) {
    return avatarObjectUrlCache.get(src)!;
  }

  if (avatarInFlightCache.has(src)) {
    return avatarInFlightCache.get(src)!;
  }

  const promise = fetch(src, {
    credentials: 'omit',
    mode: 'cors',
    cache: 'no-store',
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load avatar: ${response.status}`);
      }
      return response.blob();
    })
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob);
      avatarObjectUrlCache.set(src, objectUrl);
      avatarInFlightCache.delete(src);
      return objectUrl;
    })
    .catch((error) => {
      avatarInFlightCache.delete(src);
      throw error;
    });

  avatarInFlightCache.set(src, promise);
  return promise;
}

export const Avatar = ({ src, alt = 'Avatar', size = 'medium', className = '', ...props }: AvatarProps) => {
  const sizes = {
    mini: 'w-8 h-8',
    small: 'w-10 h-10',
    medium: 'w-12 h-12',
    large: 'w-16 h-16',
  };

  const baseClasses = 'rounded-full object-cover bg-secondary flex-shrink-0';
  const combinedClasses = `${baseClasses} ${sizes[size]} ${className}`.trim();

  // Fallback to a placeholder if no src provided
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!src) {
      setResolvedSrc(null);
      return;
    }

    if (avatarObjectUrlCache.has(src)) {
      setResolvedSrc(avatarObjectUrlCache.get(src)!);
      return;
    }

    let cancelled = false;

    loadAvatar(src)
      .then((objectUrl) => {
        if (!cancelled) {
          setResolvedSrc(objectUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedSrc(src);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!src && !resolvedSrc) {
    return (
      <div className={`${combinedClasses} flex items-center justify-center text-white bg-secondary`}>
        <span className="material-symbols-outlined">person</span>
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc ?? src ?? undefined}
      alt={alt}
      className={combinedClasses}
      loading="lazy"
      {...props}
    />
  );
};
