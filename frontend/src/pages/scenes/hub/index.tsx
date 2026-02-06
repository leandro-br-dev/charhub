import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { SceneCard } from '../shared/components/SceneCard';
import { useSceneListQuery } from '../shared/hooks/useSceneQueries';
import { usePageHeader } from '../../../hooks/usePageHeader';
import { Visibility } from '../../../types/common';
import type { SceneListParams } from '../../../types/scenes';

type ViewMode = 'private' | 'public';

export default function SceneHubPage(): JSX.Element {
  const { t } = useTranslation(['scenes', 'common']);
  const navigate = useNavigate();
  const { setTitle } = usePageHeader();

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('private');
  const [genreFilter, setGenreFilter] = useState('');
  const [moodFilter, setMoodFilter] = useState('');
  const [eraFilter, setEraFilter] = useState('');

  // Set page title
  useEffect(() => {
    setTitle(t('scenes:hub.title', 'Scenes'));
  }, [setTitle, t]);

  const filters = useMemo<SceneListParams>(() => {
    const params: SceneListParams = {};
    if (search.trim()) {
      params.search = search.trim();
    }
    if (genreFilter) {
      params.genre = genreFilter;
    }
    if (moodFilter) {
      params.mood = moodFilter;
    }
    if (eraFilter) {
      params.era = eraFilter;
    }
    // For private mode (Minhas Cenas), don't filter by visibility
    // Backend returns user's own scenes regardless of visibility
    // For public mode, explicitly request public scenes
    if (viewMode === 'public') {
      params.visibility = Visibility.PUBLIC;
    }
    return params;
  }, [search, genreFilter, moodFilter, eraFilter, viewMode]);

  const { data, isLoading, isError, refetch } = useSceneListQuery(filters);

  const items = data?.items ?? [];

  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-title">{t('scenes:hub.title')}</h1>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="max-w-2xl text-sm text-description">
            {t('scenes:hub.subtitle')}
          </p>
          <div className="flex gap-2">
            <Button type="button" icon="add" onClick={() => navigate('/scenes/create')}>
              {t('scenes:hub.actions.newScene', 'New Scene')}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-6 rounded-xl border border-border bg-normal p-4 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex rounded-2xl border border-border bg-background p-1 text-sm">
            <button
              type="button"
              className={`flex-1 rounded-xl px-4 py-2 font-medium transition ${
                viewMode === 'private' ? 'bg-card text-title shadow' : 'text-description'
              }`}
              onClick={() => setViewMode('private')}
            >
              {t('scenes:hub.tabs.myScenes')}
            </button>
            <button
              type="button"
              className={`flex-1 rounded-xl px-4 py-2 font-medium transition ${
                viewMode === 'public' ? 'bg-card text-title shadow' : 'text-description'
              }`}
              onClick={() => setViewMode('public')}
            >
              {t('scenes:hub.tabs.publicGallery')}
            </button>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Input
              type="search"
              icon="search"
              placeholder={t('scenes:hub.filters.searchPlaceholder', 'Search scenes...')}
              value={search}
              onChange={(event) => setSearch((event.target as HTMLInputElement).value)}
              className="sm:max-w-xs"
            />
          </div>
        </div>

        {/* Filter chips */}
        {(genreFilter || moodFilter || eraFilter) && (
          <div className="flex flex-wrap gap-2">
            {genreFilter && (
              <button
                type="button"
                onClick={() => setGenreFilter('')}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
              >
                <span>{t('scenes:filters.genre')}: {genreFilter}</span>
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
            {moodFilter && (
              <button
                type="button"
                onClick={() => setMoodFilter('')}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
              >
                <span>{t('scenes:filters.mood')}: {moodFilter}</span>
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
            {eraFilter && (
              <button
                type="button"
                onClick={() => setEraFilter('')}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
              >
                <span>{t('scenes:filters.era')}: {eraFilter}</span>
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
        )}

        {isLoading && (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-description">
            <span className="material-symbols-outlined animate-spin text-5xl">progress_activity</span>
            <p>{t('scenes:hub.states.loading')}</p>
          </div>
        )}

        {isError && !isLoading && (
          <div className="flex h-64 flex-col items-center justify-center gap-4 text-center text-description">
            <span className="material-symbols-outlined text-6xl text-red-500">error</span>
            <p>{t('scenes:hub.states.error')}</p>
            <Button type="button" variant="secondary" icon="refresh" onClick={() => refetch()}>
              {t('scenes:hub.actions.retry')}
            </Button>
          </div>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <div className="flex h-64 flex-col items-center justify-center gap-4 text-center text-description">
            <span className="material-symbols-outlined text-6xl">sentiment_dissatisfied</span>
            <div className="space-y-2">
              <p>{t('scenes:hub.states.empty', { context: viewMode })}</p>
              <p className="text-xs text-muted">
                {search ? t('scenes:hub.states.emptySearchHint') : t('scenes:hub.states.emptyHint')}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" icon="add" onClick={() => navigate('/scenes/create')}>
                {t('scenes:hub.actions.newScene', 'New Scene')}
              </Button>
            </div>
          </div>
        )}

        {!isLoading && !isError && items.length > 0 && (
          <div className="flex flex-wrap items-stretch gap-4">
            {items.map((scene) => (
              <SceneCard
                key={scene.id}
                scene={scene}
              />
            ))}
          </div>
        )}

        {items.length > 0 && (
          <footer className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted">
            <span>
              {t(items.length === 1 ? 'scenes:hub.labels.total' : 'scenes:hub.labels.total_plural', {
                count: items.length,
              })}
            </span>
            <Link
              to="/scenes/create"
              className="text-primary underline-offset-2 hover:underline"
            >
              {t('scenes:hub.labels.quickCreateLink')}
            </Link>
          </footer>
        )}
      </div>
    </section>
  );
}
