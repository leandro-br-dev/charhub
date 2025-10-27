import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { type CharacterSummary, type Character } from '../../../../types/characters';
import { CachedImage } from '../../../../components/ui/CachedImage';

export interface CharacterCardProps {
  character: CharacterSummary | Character;
  to?: string;
  clickAction?: 'edit' | 'view' | 'startChat' | 'chat'; // Added 'chat' alias for 'startChat'
  onFavoriteToggle?: (characterId: string, nextValue: boolean) => void;
  isFavorite?: boolean;
  blurSensitive?: boolean;
  blurNsfw?: boolean; // Alias for blurSensitive for backward compatibility
  onPlay?: (characterId: string) => void;
  ownerName?: string;
  chatCount?: number;
  favoriteCount?: number;
  stickerCount?: number;
}

export function CharacterCard({
  character,
  to,
  clickAction = 'view',
  onFavoriteToggle,
  isFavorite = false,
  blurSensitive = false,
  blurNsfw = false,
  onPlay,
  ownerName,
  chatCount,
  favoriteCount,
  stickerCount,
}: CharacterCardProps): JSX.Element {
  const { t } = useTranslation(['characters']);
  const navigate = useNavigate();
  const destination = to ?? `/characters/${character.id}`;
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const title = useMemo(() => {
    const name = [character.firstName, character.lastName].filter(Boolean).join(' ');
    return name || t('characters:labels.untitledCharacter');
  }, [character.firstName, character.lastName, t]);

  const isSensitive = character.ageRating === 'EIGHTEEN' || character.contentTags.length > 0;
  const shouldBlur = (blurSensitive || blurNsfw) && isSensitive;
  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onFavoriteToggle) onFavoriteToggle(character.id, !isFavorite);
  };

  const handleCardClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isCreatingChat) return;
    if (onPlay) {
      onPlay(character.id);
      return;
    }
    if (clickAction === 'edit') {
      navigate(`/characters/${character.id}/edit`);
    } else if (clickAction === 'view') {
      navigate(`/characters/${character.id}`);
    } else if (clickAction === 'startChat' || clickAction === 'chat') {
      setIsCreatingChat(true);
      // Route to chat creation page with character pre-selected; adjust when API is hooked
      navigate(`/chat/new?characterId=${character.id}`);
    }
  };

  const chips = (character.contentTags || []).slice(0, 3);
  const owner = ownerName ?? '';
  const stats = {
    chats: chatCount ?? 0,
    favorites: favoriteCount ?? 0,
    stickers: stickerCount ?? ('stickerCount' in character ? character.stickerCount ?? 0 : 0),
  };

  return (
    <article
      onClick={handleCardClick}
      className="h-full cursor-pointer overflow-hidden rounded-lg bg-light shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative">
        {character.avatar ? (
          <CachedImage
            src={character.avatar}
            alt={title}
            loading="lazy"
            className={`h-48 w-full rounded-t-lg object-cover ${shouldBlur ? 'blur-sm brightness-75' : ''}`}
          />
        ) : (
          <div className="flex h-48 w-full items-center justify-center rounded-t-lg bg-slate-100 text-6xl text-slate-400 dark:bg-slate-800 dark:text-slate-600">
            <span className="material-symbols-outlined text-6xl">person</span>
          </div>
        )}
        {isCreatingChat && (
          <div className="absolute inset-0 rounded-t-lg bg-black/70 backdrop-blur-sm">
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          </div>
        )}
        <div className="absolute left-2 top-2 flex gap-2">
          <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            {t(`characters:ageRatings.${character.ageRating}`)}
          </span>
        </div>
        {onFavoriteToggle && (
          <button
            onClick={handleFavorite}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition-colors hover:bg-black/70"
            title={isFavorite ? t('characters:accessibility.removeFromFavorites') : t('characters:accessibility.addToFavorites')}
          >
            <span className={`material-symbols-outlined text-xl ${isFavorite ? 'text-yellow-400' : 'text-white/80'}`}>
              {isFavorite ? 'star' : 'star_outline'}
            </span>
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate text-lg font-bold text-content" title={title}>
          {title}
        </h3>
        {owner && (
          <p className="mb-2 text-xs text-muted">
            {t('characters:labels.owner', { defaultValue: 'by' })} <span className="font-semibold">{owner}</span>
          </p>
        )}
        <p className={`flex-grow text-sm text-description line-clamp-2 ${shouldBlur ? 'blur-sm select-none' : ''}`}>
          {character.personality || character.style || t('characters:labels.noDescription', 'No description')}
        </p>
        {chips.length > 0 && (
          <div className={`mt-3 flex flex-nowrap gap-1.5 overflow-hidden ${shouldBlur ? 'blur-sm select-none' : ''}`}>
            {chips.map(tag => (
              <span key={`${character.id}-${tag}`} className="flex-shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs text-black">
                {t(`characters:contentTags.${tag}`)}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
          <div className="flex items-center gap-1" title={t('characters:labels.conversations', 'Conversations')}>
            <span className="material-symbols-outlined text-base">chat_bubble</span>
            <span>{stats.chats}</span>
          </div>
          <div className="flex items-center gap-1" title={t('characters:labels.favorites', 'Favorites')}>
            <span className="material-symbols-outlined text-base text-yellow-400">star</span>
            <span>{stats.favorites}</span>
          </div>
          <div className="flex items-center gap-1" title={t('characters:labels.stickers', 'Stickers')}>
            <span className="material-symbols-outlined text-base">photo_library</span>
            <span>{stats.stickers}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
