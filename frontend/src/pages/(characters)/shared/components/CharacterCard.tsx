import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { type CharacterSummary } from '../../../../types/characters';

export interface CharacterCardProps {
  character: CharacterSummary;
  to?: string;
  onFavoriteToggle?: (characterId: string, nextValue: boolean) => void;
  isFavorite?: boolean;
  blurSensitive?: boolean;
}

export function CharacterCard({
  character,
  to,
  onFavoriteToggle,
  isFavorite = false,
  blurSensitive = false
}: CharacterCardProps): JSX.Element {
  const { t } = useTranslation(['characters']);
  const destination = to ?? `/characters/${character.id}`;

  const title = useMemo(() => {
    const name = [character.firstName, character.lastName].filter(Boolean).join(' ');
    return name || t('characters:labels.untitledCharacter');
  }, [character.firstName, character.lastName, t]);

  const isSensitive = character.ageRating === 'EIGHTEEN' || character.contentTags.length > 0;
  const shouldBlur = blurSensitive && isSensitive;

  return (
    <article className="group relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/70">
      <Link to={destination} className="flex h-full flex-col">
        <div className="relative h-48 w-full overflow-hidden">
          {character.avatar ? (
            <img
              src={character.avatar}
              alt={title}
              loading="lazy"
              className={`h-full w-full object-cover transition duration-300 ${shouldBlur ? 'blur-sm brightness-75' : ''}`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-100 text-6xl text-slate-400 dark:bg-slate-800 dark:text-slate-600">
              <span className="material-symbols-outlined text-6xl">person</span>
            </div>
          )}
          <div className="absolute left-3 top-3 flex gap-2">
            <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur">
              {t(`characters:ageRatings.${character.ageRating}`)}
            </span>
          </div>
          {onFavoriteToggle && (
            <button
              type="button"
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/70 text-white backdrop-blur transition hover:bg-primary"
              onClick={event => {
                event.preventDefault();
                event.stopPropagation();
                onFavoriteToggle(character.id, !isFavorite);
              }}
              aria-label={isFavorite ? t('characters:accessibility.removeFromFavorites') : t('characters:accessibility.addToFavorites')}
            >
              <span className="material-symbols-outlined text-2xl">
                {isFavorite ? 'favorite' : 'favorite_border'}
              </span>
            </button>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-3 px-4 pb-5 pt-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
            {character.style && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{character.style}</p>
            )}
          </div>
          {character.contentTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {character.contentTags.slice(0, 4).map(tag => (
                <span
                  key={`${character.id}-${tag}`}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  {t(`characters:contentTags.${tag}`)}
                </span>
              ))}
              {character.contentTags.length > 4 && (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                  +{character.contentTags.length - 4}
                </span>
              )}
            </div>
          )}
          <div className="mt-auto flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{t('characters:labels.updatedAt', { date: new Date(character.updatedAt).toLocaleDateString() })}</span>
            {character.tagCount != null && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-base">sell</span>
                {character.tagCount}
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
