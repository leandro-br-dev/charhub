import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ContentFilter, HorizontalScroller, CharacterCard } from '../../components/ui';
import { DashboardCarousel, RecentConversations, StoryCard } from './components';
import { useContentFilter } from './hooks';
import { dashboardService, characterService, storyService } from '../../services';
import type { Character } from '../../types/characters';
import type { CarouselHighlight } from '../../services/dashboardService';

type AgeRating = 'L' | 'TEN' | 'TWELVE' | 'FOURTEEN' | 'SIXTEEN' | 'EIGHTEEN';

// Local Story type that matches StoryCard component expectations
interface Story {
  id: string;
  title: string;
  synopsis?: string;
  coverImage?: string;
  ageRating?: string;
  contentTags?: string[];
}

type TabValue = 'discover' | 'chat' | 'story';

const AGE_RATING_OPTIONS = [
  { value: 'L', label: 'L - Livre' },
  { value: 'TEN', label: '10+' },
  { value: 'TWELVE', label: '12+' },
  { value: 'FOURTEEN', label: '14+' },
  { value: 'SIXTEEN', label: '16+' },
  { value: 'EIGHTEEN', label: '18+' },
];

export default function Dashboard(): JSX.Element {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();

  // State
  const [activeTab, setActiveTab] = useState<TabValue>('discover');
  const [carouselHighlights, setCarouselHighlights] = useState<CarouselHighlight[]>([]);
  const [popularCharacters, setPopularCharacters] = useState<Character[]>([]);
  const [favoriteCharacters, setFavoriteCharacters] = useState<Character[]>([]);
  const [favoriteCharacterIds, setFavoriteCharacterIds] = useState<Set<string>>(new Set());
  const [popularStories, setPopularStories] = useState<Story[]>([]);
  const [isLoadingCarousel, setIsLoadingCarousel] = useState(true);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(true);
  const [isLoadingStories, setIsLoadingStories] = useState(true);

  // Content filter hook
  const {
    ageRating,
    blurNsfw,
    setAgeRating,
    setBlurNsfw,
    isNsfwAllowed,
  } = useContentFilter({
    defaultAgeRating: 'L',
    defaultBlurNsfw: false,
    persistToLocalStorage: true,
  });

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
        const [popular, favorites] = await Promise.all([
          characterService.getPopular(8),
          characterService.getFavorites(8),
        ]);
        setPopularCharacters(popular);
        setFavoriteCharacters(favorites);

        // Build a set of favorited character IDs for quick lookup
        const favoriteIds = new Set(favorites.map(char => char.id));
        setFavoriteCharacterIds(favoriteIds);
      } catch (error) {
        console.error('[Dashboard] Failed to fetch characters:', error);
      } finally {
        setIsLoadingCharacters(false);
      }
    };

    fetchCharacters();
  }, []);

  // Fetch popular stories
  useEffect(() => {
    const fetchStories = async () => {
      setIsLoadingStories(true);
      try {
        const stories = await storyService.getPopular(8);
        setPopularStories(stories);
      } catch (error) {
        console.error('[Dashboard] Failed to fetch stories:', error);
      } finally {
        setIsLoadingStories(false);
      }
    };

    fetchStories();
  }, []);

  // Handlers
  const handleAgeRatingChange = useCallback((value: string) => {
    setAgeRating(value as AgeRating);
  }, [setAgeRating]);

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
    <div className="min-h-screen bg-normal">
      {/* Carousel Section */}
      <div className="mb-8">
        {isLoadingCarousel ? (
          <div className="h-80 sm:h-96 md:h-[420px] bg-light animate-pulse" />
        ) : (
          <DashboardCarousel cards={carouselHighlights} />
        )}
      </div>

      {/* Content Filter Bar */}
      <div className="mx-auto max-w-7xl px-6 mb-6">
        <ContentFilter
          ageRating={ageRating}
          blurNsfw={blurNsfw}
          onAgeRatingChange={handleAgeRatingChange}
          onBlurNsfwChange={setBlurNsfw}
          availableAgeRatings={AGE_RATING_OPTIONS}
          isNsfwAllowed={isNsfwAllowed}
        />
      </div>

      {/* Tabs Navigation */}
      <div className="mx-auto max-w-7xl px-6 mb-6">
        <div className="flex gap-4 border-b border-border">
          <button
            onClick={() => setActiveTab('discover')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'discover'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted hover:text-content'
            }`}
          >
            {t('dashboard:tabs.discover', 'Discover')}
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'chat'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted hover:text-content'
            }`}
          >
            {t('dashboard:tabs.chat', 'Chat')}
          </button>
          <button
            onClick={() => setActiveTab('story')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'story'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted hover:text-content'
            }`}
          >
            {t('dashboard:tabs.story', 'Story')}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mx-auto max-w-7xl px-6 pb-12">
        {/* Discover Tab */}
        {activeTab === 'discover' && (
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
                    onFavoriteToggle={handleFavoriteToggle}
                  />
                ))}
              </HorizontalScroller>
            )}
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
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
                      onFavoriteToggle={handleFavoriteToggle}
                    />
                  ))}
                </HorizontalScroller>
              )
            )}
          </div>
        )}

        {/* Story Tab */}
        {activeTab === 'story' && (
          <div className="space-y-8">
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
            {!isLoadingStories && popularStories.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted">
                  {t('dashboard:storyModuleComingSoon', 'Story module coming soon!')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
