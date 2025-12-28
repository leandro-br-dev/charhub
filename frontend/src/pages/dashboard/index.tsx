import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HorizontalScroller } from '../../components/ui/horizontal-scroller';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '../../components/ui/Tabs';
import { CharacterCard } from '../(characters)/shared/components';
import { DashboardCarousel, RecentConversations, StoryCard } from './components';
import { useContentFilter } from './hooks';
import { useContentFilter as useGlobalContentFilter } from '../../contexts/ContentFilterContext';
import { dashboardService, characterService, storyService, chatService } from '../../services';
import { characterStatsService, type CharacterStats } from '../../services/characterStatsService';
import type { Character } from '../../types/characters';
import type { CarouselHighlight } from '../../services/dashboardService';
import type { Story } from '../../types/story';
import type { CreateConversationPayload } from '../../types/chat';
import { useAuth } from '../../hooks/useAuth';
import { PublicHeader } from '../../components/layout';
import { AuthenticatedLayout } from '../../layouts/AuthenticatedLayout';
import { usePageHeader } from '../../hooks/usePageHeader';
import { useToast } from '../../contexts/ToastContext';

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
  const [favoriteCharacters, setFavoriteCharacters] = useState<Character[]>([]);
  const [discoverView, setDiscoverView] = useState<'popular' | 'favorites'>('popular');
  const [favoriteCharacterIds, setFavoriteCharacterIds] = useState<Set<string>>(new Set());
  const [statsById, setStatsById] = useState<Record<string, CharacterStats | undefined>>({});
  const [imagesById, setImagesById] = useState<Record<string, number>>({});
  const [popularStories, setPopularStories] = useState<Story[]>([]);
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [storyView, setStoryView] = useState<'my' | 'popular'>('my');
  const [isLoadingCarousel, setIsLoadingCarousel] = useState(true);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(true);
  const [isLoadingStories, setIsLoadingStories] = useState(true);

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

  // Ensure non-authenticated users always see "popular" views
  useEffect(() => {
    if (!isAuthenticated) {
      if (discoverView === 'favorites') {
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

  // Fetch popular characters
  useEffect(() => {
    const fetchCharacters = async () => {
      setIsLoadingCharacters(true);
      try {
        // Only fetch favorites if authenticated
        const requests = [characterService.getPopular({ limit: 8, ageRatings })];
        if (isAuthenticated) {
          requests.push(characterService.getFavorites(8));
        }

        const results = await Promise.all(requests);
        const [popular, favorites = []] = results;

        setPopularCharacters(popular);
        setFavoriteCharacters(favorites);

        // Build a set of favorited character IDs for quick lookup
        const favoriteIds = new Set(favorites.map(char => char.id));
        setFavoriteCharacterIds(favoriteIds);
        // Fetch stats for these characters (deduped)
        const ids = Array.from(new Set([...popular.map(c => c.id), ...favorites.map(c => c.id)]));
        if (ids.length > 0) {
          try {
            const results = await Promise.all(
              ids.map(async (id) => {
                try {
                  const s = await characterStatsService.getStats(id);
                  return [id, s] as const;
                } catch (_err) {
                  return [id, undefined] as const;
                }
              })
            );
            setStatsById(prev => {
              const next = { ...prev } as Record<string, CharacterStats | undefined>;
              for (const [id, s] of results) next[id] = s;
              return next;
            });
            // Fetch image counts in parallel (deduped)
            const imgResults = await Promise.all(
              ids.map(async (id) => {
                try {
                  const count = await characterService.getImageCount(id);
                  return [id, count] as const;
                } catch (_e) {
                  return [id, 0] as const;
                }
              })
            );
            setImagesById(prev => {
              const next = { ...prev } as Record<string, number>;
              for (const [id, count] of imgResults) next[id] = count;
              return next;
            });
          } catch (e) {
            console.warn('[Dashboard] Failed to fetch some character stats', e);
          }
        }
      } catch (error) {
        console.error('[Dashboard] Failed to fetch characters:', error);
      } finally {
        setIsLoadingCharacters(false);
      }
    };

    fetchCharacters();
  }, [ageRatings, isAuthenticated]);

  // Fetch popular stories and user's stories
  useEffect(() => {
    const fetchStories = async () => {
      setIsLoadingStories(true);
      try {
        // Fetch popular stories for everyone
        const popular = await storyService.getPopular(8);
        setPopularStories(popular);

        // Only fetch user's stories if authenticated
        if (isAuthenticated) {
          const myStoriesData = await storyService.getMyStories({ limit: 8 });
          setMyStories(myStoriesData.items);
        } else {
          setMyStories([]);
        }
      } catch (error) {
        console.error('[Dashboard] Failed to fetch stories:', error);
      } finally {
        setIsLoadingStories(false);
      }
    };

    fetchStories();
  }, [isAuthenticated]);

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
        <Tabs defaultTab="discover">
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
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-title">
                    {discoverView === 'popular'
                      ? t('dashboard:sections.popularCharacters')
                      : t('dashboard:sections.favoriteCharacters')}
                  </h2>
                  {/* Hide favorites toggle for non-authenticated users */}
                  {isAuthenticated && (
                    <div className="flex rounded-xl border border-border overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setDiscoverView('popular')}
                        className={`px-3 py-1 text-sm ${discoverView === 'popular' ? 'bg-primary text-black' : 'text-content'}`}
                      >
                        {t('dashboard:sections.popular')}
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
                {isLoadingCharacters ? (
                  <div className="h-64 bg-light animate-pulse rounded-lg" />
                ) : (
                  <div className="flex flex-wrap items-stretch gap-4">
                    {(discoverView === 'popular' ? filteredPopularCharacters : filteredFavoriteCharacters).map((character) => (
                      <CharacterCard
                        key={character.id}
                        character={character}
                        isFavorite={favoriteCharacterIds.has(character.id)}
                        clickAction={discoverView === 'popular' ? 'view' : 'chat'}
                        blurNsfw={blurNsfw}
                        chatCount={statsById[character.id]?.conversationCount}
                        favoriteCount={statsById[character.id]?.favoriteCount}
                        imageCount={imagesById[character.id]}
                        onFavoriteToggle={handleFavoriteToggle}
                      />
                    ))}
                    {(discoverView === 'popular' ? filteredPopularCharacters : filteredFavoriteCharacters).length === 0 && (
                      <div className="w-full text-center py-12 bg-light/50 rounded-xl border border-dashed border-border">
                        <p className="text-muted mb-4">
                          {discoverView === 'popular'
                            ? t('dashboard:sections.noPopularCharacters', { defaultValue: 'Nenhum personagem popular encontrado.' })
                            : t('dashboard:sections.noFavoriteCharacters', { defaultValue: 'Você ainda não tem personagens favoritos.' })}
                        </p>
                        <button
                          onClick={() => navigate('/characters/create')}
                          className="px-6 py-2 bg-primary text-black rounded-lg hover:bg-primary/80 transition-colors"
                        >
                          {discoverView === 'popular'
                            ? t('dashboard:sections.createCharacter', { defaultValue: 'Criar Personagem' })
                            : t('dashboard:sections.browseCharacters', { defaultValue: 'Explorar Personagens' })}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabPanel>

            {/* Chat Tab */}
            <TabPanel label="chat">
              <div className="space-y-6 px-4 md:px-6">
                {/* Recent Conversations */}
                <RecentConversations limit={12} wrap />
              </div>
            </TabPanel>

            {/* Story Tab */}
            <TabPanel label="story">
              <div className="space-y-6 px-4 md:px-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-title">
                    {storyView === 'my'
                      ? t('dashboard:sections.myStories')
                      : t('dashboard:sections.popularStories')}
                  </h2>
                  {/* Hide my stories toggle for non-authenticated users */}
                  {isAuthenticated && (
                    <div className="flex rounded-xl border border-border overflow-hidden">
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
                {isLoadingStories ? (
                  <div className="h-64 bg-light animate-pulse rounded-lg" />
                ) : (
                  <div className="flex flex-wrap items-stretch gap-4">
                    {(storyView === 'my' ? filteredMyStories : filteredPopularStories).map((story) => (
                      <StoryCard key={story.id} story={story} onPlay={handleStoryPlay} blurNsfw={blurNsfw} />
                    ))}
                  </div>
                )}
                {!isLoadingStories && filteredMyStories.length === 0 && filteredPopularStories.length === 0 && (
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

