import { useMemo, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { CharacterCard } from '../shared/components/CharacterCard';
import { useCharacterListQuery } from '../shared/hooks/useCharacterQueries';
import { usePageHeader } from '../../../hooks/usePageHeader';
import { useContentFilter as useGlobalAgeFilter } from '../../dashboard/hooks/useContentFilter';
import { characterService } from '../../../services';
import type { AgeRating } from '../../../types/characters';

type ViewMode = 'private' | 'public';

export default function CharacterHubPage(): JSX.Element {
  const { t } = useTranslation(['characters', 'common']);
  const navigate = useNavigate();
  const { setTitle } = usePageHeader();

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('private');
  const { ageRatings } = useGlobalAgeFilter({ persistToLocalStorage: true });
  const [favoriteCharacterIds, setFavoriteCharacterIds] = useState<Set<string>>(new Set());

  // Set page title
  useEffect(() => {
    setTitle(t('characters:hub.title', 'Characters'));
  }, [setTitle, t]);

  // Fetch favorites
  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const favorites = await characterService.getFavorites(1000); // High limit to fetch all
        const favoriteIds = new Set(favorites.map(char => char.id));
        setFavoriteCharacterIds(favoriteIds);
      } catch (error) {
        console.error('[CharacterHub] Failed to fetch favorites:', error);
      }
    };

    fetchFavorites();
  }, []);

  const filters = useMemo(() => {
    const params: { search?: string; ageRatings?: AgeRating[]; public?: string } = {};
    if (search.trim()) {
      params.search = search.trim();
    }
    if (ageRatings.length > 0) {
      params.ageRatings = ageRatings as any;
    }
    if (viewMode === 'private') {
      params.public = 'false'; // Request only user's own characters
    }
    // When viewMode is 'public', don't set any filter - backend will return public + own
    return params;
  }, [search, ageRatings, viewMode]);

  const { data, isLoading, isError, refetch } = useCharacterListQuery(filters);

  const items = data?.items ?? [];

  const handleFavoriteToggle = useCallback(
    async (characterId: string, shouldBeFavorite: boolean) => {
      try {
        const result = await characterService.toggleFavorite(characterId, shouldBeFavorite);

        if (result.success) {
          setFavoriteCharacterIds(prev => {
            const newSet = new Set(prev);
            if (shouldBeFavorite) {
              newSet.add(characterId);
            } else {
              newSet.delete(characterId);
            }
            return newSet;
          });
        }
      } catch (error) {
        console.error('[CharacterHub] Failed to toggle favorite:', error);
      }
    },
    []
  );

  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-title">{t('characters:hub.title')}</h1>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="max-w-2xl text-sm text-description">
            {t('characters:hub.subtitle')}
          </p>
          <div className="flex gap-2">
            <Button type="button" icon="add" onClick={() => navigate('/characters/create')}>
              {t('characters:hub.actions.newCharacter', 'New Character')}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-6 rounded-xl border border-border bg-normal p-4 sm:p-6">
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
              <Input
                type="search"
                icon="search"
                placeholder={t('characters:hub.filters.searchPlaceholder', 'Search by name or style')}
                value={search}
                onChange={event => setSearch((event.target as HTMLInputElement).value)}
              />
            </div>
            {/* Age rating filter moved to PageHeader */}
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
            <div className="flex gap-2">
              <Button type="button" icon="add" onClick={() => navigate('/characters/create')}>
                {t('characters:hub.actions.newCharacter', 'New Character')}
              </Button>
            </div>
          </div>
        )}

        {!isLoading && !isError && items.length > 0 && (
          <div className="flex flex-wrap items-stretch gap-4">
            {items.map(character => (
              <CharacterCard
                key={character.id}
                character={character}
                isFavorite={favoriteCharacterIds.has(character.id)}
                onFavoriteToggle={handleFavoriteToggle}
              />
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

