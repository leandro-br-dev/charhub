import { type ImgHTMLAttributes } from 'react';
import { CachedImage } from './CachedImage';

export interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'size' | 'alt' | 'src'> {
  src?: string | null;
  alt?: string;
  size?: 'mini' | 'small' | 'medium' | 'large' | 'xlarge';
}

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
