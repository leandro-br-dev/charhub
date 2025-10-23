import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { CharacterCard } from '../shared/components/CharacterCard';
import { useCharacterListQuery } from '../shared/hooks/useCharacterQueries';
import { AGE_RATING_OPTIONS } from '../shared/utils/constants';
import { type AgeRating } from '../../../types/characters';

type ViewMode = 'private' | 'public';

export default function CharacterHubPage(): JSX.Element {
  const { t } = useTranslation(['characters', 'common']);
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('private');
  const [ageRatingFilter, setAgeRatingFilter] = useState<'all' | AgeRating>('all');
  const [blurSensitive, setBlurSensitive] = useState(true);

  const filters = useMemo(() => {
    const params: { search?: string; ageRatings?: AgeRating[]; isPublic?: boolean } = {};
    if (search.trim()) {
      params.search = search.trim();
    }
    if (ageRatingFilter !== 'all') {
      params.ageRatings = [ageRatingFilter];
    }
    // Only filter by isPublic when viewing public gallery
    // For "My Characters" view, don't set isPublic to show all user's characters (both public and private)
    if (viewMode === 'public') {
      params.isPublic = true;
    }
    return params;
  }, [search, ageRatingFilter, viewMode]);

  const { data, isLoading, isError, refetch } = useCharacterListQuery(filters);

  const items = data?.items ?? [];

  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-6 rounded-3xl border border-border bg-card p-8 shadow-lg lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-title">{t('characters:hub.title')}</h1>
          <p className="mt-2 max-w-2xl text-sm text-description">
            {t('characters:hub.subtitle')}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" variant="secondary" icon="upload" onClick={() => setBlurSensitive(prev => !prev)}>
            {blurSensitive ? t('characters:hub.actions.blurSensitive') : t('characters:hub.actions.showSensitive')}
          </Button>
          <Button type="button" icon="add" onClick={() => navigate('/characters/create')}>
            {t('characters:hub.actions.createCharacter')}
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-6 rounded-3xl border border-border bg-card p-6 shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex rounded-2xl border border-border bg-background p-1 text-sm">
            <button
              type="button"
              className={`flex-1 rounded-xl px-4 py-2 font-medium transition ${viewMode === 'private' ? 'bg-card text-title shadow' : 'text-description'}`}
              onClick={() => setViewMode('private')}
            >
              {t('characters:hub.tabs.myCharacters')}
            </button>
            <button
              type="button"
              className={`flex-1 rounded-xl px-4 py-2 font-medium transition ${viewMode === 'public' ? 'bg-card text-title shadow' : 'text-description'}`}
              onClick={() => setViewMode('public')}
            >
              {t('characters:hub.tabs.publicGallery')}
            </button>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="relative flex-1 sm:max-w-xs">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input
                type="search"
                className="w-full rounded-2xl border border-border bg-input py-2 pl-10 pr-4 text-sm text-title shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder={t('characters:hub.filters.searchPlaceholder') ?? ''}
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
            </div>
            <select
              className="rounded-2xl border border-border bg-input px-4 py-2 text-sm text-description shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={ageRatingFilter}
              onChange={event => setAgeRatingFilter(event.target.value === 'all' ? 'all' : (event.target.value as AgeRating))}
            >
              <option value="all">{t('characters:hub.filters.allAgeRatings')}</option>
              {AGE_RATING_OPTIONS.map(option => (
                <option key={option} value={option}>
                  {t(`characters:ageRatings.${option}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading && (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-description">
            <span className="material-symbols-outlined animate-spin text-5xl">progress_activity</span>
            <p>{t('characters:hub.states.loading')}</p>
          </div>
        )}

        {isError && !isLoading && (
          <div className="flex h-64 flex-col items-center justify-center gap-4 text-center text-description">
            <span className="material-symbols-outlined text-6xl text-red-500">error</span>
            <p>{t('characters:hub.states.error')}</p>
            <Button type="button" variant="secondary" icon="refresh" onClick={() => refetch()}>
              {t('characters:hub.actions.retry')}
            </Button>
          </div>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <div className="flex h-64 flex-col items-center justify-center gap-4 text-center text-description">
            <span className="material-symbols-outlined text-6xl">sentiment_dissatisfied</span>
            <div className="space-y-2">
              <p>{t('characters:hub.states.empty', { context: viewMode })}</p>
              <p className="text-xs text-muted">
                {search ? t('characters:hub.states.emptySearchHint') : t('characters:hub.states.emptyHint')}
              </p>
            </div>
            <Button type="button" icon="add" onClick={() => navigate('/characters/create')}>
              {t('characters:hub.actions.createCharacter')}
            </Button>
          </div>
        )}

        {!isLoading && !isError && items.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {items.map(character => (
              <CharacterCard key={character.id} character={character} blurSensitive={blurSensitive} />
            ))}
          </div>
        )}

        {items.length > 0 && (
          <footer className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted">
            <span>{t(items.length === 1 ? 'characters:hub.labels.total' : 'characters:hub.labels.total_plural', { count: items.length })}</span>
            <Link to="/characters/create" className="text-primary underline-offset-2 hover:underline">
              {t('characters:hub.labels.quickCreateLink')}
            </Link>
          </footer>
        )}
      </div>
    </section>
  );
}
