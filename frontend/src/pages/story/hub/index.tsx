import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { StoryCard } from '../shared/components';
import { usePageHeader } from '../../../hooks/usePageHeader';
import { useContentFilter as useGlobalAgeFilter } from '../../dashboard/hooks/useContentFilter';
import { storyService } from '../../../services/storyService';
import type { Story } from '../../../types/story';
import type { AgeRating } from '../../../types/characters';

type ViewMode = 'private' | 'public';

export default function StoryHubPage(): JSX.Element {
  const { t } = useTranslation(['story', 'common']);
  const navigate = useNavigate();
  const { setTitle } = usePageHeader();

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('private');
  const { ageRatings, blurNsfw } = useGlobalAgeFilter({ persistToLocalStorage: true });
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set page title
  useEffect(() => {
    setTitle(t('story:hub.title', 'Stories'));
  }, [setTitle, t]);

  // Fetch stories
  useEffect(() => {
    const fetchStories = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (viewMode === 'private') {
          const response = await storyService.getMyStories({ limit: 100 });
          setStories(response.items);
        } else {
          const publicStories = await storyService.getPopular(100);
          setStories(publicStories);
        }
      } catch (err) {
        console.error('[StoryHub] Failed to fetch stories:', err);
        setError(t('story:errors.failedToLoad', 'Failed to load stories'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchStories();
  }, [viewMode, t]);

  // Filter stories by search and age ratings
  const filteredStories = useMemo(() => {
    let filtered = stories;

    // Filter by search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(story =>
        story.title.toLowerCase().includes(searchLower) ||
        story.synopsis?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by age ratings
    if (ageRatings.length > 0) {
      filtered = filtered.filter(story =>
        ageRatings.includes(story.ageRating as AgeRating)
      );
    }

    return filtered;
  }, [stories, search, ageRatings]);

  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-title">{t('story:hub.title', 'Stories')}</h1>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="max-w-2xl text-sm text-description">
            {t('story:hub.subtitle', 'Explore and manage your interactive stories')}
          </p>
          <Button type="button" icon="add" onClick={() => navigate('/stories/create')}>
            {t('story:hub.actions.createStory', 'Create Story')}
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-6 rounded-xl border border-border bg-normal p-4 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Search Input */}
          <div className="w-full md:max-w-md">
            <Input
              icon="search"
              placeholder={t('story:hub.searchPlaceholder', 'Search stories...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* View Mode Selector */}
          <div className="flex items-center gap-2 rounded-lg bg-light p-1">
            <button
              type="button"
              onClick={() => setViewMode('private')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'private'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-content'
              }`}
            >
              {t('story:hub.viewMode.private', 'My Stories')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('public')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'public'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-content'
              }`}
            >
              {t('story:hub.viewMode.public', 'Explore')}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center text-muted">
              <span className="material-symbols-outlined animate-spin text-4xl mb-2">progress_activity</span>
              <p>{t('common:loading', 'Loading...')}</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <span className="material-symbols-outlined text-6xl text-danger mb-4">error</span>
              <p className="text-danger">{error}</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredStories.length === 0 && stories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="material-symbols-outlined text-8xl text-muted mb-4">book</span>
            <h3 className="mb-2 text-xl font-semibold text-content">
              {viewMode === 'private'
                ? t('story:hub.empty.noStoriesYet', 'No stories yet')
                : t('story:hub.empty.noPublicStories', 'No public stories available')}
            </h3>
            <p className="mb-6 max-w-md text-muted">
              {viewMode === 'private'
                ? t('story:hub.empty.createFirstStory', 'Create your first interactive story')
                : t('story:hub.empty.checkBackLater', 'Check back later for new stories')}
            </p>
            {viewMode === 'private' && (
              <Button icon="add" onClick={() => navigate('/stories/create')}>
                {t('story:hub.actions.createStory', 'Create Story')}
              </Button>
            )}
          </div>
        )}

        {/* No Results State */}
        {!isLoading && !error && filteredStories.length === 0 && stories.length > 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="material-symbols-outlined text-8xl text-muted mb-4">search_off</span>
            <h3 className="mb-2 text-xl font-semibold text-content">
              {t('story:hub.noResults.title', 'No stories found')}
            </h3>
            <p className="mb-6 max-w-md text-muted">
              {t('story:hub.noResults.description', 'Try adjusting your search or filters')}
            </p>
            <Button variant="light" onClick={() => setSearch('')}>
              {t('common:clearSearch', 'Clear Search')}
            </Button>
          </div>
        )}

        {/* Stories Grid */}
        {!isLoading && !error && filteredStories.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredStories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                clickAction={viewMode === 'public' ? 'play' : 'view'}
                blurNsfw={blurNsfw}
              />
            ))}
          </div>
        )}

        {/* Results Count */}
        {!isLoading && !error && filteredStories.length > 0 && (
          <div className="text-center text-sm text-muted">
            {t('story:hub.resultsCount', {
              count: filteredStories.length,
              total: stories.length,
              defaultValue: 'Showing {{count}} of {{total}} stories',
            })}
          </div>
        )}
      </div>
    </section>
  );
}
