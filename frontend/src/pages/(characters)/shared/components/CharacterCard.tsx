import { useEffect, useMemo, useState, startTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { type CharacterSummary, type Character } from '../../../../types/characters';
import { CachedImage } from '../../../../components/ui/CachedImage';
import { useContentFilter } from '../../../../contexts/ContentFilterContext';
import { FavoriteButton } from '../../../../components/ui/FavoriteButton';
import { Tag as UITag } from '../../../../components/ui/Tag';

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
  imageCount?: number;
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
  imageCount,
}: CharacterCardProps): JSX.Element | null {
  const { t } = useTranslation(['characters', 'tags-character']);
  const navigate = useNavigate();
  const destination = to ?? `/characters/${character.id}`;
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [resolvedImageCount, setResolvedImageCount] = useState<number | null>(null);
  const { shouldBlurContent, shouldHideContent } = useContentFilter();

  const title = useMemo(() => {
    const name = [character.firstName, character.lastName].filter(Boolean).join(' ');
    return name || t('characters:labels.untitledCharacter');
  }, [character.firstName, character.lastName, t]);

  const shouldBlur = shouldBlurContent(character.ageRating, character.contentTags) || blurSensitive || blurNsfw;
  const shouldHide = shouldHideContent(character.ageRating, character.contentTags);

  const overlayAgeLabel = useMemo(() => {
    return character?.ageRating ? t(`ageRatings.${character.ageRating}`, { ns: 'characters' }) : '';
  }, [character?.ageRating, t]);

  const getAgeRatingClass = (ageRating: string | undefined): string => {
    if (!ageRating) return 'bg-success';
    const ratingMap: Record<string, string> = {
      SIXTEEN: 'bg-accent',
      EIGHTEEN: 'bg-black',
    };
    return ratingMap[ageRating] || 'bg-success';
  };

  const rowTags = useMemo(() => {
    const result: Array<{ label: string; tone: 'default' | 'secondary'; key: string }> = [];

    // Regular tags first (descriptive): primary tone via default in Tag with selected
    if ('tags' in character && character.tags) {
      for (const tag of character.tags) {
        if (tag?.name) {
          const label = t(`tags-character:${tag.name}.name`, tag.name);
          result.push({ label, tone: 'default', key: `tag-${tag.id}` });
        }
      }
    }

    // Content tags (secondary tone)
    if (character?.contentTags) {
      for (const ct of character.contentTags) {
        const label = t(`contentTags.${ct}`, { ns: 'characters' });
        result.push({ label, tone: 'secondary', key: `ct-${ct}` });
      }
    }

    return result;
  }, [character, t]);

  const handleCardClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isCreatingChat) return;
    if (onPlay) {
      startTransition(() => {
        onPlay(character.id);
      });
      return;
    }
    if (clickAction === 'edit') {
      startTransition(() => {
        navigate(`/characters/${character.id}/edit`);
      });
    } else if (clickAction === 'view') {
      startTransition(() => {
        navigate(`/characters/${character.id}`);
      });
    } else if (clickAction === 'startChat' || clickAction === 'chat') {
      setIsCreatingChat(true);
      startTransition(() => {
        navigate(`/chat/new?characterId=${character.id}`);
      });
    }
  };

  // Extract owner from character.creator or use the ownerName prop
  const owner = ownerName ?? ('creator' in character && character.creator ? character.creator.username || character.creator.displayName || '' : '');
  const stats = {
    chats: chatCount ?? 0,
    favorites: favoriteCount ?? 0,
    images: resolvedImageCount ?? (('images' in character && (character as any).images)
      ? ((character as any).images as Array<{ type: string }>).filter(i => i && i.type !== 'AVATAR').length
      : 0),
  };

  useEffect(() => {
    let cancelled = false;
    // Prefer prop when provided
    if (typeof imageCount === 'number') {
      setResolvedImageCount(imageCount);
      return () => { cancelled = true; };
    }

    // If not provided and not present on summary, fetch details
    if (resolvedImageCount === null && !('images' in character)) {
      import('../../../../services/characterService').then(({ characterService }) => {
        characterService.getImageCount(character.id).then((count) => {
          if (!cancelled) setResolvedImageCount(count);
        }).catch(() => {
          if (!cancelled) setResolvedImageCount(0);
        });
      });
    } else if ('images' in character) {
      // Ensure state matches if images are present
      const count = ((character as any).images as Array<{ type: string }> | undefined)?.filter(i => i && i.type !== 'AVATAR').length || 0;
      setResolvedImageCount(count);
    }
    return () => { cancelled = true; };
  }, [character.id, imageCount, character]);

  if (shouldHide) {
    // Remove from layout entirely when hidden
    return null;
  }

  return (
    <article
      onClick={handleCardClick}
      className="flex basis-[calc(50%-0.5rem)] sm:w-[180px] md:w-[192px] lg:w-[192px] max-w-[192px] flex-none cursor-pointer flex-col overflow-hidden rounded-lg bg-light shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl self-stretch"
    >
      <div className="relative">
        {character.avatar ? (
          <CachedImage
            src={character.avatar}
            alt={title}
            loading="lazy"
            className={`h-40 w-full rounded-t-lg object-cover ${shouldBlur ? 'blur-sm brightness-75' : ''}`}
          />
        ) : (
          <div className="flex h-40 w-full items-center justify-center rounded-t-lg bg-slate-100 text-6xl text-slate-400 dark:bg-slate-800 dark:text-slate-600">
            <span className="material-symbols-outlined text-6xl">person</span>
          </div>
        )}
        {overlayAgeLabel ? (
          <div
            className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow ${getAgeRatingClass(
              character.ageRating,
            )}`}
          >
            {overlayAgeLabel}
          </div>
        ) : null}
        {isCreatingChat && (
          <div className="absolute inset-0 rounded-t-lg bg-black/70 backdrop-blur-sm">
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          </div>
        )}
        {onFavoriteToggle && (
          <FavoriteButton
            characterId={character.id}
            initialIsFavorited={isFavorite}
            onToggle={nextValue => onFavoriteToggle(character.id, nextValue)}
            size="small"
            className="absolute top-2 right-2"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate text-lg font-bold text-content" title={title}>
          {title}
        </h3>
        <div className="mb-1 min-h-[16px]">
          {owner ? (
            <p className="text-xs text-muted truncate">
              {t('characters:labels.owner', { defaultValue: 'by' })} <span className="font-semibold">{owner}</span>
            </p>
          ) : null}
        </div>
        <p className={`text-sm text-description line-clamp-2 mb-2 ${shouldBlur ? 'blur-sm select-none' : ''}`}>
          {character.personality || character.style || t('characters:labels.noDescription', 'No description')}
        </p>
        <div className={`flex flex-nowrap gap-1.5 overflow-hidden min-h-[28px] mb-2 ${shouldBlur ? 'blur-sm select-none' : ''}`}>
          {rowTags.map((tag) => (
            <UITag
              key={tag.key}
              label={tag.label}
              tone={tag.tone}
              selected
              disabled
              className="flex-shrink-0 whitespace-nowrap"
            />
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
          <div className="flex items-center gap-1" title={t('characters:labels.conversations', 'Conversations')}>
            <span className="material-symbols-outlined text-base">chat_bubble</span>
            <span>{stats.chats}</span>
          </div>
          <div className="flex items-center gap-1" title={t('characters:labels.favorites', 'Favorites')}>
            <span className="material-symbols-outlined text-base text-yellow-400">star</span>
            <span>{stats.favorites}</span>
          </div>
          <div className="flex items-center gap-1" title={t('characters:labels.images', 'Images')}>
            <span className="material-symbols-outlined text-base">photo_library</span>
            <span>{stats.images}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

