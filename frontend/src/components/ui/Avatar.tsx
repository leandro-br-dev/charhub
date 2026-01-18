import { type ImgHTMLAttributes, useState, useEffect } from 'react';
import { CachedImage } from './CachedImage';

export interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'size' | 'alt' | 'src'> {
  src?: string | null;
  alt?: string;
  size?: 'mini' | 'small' | 'medium' | 'large' | 'xlarge';
}

// Default avatar SVG (base64) for user avatars - person icon
const DEFAULT_AVATAR_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239CA3AF'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

export const Avatar = ({ src, alt = 'Avatar', size = 'medium', className = '', ...props }: AvatarProps) => {
  const sizes = {
    mini: 'w-8 h-8',
    small: 'w-10 h-10',
    medium: 'w-12 h-12',
    large: 'w-16 h-16',
    xlarge: 'w-24 h-24',
  };

  const baseClasses = 'rounded-full object-cover bg-secondary flex-shrink-0';
  const combinedClasses = `${baseClasses} ${sizes[size]} ${className}`.trim();

  if (!src) {
    return (
      <div className={`${combinedClasses} flex items-center justify-center text-white bg-secondary`}>
        <span className="material-symbols-outlined">person</span>
      </div>
    );
  }

  return <CachedImage src={src ?? undefined} alt={alt} className={combinedClasses} loading="lazy" />;
};

/**
 * AvatarWithFallback - Avatar component with guaranteed SVG fallback to prevent infinite loops
 * Use this for user avatars where you want to ensure a default is always shown
 */
export interface AvatarWithFallbackProps {
  src?: string | null;
  alt?: string;
  className?: string;
}

export function AvatarWithFallback({ src, alt = 'Avatar', className }: AvatarWithFallbackProps) {
  const [imgError, setImgError] = useState(false);

  // Reset imgError when src changes
  useEffect(() => {
    setImgError(false);
  }, [src]);

  // Show default SVG if no src or error loading
  if (!src || imgError) {
    return (
      <img
        src={DEFAULT_AVATAR_SVG}
        alt={alt || "Default Avatar"}
        className={className}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setImgError(true)}
    />
  );
}
