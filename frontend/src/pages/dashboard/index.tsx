import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HorizontalScroller } from '../../components/ui/horizontal-scroller';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '../../components/ui/Tabs';
import { CharacterCard } from '../(characters)/shared/components';
import { DashboardCarousel, RecentConversations, StoryCard } from './components';
import { useContentFilter } from './hooks';
import { dashboardService, characterService, storyService } from '../../services';
import { characterStatsService, type CharacterStats } from '../../services/characterStatsService';
import type { Character } from '../../types/characters';
import type { CarouselHighlight } from '../../services/dashboardService';
import type { Story } from '../../types/story';
import { usePageHeader } from '../../hooks/usePageHeader';

export default function Dashboard(): JSX.Element {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const { setTitle } = usePageHeader();

  // Age rating filter moved to PageHeader

  // State
  const [carouselHighlights, setCarouselHighlights] = useState<CarouselHighlight[]>([]);
  const [popularCharacters, setPopularCharacters] = useState<Character[]>([]);
  const [favoriteCharacters, setFavoriteCharacters] = useState<Character[]>([]);
  const [favoriteCharacterIds, setFavoriteCharacterIds] = useState<Set<string>>(new Set());
  const [statsById, setStatsById] = useState<Record<string, CharacterStats | undefined>>({});
  const [imagesById, setImagesById] = useState<Record<string, number>>({});
  const [popularStories, setPopularStories] = useState<Story[]>([]);
  const [myStories, setMyStories] = useState<Story[]>([]);
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

  // Fetch carousel highlights
  useEffect(() => {
    // Ensure dashboard title is always "CharHub" when this page is active
    setTitle('CharHub');

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
        const [popular, favorites] = await Promise.all([
          characterService.getPopular({ limit: 8, ageRatings }),
          characterService.getFavorites(8),
        ]);
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
  }, [ageRatings]);

  // Fetch popular stories and user's stories
  useEffect(() => {
    const fetchStories = async () => {
      setIsLoadingStories(true);
      try {
        const [popular, myStoriesData] = await Promise.all([
          storyService.getPopular(8),
          storyService.getMyStories({ limit: 8 }),
        ]);
        setPopularStories(popular);
        setMyStories(myStoriesData.items);
      } catch (error) {
        console.error('[Dashboard] Failed to fetch stories:', error);
      } finally {
        setIsLoadingStories(false);
      }
    };

    fetchStories();
  }, []);

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
        const result = await storyService.play(story.id);
        if (result.success && result.sessionId) {
          // TODO: Navigate to story session when implemented
          console.log(`Starting story session: ${result.sessionId}`);
          navigate(`/stories/${story.id}/play?session=${result.sessionId}`);
        }
      } catch (error) {
        console.error('[Dashboard] Failed to start story:', error);
      }
    },
    [navigate]
  );

  return (
    <div className="min-h-[100svh] bg-normal overflow-x-hidden">
      {/* Carousel Section */}
      <div className="mb-8 overflow-hidden">
        {isLoadingCarousel ? (
          <div className="h-80 sm:h-96 md:h-[420px] bg-light animate-pulse" />
        ) : (
          <DashboardCarousel cards={carouselHighlights} />
        )}
      </div>

      {/* Tabs Navigation and Content */}
      <div className="w-full sm:mx-auto sm:max-w-7xl px-0 sm:px-6 mb-6 overflow-hidden">
        <Tabs defaultTab="discover">
          <TabList>
            <Tab label="discover">{t('dashboard:tabs.discover', 'Discover')}</Tab>
            <Tab label="chat">{t('dashboard:tabs.chat', 'Chat')}</Tab>
            <Tab label="story">{t('dashboard:tabs.story', 'Story')}</Tab>
          </TabList>

          <TabPanels>
            {/* Discover Tab */}
            <TabPanel label="discover">
              <div className="space-y-8">
                {/* Popular Characters */}
                {isLoadingCharacters ? (
                  <div className="h-64 bg-light animate-pulse rounded-lg" />
                ) : (
                  popularCharacters.length > 0 && (
                    <HorizontalScroller
                      title={t('dashboard:sections.popularCharacters', 'Popular Characters')}
                      cardType="vertical"
                    >
                      {popularCharacters.map((character) => (
                        <CharacterCard
                          key={character.id}
                          character={character}
                          isFavorite={favoriteCharacterIds.has(character.id)}
                          clickAction="view"
                          blurNsfw={blurNsfw}
                          chatCount={statsById[character.id]?.conversationCount}
                          favoriteCount={statsById[character.id]?.favoriteCount}
                          imageCount={imagesById[character.id]}
                          onFavoriteToggle={handleFavoriteToggle}
                        />
                      ))}
                    </HorizontalScroller>
                  )
                )}

                {/* Favorite Characters */}
                {!isLoadingCharacters && favoriteCharacters.length > 0 && (
                  <HorizontalScroller
                    title={t('dashboard:sections.favoriteCharacters', 'Your Favorites')}
                    cardType="vertical"
                  >
                    {favoriteCharacters.map((character) => (
                      <CharacterCard
                        key={character.id}
                        character={character}
                        isFavorite={true}
                        clickAction="chat"
                        blurNsfw={blurNsfw}
                        chatCount={statsById[character.id]?.conversationCount}
                        favoriteCount={statsById[character.id]?.favoriteCount}
                        imageCount={imagesById[character.id]}
                        onFavoriteToggle={handleFavoriteToggle}
                      />
                    ))}
                  </HorizontalScroller>
                )}
              </div>
            </TabPanel>

            {/* Chat Tab */}
            <TabPanel label="chat">
              <div className="space-y-8">
                {/* Recent Conversations */}
                <RecentConversations limit={8} />

                {/* Suggested Characters to Chat */}
                {isLoadingCharacters ? (
                  <div className="h-64 bg-light animate-pulse rounded-lg" />
                ) : (
                  popularCharacters.length > 0 && (
                    <HorizontalScroller
                      title={t('dashboard:sections.suggestedChats', 'Start a Conversation')}
                      cardType="vertical"
                    >
                      {popularCharacters.map((character) => (
                        <CharacterCard
                          key={character.id}
                          character={character}
                          isFavorite={favoriteCharacterIds.has(character.id)}
                          clickAction="chat"
                          blurNsfw={blurNsfw}
                          chatCount={statsById[character.id]?.conversationCount}
                          favoriteCount={statsById[character.id]?.favoriteCount}
                          imageCount={imagesById[character.id]}
                          onFavoriteToggle={handleFavoriteToggle}
                        />
                      ))}
                    </HorizontalScroller>
                  )
                )}
              </div>
            </TabPanel>

            {/* Story Tab */}
            <TabPanel label="story">
              <div className="space-y-8">
                {/* My Stories */}
                {!isLoadingStories && myStories.length > 0 && (
                  <HorizontalScroller
                    title={t('dashboard:sections.myStories', 'My Stories')}
                    cardType="vertical"
                  >
                    {myStories.map((story) => (
                      <StoryCard
                        key={story.id}
                        story={story}
                        onPlay={handleStoryPlay}
                        blurNsfw={blurNsfw}
                      />
                    ))}
                  </HorizontalScroller>
                )}

                {/* Popular Stories */}
                {isLoadingStories ? (
                  <div className="h-64 bg-light animate-pulse rounded-lg" />
                ) : (
                  popularStories.length > 0 && (
                    <HorizontalScroller
                      title={t('dashboard:sections.popularStories', 'Popular Stories')}
                      cardType="vertical"
                    >
                      {popularStories.map((story) => (
                        <StoryCard
                          key={story.id}
                          story={story}
                          onPlay={handleStoryPlay}
                          blurNsfw={blurNsfw}
                        />
                      ))}
                    </HorizontalScroller>
                  )
                )}

                {/* Story Module Notice */}
                {!isLoadingStories && popularStories.length === 0 && myStories.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted mb-4">
                      {t('dashboard:noStories', 'No stories yet. Create your first story!')}
                    </p>
                    <button
                      onClick={() => navigate('/stories/create')}
                      className="px-6 py-2 bg-primary text-black rounded-lg hover:bg-primary/80 transition-colors"
                    >
                      {t('dashboard:createStory', 'Create Story')}
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
