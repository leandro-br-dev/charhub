import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { HorizontalScroller } from '../../components/ui/horizontal-scroller';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '../../components/ui/Tabs';
import { CharacterCard } from '../(characters)/shared/components';
import { DashboardCarousel, RecentConversations, StoryCard } from './components';
import { useContentFilter } from './hooks';
import { useContentFilter as useGlobalContentFilter } from '../../contexts/ContentFilterContext';
import { dashboardService, characterService, storyService, chatService } from '../../services';
import type { Character } from '../../types/characters';
import type { CarouselHighlight } from '../../services/dashboardService';
import type { Story } from '../../types/story';
import type { CreateConversationPayload } from '../../types/chat';
import { useAuth } from '../../hooks/useAuth';
import { PublicHeader } from '../../components/layout';
import { AuthenticatedLayout } from '../../layouts/AuthenticatedLayout';
import { usePageHeader } from '../../hooks/usePageHeader';
import { useToast } from '../../contexts/ToastContext';
import { useCardsPerRow } from '../../hooks/useCardsPerRow';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useCharacterFilters } from '../../hooks/useCharacterFilters';
import { CharacterGridSkeleton } from '../../components/ui/CharacterCardSkeleton';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { FilterPanel } from '../../components/filters';

// Component for authenticated users (inside AuthenticatedLayout)
function AuthenticatedDashboard(): JSX.Element {
  const { setTitle } = usePageHeader();
  const { t } = useTranslation(['dashboard', 'common']);

  useEffect(() => {
    setTitle(t('dashboard:title'));
  }, [setTitle, t]);

  return <DashboardContent />;
}

// Main dashboard content (shared by both authenticated and public)
function DashboardContent(): JSX.Element {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const { shouldHideContent } = useGlobalContentFilter();
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();

  // Local state for active tab (managed by Tabs component)
  const [activeTab, setActiveTab] = useState<string>('discover');

  // Track which tabs have been loaded for lazy loading
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['discover']));

  // Helper function to build story context for chat
  const buildStoryContext = (story: Story): string => {
    let context = `STORY: ${story.title}\n\n`;

    if (story.synopsis) {
      context += `SYNOPSIS:\n${story.synopsis}\n\n`;
    }

    if (story.objectives && story.objectives.length > 0) {
      context += `OBJECTIVES:\n`;
      story.objectives.forEach((obj, index) => {
        context += `${index + 1}. ${obj.description}\n`;
      });
      context += '\n';
    }

    if (story.initialText) {
      context += `INITIAL SCENE:\n${story.initialText}\n\n`;
    }

    context += `CHARACTERS IN THIS STORY:\n`;
    story.characters?.forEach(char => {
      context += `- ${char.firstName} ${char.lastName || ''}\n`;
    });

    context += `\nIMPORTANT: You are participating in an interactive story. Stay in character and respond according to the story context and objectives above.`;

    return context;
  };

  // Age rating filter moved to PageHeader

  // State
  const [carouselHighlights, setCarouselHighlights] = useState<CarouselHighlight[]>([]);
  const [popularCharacters, setPopularCharacters] = useState<Character[]>([]);
  const [newestCharacters, setNewestCharacters] = useState<Character[]>([]);
  const [favoriteCharacters, setFavoriteCharacters] = useState<Character[]>([]);
  const [discoverView, setDiscoverView] = useState<'popular' | 'newest' | 'favorites'>('popular');
  const [favoriteCharacterIds, setFavoriteCharacterIds] = useState<Set<string>>(new Set());
  const [popularStories, setPopularStories] = useState<Story[]>([]);
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [storyView, setStoryView] = useState<'my' | 'popular'>('my');
  const [isLoadingCarousel, setIsLoadingCarousel] = useState(true);

  // Infinite scroll state
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);

  // Calculate cards per row for responsive initial batch
  const cardsPerRow = useCardsPerRow();
  const initialLimit = Math.max(cardsPerRow * 6, 12); // At least 12 cards or 6 rows
  const batchSize = cardsPerRow * 2; // Load 2 rows at a time on scroll

  // Content filter hook
  const {
    ageRatings,
    blurNsfw,
    setAgeRatings,
    setBlurNsfw,
    isNsfwAllowed,
  } = useContentFilter({
    defaultAgeRatings: ['L'],
    defaultBlurNsfw: false,
    persistToLocalStorage: true,
  });

  // Character filters hook (gender, species)
  const {
    filters: characterFilters,
    updateFilter: updateCharacterFilter,
    clearFilters: clearCharacterFilters,
    activeFiltersCount,
  } = useCharacterFilters();

  // Ensure non-authenticated users always see "popular" views
  useEffect(() => {
    if (!isAuthenticated) {
      if (discoverView === 'favorites' || discoverView === 'newest') {
        setDiscoverView('popular');
      }
      if (storyView === 'my') {
        setStoryView('popular');
      }
    }
  }, [isAuthenticated, discoverView, storyView]);

  // Set document title for public dashboard (authenticated uses AuthenticatedDashboard)
  useEffect(() => {
    if (!isAuthenticated) {
      document.title = 'CharHub - Dashboard';
    }
  }, [isAuthenticated]);

  // Fetch carousel highlights
  useEffect(() => {
    const fetchCarousel = async () => {
      setIsLoadingCarousel(true);
      try {
        const highlights = await dashboardService.getCarouselHighlights();
        setCarouselHighlights(highlights);
      } catch (error) {
        console.error('[Dashboard] Failed to fetch carousel highlights:', error);
      } finally {
        setIsLoadingCarousel(false);
      }
    };

    fetchCarousel();
  }, []);

  // Fetch popular characters with infinite scroll
  // Using React Query for better caching and cache key management
  // ONLY fetch the currently active sort view to avoid unnecessary requests
  const popularCharactersQuery = useQuery({
    queryKey: ['dashboard', 'characters', 'popular', ageRatings, characterFilters.genders, characterFilters.species],
    queryFn: () => characterService.getCharactersForDashboard({
      skip: 0,
      limit: initialLimit,
      sortBy: 'popular',
      ageRatings,
      genders: characterFilters.genders,
      species: characterFilters.species,
      includeStats: true,
    }),
    enabled: activeTab === 'discover' && discoverView === 'popular',
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const newestCharactersQuery = useQuery({
    queryKey: ['dashboard', 'characters', 'newest', ageRatings, characterFilters.genders, characterFilters.species],
    queryFn: () => characterService.getCharactersForDashboard({
      skip: 0,
      limit: initialLimit,
      sortBy: 'newest',
      ageRatings,
      genders: characterFilters.genders,
      species: characterFilters.species,
      includeStats: true,
    }),
    enabled: activeTab === 'discover' && discoverView === 'newest',
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const favoritesQuery = useQuery({
    queryKey: ['dashboard', 'characters', 'favorites', ageRatings, characterFilters.genders, characterFilters.species],
    queryFn: async () => {
      const result = await characterService.getCharactersForDashboard({
        skip: 0,
        limit: initialLimit,
        sortBy: 'favorites',
        ageRatings,
        genders: characterFilters.genders,
        species: characterFilters.species,
        includeStats: true,
      });

      // Extract favorite IDs from the result
      const favoriteIds = new Set(result.characters.map(char => char.id));
      setFavoriteCharacterIds(favoriteIds);

      return result.characters;
    },
    enabled: isAuthenticated && activeTab === 'discover' && discoverView === 'favorites',
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Stories query - lazy loaded
  const storiesQuery = useQuery({
    queryKey: ['dashboard', 'stories'],
    queryFn: async () => {
      const popular = await storyService.getPopular(8);
      setPopularStories(popular);
      return popular;
    },
    enabled: activeTab === 'story' || loadedTabs.has('story'),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const myStoriesQuery = useQuery({
    queryKey: ['dashboard', 'myStories'],
    queryFn: async () => {
      const myStoriesData = await storyService.getMyStories({ limit: 8 });
      setMyStories(myStoriesData.items);
      return myStoriesData.items;
    },
    enabled: isAuthenticated && (activeTab === 'story' || loadedTabs.has('story')),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Update state from query results
  useEffect(() => {
    if (popularCharactersQuery.data) {
      setPopularCharacters(popularCharactersQuery.data.characters);
      setHasMore(popularCharactersQuery.data.hasMore);
      setInitialLoading(false);
    }
  }, [popularCharactersQuery.data]);

  useEffect(() => {
    if (newestCharactersQuery.data) {
      setNewestCharacters(newestCharactersQuery.data.characters);
    }
  }, [newestCharactersQuery.data]);

  useEffect(() => {
    if (favoritesQuery.data) {
      setFavoriteCharacters(favoritesQuery.data);
    }
  }, [favoritesQuery.data]);

  // Load more characters when infinite scroll triggers
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const result = await characterService.getCharactersForDashboard({
        skip: popularCharacters.length,
        limit: batchSize,
        sortBy: 'popular',
        ageRatings,
        genders: characterFilters.genders,
        species: characterFilters.species,
        includeStats: true,
      });

      setPopularCharacters(prev => [...prev, ...result.characters]);
      setHasMore(result.hasMore);

      // Stats are now included in the response, no need to fetch individually
      // The stats are embedded in each character object
    } catch (error) {
      console.error('[Dashboard] Failed to load more characters:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, popularCharacters.length, batchSize, ageRatings, characterFilters.genders, characterFilters.species]);

  // Setup infinite scroll observer
  const { loadMoreRef, isIntersecting } = useInfiniteScroll({
    threshold: 0.0, // Trigger as soon as any part is visible
    rootMargin: '400px' // Trigger 400px before element
  });

  // Trigger load more when observer fires (only for popular view)
  useEffect(() => {
    if (isIntersecting && !initialLoading && discoverView === 'popular' && hasMore) {
      loadMore();
    }
  }, [isIntersecting, initialLoading, discoverView, hasMore, loadMore]);

  // Handlers
  // Age rating selection moved to header via PageHeader

  const handleCharacterClick = useCallback(
    (character: Character, action: 'view' | 'chat') => {
      if (action === 'chat') {
        navigate(`/chat/new?characterId=${character.id}`);
      } else {
        navigate(`/characters/${character.id}`);
      }
    },
    [navigate]
  );

  const handleFavoriteToggle = useCallback(
    async (characterId: string, shouldBeFavorite: boolean) => {
      try {
        const result = await characterService.toggleFavorite(characterId, shouldBeFavorite);

        if (result.success) {
          // Update favorite IDs set
          setFavoriteCharacterIds(prev => {
            const newSet = new Set(prev);
            if (shouldBeFavorite) {
              newSet.add(characterId);
            } else {
              newSet.delete(characterId);
            }
            return newSet;
          });

          // Refresh favorites list
          const favorites = await characterService.getFavorites(8);
          setFavoriteCharacters(favorites);
        }
      } catch (error) {
        console.error('[Dashboard] Failed to toggle favorite:', error);
      }
    },
    []
  );

  const handleStoryPlay = useCallback(
    async (story: Story) => {
      try {
        // Build story context for chat
        const storyContext = buildStoryContext(story);

        // Get character IDs from story
        const characterIds = story.characters?.map(c => c.id) || [];

        if (characterIds.length === 0) {
          addToast(t('story:errors.noCharacters', 'This story has no characters'), 'error');
          return;
        }

        // Create conversation with story context
        const payload: CreateConversationPayload = {
          title: story.title,
          participantIds: characterIds,
          settings: {
            storyId: story.id,
            storyContext,
            isStoryMode: true,
            initialMessage: story.initialText || undefined,
            objectives: story.objectives,
          },
        };

        const conversation = await chatService.createConversation(payload);

        // Navigate to chat
        navigate(`/chat/${conversation.id}`);
      } catch (error) {
        console.error('[Dashboard] Failed to start story:', error);
        addToast(t('story:errors.failedToStart', 'Failed to start story'), 'error');
      }
    },
    [navigate, addToast, t]
  );

  // Filter lists based on global content filter "hidden" mode so layout reflows
  // Additionally, if not authenticated, only show content with ageRating 'L' (Livre/Free)
  const filteredPopularCharacters = popularCharacters.filter((c) => {
    if (!shouldHideContent((c as any).ageRating, (c as any).contentTags || [])) {
      // If not authenticated, only show 'L' rated content
      if (!isAuthenticated) {
        return c.ageRating === 'L';
      }
      return true;
    }
    return false;
  });

  const filteredNewestCharacters = newestCharacters.filter((c) => {
    if (!shouldHideContent((c as any).ageRating, (c as any).contentTags || [])) {
      // If not authenticated, only show 'L' rated content
      if (!isAuthenticated) {
        return c.ageRating === 'L';
      }
      return true;
    }
    return false;
  });

  const filteredFavoriteCharacters = favoriteCharacters.filter((c) => {
    if (!shouldHideContent((c as any).ageRating, (c as any).contentTags || [])) {
      if (!isAuthenticated) {
        return c.ageRating === 'L';
      }
      return true;
    }
    return false;
  });

  const filteredPopularStories = popularStories.filter((s) => {
    if (!shouldHideContent((s as any).ageRating, (s as any).contentTags || [])) {
      if (!isAuthenticated) {
        return (s as any).ageRating === 'L';
      }
      return true;
    }
    return false;
  });

  const filteredMyStories = myStories.filter((s) => {
    if (!shouldHideContent((s as any).ageRating, (s as any).contentTags || [])) {
      if (!isAuthenticated) {
        return (s as any).ageRating === 'L';
      }
      return true;
    }
    return false;
  });

  return (
    <div className="w-full bg-normal overflow-x-hidden">
      {/* Public Header - shown only to non-authenticated users */}
      {!isAuthenticated && <PublicHeader />}

      {/* Carousel Section */}
      <div className="mb-1 overflow-hidden">
        {isLoadingCarousel ? (
          <div className="h-80 sm:h-96 md:h-[420px] bg-light animate-pulse" />
        ) : (
          <DashboardCarousel cards={carouselHighlights} />
        )}
      </div>

      {/* Tabs Navigation and Content */}
      <div className="w-full mb-6 overflow-hidden">
        <Tabs defaultTab="discover" value={activeTab} onValueChange={(tab) => {
          setActiveTab(tab);
          setLoadedTabs(prev => new Set(prev).add(tab));
        }}>
          <TabList>
            <Tab label="discover">{t('dashboard:tabs.discover')}</Tab>
            {/* Hide Chat tab for non-authenticated users */}
            {isAuthenticated && <Tab label="chat">{t('dashboard:tabs.chat')}</Tab>}
            <Tab label="story">{t('dashboard:tabs.story')}</Tab>
          </TabList>

          <TabPanels>
            {/* Discover Tab */}
            <TabPanel label="discover">
              <div className="space-y-6 px-4 md:px-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h2 className="hidden sm:block text-lg font-semibold text-title">
                    {discoverView === 'popular'
                      ? t('dashboard:sections.popularCharacters')
                      : discoverView === 'newest'
                      ? t('dashboard:sections.newest') + ' ' + t('dashboard:sections.popularCharacters').toLowerCase()
                      : t('dashboard:sections.favoriteCharacters')}
                  </h2>
                  {/* Hide favorites/newest toggle for non-authenticated users */}
                  {isAuthenticated && (
                    <div className="ml-auto sm:ml-0 flex rounded-xl border border-border overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setDiscoverView('popular')}
                        className={`px-3 py-1 text-sm ${discoverView === 'popular' ? 'bg-primary text-black' : 'text-content'}`}
                      >
                        {t('dashboard:sections.popular')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscoverView('newest')}
                        className={`px-3 py-1 text-sm ${discoverView === 'newest' ? 'bg-primary text-black' : 'text-content'}`}
                      >
                        {t('dashboard:sections.newest')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscoverView('favorites')}
                        className={`px-3 py-1 text-sm ${discoverView === 'favorites' ? 'bg-primary text-black' : 'text-content'}`}
                      >
                        {t('dashboard:sections.favorites')}
                      </button>
                    </div>
                  )}
                </div>

                {/* Filter Panel - show for both popular and favorites */}
                <FilterPanel
                  filters={characterFilters}
                  onUpdateFilter={updateCharacterFilter}
                  onClearFilters={clearCharacterFilters}
                  activeFiltersCount={activeFiltersCount}
                />

                {initialLoading ? (
                  <CharacterGridSkeleton count={initialLimit} />
                ) : (
                  <>
                    <div className="flex flex-wrap items-stretch gap-4">
                      {(discoverView === 'popular'
                        ? filteredPopularCharacters
                        : discoverView === 'newest'
                        ? filteredNewestCharacters
                        : filteredFavoriteCharacters
                      ).map((character) => (
                        <CharacterCard
                          key={character.id}
                          character={character}
                          isFavorite={favoriteCharacterIds.has(character.id)}
                          clickAction={discoverView === 'popular' || discoverView === 'newest' ? 'view' : 'chat'}
                          blurNsfw={blurNsfw}
                          chatCount={(character as any).stats?.conversationCount}
                          favoriteCount={(character as any).stats?.favoriteCount}
                          imageCount={(character as any).stats?.imageCount}
                          onFavoriteToggle={handleFavoriteToggle}
                        />
                      ))}
                    </div>
                    {/* Infinite scroll trigger (only for popular view) */}
                    {discoverView === 'popular' && (
                      <div ref={loadMoreRef} className="min-h-[20px] w-full">
                        {isLoadingMore && <LoadingSpinner />}
                        {!hasMore && filteredPopularCharacters.length > 0 && (
                          <div className="text-center py-12">
                            <p className="text-muted mb-2">
                              {t('dashboard:endOfList.characters.message', 'You\'ve seen all characters!')}
                            </p>
                            <p className="text-sm text-muted mb-4">
                              {t('dashboard:endOfList.characters.description', 'Bring your imagination to life and create unique AI characters')}
                            </p>
                            <button
                              onClick={() => navigate('/characters/create')}
                              className="px-6 py-2 bg-primary text-black rounded-lg hover:bg-primary/80 transition-colors"
                            >
                              {t('dashboard:endOfList.characters.cta', 'Create your own character')}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {(discoverView === 'popular'
                      ? filteredPopularCharacters
                      : discoverView === 'newest'
                      ? filteredNewestCharacters
                      : filteredFavoriteCharacters
                    ).length === 0 && (
                      <div className="w-full text-center py-12 bg-light/50 rounded-xl border border-dashed border-border">
                        <p className="text-muted mb-4">
                          {discoverView === 'popular'
                            ? t('dashboard:sections.noPopularCharacters', { defaultValue: 'Nenhum personagem popular encontrado.' })
                            : discoverView === 'newest'
                            ? t('dashboard:sections.noNewCharacters', { defaultValue: 'Nenhum personagem novo ainda.' })
                            : t('dashboard:sections.noFavoriteCharacters', { defaultValue: 'Você ainda não tem personagens favoritos.' })}
                        </p>
                        <button
                          onClick={() => navigate('/characters/create')}
                          className="px-6 py-2 bg-primary text-black rounded-lg hover:bg-primary/80 transition-colors"
                        >
                          {discoverView === 'popular' || discoverView === 'newest'
                            ? t('dashboard:sections.createCharacter', { defaultValue: 'Criar Personagem' })
                            : t('dashboard:sections.browseCharacters', { defaultValue: 'Explorar Personagens' })}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </TabPanel>

            {/* Chat Tab */}
            <TabPanel label="chat">
              <div className="space-y-6 px-4 md:px-6">
                {/* Recent Conversations */}
                <RecentConversations limit={12} wrap showEmptyState />
              </div>
            </TabPanel>

            {/* Story Tab */}
            <TabPanel label="story">
              <div className="space-y-6 px-4 md:px-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h2 className="hidden sm:block text-lg font-semibold text-title">
                    {storyView === 'my'
                      ? t('dashboard:sections.myStories')
                      : t('dashboard:sections.popularStories')}
                  </h2>
                  {/* Hide my stories toggle for non-authenticated users */}
                  {isAuthenticated && (
                    <div className="ml-auto sm:ml-0 flex rounded-xl border border-border overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setStoryView('my')}
                        className={`px-3 py-1 text-sm ${storyView === 'my' ? 'bg-primary text-black' : 'text-content'}`}
                      >
                        {t('dashboard:sections.mine')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setStoryView('popular')}
                        className={`px-3 py-1 text-sm ${storyView === 'popular' ? 'bg-primary text-black' : 'text-content'}`}
                      >
                        {t('dashboard:sections.popular')}
                      </button>
                    </div>
                  )}
                </div>
                {storiesQuery.isLoading || myStoriesQuery.isLoading ? (
                  <div className="h-64 bg-light animate-pulse rounded-lg" />
                ) : (
                  <>
                    <div className="flex flex-wrap items-stretch gap-4">
                      {(storyView === 'my' ? filteredMyStories : filteredPopularStories).map((story) => (
                        <StoryCard key={story.id} story={story} onPlay={handleStoryPlay} blurNsfw={blurNsfw} />
                      ))}
                    </div>
                    {/* CTA at the end of stories list */}
                    {!storiesQuery.isLoading && !myStoriesQuery.isLoading && (storyView === 'my' ? filteredMyStories : filteredPopularStories).length > 0 && (
                      <div className="text-center py-8">
                        <p className="text-muted mb-2">
                          {t('dashboard:endOfList.stories.message', 'Want more?')}
                        </p>
                        <p className="text-sm text-muted mb-4">
                          {t('dashboard:endOfList.stories.description', 'Start creating interactive stories with AI characters')}
                        </p>
                        <button
                          onClick={() => navigate('/stories/create')}
                          className="px-6 py-2 bg-primary text-black rounded-lg hover:bg-primary/80 transition-colors"
                        >
                          {t('dashboard:endOfList.stories.cta', 'Create your own story')}
                        </button>
                      </div>
                    )}
                  </>
                )}
                {!storiesQuery.isLoading && !myStoriesQuery.isLoading && filteredMyStories.length === 0 && filteredPopularStories.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted mb-4">
                      {t('dashboard:noStories')}
                    </p>
                    <button
                      onClick={() => navigate('/stories/create')}
                      className="px-6 py-2 bg-primary text-black rounded-lg hover:bg-primary/80 transition-colors"
                    >
                      {t('dashboard:createStory')}
                    </button>
                  </div>
                )}
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
}

// Wrapper component that conditionally uses AuthenticatedLayout
export default function Dashboard(): JSX.Element {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    // Authenticated users get the full layout with sidebar, navigation rail, and header
    return (
      <AuthenticatedLayout>
        <AuthenticatedDashboard />
      </AuthenticatedLayout>
    );
  }

  // Non-authenticated users get the public view without layout
  return <DashboardContent />;
}

