import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { characterStatsService } from '../../services/characterStatsService';

interface FavoriteButtonProps {
  characterId: string;
  initialIsFavorited?: boolean;
  onToggle?: (isFavorited: boolean) => void;
  size?: 'small' | 'medium' | 'large';
  readOnly?: boolean;
  className?: string;
}

export function FavoriteButton({
  characterId,
  initialIsFavorited,
  onToggle,
  size = 'large',
  readOnly = false,
  className = '',
}: FavoriteButtonProps): JSX.Element {
  const { t } = useTranslation(['characters']);
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited || false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (typeof initialIsFavorited === 'boolean') {
      setIsFavorited(initialIsFavorited);
    } else if (!readOnly) {
      const fetchFavoriteStatus = async () => {
        try {
          const stats = await characterStatsService.getStats(characterId);
          if (isMounted) {
            setIsFavorited(stats.isFavoritedByUser);
          }
        } catch (error) {
          console.error('[FavoriteButton] Failed to fetch favorite status', error);
        }
      };
      fetchFavoriteStatus();
    }
    return () => {
      isMounted = false;
    };
  }, [characterId, initialIsFavorited, readOnly]);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (readOnly || isProcessing) return;

    setIsProcessing(true);
    try {
      await characterStatsService.toggleFavorite(characterId, !isFavorited);
      const next = !isFavorited;
      setIsFavorited(next);
      onToggle?.(next);
    } catch (error) {
      console.error('[FavoriteButton] Failed to toggle favorite', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const sizeClasses = {
    small: 'h-8 w-8 text-lg',
    medium: 'h-10 w-10 text-xl',
    large: 'h-12 w-12 text-2xl',
  };

  const buttonClasses = `
    flex items-center justify-center rounded-full z-10
    transition-all disabled:opacity-50
    ${sizeClasses[size]}
    ${readOnly ? 'cursor-default bg-transparent' : 'bg-white/20 backdrop-blur-sm hover:bg-white/30 hover:scale-110'}
    ${className}
  `;

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={isProcessing}
      className={buttonClasses}
      aria-label={
        isFavorited
          ? t('characters:accessibility.removeFromFavorites')
          : t('characters:accessibility.addToFavorites')
      }
    >
      <span
        className="material-symbols-outlined transition-colors"
        style={{
          fontVariationSettings: isFavorited
            ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 48"
            : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 48",
          color: isFavorited ? '#F59E0B' : 'rgba(255, 255, 255, 0.7)',
        }}
      >
        star
      </span>
    </button>
  );
}