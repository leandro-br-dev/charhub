import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { characterStatsService } from '../../services/characterStatsService';
import { storyStatsService } from '../../services/storyStatsService';
import { assetStatsService } from '../../services/assetStatsService';
import { sceneStatsService } from '../../services/sceneStatsService';

type FavoriteType = 'character' | 'story' | 'asset' | 'scene';

interface FavoriteButtonProps {
  characterId?: string;
  storyId?: string;
  assetId?: string;
  sceneId?: string;
  initialIsFavorited?: boolean;
  onToggle?: (isFavorited: boolean) => void;
  size?: 'small' | 'medium' | 'large';
  readOnly?: boolean;
  className?: string;
}

export function FavoriteButton({
  characterId,
  storyId,
  assetId,
  sceneId,
  initialIsFavorited,
  onToggle,
  size = 'large',
  readOnly = false,
  className = '',
}: FavoriteButtonProps): JSX.Element {
  const { t } = useTranslation(['characters', 'assets', 'scenes']);
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited || false);
  const [isProcessing, setIsProcessing] = useState(false);

  const type: FavoriteType = characterId ? 'character' : storyId ? 'story' : assetId ? 'asset' : 'scene';
  const id = characterId || storyId || assetId || sceneId;

  useEffect(() => {
    let isMounted = true;
    if (typeof initialIsFavorited === 'boolean') {
      setIsFavorited(initialIsFavorited);
    } else if (!readOnly && id) {
      const fetchFavoriteStatus = async () => {
        try {
          const stats = type === 'character'
            ? await characterStatsService.getStats(id)
            : type === 'story'
            ? await storyStatsService.getStats(id)
            : type === 'scene'
            ? await sceneStatsService.getStats(id)
            : await assetStatsService.getStats(id);
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
  }, [id, type, initialIsFavorited, readOnly]);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (readOnly || isProcessing || !id) return;

    setIsProcessing(true);
    try {
      if (type === 'character') {
        await characterStatsService.toggleFavorite(id, !isFavorited);
      } else if (type === 'story') {
        await storyStatsService.toggleFavorite(id, !isFavorited);
      } else if (type === 'scene') {
        await sceneStatsService.toggleFavorite(id, !isFavorited);
      } else {
        await assetStatsService.toggleFavorite(id, !isFavorited);
      }
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